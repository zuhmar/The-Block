"""Check all new 3D weapons, equipping, real held firing and scope use on a phone viewport."""
import json,os,math
from pathlib import Path
from playwright.sync_api import sync_playwright
errors=[];result={};out=Path('work');out.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:5173'),wait_until='networkidle')
 page.locator('#view-models').click()
 page.wait_for_function('document.querySelector("#actor-canvas").dataset.weaponSources==="blender,blender,blender,blender"')
 for kind in ['pistol','smg','rifle','sniper']:
  page.locator('#show-'+kind).click();page.wait_for_function('(kind)=>document.querySelector("#actor-canvas").dataset.model===kind',arg=kind);metrics=page.locator('#actor-canvas').evaluate('(c)=>({...c.dataset})');assert int(metrics['drawCalls'])<14 and int(metrics['triangles'])<25000,metrics;page.screenshot(path=str(out/('weapon-'+kind+'-preview.png')));result[kind]={'preview':metrics}
 page.locator('#close-actors').click();page.locator('#start').click();page.locator('#build-tool').click();assert page.locator('#build-panel').is_visible();page.locator('#smg-tool').click();assert not page.locator('#build-panel').is_visible();result['weaponSelectionExitsBuildMode']=True;cdp=c.new_cdp_session(page)
 def pos(selector,i):
  r=page.locator(selector).bounding_box();return {'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':i}
 for kind in ['pistol','smg','rifle','sniper']:
  page.locator('#'+kind+'-tool').click();page.wait_for_function('(kind)=>document.querySelector("#world").dataset.equipped===kind',arg=kind);page.wait_for_function('document.querySelector("#world").dataset.weaponSource==="blender"');page.wait_for_timeout(1150)
  before=int(page.locator('#world').get_attribute('data-shots'));point=pos('#fire',1);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]});page.wait_for_timeout(1400);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_function('document.querySelector("#world").dataset.firing==="false"');after=int(page.locator('#world').get_attribute('data-shots'));count=after-before
  assert count>0,(kind,count)
  if kind=='sniper':assert count<=2,count
  else:assert count>=4,(kind,count)
  result[kind]['heldShots']=count
  page.locator('#aim').click();page.wait_for_function('document.querySelector("#world").dataset.aiming==="true"');fov=float(page.locator('#world').get_attribute('data-fov'));assert fov<72,fov
  if kind=='sniper':assert fov==20 and page.locator('#scope-overlay').is_visible();page.screenshot(path=str(out/'weapon-sniper-scope.png'))
  page.locator('#aim').click();page.wait_for_function('document.querySelector("#world").dataset.fov==="72"');page.screenshot(path=str(out/('weapon-'+kind+'-first-person.png')))
  result[kind]['aimFov']=fov;result[kind]['game']=page.locator('#world').evaluate('(c)=>({...c.dataset})')
  assert int(result[kind]['game']['drawCalls'])<120 and int(result[kind]['game']['triangles'])<25000,result[kind]
 assert result['smg']['heldShots']>result['rifle']['heldShots']>result['sniper']['heldShots'],result
 # Selecting another weapon exits the scope, and stopping held fire stays stopped.
 page.locator('#aim').click();page.locator('#pistol-tool').click();page.wait_for_function('document.querySelector("#world").dataset.equipped==="pistol"&&document.querySelector("#world").dataset.fov==="72"');assert not page.locator('#scope-overlay').is_visible()
 # Verify scoped sniper damage against the actual NPC, using movement and touch aiming.
 page.locator('#sniper-tool').click();joy=pos('#joystick',2);joy['y']+=38;cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[joy]});page.wait_for_function('Number(document.querySelector("#world").dataset.position.split(",")[1])>30',timeout=25000);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.enemy).state==="aim"')
 for _ in range(3):
  d=page.locator('#world').evaluate('(c)=>({...c.dataset})');x,z=[float(v) for v in d['position'].split(',')];enemy=json.loads(d['enemy']);wanted=math.atan2(x-enemy['x'],z-enemy['z']);delta=(wanted-float(d['yaw'])+math.pi)%(2*math.pi)-math.pi;dx=max(-280,min(280,-delta/.005));distance=math.hypot(x-enemy['x'],z-enemy['z']);want_pitch=math.atan2(1.15-1.65,distance);dy=(float(d['pitch'])-want_pitch)/.005;startx=340 if dx<0 else 40
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':startx,'y':300,'id':3}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':startx+dx,'y':300+dy,'id':3}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(150)
 page.locator('#aim').click();page.wait_for_function('document.querySelector("#world").dataset.fov==="20"');before=int(page.locator('#world').get_attribute('data-shots'));page.locator('#fire').click();page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.enemy).health===0',timeout=5000);assert int(page.locator('#world').get_attribute('data-shots'))==before+1;result['sniperScopedEnemyOneShot']=True
 assert not errors,errors;result['pageErrors']=errors;result['scope']='Local software-WebGL Chromium with real touch input; not a physical-phone benchmark.'
 c.close()
 desktop=b.new_context(viewport={'width':1280,'height':800});pc=desktop.new_page();pc.on('pageerror',lambda e:errors.append(str(e)));pc.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:5173'),wait_until='networkidle');pc.locator('#start').click();pc.wait_for_function('document.pointerLockElement===document.querySelector("#world")');pc.keyboard.press('4');pc.mouse.down(button='right');pc.wait_for_function('document.querySelector("#world").dataset.aiming==="true"');pc.keyboard.down('w');pc.mouse.down(button='left');pc.wait_for_function('Number(document.querySelector("#world").dataset.shots)>=3&&Number(document.querySelector("#world").dataset.position.split(",")[1])<13');pc.mouse.up(button='left');pc.keyboard.up('w');pc.wait_for_function('document.querySelector("#world").dataset.firing==="false"&&document.querySelector("#world").dataset.aiming==="true"');pc.mouse.up(button='right');pc.wait_for_function('document.querySelector("#world").dataset.fov==="72"');result['desktopMoveAimAndFire']=True;assert not errors,errors;desktop.close()
 (out/'weapon-loadout-check.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));b.close()
