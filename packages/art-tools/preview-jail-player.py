import bpy,math,json,subprocess
from mathutils import Vector
from pathlib import Path
root=Path.cwd();out=root/'art/characters/jail-player';bpy.ops.wm.open_mainfile(filepath=str(out/'animated-character.blend'));scene=bpy.context.scene
rig=next(o for o in scene.objects if o.type=='ARMATURE')
for t in rig.animation_data.nla_tracks:t.mute=True
scene.render.engine='BLENDER_WORKBENCH';scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100
scene.world=scene.world or bpy.data.worlds.new('Preview World')
scene.display.shading.light='STUDIO';scene.display.shading.studiolight_rotate_z=.5;scene.display.shading.color_type='TEXTURE';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.show_specular_highlight=True;scene.display.shading.background_type='WORLD';scene.world.color=(.16,.18,.2);scene.display.render_aa='FXAA'
bpy.ops.object.camera_add(location=(3,-6,2.8));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=2.55;scene.camera=camera
checks=[]
for name,frame in [('Idle_3',0),('Walking',12),('Punch_Left',9),('Rifle_Hold',5)]:
 rig.animation_data.action=bpy.data.actions[name];scene.frame_set(frame);scene.render.filepath=str(out/(name+'-preview.png'));bpy.ops.render.render(write_still=True)
 deps=bpy.context.evaluated_depsgraph_get();points=[]
 for o in scene.objects:
  if o.type!='MESH':continue
  ev=o.evaluated_get(deps);m=ev.to_mesh();points.extend(ev.matrix_world@v.co for v in m.vertices);ev.to_mesh_clear()
 bounds=[[min(p[i] for p in points),max(p[i] for p in points)] for i in range(3)]
 assert all(hi-lo<3 for lo,hi in bounds), (name,bounds)
 assert abs(bounds[2][0])<.25 and 1.5<bounds[2][1]<2.5, (name,bounds)
 checks.append({'clip':name,'frame':frame,'bounds':bounds})
(out/'pose-check.json').write_text(json.dumps(checks,indent=2)+'\n')
motion=root/'work/jail-rig/motion';motion.mkdir(parents=True,exist_ok=True)
rig.animation_data.action=bpy.data.actions['Walking']
for frame in range(32):
 scene.frame_set(frame);scene.render.filepath=str(motion/f'frame-{frame:03d}.png');bpy.ops.render.render(write_still=True)
subprocess.run(['ffmpeg','-y','-v','error','-framerate','30','-i',str(motion/'frame-%03d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',str(out/'walking-preview.mp4')],check=True)
