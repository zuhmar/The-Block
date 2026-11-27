"""Build an honest local preview gallery and downloadable roadside art bundle."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,html,zipfile
root=Path('art/roadside/meshy-v1');m=json.loads((root/'manifest.json').read_text())
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
for kind,folder in [('references','references'),('sprites','sprites')]:
 props=[p for p in m['props'] if (root/folder/(p['name']+'.png')).exists()]
 rows=(len(props)+3)//4;sheet=Image.new('RGB',(1200,rows*310+60),'#19262c');draw=ImageDraw.Draw(sheet)
 draw.text((22,18),'STREET SURVIVAL / ROADSIDE '+kind.upper(),font=font,fill='#e2c581')
 for i,p in enumerate(props):
  x=(i%4)*300;y=(i//4)*310+60;im=Image.open(root/folder/(p['name']+'.png')).convert('RGBA');im.thumbnail((280,260))
  tile=Image.new('RGBA',(288,270),'#dfe4e4');tile.alpha_composite(im,((288-im.width)//2,(270-im.height)//2));sheet.paste(tile.convert('RGB'),(x+6,y))
  draw.text((x+10,y+278),p['label'],font=font,fill='#e6e9e9')
 sheet.save(root/('gallery-'+kind+'.png'))
css='body{margin:32px;background:#19262c;color:#e6e9e9;font:16px system-ui}h1{color:#e2c581}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}article{padding:16px;background:#26373d;border-radius:12px}img{width:100%;aspect-ratio:1;object-fit:contain;background:#dfe4e4;border-radius:8px}a{color:#8de1d8}p{line-height:1.5}small{display:block;color:#c4cece}input{padding:12px;margin-bottom:20px;width:min(90%,400px)}'
completed=sum(p['status']=='complete' for p in m['props'])
summary=f"Five crate tiers and seven street props. {completed} completed textured models and transparent sprites; all {len(m['props'])} references. Integrated into the game and separate map editor."
cards=[]
for p in m['props']:
 name=p['name'];done=p['status']=='complete';img=('sprites' if done else 'references')+'/'+name+'.png'
 links=f'<a href="references/{name}.png">Reference</a>'
 if done:links+=f' · <a href="sprites/{name}.png">Alpha sprite</a> · <a href="models/{name}.glb">GLB model</a>'
 cards.append(f'<article data-name="{html.escape(p["label"].lower())}"><img src="{img}" alt="{html.escape(p["label"])}"><h2>{html.escape(p["label"])}</h2><small>{"Model + transparent sprite complete" if done else "Reference ready · model awaiting credit approval"}</small><p>{links}</p></article>')
(root/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Street Survival roadside art</title><style>'+css+'</style><h1>Street Survival · Roadside art</h1><p>'+summary+'</p><input id="filter" aria-label="Filter props" placeholder="Filter props…"><main>'+''.join(cards)+'</main><script>document.querySelector("#filter").addEventListener("input",e=>{for(const c of document.querySelectorAll("article"))c.hidden=!c.dataset.name.includes(e.target.value.toLowerCase())})</script></html>')
with zipfile.ZipFile('work/street-survival-roadside-assets.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in sorted(root.rglob('*')):
  if f.is_file():z.write(f,f.relative_to(root))
print('Packaged roadside assets')
