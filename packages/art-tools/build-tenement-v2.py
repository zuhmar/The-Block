"""Original-art three-story tenement; shared game rooms/stairs and reusable, unit-scale modules."""
import bpy,math,json,hashlib,random,shutil
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path('art/buildings/apartments/tenement-v2');PARTS=ROOT/'parts';PARTS.mkdir(parents=True,exist_ok=True)
D=json.loads((ROOT/'layout.json').read_text());assert D['stories']==3 and D['front']==1
REF=ROOT/'references/concept.png';SHA=hashlib.sha256(REF.read_bytes()).hexdigest();rng=random.Random(93)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
M={}
def linear(color):
 return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in [int(color[i:i+2],16)/255 for i in (0,2,4)])
for name,color in {'grout':'815445','brick':'b85e42','brick2':'c56d4d','brick3':'a95740','cream':'e6d4b5','stone':'c7b69a','navy':'2c343e','teal':'225d59','metal':'687279','wood':'a57c4d','wood2':'b18a5a','plaster':'e9deca','blue':'3b6079','white':'f2ead7','yellow':'e5b64b','light':'fff2cf'}.items():
 m=bpy.data.materials.new('apt-'+name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*linear(color),1);p.inputs['Roughness'].default_value=.43 if name.startswith('brick')or name in ['wood','plaster']else .32;p.inputs['Coat Weight'].default_value=.16;p.inputs['Metallic'].default_value=.18 if name=='metal'else .02
 if name=='light':p.inputs['Emission Color'].default_value=(*linear(color),1);p.inputs['Emission Strength'].default_value=.7
 M[name]=m
m=bpy.data.materials.new('apt-glass');m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*linear('7ea9b2'),.28);p.inputs['Alpha'].default_value=.28;p.inputs['Roughness'].default_value=.15;p.inputs['Coat Weight'].default_value=.3;m.surface_render_method='DITHERED';M['glass']=m

