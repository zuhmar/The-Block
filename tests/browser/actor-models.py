"""Inspect actual model previews, equipped hands, recoil and feet in the live Three.js renderer."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('work');out.mkdir(exist_ok=True);errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('FPS_CHECK_URL','http://127.0.0.1:5173'),wait_until='networkidle')
 page.locator('#view-models').click();page.wait_for_function('document.querySelector("#actor-canvas").dataset.model==="player"')
 player=page.locator('#actor-canvas').evaluate('(c)=>({...c.dataset})');assert int(player['drawCalls'])<30 and int(player['triangles'])<10000,player
 page.screenshot(path=str(out/'actor-player-preview.png'))
 cdp=context.new_cdp_session(page);b=page.locator('#actor-canvas').bounding_box();x=b['x']+b['width']/2;y=b['y']+b['height']/2
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+70,'y':y,'id':1}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 page.wait_for_function('(before)=>document.querySelector("#actor-canvas").dataset.rotation!==before',arg=player['rotation'])
 page.locator('#show-pistol').click();page.wait_for_function('document.querySelector("#actor-canvas").dataset.model==="pistol"');pistol=page.locator('#actor-canvas').evaluate('(c)=>({...c.dataset})')
 assert int(pistol['drawCalls'])<12 and int(pistol['triangles'])<5000,pistol
 page.screenshot(path=str(out/'actor-pistol-preview.png'))
 page.locator('#close-actors').click();assert page.locator('#actor-preview').count()==0
 # Repeated preview opening/closing must not leak key capture or WebGL contexts.
 for i in range(2):
  page.locator('#view-models').click();page.locator('#actor-canvas').wait_for();page.keyboard.press('Escape');assert page.locator('#actor-preview').count()==0
 page.locator('#start').click();page.wait_for_function('document.querySelector("#world").dataset.actorModels==="rounded-stick-player,detailed-pistol"')
 page.locator('#pistol-tool').click();page.wait_for_function('document.querySelector("#world").dataset.equipped==="pistol"')
 # The diagnostic advances only after an actual rendered frame has positive slide recoil.
 before=int(page.locator('#world').get_attribute('data-recoil-rendered') or 0)
 page.locator('#fire').click();page.wait_for_function('(before)=>Number(document.querySelector("#world").dataset.recoilRendered)>before',arg=before);page.wait_for_function('Number(document.querySelector("#world").dataset.recoil)===0')
 page.screenshot(path=str(out/'actor-first-person-pistol.png'))
 # Look down through real touch input; the character lower body is now rendered.
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':290,'y':270,'id':2}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':290,'y':490,'id':2}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_function('Number(document.querySelector("#world").dataset.pitch)<-1')
 page.locator('#hand-tool').click();page.wait_for_function('document.querySelector("#world").dataset.equipped==="hands"');page.screenshot(path=str(out/'actor-first-person-feet.png'))
 game=page.locator('#world').evaluate('(c)=>({...c.dataset})');assert int(game['drawCalls'])<120 and int(game['triangles'])<20000,game
 page.locator('#pause-button').click();assert page.locator('#menu').is_visible();assert not errors,errors
 result={'playerPreview':player,'pistolPreview':pistol,'game':game,'touchPreviewRotation':True,'previewCloseAndReopen':True,'equippedPistol':True,'slideRecoilAndRecovery':True,'pageErrors':errors,'scope':'Local Chromium software WebGL; appearance and functional checks, not physical-phone FPS.'}
 (out/'actor-browser-check.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));context.close();browser.close()
