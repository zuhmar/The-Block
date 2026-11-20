"""Fresh Blender character library, measured from reference.png/landmarks.json.
No existing GLB, mesh or Blender file is read by this builder.
"""
import bpy, math, json, os, hashlib
from mathutils import Vector
from math import sin,cos,pi,sqrt
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
ROOT=os.getcwd();OUT=os.path.join(ROOT,'art/characters/npc-image-rebuild');CLIENT=os.path.join(ROOT,'apps/client/src/fps/models/npc-image-rebuild')
D=json.load(open(os.path.join(OUT,'landmarks.json')));S=D['heightMeters']/(D['groundPixel']-D['baseTopPixel'])
REF=os.path.join(OUT,'reference.png');SHA=hashlib.sha256(open(REF,'rb').read()).hexdigest()
image=bpy.data.images.load(REF);image.pack()
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.use_denoising=False;scene.render.resolution_x=640;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
Z=lambda py:(D['groundPixel']-py)*S
COLORS={'skin':'eef1f5','cloth':'2b3450','cuff':'657440','pants':'30333a','thread':'6e414c','ivory':'e3d8be','sole':'24252a','gold':'c9a24b','steel':'50545e','amber':'414957','dark':'1b1d24','visor':'090d14'}
def lin(h):
 a=[int(h[i:i+2],16)/255 for i in (0,2,4)];return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in a)

