"""Phone inspection of three new NPCs and the three independent live encounters."""
import json,os,math
from pathlib import Path
from playwright.sync_api import sync_playwright
errors=[];models=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle')
 page.locator('#view-models').click()
 for kind in os.environ.get('NPC_PREVIEW_KINDS','lookout,police,swat').split(','):
  page.locator('#show-'+kind).click();page.wait_for_function('(k)=>document.querySelector("#actor-canvas").dataset.reviewKind===k && document.querySelector("#actor-canvas").dataset.reviewLoaded==="true"',arg=kind);state=page.locator('#actor-canvas').evaluate('(c)=>({...c.dataset})');assert int(state['drawCalls'])<100 and int(state['triangles'])<55000,state
  page.screenshot(path='work/npc-'+kind+'-phone.png')
  page.locator('[data-slot=headwear]').uncheck();page.wait_for_function('document.querySelector("#actor-canvas").dataset.hiddenSlots.includes("headwear")');page.locator('[data-slot=headwear]').check();models.append({'kind':kind,'render':state});print('Phone preview:',kind,flush=True)
 page.locator('#close-actors').click();page.locator('#start').click();page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.enemies).length===3');data=page.locator('#world').evaluate('(c)=>({...c.dataset})');enemies=json.loads(data['enemies']);assert len(set(e['kind'] for e in enemies))==3
 assert int(data['drawCalls'])<120 and int(data['triangles'])<20000,data
 for i,a in enumerate(enemies):
  for d in enemies[i+1:]:assert math.hypot(a['x']-d['x'],a['z']-d['z'])>55
 assert not errors,errors
 Path('work/npc-phone-check.json').write_text(json.dumps({'models':models,'game':data,'pageErrors':errors,'scope':'Compiled production game in phone viewport with software WebGL; not a physical-phone FPS benchmark.'},indent=2)+'\n');c.close();b.close()
