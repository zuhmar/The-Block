"""Check actual deformed poses and exported GLB; generate review renders."""
import bpy,json,struct,math,hashlib
from pathlib import Path
from mathutils import Vector
root=Path.cwd();out=root/'art/characters/jail-player/reference-fit'
bpy.ops.wm.open_mainfile(filepath=str(out/'reference-jail-player.blend'));scene=bpy.context.scene;rig=next(o for o in scene.objects if o.type=='ARMATURE')
for t in rig.animation_data.nla_tracks:t.mute=True
scene.render.engine='BLENDER_WORKBENCH';scene.render.resolution_x=480;scene.render.resolution_y=640;scene.render.resolution_percentage=100;scene.display.render_aa='FXAA';scene.world=bpy.data.worlds.new('Pose check');scene.world.color=(.18,.2,.22);sh=scene.display.shading;sh.light='STUDIO';sh.color_type='MATERIAL';sh.show_shadows=True;sh.show_cavity=True;sh.show_specular_highlight=True;sh.background_type='WORLD'
bpy.ops.object.camera_add(location=(2.4,-5,1.65));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.4;scene.camera=cam
checks=[]
for name,frame in [('Walking',12),('Rifle_Hold',5),('Punch_Left',9)]:
 rig.animation_data.action=bpy.data.actions[name];scene.frame_set(frame);scene.render.filepath=str(out/(name+'-check.png'));bpy.ops.render.render(write_still=True);deps=bpy.context.evaluated_depsgraph_get();points=[]
 for o in scene.objects:
  if o.type!='MESH':continue
  ev=o.evaluated_get(deps);mesh=ev.to_mesh();points.extend(ev.matrix_world@v.co for v in mesh.vertices);ev.to_mesh_clear()
 bounds=[[min(p[i] for p in points),max(p[i] for p in points)] for i in range(3)]
 assert all(hi-lo<3 for lo,hi in bounds),(name,bounds)
 assert -.3<bounds[2][0]<.3 and 1.5<bounds[2][1]<2.4,(name,bounds)
 checks.append({'clip':name,'frame':frame,'deformedBounds':bounds})
b=(out/'animated.glb').read_bytes();n=struct.unpack_from('<I',b,12)[0];doc=json.loads(b[20:20+n]);assert len(doc['animations'])==19;assert all(len(s['joints'])==24 for s in doc['skins']);assert not any('uri' in b for b in doc['buffers'])
(out/'validation.json').write_text(json.dumps({'clips':19,'skinJoints':24,'embeddedModel':True,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'poses':checks},indent=2)+'\n');print('REFERENCE_POSES_VALID')
