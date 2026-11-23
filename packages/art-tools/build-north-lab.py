"""Seven original glossy North Works buildings and a shared yard assembly.
Reuses the project's Blender mesh/prop helpers, not existing building geometry.
Architectural set dressing only; no production recipes or new gameplay systems.
"""
import bpy,math,json,ast,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path('art/buildings/north-lab');OUT=Path('apps/client/src/fps/models/buildings');STATIC=Path('apps/client/static/assets/north-lab')
source=Path('packages/art-tools/build-blender-buildings.py').read_text();tree=ast.parse(source);defs=ast.Module(body=[n for n in tree.body if isinstance(n,(ast.Import,ast.ImportFrom,ast.ClassDef,ast.FunctionDef))],type_ignores=[]);exec(compile(defs,'building-helpers','exec'),globals())
DATA=json.loads((ROOT/'layout.json').read_text());YARD=json.loads((ROOT/'yard.json').read_text());REPORT=[]
def setup(color):
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
 mats=palette(0)
 for name,c in [('wall',f'{color:06x}'),('trim','344E51'),('metal','77858B'),('floor','999A8C'),('wood','C38138'),('woodLight','DAA04B'),('accent','DDA839'),('blue','3D88AE')]:mats[name].node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*linear(c),1)
 return Builder(mats)
def seal(b,root,path,meta):
 parts=b.join(root);root['source']='original-blender-north-lab';root['layoutSHA256']=hashlib.sha256((ROOT/'layout.json').read_bytes()).hexdigest();export(root,parts+[o for o in root.children if o.type=='EMPTY'],str(path));REPORT.append({**meta,'triangles':triangles(parts),'drawCalls':len(parts),'bytes':path.stat().st_size})
 return parts
