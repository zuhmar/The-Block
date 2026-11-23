"""Raid saved player pieces with actual C4 controls; verify collisions, HP HUD, and persistence."""
import json,math,os
from pathlib import Path
from playwright.sync_api import sync_playwright
KEY='street-survival:3d-prototype:v1';results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for mobile in [False,True]:
  if os.environ.get('STRUCTURE_CASE') and os.environ['STRUCTURE_CASE']!=str(int(mobile)):continue
  context=browser.new_context(viewport={'width':390,'height':844} if mobile else {'width':800,'height':600},is_mobile=mobile,has_touch=mobile,device_scale_factor=.65)
  saved={'version':1,'wood':9500,'opened':[0,4],'pieces':[{'id':'wood-wall','kind':'wall','x':-4,'z':16,'rotation':0},{'id':'stone-wall','kind':'wall','x':0,'z':16,'rotation':0,'material':'stone'},{'id':'metal-wall','kind':'wall','x':4,'z':16,'rotation':0,'material':'metal'}]}
  context.add_init_script('if(!localStorage.getItem('+json.dumps(KEY)+'))localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(saved))+')')
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');page.locator('#start').tap() if mobile else page.locator('#start').click();page.wait_for_function('document.querySelector("#world").dataset.structureHealth!==undefined');cdp=context.new_cdp_session(page)
  def state():return page.locator('#world').evaluate('(c)=>({...c.dataset})')
  def pos():return tuple(map(float,state()['position'].split(',')))
  def touch(kind,points):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
  def look(yaw,pitch=-.03):
   for _ in range(10):
    page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');d=state();delta=(yaw-float(d['yaw'])+math.pi)%(2*math.pi)-math.pi;pd=float(d['pitch'])-pitch
    if abs(delta)<.008 and abs(pd)<.008:return
    if mobile:
     dx=max(-230,min(230,-delta/.005));dy=max(-120,min(120,pd/.005));x=300 if dx<0 else 45;touch('touchStart',[{'x':x,'y':250,'id':3}]);touch('touchMove',[{'x':x+dx,'y':250+dy,'id':3}]);touch('touchEnd',[])
    else:page.evaluate('(d)=>document.dispatchEvent(new MouseEvent("mousemove",{movementX:d.x,movementY:d.y}))',{'x':-delta/.0024,'y':pd/.0024})
   raise AssertionError(('look',state()))
  def go(goal):
   print('go',mobile,goal,flush=True)
   for _ in range(10):
    x,z=pos();dx,dz=goal[0]-x,goal[1]-z;distance=math.hypot(dx,dz)
    if distance<.3:return
    look(math.atan2(-dx,-dz))
    if mobile:
     r=page.locator('#joystick').bounding_box();amount=32 if distance>2 else 6;touch('touchStart',[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2-amount,'id':1}])
    else:page.keyboard.down('w')
    try:page.wait_for_function('(g)=>{const p=document.querySelector("#world").dataset.position.split(",").map(Number);return (g.x-p[0])*g.dx+(g.z-p[1])*g.dz<g.margin}',arg={'x':goal[0],'z':goal[1],'dx':dx/distance,'dz':dz/distance,'margin':.35 if distance>2 else .07},timeout=45000)
    finally:
     if mobile:touch('touchEnd',[])
     else:page.keyboard.up('w')
    page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
   raise AssertionError(('movement',goal,state()))
  def equipC4():
   page.locator('#c4-tool').tap() if mobile else page.keyboard.press('9')
   page.wait_for_function('document.querySelector("#world").dataset.equipped==="c4"&&document.querySelector("#world").dataset.weaponSource==="blender"')
  def plant(target):
   look(math.pi);equipC4()
   if mobile:
    r=page.locator('#fire').bounding_box();touch('touchStart',[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':2}]);page.wait_for_timeout(150);touch('touchEnd',[])
   else:page.mouse.down();page.wait_for_timeout(150);page.mouse.up()
   page.wait_for_function('(id)=>JSON.parse(document.querySelector("#world").dataset.projectiles).some(p=>p.attachedPieceId===id)',arg=target,timeout=30000)
  def detonate():
   before=int(state()['explosions']);page.locator('#detonate').tap() if mobile else page.keyboard.press('g');page.wait_for_function('(n)=>Number(document.querySelector("#world").dataset.explosions)>n',arg=before)
  assert [(v['material'],v['health']) for v in json.loads(state()['structureHealth'])]==[('wood',100),('stone',300),('metal',500)]
  go((-4,14));plant('wood-wall');go((-2.5,14));go((-2.5,16.6));go((-4,16.6));look(0);detonate();page.wait_for_function('!JSON.parse(document.querySelector("#world").dataset.structureHealth).some(p=>p.id==="wood-wall")');go((-4,14));assert not any(p['id']=='wood-wall' for p in page.evaluate('JSON.parse(localStorage.getItem("'+KEY+'")).pieces'))
  go((0,14));plant('stone-wall');go((1.5,14));go((1.5,16.6));go((0,16.6));look(0);detonate();page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.structureHealth).find(p=>p.id==="stone-wall").health===200');page.wait_for_function('document.querySelector("#structure-health-label").textContent.includes("200 / 300")');page.screenshot(path='work/structure-damage-'+('phone' if mobile else 'desktop')+'.png')
  after=page.evaluate('JSON.parse(localStorage.getItem("'+KEY+'"))');assert after['wood']==9500 and after['opened']==[0,4];assert next(p for p in after['pieces'] if p['id']=='stone-wall')['health']==200;assert int(state()['health'])>0;assert not errors,errors
  page.reload(wait_until='networkidle');page.locator('#start').tap() if mobile else page.locator('#start').click();page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.structureHealth).find(p=>p.id==="stone-wall").health===200');assert not any(v['id']=='wood-wall' for v in json.loads(state()['structureHealth']))
  # Materials are available through the normal build menu, with tier-specific previews and costs.
  page.locator('#build-tool').tap() if mobile else page.keyboard.press('b')
  if mobile:page.locator('[data-build-material="metal"]').tap()
  else:page.keyboard.press('t');page.keyboard.press('t')
  page.wait_for_function('document.querySelector("#world").dataset.buildMaterial==="metal"');assert page.locator('[data-piece="wall"] span').inner_text()=='25 wood'
  results.append({'phone':mobile,'legacyWoodHealth':True,'oneC4DestroysWood':True,'removedWallCollisionGone':True,'stoneDamagePersisted':True,'metalHealth500':True,'tierSelector':True,'errors':errors});print(results[-1],flush=True);context.close()
 browser.close()
Path('work/structure-health-browser-check.json').write_text(json.dumps(results,indent=2)+'\n')
