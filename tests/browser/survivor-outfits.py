"""Inspect all four real 3D survivors, independent equipment slots, and mobile layout."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
errors=[];checks=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for phone in [False,True]:
  context=browser.new_context(viewport={'width':390 if phone else 1100,'height':844 if phone else 850},device_scale_factor=2 if phone else 1,is_mobile=phone,has_touch=phone)
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');page.locator('#view-models').click()
  for kind in ['player','street','reinforced','armored']:
   page.locator('#show-'+kind).click();page.wait_for_function('(kind)=>document.querySelector("#actor-canvas").dataset.model===kind',arg=kind)
   canvas=page.locator('#actor-canvas');metrics=canvas.evaluate('(c)=>({...c.dataset})');assert int(metrics['drawCalls'])<65 and int(metrics['triangles'])<16000,metrics
   page.screenshot(path='work/survivor-'+kind+('-phone' if phone else '')+'.png');checks.append({'phone':phone,'outfit':kind,'render':metrics})
   if kind!='player':
    for slot in ['headwear','torso','legs','footwear']:
     page.locator('[data-slot='+slot+']').uncheck();page.wait_for_function('(slot)=>document.querySelector("#actor-canvas").dataset.hiddenSlots.split(",").includes(slot)',arg=slot)
    hidden=canvas.evaluate('(c)=>({...c.dataset})');assert int(hidden['triangles'])<int(metrics['triangles'])
    page.screenshot(path='work/survivor-'+kind+'-unequipped'+('-phone' if phone else '')+'.png')
    for slot in ['headwear','torso','legs','footwear']:page.locator('[data-slot='+slot+']').check()
   else:assert page.locator('#clothing-slots').is_hidden()
  page.locator('#show-pistol').click();page.wait_for_function('document.querySelector("#actor-canvas").dataset.model==="pistol"');assert page.locator('#clothing-slots').is_hidden()
  page.locator('#close-actors').click();page.locator('#view-models').click();page.wait_for_function('document.querySelector("#actor-canvas").dataset.model==="player"');page.keyboard.press('Escape');assert page.locator('#actor-preview').count()==0
  context.close()
 browser.close()
assert not errors,errors
result={'outfits':checks,'independentSlots':True,'reopenAndClose':True,'pageErrors':errors,'scope':'Compiled production bundle in software-WebGL Chromium, desktop and phone viewport; not physical-device FPS.'}
Path('work/survivor-outfits-check.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
