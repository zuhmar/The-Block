"""Extract lossless cells from the original AI sheet; do not redraw or recolor its artwork."""
from pathlib import Path
from PIL import Image
import json,hashlib,zipfile
SOURCE=Path('art/ai/nature/tree-resource-nodes.png');OUT=Path('apps/client/static/assets/nature-sprites');OUT.mkdir(parents=True,exist_ok=True)
sheet=Image.open(SOURCE);assert sheet.mode=='RGBA' and sheet.size==(1536,1024)
items=['tree-broadleaf','tree-pine','tree-birch','node-rock','node-sulfur','node-metal'];frames={};checks=[]
for i,key in enumerate(items):
 x=i%3*512;y=i//3*512;icon=sheet.crop((x,y,x+512,y+512));alpha=icon.getchannel('A');assert alpha.getextrema()[0]==0
 # Ignore sub-1% alpha specks when measuring useful object bounds; original pixels are retained.
 bounds=alpha.point(lambda n:255 if n>=16 else 0).getbbox();assert bounds and bounds[0]>=8 and bounds[1]>=8 and bounds[2]<=504 and bounds[3]<=504,(key,bounds)
 icon.save(OUT/(key+'.png'));frames[key]={'frame':{'x':x,'y':y,'w':512,'h':512},'rotated':False,'trimmed':False,'sourceSize':{'w':512,'h':512},'spriteSourceSize':{'x':0,'y':0,'w':512,'h':512},'pivot':{'x':.5,'y':bounds[3]/512}}
 checks.append({'id':key,'dimensions':[512,512],'alphaRange':list(alpha.getextrema()),'contentBoundsAtAlpha16':list(bounds),'sha256':hashlib.sha256((OUT/(key+'.png')).read_bytes()).hexdigest()})
sheet.save(OUT/'nature-atlas.png');(OUT/'nature-atlas.json').write_text(json.dumps({'frames':frames,'meta':{'image':'nature-atlas.png','format':'RGBA8888','size':{'w':1536,'h':1024},'scale':'1'}},indent=2)+'\n')
with zipfile.ZipFile(OUT/'street-survival-nature-sprites.zip','w',compression=zipfile.ZIP_DEFLATED) as archive:
 for file in [*[OUT/(key+'.png') for key in items],OUT/'nature-atlas.png',OUT/'nature-atlas.json']:archive.write(file,file.name)
Path('art/ai/nature/sprite-checks.json').write_text(json.dumps(checks,indent=2)+'\n');print(json.dumps({'sprites':len(checks),'canvas':[512,512],'atlas':[1536,1024],'transparent':True}))