for data in DATA:
 typ=data['type'];w=data['width'];d=data['depth'];h=data['height'];front=data['front'];b=setup(data['color']);root=b.group(typ)
 for x in [-w/2,w/2]:b.box('side wall',(x,h/2,0),(.22,h,d),'wall',.035)
 b.box('rear wall',(0,h/2,-front*d/2),(w,h,.22),'wall',.035)
 for x in [-(w+1.8)/4,(w+1.8)/4]:b.box('doorway wall wing',(x,h/2,front*d/2),((w-1.8)/2,h,.22),'wall',.035)
 b.box('door lintel',(0,(h+2.8)/2,front*d/2),(1.8,h-2.8,.22),'wall',.025)
 b.box('ground floor',(0,.012,0),(w-.22,.025,d-.22),'floor',0)
 for z in [-d/2-.08,d/2+.08]:b.box('facade base trim',(0,.18,z),(w,.27,.17),'trim',.02)
 for x in [-w/2,w/2]:b.box('front corner pillar',(x,h/2,front*(d/2+.1)),(.3,h,.24),'trim',.03)
 b.role='roof';b.box('flat glossy roof',(0,h+.05,0),(w+.5,.18,d+.5),'trim',.04)
 for x in [-w*.3,w*.3]:b.box('roof extraction box',(x,h+.45,0),(1.8,.7,1.3),'metal',.07)
 b.role='shell'
 for z in [-d/2-.14,d/2+.14]:
  for x in [-w*.34,w*.34]:
   if typ in ['north-warehouse','north-packing'] and z*front>0:
    b.box('closed loading shutter',(x,1.75,z),(min(6,w*.26),3.5,.12),'dark',.02)
    for y in [.3,.7,1.1,1.5,1.9,2.3,2.7,3.1]:b.box('shutter ribs',(x,y,z+(.07 if z>0 else -.07)),(min(5.8,w*.25),.045,.045),'metal',0)
   else:
    b.box('window frame',(x,2.1,z),(min(3,w*.2),1.5,.12),'trim',.025);b.box('stylized blue window',(x,2.1,z+(.08 if z>0 else -.08)),(min(2.8,w*.18),1.3,.025),'blue',.015)
    for dx in [-.45,.45]:b.box('window mullion',(x+dx,2.1,z+(.1 if z>0 else -.1)),(.05,1.3,.035),'metal',0)
 b.box('door light',(0,3.1,front*(d/2+.2)),(1.3,.12,.2),'light',.02)
 b.role='interior'
 for p in data['partitions']:b.box('partition with open passage',(p['x'],p['height']/2,p['z']),(p['width'],p['height'],p['depth']),'ivory',.02)
 for i,f in enumerate(data['fixtures']):
  start=len(b.parts);kind=f['kind'];fw=f['width'];fd=f['depth'];b.fixture=i
  lab=typ in ['north-main-lab','north-secondary-lab']
  if lab and kind=='cabinet':
   b.cyl('sealed industrial vessel',(0,.95,0),fw*.43,1.6,'metal',verts=20);b.ball('rounded sealed vessel cap',(0,1.73,0),(fw*.86,.3,fd*.86),'metal');b.box('vessel support',(0,.12,0),(fw*.8,.24,fd*.8),'dark',.03)
  elif kind=='rack':
   for x in [-fw*.45,fw*.45]:
    for z in range(-int(fd/2),int(fd/2)+1,2):b.box('rack upright',(x,1.25,z),(.07,2.5,.07),'accent',.01)
   for y in [.2,1.2,2.3]:
    b.box('rack shelf',(0,y,0),(fw,.08,fd),'metal',.01)
    for z in range(-int(fd/2)+1,int(fd/2),2):b.box('sealed carton',(0,y+.35,z),(fw*.8,.6,1.3),'woodLight',.03)
  elif lab and kind=='counter':
   b.box('stainless worktop',(0,1.05,0),(fw,.12,fd),'metal',.025)
   for x in [-fw*.42,fw*.42]:
    for z in [-fd*.38,fd*.38]:b.box('worktable leg',(x,.5,z),(.08,1,.08),'metal',.01)
   for j in range(3):b.cyl('unmarked prop bottle',((j-1)*.36,1.3,0),.08,.35,'blue' if j%2 else 'ivory',verts=10)
  else:
   prop(b,kind,fw,fd,i%4)
   if typ=='north-security' and kind=='counter':
    for z in [-1.4,0,1.4]:b.box('security monitor',(0,1.45,z),(.1,.5,.8),'dark',.02);b.box('monitor glow',(.06,1.45,z),(.025,.4,.65),'blue',.01)
  delta=Vector(xyz((f['x'],0,f['z'])))
  for o in b.parts[start:]:o.location+=delta
 b.fixture=-1
 # Generic extraction hoods are wall-mounted dressing; nothing teaches a real process.
 if 'lab' in typ:
  for x in [-w*.3,w*.3]:
   b.box('extraction hood',(x,3,-d/2+.8),(2.4,.45,1.3),'metal',.05);b.cyl('vertical ventilation duct',(x,h*.74,-d/2+.5),.18,h*.5,'metal',verts=12)
 b.role='door';door=b.box('entry door',(.0,1.4,front*d/2),(1.6,2.8,.1),'trim',.02);b.box('door handle',(.5,1.3,front*(d/2+.08)),(.08,.28,.06),'metal',.01)
 parts=b.join(root);hinge=b.group(typ+'-door-hinge');hinge.location=xyz((-.8,0,front*d/2));hinge.parent=root;bpy.context.view_layer.update()
 for o in parts:
  if o['part']=='door':matrix=o.matrix_world.copy();o.parent=hinge;o.matrix_world=matrix
 root['source']='original-blender-north-lab';export(root,parts+[hinge],str(OUT/(typ+'.glb')));REPORT.append({'kind':typ,'triangles':triangles(parts),'drawCalls':len(parts),'bytes':(OUT/(typ+'.glb')).stat().st_size})
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/(typ+'.blend')))
# Yard is centered at the district origin; runtime can shift it to protect saved bases.
b=setup(0x7d8983);root=b.group('north-lab-yard');b.box('paved courtyard',(0,-.025,0),(120,.04,100),'floor',0)
for x in range(-56,57,8):b.box('paving seam',(x,.002,0),(.02,.003,100),'metal',0)
for z in range(-48,49,8):b.box('paving seam',(0,.002,z),(120,.003,.02),'metal',0)
for f in YARD['barriers']:
 x=f['x']-YARD['center']['x'];z=f['z']-YARD['center']['z'];w=f['width'];d=f['depth'];h=f['height']
 if w<1 and d<1:b.box('brick gate pier',(x,h/2,z),(w,h,d),'wall',.03);continue
 n=max(1,math.ceil(max(w,d)/4))
 for i in range(n+1):
  px=x-w/2+w*i/n if w>d else x;pz=z-d/2+d*i/n if d>w else z;b.box('fence post',(px,h/2,pz),(.07,h,.07),'metal',.01)
 for y in [.2,h-.1]:b.box('fence rail',(x,y,z),(w if w>d else .05,.05,d if d>w else .05),'metal',0)
 for i in range(n):
  a=-max(w,d)/2+i*max(w,d)/n;c=-max(w,d)/2+(i+1)*max(w,d)/n
  for side in [False,True]:
   aa=(x+a,.25,z) if w>d else (x,.25,z+a);bb=(x+c,h-.15,z) if w>d else (x,h-.15,z+c)
   if side:aa=(aa[0],h-.15,aa[2]);bb=(bb[0],.25,bb[2])
   b.rod('open mesh fence',aa,bb,.012,'metal')
