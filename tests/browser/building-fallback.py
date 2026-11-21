"""A failed building asset uses the existing visual fallback and still starts the game."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/warehouse-*.glb' if os.environ.get('WAREHOUSE_ONLY') else '**/shelter-*.glb',lambda route:route.abort())
 page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');page.locator('#start').click();page.wait_for_function('document.querySelector("#world").dataset.buildingSources!==undefined');sources=json.loads(page.locator('#world').get_attribute('data-building-sources'));assert sources==(['blender','blender','blender','blender','fallback'] if os.environ.get('WAREHOUSE_ONLY') else ['blender','fallback','blender','blender','blender']),sources;assert not errors,errors
 Path('work/warehouse-fallback-check.json' if os.environ.get('WAREHOUSE_ONLY') else 'work/building-fallback-check.json').write_text(json.dumps({'sources':sources,'gameStarts':True,'pageErrors':errors},indent=2)+'\n');c.close();b.close()
