"""Reference-guided, directly authored Blender Block Mart and reusable architecture/prop kit.
No paid generation, imported building mesh, nonuniform instance scaling or runtime changes.
"""
import bpy,bmesh,math,json,random,hashlib,sys,shutil
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path('art/buildings/block-mart');PARTS=ROOT/'parts';PARTS.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
rng=random.Random(73);sha=hashlib.sha256((ROOT/'references/block-mart.png').read_bytes()).hexdigest()
M={}
def linear(h):
 vals=[int(h[i:i+2],16)/255 for i in (0,2,4)];return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in vals)
for name,color in {'brick-base':'a87868','brick':'b76547','brick-warm':'c87853','cream':'e6d6b9','teal':'205d59','navy':'2c343e','metal':'626a70','yellow':'edb741','floor':'c9bda7','grout':'afa38d','cardboard':'b98a53','white':'eef0dc','red':'b95644','blue':'4c8d9b','green':'819558','screen':'223c42'}.items():
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*linear(color),1);p.inputs['Roughness'].default_value=.48 if name.startswith('brick') else .34;p.inputs['Metallic'].default_value=.35 if name=='metal' else .03;p.inputs['Coat Weight'].default_value=.2 if name in ['teal','navy','metal','yellow'] else .08;M[name]=m
m=bpy.data.materials.new('shop-glass');m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*linear('7bbbc2'),.23);p.inputs['Alpha'].default_value=.23;p.inputs['Roughness'].default_value=.14;p.inputs['Coat Weight'].default_value=.3;m.surface_render_method='DITHERED';M['glass']=m
m=bpy.data.materials.new('warm-light');m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*linear('fff1ce'),1);p.inputs['Emission Color'].default_value=(*linear('fff1ce'),1);p.inputs['Emission Strength'].default_value=.45;M['light']=m

def xyz(p):return (p[0],-p[2],p[1])
def empty(name,parent=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;return o

def finish(o,name,mat,parent,part):
 o.name=name;o.data.materials.append(M[mat]);o.parent=parent;o['part']=part;return o

def box(name,x,y,z,w,h,d,mat='cream',parent=None,part='shell',bevel=.018):
 bpy.ops.mesh.primitive_cube_add(size=1,location=xyz((x,y,z)));o=bpy.context.object;o.dimensions=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Architectural edge highlights','BEVEL');mod.width=min(bevel,min(w,h,d)*.25);mod.segments=1 if part=='brick-detail' else 2;bpy.ops.object.modifier_apply(modifier=mod.name)
  mod=o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
 return finish(o,name,mat,parent,part)

def rod(name,a,b,r,mat,parent=None,part='shell',vertices=10):
 a=Vector(xyz(a));b=Vector(xyz(b));v=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=v.length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=v.to_track_quat('Z','Y').to_euler();return finish(o,name,mat,parent,part)

def prism(name,poly,bottom,top,mat,parent,part):
 n=len(poly);verts=[xyz((x,y,z)) for y in [bottom,top] for x,z in poly];faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);return finish(o,name,mat,parent,part)

def coping_ring(poly,bottom,top,parent):
 def offset(amount):
  result=[]
  for i,b in enumerate(poly):
   a=poly[i-1];c=poly[(i+1)%len(poly)];prev=math.hypot(b[0]-a[0],b[1]-a[1]);nxt=math.hypot(c[0]-b[0],c[1]-b[1]);n1=((b[1]-a[1])/prev,-(b[0]-a[0])/prev);n2=((c[1]-b[1])/nxt,-(c[0]-b[0])/nxt);nx,nz=n1[0]+n2[0],n1[1]+n2[1];length=math.hypot(nx,nz);nx/=length;nz/=length;miter=amount/(nx*n2[0]+nz*n2[1]);result.append((b[0]+nx*miter,b[1]+nz*miter))
  return result
 outer,inner=offset(.2),offset(-.2);n=len(poly);v=[xyz((x,y,z))for y in [bottom,top]for loop in [outer,inner]for x,z in loop];faces=[]
 for i in range(n):
  j=(i+1)%n;faces.extend([(2*n+i,2*n+j,3*n+j,3*n+i),(i,n+i,n+j,j),(i,j,2*n+j,2*n+i),(n+i,3*n+i,3*n+j,n+j)])
 mesh=bpy.data.meshes.new('mitered parapet cap');mesh.from_pydata(v,[],faces);mesh.update();bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();o=bpy.data.objects.new('continuous mitered coping',mesh);bpy.context.collection.objects.link(o);finish(o,o.name,'navy',parent,'roof')