def create(kind):
 heavy=kind=='swat';mil=kind=='police';dressed=True;mats={}
 for key,h in COLORS.items():
  if key=='cloth':h='232833' if heavy else '29334f' if mil else 'bcbfbd'
  if key=='pants' and mil:h='252d47'
  m=bpy.data.materials.new('Image_'+kind+'_'+key);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*lin(h),1);p.inputs['Roughness'].default_value=.26 if key in ['skin','visor'] else .32 if key in ['gold','amber','steel'] else .68;p.inputs['Metallic'].default_value=.8 if key=='gold' else .12 if key=='steel' else 0;p.inputs['Coat Weight'].default_value=.25 if key in ['skin','visor'] else .05;mats[key]=m
 arm=bpy.data.armatures.new('ImageSkeleton_'+kind);rig=bpy.data.objects.new('ImageRig_'+kind,arm);bpy.context.collection.objects.link(rig);rig['referenceSha256']=SHA;rig['designSource']='reference.png + traced landmarks';rig['kind']=kind
 bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 def bone(n,a,b,parent=None):
  e=arm.edit_bones.new(n);e.head=a;e.tail=b
  if parent:e.parent=arm.edit_bones[parent]
 bone('root',(0,0,0),(0,0,.2));bone('hips',(0,0,.87),(0,0,1),'root');bone('spine',(0,0,1),(0,0,1.23),'hips');bone('chest',(0,0,1.23),(0,0,1.44),'spine');bone('neck',(0,0,1.44),(0,0,1.53),'chest');bone('head',(0,0,1.53),(0,0,2),'neck')
 spread=.85 if not dressed else 1
 for side,s in [('L',-1),('R',1)]:
  bone('shoulder.'+side,(s*.05,0,1.4),(s*.16,0,1.37),'chest');bone('upper_arm.'+side,(s*.16,0,1.37),(s*.27*spread,0,1.13),'shoulder.'+side);bone('forearm.'+side,(s*.27*spread,0,1.13),(s*.30*spread,.015,.89),'upper_arm.'+side);bone('hand.'+side,(s*.30*spread,.015,.89),(s*.31*spread,.025,.74),'forearm.'+side)
  for n in range(3):bone(f'finger{n}.{side}',(s*.31*spread+(n-1)*.018,.02,.80),(s*.31*spread+(n-1)*.018,.04,.735),'hand.'+side)
  bone('thumb.'+side,(s*.28*spread,.04,.88),(s*.27*spread,.05,.83),'hand.'+side)
  bone('thigh.'+side,(s*.075,0,.87),(s*.12,0,.54),'hips');bone('shin.'+side,(s*.12,0,.54),(s*.16,0,.22),'thigh.'+side);bone('foot.'+side,(s*.16,0,.22),(s*.23,.18,.1),'shin.'+side)
 bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False);parts=[]
 def mesh(name,verts,faces,mat,slot,bone=None):
  data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(mats[mat]);o['clothingSlot']=slot;o['bindBone']=bone or '';parts.append(o)
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
  for p in data.polygons:p.use_smooth=True
  return o
 def tag(o,mat,slot,bone):
  o.data.materials.append(mats[mat]);o['clothingSlot']=slot;o['bindBone']=bone or '';parts.append(o)
  bpy.context.view_layer.objects.active=o;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.select_set(False)
  for p in o.data.polygons:p.use_smooth=True
  return o
 def ball(name,p,size,mat,slot,bone,seg=24,rings=14):
  bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=p);o=bpy.context.object;o.name=name;o.scale=size;return tag(o,mat,slot,bone)
 def line(name,pts,r,mat,slot,bone):
  c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2;c.resolution_u=8;a=c.splines.new('BEZIER');a.bezier_points.add(len(pts)-1)
  for v,p in zip(a.bezier_points,pts):v.co=p;v.handle_left_type=v.handle_right_type='AUTO'
  o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.select_set(False);return tag(o,mat,slot,bone)
 def cage(name,rows,mat,slot,bone=None,fold=0,sides=24):
  samples=[]
  for i in range(len(rows)-1):
   for j in range(4):
    t=j/4;a=rows[max(0,i-1)];b=rows[i];c=rows[i+1];d=rows[min(len(rows)-1,i+2)]
    samples.append(tuple(.5*(2*p1+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t) for p0,p1,p2,p3 in zip(a,b,c,d)))
  samples.append(rows[-1]);vs=[];fs=[]
  for i,(x,y,z,rx,ry) in enumerate(samples):
   t=i/(len(samples)-1)
   for n in range(sides):
    a=n*2*pi/sides;wr=fold*sin(3*a+11*t)*sin(pi*t)**2;vs.append((x+cos(a)*(rx+wr),y+sin(a)*(ry+wr*.6),z))
  for i in range(len(samples)-1):
   for n in range(sides):a=i*sides+n;b=i*sides+(n+1)%sides;fs.append((a,b,b+sides,a+sides))
  fs.extend([tuple(range(sides-1,-1,-1)),tuple((len(samples)-1)*sides+n for n in range(sides))]);return mesh(name,vs,fs,mat,slot,bone)
 def patch(name,points,y,depth,mat,slot,bone,bevel=.007):
  curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='2D';curve.resolution_u=2;curve.fill_mode='BOTH';curve.extrude=depth/2;curve.bevel_depth=bevel;curve.bevel_resolution=2;a=curve.splines.new('POLY');a.points.add(len(points)-1)
  for p,(x,z) in zip(a.points,points):p.co=(x,z,0,1)
  a.use_cyclic_u=True;o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);o.rotation_euler=(pi/2,0,0);o.location=(0,y,0);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');return tag(bpy.context.object,mat,slot,bone)
 def panel(name,x,z,y,w,h,mat,slot,bone,depth=.02):
  c=min(w,h)*.16;return patch(name,[(x-w/2+c,z-h/2),(x+w/2-c,z-h/2),(x+w/2,z-h/2+c),(x+w/2,z+h/2-c),(x+w/2-c,z+h/2),(x-w/2+c,z+h/2),(x-w/2,z+h/2-c),(x-w/2,z-h/2+c)],y,depth,mat,slot,bone)
 # The head and body dimensions come from the image's base silhouette.
 R=D['head']['radiusPixels']*S;HZ=Z(D['head']['centerY']);ball('Image head',(0,0,HZ),(R,R,R),'skin','base','head',32,24)
 cage('Image black torso',[(0,0,1.48,.04,.04),(0,0,1.4,.13,.075),(0,0,1.2,.09,.066),(0,0,.91,.105,.07),(0,0,.85,.025,.025)],'skin','base')
 if dressed:
  body=[(0,0,Z(py),r*S,dep*S) for py,r,dep in D['bodyRows']]
  if mil or heavy:body=[(x,y,z,rx*.93,ry*.97) for x,y,z,rx,ry in body]
  cage('Image garment body',body,'cloth','torso',fold=.003)
  cage('Image hem',[(0,0,Z(568),.16,.115),(0,0,Z(590),.151,.109)],'cuff' if not(mil or heavy) else 'cloth','torso','spine')
  if kind=='lookout':
   for side in [-1,1]:
    panel('Open olive vest panel',side*.11,1.15,.12,.12,.43,'cuff','torso','spine',.025)
    panel('Vest lower pocket',side*.115,1.02,.144,.09,.1,'cuff','torso','spine')
   line('Crossbody sling strap',[(-.13,.07,1.42),(0,.14,1.18),(.13,.14,1.0)],.022,'dark','torso','chest')
   panel('Sling pouch',.065,1.10,.165,.19,.14,'dark','torso','spine',.05)
  else:
   cage('Uniform collar',[(0,0,1.47,.055,.06),(0,0,1.405,.09,.083)],'cloth','torso','chest',sides=20)
   panel('Protective vest',0,1.22,.126,.335,.36,'dark','torso','chest',.045)
   for side in [-1,1]:
    line('Vest shoulder strap',[(side*.11,.055,1.45),(side*.13,.14,1.32),(side*.13,.15,1.15)],.018,'steel','torso','chest')
    panel('Belt equipment pouch',side*.14,.995,.135,.09,.115,'dark','torso','spine',.045)
    panel('Vest utility pocket',side*.084,1.12,.166,.12,.08,'cloth','torso','spine')
   cage('Duty belt',[(0,0,1.035,.18,.133),(0,0,.98,.17,.128)],'dark','torso','spine',sides=24);panel('Duty buckle',0,1.005,.16,.065,.06,'steel','torso','spine')
   panel('Shoulder radio',.18,1.13,.14,.06,.13,'dark','torso','chest',.04);line('Radio aerial',[(.18,.14,1.19),(.18,.14,1.31)],.005,'dark','torso','chest')
   panel('Identification patch',0,1.305,.162,.245,.082,'steel','torso','chest',.012)
   curve=bpy.data.curves.new('NPC identification','FONT');curve.body='SWAT' if heavy else 'POLICE';curve.align_x='CENTER';curve.size=.05;curve.extrude=.0005
   obj=bpy.data.objects.new('NPC identification',curve);bpy.context.collection.objects.link(obj);obj.location=(0,.18,1.285);obj.rotation_euler=(pi/2,0,pi);bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.convert(target='MESH');tag(bpy.context.object,'skin','torso','chest')
 # Limbs follow the traced shoulder/elbow/wrist rows. No old mesh is used.
 for side,s in [('L',-1),('R',1)]:
  upper='upper_arm.'+side;fore='forearm.'+side;hand='hand.'+side;foot='foot.'+side;thigh='thigh.'+side;shin='shin.'+side
  cage('Black arm '+side,[(s*.145,0,1.39,.042,.042),(s*.255*spread,0,1.14,.037,.037),(s*.30*spread,.014,.89,.034,.034)],'skin','base')
  # Voxel union creates one rounded mitten rather than disconnected human fingers.
  p=ball('Mitten palm '+side,(s*.31*spread,.022,Z(D['handCenterPixel'])),(.055,.048,.093),'skin','base',hand,24,16)
  thumb=ball('Mitten thumb '+side,(s*(.31*spread-.038),.054,.866),(.024,.029,.043),'skin','base',hand,16,12)
  bpy.ops.object.select_all(action='DESELECT');p.select_set(True);thumb.select_set(True);bpy.context.view_layer.objects.active=p;bpy.ops.object.join();parts.remove(thumb)
  p.data.remesh_voxel_size=.006;bpy.ops.object.voxel_remesh();mod=p.modifiers.new('Soften mitten union','SMOOTH');mod.factor=.6;mod.iterations=3;bpy.ops.object.modifier_apply(modifier=mod.name);mod=p.modifiers.new('Mitten topology budget','DECIMATE');mod.ratio=.42;bpy.ops.object.modifier_apply(modifier=mod.name);p.select_set(False)
  for f in p.data.polygons:f.use_smooth=True
  cage('Black leg '+side,[(s*.065,0,.9,.05,.048),(s*.12,0,.54,.041,.04),(s*.16,0,.13,.034,.035)],'skin','base')
  bare=ball('Black rounded foot '+side,(s*.175,.06,.09),(.105,.17,.055),'skin','base',foot,24,14)
  # Toe-out is explicit in the reference's front silhouettes.
  center=Vector((s*.16,0,.08));angle=-s*.42
  def turn(o):
   for v in o.data.vertices:
    d=v.co-center;v.co.x=center.x+cos(angle)*d.x-sin(angle)*d.y;v.co.y=center.y+sin(angle)*d.x+cos(angle)*d.y
  turn(bare)
  if not dressed:continue
  if heavy:
   cage('Image sleeve '+side,[(s*.15,0,1.43,.05,.065),(s*.19,0,1.36,.073,.08),(s*.26,0,1.18,.07,.07),(s*.30,.01,.94,.05,.05)],'cloth','torso',fold=.003)
   ball('Layered shoulder guard '+side,(s*.20,0,1.37),(.105,.103,.08),'steel','torso',upper)
   panel('Elbow guard '+side,s*.274,1.13,.073,.12,.13,'steel','torso',fore)
   panel('Forearm guard '+side,s*.295,1.015,.07,.10,.16,'dark','torso',fore)
   cage('SWAT wrist cuff '+side,[(s*.30,.01,.95,.053,.05),(s*.30,.01,.90,.048,.048)],'dark','torso',fore,sides=20)
  else:
   cage('Image sleeve '+side,[(s*.15,0,1.43,.046,.055),(s*.20,0,1.35,.072,.075),(s*.255,0,1.19,.07,.068)],'cloth','torso',fold=.002)
  # Cargo legs use a varied silhouette traced at knee/ankle heights.
  if kind=='lookout':
   cage('Cargo leg '+side,[(s*.085,0,.9,.09,.10),(s*.10,0,.70,.095,.10),(s*.135,0,.43,.09,.085)],'pants','legs',fold=.004)
  else:
   cage('Cargo leg '+side,[(s*.085,0,.9,.09,.10),(s*.10,0,.7,.095,.1),(s*.12,0,.51,.087,.085),(s*.145,0,.32,.092,.077),(s*.16,0,.19,.068,.065)],'pants','legs',fold=.003)
   panel('Cargo pocket '+side,s*.16,.68,.086,.11,.15,'cloth','legs',thigh,.028)
  if heavy:
   panel('SWAT knee guard '+side,s*.12,.535,.09,.13,.14,'steel','legs',shin,.026)
   panel('SWAT shin guard '+side,s*.15,.345,.08,.13,.18,'dark','legs',shin,.028)
  # Flat, chunky soles and a modeled toe box, toe-out angle matches the drawing.
  sole=cage('Flat shoe sole '+side,[(s*.16,.07,.022,.113,.2),(s*.16,.07,.063,.12,.207),(s*.16,.07,.084,.115,.20)],'sole','footwear',foot,sides=32)
  upperShoe=cage('Shaped shoe upper '+side,[(s*.16,.065,.08,.112,.194),(s*.16,.06,.125,.107,.184),(s*.16,.045,.18,.096,.15),(s*.16,-.008,.225,.082,.09),(s*.16,-.025,.25,.064,.064)],'dark' if mil or heavy else 'ivory','footwear',foot,sides=32)
  if mil or heavy:
   collar=cage('Combat boot shaft '+side,[(s*.16,-.018,.32,.069,.069),(s*.16,-.02,.225,.084,.085)],'dark','footwear',foot,sides=24);turn(collar)
  for o in [sole,upperShoe]:turn(o)
  for n in range(5 if mil or heavy else 4):
   y=(.063+n*.016) if (mil or heavy) else (.02+n*.035);z=(.30-n*.023) if (mil or heavy) else (.265-n*.015);lace=line('Lace '+side,[(s*.16-.05,y-.014 if (mil or heavy) else y,z-.013),(s*.16,y+.008,z),(s*.16+.05,y-.014 if (mil or heavy) else y,z-.013)],.0055,'steel' if mil or heavy else 'ivory','footwear',foot);turn(lace)
  if not(mil or heavy):
   accent=panel('Burgundy sneaker accent '+side,s*.263,.127,.06,.021,.055,'cloth','footwear',foot,.1);turn(accent)
 if dressed:
  cage('Pants waist',[(0,0,.95,.173,.11),(0,0,.86,.166,.1),(0,0,.78,.045,.045)],'pants','legs','hips',sides=28)
  # Headwear is freshly modeled for each image silhouette.
  H=HZ
  if kind=='lookout':
   cage('Olive backwards cap',[(0,0,1.96,.014,.014),(0,0,1.94,.10,.10),(0,0,1.88,.21,.21),(0,0,1.75,.25,.25)],'cuff','headwear','head',sides=28)
   brim=ball('Backward cap brim',(.10,-.21,1.75),(.235,.15,.014),'cuff','headwear','head',28,10)
  elif mil:
   cage('Peaked navy police cap',[(0,0,1.99,.02,.02),(0,0,1.967,.20,.17),(0,0,1.9,.265,.23),(0,0,1.76,.25,.24)],'cloth','headwear','head',sides=28)
   ball('Police cap peak',(0,.22,1.765),(.235,.15,.014),'dark','headwear','head',28,10)
   patch('Generic silver cap shield',[(-.026,1.91),(.026,1.91),(.023,1.875),(0,1.85),(-.023,1.875)],.245,.008,'steel','headwear','head')
  else:
   vs=[];fs=[];N=32;M=12
   for row in range(M+1):
    for n in range(N):
     a=n*2*pi/N;end=1.5 if sin(a)>0 else 1.84;t=.02+(end-.02)*row/M;vs.append((cos(a)*sin(t)*.266,sin(a)*sin(t)*.266,H+cos(t)*.27))
   for row in range(M):
    for n in range(N):a=row*N+n;b=row*N+(n+1)%N;fs.append((a,b,b+N,a+N))
   o=mesh('SWAT helmet shell',vs,fs,'dark','headwear','head');mod=o.modifiers.new('Helmet shell thickness','SOLIDIFY');mod.thickness=.009;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
   line('Helmet rim',[vs[M*N+n] for n in list(range(N))+[0]],.009,'steel','headwear','head')
   # The clear shield has its own material and retains the white face behind it.
   shield=bpy.data.materials.new('Image_swat_clear_shield');shield.use_nodes=True;p=shield.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.64,.79,.95,1);p.inputs['Alpha'].default_value=.2;p.inputs['Roughness'].default_value=.12;shield.surface_render_method='DITHERED';mats['shield']=shield
   vs=[];fs=[];N=24;M=10
   for row in range(M+1):
    t=.55+1.43*row/M
    for n in range(N+1):
     a=.05+(pi-.1)*n/N;vs.append((cos(a)*sin(t)*.292,sin(a)*sin(t)*.292+.025,H+cos(t)*.292))
   for row in range(M):
    for n in range(N):a=row*(N+1)+n;fs.append((a,a+1,a+N+2,a+N+1))
   mesh('Clear SWAT face shield',vs,fs,'shield','headwear','head')
   line('Face shield bottom rim',[vs[M*(N+1)+n] for n in range(N+1)],.008,'steel','headwear','head')
   for side in [-1,1]:line('Helmet chin strap',[(side*.25,.02,H),(side*.21,.02,1.47),(side*.08,.04,1.445)],.009,'dark','headwear','head')
   panel('Helmet front mount',0,H+.21,.16,.07,.05,'steel','headwear','head',.02)
 # Join intersecting pattern volumes into continuous clothing before UVs/skin.
 def unite(names,label,slot,voxel):
  selected=[o for o in parts if any(o.name.startswith(n) for n in names)]
  bpy.ops.object.select_all(action='DESELECT')
  for o in selected:o.select_set(True)
  bpy.context.view_layer.objects.active=selected[0];bpy.ops.object.join();o=bpy.context.object;o.name=label;o['clothingSlot']=slot;o['bindBone']=''
  o.data.remesh_voxel_size=voxel;bpy.ops.object.voxel_remesh();mod=o.modifiers.new('Smooth joined pattern seams','SMOOTH');mod.factor=.45;mod.iterations=2;bpy.ops.object.modifier_apply(modifier=mod.name);mod=o.modifiers.new('Retain silhouette within mesh budget','DECIMATE');mod.ratio=.17;bpy.ops.object.modifier_apply(modifier=mod.name);o.select_set(False)
  for f in o.data.polygons:f.use_smooth=True
 if dressed:
  unite(['Cargo leg','Pants waist'],'Connected image trousers','legs',.007)
  parts=[o for o in bpy.data.objects if o.type=='MESH' and o.parent is None]
  unite(['Image garment body','Image sleeve'],'Connected image garment','torso',.0065)
  parts=[o for o in bpy.data.objects if o.type=='MESH' and o.parent is None]
 # Bind all geometry to fresh bones. Adjacent bones blend at elbows and knees.
 def weight(o,v):
  fixed=o['bindBone'];x,y,z=v.co;side='L' if x<0 else 'R';a=abs(x)
  if fixed:
   if 'Mitten' in o.name and z<.86:
    t=max(0,min(1,(.87-z)/.075));return [('hand.'+side,1-t),('finger0.'+side,t)]
   return [(fixed,1)]
  if o['clothingSlot']=='legs' or ('White leg' in o.name):
   if z>.82:return [('hips',1)]
   t=max(0,min(1,(z-.48)/.13));return [('shin.'+side,1-t),('thigh.'+side,t)]
  if ('sleeve' in o.name) or ('White arm' in o.name) or (o.name=='Connected image garment' and a>.19):
   t=max(0,min(1,(z-1.08)/.15));return [('forearm.'+side,1-t),('upper_arm.'+side,t)]
  t=max(0,min(1,(z-1.1)/.28));return [('spine',1-t),('chest',t)]
 for o in parts:
  o.parent=rig;ws=[weight(o,v) for v in o.data.vertices]
  for name in set(n for row in ws for n,w in row):o.vertex_groups.new(name=name)
  for i,row in enumerate(ws):
   for n,w in row:
    if w>0:o.vertex_groups[n].add([i],w,'REPLACE')
  mod=o.modifiers.new('Image character skin','ARMATURE');mod.object=rig
 # Join only within a removable slot; preserve skin weights and use one shared atlas.
 buckets={slot:[o for o in parts if o['clothingSlot']==slot] for slot in ['base','torso','legs','footwear','headwear']};joined=[]
 for slot,objects in buckets.items():
  if not objects:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name='Image_'+kind+'_'+slot;o['clothingSlot']=slot;joined.append(o)
 bpy.ops.object.select_all(action='DESELECT')
 for o in joined:o.select_set(True)
 bpy.context.view_layer.objects.active=joined[0];bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.1,island_margin=.012);bpy.ops.uv.pack_islands(rotate=True,margin=.012);bpy.ops.object.mode_set(mode='OBJECT')
 ao=bpy.data.images.new('Image_'+kind+'_AO',width=512,height=512,alpha=False);ao.colorspace_settings.name='Non-Color';g=bpy.data.node_groups.get('glTF Material Output')
 if g is None:
  g=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree');g.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
 used=set(m for o in joined for m in o.data.materials)
 for m in used:
  tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=ao;m.node_tree.nodes.active=tex;node=m.node_tree.nodes.new('ShaderNodeGroup');node.node_tree=g;m.node_tree.links.new(tex.outputs['Color'],node.inputs['Occlusion'])
 bpy.ops.object.bake(type='AO',margin=6,use_clear=True);ao.pack()
 # Independent actions, with the same useful clip names in every fresh rig.
 rig.animation_data_create();scene.render.fps=24
 def action(name,keys):
  a=bpy.data.actions.new(name);rig.animation_data.action=a
  for frame,rots in keys:
   for p in rig.pose.bones:p.rotation_mode='XYZ';p.rotation_euler=(0,0,0)
   for n,r in rots.items():rig.pose.bones[n].rotation_euler=r
   for p in rig.pose.bones:p.keyframe_insert('rotation_euler',frame=frame)
  t=rig.animation_data.nla_tracks.new();t.name=name;t.strips.new(name,1,a);t.mute=True
 steps=[]
 for f,p in [(1,0),(7,pi/2),(13,pi),(19,1.5*pi),(25,2*pi)]:
  d={}
  for side,s in [('L',1),('R',-1)]:d['thigh.'+side]=(sin(p)*s*.28,0,0);d['shin.'+side]=(-max(0,sin(p)*s)*.34,0,0);d['upper_arm.'+side]=(-sin(p)*s*.15,0,0)
  steps.append((f,d))
 action('walk',steps);action('idle',[(1,{}),(25,{'chest':(.012,0,0)}),(49,{})]);action('grip',[(1,{}),(12,{'finger0.R':(.6,0,0),'thumb.R':(.2,0,.15)}),(24,{})]);action('combat',[(1,{'upper_arm.R':(.6,0,0),'forearm.R':(.5,0,0),'finger0.R':(.4,0,0)}),(25,{'upper_arm.R':(.6,0,0),'forearm.R':(.5,0,0),'finger0.R':(.4,0,0)})]);rig.animation_data.action=None
 for p in rig.pose.bones:p.rotation_euler=(0,0,0)
 scene.frame_set(1);bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 for o in joined:o.select_set(True)
 path=os.path.join(CLIENT,kind+'.glb');bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_animation_mode='ACTIONS',export_anim_single_armature=False,export_skins=True,export_extras=True)
 tri=sum(len(p.vertices)-2 for o in joined for p in o.data.polygons)
 for o in joined:o.hide_render=True
 print('IMAGE_MODEL',kind,tri,flush=True)
 return {'kind':kind,'root':rig,'meshes':joined,'triangles':tri,'bones':len(arm.bones),'bytes':os.path.getsize(path)}
