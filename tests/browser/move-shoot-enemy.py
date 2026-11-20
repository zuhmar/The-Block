"""Real multi-touch move/aim/held fire and an NPC exchanging shots with the player."""
import json,os,math
from pathlib import Path
from playwright.sync_api import sync_playwright
errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True);c.add_init_script("if(!localStorage.getItem('street-survival:3d-prototype:v1'))localStorage.setItem('street-survival:3d-prototype:v1',JSON.stringify({version:1,wood:9876,pieces:[],opened:[]}))");page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:5173'),wait_until='networkidle');page.locator('#start').click();page.locator('#pistol-tool').click()
 cdp=c.new_cdp_session(page)
 def point(selector,identity,dy=0):
  r=page.locator(selector).bounding_box();return {'x':r['x']+r['width']/2,'y':r['y']+r['height']/2+dy,'id':identity}
 def touch(kind,points):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
 joy=point('#joystick',1,38);fire=point('#fire',2)
 touch('touchStart',[joy,fire]);page.wait_for_function('Number(document.querySelector("#world").dataset.shots)>=3')
 # Both thumbs stay down; dragging the fire thumb also aims.
 fire['x']+=12;touch('touchMove',[joy,fire]);page.wait_for_function('Number(document.querySelector("#world").dataset.position.split(",")[1])>30',timeout=25000)
 moving=page.locator('#world').evaluate('(c)=>({...c.dataset})');assert int(moving['shots'])>=3 and abs(float(moving['yaw']))>.03,moving
 touch('touchCancel',[]);page.wait_for_function('document.querySelector("#world").dataset.firing==="false"&&document.querySelector("#world").dataset.movement==="0.00,0.00"')
 page.wait_for_timeout(260);shots=page.locator('#world').get_attribute('data-shots');page.wait_for_timeout(300);assert page.locator('#world').get_attribute('data-shots')==shots
 page.wait_for_function('Number(document.querySelector("#world").dataset.health)<100',timeout=25000)
 damaged=page.locator('#world').evaluate('(c)=>({...c.dataset})');assert json.loads(damaged['enemy'])['shots']>0
 # Turn through actual touch gestures toward the hostile's upper body.
 for _ in range(3):
  d=page.locator('#world').evaluate('(c)=>({...c.dataset})');x,z=[float(v) for v in d['position'].split(',')];enemy=json.loads(d['enemy']);yaw=float(d['yaw']);pitch=float(d['pitch']);want=math.atan2(x-enemy['x'],z-enemy['z']);delta=(want-yaw+math.pi)%(2*math.pi)-math.pi;dx=max(-280,min(280,-delta/.005));dy=(pitch-(-.04))/.005;startx=340 if dx<0 else 40
  touch('touchStart',[{'x':startx,'y':300,'id':3}]);touch('touchMove',[{'x':startx+dx,'y':300+dy,'id':3}]);touch('touchEnd',[]);page.wait_for_timeout(160)
 if json.loads(page.locator('#world').get_attribute('data-ammo'))['pistol']<3:
  page.locator('#reload').click();page.wait_for_function('document.querySelector("#world").dataset.reload===""',timeout=20000)
 touch('touchStart',[point('#fire',4)]);page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.enemy).health===0',timeout=12000);touch('touchEnd',[])
 page.screenshot(path='work/move-shoot-enemy.png');final=page.locator('#world').evaluate('(c)=>({...c.dataset})')
 # Reload resets the practice opponent; remain exposed until death, then respawn.
 page.reload(wait_until='networkidle');page.locator('#start').click()
 joy=point('#joystick',5,38);touch('touchStart',[joy]);page.wait_for_function('Number(document.querySelector("#world").dataset.position.split(",")[1])>30',timeout=25000);touch('touchEnd',[])
 page.locator('#defeated').wait_for(state='visible',timeout=60000)
 wood=page.locator('#wood').inner_text();page.locator('#respawn').click();page.wait_for_function('document.querySelector("#world").dataset.health==="100"')
 assert page.locator('#wood').inner_text()==wood
 respawned=page.locator('#world').evaluate('(c)=>({...c.dataset})');assert respawned['position']=='0.000,14.000',respawned
 assert not errors,errors
 result={'simultaneousMovementAndHeldFire':True,'dragFireToAim':True,'cancelStopsFireAndMovement':True,'enemyShotPlayer':True,'playerDefeatedEnemy':True,'deathAndRespawnPreserveWood':True,'moving':moving,'afterEnemyHit':damaged,'final':final,'pageErrors':errors,'scope':'Real mobile multitouch in local software-WebGL Chromium; not physical-device FPS.'}
 Path('work/move-shoot-enemy-check.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));c.close();b.close()
