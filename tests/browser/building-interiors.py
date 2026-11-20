"""Walk into all five furnished buildings through actual animated doors. No teleporting or writable game hooks."""
import json,os,math,heapq,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
subprocess.run(['pnpm','exec','tsx','tests/browser/building-navigation.ts'],check=True,capture_output=True,text=True)
nav=json.loads(Path('work/building-nav.json').read_text());walls=set(nav['walls']);width=nav['width'];height=nav['height'];errors=[];checks=[]
def route(start,goal):
 def grid(p):return (round((p[0]-nav['minX'])/.5),round((p[1]-nav['minZ'])/.5))
 a,b=grid(start),grid(goal);queue=[(0,a)];cost={a:0};parent={}
 while queue:
  _,node=heapq.heappop(queue)
  if node==b:break
  for dx,dz in [(1,0),(-1,0),(0,1),(0,-1)]:
   nxt=(node[0]+dx,node[1]+dz)
   if not (0<=nxt[0]<width and 0<=nxt[1]<height) or nxt[1]*width+nxt[0] in walls:continue
   value=cost[node]+1
   if value<cost.get(nxt,100000):cost[nxt]=value;parent[nxt]=node;heapq.heappush(queue,(value+abs(nxt[0]-b[0])+abs(nxt[1]-b[1]),nxt))
 assert b==a or b in parent,(a,b)
 path=[b]
 while path[-1]!=a:path.append(parent[path[-1]])
 path.reverse();points=[]
 for i in range(1,len(path)-1):
  if (path[i][0]-path[i-1][0],path[i][1]-path[i-1][1])!=(path[i+1][0]-path[i][0],path[i+1][1]-path[i][1]):points.append(path[i])
 points.append(b)
 return [(nav['minX']+x*.5,nav['minZ']+z*.5) for x,z in points]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':1280,'height':800});page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:5173'),wait_until='networkidle');page.locator('#start').click();page.wait_for_function('document.pointerLockElement===document.querySelector("#world")')
 def state():return page.locator('#world').evaluate('(c)=>({...c.dataset})')
 def position():return tuple(float(v) for v in state()['position'].split(','))
 def look(yaw,pitch=-.03):
  d=state();delta=(yaw-float(d['yaw'])+math.pi)%(math.pi*2)-math.pi
  page.evaluate('(d)=>document.dispatchEvent(new MouseEvent("mousemove",{movementX:d.x,movementY:d.y}))',{'x':-delta/.0024,'y':(float(d['pitch'])-pitch)/.0024})
 def go(goal):
  for _ in range(100):
   x,z=position();dx,dz=goal[0]-x,goal[1]-z;distance=math.hypot(dx,dz)
   if distance<.14:return
   look(math.atan2(-dx,-dz));page.keyboard.down('w');sprint=distance>5
   if sprint:page.keyboard.down('Shift')
   if distance>1:page.wait_for_timeout(min(800,distance/(7 if sprint else 4.5)*1000*.82))
   else:page.evaluate('(count)=>new Promise(resolve=>{function frame(){if(--count<=0)resolve();else requestAnimationFrame(frame)}requestAnimationFrame(frame)})',1 if distance<.45 else 2)
   page.keyboard.up('w')
   if sprint:page.keyboard.up('Shift')
   page.wait_for_timeout(140)
  raise AssertionError(('route blocked',goal,state()))
 for i in ([] if os.environ.get("BUILDING_PHONE_ONLY") else [1,0,2,4,3]):
  b=nav['buildings'][i];front=b['front'];outside=(b['x'],b['doorZ']+front*2);inside=(b['x'],b['doorZ']-front*2.2)
  for waypoint in route(position(),outside):go(waypoint)
  page.wait_for_function('(i)=>Number(document.querySelector("#world").dataset.nearestDoor)===i',arg=i);page.keyboard.press('e');page.wait_for_function('(i)=>Math.abs(JSON.parse(document.querySelector("#world").dataset.doors)[i])>1.55',arg=i)
  go(inside);page.wait_for_function('(i)=>Number(document.querySelector("#world").dataset.inside)===i',arg=i)
  assert i in json.loads(state()['visibleInteriors'])
  page.screenshot(path='work/interior-'+b['type']+'.png')
  page.keyboard.press('e');page.wait_for_function('(i)=>Math.abs(JSON.parse(document.querySelector("#world").dataset.doors)[i])<.01',arg=i)
  look(math.pi if front>0 else 0,0);page.keyboard.press('2');page.mouse.down();page.mouse.up();page.wait_for_function('(i)=>Number(document.querySelector("#world").dataset.lastHitDoor)===i',arg=i)
  # A closed door blocks walking; back away so its swing has space to open again.
  if i==1:
   page.keyboard.down('w');page.wait_for_timeout(700);page.keyboard.up('w');page.wait_for_timeout(160);assert int(state()['inside'])==i;go(inside)
  page.keyboard.press('e');page.wait_for_function('(i)=>Math.abs(JSON.parse(document.querySelector("#world").dataset.doors)[i])>1.55',arg=i)
  look(math.pi if front>0 else 0,0);page.wait_for_timeout(220);page.mouse.down();page.mouse.up();page.wait_for_function('(i)=>Number(document.querySelector("#world").dataset.lastHitDoor)!==i',arg=i)
  go(outside);page.wait_for_function('Number(document.querySelector("#world").dataset.inside)===-1')
  check={'building':b['name'],'entered':True,'closedFromInside':True,'closedDoorBlocksShots':True,'openDoorAllowsShots':True,'exited':True,'render':state()};checks.append(check);print('Passed:',b['name'],flush=True)
 context.close()
 mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True);phone=mobile.new_page();phone.on('pageerror',lambda e:errors.append(str(e)));phone.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:5173'),wait_until='networkidle');phone.locator('#start').click();cdp=mobile.new_cdp_session(phone)
 box=phone.locator('#joystick').bounding_box();cx=box['x']+box['width']/2;cy=box['y']+box['height']/2
 def hold(dx,dy,condition):
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':cx+dx,'y':cy+dy,'id':1}]});phone.wait_for_function(condition,timeout=25000);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});phone.wait_for_timeout(200)
 hold(0,-38,'Number(document.querySelector("#world").dataset.position.split(",")[1])<-3.65')
 hold(8,0,'Number(document.querySelector("#world").dataset.position.split(",")[0])>2.95')
 phone.wait_for_function('Number(document.querySelector("#world").dataset.nearestDoor)===1')
 phone.evaluate("window.__doorTouches=[];for(const type of ['pointerdown','pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,e=>__doorTouches.push({type,id:e.pointerId,target:e.target.id}),true)");joy={'x':cx,'y':cy-38,'id':1};cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[joy]});phone.wait_for_function('Number(document.querySelector("#world").dataset.position.split(",")[1])<-5.4')
 use=phone.locator('#interact').bounding_box();finger={'x':use['x']+use['width']/2,'y':use['y']+use['height']/2,'id':2}
 # Release only the USE finger; the joystick finger stays held.
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[joy,finger]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[finger]})
 phone.wait_for_function('JSON.parse(document.querySelector("#world").dataset.doors)[1]>1.55')
 try:phone.wait_for_function('Number(document.querySelector("#world").dataset.position.split(",")[1])<-8',timeout=20000)
 except Exception:
  print('Mobile entry diagnostic:',phone.locator('#world').evaluate('(c)=>({...c.dataset})'),phone.evaluate('window.__doorTouches'),flush=True);raise
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});phone.wait_for_timeout(200)
 assert phone.locator('#zone').inner_text()=='THE HAVEN';phone.locator('#interact').click();phone.wait_for_function('Math.abs(JSON.parse(document.querySelector("#world").dataset.doors)[1])<.01');phone.screenshot(path='work/interior-mobile-haven.png')
 assert not errors,errors
 result={'fiveBuildings':checks,'mobileUseAndEntry':True,'mobileUseWhileMoving':True,'closedDoorStopsWalking':True,'pageErrors':errors,'scope':'Actual desktop input and phone multitouch in local software-WebGL Chromium; no teleporting, no physical-device performance claim.'};Path('work/building-mobile-held-use-check.json' if os.environ.get('BUILDING_PHONE_ONLY') else 'work/building-interiors-check.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));mobile.close();browser.close()
