"""Reference-guided modular timber-yard architecture. Local Blender only; no paid generation."""
import bpy,bmesh,math,json,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path('art/building-kits/timber-yard');PARTS=ROOT/'parts';PARTS.mkdir(parents=True,exist_ok=True)
REF=Path('art/ai/pvp/timber-yard/reference.png');SHA=hashlib.sha256(REF.read_bytes()).hexdigest()
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
M={}
def linear(h):return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in [int(h[i:i+2],16)/255 for i in (0,2,4)])
for name,color in {'teal':'276d70','teal-dark':'1e4e54','cream':'e4d7bd','wood':'bb884e','wood-light':'d1a465','wood-dark':'825c3c','metal':'4a555a','wire':'57777a','yellow':'e6b43c','black':'343b3c','light':'fff0c8','ground':'b9ad96'}.items():
 m=bpy.data.materials.new('timber-'+name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*linear(color),1);p.inputs['Roughness'].default_value=.48 if name in ['cream','ground'] else .36;p.inputs['Coat Weight'].default_value=.18 if name.startswith('teal')else .08;p.inputs['Metallic'].default_value=.2 if name in ['metal','wire']else .02
 if name=='light':p.inputs['Emission Color'].default_value=(*linear(color),1);p.inputs['Emission Strength'].default_value=.45
 M[name]=m
modules={};specs={};current=None

def xyz(x,y,z):return Vector((x,-z,y))
def empty(name,parent=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;return o

def finish(o,name,mat,parent,part):
 o.name=name;o.parent=parent;o.data.materials.append(M[mat]);o['part']=part;return o

def box(name,x,y,z,w,h,d,mat='teal',parent=None,part='frame',bevel=.012):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata([(sx*w/2,sy*d/2,sz*h/2)for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]],[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.location=xyz(x,y,z);finish(o,name,mat,parent,part)
 if bevel:
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Glossy edge bevel','BEVEL');mod.width=min(bevel,w*.2,h*.2,d*.2);mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name);o.select_set(False)
 return o

def rod(name,a,b,r,mat,parent,part='frame',vertices=6):
 a,b=xyz(*a),xyz(*b);delta=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=delta.length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();o.select_set(False);return finish(o,name,mat,parent,part)

def prism(name,profile,depth,mat,parent,part='frame',axis='x'):
 # profile coordinates are horizontal and height; extrusion runs along the remaining axis.
 n=len(profile);verts=[xyz(u,y,z)if axis=='x'else xyz(z,y,u)for z in [-depth/2,depth/2]for u,y in profile];faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n)for i in range(n)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);return finish(o,name,mat,parent,part)

def collider(name,x,y,z,w,h,d,parent=None,projectiles=True):
 specs[current]['colliders'].append({'name':name,'center':[x,y,z],'size':[w,h,d],'parent':parent,'blocksMovement':True,'blocksProjectiles':projectiles})
def snap(root,name,x,y,z):
 o=empty(root.name+'-snap-'+name,root);o.location=xyz(x,y,z);o['snap']=name;specs[current]['snaps'][name]=[x,y,z]

def members(r):return [r,*r.children_recursive]
def batch(root):
 groups={}
 for o in list(root.children_recursive):
  if o.type!='MESH':continue
  p=o.parent;dynamic=False
  while p and p!=root:
   dynamic|=bool(p.get('animatedPart') or p.get('keepHierarchy'));p=p.parent
  if not dynamic:groups.setdefault((o.data.materials[0].name,o.get('part')),[]).append(o)
 bpy.context.view_layer.update()
 for (mat,part),objs in groups.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in objs:
   world=o.matrix_world.copy();o.parent=None;o.matrix_world=world;o.select_set(True)
  bpy.context.view_layer.objects.active=objs[0]
  if len(objs)>1:bpy.ops.object.join()
  o=bpy.context.object;world=o.matrix_world.copy();o.data=o.data.copy();o.data.transform(root.matrix_world.inverted()@world);o.parent=root;o.matrix_parent_inverse=Matrix.Identity(4);o.matrix_basis=Matrix.Identity(4);o['part']=part;o.name=root.name+'-'+str(part)+'-'+mat
 bpy.ops.object.select_all(action='DESELECT')

