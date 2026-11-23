"""Walk real stairs and search upper-floor loot with keyboard and phone touch."""
import json,math,os,heapq,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
subprocess.run(['pnpm','exec','tsx','tests/browser/building-navigation.ts'],env={**os.environ,'NPC_NAV':'1'},check=True,capture_output=True)
nav=json.loads(Path('work/building-nav.json').read_text());walls=set(nav['walls']);results=[]
def route(start,goal):
 def grid(p):return(round((p[0]-nav['minX'])/.5),round((p[1]-nav['minZ'])/.5))
 a,b=grid(start),grid(goal);q=[(0,a)];cost={a:0};parent={}
 while q:
  _,v=heapq.heappop(q)
  if v==b:break
  for dx,dz in [(1,0),(-1,0),(0,1),(0,-1)]:
   n=(v[0]+dx,v[1]+dz)
   if not(0<=n[0]<nav['width'] and 0<=n[1]<nav['height']) or n[1]*nav['width']+n[0] in walls:continue
   c=cost[v]+1
   if c<cost.get(n,100000):cost[n]=c;parent[n]=v;heapq.heappush(q,(c+abs(n[0]-b[0])+abs(n[1]-b[1]),n))
 assert b in parent or a==b,(a,b);path=[b]
 while path[-1]!=a:path.append(parent[path[-1]])
 path.reverse();points=[]
 for i in range(1,len(path)-1):
  if (path[i][0]-path[i-1][0],path[i][1]-path[i-1][1])!=(path[i+1][0]-path[i][0],path[i+1][1]-path[i][1]):points.append(path[i])
 points.append(b);return[(nav['minX']+x*.5,nav['minZ']+z*.5) for x,z in points]
