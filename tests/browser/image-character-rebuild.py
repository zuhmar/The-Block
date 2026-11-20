"""Exercise all four image-led Blender assets and their shared rig in the actual viewer."""
import json,os,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
errors=[];checks=[]
ids={'base':'#show-image-base','street':'#show-street-v2','reinforced':'#show-image-reinforced','armored':'#show-image-armored'}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for phone in [False,True]:
  c=b.new_context(viewport={'width':390 if phone else 1100,'height':844 if phone else 900},device_scale_factor=2 if phone else 1,is_mobile=phone,has_touch=phone);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));requests=[];page.on('request',lambda r:requests.append(r.url));page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');assert not any('.glb' in u for u in requests);page.locator('#view-models').click()
  for kind,selector in ids.items():
   page.locator(selector).click();page.wait_for_function('(k)=>document.querySelector("#actor-canvas").dataset.reviewLoaded==="true"&&document.querySelector("#actor-canvas").dataset.reviewKind===k',arg=kind,timeout=60000)
   def state():return page.locator('#actor-canvas').evaluate('(c)=>({...c.dataset})')
   stats=state();assert int(stats['triangles'])<50150 and int(stats['drawCalls'])<50,stats
   page.mouse.move(5,5);page.screenshot(path='work/image-'+kind+('-phone' if phone else '')+'.png')
   pose=stats['bonePose'];assert pose;page.locator('[data-motion=walk]').click();page.wait_for_function('(p)=>document.querySelector("#actor-canvas").dataset.bonePose!==p',arg=pose);page.locator('[data-motion=still]').click()
   hand=state()['handPose'];page.locator('[data-motion=grip]').click();page.wait_for_function('(p)=>document.querySelector("#actor-canvas").dataset.handPose!==p',arg=hand);page.locator('[data-motion=still]').click()
   if kind!='base':
    page.locator('[data-slot=headwear]').uncheck();page.wait_for_function('document.querySelector("#actor-canvas").dataset.hiddenSlots.includes("headwear")');assert int(state()['triangles'])<int(stats['triangles']);page.locator('[data-slot=headwear]').check()
   checks.append({'phone':phone,'kind':kind,'render':stats,'walkDeformsKnee':True,'gripDeformsMitten':True});print('Passed image model:',kind,'phone' if phone else 'desktop',flush=True)
  reference=page.locator('#image-reference').get_attribute('href');response=page.request.get(reference);assert response.ok;assert hashlib.sha256(response.body()).hexdigest()==hashlib.sha256(Path('art/characters/image-rebuild/reference.png').read_bytes()).hexdigest()
  page.locator('#close-actors').click();page.locator('#view-models').click();page.locator('#show-pistol').click();page.wait_for_function('document.querySelector("#actor-canvas").dataset.model==="pistol"');page.keyboard.press('Escape');assert page.locator('#actor-preview').count()==0;c.close()
 b.close()
assert not errors,errors
Path('work/image-models-browser-check.json').write_text(json.dumps({'checks':checks,'referenceAvailable':True,'pageErrors':errors,'scope':'Actual compiled viewer in desktop and phone viewports, software WebGL; not a physical-phone FPS benchmark.'},indent=2)+'\n')