def export(root,path):
 bpy.ops.object.select_all(action='DESELECT')
 for o in members(root):o.select_set(True)
 bpy.context.view_layer.objects.active=root
 bpy.ops.export_scene.gltf(filepath=str(path.resolve()),export_format='GLB',use_selection=True,export_extras=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_frame_range=False,export_anim_slide_to_zero=True)
 return {'bytes':path.stat().st_size,'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in root.children_recursive if o.type=='MESH')}

def module(name,fn,**kwargs):
 global current
 current=name;specs[name]={'snaps':{},'colliders':[],**kwargs};r=empty(name);r['module']=name;r['units']='metres';r['referenceSha256']=SHA;fn(r);batch(r);specs[name]['export']=export(r,PARTS/(name+'.glb'));modules[name]=r
 for o in members(r):o.hide_render=True
 return r

def animate(o,name,prop,closed,opened):
 o['animatedPart']=True;o.animation_data_create()
 for label,a,b in [('open',closed,opened),('close',opened,closed)]:
  action=bpy.data.actions.new(name+'-'+label);o.animation_data.action=action
  for frame,value in [(1,a),(25,b)]:
   if prop=='location':o.location.x=value
   else:o.rotation_euler.z=value
   o.keyframe_insert(data_path=prop,frame=frame)
  for c in action.fcurves:
   for key in c.keyframe_points:key.interpolation='LINEAR'
  track=o.animation_data.nla_tracks.new();track.name=action.name;track.strips.new(action.name,1,action);track.mute=True
 o.animation_data.action=None
 if prop=='location':o.location.x=closed
 else:o.rotation_euler.z=closed

def lattice(r,width,part='fence-wire',bottom=.42,top=2.05):
 # Real diamond wire geometry keeps gaps open; no opaque backing or terrain patch.
 left,right=-width/2+.08,width/2-.08
 for slope in [-1,1]:
  for k in range(-40,41):
   intercept=k*.28;points=[]
   for x in [left,right]:
    y=slope*x+intercept
    if bottom<=y<=top:points.append((x,y))
   for y in [bottom,top]:
    x=(y-intercept)/slope
    if left<=x<=right:points.append((x,y))
   if len(points)>=2:rod('diamond wire',(points[0][0],points[0][1],.01*slope),(points[-1][0],points[-1][1],.01*slope),.008,'wire',r,part,4)

def fence(r,width):
 box('concrete curb',0,.14,0,width,.28,.18,'cream',r)
 for y in [.36,2.15]:box('fence rail',0,y,0,width,.1,.1,'teal',r)
 lattice(r,width);collider('concrete curb',0,.14,0,width,.28,.18);collider('fence movement screen',0,1.1,0,width,2.2,.12,projectiles=False)
 snap(r,'left',-width/2,0,0);snap(r,'right',width/2,0,0)
for width in [4,2,1]:module('fence-panel-'+str(width)+'m',lambda r,w=width:fence(r,w),bayWidth=width)

def post(r):
 box('concrete footing',0,.26,0,.4,.52,.4,'cream',r,bevel=.025);box('teal post',0,1.38,0,.16,1.8,.16,'teal',r);box('post cap',0,2.31,0,.22,.08,.22,'cream',r,bevel=.015);collider('fence post',0,1.175,0,.4,2.35,.4);snap(r,'base',0,0,0)
module('fence-post',post)

def sliding(r):
 for x in [-4,4]:
  box('gate pier base',x,.43,0,.45,.86,.48,'cream',r,bevel=.025);box('gate pier',x,1.53,0,.28,1.7,.28,'teal',r);box('pier cap',x,2.43,0,.38,.12,.38,'cream',r);collider('gate pier',x,1.25,0,.45,2.5,.48)
 leaf=empty('sliding-gate-leaf',r);leaf.location=xyz(0,0,-.42)
 for x in [-3.82,3.82]:box('gate stile',x,1.17,0,.16,2.08,.15,'teal',leaf,'gate-leaf')
 for y in [.18,2.16]:box('gate rail',0,y,0,7.8,.18,.16,'teal',leaf,'gate-leaf')
 for i in range(22):box('timber gate infill',-3.62+i*.345,1.16,.015,.325,1.84,.09,'wood-light'if i%4==0 else'wood',leaf,'gate-leaf',.008)
 rod('gate diagonal',(-3.6,.34,-.1),(3.6,2.0,-.1),.065,'teal',leaf,'gate-leaf',4)
 for x in [-3.4,3.4]:rod('gate wheel',(x,.1,-.08),(x,.1,.08),.095,'metal',leaf,'gate-leaf',12)
 box('gate pull',3.3,1.2,-.16,.1,.36,.1,'metal',leaf,'gate-leaf');collider('sliding leaf',0,1.16,0,7.8,2.15,.22,parent='sliding-gate-leaf')
 batch(leaf)
 animate(leaf,'sliding-gate','location',0,-8.25);specs[current]['motion']={'node':'sliding-gate-leaf','type':'slide','axis':'x','closed':0,'open':-8.25,'seconds':1,'parkingClearance':8.25}
 snap(r,'left',-4,0,0);snap(r,'right',4,0,0)
module('sliding-gate-8m',sliding,bayWidth=8,clearOpeningWidth=7.55)

def pedestrian(r):
 for x in [-1,1]:
  box('pedestrian post base',x,.3,0,.34,.6,.34,'cream',r);box('pedestrian post',x,1.3,0,.2,2.2,.2,'teal',r);collider('pedestrian post',x,1.2,0,.34,2.4,.34)
 hinge=empty('pedestrian-gate-hinge',r);hinge.location=xyz(-.84,0,0)
 frame=empty('pedestrian-gate-infill',hinge);frame.location.x=.84
 for x in [-.79,.79]:box('pedestrian stile',x,1.16,0,.1,1.98,.12,'teal',frame,'gate-leaf')
 for y in [.23,2.1]:box('pedestrian rail',0,y,0,1.68,.1,.12,'teal',frame,'gate-leaf')
 lattice(frame,1.65,'gate-leaf',.3,2.02);box('pedestrian kick panel',0,.44,0,1.55,.36,.05,'teal-dark',frame,'gate-leaf')
 box('pedestrian handle',.59,1.16,-.11,.24,.04,.08,'metal',frame,'gate-leaf');collider('pedestrian leaf',.84,1.15,0,1.68,2.05,.14,parent='pedestrian-gate-hinge')
 batch(hinge)
 animate(hinge,'pedestrian-gate','rotation_euler',0,-math.pi/2);specs[current]['motion']={'node':'pedestrian-gate-hinge','type':'hinge','closed':0,'open':-math.pi/2,'seconds':1,'hinge':[-.84,0,0]}
 snap(r,'left',-1,0,0);snap(r,'right',1,0,0)
module('pedestrian-gate-2m',pedestrian,bayWidth=2,clearOpeningWidth=1.66)

def truck(r):
 for x in [-4,4]:
  box('truck pier base',x,.38,0,.5,.76,.5,'cream',r,bevel=.025);box('truck portal column',x,2.45,0,.22,3.5,.25,'teal',r);collider('truck portal post',x,2.2,0,.5,4.4,.5)
 box('truck portal header',0,4.32,0,8.25,.36,.36,'teal',r);box('truck hazard band',0,4.31,-.195,7.8,.23,.025,'yellow',r)
 for x in range(-3,4):
  o=box('header caution stripe',x,4.31,-.215,.25,.235,.02,'black',r,bevel=0);o.rotation_euler.y=-.35
 collider('truck portal header',0,4.32,0,8.25,.36,.36);snap(r,'left',-4,0,0);snap(r,'right',4,0,0)
module('truck-entrance-8m',truck,bayWidth=8,clearOpeningWidth=7.5,clearOpeningHeight=4.14)

def barrier(r):
 prism('concrete Jersey profile',[(-.36,0),(-.36,.18),(-.16,.55),(-.16,.9),(.16,.9),(.16,.55),(.36,.18),(.36,0)],2,'cream',r,axis='z')
 for z in [-.167,.167]:
  box('barrier caution panel',0,.74,z,1.7,.21,.015,'yellow',r,bevel=.004)
  for x in [-.65,-.22,.22,.65]:box('barrier caution stripe',x,.74,z*1.06,.2,.215,.01,'black',r,bevel=0)
 collider('concrete barrier',0,.45,0,2,.9,.72);snap(r,'left',-1,0,0);snap(r,'right',1,0,0)
module('concrete-barrier-2m',barrier,bayWidth=2)

def shed_shell(r):
 box('shed floor slab',0,.015,0,6,.03,6,'cream',r,'floor',.006);specs[current]['surfaces']=[{'center':[0,0,0],'size':[6,6],'y':.03}]
 for x in [-3,3]:
  box('shed side cladding',x,1.64,0,.14,3.28,6,'teal',r,'shell');collider('shed side wall',x,1.64,0,.16,3.28,6)
  for z in [-2.7,-1.8,-.9,0,.9,1.8,2.7]:box('side corrugation',x+(-.09 if x<0 else .09),1.65,z,.05,3.2,.055,'teal-dark',r,'shell',.006)
  for z in [-2.8,0,2.8]:box('timber wall post',x*.93,1.65,z,.22,3.3,.22,'wood-light',r,'shell')
 box('rear shed wall',0,1.64,-3,6,3.28,.14,'wood-dark',r,'shell');collider('shed back wall',0,1.64,-3,6,3.28,.16)
 for i in range(18):box('rear wall planks',-2.82+i*.332,1.65,-2.9,.312,3.25,.07,'wood'if i%3 else'wood-light',r,'shell',.006)
 for x in [-2.8,2.8]:
  box('front support post',x,1.66,2.82,.24,3.32,.24,'wood-light',r,'shell');box('post shoe',x,.12,2.82,.28,.24,.28,'metal',r,'shell');collider('front shed post',x,1.66,2.82,.28,3.32,.28)
 box('open shed lintel',0,3.18,2.82,5.8,.25,.24,'wood-light',r,'shell');collider('shed lintel',0,3.18,2.82,5.8,.25,.24)
 for side in [-1,1]:rod('front timber knee brace',(side*2.75,2.55,2.82),(side*1.8,3.16,2.82),.085,'wood-light',r,'shell',4)
 rod('pendant cable',(0,3.16,1.7),(0,2.8,1.7),.018,'metal',r,'interior')
 bpy.ops.mesh.primitive_cone_add(vertices=16,radius1=.16,radius2=.055,depth=.15,location=xyz(0,2.74,1.7));finish(bpy.context.object,'pendant shade','metal',r,'interior');box('work light',0,2.665,1.7,.22,.015,.22,'light',r,'interior',.018)
 box('shed electrical box',2.78,1.55,2.99,.2,.34,.09,'cream',r,'shell')
 snap(r,'roof-mount',0,3.3,0);snap(r,'front',0,0,3);snap(r,'back',0,0,-3)
module('saw-shed-shell',shed_shell,footprint=[6,6],clearOpeningWidth=5.32,clearOpeningHeight=3.02)

def shed_roof(r):
 prism('left pitched roof',[(-3.25,0),(0,1.2),(0,1.32),(-3.25,.12)],6.5,'teal',r,'roof')
 prism('right pitched roof',[(0,1.2),(3.25,0),(3.25,.12),(0,1.32)],6.5,'teal',r,'roof')
 for i in range(-10,11):
  x=i*.315;y=1.32-abs(x)*1.2/3.25
  rod('roof standing seam',(x,y+.015,-3.24),(x,y+.015,3.24),.018,'teal-dark',r,'roof',6)
 box('ridge cap',0,1.345,0,.16,.1,6.56,'teal-dark',r,'roof')
 for z in [-3.26,3.26]:
  rod('gable fascia left',(-3.25,.045,z),(0,1.245,z),.085,'cream',r,'roof',4);rod('gable fascia right',(0,1.245,z),(3.25,.045,z),.085,'cream',r,'roof',4)
 for x in [-3.24,3.24]:box('eave fascia',x,.045,0,.1,.15,6.5,'cream',r,'roof')
 specs[current]['meshCollision']={'part':'roof','blocksMovement':True,'blocksProjectiles':True};snap(r,'mount',0,0,0)
module('saw-shed-roof',shed_roof,footprint=[6.5,6.56],mountHeight=3.3)

def clone(src,parent,x=0,y=0,z=0,yaw=0):
 old=members(src);copies={o:o.copy()for o in old}
 for o,q in copies.items():
  bpy.context.collection.objects.link(q);q.parent=copies.get(o.parent);q.hide_render=False
 root=copies[src];root.parent=parent;root.location=xyz(x,y,z);root.rotation_euler.z=yaw;return root

def shed(r):
 clone(modules['saw-shed-shell'],r);roof=clone(modules['saw-shed-roof'],r,y=3.3);roof.name='detachable-shed-roof';roof['keepHierarchy']=True
 specs[current]['colliders']=list(specs['saw-shed-shell']['colliders']);specs[current]['surfaces']=specs['saw-shed-shell']['surfaces'];specs[current]['meshCollision']={'part':'roof','blocksMovement':True,'blocksProjectiles':True};snap(r,'front',0,0,3);snap(r,'back',0,0,-3)
module('saw-shed',shed,footprint=[6.5,6.56],clearOpeningWidth=5.32,clearOpeningHeight=3.02,detachableRoof=True)

# Architecture-only assembly proves that exact-size modular pieces connect on the yard footprint.
yard=empty('timber-yard-architecture');yard['referenceSha256']=SHA;yard['assetVersion']='timber-yard-architecture-v1';yard['units']='metres'
placements=[];posts=set()
def place(name,x,z,yaw=0):
 r=clone(modules[name],yard,x=x,z=z,yaw=yaw);placements.append({'module':name,'position':[x,0,z],'yaw':yaw,'scale':[1,1,1]});return r

def line(a,b):
 dx,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dz);ux,uz=dx/length,dz/length;cursor=0
 while length-cursor>.01:
  step=4 if length-cursor>=3.99 else 2 if length-cursor>=1.99 else 1
  x=a[0]+ux*(cursor+step/2);z=a[1]+uz*(cursor+step/2);place('fence-panel-'+str(step)+'m',x,z,math.atan2(-uz,ux));posts.add((round(a[0]+ux*cursor,4),round(a[1]+uz*cursor,4)));cursor+=step
 posts.add((round(b[0],4),round(b[1],4)))
