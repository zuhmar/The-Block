"""Package Blender sources, runtime files, and an honest reference/model comparison."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import shutil
from PIL import Image,ImageDraw,ImageFont
root=Path('art/models/resource-items');out=Path('apps/client/static/assets/resource-items');kinds=['wood','rock','sulfur','metal'];ref=Image.open('art/ai/resource-items/resource-items.png').convert('RGBA');font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
preview=Image.new('RGBA',(1024,1024),(0,0,0,0));comparison=Image.new('RGB',(1080,1320),'#23333c');draw=ImageDraw.Draw(comparison)
def fit(image,size):
 image=image.crop(image.getchannel('A').getbbox());image.thumbnail(size,Image.Resampling.LANCZOS);return image
for i,kind in enumerate(kinds):
 front=Image.open(root/'renders'/('item-'+kind+'.png')).convert('RGBA');angle=Image.open(root/'renders'/('item-'+kind+'-angle.png')).convert('RGBA');im=fit(front,(450,450));preview.alpha_composite(im,((i%2)*512+(512-im.width)//2,(i//2)*512+(512-im.height)//2))
 crop=ref.crop(((i%2)*654,(i//2)*601,(i%2+1)*654,(i//2+1)*601))
 for col,(label,img)in enumerate([('Approved image',crop),('Blender front',front),('Blender angled',angle)]):
  draw.text((col*360+16,i*330+12),kind.upper()+' · '+label,font=font,fill='#eee8cf');im=fit(img,(320,270));comparison.paste(im,(col*360+(360-im.width)//2,i*330+48+(270-im.height)//2),im)
 for suffix in ['', '-angle']:shutil.copyfile(root/'renders'/('item-'+kind+suffix+'.png'),out/('item-'+kind+suffix+'.png'))
preview.save(out/'preview.png');comparison.save(out/'comparison.png');shutil.copyfile(root/'README.md',out/'README.md')
with ZipFile(out/'street-survival-resource-items.zip','w',ZIP_DEFLATED)as z:
 for kind in kinds:
  for p,label in [(root/('item-'+kind+'.blend'),'blender/item-'+kind+'.blend'),(out/('item-'+kind+'.glb'),'glb/item-'+kind+'.glb'),(root/(kind+'-color.png'),'textures/'+kind+'-color.png')]:z.write(p,label)
  for suffix in ['','-angle']:z.write(root/'renders'/('item-'+kind+suffix+'.png'),'renders/item-'+kind+suffix+'.png')
 z.write(root/'wood-atlas.png','textures/wood-atlas.png')
 for file in ['manifest.json','README.md','preview.png','comparison.png']:z.write(out/file,file)
 z.write('art/ai/resource-items/resource-items.png','references/approved-resource-items.png')
