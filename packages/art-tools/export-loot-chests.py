"""Export compact textured chest GLBs for the browser, preserving source models."""
import bpy,json
from pathlib import Path
ROOT=Path('art/loot-chests');OUT=Path('apps/client/src/fps/models/loot-chests');OUT.mkdir(parents=True,exist_ok=True)
TEMP=Path('work/loot-chest-textures');TEMP.mkdir(parents=True,exist_ok=True)
report=[]
for source in sorted((ROOT/'models').glob('*.glb')):
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(source))
 for image in list(bpy.data.images):
  if not image.packed_file:continue
  original=TEMP/(source.stem+'.png');image.filepath_raw=str(original.resolve());image.file_format='PNG';image.save()
  fresh=bpy.data.images.load(str(original.resolve()),check_existing=False);_=fresh.pixels[0];fresh.scale(1024,1024)
  compressed=TEMP/(source.stem+'.jpg');fresh.filepath_raw=str(compressed.resolve());fresh.file_format='JPEG';fresh.save()
  optimized=bpy.data.images.load(str(compressed.resolve()),check_existing=False)
  for material in bpy.data.materials:
   if material.use_nodes:
    for node in material.node_tree.nodes:
     if node.type=='TEX_IMAGE' and node.image==image:node.image=optimized
 dest=OUT/source.name
 bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',export_extras=True,export_image_format='JPEG',export_jpeg_quality=85)
 report.append({'name':source.stem,'bytes':dest.stat().st_size,'textureSize':1024})
(ROOT/'runtime-check.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
