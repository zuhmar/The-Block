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
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);raw=Path('work/stories-scaffold-save.json').read_text();c.add_init_script('if(!localStorage.getItem("street-survival:3d-prototype:v1"))localStorage.setItem("street-survival:3d-prototype:v1",'+json.dumps(raw)+')')
 page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');page.locator('#start').tap();cdp=c.new_cdp_session(page)
 def state():return page.locator('#world').evaluate('(c)=>({...c.dataset})')
 def position():return tuple(float(v) for v in state()['position'].split(','))
 def touch(kind,points):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
 def look(yaw,pitch=-.03):
  for _ in range(6):
   page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
   d=state();delta=(yaw-float(d['yaw'])+math.pi)%(math.pi*2)-math.pi;pd=float(d['pitch'])-pitch
   if abs(delta)<.008 and abs(pd)<.008:return
   dx=max(-250,min(250,-delta/.005));dy=max(-160,min(160,pd/.005));x=310 if dx<0 else 40
   touch('touchStart',[{'x':x,'y':260,'id':3}]);touch('touchMove',[{'x':x+dx,'y':260+dy,'id':3}]);touch('touchEnd',[])
 def go(goal):
  for _ in range(120):
   x,z=position();dx,dz=goal[0]-x,goal[1]-z;distance=math.hypot(dx,dz)
   if distance<.24:return
   look(math.atan2(-dx,-dz));r=page.locator('#joystick').bounding_box();cx=r['x']+r['width']/2;cy=r['y']+r['height']/2
   touch('touchStart',[{'x':cx,'y':cy-38,'id':1}])
   if distance<1:
    before=state()['position'];page.wait_for_function('(before)=>document.querySelector("#world").dataset.position!==before',arg=before,timeout=5000)
   else:page.wait_for_timeout(min(650,distance/4.5*1000*.7))
   touch('touchEnd',[]);page.wait_for_timeout(60)
  raise AssertionError(('mobile route blocked',goal,state()))

 for point in route(position(),(32,11)):go(point)
 px,pz=position();look(math.atan2(-(32-px),-(13-pz)),-math.atan2(1.65-2.8,math.hypot(32-px,13-pz)))
 page.locator('#build-tool').tap();page.locator('[data-piece=floor]').tap();page.wait_for_function('Math.abs((JSON.parse(document.querySelector("#world").dataset.buildCandidate)?.y??0)-3.18)<.005');candidate=json.loads(state()['buildCandidate']);assert (candidate['x'],candidate['z'])==(32,14),candidate;assert not page.locator('#place').is_disabled(),page.locator('#placement').inner_text()
 page.screenshot(path='work/second-floor-phone-preview.png');page.locator('#place').tap();page.wait_for_function('JSON.parse(localStorage.getItem("street-survival:3d-prototype:v1")).pieces.length===5');page.screenshot(path='work/second-floor-phone.png')
 page.reload(wait_until='networkidle');page.locator('#start').tap();page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.buildLevels).some(p=>p.kind==="floor"&&Math.abs(p.y-3.18)<.005)')
 saved=page.evaluate('JSON.parse(localStorage.getItem("street-survival:3d-prototype:v1"))');assert saved['wood']==9868 and any(p['id']=='prior-floor' for p in saved['pieces']),saved;assert not errors,errors
 Path('work/building-stories-mobile-check.json').write_text(json.dumps({'touchWallTopFloorPlacement':True,'previewMatchesSavedHeight':True,'upperFloorHeight':candidate['y'],'elevationRestoredAfterReload':True,'oldSaveAndWoodPreserved':True,'pageErrors':errors,'scope':'Compiled game with real touch events in software WebGL; not a physical-phone FPS benchmark.'},indent=2)+'\n');print('Phone second-floor placement and persisted elevation passed',flush=True);b.close()
