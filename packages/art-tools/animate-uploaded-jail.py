"""Bake the existing game animation library onto the actual Meshy jail rig in Blender.
Preserves the downloaded model and native walk/run clips; emits editable source and GLB.
"""
import bpy, json, math, hashlib
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path.cwd()
OUT = ROOT / 'art/characters/meshy-jail'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.render.fps = 30

def load(path):
    before = set(bpy.data.objects)
    actions = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=str(path))
    objects = set(bpy.data.objects) - before
    rig = next(o for o in objects if o.type == 'ARMATURE')
    return rig, objects, list(set(bpy.data.actions) - actions)

target, objects, native = load(OUT / 'original.glb')
target.name = 'STB Jail Player'
target.animation_data_clear()
for a in native:
    a.name=a.name.split('_SmartRigArmature')[0]
    a.use_fake_user=True
target.animation_data_create()
meshes = [o for o in objects if o.type == 'MESH' and any(m.type=='ARMATURE' and m.object==target for m in o.modifiers)]
for o in list(objects):
    if o.type=='MESH' and o not in meshes:
        objects.remove(o)
        bpy.data.objects.remove(o,do_unlink=True)
# Preserve the rig's centimetre-to-metre object transform while baking.
# Normalize the visible mesh hierarchy together, preserving bind matrices and weights.
bpy.context.view_layer.update()
points = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
low, high = min(p.z for p in points), max(p.z for p in points)
unit_scale = 2.0 / (high-low)
root = bpy.data.objects.new('Jail Player Metre Root', None)
scene.collection.objects.link(root)
for o in list(objects):
    if o.parent not in objects:
        world = o.matrix_world.copy()
        o.parent = root
        o.matrix_world = world
root.scale = (unit_scale,)*3
root.location.z = -low*unit_scale
objects.add(root)
bpy.context.view_layer.update()
for p in target.pose.bones: p.rotation_mode = 'QUATERNION'
target_rest = {b.name: target.matrix_world @ b.matrix_local for b in target.data.bones}

def clean(name): return name.removeprefix('mixamorig:')
mapping = {'Spine02':'Spine', 'Spine01':'Spine1', 'Spine':'Spine2', 'neck':'Neck', 'head_end':'HeadTop_End'}
reports = []
all_actions = []

def bake(source, action, name, native=False):
    action.name = 'Source_' + name
    source.animation_data_create()
    for tr in source.animation_data.nla_tracks: tr.mute = True
    source.animation_data.action = action
    source_bones = {clean(p.name):p for p in source.pose.bones}
    pairs = []
    for p in target.pose.bones:
        key = clean(p.name)
        if key in source_bones: pairs.append((p, source_bones[key]))
    assert len(pairs) >= 20, (name, len(pairs))
    srest = {p.name: source.matrix_world @ p.bone.matrix_local for _, p in pairs}
    ship = source_bones['Hips']
    thigh = source_bones['LeftUpLeg']
    source_length = (source.matrix_world.to_3x3() @ (thigh.bone.tail_local-thigh.bone.head_local)).length
    target_thigh = target.data.bones['mixamorig:LeftUpLeg']
    target_length = (target.matrix_world.to_3x3() @ (target_thigh.tail_local-target_thigh.head_local)).length
    ratio = target_length / source_length
    # Blender's glTF importer uses the scene FPS; imported frame ranges are already at 30 Hz.
    start, end = action.frame_range
    scene.frame_set(round(start))
    bpy.context.view_layer.update()
    root_origin = (source.matrix_world @ ship.matrix).translation.copy()
    count = max(2, round(end-start))
    result = bpy.data.actions.new(name)
    result.use_fake_user = True
    target.animation_data.action = result
    for frame in range(count+1):
        scene.frame_set(frame)
        # Set the source to its original frame without disturbing the target's destination keys.
        scene.frame_set(round(start+frame))
        bpy.context.view_layer.update()
        for p, src in pairs:
            src_world = source.matrix_world @ src.matrix
            rest_world = target_rest[p.name]
            rotation = src_world.to_quaternion() @ srest[src.name].to_quaternion().inverted() @ rest_world.to_quaternion()
            if not native and clean(p.name) in ['LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand']:
                # Match the posed limb direction, compensating for A/T-pose differences.
                # Preserve the new rig's roll instead of imposing another skeleton's roll.
                rest_direction = rest_world.to_quaternion() @ Vector((0,1,0))
                posed_direction = src_world.to_quaternion() @ Vector((0,1,0))
                rotation = rest_direction.rotation_difference(posed_direction) @ rest_world.to_quaternion()
            if p.parent:
                parent_rest = target_rest[p.parent.name]
                position = target.matrix_world @ p.parent.matrix @ parent_rest.inverted() @ rest_world.translation
            else:
                delta = (src_world.translation - root_origin) * ratio
                # Keep locomotion in place; preserve vertical movement for jump and crouch.
                delta.x = 0
                delta.y = 0
                position = rest_world.translation + delta
            world = rotation.to_matrix().to_4x4() @ Matrix.Diagonal((*rest_world.to_scale(), 1))
            world.translation = position
            p.matrix = target.matrix_world.inverted() @ world
            bpy.context.view_layer.update()
            p.keyframe_insert('location', frame=frame, group=p.name)
            p.keyframe_insert('rotation_quaternion', frame=frame, group=p.name)
            p.keyframe_insert('scale', frame=frame, group=p.name)
    for fc in result.fcurves:
        for key in fc.keyframe_points: key.interpolation = 'LINEAR'
    all_actions.append(result)
    reports.append({'name':name,'frames':count+1,'seconds':count/30,'mappedBones':len(pairs),'source':'Meshy native' if native else 'Blender game library'})
    target.animation_data.action = None

