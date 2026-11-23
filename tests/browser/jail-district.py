"""Enter the central jail, visit a holding cell and exit with keyboard and real phone touch."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
results=[];KEY='street-survival:3d-prototype:v1'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for mobile in [False,True]:
  c=b.new_context(viewport={'width':390,'height':844} if mobile else {'width':800,'height':600},is_mobile=mobile,has_touch=mobile)
  c.add_init_script("localStorage.setItem('"+KEY+"',JSON.stringify({version:1,wood:8765,pieces:[{id:'existing-house',kind:'floor',x:40,z:40,rotation:0}],opened:[0,4]}))")
  page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle')
  page.locator('#start').tap() if mobile else page.locator('#start').click();page.wait_for_function('document.querySelector("#world").dataset.buildingSources!==undefined');cdp=c.new_cdp_session(page)
  def state():return page.locator('#world').evaluate('(c)=>({...c.dataset})')
  def move(direction):
   if mobile:
    r=page.locator('#joystick').bounding_box();cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2+(-38 if direction=='w' else 38),'id':1}]})
   else:page.keyboard.down(direction)
  def stop(direction):
   if mobile:cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   else:page.keyboard.up(direction)
  def go(z,direction):
   move(direction);page.wait_for_function('(g)=>{const z=Number(document.querySelector("#world").dataset.position.split(",")[1]);return g.north?z<=g.z:z>=g.z}',arg={'z':z,'north':direction=='w'},timeout=60000);stop(direction)
  assert json.loads(state()['buildingSources'])==['blender']*13,state()
  page.screenshot(path='work/jail-'+('phone' if mobile else 'desktop')+'-exterior.png')
  go(9,'w');move('w');page.wait_for_timeout(1500);stop('w');assert float(state()['position'].split(',')[1])>7.3
  page.locator('#interact').tap() if mobile else page.keyboard.press('e');page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.doors)[5]>1.55')
  go(4,'w');page.wait_for_function('document.querySelector("#world").dataset.inside==="5"');assert 'CENTRAL JAIL' in page.locator('#zone').inner_text()
  page.screenshot(path='work/jail-'+('phone' if mobile else 'desktop')+'-interior.png');go(-2,'w');go(9,'s');page.wait_for_function('document.querySelector("#world").dataset.inside==="-1"')
  saved=page.evaluate('JSON.parse(localStorage.getItem("'+KEY+'"))');assert saved['wood']==8765 and saved['opened']==[0,4] and saved['pieces'][0]['id']=='existing-house';assert not errors,errors
  results.append({'phone':mobile,'loadedThirteenBuildings':True,'doorCollisionAndOpen':True,'enteredHoldingCellAndExited':True,'savePreserved':True,'errors':errors});print(results[-1],flush=True);c.close()
 b.close()
Path('work/jail-district-browser-check.json').write_text(json.dumps({'cases':results,'scope':'Software WebGL browser tests, not physical phone performance.'},indent=2)+'\n')
