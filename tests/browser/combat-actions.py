"""Actual phone controls for magazines, reload blocking/cancellation, and alternating punches."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
errors=[];checks={}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');page.locator('#start').click();cdp=c.new_cdp_session(page)
 def state():return page.locator('#world').evaluate('(c)=>({...c.dataset})')
 def touch_fire(down):
  r=page.locator('#fire').bounding_box();cdp.send('Input.dispatchTouchEvent',{'type':'touchStart' if down else 'touchEnd','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':1}] if down else []})
 for kind,size in [('pistol',12),('smg',30),('rifle',30),('sniper',5)]:
  page.locator('#'+kind+'-tool').click();page.wait_for_function('(k)=>document.querySelector("#world").dataset.equipped===k',arg=kind)
  before=int(state()['shots']);touch_fire(True);page.wait_for_function('(k)=>JSON.parse(document.querySelector("#world").dataset.ammo)[k]===0',arg=kind,timeout=25000);touch_fire(False)
  empty=state();assert int(empty['shots'])-before==size,(kind,empty)
  page.locator('#fire').click();assert int(state()['shots'])==int(empty['shots'])
  page.locator('#reload').click();page.wait_for_function('(k)=>document.querySelector("#world").dataset.reload===k',arg=kind)
  touch_fire(True);page.wait_for_function('Number(document.querySelector("#world").dataset.reloadProgress)>.2');mid=state();assert int(mid['shots'])==int(empty['shots']);assert float(mid['reloadPose'])<-.1;touch_fire(False)
  page.screenshot(path='work/reload-'+kind+'-phone.png')
  page.wait_for_function('document.querySelector("#world").dataset.reload===""',timeout=20000);assert json.loads(state()['ammo'])[kind]==size
  checks[kind]={'size':size,'stopsAtEmpty':True,'reloadBlocksFire':True,'reloadCompletes':True};print('Passed magazine:',kind,flush=True)
 # Cancel one reload by switching weapons; it must not silently refill.
 page.locator('#pistol-tool').click();page.locator('#fire').click();page.wait_for_timeout(250);page.locator('#reload').click();page.wait_for_function('document.querySelector("#world").dataset.reload==="pistol"');page.locator('#smg-tool').click();page.wait_for_function('document.querySelector("#world").dataset.reload===""');page.wait_for_timeout(1600);assert json.loads(state()['ammo'])['pistol']==11;checks['switchCancelsReload']=True
 # Pause freezes the in-progress timer and preserves the depleted magazine.
 page.locator('#pistol-tool').click();page.locator('#reload').click();page.wait_for_function('Number(document.querySelector("#world").dataset.reloadProgress)>.1');page.locator('#pause-button').click();frozen=state()['reloadProgress'];page.wait_for_timeout(600);assert state()['reloadProgress']==frozen;page.locator('#start').click();page.wait_for_function('document.querySelector("#world").dataset.reload===""',timeout=20000);assert json.loads(state()['ammo'])['pistol']==12;checks['pauseFreezesReload']=True
 page.locator('#hand-tool').click();page.wait_for_function('document.querySelector("#fire").textContent==="PUNCH"');shots=state()['shots'];ammo=state()['ammo'];touch_fire(True);page.wait_for_function('Number(document.querySelector("#world").dataset.punches)>=2');touch_fire(False)
 page.wait_for_function('Number(document.querySelector("#world").dataset.punchProgress)===0');touch_fire(True);page.wait_for_function('Number(document.querySelector("#world").dataset.punchProgress)>.18 && Number(document.querySelector("#world").dataset.punchProgress)<.5');page.screenshot(path='work/punch-phone.png');touch_fire(False);assert state()['shots']==shots and state()['ammo']==ammo
 checks['heldPunchAndNoAmmoCost']=True;checks['punch']=state();c.close()
 # Keyboard R reload remains distinct from build-mode rotation.
 c=b.new_context(viewport={'width':1280,'height':800});page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');page.locator('#start').click();page.wait_for_function('document.pointerLockElement===document.querySelector("#world")');page.keyboard.press('2');page.mouse.click(600,400);page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.ammo).pistol===11');page.keyboard.press('r');page.wait_for_function('document.querySelector("#world").dataset.reload==="pistol"');page.keyboard.down('w');page.wait_for_function('Number(document.querySelector("#world").dataset.position.split(",")[1])<13.5');page.keyboard.up('w');page.wait_for_function('document.querySelector("#world").dataset.reload===""',timeout=20000);checks['keyboardReloadAndMovement']=True;c.close();b.close()
assert not errors,errors
Path('work/combat-actions-check.json').write_text(json.dumps({'checks':checks,'pageErrors':errors,'scope':'Real controls in software WebGL Chromium; not a physical-phone FPS benchmark.'},indent=2)+'\n')
print('Passed magazines, reload, cancellation, pause, punches and keyboard movement',flush=True)
