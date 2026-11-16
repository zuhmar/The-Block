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
    context = browser.new_context(viewport={'width': 1360, 'height': 900})
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
    page.wait_for_function('window.__mapSmoke.instance && window.__mapSmoke.instance.chunks.size > 4')
    first = page.evaluate('[...window.__mapSmoke.instance.chunks.keys()]')
    page.screenshot(path=str(out / 'official-desktop-spawn.png'))
    page.keyboard.down('s')
    page.wait_for_timeout(3000)
    page.keyboard.up('s')
    page.keyboard.down('Shift')
    page.keyboard.down('d')
    page.wait_for_timeout(12000)
    page.keyboard.up('d')
    page.keyboard.up('Shift')
    page.wait_for_timeout(1000)
    final = page.evaluate('''() => ({keys:[...window.__mapSmoke.instance.chunks.keys()],peak:window.__mapSmoke.peak,webgl:!!window.__mapSmoke.instance.scene.game.renderer.gl,objects:[...window.__mapSmoke.instance.chunks.values()].reduce((n,c)=>n+c.objects.length,0)})''')
    assert final['webgl'], 'Phaser did not create a WebGL renderer'
    assert final['peak'] <= 25, final
    assert len(set(first) - set(final['keys'])) > 0, 'Camera travel did not unload old chunks'
    assert len(set(final['keys']) - set(first)) > 0, 'Camera travel did not load new chunks'
    page.screenshot(path=str(out / 'official-desktop-world.png'))
    page.evaluate("""() => {const scene=window.__mapSmoke.instance.scene;scene.__qaFrame=()=>{scene.cameras.main.setZoom(.65).centerOn(8200,6100);};scene.events.on("postupdate",scene.__qaFrame);}""")
    page.wait_for_timeout(7000)
    page.screenshot(path=str(out / 'polished-downtown.png'))
    page.evaluate("""() => {const s=window.__mapSmoke.instance.scene;s.events.off("postupdate",s.__qaFrame);s.cameras.main.setZoom(1.03);}""")
    page.locator('#minimap-button').click()
    page.locator('#district-map').wait_for(state='visible')
    page.wait_for_timeout(600)
    page.screenshot(path=str(out / 'official-desktop-map.png'))
    print('Desktop map and chunk travel passed:',final)
    context.close()
    print('Starting fresh mobile browser context')
    mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    phone=mobile.new_page()
    phone.on('pageerror',lambda error:errors.append(str(error)))
    phone.add_locator_handler(phone.locator('#death'), lambda: phone.locator('#respawn').click())
    phone.goto('http://127.0.0.1:5173',wait_until='networkidle')
    print('Mobile page loaded')
    phone.locator('input[name="name"]').fill(name)
    phone.locator('input[name="password"]').fill(password)
    phone.locator('button[name="register"][value="false"]').click()
    phone.locator('#minimap-button').wait_for(state='visible')
    phone.wait_for_timeout(1500)
    point=phone.evaluate('''async()=>{const url=performance.getEntriesByType('resource').findLast(e=>e.name.includes('/src/map-world.ts')).name;const {MapWorld}=await import(url);const update=MapWorld.prototype.update;window.__phoneMap=null;MapWorld.prototype.update=function(view){window.__phoneMap=this;return update.call(this,view);};}''')
    phone.wait_for_function('window.__phoneMap && window.__phoneMap.scene.sprites.size>0')
    if phone.locator('#respawn').is_visible():
        phone.locator('#respawn').click()
        phone.locator('#death').wait_for(state='hidden')
        phone.wait_for_timeout(600)
    point=phone.evaluate('''()=>{const s=window.__phoneMap.scene,actor=[...s.sprites.values()].find(p=>p.texture.key.startsWith('player-stick')),cam=s.cameras.main;const p=cam.matrix.transformPoint(actor.x-cam.scrollX,actor.y-cam.scrollY);return {x:p.x,y:p.y};}''')
    assert 0<point['x']<390 and 0<point['y']<844,point
    phone.screenshot(path=str(out/'official-mobile-world.png'))
    print('Mobile world captured')
    phone.locator('#minimap-button').click()
    phone.locator('#district-map').wait_for(state='visible')
    phone.wait_for_timeout(600)
    phone.screenshot(path=str(out/'official-mobile-map.png'))
    print('Mobile map captured')
    assert not errors, errors
    result = {'actualPhaserWebGL': True, 'desktopViewport': '1360x900', 'mobileViewport': '390x844', 'peakLoadedChunks': final['peak'], 'chunksUnloadedOnTravel': True, 'chunksLoadedOnTravel': True, 'currentChunkObjects': final['objects'], 'pageErrors': errors, 'mobilePlayerOnScreen': True, 'scope': 'Local Chromium with software WebGL and an isolated database; responsive mobile viewport and camera zoom, not physical-device performance.'}
    (out / 'official-browser-results.json').write_text(json.dumps(result, indent=2))
    print(json.dumps(result))
    mobile.close()
    browser.close()
