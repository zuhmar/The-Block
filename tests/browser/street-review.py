"""Review the actual Blender GLB, real bone animations, slot toggles and lazy loading."""
import json,os,math
from pathlib import Path
from playwright.sync_api import sync_playwright
errors=[];checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for phone in [False,True]:
  c=b.new_context(viewport={'width':390 if phone else 1100,'height':844 if phone else 900},device_scale_factor=2 if phone else 1,is_mobile=phone,has_touch=phone);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));requests=[];page.on('request',lambda r:requests.append(r.url))
  page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');assert not any('.glb' in u for u in requests)
  page.locator('#view-models').click();page.locator('#show-street').click();page.wait_for_function('document.querySelector("#actor-canvas").dataset.model==="street"');assert not any('.glb' in u for u in requests)
  page.screenshot(path='work/street-old'+('-phone' if phone else '')+'.png')
  page.locator('#show-street-v2').click();page.wait_for_function('document.querySelector("#actor-canvas").dataset.reviewLoaded==="true"&&document.querySelector("#actor-canvas").dataset.model==="street-v2"',timeout=60000)
  def state():return page.locator('#actor-canvas').evaluate('(c)=>({...c.dataset})')
  stats=state();assert int(stats['drawCalls'])<45 and int(stats['triangles'])<45000,stats;assert stats['bonePose'] and stats['handPose'],stats
  assert len([u for u in requests if '.glb' in u])==1
  page.screenshot(path='work/street-v2-game'+('-phone' if phone else '')+'.png')
  pose=stats['bonePose'];page.locator('[data-motion=walk]').click();page.wait_for_function('(before)=>document.querySelector("#actor-canvas").dataset.bonePose!==before',arg=pose);page.screenshot(path='work/street-v2-walking'+('-phone' if phone else '')+'.png')
  page.locator('[data-motion=still]').click();page.wait_for_function('document.querySelector("#actor-canvas").dataset.motion==="still"');hand=state()['handPose'];page.locator('[data-motion=grip]').click();page.wait_for_function('(before)=>document.querySelector("#actor-canvas").dataset.handPose!==before',arg=hand);page.locator('[data-motion=still]').click()
  for slot in ['headwear','torso','legs','footwear']:
   page.locator('[data-slot='+slot+']').uncheck();page.wait_for_function('(slot)=>document.querySelector("#actor-canvas").dataset.hiddenSlots.includes(slot)',arg=slot)
  assert int(state()['triangles'])<int(stats['triangles']);page.screenshot(path='work/street-v2-bare'+('-phone' if phone else '')+'.png')
  for slot in ['headwear','torso','legs','footwear']:page.locator('[data-slot='+slot+']').check()
  canvas=page.locator('#actor-canvas').bounding_box();x=canvas['x']+canvas['width']/2;y=canvas['y']+canvas['height']/2;before=state()['rotation']
  if phone:
   cd=c.new_cdp_session(page);cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':x,'y':y}]});cd.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'id':1,'x':x+65,'y':y}]});cd.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  else:
   page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+100,y,steps=5);page.mouse.up()
  page.wait_for_function('(before)=>document.querySelector("#actor-canvas").dataset.rotation!==before',arg=before);page.screenshot(path='work/street-v2-rotated'+('-phone' if phone else '')+'.png')
  page.locator('#show-street').click();page.wait_for_function('document.querySelector("#actor-canvas").dataset.model==="street"');assert page.locator('#review-motion').is_hidden()
  page.locator('#close-actors').click();page.locator('#view-models').click();page.locator('#show-street-v2').click();page.locator('#close-actors').click();page.wait_for_timeout(800);page.locator('#view-models').click();page.locator('#show-pistol').click();page.wait_for_function('document.querySelector("#actor-canvas").dataset.model==="pistol"');page.keyboard.press('Escape');assert page.locator('#actor-preview').count()==0
  checks.append({'phone':phone,'render':stats,'lazyModelLoading':True,'walkDeformsKnee':True,'gripDeformsFingers':True,'independentSlots':True,'rotation':True,'closeDuringLoadAndReopen':True});print('Passed Street V2:', 'phone' if phone else 'desktop',flush=True);c.close()
 b.close()
assert not errors,errors
Path('work/street-v2-browser-check.json').write_text(json.dumps({'checks':checks,'pageErrors':errors,'scope':'Actual GLB and baked texture in compiled production viewer, desktop and phone viewport; software WebGL, not physical-phone FPS.'},indent=2)+'\n')
