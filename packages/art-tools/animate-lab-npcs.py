"""Rig the three original Meshy lab NPCs and author all motion in Blender.
Original GLBs and topology stay untouched; runtime exports have 1024px textures.
Bone heat runs on a closed voxel proxy; weights transfer back to the original mesh.
"""
import bpy,math,json,hashlib,struct,os
from pathlib import Path
from mathutils import Vector,Matrix,Quaternion
ROOT=Path('art/characters/north-lab');CLIENT=Path('apps/client/src/fps/models/north-lab-npcs');REPORT=[]
for kind,weapon,shoulder,elbow,wrist,legx,reloadtime in [('easy-worker','Pistol',.20,.28,.34,.12,1.6),('medium-security','Rifle',.23,.32,.37,.15,2.0),('hard-enforcer','LMG',.30,.40,.44,.18,3.0)]:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0;scene=bpy.context.scene;scene.render.fps=30
 original=Path('art/models/north-lab-npcs')/(kind+'.glb');sha=hashlib.sha256(original.read_bytes()).hexdigest();bpy.ops.import_scene.gltf(filepath=str(original));meshes=[o for o in scene.objects if o.type=='MESH']
 vs=[o.matrix_world@v.co for o in meshes for v in o.data.vertices];lo=Vector([min(p[k]for p in vs)for k in range(3)]);hi=Vector([max(p[k]for p in vs)for k in range(3)]);factor=2/(hi.z-lo.z);center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
 for o in meshes:
  matrix=o.matrix_world.copy();o.parent=None
  for v in o.data.vertices:v.co=(matrix@v.co-center)*factor
  o.matrix_world=Matrix.Identity(4)
 # Texture source buffers are extracted first, avoiding packed-buffer loss on resize.
 raw=original.read_bytes();jn=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+jn]);binary=raw[28+jn:];temp=Path('work/lab-npc-textures')/kind;temp.mkdir(parents=True,exist_ok=True);image_paths={}
 for i,image in enumerate(doc.get('images',[])):
  view=doc['bufferViews'][image['bufferView']];data=binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']];path=temp/f'source-{i}.png';path.write_bytes(data);image_paths[hashlib.sha256(data).hexdigest()]=path
 image_nodes=[]
 for m in bpy.data.materials:
  if not m.use_nodes:continue
  p=m.node_tree.nodes.get('Principled BSDF')
  if p:p.inputs['Roughness'].default_value=.42;p.inputs['Coat Weight'].default_value=.12
  for node in m.node_tree.nodes:
   if node.type=='TEX_IMAGE' and node.image:
    old=node.image;key=hashlib.sha256(bytes(old.packed_file.data)).hexdigest() if old.packed_file else None;path=image_paths.get(key)
    if path:im=bpy.data.images.load(str(path),check_existing=False);im.colorspace_settings.name=old.colorspace_settings.name;node.image=im;image_nodes.append((node,path))
 arm=bpy.data.armatures.new('Lab humanoid skeleton');rig=bpy.data.objects.new('LabRig',arm);scene.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 def bone(name,head,tail,parent=None):
  b=arm.edit_bones.new('Lab'+name);b.head=head;b.tail=tail
  if parent:b.parent=arm.edit_bones['Lab'+parent]
  return b
 bone('Root',(0,0,0),(0,0,.12));bone('Hips',(0,0,.88),(0,0,.98),'Root');bone('Spine',(0,0,.98),(0,0,1.13),'Hips');bone('Chest',(0,0,1.13),(0,0,1.38),'Spine');bone('Neck',(0,0,1.38),(0,0,1.52),'Chest');bone('Head',(0,0,1.52),(0,0,1.88),'Neck')
 for side,label in [(1,'Left'),(-1,'Right')]:
  bone(label+'Shoulder',(0,0,1.35),(side*shoulder,0,1.36),'Chest');bone(label+'Arm',(side*shoulder,0,1.36),(side*elbow,0,1.09),label+'Shoulder');bone(label+'ForeArm',(side*elbow,0,1.09),(side*wrist,0,.91),label+'Arm');bone(label+'Hand',(side*wrist,0,.91),(side*wrist,0,.80),label+'ForeArm')
  bone(label+'UpLeg',(side*legx,0,.88),(side*legx,0,.50),'Hips');bone(label+'Leg',(side*legx,0,.50),(side*legx,0,.15),label+'UpLeg');bone(label+'Foot',(side*legx,0,.15),(side*legx,-.10,.07),label+'Leg');bone(label+'Toe',(side*legx,-.10,.07),(side*legx,-.22,.07),label+'Foot')
 bpy.ops.object.mode_set(mode='OBJECT');rig['sourceSHA256']=sha;rig['sourceMeshyTask']=next(x['taskId'] for x in json.loads(Path('art/models/north-lab-npcs/meshy-tasks.json').read_text())['models'] if x['name']==kind);rig['animationSource']='Blender-authored skeleton, weights and keyframes';rig['labNpc']=kind
 def distance(point,name):
  b=arm.bones['Lab'+name];a=b.head_local;c=b.tail_local;v=c-a;t=max(0,min(1,(point-a).dot(v)/v.length_squared));return (point-a-t*v).length
 counts={}
 for mesh in meshes:
  proxy=mesh.copy();proxy.data=mesh.data.copy();scene.collection.objects.link(proxy);bpy.context.view_layer.objects.active=proxy
  bpy.ops.object.select_all(action='DESELECT');proxy.select_set(True)
  proxy.data.remesh_voxel_size=.025;bpy.ops.object.voxel_remesh()
  rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.parent_set(type='ARMATURE_AUTO')
  if not any(v.groups for v in proxy.data.vertices):raise RuntimeError('Proxy bone heat weighting failed')
  from mathutils.kdtree import KDTree
  tree=KDTree(len(proxy.data.vertices))
  for v in proxy.data.vertices:tree.insert(v.co,v.index)
  tree.balance()
  for g in proxy.vertex_groups:mesh.vertex_groups.new(name=g.name)
  for v in mesh.data.vertices:
   weights={}
   for co,j,dist in tree.find_n(v.co,4):
    for g in proxy.data.vertices[j].groups:weights[g.group]=weights.get(g.group,0)+g.weight/max(.001,dist)**2
   top=sorted(weights.items(),key=lambda item:item[1],reverse=True)[:4];total=sum(w for k,w in top)
   for k,w in top:mesh.vertex_groups[k].add([v.index],w/total,'REPLACE')
  for group in mesh.vertex_groups:counts[group.name]=sum(1 for v in mesh.data.vertices if any(g.group==group.index and g.weight>.001 for g in v.groups))
  # Meshy hands touch pockets/coattails in the source pose. Prevent heat leaking
  # across those contacts by separating white skin from colored clothing.
  image=next(node.image for material in mesh.data.materials if material.use_nodes for node in material.node_tree.nodes if node.type=='TEX_IMAGE' and node.image)
  pixels=list(image.pixels);iw,ih=image.size;uvs={}
  for loop in mesh.data.loops:uvs.setdefault(loop.vertex_index,mesh.data.uv_layers.active.data[loop.index].uv.copy())
  for v in mesh.data.vertices:
   x,y,z=v.co
   if not(.66<z<1.04):continue
   uv=uvs[v.index];index=(min(ih-1,max(0,int(uv.y*ih)))*iw+min(iw-1,max(0,int(uv.x*iw))))*4;color=pixels[index:index+3];white=min(color)>.40 and max(color)-min(color)<.20
   label='Left' if x>=0 else 'Right'
   if white and abs(x)>.23:target='Lab'+label+'Hand'
   elif not white and abs(x)<wrist-.025:target='LabHips' if z>.78 or kind=='easy-worker' else 'Lab'+label+'UpLeg'
   else:continue
   for group in mesh.vertex_groups:group.remove([v.index])
   mesh.vertex_groups[target].add([v.index],1,'REPLACE')
  # Smooth the retouched contact boundaries without changing the source mesh.
  neighbors=[set() for v in mesh.data.vertices]
  weld=KDTree(len(mesh.data.vertices))
  for v in mesh.data.vertices:weld.insert(v.co,v.index)
  weld.balance()
  for edge in mesh.data.edges:
   a,b=edge.vertices;neighbors[a].add(b);neighbors[b].add(a)
  for v in mesh.data.vertices:
   for co,j,d in weld.find_range(v.co,.015):
    if j!=v.index:neighbors[v.index].add(j)
  values=[{g.group:g.weight for g in v.groups} for v in mesh.data.vertices]
  for iteration in range(8):
   result=[]
   for i,adj in enumerate(neighbors):
    weights={k:w*.5 for k,w in values[i].items()}
    for j in adj:
     for k,w in values[j].items():weights[k]=weights.get(k,0)+w*.5/max(1,len(adj))
    result.append(weights)
   values=result
  for group in mesh.vertex_groups:group.remove(list(range(len(values))))
  for i,weights in enumerate(values):
   top=sorted(weights.items(),key=lambda v:v[1],reverse=True)[:4];total=sum(w for k,w in top)
   for k,w in top:mesh.vertex_groups[k].add([i],w/total,'REPLACE')
  bpy.data.objects.remove(proxy,do_unlink=True)
  mod=mesh.modifiers.new('Lab character skin','ARMATURE');mod.object=rig;mod.use_deform_preserve_volume=True;mesh.parent=rig
 rig.animation_data_create();actions=[]
 for p in rig.pose.bones:p.rotation_mode='QUATERNION'
 def reset():
  for p in rig.pose.bones:p.location=(0,0,0);p.rotation_quaternion=(1,0,0,0);p.scale=(1,1,1)
  bpy.context.view_layer.update()
 def rotate(name,axis,angle):rig.pose.bones['Lab'+name].rotation_quaternion=Quaternion(axis,angle)
 def orient(pb,start,direction):
  rest=pb.bone;old=(rest.tail_local-rest.head_local).normalized();q=old.rotation_difference(direction.normalized())@rest.matrix_local.to_quaternion();pb.matrix=Matrix.Translation(start)@q.to_matrix().to_4x4();bpy.context.view_layer.update()
 def solve(side,target,forward=(0,-1,0)):
  label='Left' if side==1 else 'Right';upper=rig.pose.bones['Lab'+label+'Arm'];fore=rig.pose.bones['Lab'+label+'ForeArm'];hand=rig.pose.bones['Lab'+label+'Hand'];start=upper.head.copy();delta=Vector(target)-start;l1=upper.bone.length;l2=fore.bone.length;dist=max(.03,min(delta.length,l1+l2-.003));direction=delta.normalized();end=start+direction*dist;pole=Vector((side*.7,.16,.95))-start;pole=(pole-direction*pole.dot(direction)).normalized();along=(l1*l1-l2*l2+dist*dist)/(2*dist);bend=math.sqrt(max(0,l1*l1-along*along));joint=start+direction*along+pole*bend;orient(upper,start,joint-start);orient(fore,joint,end-joint);orient(hand,end,Vector(forward))
 def grip(recoil=0,reload=0):
  right=Vector((-.04 if weapon=='Pistol' else -.08,-.32 if weapon=='Pistol' else -.29,1.15));left=Vector((.02,-.34,1.13) if weapon=='Pistol' else (.04,-.44,1.15))
  right+=Vector((0,recoil+reload*.08,recoil*.4+reload*.07));left+=Vector((0,recoil,0));left=left.lerp(Vector((.10,-.12,.88)),reload)
  solve(-1,right,(0,-1,-reload*.25));solve(1,left)
 def make(name,seconds,pose):
  a=bpy.data.actions.new(name);a.use_fake_user=True;rig.animation_data.action=a;frames=round(seconds*30)
  for frame in range(frames+1):
   scene.frame_set(frame);reset();pose(frame/frames)
   for pb in rig.pose.bones:
    pb.keyframe_insert('location',frame=frame,group=pb.name);pb.keyframe_insert('rotation_quaternion',frame=frame,group=pb.name);pb.keyframe_insert('scale',frame=frame,group=pb.name)
  for f in a.fcurves:
   for k in f.keyframe_points:k.interpolation='LINEAR'
  actions.append(a);rig.animation_data.action=None
 def idle(t):rig.pose.bones['LabHips'].location.z=.005*math.sin(t*math.tau);rotate('Chest',(1,0,0),.008*math.sin(t*math.tau))
 make('Idle',2,idle)
 def locomotion(t,run=False):
  for side,label in [(1,'Left'),(-1,'Right')]:
   wave=math.sin(t*math.tau+(0 if side==1 else math.pi));rotate(label+'UpLeg',(1,0,0),wave*(.65 if run else .38));rotate(label+'Leg',(1,0,0),max(0,-wave)*(.85 if run else .55));rotate(label+'Foot',(1,0,0),-.18*wave);rotate(label+'Arm',(1,0,0),-wave*.25)
  rig.pose.bones['LabHips'].location.z=(.02 if run else .01)*abs(math.sin(t*math.tau))
 make('Walk',1,lambda t:locomotion(t));make('Run',.7,lambda t:locomotion(t,True));make('Aim',1,lambda t:grip());make('Fire',.24,lambda t:grip(math.sin(math.pi*t)*(.018 if weapon=='Pistol' else .026)));make('Reload',reloadtime,lambda t:grip(0,math.sin(math.pi*min(1,t*1.15))**2))
 def hit(t):grip();rotate('Chest',(1,0,0),-.18*math.sin(math.pi*t))
 make('Hit',.35,hit)
 def death(t):
  q=t*t*(3-2*t);rig.pose.bones['LabHips'].location.z=-.80*q;rig.pose.bones['LabHips'].location.y=.2*q;rotate('Hips',(1,0,0),-math.pi/2*q)
  for label in ['Left','Right']:rotate(label+'Leg',(1,0,0),.35*q);rotate(label+'Arm',(0,0,1),(.35 if label=='Left' else -.35)*q)
 make('Death',1.2,death);reset();rig.animation_data.action=None
 for a in actions:track=rig.animation_data.nla_tracks.new();track.name=a.name;track.strips.new(a.name,0,a);track.mute=True
 socket=bpy.data.objects.new('lab-weapon-socket',None);scene.collection.objects.link(socket);socket.parent=rig;socket.parent_type='BONE';socket.parent_bone='LabRightHand';socket.location=(0,0,0);socket['purpose']='Right hand attachment; runtime calibrates the selected existing weapon'
 # Preserve full original texture resolution in the editable Blender source.
 for node,path in image_nodes:
  try:node.image.pack()
  except RuntimeError:pass
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/(kind+'.blend')))
 for node,path in image_nodes:
  im=bpy.data.images.load(str(path),check_existing=False);_=im.pixels[0];ratio=min(1,1024/max(im.size));im.scale(round(im.size[0]*ratio),round(im.size[1]*ratio));target=temp/'runtime.jpg';im.filepath_raw=str(target);im.file_format='JPEG';im.save();node.image=bpy.data.images.load(str(target),check_existing=False)
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);socket.select_set(True)
 for mesh in meshes:mesh.select_set(True)
 reset();rig.animation_data.action=None;scene.frame_set(0)
 bpy.ops.export_scene.gltf(filepath=str(CLIENT/(kind+'.glb')),export_format='GLB',use_selection=True,export_animation_mode='ACTIONS',export_anim_single_armature=False,export_skins=True,export_extras=True,export_image_format='JPEG',export_jpeg_quality=90)
 REPORT.append({'kind':kind,'weapon':weapon,'sourceSHA256':sha,'bones':len(arm.bones),'triangles':sum(len(p.vertices)-2 for m in meshes for p in m.data.polygons),'actions':[a.name for a in actions],'bytes':(CLIENT/(kind+'.glb')).stat().st_size,'textureMax':1024,'weightedBones':counts})
(ROOT/'animation-report.json').write_text(json.dumps(REPORT,indent=2)+'\n');print(json.dumps(REPORT))
