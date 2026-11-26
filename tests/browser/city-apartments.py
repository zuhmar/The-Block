from playwright.sync_api import sync_playwright
from pathlib import Path
import json,math,time
Path('work').mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--remote-debugging-port=9222','--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':800,'height':600},device_scale_factor=.2);page.set_default_timeout(120000);errors=[];missing=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:missing.append(r.url)if r.status>=400 and 'favicon'not in r.url else None);page.goto('http://localhost:5193');page.locator('#start').click();page.wait_for_function('document.querySelector("#world")?.dataset.jailKit');
 def data():return page.evaluate('async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return {...document.querySelector("#world").dataset}}')
 def look(yaw,pitch=0):
  d=data();dy=(yaw-float(d['yaw'])+math.pi)%(2*math.pi)-math.pi;dp=pitch-float(d['pitch']);page.evaluate('([x,y])=>document.dispatchEvent(new MouseEvent("mousemove",{movementX:x,movementY:y}))',[-dy/.0024,-dp/.0024])
 def walk(x,z):
  start=time.time();moving=False;previous=999
  while True:
   if previous<1.5:page.keyboard.up('w');page.keyboard.up('Shift');moving=False
   d=data();px,pz=map(float,d['position'].split(','));dist=math.hypot(px-x,pz-z);previous=dist
   if dist<.28:break
   if time.time()-start>180:raise Exception('stuck '+str((x,z,d['position'],page.locator('#hint-title').inner_text())))
   look(math.atan2(px-x,pz-z))
   if dist<1.5:
    page.keyboard.up('Shift');page.keyboard.down('w');page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>{document.dispatchEvent(new KeyboardEvent("keyup",{code:"KeyW",key:"w",bubbles:true}));r()}))');page.keyboard.up('w');moving=False
   else:
    if dist>3:page.keyboard.down('Shift')
    else:page.keyboard.up('Shift')
    if not moving:page.keyboard.down('w');moving=True
    page.wait_for_timeout(120)
  page.keyboard.up('w');page.keyboard.up('Shift');print('walked',x,z,flush=True)

 versions=json.loads(data()['tenements']);assert len(versions)==2 and all(v['version']=='tenement-v2' for v in versions),versions
 bx,bz=-100,6;index=36;stairx=bx+7.65;startz=bz+4.6;endz=bz-5.15;hallx=bx+5.2
 assert json.loads(data()['buildingSources'])[index]=='blender'
 look(math.pi);walk(0,-108.4);page.keyboard.press('e');walk(0,-112);page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.jailGate).angle < -1.5');walk(0,-74);walk(-48,-74);walk(-48,40);walk(-102,40);walk(-102,34);walk(bx,34);walk(bx,bz+10)
 look(0);page.screenshot(path='work/west-court-exterior-game.png');assert int(data()['nearestDoor'])==index
 page.keyboard.press('e');page.wait_for_function('(i)=>JSON.parse(document.querySelector("#world").dataset.doors)[i]>1.5',arg=index);walk(bx,bz+7);walk(hallx,bz+7)
 visited=[]
 for floor in range(3):
  for unit,localz in [(1,3),(0,-4)]:
   walk(hallx,bz+localz);near=json.loads(data()['nearestApartmentDoor']);assert near=={'i':index,'id':floor*2+unit},near
   page.keyboard.press('e');page.wait_for_function('(id)=>JSON.parse(document.querySelector("#world").dataset.apartmentDoors)[0].angles[id]<-1.5',arg=floor*2+unit)
   walk(bx+2.8,bz+localz);walk(bx-4.3,bz+localz);assert abs(float(data()['footHeight'])-floor*3.2)<.04
   if floor==2 and unit==0:look(math.pi/2);page.screenshot(path='work/west-court-apartment-game.png')
   walk(bx+2.8,bz+localz);walk(hallx,bz+localz);visited.append(f'{floor+1}0{unit+1}')
  walk(hallx,startz);walk(stairx,startz);walk(stairx,endz)
  page.wait_for_function('(y)=>Math.abs(Number(document.querySelector("#world").dataset.footHeight)-y)<.03',arg=(floor+1)*3.2)
  if floor<2:walk(hallx,endz)
 near=json.loads(data()['nearestApartmentDoor']);assert near=={'i':index,'id':6},near;page.keyboard.press('e');page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.apartmentDoors)[0].angles[6]<-1.5')
 walk(bx+4,bz-5.15);walk(bx+4,bz-6);walk(bx-7,bz-6);walk(bx-7,bz+6);walk(bx+4,bz+6);assert abs(float(data()['footHeight'])-9.6)<.04
 look(-math.pi/2,.12);page.screenshot(path='work/west-court-roof-game.png');print('All six apartments and roof reached',flush=True)
 walk(bx+4,bz-5.15);walk(stairx,endz)
 for floor in [2,1,0]:
  walk(stairx,startz);page.wait_for_function('(y)=>Math.abs(Number(document.querySelector("#world").dataset.footHeight)-y)<.03',arg=floor*3.2);walk(hallx,startz)
  if floor>0:walk(hallx,endz);walk(stairx,endz)
 walk(hallx,bz+7);walk(bx,bz+7);walk(bx,bz+10);assert data()['inside']=='-1'
 assert not errors,errors;assert not missing,missing
 Path('work/west-court-browser-check.json').write_text(json.dumps({'oldTenementsPreserved':versions,'newBuildingIndex':index,'apartmentsEntered':visited,'roofReachedAt':9.6,'allSevenDoorsWorked':True,'descendedAndExited':True,'errors':errors,'missing':missing},indent=2));print('West Court walkthrough passed',flush=True);b.close()
