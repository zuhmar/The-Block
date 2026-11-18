"""Prove local visible movement starts before delayed authoritative snapshots are applied, using real mobile touch events and an isolated test database."""
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
      Client.prototype.joinById=async function(...args){
        const room=await join.apply(this,args),onMessage=room.onMessage.bind(room);
        window.__holdSnapshots=false;window.__snapshotQueue=[];window.__appliedSnapshots=0;
        room.onMessage=function(type,callback){return onMessage(type,type==='snapshot'?(s)=>{
          window.__lastSnapshot=s;
          const apply=()=>{window.__appliedSnapshots++;callback(s);};
          if(window.__holdSnapshots)window.__snapshotQueue.push(apply);else apply();
        }:callback);};
        return room;
      };
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
    page.wait_for_function('window.__lastSnapshot?.moveAck!==undefined')
    page.wait_for_function('window.__mapSmoke.instance.scene.sprites.has(window.__lastSnapshot.self.id)')
    page.evaluate("""()=>{
      const scene=window.__mapSmoke.instance.scene,id=window.__lastSnapshot.self.id;
      window.__holdSnapshots=true;
      window.__predictionProbe={id,startX:scene.sprites.get(id).x,applied:window.__appliedSnapshots,started:null,firstMotion:null};
      const check=()=>{if(window.__predictionProbe.started!==null && scene.sprites.get(id).x>window.__predictionProbe.startX+1)window.__predictionProbe.firstMotion=performance.now();else requestAnimationFrame(check);};
      requestAnimationFrame(check);
    }""")
    page.evaluate("document.querySelector('[data-hold=right]').addEventListener('pointerdown',()=>window.__predictionProbe.started=performance.now(),{capture:true,once:true})")
    cdp=context.new_cdp_session(page)
    box=page.locator('[data-hold="right"]').bounding_box()
    assert box
    point={'x':box['x']+box['width']/2,'y':box['y']+box['height']/2,'id':1}
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]})
    page.wait_for_function('window.__predictionProbe.firstMotion!==null',timeout=3000)
    page.wait_for_timeout(100)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    page.wait_for_timeout(80)
    result=page.evaluate("""()=>{const p=window.__predictionProbe,scene=window.__mapSmoke.instance.scene;return {visibleMovementBeforeServerReply:scene.sprites.get(p.id).x>p.startX+1,snapshotsAppliedDuringPress:window.__appliedSnapshots-p.applied,firstVisibleMovementMs:Math.round(p.firstMotion-p.started),predictedDistance:scene.sprites.get(p.id).x-p.startX}}""")
    assert result['visibleMovementBeforeServerReply'] and result['snapshotsAppliedDuringPress']==0,result
    assert 0<result['predictedDistance']<=75,result
    stopped=page.evaluate('window.__mapSmoke.instance.scene.sprites.get(window.__predictionProbe.id).x')
    page.wait_for_timeout(100)
    assert abs(page.evaluate('window.__mapSmoke.instance.scene.sprites.get(window.__predictionProbe.id).x')-stopped)<0.01
    page.evaluate("window.__holdSnapshots=false;for(const apply of window.__snapshotQueue.splice(0))apply()")
    page.wait_for_timeout(600)
    registered=0
    for i in range(4):
        before=page.evaluate('window.__lastSnapshot.self.x')
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]})
        page.wait_for_timeout(40)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        page.wait_for_function('(x)=>window.__lastSnapshot.self.x>x+1',arg=before,timeout=3000)
        page.wait_for_timeout(180)
        registered+=1
    result['shortTapsRegistered']=registered
    assert not errors,errors
    result.update({'viewport':'390x844','pageErrors':errors,'scope':'Local Chromium with server snapshots deliberately buffered; this proves visible local response before authoritative replies, not physical-device or cellular latency.'})
    (out/'movement-prediction-browser.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result))
    context.close()
    browser.close()
