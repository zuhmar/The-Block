"""Prepare uploaded warehouse/props for the existing building footprint and collision reservations."""
import bpy,bmesh,os,json,struct,hashlib,math
from mathutils import Vector,Matrix
OUT='art/buildings/meshy-warehouse';CLIENT='apps/client/src/fps/models/meshy-warehouse';TEMP='work/warehouse-textures'
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
    fresh=bpy.data.images.load(paths[key],check_existing=False);fresh.colorspace_settings.name=cs;_=fresh.pixels[0];f=min(1,1024/fresh.size[0],1024/fresh.size[1]);fresh.scale(round(fresh.size[0]*f),round(fresh.size[1]*f));fresh.filepath_raw=paths[key]+'.mobile.jpg';fresh.file_format='JPEG';fresh.save();optimized[key]=bpy.data.images.load(fresh.filepath_raw,check_existing=False);optimized[key].colorspace_settings.name=cs
   node.image=optimized[key]
 o.name=name;o['sourceDimensions']=list(size);o['originalSha256']=report['sources'][name];o['source']='meshy';report['props'][name]={'originalTriangles':original,'triangles':triangles(o)}
 return o

def export(objects,path):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_extras=True,export_image_format='JPEG',export_jpeg_quality=85)
for name,target in [('parcels',2200),('packing-station',5000),('pallet',4000),('pallet-jack',4000),('cabinet',3000),('rack',6500)]:
 o=imported(name,target);native=o['sourceDimensions'];o.scale=tuple(v/max(native) for v in native);export([o],CLIENT+'/'+name+'.glb');o.scale=(1,1,1);library[name]=o;o.hide_render=True;o.hide_set(True)
root=bpy.data.objects.new('warehouse-building',None);bpy.context.collection.objects.link(root);root['source']='meshy-blender';root['layoutWidth']=12;root['layoutDepth']=9;root['buildingIndex']=4
parts=[]
def mat(name,color,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.33;p.inputs['Metallic'].default_value=metal;p.inputs['Coat Weight'].default_value=.2;return m
blue=mat('blue powder-coated steel',(.10,.23,.34),.28);trim=mat('steel trim',(.24,.31,.37),.45);dark=mat('dark blue door',(.035,.075,.11),.25);floor=mat('concrete',(.26,.29,.30));inside=mat('interior steel panels',(.40,.48,.51),.16);yellow=mat('safety yellow',(.85,.48,.07),.15)
def box(name,x,y,z,w,d,h,material,role='shell'):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.name=name;o.dimensions=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material);o['part']=role;o.parent=root;parts.append(o);return o
shell=imported('warehouse',23000);shell.hide_set(False);shell.data.transform(Matrix.Diagonal(Vector((12,9,5.3,1)))@Matrix.Rotation(math.pi,4,'Z'))
# Remove the fused entrance/front wall; retain the uploaded roof and side/rear silhouette.
bm=bmesh.new();bm.from_mesh(shell.data);remove=[f for f in bm.faces if (f.calc_center_median().y>2.9 and f.calc_center_median().z<3.75) or f.calc_center_median().z>4.4];bmesh.ops.delete(bm,geom=remove,context='FACES');bm.to_mesh(shell.data);bm.free()
shell.data.materials.clear()
for m in [blue,trim]:shell.data.materials.append(m)
for p in shell.data.polygons:p.material_index=1 if p.center.z>4.1 or p.center.z<.15 else 0
shell['part']='shell';shell.parent=root;parts.append(shell);root['originalSha256']=report['sources']['warehouse']
# Resurface the scan's thin/noisy walls and roof at the existing collision boundaries.
for side in [-1,1]:
 box('clean side cladding',side*5.99,2.32,0,.12,9,4.64,blue)
 for j in range(40):box('side corrugation',side*6.06,2.32,-4.38+j*.224,.035,.035,4.55,blue)
 panel=box('resurfaced roof',side*3.075,4.985,0,6.2,9.3,.09,trim);panel.rotation_euler.y=side*math.atan(.67/6.15)
box('clean back cladding',0,2.32,4.49,12,.12,4.64,blue)
box('upper front cladding',0,3.98,-4.49,12,.12,1.36,blue)
for side in [-1,1]:
 mesh=bpy.data.meshes.new('gable panel');mesh.from_pydata([(-6.14,side*4.5,4.63),(6.14,side*4.5,4.63),(0,side*4.5,5.32)],[],[(0,2,1) if side>0 else (0,1,2)]);mesh.materials.append(blue)
 gable=bpy.data.objects.new('closed gable',mesh);bpy.context.collection.objects.link(gable);gable.parent=root;gable['part']='shell';parts.append(gable)
box('roof ridge',0,5.34,0,.14,9.4,.08,trim)
for j in range(33):
 x=-6.05+j*12.1/32
 box('roof seam',x,5.32-abs(x)*.67/6.15+.06,0,.035,9.3,.025,trim)
# Exact existing 12 x 9 footprint; front is game Z=-4.5, Blender Y=+4.5.
for s in [-1,1]:
 box('front wall',s*3.45,1.65,-4.5,5.1,.20,3.3,blue)
 box('front side continuation',s*5.95,1.65,-3.7,.18,1.6,3.3,blue)
 for i in range(27):
  x=s*(1.0+i*.185)
  if abs(x)<5.95:box('front corrugation',x,1.65,-4.62,.035,.035,3.22,blue)