font=bpy.data.fonts.load('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')
def text(name,words,x,y,z,size,parent):
 c=bpy.data.curves.new(name,'FONT');c.body=words;c.font=font;c.align_x='CENTER';c.align_y='CENTER';c.size=size;c.extrude=.006;c.resolution_u=5;o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.location=xyz((x,y,z));o.rotation_euler=(math.pi/2,0,math.pi);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.select_set(False);return finish(o,name,'cream',parent,'shell')

def animate(hinge,prefix):
 hinge.animation_data_create()
 for suffix,angles in [('open',(0,math.pi/2)),('close',(math.pi/2,0))]:
  action=bpy.data.actions.new(prefix+'-'+suffix);hinge.animation_data.action=action
  for frame,angle in [(1,angles[0]),(25,angles[1])]:hinge.rotation_euler.z=angle;hinge.keyframe_insert(data_path='rotation_euler',frame=frame)
  for f in action.fcurves:
   for k in f.keyframe_points:k.interpolation='LINEAR'
  track=hinge.animation_data.nla_tracks.new();track.name=action.name;track.strips.new(action.name,1,action);track.mute=True
 hinge.animation_data.action=None;hinge.rotation_euler.z=0

def members(root):return [root]+list(root.children_recursive)
def export(root,path,omit=()):
 bpy.ops.object.select_all(action='DESELECT');objects=[o for o in members(root) if o.get('part') not in omit]
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=root
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_frame_range=False)
 return {'bytes':path.stat().st_size,'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects if o.type=='MESH')}

def batch(root):
 groups={}
 for o in list(root.children_recursive):
  if o.type!='MESH':continue
  p=o.parent;dynamic=False
  while p and p!=root:
   if p.get('doorHinge'):dynamic=True
   p=p.parent
  if dynamic:continue
  key=(o.get('part','shell'),o.data.materials[0].name);groups.setdefault(key,[]).append(o)
 bpy.context.view_layer.update()
 for (part,mat),objs in groups.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in objs:
   world=o.matrix_world.copy();o.parent=None;o.matrix_world=world;o.select_set(True)
  bpy.context.view_layer.objects.active=objs[0]
  if len(objs)>1:bpy.ops.object.join()
  o=bpy.context.object;o.name=part+'-'+mat;o['part']=part;o.parent=root

def window(root):
 w,h=5.8,2.35
 # Local -Z faces outdoors; glass is inset into the 28cm wall.
 for x in [-w/2,w/2]:box('deep window jamb',x,h/2,0,.1,h,.22,'navy',root)
 for y in [0,h]:box('window frame rail',0,y,0,w+.1,.1,.22,'navy',root)
 for x in [-w/6,w/6]:box('window mullion',x,h/2,.02,.055,h,.13,'navy',root)
 box('recessed display glass',0,h/2,.10,w-.12,h-.12,.025,'glass',root,'glass',0)
 box('projecting masonry sill',0,-.13,-.1,w+.3,.2,.55,'cream',root)
 box('window display ledge',1.5,.22,.4,2.3,.055,.35,'cream',root)
 for i,x in enumerate([.8,1.5,2.2]):
  box('window display package',x,.46,.38,.3,.4,.25,['yellow','red','green'][i],root,'product-detail',.008)
  box('window display label',x,.46,.246,.14,.08,.012,'cream',root,'label-detail',0)

def door(root,name,w=1.8,h=2.7,glass=True):
 for x in [-w/2,w/2]:box('door reveal',x,h/2,0,.1,h,.28,'navy',root)
 box('door header',0,h,0,w+.1,.1,.28,'navy',root)
 box('door threshold',0,.025,0,w,.05,.32,'metal',root)
 hinge=empty(name+'-hinge',root);hinge.location=xyz((-w/2+.1,0,0));hinge['doorHinge']=True;hinge['openingWidth']=w-.2
 leaf=w-.2
 if glass:
  for x in [.035,leaf-.035]:box('leaf stile',x,h/2,0,.07,h,.085,'navy',hinge,'door')
  for y in [.06,.95,h-.04]:box('leaf rail',leaf/2,y,0,leaf,.07,.085,'navy',hinge,'door')
  box('door glass',leaf/2,h/2,0,leaf-.12,h-.14,.022,'glass',hinge,'door',0)
 else:
  box('steel door leaf',leaf/2,h/2,0,leaf,h,.075,'navy',hinge,'door',.025)
  box('inset steel panel',leaf/2,h/2,-.045,leaf-.18,h-.25,.02,'metal',hinge,'door',.018)
 rod('door pull',(leaf-.14,.95,-.075),(leaf-.14,1.25,-.075),.018,'metal',hinge,'door')
 for y in [.4,h-.4]:rod('door hinge barrel',(-.01,y,-.02),(-.01,y+.12,-.02),.028,'metal',hinge,'door')
 animate(hinge,name)
 return hinge

def awning(root):
 w=6.35;verts=[(-w/2,.08), (w/2,.08),(w/2,-.95),(-w/2,-.95)]
 # Wedge forms the sloping awning without stretching a prop.
 v=[xyz((x,y,z)) for x,y,z in [(-w/2,.45,.08),(w/2,.45,.08),(w/2,.05,-.95),(-w/2,.05,-.95),(-w/2,.35,.08),(w/2,.35,.08),(w/2,-.08,-.95),(-w/2,-.08,-.95)]]
 mesh=bpy.data.meshes.new('sloped awning');mesh.from_pydata(v,[],[(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]);mesh.update();o=bpy.data.objects.new('sloped teal canopy',mesh);bpy.context.collection.objects.link(o);finish(o,o.name,'teal',root,'shell')
 box('awning gold edge',0,-.005,-.96,w,.08,.035,'yellow',root)
 for x in [-w*.4,w*.4]:rod('awning bracket',(x,-.25,.04),(x,.02,-.85),.028,'navy',root)

def shelf(root):
 for x in [-.42,.42]:
  for z in [-1.62,1.62]:box('shelf upright',x,.82,z,.055,1.64,.055,'navy',root,bevel=.01)
 for y in [.14,.61,1.08,1.55]:
  box('shelf level',0,y,0,.9,.055,3.4,'metal',root,bevel=.008)
  if y<1.5:
   for side in [-1,1]:
    for i in range(8):
     z=-1.4+i*.4;height=.22+(i%3)*.045;mat=['red','yellow','blue','green'][i%4]
     box('packaged groceries',side*.26,y+.035+height/2,z,.24,height,.27,mat,root,'product-detail',0)
     box('product label',side*.385,y+.12,z,.008,.07,.12,'cream',root,'label-detail',0)

def checkout(root):
 box('counter body',0,.5,0,3.2,1,.85,'teal',root,'interior',.04);box('counter top',0,1.04,0,3.3,.09,.95,'cream',root,'interior',.025);box('counter gold stripe',0,.78,-.432,3.05,.075,.025,'yellow',root,'interior')
 box('till base',.9,1.15,0,.5,.15,.35,'navy',root,'interior')
 rod('register stand',(.9,1.2,0),(.9,1.45,0),.035,'navy',root,'interior')
 o=box('register screen',.9,1.48,-.035,.45,.3,.055,'navy',root,'interior');o.rotation_euler.x=-.2
 o=box('register display',.9,1.48,-.067,.37,.22,.015,'screen',root,'interior',.005);o.rotation_euler.x=-.2
 box('scanner',-.2,1.13,-.1,.28,.12,.25,'navy',root,'interior')

def fridge(root):
 box('fridge cabinet',0,1.2,0,1.5,2.4,.85,'white',root,'interior',.035)
 # Real front cavity: back and sides replace the solid carcass front.
 body=root.children[-1];bpy.data.objects.remove(body,do_unlink=True)
 box('fridge back',0,1.2,.38,1.5,2.4,.09,'white',root,'interior')
 for x in [-.71,.71]:box('fridge side',x,1.2,0,.08,2.4,.85,'navy',root,'interior')
 for y in [.06,2.35]:box('fridge rail',0,y,0,1.5,.12,.85,'navy',root,'interior')
 for x in [-.475,0,.475]:
  box('fridge glass door',x,1.22,-.405,.45,2.12,.025,'glass',root,'glass',0)
  rod('fridge handle',(x+.17,.9,-.445),(x+.17,1.25,-.445),.012,'metal',root,'interior')
 for y in [.35,.9,1.45,2.0]:
  box('chiller shelf',0,y,0,1.35,.025,.65,'white',root,'interior',0)
  for x in [-.5,-.25,0,.25,.5]:
   box('chilled goods',x,y+.14,-.08,.15,.25,.25,'blue' if x<0 else 'green',root,'product-detail',0)
 box('chiller header light',0,2.23,-.38,1.3,.05,.04,'light',root,'interior')

def boxes(root):
 for z in [-.32,.32]:box('pallet runner',0,.055,z,.85,.11,.12,'cardboard',root,'interior',.008)
 for x in [-.3,0,.3]:box('pallet board',x,.12,0,.22,.04,.85,'cardboard',root,'interior',.005)
 for x,y,z,w,h,d in [(0,.39,0,.74,.5,.74),(.08,.84,.04,.55,.4,.55)]:
  box('sealed supply carton',x,y,z,w,h,d,'cardboard',root,'interior',.015);box('packing tape',x,y+h/2+.002,z,.055,.006,d,'cream',root,'interior',0)

def ac(root):
 box('AC case',0,.43,0,1.4,.86,1.1,'cream',root,'roof',.035)
 box('condenser dark grille',-.25,.44,-.566,.75,.62,.025,'navy',root,'roof',.005)
 for i in range(11):box('condenser grille slat',-.6+i*.07,.44,-.59,.02,.6,.02,'metal',root,'roof',0)
 for i in range(7):box('AC vent slat',.48,.25+i*.055,-.565,.28,.018,.025,'metal',root,'roof',0)
 for x in [-.5,.5]:box('roof equipment foot',x,.06,0,.15,.12,.85,'navy',root,'roof')

def vent(root):
 rod('roof vent stem',(0,0,0),(0,.52,0),.14,'metal',root,'roof',16)
 rod('vent collar',(0,.02,0),(0,.09,0),.3,'navy',root,'roof',16)
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=1,location=xyz((0,.6,0)));o=bpy.context.object;o.scale=(.31,.31,.18);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);finish(o,'vent mushroom cap','metal',root,'roof')
 for i in range(12):
  a=i*math.tau/12;rod('vent cap rib',(.29*math.cos(a),.58,.29*math.sin(a)),(.23*math.cos(a),.73,.23*math.sin(a)),.01,'navy',root,'roof')

