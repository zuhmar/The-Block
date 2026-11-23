from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
from PIL import Image
root=Path('art/models/crafting');out=Path('apps/client/static/assets/crafting');kinds=['station-workbench','station-furnace','item-sulfur-refined','item-metal-fragments','item-charcoal','item-gunpowder']
preview=Image.new('RGBA',(1200,800))
for i,key in enumerate(kinds):
 im=Image.open(out/(key+'.png')).convert('RGBA');assert im.getchannel('A').getextrema()==(0,255);im.thumbnail((360,360));preview.alpha_composite(im,((i%3)*400+(400-im.width)//2,(i//3)*400+(400-im.height)//2))
preview.save(out/'preview.png')
with ZipFile(out/'street-survival-crafting.zip','w',ZIP_DEFLATED)as z:
 for key in kinds:
  z.write(root/(key+'.blend'),'blender/'+key+'.blend')
  for ext in ['.glb','.png']:z.write(out/(key+ext),key+ext)
 z.write(out/'manifest.json','manifest.json');z.write('art/ai/crafting/stations-reference.png','stations-reference.png');z.write('packages/art-tools/build-crafting.py','build-crafting.py');z.write('docs/crafting-stations.md','README.md')
