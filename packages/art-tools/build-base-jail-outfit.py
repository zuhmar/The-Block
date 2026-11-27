"""Fit jail clothing to the exact existing player mesh and rig; no regenerated anatomy."""
import bpy,bmesh,math,json,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path.cwd();OUT=ROOT/'art/characters/jail-player/base-fit';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
source=ROOT/'apps/client/src/fps/models/meshy-shadow/animated.glb'
bpy.ops.import_scene.gltf(filepath=str(source));scene=bpy.context.scene;scene.render.fps=30
rig=next(o for o in scene.objects if o.type=='ARMATURE');rig.animation_data_clear();rig.animation_data_create()
for p in rig.pose.bones:p.matrix_basis=Matrix.Identity(4)
bpy.context.view_layer.update()
base=next(o for o in scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' and m.object==rig for m in o.modifiers))
for o in list(scene.objects):
 if o.type=='MESH' and o!=base:bpy.data.objects.remove(o,do_unlink=True)
original_geometry=[tuple(v.co) for v in base.data.vertices]
base.name='Original black player - unchanged anatomy'
def material(name,color,rough=.4):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough;return m
orange=material('STB prison orange',(1,.16,.012));black=material('Printed black',(0.004,.004,.004));seam=material('Orange seam',(.5,.05,.006));steel=material('Zipper steel',(.24,.26,.28),.25)
allowed=['Hips','Spine','Spine1','Spine2','LeftShoulder','RightShoulder','LeftArm','RightArm','LeftForeArm','RightForeArm','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg']
indices={g.index for g in base.vertex_groups if g.name.removeprefix('mixamorig:') in allowed}
covered={v.index:sum(g.weight for g in v.groups if g.group in indices) for v in base.data.vertices}
base.data.materials.append(orange)
for p in base.data.polygons:
 world=[base.matrix_world@base.data.vertices[i].co for i in p.vertices];center=sum(world,Vector())/len(world)
 if sum(covered[i] for i in p.vertices)/len(p.vertices)>.58 and .185<center.z<1.205:p.material_index=len(base.data.materials)-1

def weighted(o,bone):
 bpy.context.view_layer.objects.active=o;bpy.ops.object.select_all(action='DESELECT');o.select_set(True)
 if o.type!='MESH':bpy.ops.object.convert(target='MESH');o=bpy.context.object
 group=o.vertex_groups.new(name='mixamorig:'+bone);group.add(list(range(len(o.data.vertices))),1,'REPLACE');mod=o.modifiers.new('Original player rig','ARMATURE');mod.object=rig;o.parent=rig;return o

def line(name,points,mat,bone,radius=.002):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=radius;c.bevel_resolution=3;s=c.splines.new('POLY');s.points.add(len(points)-1)
 for p,v in zip(s.points,points):p.co=(*v,1)
 o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);o.data.materials.append(mat);return weighted(o,bone)
# Rounded cuff bands cover the material boundaries without changing body geometry.
for side,sign in [('Left',1),('Right',-1)]:
 for label,location,radius,depth,rotation,bone in [
  ('Sleeve',(sign*.515,.0166,1.1455),.045,.055,(0,math.pi/2,0),side+'ForeArm'),
  ('Trouser',(sign*.158,.023,.2),.055,.065,(0,0,0),side+'Leg')]:
  bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=radius,depth=depth,location=location,rotation=rotation)
  cuff=bpy.context.object;cuff.name=side+' '+label+' cuff';cuff.data.materials.append(orange)
  for face in cuff.data.polygons:face.use_smooth=True
  bevel=cuff.modifiers.new('Soft cuff edge','BEVEL');bevel.width=.004;bevel.segments=3;bpy.ops.object.modifier_apply(modifier=bevel.name)
  weighted(cuff,bone)