line((-16,-16),(16,-16));line((-16,16),(-4,16));line((4,16),(16,16));line((16,-16),(16,-4));line((16,4),(16,16));line((-16,-16),(-16,-1));line((-16,1),(-16,16))
for p in [(-4,16),(4,16),(16,-4),(16,4),(-16,-1),(-16,1)]:posts.discard(p)
for x,z in sorted(posts):place('fence-post',x,z)
place('sliding-gate-8m',0,16);place('truck-entrance-8m',16,0,math.pi/2);place('pedestrian-gate-2m',-16,0,math.pi/2);place('saw-shed',9,-10)
for x,z,yaw in [(-5.6,17,0),(5.6,17,0),(14,-5.5,math.pi/2),(14,5.5,math.pi/2)]:place('concrete-barrier-2m',x,z,yaw)
bpy.context.view_layer.update();assembly=export(yard,ROOT/'timber-yard-architecture.glb')
report={'assetVersion':'timber-yard-architecture-v1','reference':'art/ai/pvp/timber-yard/reference.png','referenceSha256':SHA,'units':'metres','yardFootprint':[32,32],'snapGridMetres':1,'moduleCount':len(modules),'modules':specs,'assembly':assembly,'placements':placements,'state':'Architecture models only; not placed into the playable world; Meshy props and capture gameplay are separate stages.'}
(ROOT/'manifest.json').write_text(json.dumps(report,indent=2)+'\n')
# Preserve editable module prototypes away from the assembled reference layout.
lib=bpy.data.collections.new('Reusable timber-yard modules');scene.collection.children.link(lib);lib.hide_render=True
for i,r in enumerate(modules.values()):
 r.location=(50+(i%4)*14,-(i//4)*12,0)
 for o in members(r):
  for c in list(o.users_collection):c.objects.unlink(o)
  lib.objects.link(o);o.hide_render=True
reference=bpy.data.images.load(str(REF.resolve()));reference.pack();ref=empty('Approved timber-yard reference');ref.empty_display_type='IMAGE';ref.data=reference;ref.location=(45,15,5);ref.hide_render=True
# Preview-only ground is outside the exported assembly: no ground planes are baked into props.
ground=box('Preview ground',0,-.09,0,35,.12,35,'ground',part='preview',bevel=0)
scene.world=bpy.data.worlds.new('Timber studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.73,.8,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
for pos,power in [((12,-22,30),4200),((-18,-8,20),3200),((5,20,25),4000)]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.size=16;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=False;scene.view_settings.view_transform='AgX';scene.render.resolution_x=1280;scene.render.resolution_y=1024;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA'
bpy.ops.object.camera_add(location=(35,-43,34));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=52;cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam;scene.render.filepath=str((ROOT/'preview-architecture.png').resolve());bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str((ROOT/'timber-yard-kit.blend').resolve()),compress=True)
print(json.dumps({'modules':len(modules),'assembly':assembly,'referenceSha256':SHA}))

# Render a close view after saving the editable assembly. This does not alter any GLB.
import bpy
from pathlib import Path
from mathutils import Vector
for o in bpy.data.objects.get('timber-yard-architecture').children_recursive:o.hide_render=True
src=bpy.data.objects['saw-shed'];old=[src,*src.children_recursive];copies={o:o.copy()for o in old}
for o,q in copies.items():
 bpy.context.collection.objects.link(q);q.parent=copies.get(o.parent);q.hide_render=False
r=copies[src];r.location=(0,0,0);r.rotation_euler=(0,0,0)
scene=bpy.context.scene;cam=scene.camera;cam.location=(10,-12,9);cam.data.ortho_scale=11;cam.rotation_euler=(Vector((0,0,2))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.resolution_x=1000;scene.render.resolution_y=800;scene.cycles.samples=32;scene.render.filepath=str(Path('art/building-kits/timber-yard/preview-shed.png').resolve());bpy.ops.render.render(write_still=True)
