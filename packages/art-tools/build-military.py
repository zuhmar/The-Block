"""Original glossy military prefabs and canvas tents, fitted to shared gameplay rooms."""
import bpy,json,math
from pathlib import Path
ROOT=Path('art/buildings/military');ROOT.mkdir(parents=True,exist_ok=True)
D=json.loads(Path('art/buildings/blender/layout.json').read_text());reports=[]
for data in [b for b in D['buildings'] if b['type'].startswith('military-')]:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
 typ=data['type'];w=data['width'];d=data['depth'];h=data['height'];front=data['front'];tent=typ in ['military-tent','military-medical'];wallh=2.7 if tent else 4.6 if typ=='military-hangar' else h
 parts=[];mats={}
 colors={'wall':(.34,.4,.23,1) if typ!='military-medical' else (.65,.58,.4,1),'trim':(.10,.17,.14,1),'steel':(.21,.27,.25,1),'floor':(.42,.43,.35,1),'cloth':(.25,.32,.21,1),'wood':(.35,.23,.12,1),'white':(.84,.85,.72,1),'glass':(.2,.46,.51,1),'light':(.93,.86,.6,1),'screen':(.12,.37,.31,1)}
 for k,c in colors.items():
  mat=bpy.data.materials.new(k);mat.use_nodes=True;p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=c;p.inputs['Roughness'].default_value=.43 if k=='cloth' else .34;p.inputs['Coat Weight'].default_value=.12;p.inputs['Metallic'].default_value=.25 if k=='steel' else .02;mats[k]=mat
 def finish(o,label,mat,role):o.name=label;o.data.materials.append(mats[mat]);o['part']=role;parts.append(o);return o
 def box(label,x,y,z,ww,hh,dd,mat='wall',role='shell',bevel=.03):
  bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.dimensions=(ww,dd,hh);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  if bevel:
   mod=o.modifiers.new('Glossy rounded edges','BEVEL');mod.width=min(bevel,min(ww,hh,dd)*.3);mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
  return finish(o,label,mat,role)
 def mesh(label,vertices,faces,mat='wall',role='roof'):
  geometry=bpy.data.meshes.new(label);geometry.from_pydata([(x,-z,y) for x,y,z in vertices],[],faces);geometry.update();o=bpy.data.objects.new(label,geometry);bpy.context.collection.objects.link(o);return finish(o,label,mat,role)
 def rod(label,a,b,mat='steel',radius=.025,role='shell'):
  from mathutils import Vector
  a=Vector((a[0],-a[2],a[1]));b=Vector((b[0],-b[2],b[1]));bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=radius,depth=(b-a).length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return finish(o,label,mat,role)
 for x in [-w/2,w/2]:box('side shell',x,wallh/2,0,.22,wallh,d,'wall')
 box('back shell',0,wallh/2,-front*d/2,w,wallh,.22)
 for x in [-(w+1.8)/4,(w+1.8)/4]:box('entrance wing',x,wallh/2,front*d/2,(w-1.8)/2,wallh,.22)
 if not tent:box('door header',0,(2.8+wallh)/2,front*d/2,1.8,wallh-2.8,.22)
 box('walkable floor',0,.007,0,w-.24,.025,d-.24,'floor',bevel=0)
 if tent:
  # A canvas ridge roof and triangular gables have a genuinely hollow interior.
  for side in [-1,1]:
   mesh('canvas roof',[(0,h,-d/2-.2),(0,h,d/2+.2),(side*(w/2+.2),2.7,d/2+.2),(side*(w/2+.2),2.7,-d/2-.2)],[(0,1,2,3)],'cloth')
  for z in [-d/2,d/2]:mesh('canvas gable',[(-w/2,2.7,z),(w/2,2.7,z),(0,h,z)],[(0,1,2)],'wall','shell')
  for side in [-1,1]:
   for z in [-d/2+.8,d/2-.8]:rod('guy rope',(side*w/2,2.65,z),(side*(w/2+.6),.04,z),'white',.018)
  for z in [-d/2,d/2]:rod('ridge post',(0,2.75,z),(0,h+.08,z),'steel',.05)
 elif typ=='military-hangar':
  samples=20
  for i in range(samples):
   a=-w/2+w*i/samples;b=-w/2+w*(i+1)/samples;ya=wallh+1.4*math.sin(i/samples*math.pi);yb=wallh+1.4*math.sin((i+1)/samples*math.pi)
   mesh('curved steel roof',[(a,ya,-d/2-.15),(a,ya,d/2+.15),(b,yb,d/2+.15),(b,yb,-d/2-.15)],[(0,1,2,3)],'steel' if i%2 else 'wall')
   for z in [-d/2,d/2]:mesh('arched gable',[(a,wallh,z),(b,wallh,z),(b,yb,z),(a,ya,z)],[(0,1,2,3)],'wall','shell')
  box('closed loading shutter',4.7,1.8,front*(d/2+.13),5.2,3.6,.1,'trim')
  for i in range(13):box('shutter rib',4.7,.2+i*.26,front*(d/2+.2),5.05,.07,.08,'steel',bevel=0)
 else:
  box('flat prefab roof',0,h+.06,0,w+.4,.18,d+.4,'trim','roof')
  for x in [-w/2+.8,w/2-.8]:box('roof vent',x,h+.3,0,1.2,.4,1,'steel','roof')
  if typ=='military-command':
   rod('radio mast',(w/2-1,h,0),(w/2-1,h+2.5,0),'steel',.06,'roof');rod('antenna cross',(w/2-1.8,h+2,0),(w/2-.2,h+2,0),'steel',.04,'roof')
 for x in [-w/2+.95,w/2-.95]:
  box('window frame',x,1.9,front*(d/2+.14),1.35,1.1,.12,'trim')
  box('window',x,1.9,front*(d/2+.22),1.15,.9,.04,'glass')
  box('window center',x,1.9,front*(d/2+.25),.05,.95,.05,'white')
 for p in data['partitions']:box('room partition',p['x'],p.get('y',0)+p['height']/2,p['z'],p['width'],p['height'],p['depth'],'white','interior')
 for f in data['fixtures']:
  x=f['x'];z=f['z'];fw=f['width'];fd=f['depth'];kind=f['kind']
  if kind=='bed':
   box('cot frame',x,.32,z,fw,.14,fd,'steel','interior');box('cot mattress',x,.48,z,fw*.94,.18,fd*.94,'cloth','interior');box('pillow',x,.6,z-.7,fw*.75,.13,.4,'white','interior')
   for dx in [-fw*.4,fw*.4]:
    for dz in [-fd*.4,fd*.4]:box('cot legs',x+dx,.15,z+dz,.07,.3,.07,'steel','interior')
  elif kind=='rack':
   for dx in [-fw*.42,fw*.42]:
    for dz in [-fd*.45,fd*.45]:box('rack upright',x+dx,1.3,z+dz,.08,2.6,.08,'steel','interior')
   for yy in [.15,1.2,2.4]:box('rack shelf',x,yy,z,fw,.08,fd,'steel','interior')
  elif kind=='pallet':
   for k in range(5):box('pallet boards',x-fw/2+(k+.5)*fw/5,.18,z,fw/5-.025,.12,fd,'wood','interior')
   box('sealed cargo',x,.65,z,fw*.85,.8,fd*.85,'wall','interior')
  elif kind=='cabinet':
   box('equipment cabinet',x,.9,z,fw,1.8,fd,'steel','interior');box('cabinet grip',x,.9,z+fd/2+.035,.04,.3,.04,'white','interior')
  else:
   top=.52 if kind=='bench' else 1.05 if kind=='counter' else .85
   box('work surface',x,top,z,fw,.12,fd,'wood','interior')
   for dx in [-fw*.4,fw*.4]:box('work legs',x+dx,top/2,z,.1,top,fd*.8,'steel','interior')
   if typ=='military-command' and kind in ['counter','table']:
    box('radio console',x,top+.22,z,fw*.3,.35,fd*.6,'trim','interior');box('radio display',x,top+.25,z+fd*.32,fw*.22,.18,.035,'screen','interior')
   if typ=='military-medical' and kind=='counter':box('medical supply box',x,top+.2,z,.65,.35,.4,'white','interior')
 box('overhead lamp',0,wallh-.2,0,1.2,.06,.4,'light','interior')
 root=bpy.data.objects.new(typ,None);bpy.context.collection.objects.link(root);merged=[]
 for role in ['shell','roof','interior']:
  for material in mats.values():
   group=[o for o in parts if o.get('part')==role and o.data.materials[0]==material]
   if not group:continue
   parts=[o for o in parts if o not in group];bpy.ops.object.select_all(action='DESELECT')
   for o in group:o.select_set(True)
   bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();o=bpy.context.object;o.name=role+'-'+material.name;o['part']=role;o.parent=root;merged.append(o)
 doorh=2.7 if tent else 2.8
 leaf=box('entrance flap' if tent else 'entry door',0,doorh/2,front*d/2,1.6,doorh,.1,'cloth' if tent else 'trim','door')
 hinge=bpy.data.objects.new(typ+'-door-hinge',None);bpy.context.collection.objects.link(hinge);hinge.location=(-.8,-front*d/2,0);hinge.parent=root;bpy.context.view_layer.update();matrix=leaf.matrix_world.copy();leaf.parent=hinge;leaf.matrix_world=matrix
 if typ=='military-medical':
  for ww,hh in [(.75,.18),(.18,.75)]:
   emblem=box('first aid emblem',2,2,front*(d/2+.3),ww,hh,.05,'white');emblem.parent=root;merged.append(emblem)
 bpy.ops.object.select_all(action='SELECT');out=Path('apps/client/src/fps/models/buildings')/(typ+'.glb');bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_extras=True,export_materials='EXPORT')
 bpy.ops.wm.save_as_mainfile(filepath=str((ROOT/(typ+'.blend')).resolve()),compress=True)
 reports.append({'type':typ,'triangles':sum(len(p.vertices)-2 for o in merged+[leaf] for p in o.data.polygons),'bytes':out.stat().st_size})
(ROOT/'report.json').write_text(json.dumps(reports,indent=2)+'\n');print(reports)
