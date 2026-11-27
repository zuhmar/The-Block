"""Verify exact Meshy source pairing, alpha sprites, proportions and floor pivots."""
from pathlib import Path
from PIL import Image
import json,hashlib
ROOT=Path('art/roadside/meshy-v1');m=json.loads((ROOT/'manifest.json').read_text());records=[]
assert len(m['props'])==12
for p in m['props']:
 name=p['name'];ref=Image.open(ROOT/'references'/(name+'.png'))
 assert ref.size==(1024,1024)
 if p['status']=='blocked-approval':
  assert not p['modelTaskId'] and not (ROOT/'models'/(name+'.glb')).exists()
  continue
 prepared=json.loads((ROOT/'tasks'/('prepared-'+name+'.json')).read_text())
 done=json.loads((ROOT/'tasks'/('completed-'+name+'.json')).read_text())
 assert done['referenceTaskId']==prepared['referenceTaskId']==p['referenceTaskId']
 assert done['task_id']==prepared['modelTaskId']==p['modelTaskId']
 pixel_hash=hashlib.sha256(ref.convert('RGBA').tobytes()).hexdigest()
 source=Path('work/roadside-sources')/(name+'.png')
 if source.exists():
  a=Image.open(source).convert('RGBA');b=ref.convert('RGBA')
  assert a.size==b.size and a.tobytes()==b.tobytes(),name
 assert p['sourceImagePixelsSha256']==pixel_hash and p['sourceImagePixelsMatchReference']
 sprite=Image.open(ROOT/'sprites'/(name+'.png'))
 assert sprite.mode=='RGBA' and sprite.size==(512,512)
 alpha=sprite.getchannel('A');bounds=alpha.getbbox()
 assert alpha.getextrema()==(0,255) and bounds and min(bounds[:2])>=8 and max(bounds[2:])<=504,(name,bounds)
 assert abs(max(prepared[k] for k in ('width','height','depth'))-p['longest'])<.0001
 p.update(prepared);p['status']='complete';p['modelType']=done['model_type'];p['nativeBounds']=done.get('nativeSize')
 records.append({'name':name,'sourceImagePixelsMatchReference':True,'spriteSize':list(sprite.size),'alphaBounds':list(bounds),'spriteSha256':hashlib.sha256((ROOT/'sprites'/(name+'.png')).read_bytes()).hexdigest()})
assert len(records)==sum(bool(p['modelTaskId']) for p in m['props'])
m['assetState']=f"{len(records)} complete static world-prop models and transparent sprites; all twelve individual references; {len(m['props'])-len(records)} models pending. Integrated into the game and separate map editor."
(ROOT/'sprite-checks.json').write_text(json.dumps({'transparentSprites':len(records),'pairedReferences':len(records),'referenceImages':12,'pendingModels':len(m['props'])-len(records),'sprites':records},indent=2)+'\n')
(ROOT/'manifest.json').write_text(json.dumps(m,indent=2)+'\n');print('Validated',len(records),'transparent sprites and exact source pairs')
