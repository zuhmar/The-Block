"""Validate source pairing, transparent item icons, native references and existing asset reuse."""
from pathlib import Path
from PIL import Image
import json,hashlib
ROOT=Path('art/loot-items/meshy-v1');m=json.loads((ROOT/'manifest.json').read_text());records=[]
assert len(m['props'])==42
for p in m['props']:
 name=p['name'];prepared=json.loads((ROOT/'tasks'/('prepared-'+name+'.json')).read_text());completed=json.loads((ROOT/'tasks'/('completed-'+name+'.json')).read_text());ref=json.loads((ROOT/'tasks'/('ref-'+name+'.json')).read_text())
 assert completed['referenceTaskId']==ref['task_id']==prepared['referenceTaskId']
 assert completed['task_id']==prepared['modelTaskId']
 reference=Image.open(ROOT/'references'/(name+'.png'));a=reference.convert('RGBA');source_path=Path('work/loot-sources')/(name+'.png')
 pixel_hash=hashlib.sha256(a.tobytes()).hexdigest()
 if source_path.exists():
  b=Image.open(source_path).convert('RGBA');assert a.size==b.size and a.tobytes()==b.tobytes(),name+': source reference mismatch'
 else:assert p.get('sourceImagePixelsSha256')==pixel_hash,name+': reference changed since source verification'
 p['sourceImagePixelsSha256']=pixel_hash
 sprite=Image.open(ROOT/'sprites'/(name+'.png'));assert sprite.mode=='RGBA' and sprite.size==(512,512)
 alpha=sprite.getchannel('A');assert alpha.getextrema()==(0,255);bounds=alpha.getbbox();assert bounds and bounds[0]>=8 and bounds[1]>=8 and bounds[2]<=504 and bounds[3]<=504,name+': sprite clips its frame'
 assert all(prepared[k]>0 for k in ['width','height','depth'])
 records.append({'name':name,'sourceImagePixelsMatchReference':True,'spriteMode':sprite.mode,'spriteSize':list(sprite.size),'alphaBounds':list(bounds),'spriteSha256':hashlib.sha256((ROOT/'sprites'/(name+'.png')).read_bytes()).hexdigest()})
 p.update(prepared);p['referenceTaskId']=ref['task_id'];p['status']='SUCCEEDED';p['modelType']=completed['model_type'];p['nativeBounds']=completed['nativeSize'];p['previewPath']='previews/'+name+'.png';p['sourceImagePixelsMatchReference']=True
for r in m['reusedAssets']:
 for field in ['modelPath','spritePath']:assert Path(r[field]).is_file(),r[field]
assert len({p['referenceTaskId'] for p in m['props']})==42 and len({p['modelTaskId'] for p in m['props']})==42
m['referenceGenerationMethod']='Separate Meshy text-to-image images, one accepted source per item; images contain a plain background'
m['spriteMethod']='True-alpha Blender renders of the textured AI-generated Meshy models'
m['assetState']='Delivered art assets only; new items are not yet added to gameplay or loot tables; armor pickups are static and unrigged'
(ROOT/'sprite-checks.json').write_text(json.dumps({'checked':len(records),'sourceReferencesVerified':42,'transparentSprites':42,'reusedAssetsVerified':len(m['reusedAssets']),'sprites':records},indent=2)+'\n')
(ROOT/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
print(json.dumps({'transparentSprites':42,'pairedReferences':42,'reusedAssets':len(m['reusedAssets'])}))
