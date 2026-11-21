"""Visual check of the final raised reload pose with the Blender magazine in portrait."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');page.locator('#start').click();checks=[]
 for kind in ['pistol','smg','rifle','sniper']:
  page.locator('#'+kind+'-tool').click();page.wait_for_function('document.querySelector("#world").dataset.weaponSource==="blender"');page.locator('#fire').click();page.wait_for_function('(k)=>JSON.parse(document.querySelector("#world").dataset.ammo)[k]<({pistol:12,smg:30,rifle:30,sniper:5})[k]',arg=kind)
  page.locator('#reload').click();page.wait_for_function('Number(document.querySelector("#world").dataset.reloadProgress)>.35');page.screenshot(path='work/reload-final-'+kind+'.png');d=page.locator('#world').evaluate('(c)=>({...c.dataset})');assert float(d['reloadPose'])<-.12
  assert page.evaluate('document.querySelector("#weapon-status").offsetTop+document.querySelector("#weapon-status").offsetHeight < document.querySelector("#toast").offsetTop')
  page.wait_for_function('document.querySelector("#world").dataset.reload===""',timeout=20000);checks.append(kind)
 assert not errors,errors
 Path('work/reload-framing-check.json').write_text(json.dumps({'kinds':checks,'pageErrors':errors,'phoneHudDoesNotOverlapNotices':True},indent=2)+'\n');c.close();b.close()