for i,p in enumerate(YARD['props']):
 start=len(b.parts);kind=p['kind'];w=p['width'];d=p['depth'];h=p['height'];b.fixture=i
 if kind=='container':
  b.box('shipping container body',(0,h/2,0),(w,h,d),'blue' if p['color']==0x368d92 else 'red',.06)
  for z in range(-int(d/2)+1,int(d/2)): 
   for x in [-w/2,w/2]:b.box('container corrugation',(x,h/2,z),(.06,h-.12,.08),'metal',.01)
 elif kind=='van':
  b.box('delivery van body',(0,1.25,.4),(w,1.8,d-.8),'dark',.18);b.box('van cab',(0,1,-d*.38),(w,.95,1.2),'dark',.12);b.box('van windshield',(0,1.7,-d*.42),(w*.8,.55,.06),'blue',.04)
  for x in [-w*.48,w*.48]:
   for z in [-d*.3,d*.3]:b.cyl('van wheel',(x,.4,z),.4,.25,'dark','x')
 elif kind=='forklift':
  b.box('forklift body',(0,.6,0),(w,1.1,d*.6),'accent',.1)
  for x in [-w*.4,w*.4]:b.box('forklift mast',(x,1.2,-d*.4),(.12,2.1,.12),'dark',.02);b.box('forklift fork',(x,.18,-d*.7),(.12,.1,d*.65),'metal',.01)
 elif kind=='barrel':
  b.cyl('sealed steel barrel',(0,h/2,0),w/2,h,'blue' if p['color']==0x386d9b else 'red',verts=16)
  for y in [.12,h-.12]:b.cyl('barrel rim',(0,y,0),w/2+.02,.04,'metal',verts=16)
 elif kind=='lamp':
  b.box('yard lamp post',(0,h/2,0),(.12,h,.12),'dark',.01);b.box('yard lamp arm',(.5,h-.1,0),(1.1,.1,.1),'dark',.01);b.box('yard light',(.9,h-.15,0),(.6,.12,.35),'light',.02)
 elif kind=='pallet':prop(b,'pallet',w,d);b.box('stacked parcel',(0,.9,0),(w*.85,.8,d*.85),'woodLight',.035)
 elif kind=='parcel':b.box('sealed parcel',(0,h/2,0),(w,h,d),'woodLight',.045);b.box('packing tape',(0,h+.003,0),(.07,.008,d),'ivory',0)
 else:
  color='accent' if kind=='generator' else 'trim' if kind in ['dumpster','bin'] else 'metal';b.box(kind,(0,h/2,0),(w,h,d),color,.05)
  if kind in ['dumpster','bin']:b.box('hinged lid',(0,h,0),(w+.04,.08,d+.04),'dark',.03)
  if kind in ['ac','generator']:b.box('front louver',(0,h*.6,d/2+.02),(w*.7,h*.5,.03),'dark',.01)
 for o in b.parts[start:]:o.location+=Vector(xyz((p['x'],0,p['z'])))
for x,z in [(-33,14),(-1,-20),(41,11)]:
 for dx in [-3,3]:b.box('loading clearance marking',(x+dx,.007,z),( .08,.01,4),'accent',0)
 b.box('loading clearance marking',(x,.007,z+2),(6,.01,.08),'accent',0)
seal(b,root,STATIC/'yard.glb',{'kind':'yard'});bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'yard.blend'))
(STATIC/'manifest.json').write_text(json.dumps(REPORT,indent=2)+'\n');print(json.dumps(REPORT))
