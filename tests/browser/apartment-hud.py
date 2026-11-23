"""Long apartment/floor labels fit the phone header without colliding with controls."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:4173',wait_until='networkidle');page.locator('#start').tap();page.wait_for_function('document.querySelector("#world").dataset.buildingSources!==undefined');assert json.loads(page.locator('#world').get_attribute('data-building-sources'))==['blender']*19
 results=[]
 for w,h in [(320,740),(390,844),(844,390)]:
  page.set_viewport_size({'width':w,'height':h});page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
  d=page.evaluate('''(label)=>{
   document.querySelector('#zone').textContent=label;document.querySelector('#coordinates').textContent=label.startsWith('MILITARY')?'100 E · 25 S':'FLOOR 3 · -24 E · -25 S';
   const a=document.querySelector('.brand').getBoundingClientRect(),l=document.querySelector('.location').getBoundingClientRect(),p=document.querySelector('#pause-button').getBoundingClientRect();
   return {brandRight:a.right,locationLeft:l.left,locationRight:l.right,pauseLeft:p.left,bottom:l.bottom,overflow:document.querySelector('#zone').scrollWidth>document.querySelector('#zone').clientWidth};
  }''',os.environ.get('HUD_TEST_NAME','CORNER TENEMENTS'))
  assert d['brandRight']+2<d['locationLeft'] and d['locationRight']+2<d['pauseLeft'] and not d['overflow'] and d['bottom']<94,(w,h,d)
  results.append({'viewport':[w,h],**d})
 assert not errors,errors;Path('work/apartment-hud-check.json').write_text(json.dumps(results,indent=2)+'\n');print(results);b.close()