models=[]
for kind in ['lookout','police','swat']:models.append(create(kind))
# Pack the exact generated sheet into the editable scene as a named image reference.
e=bpy.data.objects.new('FINAL NPC REFERENCE',None);bpy.context.collection.objects.link(e);e.empty_display_type='IMAGE';e.data=image;e.empty_display_size=D['imageSize'][0]*S;e.location=(0,-.5,(D['groundPixel']-D['imageSize'][1]/2)*S);e.rotation_euler=(pi/2,0,pi);e.hide_render=True;e['referenceSha256']=SHA
world=bpy.data.worlds.new('Image review studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.5,.48,.45,1);world.node_tree.nodes['Background'].inputs[1].default_value=.3
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.002));floor=bpy.context.object;floor.name='Review floor';m=bpy.data.materials.new('Review backdrop');m.diffuse_color=(.42,.40,.38,1);floor.data.materials.append(m)
for name,p,power,size in [('Key',(-3,4,5),350,3),('Fill',(4,3,3),140,3),('Rim',(0,-3,4),300,2)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.size=size;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=p;o.rotation_euler=(Vector((0,0,1.1))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,7,2.0));cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=2.25;cam.rotation_euler=(Vector((0,0,1.04))-cam.location).to_track_quat('-Z','Y').to_euler();scene.cycles.samples=24
for model in models:
 for o in model['meshes']:o.hide_render=False
 scene.render.filepath=os.path.join(OUT,model['kind']+'-front.png');bpy.ops.render.render(write_still=True)
 for o in model['meshes']:o.hide_render=True
for i,model in enumerate(models):
 model['root'].location.x=(D['imageSize'][0]/2-D['columnCenters'][model['kind']])*S
 for o in model['meshes']:o.hide_render=False
cam.data.ortho_scale=4.2;scene.render.resolution_x=1536;scene.render.resolution_y=1024;scene.render.filepath=os.path.join(OUT,'blender-lineup.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'npc-character-library.blend'))
report={'referenceSha256':SHA,'source':'Fresh Blender scene; reference.png and landmarks.json only','metersPerPixel':S,'models':[{k:v for k,v in m.items() if k not in ['root','meshes']} for m in models]};open(os.path.join(OUT,'report.json'),'w').write(json.dumps(report,indent=2)+'\n');print(json.dumps(report),flush=True)
