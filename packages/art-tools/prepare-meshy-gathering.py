"""Prepare the original Meshy gathering downloads for the existing instanced renderer."""
import bpy,json,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
SOURCE=Path('art/models/meshy-gathering');OUT=Path('apps/client/static/assets/meshy-nature-v1');OUT.mkdir(parents=True,exist_ok=True)
original=json.loads(Path('apps/client/static/assets/nature-models/manifest.json').read_text());report=[]
for info in [m for m in original['models'] if m['lod']==0]:
 name=info['id'];bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(SOURCE/(name+'.glb')));meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];points=[o.matrix_world@v.co for o in meshes for v in o.data.vertices];lo=Vector([min(p[k] for p in points) for k in range(3)]);hi=Vector([max(p[k] for p in points) for k in range(3)]);target=Vector((info['sizeMetres']['x'],info['sizeMetres']['z'],info['sizeMetres']['y']));factor=Vector([target[k]/(hi[k]-lo[k]) for k in range(3)]);center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
 for mesh in meshes:
  matrix=mesh.matrix_world.copy();mesh.parent=None
  for v in mesh.data.vertices:v.co=(matrix@v.co-center)*factor
  mesh.matrix_world=Matrix.Identity(4);mesh.name=name;mesh['source']='meshy';mesh['sourceSHA256']=hashlib.sha256((SOURCE/(name+'.glb')).read_bytes()).hexdigest()
  for material in mesh.data.materials:
   if material.use_nodes:
    p=material.node_tree.nodes.get('Principled BSDF')
    if p:p.inputs['Roughness'].default_value=.45;p.inputs['Metallic'].default_value=0;p.inputs['Coat Weight'].default_value=.15
 textures=[im for im in bpy.data.images if im.type=='IMAGE' and im.size[0]>0]
 for lod in [0,1]:
  for im in textures:
   _=im.pixels[0];ratio=min(1,(512 if lod else 1024)/max(im.size));im.scale(round(im.size[0]*ratio),round(im.size[1]*ratio))
  for mesh in meshes:
   if lod:
    dec=mesh.modifiers.new('Distant geometry','DECIMATE');dec.ratio=.22
    bpy.context.view_layer.objects.active=mesh;bpy.ops.object.modifier_apply(modifier=dec.name)
    points=[v.co for v in mesh.data.vertices];minimum=Vector([min(p[k] for p in points)for k in range(3)]);maximum=Vector([max(p[k] for p in points)for k in range(3)]);offset=Vector(((minimum.x+maximum.x)/2,(minimum.y+maximum.y)/2,minimum.z));scale=Vector([target[k]/(maximum[k]-minimum[k])for k in range(3)])
    for v in mesh.data.vertices:v.co=(v.co-offset)*scale
  for mesh in meshes:mesh.data.update()
  bpy.context.view_layer.update()
  bpy.ops.object.select_all(action='DESELECT')
  for mesh in meshes:mesh.select_set(True)
  path=OUT/(name+('-lod1'if lod else '')+'.glb');bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_extras=True,export_image_format='JPEG',export_jpeg_quality=88)
  raw=path.read_bytes();import struct;doc=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]]);triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes']for p in m['primitives'])
  report.append({'id':name,'lod':lod,'file':path.name,'source':'meshy','sourceSHA256':meshes[0]['sourceSHA256'],'triangles':triangles,'drawCalls':len(meshes),'sizeMetres':info['sizeMetres'],'textureMax':512 if lod else 1024,'bytes':len(raw)})
(OUT/'manifest.json').write_text(json.dumps({'source':'meshy','models':report},indent=2)+'\n')
