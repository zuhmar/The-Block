"""Play every clip on the uploaded rig, verify lazy loading, close/reopen, and return to the game."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True);page=c.new_page();errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url));page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle')
 assert not any('/animated-' in u and u.endswith('.glb') for u in requests)
 page.locator('#view-models').click();page.locator('#show-meshy').click();page.wait_for_function('document.querySelector("#actor-canvas").dataset.reviewKind==="meshy" && document.querySelector("#actor-canvas").dataset.reviewLoaded==="true"')
 def state():return page.locator('#actor-canvas').evaluate('(c)=>({...c.dataset})')
 clips=json.loads(state()['reviewClips']);assert len(clips)==19
 assert not page.locator('#clothing-slots').is_visible();assert page.locator('#meshy-motion').is_visible()
 for name in clips:
  page.locator('#meshy-animation').select_option(name);page.wait_for_function('(name)=>document.querySelector("#actor-canvas").dataset.motion===name',arg=name);before=float(state()['reviewTime']);page.wait_for_function('(before)=>Number(document.querySelector("#actor-canvas").dataset.reviewTime)>before+.05',arg=before);assert int(state()['triangles'])<25000 and int(state()['drawCalls'])<12,state()
  print('Played:',name,flush=True)
 page.locator('#meshy-animation').select_option('Pistol_Hold');page.wait_for_timeout(200);page.screenshot(path='work/meshy-model-phone.png');metrics=state()
 page.locator('#close-actors').click();page.locator('#view-models').click();page.locator('#show-meshy').click();page.wait_for_function('document.querySelector("#actor-canvas").dataset.reviewKind==="meshy" && document.querySelector("#actor-canvas").dataset.reviewLoaded==="true"');page.locator('#close-actors').click();page.locator('#start').click();page.wait_for_function('document.querySelector("#world").dataset.equipped==="hands"')
 assert not errors,errors
 Path('work/meshy-animations-check.json').write_text(json.dumps({'clipsPlayed':clips,'lazyLoaded':True,'closeAndReopen':True,'returnToGame':True,'render':metrics,'pageErrors':errors,'scope':'Software WebGL Chromium in a phone viewport; not a physical-device FPS claim.'},indent=2)+'\n');c.close();b.close()