for a in native:
    all_actions.append(a)
    reports.append({'name':a.name,'frames':round(a.frame_range.y-a.frame_range.x)+1,'seconds':float(a.frame_range.y-a.frame_range.x)/30,'source':'Native uploaded Meshy animation'})

source, imported, actions = load(ROOT / 'apps/client/src/fps/models/meshy-shadow/animated.glb')
for action in sorted(actions, key=lambda a:a.name):
    name = action.name.split('_SmartRigArmature')[0].split('.')[0]
    if name not in ['Walking','Running']: bake(source, action, name)
for o in imported: bpy.data.objects.remove(o, do_unlink=True)
for a in actions: bpy.data.actions.remove(a)

for action in all_actions:
    track = target.animation_data.nla_tracks.new()
    track.name = action.name
    track.strips.new(action.name, 0, action)
    track.mute = True
for side in ['Left','Right']:
    socket=bpy.data.objects.new(side.lower()+'-weapon-socket',None)
    scene.collection.objects.link(socket)
    socket.parent=target;socket.parent_type='BONE';socket.parent_bone='mixamorig:'+side+'Hand'
    objects.add(socket)
for image in bpy.data.images:
    if image.size[0] and not image.packed_file:
        try: image.pack()
        except RuntimeError: pass
scene.frame_set(0)
target.animation_data.action = next(a for a in all_actions if a.name=='Idle_3')
bpy.ops.object.select_all(action='DESELECT')
for o in objects: o.select_set(True)
bpy.context.view_layer.objects.active=target
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'animated-character.blend'),compress=True)
target.animation_data.action=None
bpy.ops.export_scene.gltf(filepath=str(OUT/'animated.glb'),export_format='GLB',use_selection=True,export_animation_mode='ACTIONS',export_anim_single_armature=False,export_skins=True,export_extras=True)
report={'source':'User uploaded Mixamo GLB','originalSha256':hashlib.sha256((OUT/'original.glb').read_bytes()).hexdigest(),'newMeshyCredits':0,'bones':len(target.data.bones),'heightMeters':2,'sourceUnitScale':unit_scale,'clips':reports,'bytes':(OUT/'animated.glb').stat().st_size}
(OUT/'animation-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('UPLOADED_JAIL_ANIMATION_READY',json.dumps(report))
