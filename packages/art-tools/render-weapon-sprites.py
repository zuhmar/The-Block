"""Render original game-prop icons. Reuse the shipped four guns without changing them.
The four additions are decorative external silhouettes only, not functional designs.
Run from repository root: blender -b -t 4 --python packages/art-tools/render-weapon-sprites.py
"""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
ROOT=Path('art/weapons/sprites');OUT=Path('apps/client/public/assets/weapon-icons')
ROOT.mkdir(parents=True,exist_ok=True);(ROOT/'models').mkdir(exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
bpy.context.preferences.filepaths.save_version=0
KINDS=['pistol','smg','assault-rifle','sniper','light-machine-gun','rocket-launcher','grenade','c4']
reports=[]
for kind in KINDS:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 existing={'pistol':'pistol','smg':'smg','assault-rifle':'rifle','sniper':'sniper'}.get(kind)
 if existing:
  source=Path('apps/client/src/fps/models/weapons')/(existing+'.glb');bpy.ops.import_scene.gltf(filepath=str(source))
 else:
  mats={}
  for n,c,metal in [('body',(.025,.035,.05),.25),('steel',(.13,.17,.22),.5),('dark',(.008,.012,.018),.05),('olive',(.24,.32,.10),.1),('red',(.55,.075,.035),.03),('tape',(.16,.18,.16),.03),('label',(.7,.67,.47),.05)]:
   m=bpy.data.materials.new(n);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.29;p.inputs['Coat Weight'].default_value=.3;mats[n]=m
  def finish(o,n,m):
   o.name=n;o.data.materials.append(mats[m]);
   for p in o.data.polygons:p.use_smooth=True
   return o
  def box(n,p,s,m='body',r=.015):
   bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.dimensions=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
   b=o.modifiers.new('rounded cartoon edges','BEVEL');b.width=min(r,min(s)*.25);b.segments=3;bpy.ops.object.modifier_apply(modifier=b.name)
   w=o.modifiers.new('weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=w.name);return finish(o,n,m)
  def rod(n,a,b,r,m='steel'):
   a=Vector(a);b=Vector(b);v=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=v.length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=v.to_track_quat('Z','Y').to_euler();return finish(o,n,m)
  def ring(n,p,major,minor,m='steel',rotation=(0,0,0)):
   bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=8,location=p,major_radius=major,minor_radius=minor,rotation=rotation);return finish(bpy.context.object,n,m)
  if kind=='light-machine-gun':
   box('heavy receiver',(0,.02,0),(.13,.43,.14),'steel');box('stock',(0,-.36,-.02),(.11,.3,.15),'olive');box('butt pad',(0,-.52,-.02),(.13,.035,.19))
   grip=box('grip',(0,-.12,-.15),(.07,.09,.2));grip.rotation_euler.x=-.2
   box('ribbed handguard',(0,.35,0),(.15,.28,.13),'olive')
   for y in [.25,.30,.35,.40,.45]:box('handguard ribs',(0,y,.073),(.16,.012,.018),'dark')
   rod('barrel',(0,.48,.02),(0,.92,.02),.025);rod('muzzle cap',(0,.89,.02),(0,.95,.02),.037);rod('muzzle inset',(0,.951,.02),(0,.954,.02),.023,'dark')
   box('ammo box',(.11,.04,-.18),(.25,.24,.24),'olive');box('ammo lid',(.11,.04,-.05),(.27,.26,.035),'steel')
   rod('carry handle post',(0,-.06,.07),(0,-.06,.18),.015);rod('carry handle',(0,-.06,.18),(0,.13,.18),.018,'dark');rod('carry handle post',(0,.13,.18),(0,.13,.07),.015)
   for x in [-.055,.055]:rod('folded bipod',(x,.76,-.015),(x,.39,-.09),.012,'dark')
   for y in [-.14,.65]:box('simple sights',(0,y,.1),(.035,.025,.07))
  elif kind=='rocket-launcher':
   rod('shoulder tube',(0,-.65,.02),(0,.65,.02),.12,'olive')
   for y in [-.59,.52]:rod('tube collar',(0,y-.045,.02),(0,y+.045,.02),.14,'steel')
   rod('front dark opening',(0,.651,.02),(0,.655,.02),.105,'dark');ring('front rim',(0,.657,.02),.113,.012,'steel',(math.pi/2,0,0))
   box('shoulder pad',(0,-.35,-.12),(.18,.32,.11),'dark');box('front grip',(0,.29,-.19),(.085,.08,.2),'dark');box('rear grip',(0,-.06,-.19),(.085,.1,.2),'dark')
   box('sight pedestal',(0,.08,.17),(.07,.13,.08));ring('cartoon sight',(0,.08,.24),.045,.012,'dark',(math.pi/2,0,0))
  elif kind=='grenade':
   bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=(0,0,0));o=bpy.context.object;o.scale=(.12,.13,.17);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);finish(o,'rounded grenade body','olive')
   for z,r in [(-.1,.1),(-.04,.122),(.035,.124),(.1,.101)]:ring('cartoon body ribs',(0,0,z),r,.008,'dark')
   box('top cap',(0,0,.175),(.1,.1,.065),'steel');lever=box('simple lever',(.04,.015,.12),(.035,.17,.2),'steel');lever.rotation_euler.x=.22
   ring('pull ring',(.01,-.105,.23),.047,.008,'steel',(0,math.pi/2,0))
  else:
   box('stylized wrapped package',(0,0,0),(.12,.31,.22),'red',.03)
   for y in [-.105,.105]:box('wrapping strap',(.003,y,0),(.126,.038,.228),'tape')
   box('abstract faceplate',(.07,0,.015),(.025,.13,.12),'dark');box('blank indicator',(.085,0,.032),(.006,.085,.05),'label',.004)
   for y in [-.037,0,.037]:box('decorative panel dots',(.085,y,-.03),(.007,.012,.012),'steel',.003)
  meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
  # Batch each material, keeping imports inexpensive if these props are used later.
  for m in mats.values():
   group=[o for o in list(bpy.context.scene.objects) if o.type=='MESH' and o.data.materials[0]==m]
   if not group:continue
   bpy.ops.object.select_all(action='DESELECT')
   for o in group:o.select_set(True)
   bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join()
  source=ROOT/'models'/(kind+'.glb');bpy.ops.object.select_all(action='SELECT');bpy.ops.export_scene.gltf(filepath=str(source),export_format='GLB')
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];bpy.context.view_layer.update()
 points=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box];lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)));target=(lo+hi)/2
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=80;scene.cycles.use_denoising=False;scene.render.resolution_x=512;scene.render.resolution_y=256;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='AgX'
 scene.world=bpy.data.worlds.new('soft studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.38,.43,.5,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
 bpy.ops.object.camera_add(location=target+Vector((3,-.65,.8)));cam=bpy.context.object;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';scene.camera=cam
 # Frame in camera space, including depth, not just axis-aligned model lengths.
 inv=cam.rotation_euler.to_matrix().transposed();projected=[inv@(p-target) for p in points];width=max(p.x for p in projected)-min(p.x for p in projected);height=max(p.y for p in projected)-min(p.y for p in projected);cam.data.ortho_scale=max(width,height*2)*1.22
 for delta,power,size in [((2,-1,3),230,3),((-1,2,2),170,2),((1,2,.5),70,2)]:
  bpy.ops.object.light_add(type='AREA',location=target+Vector(delta));o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(OUT/(kind+'.png'));bpy.ops.render.render(write_still=True)
 if not existing:bpy.ops.wm.save_as_mainfile(filepath=str((ROOT/'models'/(kind+'.blend')).resolve()),compress=True)
 reports.append({'id':kind,'image':kind+'.png','width':512,'height':256,'sourceModel':str(source),'source':'existing Blender model' if existing else 'new decorative Blender prop','triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)})
(ROOT/'report.json').write_text(json.dumps(reports,indent=2)+'\n')
print('Rendered all eight transparent icons')
