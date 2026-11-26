"""Software-WebGL smoke check; seeds only a disposable browser-local inventory."""
import os
from playwright.sync_api import sync_playwright
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
from io import BytesIO
import json,math,time
BASE=os.environ.get('FPS_CHECK_URL','http://localhost:5193');errors=[];missing=[];shader_errors=[];results={}
seed={'version':1,'wood':0,'pieces':[],'opened':[],'inventory':{'version':1,'ammoVersion':1,'sequence':2,'slots':[{'id':'water-test-pistol','kind':'pistol','quantity':1,'magazine':12}]+[None]*19,'hotbar':['water-test-pistol',None,None,None,None],'active':0,'reserve':[],'drops':[]}}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 def context(phone=False):
  c=b.new_context(viewport={'width':390,'height':844}if phone else{'width':1100,'height':800},device_scale_factor=.5 if phone else .4,is_mobile=phone,has_touch=phone);page=c.new_page();page.set_default_timeout(120000);page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:missing.append((r.status,r.url))if r.status>=400 and 'favicon'not in r.url else None);page.on('console',lambda m:shader_errors.append(m.text)if m.type=='error'and 'favicon'not in m.text else None);return c,page
 c,page=context();page.add_init_script('localStorage.setItem("street-survival:3d-prototype:v1",'+json.dumps(json.dumps(seed))+');');page.goto(BASE);page.locator('#start').click();page.wait_for_function('document.querySelector("#world")?.dataset.waterEffects && JSON.parse(document.querySelector("#world").dataset.waterEffects).source==="ai-textures"');print('Water textures loaded',flush=True)
 def data():return page.evaluate('async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return {...document.querySelector("#world").dataset}}')
 def look(yaw,pitch=0):
  d=data();dy=(yaw-float(d['yaw'])+math.pi)%(2*math.pi)-math.pi;dp=pitch-float(d['pitch']);page.evaluate('([x,y])=>document.dispatchEvent(new MouseEvent("mousemove",{movementX:x,movementY:y}))',[-dy/.0024,-dp/.0024])
 def walk(x,z):
  start=time.time()
  while True:
   d=data();px,pz=map(float,d['position'].split(','));dist=math.hypot(px-x,pz-z)
   if dist<.55:break
   if time.time()-start>100:raise Exception('stuck '+str((x,z,d['position'])))
   look(math.atan2(px-x,pz-z));page.keyboard.down('Shift')if dist>2 else None;page.keyboard.down('w');page.wait_for_timeout(min(350,max(200,dist/7*1000)));page.keyboard.up('w');page.keyboard.up('Shift')
  print('walked',x,z,flush=True)
 walk(0,-109);page.keyboard.press('e');page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.jailGate).angle < -1.5');walk(0,-90);walk(3,-90);look(-math.pi/2,-.35);page.wait_for_timeout(700);d=data();assert d['equipped']=='pistol',d['equipped'];before=json.loads(d['waterEffects'])['impacts'];page.mouse.move(550,400);page.mouse.down();page.wait_for_timeout(500);page.mouse.up();page.wait_for_function('(n)=>JSON.parse(document.querySelector("#world").dataset.waterEffects).impacts>n',arg=before);print('Real pistol impact spawned ripple',flush=True);page.wait_for_timeout(1000);page.screenshot(path='work/animated-water-game.png');clip={'x':600,'y':320,'width':220,'height':120};a=page.screenshot(clip=clip);time_a=json.loads(data()['waterEffects'])['time'];page.wait_for_timeout(2200);z=page.screenshot(clip=clip);time_b=json.loads(data()['waterEffects'])['time'];difference=sum(ImageStat.Stat(ImageChops.difference(Image.open(BytesIO(a)).convert('RGB'),Image.open(BytesIO(z)).convert('RGB'))).mean);assert difference>.05,difference;assert time_b>time_a;w=json.loads(data()['waterEffects']);assert w['pool']==16 and w['active']<=16 and w['drawCalls']==3;results['desktop']={'textureAssetsLoaded':True,'actualBulletWaterImpact':True,'waterPixelDifference':difference,'waterStats':w};c.close();print('Animated water render passed',flush=True)
 c,page=context(True);page.goto(BASE);page.locator('#start').click();page.wait_for_function('document.querySelector("#world")?.dataset.waterEffects && JSON.parse(document.querySelector("#world").dataset.waterEffects).source==="ai-textures"');page.keyboard.down('w');page.wait_for_timeout(1000);page.keyboard.up('w');page.locator('#interact').tap();page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.jailGate).angle < -1.5');page.screenshot(path='work/animated-water-phone.png');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');results['phone']={'assetsLoaded':True,'touchGateWorks':True,'viewportFits':True,'waterStats':json.loads(page.locator('#world').get_attribute('data-water-effects'))};c.close();b.close();assert not errors,errors;assert not missing,missing;assert not shader_errors,shader_errors;results.update({'errors':errors,'missing':missing,'shaderErrors':shader_errors,'scope':'Software-rendered browser smoke checks, not a physical-phone FPS benchmark'});Path('work/water-browser-check.json').write_text(json.dumps(results,indent=2));print(json.dumps(results),flush=True)
