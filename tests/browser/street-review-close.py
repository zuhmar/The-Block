"""Close while the GLB is held in flight, then let the delayed load finish."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
errors=[];held=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':900,'height':850});page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/*.glb',lambda route:held.append(route));page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');page.locator('#view-models').click();page.locator('#show-street-v2').click();page.wait_for_timeout(150);assert len(held)==1;page.locator('#close-actors').click();assert page.locator('#actor-preview').count()==0;held[0].continue_();page.wait_for_timeout(1500);assert page.locator('#actor-preview').count()==0
 page.unroute('**/*.glb');page.locator('#view-models').click();page.locator('#show-pistol').click();page.wait_for_function('document.querySelector("#actor-canvas").dataset.model==="pistol"');page.keyboard.press('Escape');assert not errors,errors;Path('work/street-v2-close-check.json').write_text(json.dumps({'closeWithPendingRequest':True,'lateLoadDoesNotReopenViewer':True,'reopenWorks':True,'pageErrors':errors},indent=2)+'\n');b.close()