def light(root):
 box('wall light plate',0,.0,0,.16,.22,.05,'navy',root)
 rod('lamp arm',(0,.0,-.03),(0,.12,-.28),.025,'navy',root)
 bpy.ops.mesh.primitive_cone_add(vertices=16,radius1=.18,radius2=.09,depth=.17,location=xyz((0,.03,-.28)));finish(bpy.context.object,'lamp shade','navy',root,'shell')
 rod('lamp warm lens',(0,-.055,-.28),(0,-.07,-.28),.14,'light',root,vertices=16)

def camera(root):
 box('camera wall plate',0,0,0,.15,.2,.04,'navy',root);rod('camera bracket',(0,-.02,-.02),(0,-.08,-.22),.02,'metal',root)
 o=box('security camera housing',0,.02,-.33,.18,.15,.34,'cream',root,bevel=.025);o.rotation_euler.x=.18
 box('camera black lens',0,-.01,-.51,.12,.09,.02,'navy',root,bevel=.01)

def downpipe(root):
 rod('rain pipe',(0,.2,0),(0,3.7,0),.065,'navy',root)
 rod('roof elbow',(0,3.7,0),(.18,3.95,0),.065,'navy',root)
 rod('drain outlet',(0,.2,0),(0,.12,-.17),.075,'navy',root)
 for y in [.6,2,3.4]:box('pipe wall clip',0,y,.015,.17,.055,.16,'metal',root)

