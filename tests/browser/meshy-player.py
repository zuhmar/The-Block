"""Verify the uploaded Meshy rig drives live first-person combat and movement."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');page.locator('#start').click();page.wait_for_function('document.querySelector("#world").dataset.playerSource==="meshy"')
 def state():return page.locator('#world').evaluate('(c)=>({...c.dataset})')
 page.screenshot(path='work/live-meshy-hands.png');checks={'hands':state()}
 cdp=c.new_cdp_session(page)
 for kind in ['pistol','smg','rifle','sniper']:
  prefix={'pistol':'Pistol','smg':'SMG','rifle':'Rifle','sniper':'Sniper'}[kind]
  page.locator('#'+kind+'-tool').click();page.wait_for_function('(name)=>document.querySelector("#world").dataset.playerCombat===name',arg=prefix+'_Hold');page.wait_for_function('document.querySelector("#world").dataset.weaponSource==="blender"');page.screenshot(path='work/live-meshy-'+kind+'.png')
  page.locator('#fire').click();page.wait_for_function('(name)=>document.querySelector("#world").dataset.playerCombat===name',arg=prefix+'_Fire');page.wait_for_function('(name)=>document.querySelector("#world").dataset.playerCombat===name',arg=prefix+'_Hold')
  page.locator('#reload').click();page.wait_for_function('(name)=>document.querySelector("#world").dataset.playerCombat===name',arg=prefix+'_Reload');page.wait_for_function('Number(document.querySelector("#world").dataset.reloadProgress)>.2');page.screenshot(path='work/live-meshy-'+kind+'-reload.png');page.wait_for_function('document.querySelector("#world").dataset.reload===""',timeout=20000);checks[kind]=state();print('Integrated weapon:',kind,flush=True)
 page.locator('#hand-tool').click();page.wait_for_timeout(300)
 r=page.locator('#fire').bounding_box();finger={'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':1};cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[finger]});page.wait_for_function('Number(document.querySelector("#world").dataset.punches)>=2');cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});checks['punches']=state()
 # Native lower-body movement clips are selected by actual movement/sprint input.
 page.keyboard.down('w');page.wait_for_function('document.querySelector("#world").dataset.playerMotion==="Walking"');page.keyboard.down('Shift');page.wait_for_function('document.querySelector("#world").dataset.playerMotion==="Running"');page.keyboard.up('Shift');page.keyboard.up('w');page.locator('#jump').click();page.wait_for_function('document.querySelector("#world").dataset.playerMotion==="Regular_Jump"');checks['nativeMovement']=True
 assert not errors,errors
 Path('work/meshy-player-check.json').write_text(json.dumps({'checks':checks,'pageErrors':errors,'scope':'Real UI controls in software WebGL phone viewport; not physical-phone FPS.'},indent=2)+'\n');c.close();b.close()
