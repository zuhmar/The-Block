"""Local runtime derivatives: uniform scale, floor pivots, 1K textures; no paid generation."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector,Matrix
SOURCE=Path('art/building-kits/timber-yard')
OUT=Path('apps/client/src/fps/models/timber-yard');OUT.mkdir(parents=True,exist_ok=True)
manifest=json.loads((SOURCE/'meshy-props/manifest.json').read_text());catalog={}
for p in manifest['props']:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 name=p['name'];bpy.ops.import_scene.gltf(filepath=str((SOURCE/'meshy-props'/p['modelPath']).resolve()))
 bpy.context.view_layer.update();meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 points=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
 lo=Vector([min(v[i] for v in points) for i in range(3)]);hi=Vector([max(v[i] for v in points) for i in range(3)]);size=hi-lo
 targets={'timber-log-cradle':(3.4,2,4.5),'timber-plank-pallet':(2.2,1.3,2.2),'timber-forklift':(3.5,2.5,1.4),'timber-saw-bench':(2.7,1.3,1.2),'timber-capture-terminal':(1.4,3,1.2),'timber-shipping-container':(6.1,2.59,2.44)}
 t=targets[name];factor=min(t[0]/size.x,t[1]/size.z,t[2]/size.y)
 yaw=math.pi/2 if name=='timber-forklift' else 0
 transform=Matrix.Rotation(yaw,4,'Z')@Matrix.Scale(factor,4)@Matrix.Translation(Vector((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z)))
 for o in meshes:
  o.data.transform(transform@o.matrix_world);o.parent=None;o.matrix_world=Matrix.Identity(4)
  for mat in o.data.materials:
   if not mat or not mat.use_nodes:continue
   shader=mat.node_tree.nodes.get('Principled BSDF')
   if shader:shader.inputs['Roughness'].default_value=.38;shader.inputs['Coat Weight'].default_value=.16
   for node in mat.node_tree.nodes:
    if node.type=='TEX_IMAGE' and node.image:
     img=node.image
     if max(img.size)>1024:img.scale(1024,1024)
     img.file_format='JPEG';img.pack()
 bpy.ops.export_scene.gltf(filepath=str((OUT/(name+'.glb')).resolve()),export_format='GLB',export_animations=False,export_image_format='JPEG',export_jpeg_quality=88)
 catalog[name]={'width':round((size.y if yaw else size.x)*factor,5),'height':round(size.z*factor,5),'depth':round((size.x if yaw else size.y)*factor,5),'uniformSourceScale':factor}
(OUT/'catalog.json').write_text(json.dumps(catalog,indent=2)+'\n')
# Open gate poses and matching collision transforms are baked into this derivative.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str((SOURCE/'timber-yard-architecture.glb').resolve()))
for o in bpy.context.scene.objects:
 if o.type=='EMPTY' and 'sliding-gate-leaf' in o.name:
  o.animation_data_clear();o.location.x=-8.25
 if o.type=='EMPTY' and 'pedestrian-gate-hinge' in o.name:
  o.animation_data_clear();o.rotation_mode='XYZ';o.rotation_euler.z=-math.pi/2
bpy.ops.export_scene.gltf(filepath=str((OUT/'architecture.glb').resolve()),export_format='GLB',export_animations=False)
kit=json.loads((SOURCE/'manifest.json').read_text());boxes=[]
for p in kit['placements']:
 for c in kit['modules'][p['module']]['colliders']:
  x,y,z=c['center'];w,h,d=c['size']
  if c['parent']=='sliding-gate-leaf':x-=8.25;z-=.42
  if c['parent']=='pedestrian-gate-hinge':x,z=-.84-z,x;w,d=d,w
  a=p['yaw'];cs,sn=math.cos(a),math.sin(a)
  boxes.append({'x':p['position'][0]+x*cs+z*sn,'y':y-h/2+p['position'][1],'z':p['position'][2]-x*sn+z*cs,'width':abs(w*cs)+abs(d*sn),'height':h,'depth':abs(w*sn)+abs(d*cs),'projectile':c['blocksProjectiles'],'name':c['name']})
(OUT/'colliders.json').write_text(json.dumps(boxes,indent=2)+'\n')