components={};part_report={}
for name,fn in [('display-window',window),('front-glass-door',lambda r:door(r,'front-door')),('delivery-door',lambda r:door(r,'delivery-door',1.5,2.6,False)),('stockroom-door',lambda r:door(r,'stockroom-door',1.5,2.6,False)),('shop-awning',awning),('retail-shelf',shelf),('checkout-counter',checkout),('refrigerator',fridge),('stock-boxes',boxes),('roof-ac',ac),('roof-vent',vent),('exterior-light',light),('security-camera',camera),('rain-downpipe',downpipe)]:
 root=empty(name);root['module']=name;root['units']='metres';fn(root);batch(root);components[name]=root;part_report[name]=export(root,PARTS/(name+'.glb'))
 bpy.context.view_layer.update()
 points=[o.matrix_world@Vector(v)for o in root.children_recursive if o.type=='MESH'for v in o.bound_box]
 part_report[name]['size']=[max(v[k]for v in points)-min(v[k]for v in points)for k in [0,2,1]]
 for o in members(root):o.hide_render=True;o.name='library::'+o.name

building=empty('block-mart');building['referenceSha256']=sha;building['units']='metres';building['architecture']='chamfered corner shop with recessed storefront and rear stockroom';building['source']='Directly authored in Blender from approved concept';building['placementScale']='1,1,1'
placed=[];colliders=[];fixtures=[];door_plan=[]
def place(name,x,z,y=0,tx=1,tz=0,fixture=False):
 template=components[name];old=members(template);mapping={o:o.copy() for o in old}
 for o,q in mapping.items():
  if o.type=='MESH':q.data=o.data.copy()
  bpy.context.collection.objects.link(q);q.parent=mapping.get(o.parent);q.hide_render=False;q.name=o.name.removeprefix('library::')
 root=mapping[template];root.parent=building;root.location=xyz((x,y,z));root.rotation_euler.z=-math.atan2(tz,tx);root.name=name+'-placed';placed.append(root)
 if fixture:fixtures.append({'kind':name,'x':x,'z':z,'yaw':math.atan2(-tz,tx)})
 return root

