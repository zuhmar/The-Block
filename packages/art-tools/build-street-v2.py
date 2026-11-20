"""Build the reviewable Street V2 Blender source, skinned GLB, AO bake and turnarounds.
Run from the repository root: blender -b -t 4 --python packages/art-tools/build-street-v2.py
Coordinates: Blender +Y is front, +Z is up; glTF export is front -Z, up +Y.
"""
import bpy, math, json, os
from mathutils import Vector
from math import sin, cos, pi
bpy.context.preferences.filepaths.save_version=0
ROOT=os.getcwd(); OUT=os.path.join(ROOT,'art/characters/street-v2');os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=False
scene.render.resolution_x=800;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'

def rgb(h):
 v=[int(h[i:i+2],16)/255 for i in (0,2,4)]
 return tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in v)
def material(name,color,rough=.5,metal=0,coat=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb(color),1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Coat Weight'].default_value=coat;p.inputs['Coat Roughness'].default_value=.3
 return m
SKIN=material('Glossy black identity','080a10',.25,0,.4)
CLOTH=material('Burgundy cotton hoodie','801d39',.66,0,.08)
RIB=material('Dark burgundy rib knit','4b152b',.78)
SEAM=material('Burgundy seam thread','a43c55',.78)
PANTS=material('Charcoal cargo fabric','292a32',.82)
PANTSEAM=material('Cargo stitching','45434d',.8)
SHOE=material('Ivory leather sneakers','e5dbc5',.48,0,.1)
SOLE=material('Ivory rubber soles','c5bca8',.82)
GOLD=material('Warm gold chain','c9a24b',.28,.8)
LACE=material('Cream laces','eee4cd',.8)
materials=[SKIN,CLOTH,RIB,SEAM,PANTS,PANTSEAM,SHOE,SOLE,GOLD,LACE]
parts=[]
# Bones have real elbow, knee, wrist, ankle and finger joints.
arm=bpy.data.armatures.new('Survivor skeleton');rig=bpy.data.objects.new('StreetV2Rig',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
bones={}
def bone(name,a,b,parent=None):
 e=arm.edit_bones.new(name);e.head=a;e.tail=b
 if parent:e.parent=arm.edit_bones[parent]
 bones[name]=(Vector(a),Vector(b));return e
bone('root',(0,0,.02),(0,0,.22));bone('hips',(0,0,.94),(0,0,1.06),'root');bone('spine',(0,0,1.06),(0,0,1.27),'hips');bone('chest',(0,0,1.27),(0,0,1.45),'spine');bone('neck',(0,0,1.45),(0,0,1.55),'chest');bone('head',(0,0,1.55),(0,0,1.98),'neck')
for side,s in [('L',-1),('R',1)]:
 bone('shoulder.'+side,(s*.06,0,1.42),(s*.25,0,1.4),'chest')
 bone('upper_arm.'+side,(s*.25,0,1.4),(s*.34,.005,1.145),'shoulder.'+side)
 bone('forearm.'+side,(s*.34,.005,1.145),(s*.31,.035,.91),'upper_arm.'+side)
 bone('hand.'+side,(s*.31,.035,.91),(s*.31,.04,.8),'forearm.'+side)
 for n in range(3):
  x=s*.31+(n-1)*.031;bone(f'finger{n}.{side}',(x,.065,.855),(x,.075,.8),'hand.'+side)
 bone('thumb.'+side,(s*.275,.065,.88),(s*.255,.088,.84),'hand.'+side)
 bone('thigh.'+side,(s*.115,0,.97),(s*.14,.012,.56),'hips');bone('shin.'+side,(s*.14,.012,.56),(s*.145,0,.16),'thigh.'+side);bone('foot.'+side,(s*.145,0,.16),(s*.145,.19,.08),'shin.'+side)
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)

def bind(obj,slot,weights):
 obj['clothingSlot']=slot;obj['part']=obj.name;obj.parent=rig
 for name in set(n for v in weights for n,w in v):obj.vertex_groups.new(name=name)
 for i,ws in enumerate(weights):
  total=sum(w for n,w in ws)
  for name,w in ws:
   if w>0:obj.vertex_groups[name].add([i],w/total,'REPLACE')
 mod=obj.modifiers.new('Deform with survivor joints','ARMATURE');mod.object=rig
 for p in obj.data.polygons:p.use_smooth=True
 parts.append(obj);return obj

def fixed(obj,slot,bonename):
 bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);obj.select_set(False)
 return bind(obj,slot,[[(bonename,1)]]*len(obj.data.vertices))

