"""Pack the Blender sources, texture finishes, GLBs and true-alpha renders."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
from PIL import Image,ImageDraw,ImageFont
root=Path('art/models/ammo');out=Path('apps/client/static/assets/ammo');kinds=['pistol','smg','rifle','sniper','lmg','rockets']
preview=Image.new('RGBA',(1200,800));labelled=Image.new('RGB',(1200,880),'#20362e');draw=ImageDraw.Draw(labelled);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
for i,k in enumerate(kinds):
 im=Image.open(out/('ammo-'+k+'.png')).convert('RGBA');assert im.getchannel('A').getextrema()==(0,255);im=im.crop(im.getchannel('A').getbbox());im.thumbnail((300,330),Image.Resampling.LANCZOS);x=(i%3)*400+(400-im.width)//2;y=(i//3)*400+(400-im.height)//2;preview.alpha_composite(im,(x,y));labelled.paste(im,(x,y+(i//3)*40),im);draw.text(((i%3)*400+24,(i//3)*440+405),k.upper() if k!='rockets' else 'ROCKET',font=font,fill='#e8d6a7')
preview.save(out/'preview.png');labelled.save(out/'lineup.png')
with ZipFile(out/'street-survival-ammo.zip','w',ZIP_DEFLATED)as z:
 for p in root.glob('*.blend'):z.write(p,'blender/'+p.name)
 for p in root.glob('*.png'):z.write(p,'textures/'+p.name)
 for pattern in ['*.glb','*.png','*.json','*.md']:
  for p in out.glob(pattern):z.write(p,p.name)
 z.write('art/ai/ammo/reference.png','reference.png');z.write('packages/art-tools/build-ammo.py','build-ammo.py');z.write('packages/art-tools/optimize-ammo.py','optimize-ammo.py')