def oriented_box(name,a,b,bottom,top,depth,mat='cream',part='shell'):
 tx,tz=b[0]-a[0],b[1]-a[1];length=math.hypot(tx,tz);o=box(name,(a[0]+b[0])/2,(bottom+top)/2,(a[1]+b[1])/2,length,top-bottom,depth,mat,building,part,0 if part=='brick-detail' else .012);o.rotation_euler.z=-math.atan2(tz,tx);return o

def wall(a,b,openings=(),interior=False):
 dx,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dz);tx,tz=dx/length,dz/length;nx,nz=tz,-tx
 cuts=sorted(set([0,length]+[v for low,high,bottom,top in openings for v in [low,high]]))
 def point(t,out=0):return (a[0]+tx*t+nx*out,a[1]+tz*t+nz*out)
 for lo,hi in zip(cuts,cuts[1:]):
  hole=next((v for v in openings if v[0]<=(lo+hi)/2<=v[1]),None)
  ranges=[(0,hole[2]),(hole[3],4.1)] if hole else [(0,4.1)]
  for bottom,top in ranges:
   if top-bottom<.001:continue
   oriented_box('room wall' if interior else 'masonry wall',point(lo),point(hi),bottom,top,.28,'cream' if interior else 'brick-base','interior' if interior else 'shell')
   colliders.append({'a':point(lo),'b':point(hi),'bottom':bottom,'top':top,'thickness':.28,'interior':interior})
 if interior:return
 # The facade is actual shallow brick relief, clipped around real openings.
 for row in range(13):
  bottom=.55+row*.22;top=bottom+.205;start=-.25 if row%2 else 0
  while start<length:
   lo=max(.009,start+.008);hi=min(length-.009,start+.48)
   if hi>lo:
    for seg_lo,seg_hi in [(lo,hi)]:
     spans=[(seg_lo,seg_hi)]
     for ol,oh,ob,ot in openings:
      if bottom<ot and top>ob:
       next_spans=[]
       for sl,sh in spans:
        if sh<=ol or sl>=oh:next_spans.append((sl,sh))
        else:
         if sl<ol:next_spans.append((sl,ol))
         if sh>oh:next_spans.append((oh,sh))
       spans=next_spans
     for sl,sh in spans:
      if sh-sl>.025:oriented_box('raised brick',point(sl,.157),point(sh,.157),bottom,top,.03,'brick' if rng.random()<.72 else 'brick-warm','brick-detail')
   start+=.5
 # Cream plinth, cornice and lintels have physical thickness.
 for bottom,top in [(0,.55),(3.43,4.1)]:
  ranges=[(0,length)]
  for ol,oh,ob,ot in openings:
   if bottom<ot and top>ob:
    updated=[]
    for lo,hi in ranges:
     if hi<=ol or lo>=oh:updated.append((lo,hi))
     else:
      if lo<ol:updated.append((lo,ol))
      if hi>oh:updated.append((oh,hi))
    ranges=updated
  for lo,hi in ranges:
   if hi-lo>.01:oriented_box('plaster band',point(lo,.16),point(hi,.16),bottom,top,.06,'cream')
 # Small visible repaired patches, geometry rather than a terrain/decal backing.
 for t in [length*.15,length*.82]:
  if not any(ol-.2<t<oh+.2 and ob<.4 for ol,oh,ob,ot in openings):oriented_box('exposed base repair',point(t-.13,.197),point(t+.13,.197),.08,.23,.018,'brick','wear-detail')

