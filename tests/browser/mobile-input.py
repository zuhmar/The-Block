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
    page.evaluate("""async()=>{
      const room=window.__touchProbeRoom,send=room.send.bind(room);
      window.__touchProbe={sent:[],room:null};
      room.send=function(type,data){if(type==='intent'&&data.action.type==='move'){window.__touchProbe.sent.push({...data.action,at:performance.now()});window.__touchProbe.room=this;}return send(type,data);};
      const loop=window.__mapSmoke.instance.scene.game.loop;loop.stop();window.__touchProbe.frame=loop.frame;
    }""")
    cdp=context.new_cdp_session(page)
    button=page.locator('[data-hold="right"]').bounding_box()
    assert button and button['width']>0
    point={'x':button['x']+button['width']/2,'y':button['y']+button['height']/2,'id':1}
    def press():
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]})
        page.wait_for_function('window.__touchProbe.sent.at(-1)?.dir===1')
    def release(kind='touchEnd'):
        cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[]})
        page.wait_for_function('window.__touchProbe.sent.at(-1)?.dir===0')
    page.wait_for_timeout(180)
    press()
    page.wait_for_timeout(320)
    release()
    page.wait_for_timeout(250)
    press()
    page.wait_for_timeout(100)
    release('touchCancel')
    press()
    page.evaluate("window.dispatchEvent(new Event('blur'))")
    page.wait_for_function('window.__touchProbe.sent.at(-1)?.dir===0')
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    result=page.evaluate("""()=>{const p=window.__touchProbe,l=window.__mapSmoke.instance.scene.game.loop;return {moves:p.sent.map(s=>s.dir),framesWhileTesting:l.frame-p.frame,loopStopped:!l.running}}""")
    assert result['moves']==[1,0,1,0,1,0],result
    assert result['framesWhileTesting']==0 and result['loopStopped'],result
    page.evaluate('window.__mapSmoke.instance.scene.game.loop.wake()')
    page.wait_for_timeout(300)
    start_position=page.locator('#coordinates').inner_text()
    press()
    page.wait_for_timeout(650)
    release()
    page.wait_for_timeout(200)
    result['authoritativeMovementObserved']=page.locator('#coordinates').inner_text()!=start_position
    assert result['authoritativeMovementObserved'],result
    assert not errors,errors
    result.update({'viewport':'390x844','deviceScaleFactor':2,'pageErrors':errors,'scope':'Real Chromium touch transitions without rendered frames, followed by resumed authoritative movement against an isolated local server; not a mobile-network or hardware speed measurement.'})
    (out/'mobile-input-results.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result))
    context.close()
    browser.close()
