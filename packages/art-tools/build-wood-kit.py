"""Optimize uploaded wood modules and fit their snap envelopes and doorway opening."""
import bpy,bmesh,os,json,struct,hashlib,math
from mathutils import Vector,Matrix
OUT='art/building-kits/wood';CLIENT='apps/client/src/fps/models/build-wood';TEMP='work/wood-building-textures'
os.makedirs(TEMP,exist_ok=True);os.makedirs(CLIENT,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=False;scene.world=bpy.data.worlds.new('Studio');scene.world.color=(.25,.25,.25)
report={'sources':{},'props':{},'placements':[]};library={}
def triangles(o):return sum(len(p.vertices)-2 for p in o.data.polygons)
def imported(name,target):
 path=OUT+'/originals/'+name+'.glb';raw=open(path,'rb').read();report['sources'][name]=hashlib.sha256(raw).hexdigest();before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=path);o=next(o for o in set(bpy.data.objects)-before if o.type=='MESH')
 bpy.context.view_layer.objects.active=o;bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 o.data.transform(o.matrix_world);o.matrix_world=Matrix.Identity(4)
 pts=[v.co for v in o.data.vertices];lo=Vector([min(v[i] for v in pts) for i in range(3)]);hi=Vector([max(v[i] for v in pts) for i in range(3)])
 offset=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z));size=hi-lo
 o.data.transform(Matrix.Diagonal(Vector((1/size.x,1/size.y,1/size.z,1)))@Matrix.Translation(-offset))
 original=triangles(o)
 # Meshy UV seams can split coincident vertices; weld those before reduction so
 # thin boards and shelf uprights do not collapse into disconnected fragments.
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 mod=o.modifiers.new('Mobile topology','DECIMATE');mod.ratio=min(1,target/original);bpy.ops.object.modifier_apply(modifier=mod.name)
 for face in o.data.polygons:face.use_smooth=True
 o.data.set_sharp_from_angle(angle=.8)
 normal=o.modifiers.new('Clean weighted normals','WEIGHTED_NORMAL');normal.keep_sharp=True;bpy.ops.object.modifier_apply(modifier=normal.name)
 # Match embedded images by content, never by Blender's import-dependent image names.
 n=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+n]);binary=raw[28+n:];paths={}
 for i,img in enumerate(j.get('images',[])):
  v=j['bufferViews'][img['bufferView']];data=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];p=f'{TEMP}/{name}-{i}.jpg';open(p,'wb').write(data);paths[hashlib.sha256(data).hexdigest()]=p
 optimized={}
 for material in o.data.materials:
  if not material.use_nodes:continue
  for node in material.node_tree.nodes:
   if node.type!='TEX_IMAGE' or not node.image:continue
   im=node.image;key=hashlib.sha256(bytes(im.packed_file.data)).hexdigest() if im.packed_file else None
   if key not in paths:raise RuntimeError('Missing embedded image '+name)
   cs=im.colorspace_settings.name
   if key not in optimized:
    fresh=bpy.data.images.load(paths[key],check_existing=False);fresh.colorspace_settings.name=cs;_=fresh.pixels[0];edge=1024 if cs=='sRGB' else 512;f=min(1,edge/fresh.size[0],edge/fresh.size[1]);fresh.scale(round(fresh.size[0]*f),round(fresh.size[1]*f));fresh.filepath_raw=paths[key]+'.mobile.jpg';fresh.file_format='JPEG';fresh.save();optimized[key]=bpy.data.images.load(fresh.filepath_raw,check_existing=False);optimized[key].colorspace_settings.name=cs
   node.image=optimized[key]
 o.name=name;o['sourceDimensions']=list(size);o['originalSha256']=report['sources'][name];o['source']='meshy';report['props'][name]={'originalTriangles':original,'triangles':triangles(o)}
 return o

def export(objects,path):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_extras=True,export_image_format='JPEG',export_jpeg_quality=85)

from mathutils.bvhtree import BVHTree
parts=[]
for name,target in [('floor',1600),('wall',2600),('foundation',3600),('doorway',3600),('door',2200)]:
 o=imported(name,target)
 if name=='doorway':
  bpy.context.view_layer.update();tree=BVHTree.FromObject(o,bpy.context.evaluated_depsgraph_get())
  def solid(x,z):return tree.ray_cast(Vector((x,-2,z)),Vector((0,1,0)),4)[0] is not None
  left=next((-i/1000 for i in range(1,501) if solid(-i/1000,.4)),-.2)
  right=next((i/1000 for i in range(1,501) if solid(i/1000,.4)),.2)
  header=next((i/1000 for i in range(400,1001) if solid(0,i/1000)),.8)
  if not(-.45<left<-.05 and .05<right<.45 and .5<header<.98):raise RuntimeError('Cannot identify doorway opening')
  report['doorwayOriginalOpening']=[left,right,header]
  for v in o.data.vertices:
   x=v.co.x
   v.co.x=(-.56+(x-left)*.44/(left+.5)) if x<left else (.56+(x-right)*.44/(.5-right)) if x>right else -.56+(x-left)*1.12/(right-left)
   z=v.co.z;v.co.z=z*2.1/header if z<header else 2.1+(z-header)*.4/(1-header)
   v.co.y*=.16
 else:
  dims={'floor':(2,2,.18),'wall':(2,.16,2.5),'foundation':(2,2,.5),'door':(1.08,.10,2.06)}[name]
  o.data.transform(Matrix.Diagonal(Vector((*dims,1))))
 if name=='door':o.data.transform(Matrix.Translation((.54,0,0)));o['hingeOrigin']='left-bottom'
 o['part']=name;parts.append(o)
 export([o],CLIENT+'/'+name+'.glb');o.hide_render=True;o.hide_set(True)
for o in parts:o.hide_set(False);o.hide_render=False
# Put each editable piece next to its neighbours in the source library only.
for i,o in enumerate(parts):o.location=(i*3,0,0)
for im in bpy.data.images:
 if im.source=='FILE' and im.size[0]>0 and not im.packed_file:
  try:im.pack()
  except RuntimeError:pass
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/wood-kit.blend',compress=True)
report['runtimeBytes']=sum(os.path.getsize(CLIENT+'/'+n+'.glb') for n in ['floor','wall','foundation','doorway','door'])
json.dump(report,open(OUT+'/report.json','w'),indent=2);print(json.dumps(report))
