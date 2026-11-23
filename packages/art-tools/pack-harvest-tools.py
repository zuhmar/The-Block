"""Package editable Blender assets with their runtime exports and previews."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import shutil
root=Path('art/models/harvest-tools');out=Path('apps/client/static/assets/harvest-tools')
shutil.copyfile(root/'README.md',out/'README.md')
for kind in ['axe','pickaxe']:shutil.copyfile(root/'renders'/(kind+'.png'),out/(kind+'-preview.png'))
with ZipFile(out/'street-survival-harvest-tools.zip','w',ZIP_DEFLATED) as z:
 for kind in ['axe','pickaxe']:
  for p,label in [(root/(kind+'.blend'),'blender/'+kind+'.blend'),(out/(kind+'.glb'),'glb/'+kind+'.glb'),(root/'renders'/(kind+'.png'),'renders/'+kind+'.png'),(Path('art/ai/harvest-tools')/(kind+'.png'),'references/'+kind+'.png')]:z.write(p,label)
 z.write(out/'manifest.json','manifest.json');z.write(root/'README.md','README.md')
