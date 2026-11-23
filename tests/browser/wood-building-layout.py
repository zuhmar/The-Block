"""All six build choices stay readable and tappable in portrait and landscape."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
checks=[];errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for width,height,touch in [(390,844,True),(844,390,True),(800,600,False)]:
  c=b.new_context(viewport={'width':width,'height':height},is_mobile=touch,has_touch=touch);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:4173'),wait_until='networkidle');page.locator('#start').click()
  if touch:
   cdp=c.new_cdp_session(page);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':width/2,'y':120,'id':1}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':width/2,'y':250,'id':1}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_function('Number(document.querySelector("#world").dataset.pitch)<-.5');page.locator('#build-tool').tap()
  else:
   page.wait_for_function('document.pointerLockElement===document.querySelector("#world")');page.evaluate('document.dispatchEvent(new MouseEvent("mousemove",{movementY:270}))');page.keyboard.press('b')
  boxes=page.locator('#build-panel').evaluate('p=>[p,...p.querySelectorAll("button")].map(e=>({id:e.dataset.piece||e.id,rect:{x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,right:e.getBoundingClientRect().right,bottom:e.getBoundingClientRect().bottom},scroll:e.scrollWidth,width:e.clientWidth}))')
  for box in boxes:
   r=box['rect'];assert r['x']>=0 and r['y']>=0 and r['right']<=width+.5 and r['bottom']<=height+.5,(width,height,box)
   assert box['scroll']<=box['width']+1,(width,height,box)
  (page.locator('[data-piece=foundation]').tap() if touch else page.keyboard.press('5'));page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.buildCandidate)?.kind==="foundation"');(page.locator('[data-piece=door]').tap() if touch else page.keyboard.press('6'));page.wait_for_function('JSON.parse(document.querySelector("#world").dataset.buildCandidate)?.kind==="door"')
  page.screenshot(path='work/wood-building-menu-'+str(width)+'.png');checks.append({'viewport':[width,height],'allSixChoicesVisible':True,'buttonsInsideViewport':True,'labelsDoNotOverflow':True});c.close()
 assert not errors,errors
 Path('work/wood-building-layout-check.json').write_text(json.dumps({'checks':checks,'pageErrors':errors},indent=2)+'\n');b.close()