def ellipsoid(name,p,size,mat,slot,bone_name,segments=24,rings=14):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=p);o=bpy.context.object;o.name=name;o.scale=size;o.data.materials.append(mat);return fixed(o,slot,bone_name)

def tube(name,points,r,mat,slot,bone_name,res=10):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2;c.resolution_u=res;s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for v,p in zip(s.bezier_points,points):v.co=p;v.handle_left_type=v.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.data.materials.append(mat);o.select_set(False);return bind(o,slot,[[(bone_name,1)]]*len(o.data.vertices))

def rounded(name,p,size,mat,slot,bone_name,bevel=.02):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=name;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 m=o.modifiers.new('Soft sewn edge','BEVEL');m.width=min(bevel,min(size)*.4);m.segments=3;bpy.ops.object.modifier_apply(modifier=m.name);o.data.materials.append(mat);o.select_set(False);return bind(o,slot,[[(bone_name,1)]]*len(o.data.vertices))

# Cross sections are densely sampled and given local cloth compression folds.
def loft(name,sections,mat,slot,weight_fn,sides=24,steps=3,fold=0):
 rows=[]
 for i in range(len(sections)-1):
  a,b=sections[i],sections[i+1]
  for j in range(steps):
   t=j/steps;p0=sections[max(0,i-1)];p3=sections[min(len(sections)-1,i+2)]
   rows.append(tuple(.5*((2*v1)+(-v0+v2)*t+(2*v0-5*v1+4*v2-v3)*t*t+(-v0+3*v1-3*v2+v3)*t*t*t) for v0,v1,v2,v3 in zip(p0,a,b,p3)))
 rows.append(sections[-1]);verts=[];faces=[];weights=[]
 for k,(x,y,z,rx,ry) in enumerate(rows):
  t=k/(len(rows)-1)
  for n in range(sides):
   a=n/sides*2*pi;wrinkle=fold*sin(t*7*pi+a*2)*sin(pi*t)**2
   v=(x+cos(a)*(rx+wrinkle),y+sin(a)*(ry+wrinkle*.65),z+fold*.25*sin(a*3+t*13)*sin(pi*t));verts.append(v);weights.append(weight_fn(z))
 for k in range(len(rows)-1):
  for n in range(sides):a=k*sides+n;b=k*sides+(n+1)%sides;faces.append((a,b,b+sides,a+sides))
 faces.append(tuple(range(sides-1,-1,-1)));faces.append(tuple((len(rows)-1)*sides+n for n in range(sides)))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
 # Recalculate outward normals after profile orientation.
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
 return bind(o,slot,weights)

def blend(z,low,high,a,b):
 t=max(0,min(1,(z-low)/(high-low)));return [(a,1-t),(b,t)]

