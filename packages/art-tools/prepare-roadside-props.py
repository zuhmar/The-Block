"""Prepare Meshy roadside props without changing their proportions; render true-alpha item sprites."""
import bpy,json,math,hashlib,sys
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path('art/roadside/meshy-v1');RAW=Path('work/roadside-raw');OUT=ROOT/'models'
manifest=json.loads((ROOT/'manifest.json').read_text());catalog={p['name']:p for p in manifest['props']}
lengths={p['name']:p['longest'] for p in manifest['props']}
for file in sorted(RAW.glob('*.glb')):
 name=file.stem
 if (ROOT/'tasks'/('prepared-'+name+'.json')).exists():continue
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
 source_hash=hashlib.sha256(file.read_bytes()).hexdigest()
 bpy.ops.import_scene.gltf(filepath=str(file.resolve()));bpy.context.view_layer.update()
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];matrices={o:o.matrix_world.copy() for o in meshes}
 points=[matrices[o]@Vector(v) for o in meshes for v in o.bound_box]
 lo=Vector([min(v[i] for v in points) for i in range(3)]);hi=Vector([max(v[i] for v in points) for i in range(3)]);size=hi-lo
 factor=lengths[name]/max(size);transform=Matrix.Scale(factor,4)@Matrix.Translation(Vector((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z)))
 done=json.loads((ROOT/'tasks'/('completed-'+name+'.json')).read_text())
 root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root)
 root['assetRole']='static-roadside-world-prop';root['meshyTaskId']=done['task_id'];root['referenceTaskId']=done['referenceTaskId'];root['uniformSourceScale']=factor;root['sourceSha256']=source_hash
 for o in meshes:
  if o.data.users>1:o.data=o.data.copy()
  o.data.transform(transform@matrices[o]);o.parent=root;o.matrix_world=Matrix.Identity(4)
  for mat in o.data.materials:
   if not mat or not mat.use_nodes:continue
   shader=mat.node_tree.nodes.get('Principled BSDF')
   if shader:shader.inputs['Roughness'].default_value=.4;shader.inputs['Coat Weight'].default_value=.16
   for node in mat.node_tree.nodes:
    if node.type=='TEX_IMAGE' and node.image:
     img=node.image
     if max(img.size)>1024:img.scale(1024,1024)
     img.file_format='JPEG';img.pack()
 bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
 for o in meshes:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str((OUT/(name+'.glb')).resolve()),export_format='GLB',use_selection=True,export_extras=True,export_animations=False,export_image_format='JPEG',export_jpeg_quality=88)
 bpy.context.view_layer.update();points=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
 lo=Vector([min(v[i] for v in points) for i in range(3)]);hi=Vector([max(v[i] for v in points) for i in range(3)]);size=hi-lo;centre=(lo+hi)/2;extent=max(size)
 scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.eevee.taa_render_samples=32
 scene.render.resolution_x=scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
 scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.world=bpy.data.worlds.new('Sprite World');scene.world.color=(.45,.45,.45)
 def area(label,position,power,area_size):
  data=bpy.data.lights.new(label,'AREA');data.energy=power*extent*extent;data.shape='DISK';data.size=area_size*extent
  obj=bpy.data.objects.new(label,data);bpy.context.collection.objects.link(obj);obj.location=centre+Vector(position)*extent;obj.rotation_euler=(centre-obj.location).to_track_quat('-Z','Y').to_euler()
 area('key',(-3,-4,6),650,4);area('fill',(4,-1,3),400,4);area('rim',(1,4,4),500,3)
 camera_data=bpy.data.cameras.new('sprite-camera');camera=bpy.data.objects.new('sprite-camera',camera_data);bpy.context.collection.objects.link(camera)
 camera.location=centre+Vector((4,-6,4)).normalized()*extent*5;camera.rotation_euler=(centre-camera.location).to_track_quat('-Z','Y').to_euler();camera_data.type='ORTHO';scene.camera=camera;bpy.context.view_layer.update()
 inverse=camera.matrix_world.inverted();projected=[inverse@p for p in points];camera_data.ortho_scale=max(max(p.x for p in projected)-min(p.x for p in projected),max(p.y for p in projected)-min(p.y for p in projected))*1.25
 scene.render.filepath=str((ROOT/'sprites'/(name+'.png')).resolve());bpy.ops.render.render(write_still=True)
 info={'name':name,'modelPath':'models/'+name+'.glb','spritePath':'sprites/'+name+'.png','sourceSha256':source_hash,'uniformSourceScale':factor,'width':round(size.x,6),'height':round(size.z,6),'depth':round(size.y,6),'textureResolution':1024,'spriteResolution':512,'spriteMethod':'Transparent Blender render of the AI-generated Meshy model; no procedural replacement geometry','modelTaskId':done['task_id'],'referenceTaskId':done['referenceTaskId']}
 (ROOT/'tasks'/('prepared-'+name+'.json')).write_text(json.dumps(info,indent=2)+'\n');print('PREPARED '+name,flush=True)
 if '--delete-raw' in sys.argv:file.unlink()
print('Roadside asset preparation complete',flush=True)
