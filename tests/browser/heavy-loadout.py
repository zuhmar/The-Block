"""Use all eight weapons through actual mouse/touch controls in the compiled game."""
import json,math,os
from pathlib import Path
from playwright.sync_api import sync_playwright
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for mobile in [False,True]:
  if os.environ.get('LOADOUT_CASE') and os.environ['LOADOUT_CASE']!=str(int(mobile)):continue
  c=b.new_context(viewport={'width':390,'height':844} if mobile else {'width':800,'height':600},device_scale_factor=.65,is_mobile=mobile,has_touch=mobile)
  page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');page.locator('#start').tap() if mobile else page.locator('#start').click();page.wait_for_function('document.querySelector("#world").dataset.equipped!==undefined');cdp=c.new_cdp_session(page)
  def state():return page.locator('#world').evaluate('(c)=>({...c.dataset})')
  def tap(selector):
   if mobile:page.locator(selector).tap()
   else:
    key={'#pistol-tool':'2','#smg-tool':'3','#rifle-tool':'4','#sniper-tool':'5','#lmg-tool':'6','#rocket-tool':'7','#grenade-tool':'8','#c4-tool':'9','#reload':'r','#detonate':'g'}[selector];page.keyboard.press(key)
  def look(pitch):
   for _ in range(5):
    page.wait_for_timeout(180);d=state();dy=(float(d['pitch'])-pitch)/(.005 if mobile else .0024)
    if abs(dy)<2:return
    if mobile:
     delta=max(-150,min(150,dy));cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':300,'y':300,'id':3}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':300,'y':300+delta,'id':3}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:page.evaluate('(y)=>document.dispatchEvent(new MouseEvent("mousemove",{movementX:0,movementY:y}))',dy)
  def fire(hold=False):
   if mobile:
    r=page.locator('#fire').bounding_box();cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':1}]})
    if hold:page.wait_for_function('Number(document.querySelector("#world").dataset.shots)>=3')
    else:page.wait_for_timeout(200)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   else:
    page.mouse.down();page.wait_for_timeout(700 if hold else 120);page.mouse.up()
  def go(z):
   current=float(state()['position'].split(',')[1]);north=z<current
   if mobile:
    r=page.locator('#joystick').bounding_box();cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2+(-38 if north else 38),'id':2}]})
   else:page.keyboard.down('w' if north else 's')
   try:page.wait_for_function('(g)=>{const z=Number(document.querySelector("#world").dataset.position.split(",")[1]);return g.n?z<=g.z:z>=g.z}',arg={'n':north,'z':z},timeout=45000)
   finally:
    if mobile:cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:page.keyboard.up('w' if north else 's')
   page.wait_for_timeout(200)
  for kind in ['pistol','smg','rifle','sniper','lmg','rocket','grenade','c4']:
   tap('#'+kind+'-tool');page.wait_for_function('(k)=>{const d=document.querySelector("#world").dataset;return d.equipped===k&&d.weaponSource==="blender"}',arg=kind)
   r=page.locator('#'+kind+'-tool').bounding_box();assert r['x']>=0 and r['x']+r['width']<=page.viewport_size['width'],(kind,r)
   print('equipped',mobile,kind,flush=True)
   if kind in ['lmg','rocket','grenade','c4']:page.screenshot(path='work/loadout-'+kind+('-phone' if mobile else '-desktop')+'.png')
  tap('#lmg-tool');fire(True);page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.ammo).lmg<60');tap('#reload');page.wait_for_function('document.querySelector("#world").dataset.reload==="lmg"');page.wait_for_function('Number(document.querySelector("#world").dataset.reloadProgress)>.25');assert abs(float(state()['reloadPose']))>.01;page.screenshot(path='work/lmg-reload-'+str(mobile)+'.png');page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.ammo).lmg===60&&document.querySelector("#world").dataset.reload===""',timeout=60000)
  tap('#rocket-tool');before=int(state()['explosions']);fire();page.wait_for_function('(n)=>Number(document.querySelector("#world").dataset.explosions)>n',arg=before,timeout=20000);assert json.loads(state()['ammo'])['rocket']==0;tap('#reload');page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.ammo).rocket===1',timeout=60000)
  tap('#grenade-tool');before=int(state()['explosions']);rest=state()['usePose'];fire();page.wait_for_function('Number(document.querySelector("#world").dataset.useProgress)>.15&&Number(document.querySelector("#world").dataset.useProgress)<.6');assert state()['usePose']!=rest;page.screenshot(path='work/grenade-throw-'+str(mobile)+'.png');page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.projectiles).some(p=>p.kind==="grenade")');page.wait_for_function('(n)=>Number(document.querySelector("#world").dataset.explosions)>n',arg=before,timeout=60000);assert json.loads(state()['ammo'])['grenade']==2
  go(9.7);look(0);tap('#c4-tool');fire();page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.projectiles).some(p=>p.kind==="c4")',timeout=20000);assert json.loads(state()['ammo'])['c4']==1;assert page.locator('#detonate').is_visible();go(15);before=int(state()['explosions']);tap('#detonate') if mobile else page.keyboard.press('g');page.wait_for_function('(n)=>Number(document.querySelector("#world").dataset.explosions)>n',arg=before);assert not json.loads(state()['projectiles']);assert not page.locator('#detonate').is_visible()
  assert not errors,errors;results.append({'phone':mobile,'allEightBlenderModels':True,'lmgFireAndReload':True,'rocketImpactAndReload':True,'grenadeThrowFuse':True,'c4PlaceRetreatDetonate':True,'errors':errors});print(results[-1],flush=True);c.close()
 b.close()
Path('work/heavy-loadout-browser-check.json').write_text(json.dumps(results,indent=2)+'\n')
