"""Prepare existing Meshy exports locally: uniform metre scale, floor pivots and mobile textures."""
import bpy, math, hashlib
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
SOURCE=Path('art/buildings/block-mart/meshy-props')
# The chosen dimension determines one uniform factor; no model is stretched.
TARGETS={'retail-shelf':('height',1.75,1024),'checkout-counter':('width',3.0,1024),'refrigerator':('height',2.35,1024),'stock-boxes':('height',1.0,512),'roof-ac':('width',1.25,512),'roof-vent':('height',.75,512),'exterior-light':('width',.65,512),'security-camera':('longest',.62,512),'rain-downpipe':('height',4.1,512)}
def bounds(root):
 pts=[o.matrix_world@Vector(v)for o in root.children_recursive if o.type=='MESH'for v in o.bound_box]
 return [min(v[i]for v in pts)for i in range(3)],[max(v[i]for v in pts)for i in range(3)]
def counter_footprint(root):
 """Project occupied mesh columns, preserving the U counter's actual cashier opening."""
 verts=[];faces=[]
 for o in root.children_recursive:
  if o.type!='MESH':continue
  offset=len(verts);verts.extend(o.matrix_world@v.co for v in o.data.vertices);faces.extend([offset+i for i in p.vertices]for p in o.data.polygons)
 tree=BVHTree.FromPolygons(verts,faces);low,high=bounds(root);step=.1
 nx=math.ceil((high[0]-low[0])/step);ny=math.ceil((high[1]-low[1])/step)
 cells={}
 for iy in range(ny):
  for ix in range(nx):
   x=low[0]+(ix+.5)*step;y=low[1]+(iy+.5)*step
   hit=tree.ray_cast(Vector((x,y,high[2]+.02)),Vector((0,0,-1)),high[2]+.03)[0]
   if hit is not None and hit.z>.02:cells[(ix,iy)]=min(high[2],math.ceil(hit.z/step)*step)
 rects=[]
 while cells:
  ix,iy=min(cells,key=lambda p:(p[1],p[0]));height=cells[(ix,iy)];ex=ix+1
  while cells.get((ex,iy))==height:ex+=1
  ey=iy+1
  while all(cells.get((x,ey))==height for x in range(ix,ex)):ey+=1
  for x in range(ix,ex):
   for y in range(iy,ey):del cells[(x,y)]
  # Convert Blender XY footprint into glTF XZ coordinates.
  rects.append({'min':[low[0]+ix*step,0,-min(high[1],low[1]+ey*step)],'max':[min(high[0],low[0]+ex*step),height,-(low[1]+iy*step)]})
 return rects

def prepare_meshy_modules(components,part_report,parts,export,members):
 metadata={};collision={}
 for name,(dimension,target,pixels)in TARGETS.items():
  for o in members(components[name]):bpy.data.objects.remove(o,do_unlink=True)
  before=set(bpy.data.objects);source=SOURCE/'models'/(name+'.glb');bpy.ops.import_scene.gltf(filepath=str(source.resolve()));imported=[o for o in bpy.data.objects if o not in before]
  bpy.context.view_layer.update();meshes=[o for o in imported if o.type=='MESH']
  # Preserve the source's world-space shape before setting a common module frame.
  for o in meshes:
   o.data.transform(o.matrix_world);o.parent=None;o.matrix_world=Matrix.Identity(4)
  for o in imported:
   if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
  pts=[Vector(v)for o in meshes for v in o.bound_box];low=Vector([min(v[i]for v in pts)for i in range(3)]);high=Vector([max(v[i]for v in pts)for i in range(3)]);size=high-low
  measured=size.z if dimension=='height' else size.x if dimension=='width' else max(size)
  factor=target/measured;center=Vector(((low.x+high.x)/2,(low.y+high.y)/2,low.z))
  transform=Matrix.Rotation(math.pi,4,'Z')@Matrix.Scale(factor,4)@Matrix.Translation(-center)
  root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root);root['module']=name;root['source']='meshy-original-art';root['sourceSha256']=hashlib.sha256(source.read_bytes()).hexdigest();root['uniformSourceScale']=factor
  images=set()
  for o in meshes:
   o.data.transform(transform);o.parent=root;o.name='meshy-'+name;o['part']='interior'if name in ['retail-shelf','checkout-counter','refrigerator','stock-boxes']else'roof'if name in ['roof-ac','roof-vent']else'utility'
   for mat in o.data.materials:
    mat.name='meshy-'+name;shader=mat.node_tree.nodes.get('Principled BSDF')
    if shader:
     shader.inputs['Roughness'].default_value=.4 if name=='stock-boxes'else .34;shader.inputs['Metallic'].default_value=.08;shader.inputs['Coat Weight'].default_value=.12
    for node in mat.node_tree.nodes:
     if node.type=='TEX_IMAGE'and node.image:images.add(node.image)
  for image in images:
   image.scale(pixels,pixels);image.pack()
  bpy.context.view_layer.update();components[name]=root
  if name=='checkout-counter':collision[name]=counter_footprint(root)
  part_report[name]=export(root,parts/(name+'.glb'))
  lo,hi=bounds(root);part_report[name]['size']=[hi[0]-lo[0],hi[2]-lo[2],hi[1]-lo[1]]
  metadata[name]={'sourceSha256':root['sourceSha256'],'sourceDimension':dimension,'targetMetres':target,'uniformScale':factor,'textureSize':pixels,'runtimeTextureFormat':'JPEG','runtimeTextureQuality':90,'preparedSize':part_report[name]['size']}
  for o in members(root):o.hide_render=True;o.name='library::'+o.name
 return metadata,collision