poly=[(-5,-5),(5,-5),(5,3),(3,5),(-5,5)]
prism('pentagonal foundation',poly,-.16,0,'floor',building,'interior')
for x in [i*.5 for i in range(-10,11)]:
 end=min(5,8-x);box('floor grout',x,.004,(-5+end)/2,.012,.008,end+5,'grout',building,'interior',0)
for z in [i*.5 for i in range(-10,11)]:
 end=min(5,8-z);box('floor grout',(-5+end)/2,.004,z,end+5,.008,.012,'grout',building,'interior',0)
wall((-5,-5),(5,-5),[(1.15,2.65,0,2.6)])
wall((5,-5),(5,3),[(1.1,6.9,.75,3.1)])
diag=math.sqrt(8);wall((5,3),(3,5),[(diag/2-.9,diag/2+.9,0,3.3)])
wall((3,5),(-5,5),[(1.1,6.9,.75,3.1)])
wall((-5,5),(-5,-5))
wall((-5,-1.2),(-1.2,-1.2),[(1.15,2.65,0,2.6)],True)
wall((-1.2,-1.2),(-1.2,-5),(),True)
place('display-window',5,-1,.75,0,1);place('display-window',-1,5,.75,-1,0)
place('shop-awning',5,-1,3.05,0,1);place('shop-awning',-1,5,3.05,-1,0)
front=place('front-glass-door',4,4,0,-math.sqrt(.5),math.sqrt(.5));rear=place('delivery-door',-3.1,-5);inside=place('stockroom-door',-3.1,-1.2)
for kind,x,z,t in [('front',4,4,(-math.sqrt(.5),math.sqrt(.5))),('delivery',-3.1,-5,(1,0)),('stockroom',-3.1,-1.2,(1,0))]:door_plan.append({'id':kind,'center':[x,z],'width':1.8 if kind=='front' else 1.5,'height':2.7 if kind=='front' else 2.6,'tangent':t,'hingeName':kind+'-door-hinge','openAngle':math.pi/2})
# Fixed transom and canopy follow the corner entrance's orientation exactly.
portal=empty('corner entrance details',building);portal.location=xyz((4,0,4));portal.rotation_euler.z=-math.pi*.75
box('fixed glass transom',0,3.0,.09,1.64,.5,.025,'glass',portal,'glass',0)
box('transom header',0,3.3,0,1.95,.08,.28,'navy',portal)
box('entrance canopy',0,2.94,-.52,2.95,.2,1.1,'teal',portal,bevel=.035)
for x in [-.7,.7]:rod('canopy downlight',(x,2.83,-.52),(x,2.815,-.52),.1,'light',portal,vertices=16)
box('store sign panel',0,3.99,-.21,3.25,.82,.15,'teal',portal,bevel=.025)
for x in [-1.64,1.64]:box('sign frame',x,3.99,-.3,.055,.89,.055,'metal',portal)
for y in [3.56,4.42]:box('sign frame',0,y,-.3,3.3,.055,.055,'metal',portal)
text('raised store lettering','BLOCK MART',0,4,-.303,.56,portal)
# Attached threshold; no arbitrary square ground pad around the asset.
prism('corner entry step',[(3.2,5.13),(5.13,3.2),(5.63,3.7),(3.7,5.63)],-.08,.035,'cream',building,'shell')
box('delivery loading step',-3.1,.025,-5.45,1.8,.05,.65,'cream',building)
for x in [-.3,2.1]:place('retail-shelf',x,.2,fixture=True)
place('checkout-counter',.3,3.6,fixture=True)
for x in [.3,2,3.7]:place('refrigerator',x,-4.4,0,-1,0,True)
for x,z in [(-4.4,-3.7),(-1.8,-3.7),(-4.4,-2)]:place('stock-boxes',x,z,fixture=True)
place('stock-boxes',-4.4,-5.65)
# Distinct stepped roof and individually modeled parapet coping.
prism('separate roof slab',poly,4.07,4.22,'navy',building,'roof')
for a,b in zip(poly,poly[1:]+poly[:1]):
 oriented_box('parapet',a,b,4.18,4.5,.24,'cream','roof')
