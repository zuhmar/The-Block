"""Prepare existing Meshy assets locally: uniform scale, floor pivots, shared 1K textures."""
import bpy,json,math,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
SOURCE=Path('art/buildings/apartments/meshy-props')
OUT=Path('apps/client/src/fps/models/apartment-props');OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
manifest=json.loads((SOURCE/'manifest.json').read_text());catalog={}
fits={'bed':(1.6,1.25,2.3),'sofa':(2.2,1.2,1.15),'wardrobe':(.9,1.9,.7),'kitchen':(3.8,1.35,.85),'table':(1.2,.82,.8),'chair':(.5,.95,.55),'fridge':(.8,1.8,.8),'tv-stand':(1.4,1.35,.5)}
for p in manifest['props']:
 name=p['name'];key=name.removeprefix('apartment-');path=SOURCE/p['modelPath']
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.gltf(filepath=str(path.resolve()));bpy.context.view_layer.update()
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 points=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
 lo=Vector([min(v[i] for v in points) for i in range(3)]);hi=Vector([max(v[i] for v in points) for i in range(3)]);size=hi-lo
 # Blender axes x/depth/height; glTF x/height/depth. A single factor preserves the generated proportions.
 target=fits[key];factor=min(target[0]/size.x,target[1]/size.z,target[2]/size.y)
 centre=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
 yaw=0 if key in ['bed','table'] else math.pi
 transform=Matrix.Rotation(yaw,4,'Z')@Matrix.Scale(factor,4)@Matrix.Translation(-centre)
 for o in meshes:
  o.data.transform(transform@o.matrix_world);o.parent=None;o.matrix_world=Matrix.Identity(4)
  o.name=name;o['part']='apartment-prop';o['propAsset']=name;o['modelTaskId']=p['modelTaskId'];o['sourceSha256']=hashlib.sha256(path.read_bytes()).hexdigest();o['uniformSourceScale']=factor
  for mat in o.data.materials:
   if not mat or not mat.use_nodes:continue
   shader=mat.node_tree.nodes.get('Principled BSDF')
   if shader:
    shader.inputs['Roughness'].default_value=.38;shader.inputs['Metallic'].default_value=.02;shader.inputs['Coat Weight'].default_value=.16
   for node in mat.node_tree.nodes:
    if node.type=='TEX_IMAGE' and node.image:
     img=node.image
     if max(img.size)>1024:img.scale(1024,1024)
     img.file_format='JPEG';img.pack()
 root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root)
 for o in meshes:o.parent=root
 root['assetVersion']='apartment-props-v1';root['uniformSourceScale']=factor
 bpy.context.view_layer.update();points=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
 lo=Vector([min(v[i] for v in points) for i in range(3)]);hi=Vector([max(v[i] for v in points) for i in range(3)]);s=hi-lo
 file=OUT/(name+'.glb')
 bpy.ops.export_scene.gltf(filepath=str(file.resolve()),export_format='GLB',export_extras=True,export_animations=False,export_image_format='JPEG',export_jpeg_quality=90)
 catalog[name]={'width':round(s.x,6),'height':round(s.z,6),'depth':round(s.y,6),'uniformSourceScale':factor,'sourceYaw':yaw,'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'modelTaskId':p['modelTaskId'],'bytes':file.stat().st_size,'textureSize':1024}
(OUT/'catalog.json').write_text(json.dumps(catalog,indent=2)+'\n')
(SOURCE/'integration-catalog.json').write_text(json.dumps(catalog,indent=2)+'\n')
print(json.dumps({'props':len(catalog),'bytes':sum(v['bytes']for v in catalog.values())}))
