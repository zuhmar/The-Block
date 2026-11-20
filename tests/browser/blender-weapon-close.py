"""Late weapon loads must not resurrect a closed viewer or break live weapons."""
import os,json
from playwright.sync_api import sync_playwright
from pathlib import Path
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context();page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle')
 routes=[];page.route('**/*.glb',lambda route:routes.append(route))
 page.locator('#view-models').click();page.locator('#show-pistol').click();page.wait_for_timeout(400);assert routes
 page.locator('#close-actors').click()
 for route in routes:route.continue_()
 page.unroute('**/*.glb');page.wait_for_timeout(1500)
 assert page.locator('#actor-canvas').count()==0
 page.locator('#start').click();page.keyboard.press('2');page.wait_for_function('document.querySelector("#world").dataset.weaponSource==="blender"')
 assert not errors,errors
 Path('work/blender-weapon-close-check.json').write_text(json.dumps({'lateLoadsAfterClose':True,'liveWeaponLoads':True,'pageErrors':errors},indent=2)+'\n')
 c.close();b.close()