box('door lintel',0,3.08,-4.5,1.8,.22,.46,trim)
# Floor and inward-facing lining make the exterior scan a usable room.
box('warehouse floor',0,-.04,0,11.9,8.9,.08,floor,'interior')
box('interior ceiling',0,3.3,0,11.7,8.7,.10,inside,'interior')
for s in [-1,1]:box('interior side',s*5.8,1.65,0,.10,8.75,3.3,inside,'interior')
box('interior back',0,1.65,4.3,11.7,.10,3.3,inside,'interior')
for s in [-1,1]:box('interior front',s*3.45,1.65,-4.36,5.1,.06,3.3,inside,'interior')
# A closed loading shutter is decoration; only the centered pedestrian door operates.
box('loading shutter',3.5,1.38,-4.65,3.2,.06,2.55,trim)
for i in range(18):box('shutter slat',3.5,.2+i*.14,-4.69,3.12,.035,.025,dark)
for s in [-1,1]:box('door jamb',s*.86,1.4,-4.5,.10,.28,2.8,trim)
hinge=bpy.data.objects.new('warehouse-door-hinge',None);bpy.context.collection.objects.link(hinge);hinge.parent=root;hinge.location=(-.8,4.5,0)
door=box('working warehouse door',0,1.4,-4.5,1.6,.14,2.8,dark,'door');handle=box('door pull',.58,1.25,-4.6,.06,.07,.36,yellow,'door')
bpy.context.view_layer.update()
for o in [door,handle]:mw=o.matrix_world.copy();o.parent=hinge;o.matrix_world=mw
# Furniture stays entirely inside the old fixture reservations; no new invisible blockers.
def place(name,x,z,w,d,h,y=0,turn=False):
 source=library[name];o=bpy.data.objects.new(name+' placed',source.data.copy());bpy.context.collection.objects.link(o)
 if turn:o.data.transform(Matrix.Rotation(math.pi/2,4,'Z'))
 pts=[v.co for v in o.data.vertices];lo=Vector([min(v[i] for v in pts) for i in range(3)]);hi=Vector([max(v[i] for v in pts) for i in range(3)]);size=hi-lo
 o.data.transform(Matrix.Diagonal(Vector((w/size.x,d/size.y,h/size.z,1))))
 o.location=(x,-z,y);o.parent=root;o['part']='interior';o['propSource']=name;parts.append(o);report['placements'].append({'name':name,'x':x,'z':z,'width':w,'depth':d,'height':h,'bottom':y});return o
for x in [-4.9,4.9]:
 for z in [-1.3,1.3]:place('rack',x,z,.95,2.05,2.5,turn=True)
for x in [-2,0]:place('pallet',x,3.3,1.3,1.05,.22)
place('parcels',-2,3.3,1.1,.90,.76,.22)
place('pallet-jack',0,3.3,1.25,1.05,.95)
place('packing-station',2.15,3.7,1.2,.8,1.18)
place('cabinet',3.1,3.7,.65,.7,1.65)
# Merge structural boxes by role/material for a small number of draw calls; keep door leaf separate.
for role in ['shell','interior','door']:
 for material in [blue,trim,dark,floor,inside,yellow]:
  group=[o for o in parts if o.type=='MESH' and o.get('part')==role and len(o.data.materials)==1 and o.data.materials[0]==material]
  if len(group)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in group:o.select_set(True)
  bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();combined=bpy.context.object;combined.name=role+' '+material.name
  parts=[o for o in parts if o not in group]+[combined]
# Bake joined mesh rotations so runtime bounds stay tight for rendering/culling.
for o in parts:
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
for im in bpy.data.images:
 if im.source=='FILE' and im.size[0]>0 and not im.packed_file:
  try:im.pack()
  except RuntimeError:pass
# Hide library-only prototypes in the editable source, include only the prepared building at runtime.
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/warehouse.blend',compress=True)
export([root,hinge]+parts,CLIENT+'/warehouse.glb')
report['buildingTriangles']=sum(triangles(o) for o in parts);report['buildingMeshes']=len(parts);report['buildingBytes']=os.path.getsize(CLIENT+'/warehouse.glb')
json.dump(report,open(OUT+'/report.json','w'),indent=2);print(json.dumps(report))
# Review exterior and cutaway with the same prepared source.
if os.environ.get('WAREHOUSE_SKIP_RENDERS'):raise SystemExit(0)
scene.render.resolution_x=1000;scene.render.resolution_y=760;scene.render.resolution_percentage=100
for position,power in [((4,9,12),2200),((-10,4,8),1600),((0,-8,10),2200)]:
 bpy.ops.object.light_add(type='AREA',location=position);o=bpy.context.object;o.data.energy=power;o.data.size=8;o.rotation_euler=(Vector((0,0,2))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(15,19,13));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,2))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=19;scene.camera=camera
scene.render.filepath=OUT+'/exterior.png';bpy.ops.render.render(write_still=True)
shell.hide_render=True
for o in parts:
 if o.get('part')!='interior' or o.name.startswith('interior ceiling') or o.name.startswith('interior interior steel') :o.hide_render=True
# Reveal all props and floor for layout review, without changing exported building.
scene.render.filepath=OUT+'/interior.png';bpy.ops.render.render(write_still=True)
