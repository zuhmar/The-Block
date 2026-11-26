"""Repair malformed custom normals in Meshy's carton export without regenerating the model."""
import bpy,bmesh,json,hashlib
from pathlib import Path
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(Path('art/buildings/block-mart/meshy-props/source-models/stock-boxes.glb').resolve()))
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.normals_split_custom_set([(0,0,0)]*len(o.data.loops))
 for f in o.data.polygons:f.use_smooth=False
bpy.ops.export_scene.gltf(filepath=str(Path('art/buildings/block-mart/meshy-props/models/stock-boxes.glb').resolve()),export_format='GLB',export_yup=True)

root=Path('art/buildings/block-mart/meshy-props')
source=root/'source-models/stock-boxes.glb';output=root/'models/stock-boxes.glb'
report={'source':'source-models/stock-boxes.glb','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'output':'models/stock-boxes.glb','outputSha256':hashlib.sha256(output.read_bytes()).hexdigest(),'operation':'Weld coincident seam vertices, recalculate surface orientation, clear malformed imported custom normals, and shade the cardboard faces flat','positionsWeldTolerance':0.00001,'meshRegenerated':False,'additionalMeshyCredits':0}
(root/'carton-surface-repair.json').write_text(json.dumps(report,indent=2)+'\n')
