"""Author an editable release cinematic from the exact runtime jail and character GLBs.
Blender 4.3+, local assets only. --preview renders selected storyboard frames.
The final animation writes H.264 directly, avoiding a large temporary image sequence.
"""
import bpy,math,json,hashlib,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path.cwd();OUT=ROOT/'art/cinematics/jail-release';OUT.mkdir(parents=True,exist_ok=True)
WORK=ROOT/'work/jail-intro';WORK.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene;scene.render.fps=24;scene.frame_start=1;scene.frame_end=288
scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.studio_light='paint.sl';scene.display.shading.color_type='TEXTURE';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.cavity_type='BOTH';scene.display.shading.show_specular_highlight=True;scene.display.shading.background_type='WORLD';scene.display.render_aa='FXAA'
scene.render.resolution_x=960;scene.render.resolution_y=540;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
scene.world=bpy.data.worlds.new('Afternoon sky');scene.world.color=(.38,.59,.74);scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.45,.66,.82,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.55
report={'duration':12,'fps':24,'frames':288,'sources':{},'actors':[],'shots':[],'gate':{'opens':[108,150],'closes':[263,285]},'handoffLocal':{'x':0,'z':20.2,'y':0}}
def load(path,name,position=(0,0,0),yaw=0):
 before=set(scene.objects);actions=set(bpy.data.actions);bpy.ops.import_scene.gltf(filepath=str(ROOT/path))
 objs=[o for o in scene.objects if o not in before];wrapper=bpy.data.objects.new(name,None);scene.collection.objects.link(wrapper)
 for o in objs:
  if o.parent is None:o.parent=wrapper
 wrapper.location=position;wrapper.rotation_euler.z=yaw
 report['sources'][str(path)]=hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
 return wrapper,objs,[a for a in bpy.data.actions if a not in actions]
def mat(name,color,rough=.45):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Coat Weight'].default_value=.16;return m
def box(name,loc,size,material):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material);return o
concrete=mat('Runtime courtyard concrete',(.32,.36,.38));grass=mat('City grass',(.19,.38,.19));water=mat('Harbor blue',(.045,.33,.48),.22);asphalt=mat('City asphalt',(.09,.12,.15));stripe=mat('Road stripe',(.88,.88,.77))
# Actual authored ground assembly contains towers, props, gates, and modular bridge.
_,grounds,_=load(Path('apps/client/src/fps/models/street/jail-meshy-grounds.glb'),'Actual jail grounds')
load(Path('apps/client/src/fps/models/buildings/jail.glb'),'Actual U shaped jail',(0,5,0))
bpy.ops.mesh.primitive_circle_add(vertices=96,radius=1,fill_type='NGON',location=(0,0,-.065));island=bpy.context.object;island.name='Jail island actual 24 by 26 footprint';island.scale=(24,26,1);island.data.materials.append(grass)
box('Actual courtyard',(0,0,-.035),(34,34,.05),concrete)
box('Release approach',(0,-18.5,-.01),(8,4,.04),asphalt)
box('Water surrounding island',(0,-20,-.18),(320,320,.1),water)
box('City land',(0,-150,-.07),(324,198,.1),grass)
box('City coastal road',(0,-50,-.006),(312,8,.025),asphalt)
box('City bridge junction',(18,-85,-.006),(8,76,.025),asphalt)
for x in range(-140,150,7):box('Coastal road marking',(x,-50,.01),(3,.12,.02),stripe)
layout=json.loads((OUT/'layout.json').read_text())
for i,b in enumerate(layout['city']):
 load(Path(f"apps/client/src/fps/models/buildings/{b['type']}.glb"),'Actual city building '+str(i),(b['x'],-b['z'],0),-b['yaw'])
# Shared glossy materials and physically plausible, soft daylight.
def light(name,kind,loc,power,size=5):
 data=bpy.data.lights.new(name,kind);data.energy=power
 if kind=='AREA':data.shape='DISK';data.size=size
 ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);ob.location=loc;ob.rotation_euler=(Vector((0,-12,0))-ob.location).to_track_quat('-Z','Y').to_euler();return ob