ellipsoid('Featureless glossy sphere',(0,0,1.7),(.3,.3,.3),SKIN,'base','head',32,24)
loft('Black torso base',[(0,0,1.48,.06,.06),(0,0,1.35,.19,.085),(0,0,1.12,.115,.08),(0,0,.92,.14,.09),(0,0,.86,.025,.03)],SKIN,'base',lambda z:blend(z,1.1,1.35,'hips','chest'),20,2)
loft('Shaped hoodie',[(0,0,1.45,.12,.11),(0,0,1.4,.23,.14),(0,.005,1.31,.248,.155),(0,.014,1.15,.252,.177),(0,.01,1.045,.23,.166),(0,0,1.01,.211,.146)],CLOTH,'torso',lambda z:blend(z,1.06,1.37,'spine','chest'),32,3,.006)
loft('Ribbed hoodie hem',[(0,0,1.048,.23,.161),(0,0,1.009,.218,.15),(0,0,.984,.21,.145)],RIB,'torso',lambda z:[('spine',1)],32,2)
# Hood hangs down the back, leaving the approved black head unobscured.
ellipsoid('Lowered hood outer',(0,-.1,1.425),(.228,.152,.108),CLOTH,'torso','chest')
ellipsoid('Recessed hood lining',(0,-.108,1.478),(.177,.105,.033),RIB,'torso','chest')
tube('Hood folded rim',[(-.18,.02,1.42),(-.17,-.14,1.49),(0,-.235,1.49),(.17,-.14,1.49),(.18,.02,1.42)],.018,RIB,'torso','chest')
# Soft shaped pocket, diagonal openings, and two rows of deliberately restrained stitching.
rounded('Sewn kangaroo pocket',(0,.177,1.14),(.31,.036,.15),CLOTH,'torso','spine',.035)
for s in [-1,1]:
 tube('Pocket opening',[(s*.15,.194,1.18),(s*.12,.204,1.14),(s*.116,.197,1.095)],.004,RIB,'torso','spine')
 tube('Pocket stitching',[(s*.14,.199,1.185),(s*.105,.21,1.14),(s*.1,.201,1.1)],.0017,SEAM,'torso','spine')
 tube('Drawstring',[(s*.077,.116,1.445),(s*.083,.162,1.35),(s*.08,.181,1.28)],.0055,LACE,'torso','chest')
 rounded('Drawstring aglet',(s*.08,.182,1.275),(.012,.012,.026),RIB,'torso','chest',.004)
# Gold links follow a necklace rather than a flat arc.
chainpoints=[(-.1,.112,1.45),(-.084,.155,1.38),(0,.182,1.344),(.084,.155,1.38),(.1,.112,1.45)]
tube('Gold necklace',chainpoints,.007,GOLD,'torso','chest')
for n in range(11):
 t=n/10; x=-.085+t*.17;z=1.344+.043*(abs(x)/.085)**1.6
 bpy.ops.mesh.primitive_torus_add(major_radius=.009,minor_radius=.0025,major_segments=8,minor_segments=4,location=(x,.179-.02*abs(x)/.085,z));o=bpy.context.object;o.name='Chain link';o.rotation_euler=(pi/2,0,n%2*pi/3);o.data.materials.append(GOLD);fixed(o,'torso','chest')

