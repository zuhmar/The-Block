"""Fresh stylized Blender weapon props; visual design from the chat reference sheet.
No old geometry imported. Decorative game assets, no functional internals.
"""
import bpy, os, math, json, shutil
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
out='art/weapons/blender';client='apps/client/src/fps/models/weapons'
os.makedirs(out,exist_ok=True);os.makedirs(client,exist_ok=True)
def mat(n,c,metal=0):
 m=bpy.data.materials.new(n);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.29;p.inputs['Coat Weight'].default_value=.3;return m
mats={'body':mat('charcoal',(.018,.022,.032),.25),'steel':mat('slate',(.065,.07,.095),.55),'black':mat('dark recess',(.008,.01,.015)),'olive':mat('olive furniture',(.16,.21,.045)),'wine':mat('burgundy furniture',(.16,.018,.045)),'glass':mat('scope glass',(.12,.04,.22),.7)}
allmodels=[];report=[]
def build(kind):
 objects=[]
 def finish(o,n,m,moving=False):
  o.name=n;o.data.materials.append(mats[m]);o['weaponPart']='slide' if moving else 'magazine' if 'magazine' in n else 'frame';objects.append(o)
  for p in o.data.polygons:p.use_smooth=True
  return o
 def box(n,p,s,m='body',r=.008,moving=False):
  bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.dimensions=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);b=o.modifiers.new('soft rounded bevel','BEVEL');b.width=r;b.segments=4;bpy.ops.object.modifier_apply(modifier=b.name);w=o.modifiers.new('weighted corner normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=w.name);return finish(o,n,m,moving)
 def profile(n,points,width,m='body'):
  vs=[(x,y,z) for x in [-width/2,width/2] for y,z in points];l=len(points);fs=[tuple(range(l-1,-1,-1)),tuple(range(l,2*l))]+[(i,(i+1)%l,(i+1)%l+l,i+l) for i in range(l)];d=bpy.data.meshes.new(n);d.from_pydata(vs,[],fs);d.update();o=bpy.data.objects.new(n,d);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);b=o.modifiers.new('rounded silhouette','BEVEL');b.width=.008;b.segments=4;bpy.ops.object.modifier_apply(modifier=b.name);w=o.modifiers.new('weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=w.name);o.select_set(False);return finish(o,n,m)
 def tube(n,y,z,length,r,m='steel'):
  bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=length,location=(0,y,z),rotation=(math.pi/2,0,0));o=bpy.context.object;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);b=o.modifiers.new('edge bevel','BEVEL');b.width=.002;b.segments=3;bpy.ops.object.modifier_apply(modifier=b.name);return finish(o,n,m)
 def line(n,pts,r=.006,m='body'):
  c=bpy.data.curves.new(n,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=3;s=c.splines.new('POLY');s.points.add(len(pts)-1)
  for q,p in zip(s.points,pts):q.co=(*p,1)
  o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.select_set(False);return finish(o,n,m)
 pistol=kind=='pistol';sniper=kind=='sniper';smg=kind=='smg';accent='wine' if sniper else 'olive' if kind=='rifle' else 'body'
 end=.176 if pistol else .332 if smg else .612 if kind=='rifle' else .842
 if pistol:
  box('frame',(0,.06,-.026),(.047,.205,.045))
  box('slide',(0,.06,.014),(.055,.225,.058),'steel',.01,True)
  profile('grip',[(-.032,-.025),(.02,-.032),(-.015,-.14),(-.078,-.14)],.045)
  for x in [-.024,.024]:box('grip inset',(x,-.035,-.091),(.004,.045,.065),'steel',.006)
  for y in [-.01,.008,.026]:
   for x in [-.029,.029]:box('slide serration',(x,y,.017),(.002,.004,.036),'black',.001,True)
  box('magazine body',(0,-.034,-.09),(.029,.035,.085),'black',.004)
  box('magazine base',(0,-.043,-.14),(.049,.053,.015),'black',.005)
  tube('barrel',.151,.004,.045,.015);tube('muzzle recess',.175,.004,.002,.009,'black')
  for y in [-.035,.148]:box('iron sight',(0,y,.049),(.019,.016,.012),'black',.003,True)
 else:
  box('receiver',(0,.065,.0),(.075,.29,.09),'steel',.027)
  box('upper receiver',(0,.055,.046),(.067,.28,.04),'body',.014)
  profile('grip',[(-.065,-.035),(-.01,-.04),(-.04,-.16),(-.10,-.145)],.05,accent)
  front=.21 if smg else .29 if not sniper else .30
  box('handguard',(0,front,.012),(.08,.14 if smg else .22,.078),accent,.014)
  for x in [-.041,.041]:
   for y in [front-.045,front+.02]:box('handguard vent',(x,y,.016),(.003,.045,.012),'black',.005)
  tube('barrel',(front+end)/2,.008,end-front,.015)
  tube('muzzle brake',end-.014,.008,.04,.023);tube('muzzle recess',end+.007,.008,.002,.014,'black')
  if sniper:
   line('thumbhole stock',[(0,-.09,-.01),(0,-.35,.012),(0,-.36,-.12),(0,-.22,-.12),(0,-.15,-.065),(0,-.09,-.01)],.027,accent)
   box('sniper butt pad',(0,-.37,-.05),(.075,.03,.19),'body',.012)
   # An open thumbhole is represented by a separate curved stock outline.
   box('cheek rest',(0,-.29,.047),(.07,.13,.036),accent,.015)
   box('magazine',(0,.06,-.091),(.06,.10,.085),'body',.009)
   for y in [-.065,.105]:box('scope mount',(0,y,.097),(.045,.025,.055),'black',.006)
   tube('scope body',.035,.142,.29,.026)
   for y in [-.13,.19]:tube('scope bell',y,.142,.075,.043)
   for y in [-.169,.229]:tube('scope lens',y,.142,.002,.035,'glass')
   box('scope adjustment',(0,.03,.182),(.04,.04,.026),'body',.008)
  else:
   # Open stock triangle; no filled placeholder block.
   line('stock frame',[(0,-.085,.025),(0,-.29,.025),(0,-.29,-.10),(0,-.10,-.025)],.018,accent)
   box('butt pad',(0,-.29,-.035),(.065,.028,.15),'body',.009)
   profile('curved magazine',[(.04,-.04),(.105,-.04),(.12,-.13),(.17,-.23),(.10,-.25),(.06,-.15)],.052)
   for x in [-.027,.027]:line('magazine channel',[(x,.079,-.065),(x,.095,-.145),(x,.13,-.22)],.003,'steel')
   for y in [-.06,front+.04]:box('iron sight',(0,y,.073),(.023,.026,.06),'body',.006)
  for y in [i*.03-.07 for i in range(9)]:box('top rail',(0,y,.07),(.055,.009,.009),'body',.002)
  box('bolt',(0.041,.01,.015),(.009,.06,.022),'body',.004,True)
  for x in [-.04,.04]:
   for y in [-.03,.09]:box('receiver pin',(x,y,-.012),(.006,.012,.012),'steel',.004)
 line('trigger guard',[(0,-.025,-.04),(0,.05,-.043),(0,.05,-.09),(0,-.025,-.09)],.006)
 line('trigger',[(0,.002,-.04),(0,.012,-.065),(0,.002,-.076)],.004,'steel')
 # Batch by moving part and material to reduce rendering cost.
 joined=[]
 for part in ['frame','slide','magazine']:
  for material in mats.values():
   group=[o for o in objects if o['weaponPart']==part and o.data.materials[0]==material]
   if not group:continue
   objects=[o for o in objects if o not in group]
   bpy.ops.object.select_all(action='DESELECT')
   for o in group:o.select_set(True)
   bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();o=bpy.context.object;o.name=kind+'-'+part+'-'+material.name;o['weaponPart']=part;joined.append(o)
 root=bpy.data.objects.new(kind,None);bpy.context.collection.objects.link(root);root['designSource']='Glossy cartoon weapon reference generated in chat; interpreted visual proportions, no existing mesh imports'
 for o in joined:o.parent=root
 muzzle=bpy.data.objects.new(kind+'-muzzle',None);bpy.context.collection.objects.link(muzzle);muzzle.location=(0,end+.01,.004 if pistol else .008);muzzle.parent=root
 bpy.ops.object.select_all(action='DESELECT');root.select_set(True);muzzle.select_set(True)
 for o in joined:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=client+'/'+kind+'.glb',export_format='GLB',use_selection=True,export_extras=True)
 tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in joined);report.append({'kind':kind,'triangles':tris,'drawCalls':len(joined)})
 allmodels.append((root,joined,muzzle))
 for o in joined:o.hide_render=True
for kind in ['pistol','smg','rifle','sniper']:build(kind)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=False;scene.render.resolution_x=1500;scene.render.resolution_y=1100;scene.render.resolution_percentage=100;scene.world=bpy.data.worlds.new('Studio world');scene.world.color=(.3,.3,.3);scene.view_settings.view_transform='AgX'
for i,(root,parts,muzzle) in enumerate(allmodels):
 root.location=(0,0,(3-i)*.5)
 for o in parts:o.hide_render=False
bpy.ops.object.camera_add(location=(3,1.4,2));cam=bpy.context.object;target=Vector((0,.08,.72));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.25;scene.camera=cam
for p,power,size in [((3,1,4),500,4),((-2,-2,3),350,3),((0,3,1),200,2)]:
 bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=out+'/lineup.png';bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(out+'/weapon-library.blend'));json.dump(report,open(out+'/report.json','w'),indent=2);print(json.dumps(report))

shutil.copyfile(out+"/lineup.png",client+"/lineup.png")
