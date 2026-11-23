"""Add runtime sockets and detachable ammo geometry to the decorative prop exports."""
import bpy,math
from pathlib import Path
from mathutils import Vector,Matrix
for kind,name,end in [('lmg','light-machine-gun',.965),('rocket','rocket-launcher',.67),('grenade','grenade',.15),('c4','c4',.17)]:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(Path('art/weapons/sprites/models')/(name+'.glb')))
 if kind=='lmg':
  bpy.ops.object.select_all(action='SELECT');bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.separate(type='LOOSE');bpy.ops.object.mode_set(mode='OBJECT')
 for o in bpy.context.scene.objects:
  if o.type!='MESH':continue
  center=sum((o.matrix_world@v.co for v in o.data.vertices),Vector())/len(o.data.vertices)
  # Blender import restores z-up coordinates; the box sits beside/below the receiver.
  o['weaponPart']='magazine' if kind=='lmg' and center.x>.025 and center.z<-.06 and abs(center.y)<.2 else 'frame'
  if kind=='rocket':o.scale*=.72
  if kind in ['grenade','c4']:o.scale*=.7
  if kind=='c4':o.matrix_world=Matrix.Rotation(-math.pi/2,4,'Z')@o.matrix_world
 if kind=='lmg':
  bpy.ops.mesh.primitive_cube_add(size=1,location=(.076,.01,.025));handle=bpy.context.object;handle.name='animated charging handle';handle.dimensions=(.028,.07,.025);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);handle.data.materials.append(next(m for m in bpy.data.materials if m.name.startswith('steel')));handle['weaponPart']='slide'
 # Batch independent components again after classifying the ammo box.
 for part in ['frame','magazine','slide']:
  materials={o.data.materials[0] for o in bpy.context.scene.objects if o.type=='MESH' and o.get('weaponPart')==part}
  for material in materials:
   group=[o for o in list(bpy.context.scene.objects) if o.type=='MESH' and o.get('weaponPart')==part and o.data.materials[0]==material]
   bpy.ops.object.select_all(action='DESELECT')
   for o in group:o.select_set(True)
   bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();bpy.context.object['weaponPart']=part
 socket=bpy.data.objects.new(kind+'-muzzle',None);bpy.context.collection.objects.link(socket);socket.location=(0,end*(.72 if kind=='rocket' else .7 if kind in ['grenade','c4'] else 1),.02)
 bpy.ops.object.select_all(action='SELECT');bpy.ops.export_scene.gltf(filepath=str(Path('apps/client/src/fps/models/weapons')/(kind+'.glb')),export_format='GLB',export_extras=True)
