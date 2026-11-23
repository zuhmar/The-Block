"""Unavailable wood GLBs retain legacy saves and the procedural building fallback."""
import json,os,re
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route(re.compile(r'/(?:floor|wall|foundation|doorway|door)-[^/]+\.glb$'),lambda r:r.abort())
 c.add_init_script("localStorage.setItem('street-survival:3d-prototype:v1',JSON.stringify({version:1,wood:8765,pieces:[{id:'old-floor',kind:'floor',x:40,z:40,rotation:0},{id:'old-wall',kind:'wall',x:40,z:41,rotation:0}],opened:[]}))")
 page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');page.locator('#start').tap();page.wait_for_function('document.querySelector("#world").dataset.buildModels!==undefined')
 state=page.locator('#world').evaluate('(c)=>({...c.dataset})');assert all(v.endswith(':fallback') for v in state['buildModels'].split(',')),state
 page.locator('#build-tool').tap();assert page.locator('[data-piece=foundation]').is_visible() and page.locator('[data-piece=door]').is_visible()
 saved=page.evaluate('JSON.parse(localStorage.getItem("street-survival:3d-prototype:v1"))');assert saved['wood']==8765 and len(saved['pieces'])==2 and saved['pieces'][0]['id']=='old-floor',saved
 assert not errors,errors
 Path('work/wood-building-fallback-check.json').write_text(json.dumps({'allFiveModelsUseFallback':True,'gameStarts':True,'legacySavePreserved':True,'newBuildChoicesAvailable':True,'pageErrors':errors},indent=2)+'\n');b.close()