# Shared black hands/limbs and articulated baggy sleeves/trousers.
for side,s in [('L',-1),('R',1)]:
 upper='upper_arm.'+side;fore='forearm.'+side;hand='hand.'+side;thigh='thigh.'+side;shin='shin.'+side;foot='foot.'+side
 armsections=[(s*.25,0,1.41,.052,.052),(s*.3,0,1.27,.05,.05),(s*.34,.005,1.145,.048,.048),(s*.31,.035,.91,.046,.046)]
 loft('Black articulated arm '+side,armsections,SKIN,'base',lambda z,u=upper,f=fore:blend(z,1.1,1.2,f,u),16,2)
 loft('Baggy hoodie sleeve '+side,[(s*.25,0,1.42,.065,.072),(s*.275,0,1.37,.1,.098),(s*.32,.005,1.25,.109,.103),(s*.35,.012,1.13,.103,.094),(s*.335,.02,1.045,.112,.096),(s*.31,.03,.955,.07,.069)],CLOTH,'torso',lambda z,u=upper,f=fore:blend(z,1.09,1.2,f,u),24,3,.006)
 loft('Rib knit cuff '+side,[(s*.314,.03,.967,.073,.07),(s*.31,.035,.925,.062,.06)],RIB,'torso',lambda z,f=fore:[(f,1)],24,3)
 for n in range(9):
  a=n/9*2*pi;tube('Cuff knit rib',[(s*.314+cos(a)*.073,.03+sin(a)*.07,.96),(s*.31+cos(a)*.063,.035+sin(a)*.061,.929)],.0012,SEAM,'torso',fore)
 ellipsoid('Rounded palm '+side,(s*.31,.04,.867),(.064,.051,.078),SKIN,'base',hand)
 for n in range(3):
  x=s*.31+(n-1)*.033;ellipsoid('Rounded finger '+str(n)+side,(x,.068,.824),(.022,.033,.044),SKIN,'base',f'finger{n}.{side}',16,10)
 ellipsoid('Thumb '+side,(s*.262,.079,.862),(.032,.03,.045),SKIN,'base','thumb.'+side,18,10)
 loft('Black leg '+side,[(s*.115,0,.96,.067,.065),(s*.14,.012,.56,.06,.058),(s*.145,0,.16,.05,.05)],SKIN,'base',lambda z,t=thigh,h=shin:blend(z,.49,.63,h,t),16,2)
 ellipsoid('Bare foot '+side,(s*.145,.07,.09),(.08,.14,.07),SKIN,'base',foot)
 loft('Baggy cargo trouser '+side,[(s*.115,0,1.01,.11,.11),(s*.125,0,.89,.119,.113),(s*.14,.014,.73,.115,.11),(s*.14,.018,.58,.106,.1),(s*.15,.005,.45,.115,.096),(s*.145,-.005,.29,.095,.085),(s*.145,0,.2,.071,.068)],PANTS,'legs',lambda z,t=thigh,h=shin:blend(z,.48,.63,h,t),24,3,.006)
 loft('Jogger ankle cuff '+side,[(s*.145,0,.23,.075,.07),(s*.145,0,.17,.066,.063)],PANTS,'legs',lambda z,h=shin:[(h,1)],24,2)
 rounded('Cargo pocket '+side,(s*.223,.013,.79),(.053,.18,.2),PANTS,'legs',thigh,.02)
 rounded('Cargo pocket flap '+side,(s*.24,.018,.865),(.04,.191,.046),RIB,'legs',thigh,.012)
 tube('Trouser outside seam '+side,[(s*.23,-.01,.93),(s*.25,-.005,.75),(s*.245,0,.59)],.002,PANTSEAM,'legs',thigh)
 # Sole and upper are shaped as smooth closed profiles instead of boxes or stacked spheres.
 loft('Rubber sneaker sole '+side,[(s*.145,.055,.025,.105,.18),(s*.145,.06,.045,.112,.185),(s*.145,.065,.075,.109,.18)],SOLE,'footwear',lambda z,f=foot:[(f,1)],32,2)
 loft('Sculpted sneaker upper '+side,[(s*.145,.055,.07,.105,.174),(s*.145,.055,.11,.101,.17),(s*.145,.045,.15,.089,.146),(s*.145,-.005,.19,.073,.088),(s*.145,-.02,.205,.06,.07)],SHOE,'footwear',lambda z,f=foot:[(f,1)],32,2)
 rounded('Burgundy shoe side panel '+side,(s*.237,.045,.123),(.014,.133,.04),CLOTH,'footwear',foot,.006)
 ellipsoid('Padded shoe tongue '+side,(s*.145,.10,.174),(.06,.10,.025),SHOE,'footwear',foot)
 tube('Sole seam '+side,[(s*.235,-.06,.075),(s*.248,.06,.075),(s*.21,.21,.075),(s*.145,.236,.075),(s*.08,.21,.075)],.0025,SHOE,'footwear',foot)
 for n in range(4):
  y=.04+n*.035;z=.198-n*.012;mid=.202+.002*sin(n/3*pi);tube('Shoe lace '+side,[(s*.145-.053,y,z),(s*.145,y+.006,mid),(s*.145+.053,y,z)],.006,LACE,'footwear',foot)
  for sign in [-1,1]:
   bpy.ops.mesh.primitive_torus_add(major_radius=.008,minor_radius=.002,major_segments=8,minor_segments=4,location=(s*.145+sign*.055,y,z-.002));o=bpy.context.object;o.name='Sneaker eyelet';o.data.materials.append(SOLE);fixed(o,'footwear',foot)

