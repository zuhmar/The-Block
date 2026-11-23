"""Place the five wood modules through real controls; verify doors, saves and refunds."""
import json,os,math,heapq,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
os.environ['NPC_NAV']='1'
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
 context=browser.new_context(viewport={'width':800,'height':600});context.add_init_script("if(!localStorage.getItem('street-survival:3d-prototype:v1'))localStorage.setItem('street-survival:3d-prototype:v1',JSON.stringify({version:1,wood:9876,pieces:[{id:'prior-floor',kind:'floor',x:42,z:44,rotation:0}],opened:[]}))")
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');page.locator('#start').click()
 def state():return page.locator('#world').evaluate('(c)=>({...c.dataset})')
 def position():return tuple(float(v) for v in state()['position'].split(','))
 def saved():return page.evaluate('JSON.parse(localStorage.getItem("street-survival:3d-prototype:v1"))')
 def look(yaw,pitch=-.03):
  page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
  d=state();delta=(yaw-float(d['yaw'])+math.pi)%(math.pi*2)-math.pi
  page.evaluate('(d)=>document.dispatchEvent(new MouseEvent("mousemove",{movementX:d.x,movementY:d.y}))',{'x':-delta/.0024,'y':(float(d['pitch'])-pitch)/.0024})
  page.wait_for_function('(v)=>{const d=document.querySelector("#world").dataset;return Math.abs(Math.atan2(Math.sin(Number(d.yaw)-v.yaw),Math.cos(Number(d.yaw)-v.yaw)))<.004&&Math.abs(Number(d.pitch)-v.pitch)<.004}',arg={'yaw':yaw,'pitch':pitch})
 def aim(x,z,y):
  px,pz=position();look(math.atan2(-(x-px),-(z-pz)),-math.atan2(1.65+float(state()['footHeight'])-y,math.hypot(x-px,z-pz)))
 def go(goal):
  for _ in range(110):
   x,z=position();dx,dz=goal[0]-x,goal[1]-z;distance=math.hypot(dx,dz)
   if _%15==0:print('Walking',goal,'from',(x,z),'height',state()['footHeight'],'doors',state()['playerDoors'],flush=True)
   if distance<.22:return
   look(math.atan2(-dx,-dz));page.keyboard.down('w');sprint=distance>5
   if sprint:page.keyboard.down('Shift')
   if distance<1:
    before=state()['position'];page.wait_for_function('(before)=>document.querySelector("#world").dataset.position!==before',arg=before,timeout=5000)
   else:page.wait_for_timeout(min(650,distance/(7 if sprint else 4.5)*1000*.75))
   page.keyboard.up('w');page.keyboard.up('Shift');page.wait_for_timeout(60)
  raise AssertionError(('blocked route',goal,state()))
 def travel(goal):
  for point in route(position(),goal):go(point)
 def place(kind,key,x,z,y,turn=False):
  page.keyboard.press(key)
  if turn:page.keyboard.press('r')
  aim(x,z,y);page.wait_for_function('(k)=>JSON.parse(document.querySelector("#world").dataset.buildCandidate)?.kind===k',arg=kind)
  if page.locator('#place').is_disabled():page.screenshot(path='work/wood-placement-failure.png')
  assert not page.locator('#place').is_disabled(),(kind,page.locator('#placement').inner_text(),state())
  before=len(saved()['pieces']);page.mouse.down();page.mouse.up();page.wait_for_function('(n)=>JSON.parse(localStorage.getItem("street-survival:3d-prototype:v1")).pieces.length===n',arg=before+1)
  Path('work/wood-debug-save.json').write_text(json.dumps(saved(),indent=2))
  expected={'foundation':(40,40),'floor':(40,40),'doorway':(40,39),'door':(40,39),'wall':(41,40)}[kind];last=saved()['pieces'][-1];assert (last['x'],last['z'])==expected,(kind,last,expected,state())
 assert all(s.endswith(':meshy') for s in state()['buildModels'].split(',')),state()
 travel((40,37));page.keyboard.press('b')
 place('foundation','5',40,40,0);place('floor','1',40,40,.5);place('doorway','3',40,39.05,.68);place('door','6',40,39.05,.68);place('wall','2',40.75,40,.68,True)
 print('Placed all five wood pieces',saved(),flush=True)
 assert saved()['wood']==9843,saved();page.screenshot(path='work/wood-building-exterior.png');page.keyboard.press('b')
 door=next(p for p in saved()['pieces'] if p['kind']=='door');doorid=door['id']
 page.keyboard.press('e');page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.playerDoors)[0].angle< -1.55');go((40,40.8));page.wait_for_function('Number(document.querySelector("#world").dataset.footHeight)>.67');print('Reached floor',state(),flush=True);page.keyboard.press('Space');page.wait_for_function('Number(document.querySelector("#world").dataset.footHeight)>.85');page.wait_for_function('Math.abs(Number(document.querySelector("#world").dataset.footHeight)-.68)<.002')
 print('Closing door from inside',state(),flush=True)
 page.keyboard.press('e');page.wait_for_function('Math.abs(JSON.parse(document.querySelector("#world").dataset.playerDoors)[0].angle)<.005');aim(40,39,1.8);page.keyboard.press('2');page.mouse.down();page.mouse.up();page.wait_for_function('(id)=>document.querySelector("#world").dataset.lastHitBuildPiece===id',arg=doorid)
 look(0);page.keyboard.down('w');page.wait_for_timeout(850);page.keyboard.up('w');assert position()[1]>39.3,position();go((40,40.8));page.keyboard.press('e');page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.playerDoors)[0].angle< -1.55');aim(40,39,1.8);page.mouse.down();page.mouse.up();page.wait_for_function('(id)=>document.querySelector("#world").dataset.lastHitBuildPiece!==id',arg=doorid)
 go((40,37));raw=saved();Path('work/wood-build-save.json').write_text(json.dumps(raw));assert not any('doorAngle' in p for p in raw['pieces']);page.reload(wait_until='networkidle');page.locator('#start').click();page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.playerDoors)[0].open===true');assert saved()['wood']==9843 and len(saved()['pieces'])==6
 travel((40,37));page.keyboard.press('e');page.wait_for_function('Math.abs(JSON.parse(document.querySelector("#world").dataset.playerDoors)[0].angle)<.005')
 # A doorway cannot be removed while it still has its door.
 aim(40.8,39,1.8);page.keyboard.press('Delete');page.wait_for_timeout(250);assert len(saved()['pieces'])==6,saved()
 for x,z,y in [(40,39,1.8),(40.8,39,1.8),(41,40,1.8),(40,40,.68),(40,40,.5)]:
  print('Dismantling target',(x,z,y),saved()['pieces'],flush=True)
  count=len(saved()['pieces']);aim(x,z,y);page.keyboard.press('Delete');page.wait_for_function('(n)=>JSON.parse(localStorage.getItem("street-survival:3d-prototype:v1")).pieces.length===n',arg=count-1)
 assert saved()['wood']==9876 and saved()['pieces'][0]['id']=='prior-floor',saved();assert not errors,errors
 Path('work/wood-building-desktop-check.json').write_text(json.dumps({'fiveKindsPlaced':True,'snappingAndRaisedSurface':True,'jumpAndLandOnFloor':True,'doorOpenCloseAndWalking':True,'doorBlocksShotsWhenClosed':True,'openDoorAllowsShots':True,'savedDoorReopensAfterReload':True,'dependencyRemovalAndFullRefund':True,'oldSavePreserved':True,'pageErrors':errors},indent=2)+'\n');print('Wood kit desktop placement, doorway, collision, persistence and removal passed',flush=True);browser.close()