sun=light('Afternoon sun','SUN',(8,-10,15),2.1);sun.data.angle=.12
light('Soft sky key','AREA',(3,-15,10),1700,9);light('Courtyard fill','AREA',(-7,-4,7),1000,8)
# Keep imported clips as editable NLA strips. Remove root drift, not the walking gait.
def character(kind,x,offset,stop):
 path=Path('apps/client/src/fps/models')/('meshy-shadow' if kind=='Player' else 'meshy-police')/'animated.glb'
 root,objs,actions=load(path,kind+' escort actor')
 rig=next(o for o in objs if o.type=='ARMATURE')
 for ob in objs:
  if ob.animation_data:
   ob.animation_data.action=None
   for tr in list(ob.animation_data.nla_tracks):ob.animation_data.nla_tracks.remove(tr)
 idle=next(a for a in actions if a.name.startswith('Idle_3_'));walk=next(a for a in actions if a.name.startswith('Walking_'))
 for a in [idle,walk]:
  for fc in a.fcurves:
   if fc.data_path in ['location','rotation_euler','rotation_quaternion','scale'] or ('Hips' in fc.data_path and fc.data_path.endswith('location') and fc.array_index in [0,1]):
    for key in fc.keyframe_points:key.co.y=fc.keyframe_points[0].co.y
 # Normalize complete characters to their actual game height without distorting proportions.
 rig.animation_data_create();rig.animation_data.action=idle;scene.frame_set(0);bpy.context.view_layer.update()
 pts=[o.matrix_world@Vector(c) for o in objs if o.type=='MESH' for c in o.bound_box]
 lo=min(p.z for p in pts);height=max(p.z for p in pts)-lo
 root.scale=(2/height,)*3;root.location.z=-lo*2/height;rig.animation_data.action=None
 def strip(action,start,end,repeat=False):
  track=rig.animation_data.nla_tracks.new();track.name=kind+' '+action.name.split('_SmartRig')[0]
  st=track.strips.new(track.name,start,action);st.action_frame_start=action.frame_range.x;st.action_frame_end=action.frame_range.y
  if repeat:st.repeat=(end-start)/(action.frame_range.y-action.frame_range.x)
  else:st.scale=(end-start)/(action.frame_range.y-action.frame_range.x)
  st.blend_type='REPLACE';st.extrapolation='NOTHING';st.blend_in=4 if start>1 else 0;return st
 strip(idle,1,18);strip(walk,18,stop,True);strip(idle,stop,288)
 for frame,z in [(1,7.8+offset),(18,7.8+offset),(stop,20.2+offset),(288,20.2+offset)]:
  root.location.x=x;root.location.y=-z;root.keyframe_insert('location',frame=frame)
 for fc in root.animation_data.action.fcurves:
  for key in fc.keyframe_points:key.interpolation='LINEAR'
 report['actors'].append({'role':kind,'rig':rig.name,'bones':len(rig.data.bones),'walk':walk.name,'stop':stop,'height':2,'x':x})
 return root
actors=[character('Player',0,0,270),character('Police left',-1.05,-.65,255),character('Police right',1.05,-.65,255)]
# Bake sole contact from the evaluated, animated meshes instead of the bind-pose bounds.
for frame in range(1,289):
 scene.frame_set(frame);bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
 for root in actors:
  meshes=[o.evaluated_get(deps) for o in root.children_recursive if o.type=='MESH']
  bottom=min((o.matrix_world@Vector(c)).z for o in meshes for c in o.bound_box)
  root.location.z+=.015-bottom;root.keyframe_insert('location',index=2,frame=frame)
for root in actors:
 for fc in root.animation_data.action.fcurves:
  for k in fc.keyframe_points:k.interpolation='LINEAR'

