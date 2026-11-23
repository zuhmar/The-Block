"""Build an original glossy modular jail matching the shared collision layout."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path('art/buildings/jail');ROOT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
layout=json.loads(Path('art/buildings/blender/layout.json').read_text());data=next(b for b in layout['buildings'] if b['type']=='jail')
materials={}
for name,color in {'concrete':(.39,.46,.51,1),'trim':(.07,.12,.16,1),'steel':(.16,.21,.25,1),'floor':(.43,.47,.45,1),'cloth':(.12,.26,.29,1),'wood':(.3,.17,.08,1),'light':(.9,.83,.6,1),'white':(.85,.89,.9,1)}.items():
 m=bpy.data.materials.new(name);m.diffuse_color=color;m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=color;p.inputs['Roughness'].default_value=.35;p.inputs['Metallic'].default_value=.3 if name in ['steel','trim'] else .03;p.inputs['Coat Weight'].default_value=.16;materials[name]=m
parts=[]
def box(name,x,y,z,w,h,d,mat='concrete',role='shell',bevel=.035):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.name=name;o.dimensions=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  b=o.modifiers.new('Soft cartoon edges','BEVEL');b.width=min(bevel,min(w,h,d)*.3);b.segments=2;bpy.ops.object.modifier_apply(modifier=b.name)
 o.data.materials.append(materials[mat]);o['part']=role;parts.append(o)
 return o
# Hollow shell, same openings and wall thickness as building-layout.ts.
for x in [-8,8]:box('side wall',x,2.75,0,.22,5.5,14)
box('back wall',0,2.75,-7,16,5.5,.22)
for x in [-4.45,4.45]:box('entrance wing',x,2.75,7,7.1,5.5,.22)
box('entry lintel',0,4.175,7,1.8,2.65,.22)
box('floor',0,.007,0,15.8,.025,13.8,'floor',bevel=0)
box('roof',0,5.55,0,16.5,.18,14.5,'trim','roof')
for x in [-8.1,8.1]:box('corner trim',x,2.8,7,.32,5.6,.45,'trim')
for z in [-7.15,7.15]:box('roof cornice',0,5.3,z,16.6,.35,.35,'trim')
box('entry canopy',0,3.05,7.65,3.6,.22,1.5,'trim')
box('sign board',0,4.2,7.2,6.5,.9,.16,'trim')
c=bpy.data.curves.new('CENTRAL JAIL','FONT');c.body='CENTRAL JAIL';c.align_x='CENTER';c.align_y='CENTER';c.size=.52;c.extrude=.006;o=bpy.data.objects.new('jail lettering',c);bpy.context.collection.objects.link(o);o.location=(0,-7.3,4.2);o.rotation_euler=(math.pi/2,0,0);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.data.materials.append(materials['white']);o['part']='shell';parts.append(o)
# Applied bars on the upper facade and sides read as secure windows.
for x in [-5.5,-3.2,3.2,5.5]:
 box('window recess',x,2.1,7.14,1.35,1.25,.08,'trim')
 for dx in [-.45,-.15,.15,.45]:box('security bars',x+dx,2.1,7.23,.055,1.3,.055,'steel')
for x in [-8.13,8.13]:
 for z in [-4,0,4]:
  box('side recess',x,2.6,z,.06,1.3,1.3,'trim')
  for dz in [-.45,-.15,.15,.45]:box('side bars',x,2.6,z+dz,.07,1.35,.055,'steel')
for f in data['partitions']:
 x,z,w,d,h=[f[k] for k in ['x','z','width','depth','height']]
 if d>1:box('cell divider',x,h/2,z,w,h,d,'concrete','interior')
 else:
  for xx in [x-w/2+i*.22 for i in range(int(w/.22)+1)]:box('cell bars',xx,h/2,z,.055,h,.07,'steel','interior',0)
  for yy in [.1,h]:box('bar rail',x,yy,z,w,.09,.12,'steel','interior')
# Open passages into each cell. No fake locked doors across walkable gaps.
for f in data['fixtures']:
 x,z,w,d=[f[k] for k in ['x','z','width','depth']];kind=f['kind']
 if kind=='bed':
  box('bed frame',x,.35,z,w,.16,d,'steel','interior');box('mattress',x,.52,z,w*.94,.2,d*.94,'cloth','interior');box('pillow',x,.65,z-d*.3,w*.75,.14,.4,'white','interior')
  for dx in [-w*.4,w*.4]:
   for dz in [-d*.4,d*.4]:box('bed leg',x+dx,.16,z+dz,.08,.32,.08,'steel','interior')
 elif kind=='bench':
  box('waiting bench',x,.52,z,w,.15,d,'wood','interior')
  for dx in [-w*.4,w*.4]:box('bench leg',x+dx,.25,z,.12,.5,d*.8,'steel','interior')
 elif kind=='counter':box('reception desk',x,.58,z,w,1.16,d,'wood','interior')
 else:box('records cabinet',x,.9,z,w,1.8,d,'steel','interior')
for z in [3,-2,-5]:box('ceiling light',0,5.25,z,1.5,.08,.45,'light','interior')
# Bake static parts by material/role; keep the entrance leaf on its own hinge.
root=bpy.data.objects.new('central-jail',None);bpy.context.collection.objects.link(root);merged=[]
for role in ['shell','interior','roof']:
 for material in materials.values():
  group=[o for o in parts if o.get('part')==role and o.data.materials[0]==material]
  if not group:continue
  parts=[o for o in parts if o not in group]
  bpy.ops.object.select_all(action='DESELECT')
  for o in group:o.select_set(True)
  bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();o=bpy.context.object;o.name=role+'-'+material.name;o['part']=role;o.parent=root;merged.append(o)
leaf=box('entrance door',0,1.4,7,1.6,2.8,.12,'steel','door');hinge=bpy.data.objects.new('jail-door-hinge',None);bpy.context.collection.objects.link(hinge);hinge.location=(-.8,-7,0);hinge.parent=root;bpy.context.view_layer.update();world=leaf.matrix_world.copy();leaf.parent=hinge;leaf.matrix_world=world
bpy.ops.object.select_all(action='SELECT')
path='apps/client/src/fps/models/buildings/jail.glb';bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',export_extras=True)
bpy.ops.wm.save_as_mainfile(filepath=str((ROOT/'jail.blend').resolve()),compress=True)
report={'triangles':sum(len(p.vertices)-2 for o in merged+[leaf] for p in o.data.polygons),'bytes':Path(path).stat().st_size,'cells':3,'openingWidth':1.8,'dimensions':[16,14,5.5]};(ROOT/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
