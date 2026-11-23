"""Exercise tier loading, real movement/collision, search persistence and phone fallback."""
import json,math,os,re
from pathlib import Path
from playwright.sync_api import sync_playwright
KEY='street-survival:3d-prototype:v1';results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for mobile,fallback in ([(False,False)] if os.environ.get('CHEST_DESKTOP_ONLY') else [(False,False),(True,False),(True,True)]):
  c=b.new_context(viewport={'width':390,'height':844} if mobile else {'width':800,'height':600},is_mobile=mobile,has_touch=mobile)
  c.add_init_script("if(!localStorage.getItem('"+KEY+"'))localStorage.setItem('"+KEY+"',JSON.stringify({version:1,wood:8765,pieces:[{id:'legacy-floor',kind:'floor',x:40,z:40,rotation:0}],opened:[4]}))")
  page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  if fallback:page.route(re.compile(r'/tier-[1-5]-[^/]+\.glb$'),lambda r:r.abort())
  page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle')
  page.locator('#start').tap() if mobile else page.locator('#start').click()
  page.wait_for_function('document.querySelector("#world").dataset.lootModels!==undefined')
  def state():return page.locator('#world').evaluate('(c)=>({...c.dataset})')
  assert state()['lootProxyCount']=='65',state()
  def saved():return page.evaluate('JSON.parse(localStorage.getItem("'+KEY+'"))')
  assert all(v.endswith(':fallback' if fallback else ':meshy') for v in state()['lootModels'].split(',')),state()['lootModels']
  def look(yaw):
   page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
   d=state();delta=(yaw-float(d['yaw'])+math.pi)%(2*math.pi)-math.pi
   # Touch controls use the same underlying camera; desktop event is accepted by both.
   page.evaluate('(x)=>document.dispatchEvent(new MouseEvent("mousemove",{movementX:x,movementY:0}))',-delta/.0024)
  # Use real WASD on desktop to approach the small chest from spawn.
  if not mobile:
   for goal in [(0,15.5),(-18,15.5),(-18,4),(-23,4),(-23,5)]:
    for step in range(180):
     x,z=map(float,state()['position'].split(','));dx,dz=goal[0]-x,goal[1]-z
     if math.hypot(dx,dz)<.22:break
     if goal==(-23,5) and z>5.15:break
     look(math.atan2(-dx,-dz));old=state()['position'];page.keyboard.down('w');page.wait_for_function('(old)=>document.querySelector("#world").dataset.position!==old',arg=old);page.keyboard.up('w')
    else:raise AssertionError(('movement stuck',state()))
   look(0);page.keyboard.down('s');page.wait_for_timeout(450);page.keyboard.up('s')
   x,z=map(float,state()['position'].split(','));assert 4.9<z<5.4,(x,z)
   page.keyboard.press('e');page.wait_for_function('JSON.parse(localStorage.getItem("'+KEY+'")).opened.includes(0)')
   assert saved()['wood']==8810,saved()
   page.keyboard.press('e');assert saved()['wood']==8810
   page.evaluate('()=>document.dispatchEvent(new MouseEvent("mousemove",{movementX:0,movementY:300}))');page.wait_for_function('Number(document.querySelector("#world").dataset.pitch)<-.7')
   page.screenshot(path='work/loot-chests-desktop.png')
   page.reload(wait_until='networkidle');page.locator('#start').click();page.wait_for_function('document.querySelector("#world").dataset.lootModels!==undefined')
   assert saved()['opened']==[4,0] and saved()['wood']==8810
  else:
   assert page.locator('#interact').is_visible();page.locator('#interact').tap()
   assert saved()['wood']==8765 and saved()['opened']==[4]
   page.screenshot(path='work/loot-chests-'+('fallback' if fallback else 'phone')+'.png')
  assert saved()['pieces'][0]['id']=='legacy-floor';assert not errors,errors
  results.append({'phone':mobile,'fallback':fallback,'sources':state()['lootModels'],'legacySavePreserved':True,'errors':errors})
  print(results[-1],flush=True);c.close()
 b.close()
Path('work/loot-chests-'+('desktop-check.json' if os.environ.get('CHEST_DESKTOP_ONLY') else 'browser-check.json')).write_text(json.dumps({'desktopSearchRewardAndCollision':True,'noRepeatReward':True,'searchedStateSurvivesReload':True,'cases':results},indent=2)+'\n')
