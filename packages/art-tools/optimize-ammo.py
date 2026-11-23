"""Bake bevels and batch same-material parts offline to reduce phone draw calls."""
import bpy,bmesh,json
from pathlib import Path
root=Path('art/models/ammo');out=Path('apps/client/static/assets/ammo');manifest=json.loads((out/'manifest.json').read_text())
for row in manifest['models']:
 kind=row['id'];bpy.ops.wm.open_mainfile(filepath=str((root/('ammo-'+kind+'.blend')).resolve()));bpy.context.preferences.filepaths.save_version=0;parts=[o for o in bpy.context.scene.objects if o.type=='MESH'];parent=bpy.data.objects.get('ammo-'+kind)
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:
  bpy.context.view_layer.objects.active=o
  for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
  for material in o.data.materials:material.use_backface_culling=True
  o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=bpy.context.object;o.name='ammo-'+kind+'-surfaces'
 # Blender join may retain duplicate slots; glTF consolidates identical material references.
 bpy.ops.object.select_all(action='DESELECT');parent.select_set(True);o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(out/row['file']),export_format='GLB',use_selection=True,export_extras=True)
 bpy.ops.wm.save_as_mainfile(filepath=str((root/('ammo-'+kind+'.blend')).resolve()),compress=True)
 row['bytes']=(out/row['file']).stat().st_size;row['meshes']=len(o.data.materials);row['triangles']=sum(len(p.vertices)-2 for p in o.data.polygons)
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