coping_ring(poly,4.5,4.61,building)
corner_poly=[(5,3),(3,5),(1.9,5),(5,1.9)]
prism('raised corner parapet',corner_poly,4.2,5.02,'cream',building,'roof');prism('raised corner cap',corner_poly,5.02,5.13,'navy',building,'roof')
# An offset rear equipment roof gives another readable height change.
prism('stockroom roof step',[(-5,-5),(-1.2,-5),(-1.2,-1.2),(-5,-1.2)],4.2,4.48,'navy',building,'roof')
place('roof-ac',2,-3.1,4.22,-1,0);place('roof-vent',-2.6,-2.5,4.48)
place('rain-downpipe',-4.6,5.2,0,-1,0);place('rain-downpipe',-4.6,-5.2)
for a,b in [((-5.18,-5),(-5.18,5)),((-5,-5.18),(5,-5.18))]:rod('roof rain gutter',(a[0],4.1,a[1]),(b[0],4.1,b[1]),.065,'navy',building,'roof')
place('exterior-light',-4.4,5.2,3.35,-1,0);place('exterior-light',-3.1,-5.2,2.95)
place('security-camera',5.2,2.5,3.55,0,1)
for x,z in [(0,0),(2.4,1),(-3,-3)]:box('ceiling light panel',x,3.98,z,1.3,.055,.45,'light',building,'roof')
# Record accurate module bounds before static batching removes render-only hierarchy.
bpy.context.view_layer.update()
for f in fixtures:
 root=next(r for r in placed if r.name.startswith(f['kind']) and abs(r.location.x-f['x'])<.01 and abs(-r.location.y-f['z'])<.01)
 pts=[o.matrix_world@Vector(v) for o in root.children_recursive if o.type=='MESH' for v in o.bound_box]
 f['bounds']={'min':[min(p.x for p in pts),min(p.z for p in pts),-max(p.y for p in pts)],'max':[max(p.x for p in pts),max(p.z for p in pts),-min(p.y for p in pts)]}
