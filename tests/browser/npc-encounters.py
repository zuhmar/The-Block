"""Inspect and fight all three enemies through real controls, using collision-aware walking routes."""
import json,os,math,heapq,subprocess
os.environ["NPC_NAV"]="1"
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
 for kind,goal in [('lookout',(0,30)),('police',(-32,-23)),('swat',(32,-25))]:
  context=browser.new_context(viewport={'width':960,'height':700});page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle')
  page.locator('#view-models').click();page.locator('#show-'+kind).click();page.wait_for_function('(k)=>document.querySelector("#actor-canvas").dataset.reviewKind===k && document.querySelector("#actor-canvas").dataset.reviewLoaded==="true"',arg=kind);page.screenshot(path='work/npc-'+kind+'-preview.png');page.locator('#close-actors').click()
  page.locator('#start').click();page.wait_for_function('document.pointerLockElement===document.querySelector("#world")')
  def state():return page.locator('#world').evaluate('(c)=>({...c.dataset})')
  def position():return tuple(float(v) for v in state()['position'].split(','))
  def look(yaw,pitch=-.03):
   d=state();delta=(yaw-float(d['yaw'])+math.pi)%(math.pi*2)-math.pi
   page.evaluate('(d)=>document.dispatchEvent(new MouseEvent("mousemove",{movementX:d.x,movementY:d.y}))',{'x':-delta/.0024,'y':(float(d['pitch'])-pitch)/.0024})
  def go(goal):
   for _ in range(100):
    x,z=position();dx,dz=goal[0]-x,goal[1]-z;distance=math.hypot(dx,dz)
    if distance<.25:return
    look(math.atan2(-dx,-dz));page.keyboard.down('w');sprint=distance>5
    if sprint:page.keyboard.down('Shift')
    if distance>1:page.wait_for_timeout(min(800,distance/(7 if sprint else 4.5)*1000*.82))
    else:page.evaluate('(count)=>new Promise(resolve=>{function frame(){if(--count<=0)resolve();else requestAnimationFrame(frame)}requestAnimationFrame(frame)})',1 if distance<.45 else 2)
    page.keyboard.up('w')
    if sprint:page.keyboard.up('Shift')
    page.wait_for_timeout(140)
   raise AssertionError(('route blocked',goal,state()))
  initial=json.loads(state()['enemies']);assert len(initial)==3 and len(set(e['kind'] for e in initial))==3
  page.keyboard.press('5')
  for waypoint in route(position(),goal):go(waypoint)
  def target():return next(e for e in json.loads(state()['enemies']) if e['kind']==kind)
  page.wait_for_function('(kind)=>JSON.parse(document.querySelector("#world").dataset.enemies).find(e=>e.kind===kind).visual==="blender"',arg=kind)
  e=target();assert e['visible'],(kind,state());before=e['health']
  for attempt in range(12):
   e=target()
   if e['health']==0:break
   x,z=position();distance=math.hypot(e['x']-x,e['z']-z);look(math.atan2(x-e['x'],z-e['z']),math.atan2(1.65-1.65,distance));page.wait_for_timeout(150);page.mouse.down();page.mouse.up();page.wait_for_timeout(1150)
  if target()['health']!=0:page.screenshot(path='work/npc-'+kind+'-failure.png')
  assert target()['health']==0,(kind,state());page.screenshot(path='work/npc-'+kind+'-encounter.png');checks.append({'kind':kind,'initialHealth':before,'defeated':True,'playerHealth':state()['health'],'others':json.loads(state()['enemies'])});print('Passed encounter:',kind,flush=True);context.close()
 browser.close()
assert not errors,errors
Path('work/npc-encounters-check.json').write_text(json.dumps({'encounters':checks,'pageErrors':errors,'scope':'Actual compiled game, keyboard walking and firing; no teleportation or writable game hooks.'},indent=2)+'\n')
