"""Original two/three-story glossy buildings from shared floor, room and stair data."""
import bpy,json,math
from pathlib import Path
ROOT=Path('art/buildings/apartments');ROOT.mkdir(parents=True,exist_ok=True)
D=json.loads(Path('art/buildings/blender/layout.json').read_text());reports=[]
for data in [b for b in D['buildings'] if b['type'] in ['flats','tenement']]:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
 mats={};parts=[];name=data['type'];w=data['width'];d=data['depth'];h=data['height'];front=data['front'];stories=data['stories']
 colors={'wall':(.62,.42,.24,1) if name=='flats' else (.4,.23,.2,1),'trim':(.1,.17,.18,1),'steel':(.15,.2,.23,1),'floor':(.5,.46,.36,1),'cloth':(.12,.26,.31,1),'wood':(.32,.17,.07,1),'white':(.86,.85,.75,1),'glass':(.25,.54,.62,1),'light':(.95,.87,.6,1)}
 for k,c in colors.items():
  m=bpy.data.materials.new(k);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=c;p.inputs['Roughness'].default_value=.32;p.inputs['Metallic'].default_value=.25 if k in ['steel','glass'] else .03;p.inputs['Coat Weight'].default_value=.18;mats[k]=m
 def box(label,x,y,z,width,height,depth,mat='wall',role='shell',bevel=.025):
  bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.name=label;o.dimensions=(width,depth,height);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  if bevel:
   mod=o.modifiers.new('Rounded cartoon edges','BEVEL');mod.width=min(bevel,min(width,height,depth)*.3);mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
  o.data.materials.append(mats[mat]);o['part']=role;parts.append(o);return o
 for x in [-w/2,w/2]:box('side wall',x,h/2,0,.22,h,d)
 box('back wall',0,h/2,-front*d/2,w,h,.22)
 for x in [-(w+1.8)/4,(w+1.8)/4]:box('front wing',x,h/2,front*d/2,(w-1.8)/2,h,.22)
 box('entrance lintel',0,(h+2.8)/2,front*d/2,1.8,h-2.8,.22)
 box('ground floor',0,.007,0,w-.24,.025,d-.24,'floor',bevel=0)
 box('roof',0,h,0,w+.45,.18,d+.45,'trim','roof')
 for level in range(stories):
  base=level*3.2
  for z in [-d/2-.13,d/2+.13]:
   box('story cornice',0,base+3.08,z,w+.5,.18,.3,'trim')
   for x in [-w/2+1.45,w/2-1.45]:
    box('window surround',x,base+1.85,z,1.65,1.5,.1,'trim')
    box('glossy window',x,base+1.85,z+( .065 if z>0 else -.065),1.4,1.28,.035,'glass')
    box('window mullion',x,base+1.85,z+( .09 if z>0 else -.09),.055,1.3,.04,'white')
  box('ceiling light',0,base+2.95,0,1.1,.07,.4,'light','interior')
 for slab in data['slabs']:box('upper floor',slab['x'],slab['y']-.09,slab['z'],slab['width'],.18,slab['depth'],'floor','interior',0)
 for p in data['partitions']:box('room wall',p['x'],p.get('y',0)+p['height']/2,p['z'],p['width'],p['height'],p['depth'],'white','interior')
 for stair in data['stairs']:
  for step in range(16):
   rise=(step+1)*3.2/16;z=stair['startZ']-front*(step+.5)*stair['run']/16
   box('stair tread',stair['x'],stair['y']+rise-.1,z,stair['width'],.2,stair['run']/16,'floor','interior',.01)
  # Guard the open long edge, leaving both landings and the walking run clear.
  for edge in [-1,1]:
   x=stair['x']+edge*(stair['width']/2+.07)
   for step in range(17):
    rise=step*3.2/16;z=stair['startZ']-front*step*stair['run']/16
    box('stair rail post',x,stair['y']+rise+.42,z,.045,.84,.045,'steel','interior',0)
   # A sloped rail is a rotated box following the exact stair slope.
   rail=box('stair handrail',x,stair['y']+1.6+.84,stair['startZ']-front*stair['run']/2,.06,.06,math.hypot(stair['run'],3.2),'steel','interior',0)
   rail.rotation_euler.x=front*math.atan2(3.2,stair['run'])
 for f in data['fixtures']:
  x=f['x'];z=f['z'];y=f.get('y',0);fw=f['width'];fd=f['depth'];kind=f['kind']
  if kind=='bed':
   box('bed frame',x,y+.3,z,fw,.2,fd,'steel','interior');box('mattress',x,y+.5,z,fw*.95,.2,fd*.95,'cloth','interior');box('pillow',x,y+.65,z-.7,fw*.75,.13,.4,'white','interior')
  elif kind=='cabinet':box('cabinet',x,y+.85,z,fw,1.7,fd,'wood','interior')
  else:
   top=.52 if kind=='bench' else .86;box(kind,x,y+top,z,fw,.13,fd,'wood','interior')
   for dx in [-fw*.4,fw*.4]:box('legs',x+dx,y+top/2,z,.08,top,fd*.8,'steel','interior')
 root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root);merged=[]
 for role in ['shell','interior','roof']:
  for material in mats.values():
   group=[o for o in parts if o.get('part')==role and o.data.materials[0]==material]
   if not group:continue
   parts=[o for o in parts if o not in group];bpy.ops.object.select_all(action='DESELECT')
   for o in group:o.select_set(True)
   bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();o=bpy.context.object;o.name=role+'-'+material.name;o['part']=role;o.parent=root;merged.append(o)
 leaf=box('door leaf',0,1.4,front*d/2,1.6,2.8,.12,'trim','door');hinge=bpy.data.objects.new(name+'-door-hinge',None);bpy.context.collection.objects.link(hinge);hinge.parent=root;hinge.location=(-.8,-front*d/2,0);bpy.context.view_layer.update();world=leaf.matrix_world.copy();leaf.parent=hinge;leaf.matrix_world=world
 # A small sign below the second floor identifies each block at street level.
 bpy.ops.object.select_all(action='DESELECT');curve=bpy.data.curves.new('sign','FONT');curve.body=data['name'];curve.align_x='CENTER';curve.align_y='CENTER';curve.size=.28;curve.extrude=.004;o=bpy.data.objects.new('building sign',curve);bpy.context.collection.objects.link(o);o.location=(0,-front*(d/2+.16),2.93);o.rotation_euler=(math.pi/2,0,0 if front>0 else math.pi);o.data.materials.append(mats['white']);o.parent=root
 bpy.ops.object.select_all(action='SELECT');out=Path('apps/client/src/fps/models/buildings')/(name+'.glb');bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_extras=True)
 bpy.ops.wm.save_as_mainfile(filepath=str((ROOT/(name+'.blend')).resolve()),compress=True)
 reports.append({'type':name,'stories':stories,'rooms':stories*2,'triangles':sum(len(p.vertices)-2 for o in merged+[leaf] for p in o.data.polygons),'bytes':out.stat().st_size})
(ROOT/'report.json').write_text(json.dumps(reports,indent=2)+'\n');print(reports)