batch(building)
bpy.context.scene.frame_set(1)
full=export(building,ROOT/'block-mart.glb');lod=export(building,ROOT/'block-mart-lod.glb',('brick-detail','product-detail','label-detail','wear-detail'))
plan={'units':'metres','floor':poly,'wallThickness':.28,'wallHeight':4.1,'doors':door_plan,'walls':colliders,'fixtures':fixtures,'referenceSha256':sha}
(ROOT/'layout.json').write_text(json.dumps(plan,indent=2)+'\n')
report={'source':'Direct Blender modeling from approved image','referenceSha256':sha,'full':full,'lod':lod,'parts':part_report,'materials':len(M),'scale':[1,1,1],'gameIntegrated':True}
runtime=Path('apps/client/src/fps/models/block-mart');runtime.mkdir(parents=True,exist_ok=True)
for name in ['block-mart.glb','block-mart-lod.glb','layout.json']:shutil.copyfile(ROOT/name,runtime/name)
shutil.copytree(PARTS,runtime/'parts',dirs_exist_ok=True)
(ROOT/'model-report.json').write_text(json.dumps(report,indent=2)+'\n')
# Source includes an organized hidden kit collection, complete building, and studio cameras.
kit_collection=bpy.data.collections.new('Reusable modules');bpy.context.scene.collection.children.link(kit_collection)
kit_collection.hide_viewport=True;kit_collection.hide_render=True
for index,root in enumerate(components.values()):
 root.location=(20+(index%4)*8,-(index//4)*7,0)
 for o in members(root):
  for col in list(o.users_collection):col.objects.unlink(o)
  kit_collection.objects.link(o);o.hide_render=True
# Batching placed copies must never overwrite an editable library prototype's mesh data.
kit_collection.hide_viewport=False;bpy.context.view_layer.update();library_check={}
for name,root in components.items():
 inverse=root.matrix_world.inverted();points=[inverse@o.matrix_world@Vector(v)for o in root.children_recursive if o.type=='MESH'for v in o.bound_box]
 size=[max(v[k]for v in points)-min(v[k]for v in points)for k in [0,2,1]]
 assert all(abs(a-b)<.0001 for a,b in zip(size,part_report[name]['size'])),(name,size,part_report[name]['size'])
 library_check[name]=size
(ROOT/'source-library-check.json').write_text(json.dumps(library_check,indent=2)+'\n');kit_collection.hide_viewport=True
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=False;scene.render.resolution_x=1200;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.world=bpy.data.worlds.new('soft blue studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.6,.7,.8,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.55
for pos,energy,size in [((4,-8,13),1800,9),((-9,-3,8),1000,8),((0,8,10),1300,7)]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=energy;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,1.8))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.18));ground=bpy.context.object;ground.name='Studio floor (not exported)';ground.data.materials.append(M['floor'])
for x,z in [(0,0),(2.2,-2.8)]:
 bpy.ops.object.light_add(type='AREA',location=xyz((x,3.85,z)));bpy.context.object.data.energy=130;bpy.context.object.data.size=3
bpy.ops.object.camera_add(location=(16,-20,13));cam=bpy.context.object;cam.data.type='ORTHO';scene.camera=cam
hinges=[o for o in building.children_recursive if o.get('doorHinge')]
def preview(name,pos,target,scale,roof=True,open_doors=()):
 if '--skip-renders' in sys.argv:return
 for o in building.children_recursive:o.hide_render=(not roof and o.get('part')=='roof')
 for hinge in hinges:hinge.rotation_euler.z=math.radians(65) if any(hinge.name.startswith(n) for n in open_doors) else 0
 cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;scene.render.filepath=str(ROOT/(name+'.png'));bpy.ops.render.render(write_still=True)
preview('preview-exterior',(16,-20,8),(0,0,1.9),17,True,('front-door',))
preview('preview-rear',(-15,17,11),(0,0,2),17,True,('delivery-door',))
preview('preview-interior',(0,-.1,26),(0,0,0),13.5,False,('front-door','delivery-door','stockroom-door'))
for o in building.children_recursive:o.hide_render=False
for hinge in hinges:hinge.rotation_euler.z=0
cam.location=(16,-20,8);cam.rotation_euler=(Vector((0,0,1.9))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=17
ref=bpy.data.images.load(str((ROOT/'references/block-mart.png').resolve()));ref.pack()
ref_empty=empty('Approved Block Mart reference');ref_empty.empty_display_type='IMAGE';ref_empty.data=ref;ref_empty.empty_display_size=12;ref_empty.location=(-15,0,4);ref_empty.hide_render=True
bpy.ops.wm.save_as_mainfile(filepath=str((ROOT/'block-mart.blend').resolve()),compress=True)
print(json.dumps(report,indent=2))