KEY='street-survival:3d-prototype:v1'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for mobile,index in [(False,6),(False,7),(True,6)]:
  if os.environ.get('APARTMENT_CASE') and os.environ['APARTMENT_CASE']!=f'{index}-{int(mobile)}':continue
  context=browser.new_context(viewport={'width':390,'height':844} if mobile else {'width':800,'height':600},is_mobile=mobile,has_touch=mobile)
  context.add_init_script("if(!localStorage.getItem('"+KEY+"'))localStorage.setItem('"+KEY+"',JSON.stringify({version:1,wood:8765,pieces:[{id:'old-house',kind:'floor',x:40,z:40,rotation:0}],opened:[0,4]}))")
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');page.locator('#start').tap() if mobile else page.locator('#start').click();page.wait_for_function('document.querySelector("#world").dataset.buildingSources!==undefined');cdp=context.new_cdp_session(page)
  def state():return page.locator('#world').evaluate('(c)=>({...c.dataset})')
  def pos():return tuple(map(float,state()['position'].split(',')))
  def touch(kind,points):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
  def look(yaw):
   for _ in range(8):
    page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');d=state();delta=(yaw-float(d['yaw'])+math.pi)%(2*math.pi)-math.pi
    if abs(delta)<.007:return
    if mobile:
     dx=max(-240,min(240,-delta/.005));x=300 if dx<0 else 45;touch('touchStart',[{'x':x,'y':250,'id':3}]);touch('touchMove',[{'x':x+dx,'y':250,'id':3}]);touch('touchEnd',[])
    else:page.evaluate('(dx)=>document.dispatchEvent(new MouseEvent("mousemove",{movementX:dx,movementY:0}))',-delta/.0024)
   raise AssertionError(('look',yaw,state()))
  def go(goal):
   print('go',mobile,index,goal,'from',pos(),'feet',state()['footHeight'],flush=True)
   for attempt in range(8):
    x,z=pos();dx,dz=goal[0]-x,goal[1]-z;dist=math.hypot(dx,dz)
    if dist<.19:return
    look(math.atan2(-dx,-dz))
    if mobile:
     r=page.locator('#joystick').bounding_box();amount=38 if dist>1.5 else 9
     touch('touchStart',[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2-amount,'id':1}])
    else:page.keyboard.down('w')
    try:page.wait_for_function('(g)=>{const p=document.querySelector("#world").dataset.position.split(",").map(Number);return (g.x-p[0])*g.dx+(g.z-p[1])*g.dz<g.margin}',arg={'x':goal[0],'z':goal[1],'dx':dx/dist,'dz':dz/dist,'margin':.3 if mobile and dist>1.5 else .06},timeout=60000)
    except Exception:
     print('stuck',state(),flush=True);raise
    finally:
     if mobile:touch('touchEnd',[])
     else:page.keyboard.up('w')
    page.wait_for_function('document.querySelector("#world").dataset.movement==="0.00,0.00"')
   raise AssertionError(('precision movement',pos(),goal,state()))
  def use():page.locator('#interact').tap() if mobile else page.keyboard.press('e')
  assert json.loads(state()['buildingSources'])==['blender']*8,state()
  b=nav['buildings'][index];front=b['front'];bx,bz=b['x'],b['z'];floors=2 if index==6 else 3;stairx=bx+b['width']/2-1.35;startz=bz+front*3.4;endz=startz-front*6
  for goal in route(pos(),(bx,b['doorZ']+front*1.6)):go(goal)
  page.screenshot(path=f'work/{b["type"]}-exterior.png');use();page.wait_for_function('(g)=>Math.abs(JSON.parse(document.querySelector("#world").dataset.doors)[g.i]-g.a)<.01',arg={'i':index,'a':front*math.pi/2})
  go((bx,startz+front*.4));go((stairx,startz+front*.4))
  for floor in range(1,floors):
   go((stairx,endz-front*.55));page.wait_for_function('(y)=>Math.abs(Number(document.querySelector("#world").dataset.footHeight)-y)<.02',arg=floor*3.2)
   go((bx,endz-front*.55));page.screenshot(path=f'work/{b["type"]}-floor-{floor+1}.png')
   if floor<floors-1:go((bx,startz+front*.4));go((stairx,startz+front*.4))
  go((bx-.15,bz+.3));page.wait_for_function('document.querySelector("#world").dataset.nearestLoot==="-1"')
  # Rear room is reached through the actual opening at local z=-2.
  go((bx,bz-2));expected=13 if index==6 else 19;page.wait_for_function('(n)=>Number(document.querySelector("#world").dataset.nearestLoot)===n',arg=expected)
  use();page.wait_for_function('(n)=>JSON.parse(localStorage.getItem("'+KEY+'")).opened.includes(n)',arg=expected)
  raw=page.evaluate('JSON.parse(localStorage.getItem("'+KEY+'"))');reward=95 if index==6 else 120;assert raw['wood']==8765+reward and raw['pieces'][0]['id']=='old-house';use();assert page.evaluate('JSON.parse(localStorage.getItem("'+KEY+'")).wood')==8765+reward
  for floor in range(floors-1,0,-1):
   go((bx,endz-front*.55));go((stairx,endz-front*.55));go((stairx,startz+front*.4));page.wait_for_function('(y)=>Math.abs(Number(document.querySelector("#world").dataset.footHeight)-y)<.03',arg=(floor-1)*3.2);go((bx,startz+front*.4))
  go((bx,b['doorZ']+front*1.6));assert state()['inside']=='-1'
  page.reload(wait_until='networkidle');page.locator('#start').tap() if mobile else page.locator('#start').click();assert page.evaluate('JSON.parse(localStorage.getItem("'+KEY+'")).opened.includes('+str(expected)+')');assert not errors,errors
  results.append({'building':b['type'],'phoneTouch':mobile,'floorsVisited':floors,'searchedUpstairsIndex':expected,'rewardOnce':True,'descendedAndExited':True,'savePreservedAndReloaded':True,'errors':errors});print(results[-1],flush=True);context.close()
 browser.close()
Path('work/apartment-browser-'+(os.environ.get('APARTMENT_CASE') or 'all')+'.json').write_text(json.dumps(results,indent=2)+'\n')