loft('Cargo hip coverage',[(0,0,1.025,.22,.111),(0,0,.94,.22,.108),(0,0,.87,.14,.07),(0,0,.848,.025,.025)],PANTS,'legs',lambda z:[('hips',1)],28,2)
# Cap follows the sphere exactly with separate brim, band, seams and top button.
loft('Baseball cap crown',[(0,0,2.018,.025,.025),(0,0,1.99,.13,.13),(0,0,1.94,.22,.22),(0,0,1.86,.29,.29),(0,0,1.73,.311,.31)],CLOTH,'headwear',lambda z:[('head',1)],32,3)
ellipsoid('Curved cap brim',(0,.264,1.735),(.255,.184,.024),CLOTH,'headwear','head',32,12)
for a in [-.9,0,.9]:
 pts=[]
 for n in range(10):
  t=.18+n/9*1.25;pts.append((sin(a)*sin(t)*.314,cos(a)*sin(t)*.314,1.7+cos(t)*.314))
 tube('Cap panel stitching',pts,.0018,SEAM,'headwear','head')
ellipsoid('Cap top button',(0,0,2.027),(.019,.019,.01),RIB,'headwear','head',16,8)

# Join by equipment slot for a small number of skinned draw calls.
slot_objects={slot:[o for o in parts if o['clothingSlot']==slot] for slot in ['base','torso','legs','footwear','headwear']}
for slot,objs in slot_objects.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();o=bpy.context.object;o.name='StreetV2_'+slot;o['clothingSlot']=slot
 # Joining keeps modifiers of the active object; each mesh retains its bone groups.
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 # Smooth normals and a single skin modifier only.
 for p in o.data.polygons:p.use_smooth=True
parts=[o for o in bpy.data.objects if o.type=='MESH']
# One shared UV atlas and AO bake for the whole outfit.
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.1,island_margin=.012);bpy.ops.uv.pack_islands(rotate=True,margin=.012);bpy.ops.object.mode_set(mode='OBJECT')
ao=bpy.data.images.new('StreetV2_Shading',width=512,height=512,alpha=False);ao.colorspace_settings.name='Non-Color'
group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree');group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
for m in materials:
 n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=ao;n.label='Baked local shading';m.node_tree.nodes.active=n
 g=m.node_tree.nodes.new('ShaderNodeGroup');g.node_tree=group;m.node_tree.links.new(n.outputs['Color'],g.inputs['Occlusion'])
scene.cycles.samples=16;scene.render.bake.margin=6
bpy.ops.object.bake(type='AO',margin=6,use_clear=True)
ao.filepath_raw=os.path.join(OUT,'street-v2-ao.png');ao.file_format='PNG';ao.save();ao.pack()
# Authored animation clips use the actual deforming rig.
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
rig.animation_data_create();scene.render.fps=24

def action(name,frames):
 a=bpy.data.actions.new(name);rig.animation_data.action=a
 for pb in rig.pose.bones:pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0)
 for frame,values in frames:
  for pb in rig.pose.bones:pb.rotation_euler=(0,0,0)
  for bone_name,rot in values.items():rig.pose.bones[bone_name].rotation_euler=rot
  for pb in rig.pose.bones:pb.keyframe_insert('rotation_euler',frame=frame,group=pb.name)
 track=rig.animation_data.nla_tracks.new();track.name=name;strip=track.strips.new(name,frames[0][0],a);strip.action_frame_start=frames[0][0];strip.action_frame_end=frames[-1][0]
 return a
