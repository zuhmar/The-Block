"""Exercise each uploaded outfit and every native/authored clip on a phone viewport."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
errors=[];checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');page.locator('#view-models').click()
 for kind,button in [('street','show-street-v2'),('reinforced','show-image-reinforced'),('armored','show-image-armored')]:
  page.locator('#'+button).click();page.wait_for_function('(k)=>document.querySelector("#actor-canvas").dataset.reviewKind===k&&document.querySelector("#actor-canvas").dataset.reviewLoaded==="true"',arg=kind)
  clips=json.loads(page.locator('#actor-canvas').get_attribute('data-review-clips'));assert len(clips)==19,clips
  for clip in clips:
   page.locator('#meshy-animation').select_option(clip);page.wait_for_function('(clip)=>document.querySelector("#actor-canvas").dataset.motion===clip',arg=clip)
   before=page.locator('#actor-canvas').get_attribute('data-review-time');page.wait_for_function('(before)=>Number(document.querySelector("#actor-canvas").dataset.reviewTime)>Number(before)',arg=before);after=page.locator('#actor-canvas').get_attribute('data-review-time');assert float(after)>float(before),(kind,clip,before,after)
   if clip in ['Punch_Left','Rifle_Reload','Pistol_Hold']:page.screenshot(path='work/outfit-'+kind+'-'+clip+'.png')
  checks.append({'kind':kind,'clips':clips})
 page.locator('#close-actors').click();page.locator('#start').click();page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.enemies).length===3');assert not errors,errors
 Path('work/meshy-outfits-preview-check.json').write_text(json.dumps({'checks':checks,'pageErrors':errors,'scope':'Compiled game, phone viewport; not a physical-device performance benchmark.'},indent=2)+'\n');b.close()
