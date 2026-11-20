"""View alternating hook punches through real phone input, then switch back to a gun."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');page.locator('#start').click();cdp=c.new_cdp_session(page);sides=[]
 r=page.locator('#fire').bounding_box();point={'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':1}
 for serial in [1,2]:
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]})
  page.wait_for_function('(n)=>Number(document.querySelector("#world").dataset.punches)===n',arg=serial)
  d=page.locator('#world').evaluate('(c)=>({...c.dataset})');sides.append(d['punchSide']);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.screenshot(path='work/hook-'+str(serial)+'-phone.png')
  page.wait_for_function('Number(document.querySelector("#world").dataset.punchProgress)===0');page.wait_for_timeout(400)
 assert sides==['-1','1'],sides
 assert page.locator('#world').get_attribute('data-shots')=='0'
 page.locator('#pistol-tool').click();page.wait_for_function('document.querySelector("#world").dataset.weaponSource==="blender"');page.locator('#fire').click();page.wait_for_function('document.querySelector("#world").dataset.shots==="1"')
 assert not errors,errors
 Path('work/punch-swing-check.json').write_text(json.dumps({'alternatingSides':sides,'returnsToGuard':True,'weaponStillFires':True,'pageErrors':errors},indent=2)+'\n');c.close();b.close()