walk=[]
for frame,phase in [(1,0),(7,pi/2),(13,pi),(19,pi*1.5),(25,pi*2)]:
 vals={}
 for side,s in [('L',1),('R',-1)]:
  vals['thigh.'+side]=(sin(phase)*.32*s,0,0);vals['shin.'+side]=(-max(0,sin(phase)*s)*.36,0,0);vals['upper_arm.'+side]=(-sin(phase)*.18*s,0,0);vals['forearm.'+side]=(.08,0,0)
 walk.append((frame,vals))
action('walk',walk);action('idle',[(1,{}),(25,{'chest':(.012,0,0)}),(49,{})])
action('grip',[(1,{}),(12,{**{f'finger{n}.R':(.65,0,0) for n in range(3)},'thumb.R':(.3,0,.2)}),(24,{})])
for track in rig.animation_data.nla_tracks:track.mute=True
rig.animation_data.action=None
for pb in rig.pose.bones:pb.rotation_euler=(0,0,0)
scene.frame_set(1)
# Save only character objects to GLB, leaving lights/cameras in the editable Blender file.
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o in parts:o.select_set(True)
GLB=os.path.join(ROOT,'apps/client/src/fps/models/street-v2.glb')
bpy.ops.export_scene.gltf(filepath=GLB,export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_skins=True,export_extras=True,export_yup=True)
# Distant/mobile integration candidate; not used in the current game yet.
lod_parts=[]
for source in parts:
 o=source.copy();o.data=source.data.copy();bpy.context.collection.objects.link(o);o.name=source.name+"_LOD";lod_parts.append(o)
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 d=o.modifiers.new('Distance detail reduction','DECIMATE');d.ratio=.45;bpy.ops.object.modifier_apply(modifier=d.name)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o in lod_parts:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'street-v2-lod.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_skins=True,export_extras=True,export_yup=True)
lod_triangles=sum(len(p.vertices)-2 for o in lod_parts for p in o.data.polygons)
for o in lod_parts:bpy.data.objects.remove(o,do_unlink=True)
# Studio is part of the reviewable Blender source, not part of the playable asset.
world=bpy.data.worlds.new('Soft studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.55,.57,.6,1);world.node_tree.nodes['Background'].inputs[1].default_value=.25
for name,location,power,size in [('Key',(-3,4,5),260,3),('Fill',(4,2,3),100,3),('Rim',(0,-3,4),250,2)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=location;o.rotation_euler=(Vector((0,0,1.1))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.001));floor=bpy.context.object;floor.name='Studio floor (not exported)';floor.data.materials.append(material('Studio gray','bfc1c4',.9))
bpy.ops.object.camera_add(location=(0,6,1.12));cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=2.34
scene.cycles.samples=64;scene.cycles.use_denoising=False
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'street-v2.blend'))
for name,p in [('front',(0,6,1.12)),('side',(6,0,1.12)),('back',(0,-6,1.12)),('three-quarter',(3.2,6,2.55))]:
 cam.location=p;cam.rotation_euler=(Vector((0,0,1.03))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=os.path.join(OUT,name+'.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'street-v2.blend'))
triangles=sum(len(p.vertices)-2 for o in parts for p in o.data.polygons)
report={'source':'Blender 4.3','triangles':triangles,'lodTriangles':lod_triangles,'bones':len(arm.bones),'slots':[o.name for o in parts],'materials':len(materials),'aoResolution':512,'clips':['walk','idle','grip'],'glbBytes':os.path.getsize(GLB)}
open(os.path.join(OUT,'model-report.json'),'w').write(json.dumps(report,indent=2)+'\n');print('STREET_V2_REPORT',json.dumps(report))
