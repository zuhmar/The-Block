"""First-party map render smoke against a local dev server and isolated test DB.
Uses an existing Chromium installation; does not install browsers or touch production.
"""
import json
import secrets
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path('work')
out.mkdir(exist_ok=True)
errors = []
with sync_playwright() as runner:
    browser = runner.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-accelerated-2d-canvas'])
    context = browser.new_context(viewport={'width': 960, 'height': 700}, device_scale_factor=2, has_touch=True)
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
    checks=[]
    for width,height,ratio in [(960,700,2),(1920,1080,1.5),(390,844,2)]:
        page.set_viewport_size({'width':width,'height':height})
        page.wait_for_timeout(1800)
        page.wait_for_function("""()=>{const m=window.__mapSmoke.instance,c=m.scene.cameras.main;c.preRender();const v=c.worldView;for(let y=Math.max(0,Math.floor(v.y/1024));y<=Math.min(15,Math.floor((v.y+v.height)/1024));y++)for(let x=Math.max(0,Math.floor(v.x/1024));x<=Math.min(15,Math.floor((v.x+v.width)/1024));x++)if(!m.chunks.has(`${x},${y}`))return false;return true;}""")
        density=page.evaluate("""()=>{const m=window.__mapSmoke.instance,s=m.scene,c=s.game.canvas,b=c.getBoundingClientRect(),cam=s.cameras.main;cam.preRender();const actor=[...s.sprites.values()].find(p=>p.texture.key.startsWith("player-stick")),point=cam.matrix.transformPoint(actor.x-cam.scrollX,actor.y-cam.scrollY);return {cameraWidth:cam.width,cameraHeight:cam.height,actorX:point.x*b.width/c.width,actorY:point.y*b.height/c.height,width:c.width,height:c.height,cssWidth:b.width,cssHeight:b.height,zoom:cam.zoom*s.game.scale.zoom,chunks:m.chunks.size,chunkWidth:s.textures.get([...m.chunks.values()][0].texture).getSourceImage().width};}""")
        assert density['width']==round(width*ratio) and density['height']==round(height*ratio),density
        assert abs(density['cssWidth']-width)<1 and abs(density['cssHeight']-height)<1,density
        assert abs(density['zoom']-1)<.001,density
        assert density['cameraWidth']==density['width'] and density['cameraHeight']==density['height'],density
        assert abs(density['actorX']-width/2)<3 and abs(density['actorY']-height/2)<3,density
        assert density['chunkWidth'] in (516,2052) and density['chunks']<=12,density
        target=page.evaluate("""()=>{const s=window.__mapSmoke.instance.scene,c=s.cameras.main;const point={x:Math.round((c.scrollX+c.width/2)/64)*64+64,y:Math.round((c.scrollY+c.height/2)/64)*64+64};c.preRender();const p=c.matrix.transformPoint(point.x-c.scrollX,point.y-c.scrollY),b=s.game.canvas.getBoundingClientRect();return {...point,screenX:p.x*b.width/s.game.canvas.width,screenY:p.y*b.height/s.game.canvas.height};}""")
        page.mouse.move(target['screenX'],target['screenY'])
        page.wait_for_timeout(250)
        actual=page.evaluate("""async()=>{const url=performance.getEntriesByType('resource').findLast(e=>e.name.includes('/src/world-pointer.ts')).name;const {pointerToWorld,constructionPlan}=await import(url);const s=window.__mapSmoke.instance.scene,p=s.input.activePointer,c=s.cameras.main;return {point:pointerToWorld(p,c),plan:constructionPlan(p,c,'foundation','qa',[])};}""")
        assert abs(actual['point']['x']-target['x'])<1 and abs(actual['point']['y']-target['y'])<1,(target,actual)
        assert actual['plan']['point']=={'x':target['x'],'y':target['y']},(target,actual)
        if width==960:
            page.mouse.wheel(0,1)
            page.wait_for_timeout(250)
            zoom=page.evaluate('window.__mapSmoke.instance.scene.cameras.main.zoom*window.__mapSmoke.instance.scene.game.scale.zoom')
            assert .95<zoom<1,zoom
            page.mouse.wheel(0,-1)
            page.wait_for_timeout(250)
        checks.append({'viewport':f'{width}x{height}','ratio':ratio,'pointerAndBuildProjection':True,**density})
        if width==960:page.screenshot(path=str(out/'sharp-retina-desktop.png'))
    assert not errors, errors
    (out/'render-quality-browser.json').write_text(json.dumps({'checks':checks,'pageErrors':errors},indent=2))
    print(json.dumps({'checks':checks,'pageErrors':errors}))
    context.close()
    browser.close()
