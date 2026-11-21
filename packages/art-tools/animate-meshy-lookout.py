"""Animate the user's Meshy rig without altering the original upload.
Keep three native actions; author weapon grip/fire clips using geometric two-bone solves,
then bake FK keys for glTF. Save full-detail editable source, export a lighter review copy.
"""
import bpy,math,json,os,hashlib,shutil,struct
from mathutils import Vector,Matrix,Quaternion
KIND=os.environ.get('MESHY_NPC','lookout')
if KIND not in ['lookout','police','swat']:raise ValueError(KIND)
WEAPON='Rifle' if KIND=='swat' else 'Pistol'
ROOT=os.getcwd();OUT=ROOT+'/art/characters/meshy-'+KIND;CLIENT=ROOT+'/apps/client/src/fps/models/meshy-'+KIND
UPLOAD=ROOT+'/../attachments/f78b26db-5f8c-42b1-81ca-ad600cc6d3c6/Meshy_AI_Urban_Lime_Scout_20261121_animated_mixamo_All_animation.glb'
UPLOAD=os.environ.get('MESHY_UPLOAD',UPLOAD)
ORIGINAL=OUT+'/original.glb'
os.makedirs(OUT,exist_ok=True);os.makedirs(CLIENT,exist_ok=True)
if not os.path.exists(ORIGINAL):
 if KIND!='lookout' and 'MESHY_UPLOAD' not in os.environ:raise RuntimeError('Supply the correct original via MESHY_UPLOAD')
 shutil.copyfile(UPLOAD,ORIGINAL)
sha=hashlib.sha256(open(ORIGINAL,'rb').read()).hexdigest()
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
bpy.ops.import_scene.gltf(filepath=ORIGINAL)
# Load embedded textures from stable local files. Resizing packed GLB images can
# discard their buffers in headless Blender; never resize those packed originals.
raw=open(ORIGINAL,'rb').read();jn=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+jn]);binary=raw[28+jn:]
TEMP=ROOT+'/work/'+KIND+'-textures';os.makedirs(TEMP,exist_ok=True);texture_paths={};texture_hashes={};material_images=[]
for i,image in enumerate(doc.get('images',[])):
 view=doc['bufferViews'][image['bufferView']];path=TEMP+'/source-'+str(i)+'.jpg';open(path,'wb').write(binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]);texture_paths[i]=path;texture_hashes[hashlib.sha256(open(path,'rb').read()).hexdigest()]=i
for material in bpy.data.materials:
 if not material.use_nodes:continue
 for node in material.node_tree.nodes:
  if node.type!='TEX_IMAGE' or not node.image:continue
  old=node.image;index=texture_hashes.get(hashlib.sha256(bytes(old.packed_file.data)).hexdigest()) if old.packed_file else None
  if index is None:raise RuntimeError('Cannot identify original embedded texture '+old.name)
  im=bpy.data.images.load(texture_paths[index],check_existing=False);im.colorspace_settings.name=old.colorspace_settings.name;node.image=im;material_images.append((node,index,old.colorspace_settings.name))