# The final camera matches a first-person view: the actor's own head must not occlude it.
for mesh in [o for o in actors[0].children_recursive if o.type=='MESH']:
 mesh.hide_render=False;mesh.keyframe_insert('hide_render',frame=1)
 mesh.hide_render=True;mesh.keyframe_insert('hide_render',frame=273)
# Animate the existing live gate hinges; no substitute gate models.
def cinematic_pivot(obj,name):
 # glTF nodes retain their source coordinate-basis quaternion. Add an identity
 # world-space pivot rather than overwriting that quaternion with Euler angles.
 bpy.context.view_layer.update();world=obj.matrix_world.copy();pivot=bpy.data.objects.new(name,None);scene.collection.objects.link(pivot);pivot.location=world.translation;obj.parent=pivot;obj.matrix_world=world;return pivot
for name in ['jail-vehicle-hinge','jail-pedestrian-hinge']:
 o=cinematic_pivot(bpy.data.objects[name],'Cinematic '+name)
 for frame,angle in [(1,0),(108,0),(150,math.pi/2),(263,math.pi/2),(285,0),(288,0)]:
  o.rotation_euler.z=angle;o.keyframe_insert('rotation_euler',frame=frame)
barrier=cinematic_pivot(bpy.data.objects['jail-barrier-hinge'],'Cinematic barrier lift')
for frame,angle in [(1,0),(108,0),(150,1.2),(263,1.2),(285,0),(288,0)]:barrier.rotation_euler.y=angle;barrier.keyframe_insert('rotation_euler',frame=frame)
# Film edit: establish the courtyard, follow the escort, show release, then match the FPS handoff.
def camera(name,start,end,poses,lens=40):
 data=bpy.data.cameras.new(name);ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);data.lens=lens;data.clip_end=250
 for frame,position,target in poses:
  ob.location=position;ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler();ob.keyframe_insert('location',frame=frame);ob.keyframe_insert('rotation_euler',frame=frame)
 for fc in ob.animation_data.action.fcurves:
  for key in fc.keyframe_points:key.interpolation='LINEAR'
 marker=scene.timeline_markers.new(name,frame=start);marker.camera=ob
 report['shots'].append({'name':name,'start':start,'end':end});return ob
scene.camera=camera('01 Courtyard release',1,60,[(1,(8,-13,4.3),(0,-8.4,1.2)),(60,(6,-15,3.3),(0,-9.8,1.2))],38)
camera('02 Escort to gate',61,216,[(61,(3.8,-7.2,2.8),(0,-10.0,1.25)),(216,(3.8,-14.7,2.8),(0,-17.5,1.25))],40)
camera('03 Outside the gate',217,272,[(217,(-5.6,-24,3),(0,-18.0,1.2)),(272,(-4.8,-25,2.6),(0,-20,1.2))],40)
camera('04 First person handoff',273,288,[(273,(0,-20.2,1.65),(0,-60,1.65)),(288,(0,-20.2,1.65),(0,-60,1.65))],24)
for image in bpy.data.images:
 if image.size[0]>0 and not image.packed_file:
  try:image.pack()
  except RuntimeError:pass
scene.frame_set(1);scene.render.image_settings.file_format='FFMPEG';scene.render.ffmpeg.format='MPEG4';scene.render.ffmpeg.codec='H264';scene.render.ffmpeg.constant_rate_factor='MEDIUM';scene.render.ffmpeg.ffmpeg_preset='GOOD'
scene.render.filepath=str(WORK/'jail-release-silent.mp4')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'jail-release.blend'),compress=True)
(OUT/'manifest.json').write_text(json.dumps(report,indent=2)+'\n')
if '--preview' in sys.argv:
 scene.render.image_settings.file_format='PNG';scene.render.resolution_percentage=60
 for frame in [36,155,240,280]:
  scene.frame_set(frame);scene.render.filepath=str(WORK/f'preview-{frame}.png');bpy.ops.render.render(write_still=True)
print('JAIL_INTRO_READY',json.dumps({'blend':str(OUT/'jail-release.blend'),'actors':report['actors']}))
