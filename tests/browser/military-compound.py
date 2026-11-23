"""Cross the actual bridge, see roaming SWAT, enter a field tent and search its cache."""
import json,math,os,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
KEY='street-survival:3d-prototype:v1';results=[]
source=hashlib.sha256(Path('apps/client/src/fps/models/meshy-swat/animated.glb').read_bytes()).digest();swat=next(f.name for f in Path('apps/client/dist/assets').glob('*.glb') if hashlib.sha256(f.read_bytes()).digest()==source)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for mobile in [False,True]:
  if os.environ.get('MILITARY_CASE') and os.environ['MILITARY_CASE']!=str(int(mobile)):continue
  context=browser.new_context(viewport={'width':390,'height':844} if mobile else {'width':800,'height':600},is_mobile=mobile,has_touch=mobile)
  context.add_init_script("if(!localStorage.getItem('"+KEY+"'))localStorage.setItem('"+KEY+"',JSON.stringify({version:1,wood:8765,pieces:[{id:'old-house',kind:'floor',x:40,z:40,rotation:0}],opened:[0,4,13,19]}))")
  page=context.new_page();errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url) if swat in r.url else None)
  page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');assert '256 × 256 m' in page.locator('#menu').inner_text();page.locator('#start').tap() if mobile else page.locator('#start').click();page.wait_for_function('document.querySelector("#world").dataset.buildingSources!==undefined');cdp=context.new_cdp_session(page)
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
  assert state()['mapSize']=='256';assert json.loads(state()['buildingSources'])==['blender']*13
  units=json.loads(state()['enemies']);assert len(units)==7;fort=[e for e in units if e['id'].endswith('-patrol')];assert len(fort)==4 and all(e['kind']=='swat' for e in fort)
  page.wait_for_function('(initial)=>JSON.parse(document.querySelector("#world").dataset.enemies).some(e=>e.id===initial.id && Math.hypot(e.x-initial.x,e.z-initial.z)>.15)',arg=fort[0])
  for goal in [(14,14),(14,7),(35,7),(43,7)]:go(goal)
  page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.enemies).some(e=>e.id.endsWith("-patrol")&&e.visual==="blender"&&e.moving)')
  look(-math.pi/2);page.screenshot(path='work/military-'+('phone' if mobile else 'desktop')+'-bridge.png')
  if mobile:
   page.locator('#rifle-tool').tap()
   for guardId in ['gate-patrol','tent-patrol']:
    for shot in range(35):
     e=next(e for e in json.loads(state()['enemies']) if e['id']==guardId)
     if e['health']<=0:break
     if json.loads(state()['ammo'])['rifle']==0:
      page.locator('#reload').tap();page.wait_for_function('document.querySelector("#world").dataset.reload==="" && JSON.parse(document.querySelector("#world").dataset.ammo).rifle===30')
     x,z=pos();distance=math.hypot(e['x']-x,e['z']-z);look(math.atan2(x-e['x'],z-e['z']),-math.atan2(.55,distance))
     button=page.locator('#fire').bounding_box();touch('touchStart',[{'x':button['x']+button['width']/2,'y':button['y']+button['height']/2,'id':2}])
     hit=False
     try:
      page.wait_for_function('(t)=>JSON.parse(document.querySelector("#world").dataset.enemies).find(e=>e.id===t.id).health<t.health',arg={'id':guardId,'health':e['health']},timeout=1800);hit=True
     except Exception:pass
     finally:touch('touchEnd',[])
     if not hit:go((43,6.2 if shot%2 else 7.8))
    assert next(e for e in json.loads(state()['enemies']) if e['id']==guardId)['health']==0,('guard not defeated',guardId,state())
    print('Phone defeated',guardId,'health',state()['health'],flush=True)
  for goal in [(54,7),(60,7),(68,7),(74,15.8)]:go(goal)
  page.wait_for_function('document.querySelector("#zone").textContent==="FORT EAST"');page.screenshot(path='work/military-'+('phone' if mobile else 'desktop')+'-compound.png')
  use();page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.doors)[11]<-1.55');go((74,20.3));page.wait_for_function('document.querySelector("#world").dataset.inside==="11"');use();page.wait_for_function('Math.abs(JSON.parse(document.querySelector("#world").dataset.doors)[11])<.01');go((74,21));page.wait_for_function('document.querySelector("#world").dataset.nearestLoot==="24"')
  use();page.wait_for_function('JSON.parse(localStorage.getItem("'+KEY+'")).opened.includes(24)');saved=page.evaluate('JSON.parse(localStorage.getItem("'+KEY+'"))');assert saved['wood']==8835 and saved['pieces'][0]['id']=='old-house' and all(i in saved['opened'] for i in [0,4,13,19]);use();assert page.evaluate('JSON.parse(localStorage.getItem("'+KEY+'")).wood')==8835
  page.screenshot(path='work/military-'+('phone' if mobile else 'desktop')+'-tent.png');assert len(requests)==1,requests
  health=state()['health'];guardStates=json.loads(state()['enemies']);assert not errors,errors
  page.reload(wait_until='networkidle');assert page.evaluate('JSON.parse(localStorage.getItem("'+KEY+'")).wood')==8835
  results.append({'phone':mobile,'mapSize':256,'crossedBridgeAndFarBank':True,'fourRoamingSwat':True,'sharedSwatModelRequests':len(requests),'enteredAndClosedTent':True,'lootRewardOnce':True,'oldHouseAndSearchedIndicesPreserved':True,'reloadPreserved':True,'healthAfterCrossing':health,'rifleCombat':mobile,'guards':guardStates,'errors':errors});print(results[-1],flush=True);context.close()
 browser.close()
Path('work/military-browser-'+(os.environ.get('MILITARY_CASE') or 'all')+'.json').write_text(json.dumps(results,indent=2)+'\n')