scene=bpy.context.scene;import_fps=scene.render.fps;scene.render.fps=30
rig=next(o for o in scene.objects if o.type=='ARMATURE');meshes=[o for o in scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' and m.object==rig for m in o.modifiers)];rig['originalSha256']=sha;rig['animationSource']='Three Meshy clips plus Blender-authored '+WEAPON+' clips';rig['clothingSlot']='base'
rig.animation_data_create()
for track in list(rig.animation_data.nla_tracks):rig.animation_data.nla_tracks.remove(track)
native=list(bpy.data.actions)
for a in native:
 for name in ['Running','Walking','CrouchLookAroundBow','Idle_3','Regular_Jump']:
  if a.name.startswith(name):a.name=name
 a.use_fake_user=True
 for fc in a.fcurves:
  for key in fc.keyframe_points:
   key.co.x*=30/import_fps;key.handle_left.x*=30/import_fps;key.handle_right.x*=30/import_fps
# Bind channels remain untouched in the source; the original file is retained byte-for-byte.
rig.animation_data.action=next(a for a in native if a.name=='Idle_3');scene.frame_set(0);bpy.context.view_layer.update()
base={p.name:(p.location.copy(),p.rotation_quaternion.copy(),p.scale.copy()) for p in rig.pose.bones}
rig.animation_data.action=None
for p in rig.pose.bones:p.rotation_mode='QUATERNION'
def reset():
 for p in rig.pose.bones:
  p.location,p.rotation_quaternion,p.scale=[v.copy() for v in base[p.name]]
 bpy.context.view_layer.update()
def joint(n):return rig.pose.bones['mixamorig:'+n]
def orient(pb,start,direction):
 rest=pb.bone;old=(rest.tail_local-rest.head_local).normalized();q=old.rotation_difference(direction.normalized())@rest.matrix_local.to_quaternion()
 pb.matrix=Matrix.Translation(start)@q.to_matrix().to_4x4();bpy.context.view_layer.update()
def arm(side,wrist,forward=(0,-1,0)):
 label='Left' if side==1 else 'Right';upper=joint(label+'Arm');fore=joint(label+'ForeArm');hand=joint(label+'Hand')
 start=upper.head.copy();delta=Vector(wrist)-start;l1=upper.bone.length;l2=fore.bone.length;dist=max(.035,min(delta.length,l1+l2-.002));direction=delta.normalized();w=start+direction*dist
 pole=Vector((side*.65,.03,.65))-start;pole=(pole-direction*pole.dot(direction)).normalized();along=(l1*l1-l2*l2+dist*dist)/(2*dist);height=math.sqrt(max(0,l1*l1-along*along));elbow=start+direction*along+pole*height
 orient(upper,start,elbow-start);orient(fore,elbow,w-elbow);orient(hand,w,Vector(forward))
 # Curl available articulated finger chains around the weapon grip.
 for digit in ['Index','Middle','Ring','Pinky','Thumb']:
  for segment in [1,2,3]:
   pb=rig.pose.bones.get('mixamorig:'+label+'Hand'+digit+str(segment))
   if pb:pb.rotation_quaternion=base[pb.name][1]@Quaternion((1,0,0),.45 if digit=='Thumb' else .8)
def smooth(t):return t*t*(3-2*t)
def interp(keys,t):
 for i in range(1,len(keys)):
  if t<=keys[i][0]:
   a,b=keys[i-1],keys[i];v=smooth((t-a[0])/(b[0]-a[0]));return [x+(y-x)*v for x,y in zip(a[1],b[1])]
 return keys[-1][1]
def holds(kind):
 if kind=='Pistol':return {1:(.035,-.30,1.09),-1:(-.035,-.33,1.12)}
 if kind=='SMG':return {1:(-.035,-.37,1.10),-1:(-.055,-.29,1.10)}
 if kind=='Sniper':return {1:(-.035,-.40,1.12),-1:(-.055,-.29,1.12)}
 return {1:(-.035,-.39,1.10),-1:(-.055,-.29,1.10)}
authored=[]
def action(name,duration,pose):
 a=bpy.data.actions.new(name);a.use_fake_user=True;rig.animation_data.action=a;frames=max(2,round(duration*30))
 for frame in range(frames+1):
  scene.frame_set(frame);reset();pose(frame/frames)
  for pb in rig.pose.bones:
   pb.keyframe_insert('location',frame=frame,group=pb.name);pb.keyframe_insert('rotation_quaternion',frame=frame,group=pb.name);pb.keyframe_insert('scale',frame=frame,group=pb.name)
 for fc in a.fcurves:
  for k in fc.keyframe_points:k.interpolation='LINEAR'
 authored.append(a);rig.animation_data.action=None

for name,duration in [(WEAPON+'_Hold',1),(WEAPON+'_Fire',.25)]:
 def pose(t,name=name):
  recoil=math.sin(math.pi*t)*.025 if name.endswith('Fire') else 0
  for side,w in holds(WEAPON).items():arm(side,Vector(w)+Vector((0,recoil,recoil)))
 action(name,duration,pose)
reset();rig.animation_data.action=None
# Keep all actions discoverable in Blender and export them by their clean names.
for a in native+authored:
 tr=rig.animation_data.nla_tracks.new();tr.name=a.name;tr.strips.new(a.name,0,a);tr.mute=True
# Add editable hand sockets for future game attachment; no weapon geometry is baked in.
for side in ['Left','Right']:
 socket=bpy.data.objects.new(side.lower()+'-weapon-socket',None);bpy.context.collection.objects.link(socket);socket.parent=rig;socket.parent_type='BONE';socket.parent_bone='mixamorig:'+side+'Hand';socket.location=(0,0,0);socket['purpose']='Adjust grip alignment when attaching game weapons'
# Save the original full-detail mesh, textures, rig, and all actions as editable source.
for im in bpy.data.images:
 if im.source=='FILE' and not im.packed_file and im.size[0]>0:
  try:im.pack()
  except RuntimeError:pass
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/animated-character.blend')
# Preserve the already lightweight mesh; reduce only runtime texture resolution.
original_triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
optimized={}
for node,index,colorspace in material_images:
 if index not in optimized:
  im=bpy.data.images.load(texture_paths[index],check_existing=False);im.colorspace_settings.name=colorspace
  _=im.pixels[0];factor=min(1,1024/im.size[0],1024/im.size[1]);im.scale(round(im.size[0]*factor),round(im.size[1]*factor));im.filepath_raw=TEMP+'/review-'+str(index)+'.jpg';im.file_format='JPEG';im.save()
  fresh=bpy.data.images.load(im.filepath_raw,check_existing=False);fresh.colorspace_settings.name=colorspace;optimized[index]=fresh
 node.image=optimized[index]
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o in meshes:o.select_set(True)
for o in rig.children:
 if o.type=='EMPTY':o.select_set(True)
scene.frame_set(0);reset();rig.animation_data.action=None
bpy.ops.export_scene.gltf(filepath=CLIENT+'/animated.glb',export_format='GLB',use_selection=True,export_animation_mode='ACTIONS',export_anim_single_armature=False,export_skins=True,export_extras=True,export_image_format='JPEG',export_jpeg_quality=85)
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
report={'originalSha256':sha,'originalTriangles':original_triangles,'reviewTriangles':triangles,'bones':len(rig.data.bones),'nativeClips':[a.name for a in native],'authoredClips':[{'name':a.name,'duration':float(a.frame_range.y-a.frame_range.x)/30} for a in authored],'reviewBytes':os.path.getsize(CLIENT+'/animated.glb'),'notes':['Original upload and editable Blender source retained.','Original topology preserved; runtime textures limited to 1024px.','Uploaded rig retained with authored '+WEAPON+' grip and fire clips.','Used for the '+KIND+' NPC only.']}
json.dump(report,open(OUT+'/report.json','w'),indent=2);print(json.dumps(report))
