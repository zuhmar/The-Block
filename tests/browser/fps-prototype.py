"""Exercise the first-person prototype through desktop and real multitouch input.
No backend or database is used. Software WebGL is not a physical-phone benchmark.
"""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('work');OUT.mkdir(exist_ok=True)
URL=os.environ.get('FPS_CHECK_URL','http://127.0.0.1:5173')
KEY='street-survival:3d-prototype:v1'
errors=[];backend=[]
def position(page):return [float(n) for n in page.locator('#world').get_attribute('data-position').split(',')]
def saved(page):return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',KEY)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 desktop=browser.new_context(viewport={'width':1280,'height':800})
 page=desktop.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:backend.append(r.url) if r.url.endswith('/auth') or r.url.endswith('/world') or r.url.startswith('ws:') else None)
 page.goto(URL,wait_until='networkidle');page.locator('#start').click();page.wait_for_function('document.pointerLockElement===document.querySelector("#world")')
 assert position(page)==[0,14]
 page.keyboard.down('w');page.wait_for_function('Number(document.querySelector("#world").dataset.position.split(",")[1])<11');page.keyboard.up('w')
 page.keyboard.down('s');page.wait_for_function('Number(document.querySelector("#world").dataset.position.split(",")[1])>35',timeout=20000);page.keyboard.up('s');page.wait_for_timeout(150)
 stop=position(page);page.wait_for_timeout(200);assert abs(position(page)[1]-stop[1])<.1
 # Look down using the same mouse movement event consumed under real pointer lock.
 page.evaluate("document.dispatchEvent(new MouseEvent('mousemove',{movementY:250}))")
 page.keyboard.press('b');page.wait_for_function('document.querySelector("#placement").textContent.includes("Ready to place")')
 page.mouse.down();page.mouse.up();page.wait_for_function('(key)=>JSON.parse(localStorage.getItem(key))?.pieces.length===1',arg=KEY)
 assert saved(page)['wood']==9992,saved(page)
 page.keyboard.press('2');page.wait_for_function('document.querySelector("#placement").textContent.includes("Ready to place")')
 page.mouse.down();page.mouse.up();page.wait_for_function('(key)=>JSON.parse(localStorage.getItem(key))?.pieces.length===2',arg=KEY)
 assert saved(page)['wood']==9987
 # Raise the view to the wall face, then dismantle it; its floor remains.
 page.evaluate("document.dispatchEvent(new MouseEvent('mousemove',{movementY:-230}))")
 page.keyboard.press('Delete');page.wait_for_function('(key)=>JSON.parse(localStorage.getItem(key))?.pieces.length===1',arg=KEY)
 assert saved(page)['wood']==9992
 page.keyboard.press('b');page.keyboard.press('2');assert 'selected' in page.locator('#pistol-tool').get_attribute('class')
 page.mouse.down();page.mouse.up();page.wait_for_timeout(100)
 page.screenshot(path=str(OUT/'fps-desktop-play.png'))
 metrics=page.locator('#world').evaluate('(c)=>({...c.dataset})');assert int(metrics['drawCalls'])<120,metrics
 page.keyboard.press('Escape');assert page.locator('#menu').is_visible()
 page.reload(wait_until='networkidle');assert len(saved(page)['pieces'])==1 and saved(page)['wood']==9992
 desktop.close()
 # A full 100-piece practice base must retain a small draw-call budget.
 full=browser.new_context(viewport={'width':960,'height':700})
 fixture={'version':1,'wood':9200,'pieces':[{'id':'floor'+str(i),'kind':'floor','rotation':0,'x':-20+(i%20)*2,'z':-40+(i//20)*2} for i in range(100)],'opened':[]}
 full.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(fixture))+')')
 crowded=full.new_page();crowded.on('pageerror',lambda e:errors.append(str(e)));crowded.goto(URL,wait_until='networkidle');crowded.locator('#start').click();crowded.wait_for_timeout(500)
 full_metrics=crowded.locator('#world').evaluate('(c)=>({...c.dataset})');assert int(full_metrics['drawCalls'])<120,full_metrics
 full.close()
 mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True)
 phone=mobile.new_page();phone.on('pageerror',lambda e:errors.append(str(e)));phone.goto(URL,wait_until='networkidle');phone.locator('#start').click();phone.wait_for_timeout(250)
 cdp=mobile.new_cdp_session(phone);b=phone.locator('#joystick').bounding_box();cx=b['x']+b['width']/2;cy=b['y']+b['height']/2
 points=[{'x':cx,'y':cy,'id':1},{'x':300,'y':340,'id':2}]
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':points})
 points=[{'x':cx,'y':cy+40,'id':1},{'x':310,'y':460,'id':2}]
 cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':points})
 phone.wait_for_function('Number(document.querySelector("#world").dataset.position.split(",")[1])>34',timeout=25000)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});phone.wait_for_timeout(100)
 stopped=position(phone);phone.wait_for_timeout(250);assert abs(position(phone)[1]-stopped[1])<.1
 assert float(phone.locator('#world').get_attribute('data-pitch'))<-.5
 assert abs(float(phone.locator('#world').get_attribute('data-yaw')))>.02
 phone.locator('#build-tool').click();phone.locator('[data-piece="wall"]').click();assert 'selected' in phone.locator('[data-piece="wall"]').get_attribute('class')
 phone.locator('#build-tool').click();phone.locator('#pistol-tool').click();phone.locator('#fire').click()
 phone.screenshot(path=str(OUT/'fps-mobile-play.png'))
 density=phone.locator('#world').evaluate('(c)=>({width:c.width,height:c.height,cssWidth:c.clientWidth,cssHeight:c.clientHeight,...c.dataset})')
 assert density['width']<=488 and density['height']<=1055,density
 assert int(density['drawCalls'])<120 and int(density['triangles'])<20000,density
 # A real touch cancellation stops walking, and pause prevents later input movement.
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':cx,'y':cy+40,'id':3}]});phone.wait_for_function('document.querySelector("#world").dataset.movement!=="0.00,0.00"')
 cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});phone.wait_for_function('document.querySelector("#world").dataset.movement==="0.00,0.00"');stop=position(phone);phone.wait_for_timeout(220);assert abs(position(phone)[1]-stop[1])<.1
 phone.locator('#pause-button').click();assert phone.locator('#menu').is_visible()
 assert not errors,errors;assert not backend,backend
 result={'desktopMovement':True,'floorAndWallPlacement':True,'wallRemovalRefund':True,'localSaveReload':True,'mobileSimultaneousMoveAndLook':True,'mobileCancelStopsMovement':True,'pause':True,'desktop':metrics,'full100PieceBase':full_metrics,'mobile':density,'pageErrors':errors,'backendRequests':backend,'scope':'Chromium software WebGL; real input and responsive viewport, not physical-phone FPS.'}
 (OUT/'fps-browser-check.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
 mobile.close();browser.close()
