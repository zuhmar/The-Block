"""Cross the actual bridge, see roaming SWAT, enter a field tent and search its cache."""
import json,math,os,hashlib,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
KEY='street-survival:3d-prototype:v1';results=[]
source=hashlib.sha256(Path('apps/client/src/fps/models/meshy-swat/animated.glb').read_bytes()).digest();swat=next(f.name for f in Path('apps/client/dist/assets').glob('*.glb') if hashlib.sha256(f.read_bytes()).digest()==source)
subprocess.run(['pnpm','exec','tsx','-e','import {writeFileSync} from "node:fs";import {configureWestRoad,ROADS} from "./apps/client/src/fps/world.ts";configureWestRoad([]);writeFileSync("work/west-route.json",JSON.stringify(ROADS[4]));'],check=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for mobile in [False]:
  if os.environ.get('MILITARY_CASE') and os.environ['MILITARY_CASE']!=str(int(mobile)):continue
  context=browser.new_context(viewport={'width':390,'height':844} if mobile else {'width':640,'height':480},is_mobile=mobile,has_touch=mobile,device_scale_factor=.65)
  context.add_init_script("if(!localStorage.getItem('"+KEY+"'))localStorage.setItem('"+KEY+"',JSON.stringify({version:1,wood:8765,pieces:[{id:'old-house',kind:'floor',x:40,z:40,rotation:0}],opened:[0,4,13,19]}))")
  page=context.new_page();errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url) if swat in r.url else None)
  page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');assert '384 × 384 m' in page.locator('#menu').inner_text();page.locator('#start').tap() if mobile else page.locator('#start').click();page.wait_for_function('document.querySelector("#world").dataset.buildingSources!==undefined');cdp=context.new_cdp_session(page)
  def state():return page.locator('#world').evaluate('(c)=>({...c.dataset})')
  def pos():return tuple(map(float,state()['position'].split(',')))
  def touch(kind,points):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
  def look(yaw,pitch=-.03):
   for _ in range(9):
    page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');d=state();delta=(yaw-float(d['yaw'])+math.pi)%(2*math.pi)-math.pi;pd=float(d['pitch'])-pitch
    if abs(delta)<.007 and abs(pd)<.007:return
    if mobile:
     dx=max(-230,min(230,-delta/.005));dy=max(-120,min(120,pd/.005));x=300 if dx<0 else 45;touch('touchStart',[{'x':x,'y':250,'id':3}]);touch('touchMove',[{'x':x+dx,'y':250+dy,'id':3}]);touch('touchEnd',[])
    else:page.evaluate('(d)=>document.dispatchEvent(new MouseEvent("mousemove",{movementX:d.x,movementY:d.y}))',{'x':-delta/.0024,'y':pd/.0024})
   raise AssertionError(('look',state()))
  def go(goal):
   print('go',mobile,goal,'from',pos(),'health',state()['health'],flush=True)
   for attempt in range(9):
    x,z=pos();dx,dz=goal[0]-x,goal[1]-z;dist=math.hypot(dx,dz)
    if dist<.29:return
    assert int(state()['health'])>0,('defeated',state());look(math.atan2(-dx,-dz))
    if mobile:
     # RUN remains on for the bridge approach; low stick displacement gives fine control.
     if not page.locator('#run').evaluate('(e)=>e.classList.contains("selected")') and dist>2:page.locator('#run').tap()
     r=page.locator('#joystick').bounding_box();amount=38 if dist>2 else 6
     touch('touchStart',[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2-amount,'id':1}])
    else:
     if dist>2:page.keyboard.down('Shift')
     page.keyboard.down('w')
    try:page.wait_for_function('(g)=>{const d=document.querySelector("#world").dataset;if(Number(d.health)<=0)return true;const p=d.position.split(",").map(Number);return (g.x-p[0])*g.dx+(g.z-p[1])*g.dz<g.margin}',arg={'x':goal[0],'z':goal[1],'dx':dx/dist,'dz':dz/dist,'margin':.45 if dist>2 else .06},timeout=60000)
    finally:
     if mobile:touch('touchEnd',[])
     else:page.keyboard.up('w');page.keyboard.up('Shift')
    page.wait_for_function('document.querySelector("#world").dataset.movement==="0.00,0.00"');assert int(state()['health'])>0,('defeated',state())
   raise AssertionError(('movement',goal,state()))
  def use():page.locator('#interact').tap() if mobile else page.keyboard.press('e')
  assert state()['mapSize']=='384';assert json.loads(state()['buildingSources'])==['blender']*19
  for goal in [(0,9),(-9,9),(-9,1.5),(-11.5,1.5),(-11.5,8.4)]:go(goal)
  page.wait_for_function('Math.abs(Number(document.querySelector("#world").dataset.footHeight)-3.2)<.05')
  page.screenshot(path='work/jail-watchtower-playable.png')
  for goal in [(-11.5,1.5),(-9,1.5),(-9,9),(0,9),(0,15.5),(-18,15.5),(-18,4),(-38,4),(-60,4)]:go(goal)
  for point in json.loads(Path('work/west-route.json').read_text())[1:]:go((point['x'],point['z']))
  for goal in [(-157,0),(-157,6.9)]:go(goal)
  page.screenshot(path='work/west-quarter-street.png');use();page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.doors)[17]<-1.55')
  go((-157,12));page.wait_for_function('document.querySelector("#world").dataset.inside==="17"');page.wait_for_function('document.querySelector("#world").dataset.nearestLoot==="35"');use();page.wait_for_function('JSON.parse(localStorage.getItem("'+KEY+'")).opened.includes(35)')
  page.screenshot(path='work/west-clinic-interior.png')
  for goal in [(-157,6.9),(-157,0),(-135,0),(-135,8)]:go(goal)
  use();page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.doors)[18]<-1.55');go((-135,11.5));page.wait_for_function('document.querySelector("#world").dataset.inside==="18"');assert 'FLOOR 1' in page.locator('#coordinates').inner_text();page.screenshot(path='work/west-offices-interior.png')
  assert not errors,errors
  result={'watchtowerClimbedAndDescended':True,'westernRoadTraversed':True,'clinicEntryAndLoot':True,'threeStoryOfficeEntry':True,'allNineteenModelsLoaded':True,'errors':errors};Path('work/town-expansion-browser-check.json').write_text(json.dumps(result,indent=2)+'\n');print(result,flush=True);context.close()
 browser.close()
