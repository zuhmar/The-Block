"""Inspect Hands after every weapon and phone rotation using actual UI controls."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');page.locator('#start').click()
 for kind in ['pistol','smg','rifle','sniper']:
  page.locator('#'+kind+'-tool').click();page.wait_for_function('(k)=>document.querySelector("#world").dataset.equipped===k',arg=kind)
  page.locator('#hand-tool').click();page.wait_for_function('document.querySelector("#world").dataset.equipped==="hands"&&document.querySelector("#world").dataset.fov==="72"')
 page.screenshot(path='work/unarmed-hands-phone.png')
 for w,h in [(844,390),(1280,800),(390,844)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(250);page.screenshot(path=f'work/unarmed-hands-{w}.png')
 assert not errors,errors
 Path('work/unarmed-hands-check.json').write_text(json.dumps({'switchFromAllFourWeapons':True,'portraitLandscapeAndResize':True,'pageErrors':errors,'scope':'Software WebGL Chromium; visual screenshots and unit projections, not physical-phone performance.'},indent=2)+'\n')
 c.close();b.close()
