"""A missing player asset must preserve playable fallback hands and weapon controls."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/animated-*.glb',lambda r:r.abort());page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');page.locator('#start').click();page.wait_for_function('document.querySelector("#world").dataset.playerSource==="fallback"');page.locator('#fire').click();page.wait_for_function('Number(document.querySelector("#world").dataset.punches)>0');page.locator('#pistol-tool').click();page.locator('#fire').click();page.wait_for_function('Number(document.querySelector("#world").dataset.shots)>0');assert not errors,errors
 Path('work/player-fallback-check.json').write_text(json.dumps({'fallbackPlayable':True,'punchAndFire':True,'pageErrors':errors},indent=2)+'\n');c.close();b.close()
