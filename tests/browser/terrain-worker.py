"""Exercise real mobile touch transitions without animation frames, then server-authoritative movement. Uses Chromium and an isolated local test database."""
import json
import secrets
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path('work')
out.mkdir(exist_ok=True)
errors = []
with sync_playwright() as runner:
    browser = runner.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-accelerated-2d-canvas'])
    context = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda msg: print('Browser:', msg.text[:400]) if msg.type=='error' else None)
    page.on('response', lambda res: print('HTTP',res.status,res.url.split('?')[0]) if res.url.endswith('/auth') or res.url.endswith('/world') else None)
    page.on('crash', lambda: print('Page crashed'))
    page.on('framenavigated', lambda frame: print('Navigation',frame.url.split('?')[0]))
    page.goto('http://127.0.0.1:5173', wait_until='networkidle')
    name, password = 'mapqa' + secrets.token_hex(4), secrets.token_hex(24)
    page.locator('input[name="name"]').fill(name)
    page.locator('input[name="password"]').fill(password)
    page.evaluate("""async()=>{
      const url=performance.getEntriesByType('resource').findLast(e=>e.name.includes('colyseus__js')).name;
      const mod=await import(url),Client=(mod.default||mod).Client,join=Client.prototype.joinById;
      Client.prototype.joinById=async function(...args){const room=await join.apply(this,args);window.__touchProbeRoom=room;return room;};
    }""")
    page.locator('button[name="register"][value="true"]').click()
    try:
        page.locator('#minimap-button').wait_for(state='visible')
    except Exception:
        print('Page errors:',errors)
        print('Auth notice:',page.evaluate("document.querySelector('#auth-error')?.textContent || document.body.innerText.slice(0,500)"))
        if page.locator('input[name="password"]').count():
            page.locator('input[name="password"]').fill('')
        page.screenshot(path=str(out/'official-browser-failure.png'))
        raise
    page.wait_for_timeout(1500)
    # Observe the actual map module instance; this wrapper only records state.
    page.evaluate('''async () => {
      const loaded=performance.getEntriesByType('resource').findLast(e=>e.name.includes('/src/map-world.ts')).name;
      const {MapWorld}=await import(loaded);const update=MapWorld.prototype.update;
      window.__mapSmoke={peak:0,instance:null};
      MapWorld.prototype.update=function(view){const result=update.call(this,view);window.__mapSmoke.instance=this;window.__mapSmoke.peak=Math.max(window.__mapSmoke.peak,this.chunks.size);return result;};
    }''')
    page.wait_for_function('window.__mapSmoke.instance && window.__mapSmoke.instance.chunks.size > 0')
    result=page.evaluate("""async()=>{
      const map=window.__mapSmoke.instance;
      if(!map.worker)throw Error('Background terrain worker did not initialize');
      const url=performance.getEntriesByType('resource').findLast(e=>e.name.includes('/src/terrain-painter.ts')).name;
      const {TerrainPainter,TERRAIN_TEXTURES}=await import(url);
      const assets=map.scene.cache.json.get('manifest').assets;
      const worker=new Worker('/src/terrain-worker.ts',{type:'module'});
      worker.postMessage({type:'init',files:Object.fromEntries(TERRAIN_TEXTURES.map(k=>[k,'/assets/'+assets[k].file]))});
      const checks=[], uploadCounts=[];
      const update=map.update,addImage=map.scene.textures.addImage;
      let uploads=0;
      map.scene.textures.addImage=function(key,...args){if(key.startsWith('map-chunk-'))uploads++;return addImage.call(this,key,...args)};
      map.update=function(...args){const before=uploads;const result=update.apply(this,args);uploadCounts.push(uploads-before);return result};
      map.invalidate();
      try{
        for(const [x,y,ratio] of [[6144,6144,2],[11264,6144,1],[3072,2048,1],[6144,11264,1]]){
          const reservations=[{x:6400,y:6400,width:128,height:128}];
          const tiles=await new Promise((resolve,reject)=>{
            const timer=setTimeout(()=>reject(Error('Terrain worker timeout')),20000);
            worker.onmessage=({data})=>{clearTimeout(timer);data.error?reject(Error('Worker paint failed')):resolve(data.tiles)};
            worker.postMessage({type:'paint',key:'qa',generation:1,x,y,ratio,reservations});
          });
          // Compare the same terrain and reservations through the fallback painter.
          const terrainURL=performance.getEntriesByType('resource').findLast(e=>e.name.includes('/packages/shared/src/terrain.ts')).name;
          const terrain=await import(terrainURL);terrain.setMapReservations(reservations);
          const canvas=document.createElement('canvas');canvas.width=canvas.height=1026*ratio;
          const ctx=canvas.getContext('2d');ctx.save();ctx.scale(ratio,ratio);ctx.translate(1,1);
          const painter=new TerrainPainter(ratio,n=>map.scene.textures.get(n).getSourceImage(),()=>document.createElement('canvas'));
          painter.paint(ctx,x,y);ctx.restore();
          const expected=ctx.getImageData(ratio,ratio,1024*ratio,1024*ratio).data;
          ctx.clearRect(0,0,canvas.width,canvas.height);
          for(const tile of tiles)ctx.drawImage(tile.bitmap,ratio,ratio,256*ratio,256*ratio,(tile.x+1)*ratio,(tile.y+1)*ratio,256*ratio,256*ratio);
          const actual=ctx.getImageData(ratio,ratio,1024*ratio,1024*ratio).data;
          let differences=0;for(let i=0;i<actual.length;i++)if(actual[i]!==expected[i])differences++;
          for(const tile of tiles)tile.bitmap.close();canvas.width=canvas.height=1;
          if(differences)throw Error('Worker changed terrain pixels: '+differences+' at '+x+','+y);
          checks.push({x,y,ratio,identicalPixels:true});
        }
      }finally{worker.terminate()}
      if(!uploads || uploadCounts.some(count=>count>2))throw Error('Terrain upload frame budget exceeded');
      const oldBitmaps=[...map.chunks.values()].flatMap(c=>c.bitmaps);
      const stale=await createImageBitmap(new ImageData(2,2));
      map.worker.onmessage({data:{generation:-999,key:'stale',tiles:[{bitmap:stale}]}});
      if(stale.width!==0)throw Error('Stale terrain result was not released');
      map.stopWorker();map.invalidate();
      if(!oldBitmaps.length || oldBitmaps.some(b=>b.width!==0))throw Error('Unloaded terrain bitmaps were not released');
      return {checks,fallbackRequested:true,staleResultReleased:true,unloadedBitmapsReleased:true,maxUploadsPerFrame:Math.max(...uploadCounts)};
    }""")
    page.wait_for_function('window.__mapSmoke.instance.chunks.size>0 && !window.__mapSmoke.instance.worker')
    result['fallbackLoaded']=True
    result['pageErrors']=errors
    assert not errors,errors
    (out/'terrain-worker-results.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result))
    context.close()
    browser.close()