# Lettering is a separate fitted mesh, bound to the same chest bone.
bpy.ops.object.text_add(location=(0,-.108,1.074),rotation=(math.pi/2,0,0));text=bpy.context.object;text.name='STB chest print';text.data.body='STB';text.data.align_x='CENTER';text.data.size=.078;text.data.extrude=.0004;text.data.materials.append(black);text=weighted(text,'Spine2')
# Split zipper leaves a clean readable chest print.
line('Lower front zipper',[(0,-.085,.85),(0,-.099,.96),(0,-.105,1.06)],steel,'Spine1',.0018)
line('Upper front zipper',[(0,-.098,1.145),(0,-.075,1.18)],steel,'Spine2',.0018)
# Small collar follows the base neck rather than replacing it.
points=[(.052*math.cos(t),.018+.044*math.sin(t),1.19) for t in [i*2*math.pi/40 for i in range(41)]]
line('Orange collar seam',points,orange,'Neck',.008)
for a in bpy.data.actions:
 a.name=a.name.split('_SmartRigArmature')[0];a.use_fake_user=True
for a in bpy.data.actions:
 track=rig.animation_data.nla_tracks.new();track.name=a.name;track.strips.new(a.name,0,a);track.mute=True
for im in bpy.data.images:
 if im.size[0] and not im.packed_file:
  try:im.pack()
  except RuntimeError:pass
rig.animation_data.action=None
for p in rig.pose.bones:p.matrix_basis=Matrix.Identity(4)
# Review in an A-pose, without adding or modifying an exported animation.
for side,sign in [('Left',1),('Right',-1)]:
 p=rig.pose.bones['mixamorig:'+side+'Arm'];rest=p.bone.matrix_local.copy();rot=Matrix.Rotation(sign*.5,4,'Y');p.matrix=Matrix.Translation(rest.translation)@rot@rest.to_quaternion().to_matrix().to_4x4();bpy.context.view_layer.update()
assert original_geometry==[tuple(v.co) for v in base.data.vertices]
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'base-jail-player.blend'),compress=True)
# Reset to the unchanged bind pose for the game export.
for p in rig.pose.bones:p.matrix_basis=Matrix.Identity(4)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(OUT/'animated.glb'),export_format='GLB',use_selection=True,export_animation_mode='ACTIONS',export_anim_single_armature=False,export_skins=True,export_extras=True)
report={'baseSource':str(source.relative_to(ROOT)),'baseSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'baseVerticesPreserved':len(original_geometry),'baseGeometryUnchanged':True,'bones':len(rig.data.bones),'animations':[a.name for a in bpy.data.actions],'notes':['Original head, hands, feet, body geometry, rig and actions retained.','Orange suit material uses existing weighted body faces; anatomy and skin weights are unchanged.','No Meshy regeneration or rigging charges.']};(OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n')
# Render both versions in exactly the same pose/camera for an honest comparison.
for side,sign in [('Left',1),('Right',-1)]:
 p=rig.pose.bones['mixamorig:'+side+'Arm'];rest=p.bone.matrix_local.copy();p.matrix=Matrix.Translation(rest.translation)@Matrix.Rotation(sign*.5,4,'Y')@rest.to_quaternion().to_matrix().to_4x4();bpy.context.view_layer.update()
scene.render.engine='BLENDER_WORKBENCH';scene.render.resolution_x=640;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.display.render_aa='FXAA';scene.world=bpy.data.worlds.new('Review gray');scene.world.color=(.18,.2,.22);shade=scene.display.shading;shade.light='STUDIO';shade.color_type='MATERIAL';shade.show_shadows=True;shade.show_cavity=True;shade.show_specular_highlight=True;shade.background_type='WORLD'
# Textured black source retains its own diffuse; use a matching glossy display color.
base.data.materials[0].diffuse_color=(.008,.008,.008,1)
bpy.ops.object.camera_add(location=(.0,-5,1.45));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.83))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=1.92;scene.camera=cam
scene.render.filepath=str(OUT/'corrected-preview.png');bpy.ops.render.render(write_still=True)
for o in scene.objects:
 if o.type=='MESH' and o!=base:o.hide_render=True
for p in base.data.polygons:p.material_index=0
scene.render.filepath=str(OUT/'base-preview.png');bpy.ops.render.render(write_still=True)
print('BASE_FIT_READY',json.dumps(report))