def xyz(x,y,z):return (x,-z,y)
def empty(name,parent=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;return o

def box(name,x,y,z,w,h,d,mat='cream',parent=None,part='shell',bevel=0,yaw=0,floor=None):
 mesh=bpy.data.meshes.new(name);verts=[(sx*w/2,sy*d/2,sz*h/2)for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 mesh.from_pydata(verts,[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.location=xyz(x,y,z);o.rotation_euler.z=yaw;o.parent=parent;o.data.materials.append(M[mat]);o['part']=part
 if floor is not None:o['floor']=floor
 if bevel:
  bpy.context.view_layer.objects.active=o;o.select_set(True);mod=o.modifiers.new('Glossy edge bevel','BEVEL');mod.width=min(bevel,w*.2,h*.2,d*.2);mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name);o.select_set(False)
 return o

def rod(name,a,b,r,mat='metal',parent=None,part='shell',floor=None):
 a=Vector(xyz(*a));b=Vector(xyz(*b));v=b-a
 bpy.ops.mesh.primitive_cylinder_add(vertices=10,radius=r,depth=v.length,location=(a+b)/2);o=bpy.context.object;o.name=name;o.rotation_euler=v.to_track_quat('Z','Y').to_euler();o.parent=parent;o.data.materials.append(M[mat]);o['part']=part
 if floor is not None:o['floor']=floor
 return o

def members(root):return [root,*root.children_recursive]
def batch(root):
 groups={}
 for o in list(root.children_recursive):
  if o.type!='MESH':continue
  p=o.parent;dynamic=False
  while p and p!=root:
   dynamic|=bool(p.get('doorHinge'));p=p.parent
  if dynamic:continue
  groups.setdefault((o.get('part','shell'),o.data.materials[0].name,o.get('floor',-1)),[]).append(o)
 bpy.context.view_layer.update()
 for (role,mat,floor),objs in groups.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in objs:
   world=o.matrix_world.copy();o.parent=None;o.matrix_world=world;o.select_set(True)
  bpy.context.view_layer.objects.active=objs[0]
  if len(objs)>1:bpy.ops.object.join()
  o=bpy.context.object;o.name=f'{role}-{mat}-{floor}';o.parent=root;o['part']=role
  if floor>=0:o['floor']=floor

def export(root,path,omit=()):
 bpy.ops.object.select_all(action='DESELECT');objects=[o for o in members(root)if o.get('part')not in omit]
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=root
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_frame_range=False)
 return {'bytes':path.stat().st_size,'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in objects if o.type=='MESH')}
components={};part_reports={}
def module(name,fn):
 r=empty(name);r['module']=name;r['units']='metres';fn(r);batch(r);part_reports[name]=export(r,PARTS/(name+'.glb'));components[name]=r
 for o in members(r):o.hide_render=True;o.name='library::'+o.name
 return r

def window(r):
 for x in [-.86,.86]:box('recessed jamb',x,1.06,0,.12,2.12,.22,'teal',r)
 for y in [.08,2.04]:box('window rail',0,y,0,1.84,.16,.22,'teal',r)
 box('inset glass',0,1.04,.035,1.6,1.8,.025,'glass',r)
 box('centre sash',0,1.04,-.035,.055,1.8,.085,'navy',r)
 box('transom sash',0,1.53,-.035,1.6,.055,.085,'navy',r)
 box('stone sill',0,.005,-.045,2.04,.15,.36,'cream',r,bevel=.015)
 for x in [-.66,.66]:box('curtain',x,1.1,.15,.24,1.83,.025,'blue',r,'interior')
module('window',window)

def entrance(r):
 for x in [-.86,.86]:box('door surround',x,1.4,0,.12,2.8,.22,'teal',r,bevel=.012)
 box('door lintel',0,2.83,0,1.9,.12,.22,'teal',r,bevel=.012)
 hinge=empty('tenement-door-hinge',r);hinge.location=xyz(-D['doorWidth']/2,0,0);hinge['doorHinge']=True
 for x in [.04,1.56]:box('door stile',x,1.4,0,.08,2.8,.11,'navy',hinge,'door',.012)
 for y,h in [(.1,.2),(1.0,.08),(2.76,.08)]:box('door rail',.8,y,0,1.6,h,.11,'navy',hinge,'door',.01)
 box('door glass',.8,1.43,0,1.44,2.58,.024,'glass',hinge,'door')
 rod('entry pull',(1.37,1.05,.11),(1.37,1.43,.11),.022,'metal',hinge,'door')
 hinge.animation_data_create()
 for label,start,end in [('open',0,math.pi/2),('close',math.pi/2,0)]:
  action=bpy.data.actions.new('tenement-door-'+label);hinge.animation_data.action=action
  hinge.rotation_euler.z=start;hinge.keyframe_insert(data_path='rotation_euler',frame=1);hinge.rotation_euler.z=end;hinge.keyframe_insert(data_path='rotation_euler',frame=25)
  for curve in action.fcurves:
   for key in curve.keyframe_points:key.interpolation='LINEAR'
  track=hinge.animation_data.nla_tracks.new();track.name=action.name;track.strips.new(action.name,1,action);track.mute=True
 hinge.animation_data.action=None
 hinge.rotation_euler.z=0
module('entrance',entrance)

def canopy(r):
 box('canopy',0,.12,0,3.1,.24,.8,'teal',r,bevel=.035)
 box('gold canopy edge',0,.08,-.41,3.05,.055,.035,'yellow',r)
 for x in [-1,1]:box('canopy downlight',x,-.025,-.13,.24,.025,.14,'light',r)
module('entry-canopy',canopy)

def bed(r):
 box('bed frame',0,.23,0,1.5,.24,2.3,'wood',r,'interior',.025);box('mattress',0,.43,0,1.44,.23,2.24,'white',r,'interior',.04)
 box('blue quilt',0,.565,.25,1.43,.1,1.7,'blue',r,'interior',.035);box('folded quilt border',0,.623,-.48,1.42,.045,.18,'teal',r,'interior',.012)
 box('pillow',0,.63,-.8,1.1,.16,.4,'white',r,'interior',.06);box('headboard',0,.46,-1.08,1.5,.68,.12,'wood',r,'interior',.03)
 for x in [-.58,.58]:
  for z in [-.92,.92]:box('bed foot',x,.08,z,.13,.16,.13,'navy',r,'interior')
module('bed',bed)

def table(r):
 box('table top',0,.89,0,1.2,.12,.8,'wood2',r,'interior',.025)
 for x in [-.47,.47]:
  for z in [-.27,.27]:box('table leg',x,.42,z,.09,.84,.09,'wood',r,'interior')
 box('table runner',0,.958,0,.32,.015,.72,'blue',r,'interior')
module('table',table)

def cabinet(r):
 box('wardrobe carcass',0,.95,0,.8,1.9,1,'wood',r,'interior',.025)
 for x in [-.19,.19]:
  box('recessed wardrobe door',x,1.02,-.506,.35,1.62,.035,'wood2',r,'interior',.012)
  rod('wardrobe pull',(x+(.11 if x<0 else -.11),.95,-.535),(x+(.11 if x<0 else -.11),1.13,-.535),.012,'metal',r,'interior')
module('wardrobe',cabinet)

def bench(r):
 box('hall bench seat',0,.53,0,1.2,.16,.5,'wood',r,'interior',.025)
 box('seat cushion',0,.635,-.015,1.1,.09,.42,'blue',r,'interior',.025)
 box('hall bench back',0,.84,.2,1.2,.32,.1,'wood2',r,'interior',.025)
 for x in [-.45,.45]:box('bench leg',x,.23,0,.12,.46,.4,'navy',r,'interior')
module('hall-bench',bench)

def mailbox(r):
 for x in [-.18,.18]:
  for y in [.16,.48,.8]:
   box('mailbox case',x,y,0,.34,.3,.14,'navy',r,bevel=.012);box('mailbox face',x,y,-.085,.3,.25,.04,'metal',r,bevel=.008)
   box('mail slot',x,y+.055,-.11,.18,.025,.008,'navy',r);box('name strip',x,y-.055,-.111,.12,.04,.008,'cream',r)
module('mailboxes',mailbox)
module('intercom',lambda r:[box('intercom body',0,.26,0,.2,.52,.12,'navy',r,bevel=.015),box('speaker grille',0,.39,-.07,.13,.12,.025,'metal',r),box('call panel',0,.17,-.075,.1,.16,.025,'yellow',r)])

def downpipe(r):
 rod('vertical drain',(0,.14,0),(0,9.7,0),.065,'navy',r)
 for y in [.6,2.8,5.8,8.8]:
  rod('pipe coupling',(0,y-.045,0),(0,y+.045,0),.08,'metal',r);box('pipe clip',0,y,.035,.2,.055,.18,'metal',r)
 rod('gutter elbow',(0,9.7,0),(0,9.92,.22),.065,'navy',r);rod('drain outlet',(0,.14,0),(0,.07,-.18),.065,'navy',r)
module('downpipe',downpipe)

def utility(name,source,factor=1):
 before=set(bpy.data.objects);path=Path('apps/client/src/fps/models/block-mart/meshy/parts')/(source+'.glb');bpy.ops.import_scene.gltf(filepath=str(path.resolve()));new=[o for o in bpy.data.objects if o not in before];bpy.context.view_layer.update();root=empty(name)
 for o in new:
  if o.type!='MESH':continue
  o.data.transform(Matrix.Scale(factor,4)@o.matrix_world);o.parent=root;o.matrix_world=Matrix.Identity(4);o['part']='shell'
 for o in new:
  if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
 root['sourceModule']=str(path);root['uniformSourceScale']=factor;root['module']=name;root['units']='metres';batch(root);part_reports[name]=export(root,PARTS/(name+'.glb'));components[name]=root
 for o in members(root):o.hide_render=True;o.name='library::'+o.name
utility('roof-ac','roof-ac');utility('window-ac','roof-ac',.55);utility('roof-vent','roof-vent');utility('wall-lamp','exterior-light')

building=empty('tenement');building['referenceSha256']=SHA;building['assetVersion']='tenement-v2';building['units']='metres';building['source']='Blender model from approved original apartment concept and existing game floor plan';building['stories']=3
placed=[]
def place(name,x,y,z,yaw=0,floor=None):
 old=members(components[name]);copies={o:o.copy()for o in old}
 for o,q in copies.items():
  if o.type=='MESH':q.data=o.data.copy()
  bpy.context.collection.objects.link(q);q.parent=copies.get(o.parent);q.hide_render=False;q.name=o.name.removeprefix('library::')
  if floor is not None and q.get('part')=='interior':q['floor']=floor
 root=copies[components[name]];root.parent=building;root.location=xyz(x,y,z);root.rotation_euler.z=yaw;placed.append(root);return root

openings=[]
def wall(face,a,b,holes):
 dx,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dz);tx,tz=dx/length,dz/length;yaw=math.atan2(-tz,tx)
 def p(t,out=0):return (a[0]+tx*t-tz*out,a[1]+tz*t+tx*out)
 cuts=sorted(set([0,length]+[v for h in holes for v in h[:2]]))
 for lo,hi in zip(cuts,cuts[1:]):
  bands=sorted((h[2],h[3])for h in holes if h[0]<(lo+hi)/2<h[1]);cursor=0
  for low,high in bands+[(D['height'],D['height'])]:
   if low>cursor:
    x,z=p((lo+hi)/2);box(face+' masonry',x,(low+cursor)/2,z,hi-lo,low-cursor,D['wallThickness'],'grout',building,yaw=yaw)
   cursor=max(cursor,high)
 # Solid relief bricks, with independent warm color variation and recessed mortar gaps.
 for row in range(44):
  y=.15+row*.225
  if y<.86 or y>D['height']-.1 or any(abs(y-(floor*3.2+.04))<.13 for floor in [1,2,3]):continue
  for col in range(23):
   lo=col*.47-(.235 if row%2 else 0);hi=min(length,lo+.445);lo=max(0,lo)
   if hi-lo<.04:continue
   if any(lo<h[1] and hi>h[0] and y+.1>h[2] and y-.1<h[3]for h in holes):continue
   x,z=p((lo+hi)/2,.113);box('relief brick',x,y,z,hi-lo,.205,.035,rng.choice(['brick','brick','brick2','brick3']),building,'brick-detail',yaw=yaw)
 openings.append({'face':face,'a':a,'b':b,'holes':holes})

# Face directions keep the window module's front pointing outside the building.
for face,a,b,yaw in [('front',(-5,5),(5,5),math.pi),('right',(5,5),(5,-5),-math.pi/2),('rear',(5,-5),(-5,-5),0),('left',(-5,-5),(-5,5),math.pi/2)]:
 holes=[]
 for floor in range(3):
  base=floor*3.2
  for along in [1.7,5,8.3]:
   if face=='front'and floor==0 and along==5:continue
   holes.append((along-.8,along+.8,base+.9,base+2.7))
   t=along/10;x=a[0]+(b[0]-a[0])*t;z=a[1]+(b[1]-a[1])*t;place('window',x,base+.76,z,yaw,floor)
   if face=='front'and floor>0 and along==5:
    for px in [-.82,.82]:rod('Juliet bracket',(x+px,base+.76,5.13),(x+px,base+1.72,5.13),.025,'navy',building)
    for offset in [-.65,-.43,-.21,0,.21,.43,.65]:rod('Juliet window guard',(x+offset,base+.8,5.16),(x+offset,base+1.7,5.16),.012,'navy',building)
    rod('Juliet top rail',(x-.88,base+1.74,5.16),(x+.88,base+1.74,5.16),.028,'navy',building)
 if face=='front':holes.append((5-D['openingWidth']/2,5+D['openingWidth']/2,0,2.86))
 wall(face,a,b,holes)

# Cream base, corner quoins and story bands give architectural mass and a distinct silhouette.
for side in [-1,1]:box('plaster base',side*2.96,.43,5,3.92,.86,.25,'cream',building,bevel=.015)
box('rear plaster base',0,.43,-5,10,.86,.25,'cream',building,bevel=.015)
for x in [-5,5]:box('side plaster base',x,.43,0,.25,.86,10,'cream',building,bevel=.015)
for floor in [1,2,3]:
 y=floor*3.2
 for z in [-5,5]:box('story cornice',0,y,z,10.22,.2,.3,'cream',building,bevel=.018)
 for x in [-5,5]:box('side cornice',x,y,0,.3,.2,10.22,'cream',building,bevel=.018)
for x in [-4.76,4.76]:
 for z in [-5,5]:
  for level in range(3):
   for step in range(4):box('corner quoin',x,level*3.2+.5+step*.72,z,.5,.62,.27,'cream',building,bevel=.014)
place('entrance',0,0,5);place('entry-canopy',0,2.95,5.38)
for x in [-1.35,1.35]:place('wall-lamp',x,2.3,5.22,math.pi)
place('mailboxes',1.25,1.1,5.17,math.pi);place('intercom',.91,1.35,5.16,math.pi)
# A shallow threshold sits on the existing ground surface and does not add an unmodeled stair.
box('entry threshold',0,.018,5.12,1.78,.036,.4,'stone',building)
box('entrance plaque',0,3.45,5.43,3.28,.72,.12,'teal',building,bevel=.025)
for x in [-1.3,1.3]:box('plaque gold accent',x,3.4,5.501,.3,.035,.012,'yellow',building)
fontpath=Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf');font=bpy.data.fonts.load(str(fontpath))
for label,y,size in [('CORNER',3.52,.30),('TENEMENTS',3.22,.28)]:
 curve=bpy.data.curves.new('entrance lettering','FONT');curve.body=label;curve.font=font;curve.align_x='CENTER';curve.size=size;curve.extrude=.001;curve.bevel_depth=0;curve.resolution_u=2;o=bpy.data.objects.new('tenement lettering',curve);bpy.context.collection.objects.link(o);o.location=xyz(0,y,5.5);o.rotation_euler.x=math.pi/2;o.parent=building;o.data.materials.append(M['cream']);o['part']='lettering';bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)

# The actual game slabs, room partitions and stair holes are authoritative.
box('ground floor',0,.007,0,9.76,.025,9.76,'stone',building,'interior',floor=0)
for slab in D['slabs']:box('floor slab',slab['x'],slab['y']-.09,slab['z'],slab['width'],.18,slab['depth'],'stone',building,'interior',floor=round(slab['y']/3.2))
for floor in range(3):
 base=floor*3.2
 for col in range(20):box('room floorboards',-4.79+col*.173,base+.018,0,.166,.012,9.7,'wood'if col%3 else'wood2',building,'interior',floor=floor)
 box('hall ceiling light',0,base+2.98,0,1.1,.06,.38,'light',building,'interior',floor=floor)
 for z in [-2,2]:
  for side in [-1,1]:box('room doorway trim',-1.2,base+1.47,z+side*.98,.1,2.94,.07,'wood2',building,'interior',floor=floor)
  box('room doorway header',-1.2,base+2.96,z,.1,.06,2.02,'wood2',building,'interior',floor=floor)
for wall in D['partitions']:box('interior room wall',wall['x'],wall.get('y',0)+wall['height']/2,wall['z'],wall['width'],wall['height'],wall['depth'],'plaster',building,'interior',floor=round(wall.get('y',0)/3.2))
for stair in D['stairs']:
 floor=round(stair['y']/3.2)
 for step in range(16):
  rise=(step+1)*3.2/16;z=stair['startZ']-(step+.5)*stair['run']/16
  box('stair tread',stair['x'],stair['y']+rise-.1,z,stair['width'],.2,stair['run']/16,'wood2',building,'interior',floor=floor)
  box('stair nosing',stair['x'],stair['y']+rise+.005,z+stair['run']/32,stair['width'],.018,.045,'navy',building,'fine-detail',floor=floor)
 for side in [-1,1]:
  x=stair['x']+side*(stair['width']/2+.07)
  for step in range(17):rod('stair rail post',(x,stair['y']+step*3.2/16,stair['startZ']-step*stair['run']/16),(x,stair['y']+step*3.2/16+.86,stair['startZ']-step*stair['run']/16),.016,'metal',building,'interior',floor)
  rod('sloped handrail',(x,stair['y']+.88,stair['startZ']),(x,stair['y']+4.08,stair['startZ']-stair['run']),.026,'navy',building,'interior',floor)
for f in D['fixtures']:
 name={'bed':'bed','table':'table','cabinet':'wardrobe','bench':'hall-bench'}[f['kind']];place(name,f['x'],f.get('y',0),f['z'],floor=round(f.get('y',0)/3.2))
# Exterior service details use prepared shared modules; no paid model generation is performed.
place('window-ac',-3.85,4.35,5.27,math.pi);place('roof-ac',-2.4,10.0,-2.7)
place('roof-vent',2.6,10.0,-2.5);place('downpipe',4.75,0,5.23,math.pi);place('downpipe',-4.75,0,-5.23)
box('roof deck',0,9.9,0,10.18,.18,10.18,'navy',building,'roof')
for z in [-5,5]:box('roof coping',0,10.15,z,10.38,.22,.36,'navy',building,'roof',.025)
for x in [-5,5]:box('side roof coping',x,10.15,0,.36,.22,10.38,'navy',building,'roof',.025)
# Stepped front parapet and a low mechanical housing, not an additional habitable story.
for width,y in [(4.2,10.3),(2.3,10.58)]:box('stepped front parapet',0,y,5,width,.35,.27,'brick',building,'roof');box('stepped cap',0,y+.2,5,width+.15,.1,.4,'navy',building,'roof',.018)
box('mechanical housing',2.2,10.55,1.9,2.0,1.12,1.8,'cream',building,'roof',.02);box('housing cap',2.2,11.15,1.9,2.14,.14,1.94,'navy',building,'roof',.02)
for x in [1.2,3.2]:
 for y in [10.32,10.44,10.56,10.68]:box('housing louvre',x,y,1.9,.035,.035,.56,'navy',building,'fine-detail')
batch(building);bpy.context.scene.frame_set(1)
full=export(building,ROOT/'tenement.glb')
# A genuinely lighter exterior LOD keeps window openings, glass and the same door hinge.
original_meshes={}
for o in building.children_recursive:
 if o.type!='MESH' or o.get('part')in ['brick-detail','fine-detail','interior','wear-detail','lettering','door'] or o.data.materials[0].name in ['apt-glass','apt-grout']:continue
 original_meshes[o]=o.data;o.data=o.data.copy();bpy.context.view_layer.objects.active=o
 mod=o.modifiers.new('Mobile distance geometry','DECIMATE');mod.ratio=.28;bpy.ops.object.modifier_apply(modifier=mod.name)
low=export(building,ROOT/'tenement-lod.glb',('brick-detail','fine-detail','interior','wear-detail','lettering'))
for o,mesh in original_meshes.items():o.data=mesh
report={'source':'Original-art Blender apartment architecture; shared prepared utility modules','referenceSha256':SHA,'stories':3,'rooms':6,'full':full,'lod':low,'parts':part_reports,'placementScale':[1,1,1],'footprint':[10,10],'gameFloorLevels':[0,3.2,6.4]}
(ROOT/'model-report.json').write_text(json.dumps(report,indent=2)+'\n');(ROOT/'facade-openings.json').write_text(json.dumps(openings,indent=2)+'\n')
runtime=Path('apps/client/src/fps/models/tenement-v2');runtime.mkdir(parents=True,exist_ok=True)
for name in ['tenement.glb','tenement-lod.glb','layout.json']:shutil.copyfile(ROOT/name,runtime/name)
shutil.copytree(PARTS,runtime/'parts',dirs_exist_ok=True)
# Keep editable prototypes offstage and out of all renders.
lib=bpy.data.collections.new('Reusable tenement modules');bpy.context.scene.collection.children.link(lib);lib.hide_render=True
for i,r in enumerate(components.values()):
 r.location=(22+(i%4)*6,-(i//4)*7,0)
 for o in members(r):
  for col in list(o.users_collection):col.objects.unlink(o)
  lib.objects.link(o);o.hide_render=True
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=False;scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
scene.world=bpy.data.worlds.new('Neutral blue studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.72,.8,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
for pos,power in [((8,-15,19),2600),((-12,-6,13),1800),((3,12,17),2300)]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.size=10;o.rotation_euler=(Vector((0,0,4))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(17,-21,15));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=19;cam.rotation_euler=(Vector((0,0,4.8))-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam
scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA';scene.render.filepath=str((ROOT/'preview-exterior.png').resolve());bpy.ops.render.render(write_still=True)
reference=bpy.data.images.load(str(REF.resolve()));reference.pack();ref=empty('Original apartment concept');ref.empty_display_type='IMAGE';ref.data=reference;ref.hide_render=True;ref.location=(-16,0,5)
bpy.ops.wm.save_as_mainfile(filepath=str((ROOT/'tenement.blend').resolve()),compress=True)
print(json.dumps(report,indent=2))
