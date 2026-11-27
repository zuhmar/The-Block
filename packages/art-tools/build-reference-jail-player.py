"""Model the approved orange STB reference in Blender; reuse the existing 19-clip rig."""
import bpy,math,json,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path.cwd();OUT=ROOT/'art/characters/jail-player/reference-fit';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art/characters/jail-player/animated-character.blend'))
bpy.context.preferences.filepaths.save_version=0;scene=bpy.context.scene;rig=next(o for o in scene.objects if o.type=='ARMATURE')
rig.animation_data.action=None
for track in rig.animation_data.nla_tracks:track.mute=True
for p in rig.pose.bones:p.matrix_basis=Matrix.Identity(4)
for o in list(scene.objects):
 if o.type=='MESH' or o.type in ['CAMERA','LIGHT']:bpy.data.objects.remove(o,do_unlink=True)
bpy.context.view_layer.update()
objects=[]
def mat(name,color,roughness):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=roughness;return m
orange=mat('Reference vivid orange',(1,.14,.006),.43);dark=mat('Orange stitched seams',(.48,.065,.004),.48);black=mat('Glossy featureless black',(.006,.007,.008),.17);ink=mat('STB black print',(.001,.001,.001),.55);metal=mat('Zipper brushed silver',(.48,.51,.54),.26)
ink.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=0
# Nearest anatomical segments for smooth skinning; child joint positions are used,
# since the imported display-bone tail lengths do not represent limb lengths.
connections={'Hips':'Spine02','Spine02':'Spine01','Spine01':'Spine','Spine':'neck','neck':'Head','Head':'head_end','LeftArm':'LeftForeArm','LeftForeArm':'LeftHand','RightArm':'RightForeArm','RightForeArm':'RightHand','LeftUpLeg':'LeftLeg','LeftLeg':'LeftFoot','RightUpLeg':'RightLeg','RightLeg':'RightFoot'}
segments={}
for name,child in connections.items():
 if child in rig.data.bones:segments[name]=(rig.matrix_world@rig.data.bones[name].head_local,rig.matrix_world@rig.data.bones[child].head_local)
def distance(p,a,b):
 d=b-a;t=max(0,min(1,(p-a).dot(d)/max(1e-8,d.length_squared)));return (p-(a+t*d)).length

def bind(o,bones=None,rigid=None):
 bpy.context.view_layer.objects.active=o;bpy.ops.object.select_all(action='DESELECT');o.select_set(True)
 if o.type!='MESH':bpy.ops.object.convert(target='MESH');o=bpy.context.object
 for face in o.data.polygons:face.use_smooth=True
 names=[rigid] if rigid else bones or list(segments)
 groups={n:o.vertex_groups.new(name=n) for n in names}
 for v in o.data.vertices:
  if rigid:groups[rigid].add([v.index],1,'REPLACE');continue
  p=o.matrix_world@v.co;near=sorted([(distance(p,*segments[n]),n) for n in names])[:2];weights=[1/(d+.035)**4 for d,n in near];total=sum(weights)
  for (d,n),w in zip(near,weights):groups[n].add([v.index],w/total,'REPLACE')
 world=o.matrix_world.copy();o.parent=rig;o.matrix_world=world;modifier=o.modifiers.new('STB character skeleton','ARMATURE');modifier.object=rig;objects.append(o);return o

def sphere(name,center,scale,material,bone):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=24,location=center);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material);return bind(o,rigid=bone)

def loft(name,rings,material,bones,axis=False,close=True):
 # Each ring: centre, width, depth. Horizontal body rings or tangent-aligned limb rings.
 vs=[];faces=[];N=32
 for k,(c,rx,ry) in enumerate(rings):
  c=Vector(c)
  if axis:
   direction=Vector(rings[min(k+1,len(rings)-1)][0])-Vector(rings[max(0,k-1)][0]);direction.normalize();u=Vector((0,1,0)).cross(direction).normalized();v=direction.cross(u).normalized()
  else:u=Vector((1,0,0));v=Vector((0,1,0))
  for i in range(N):
   angle=i*2*math.pi/N;fold=.0022*math.sin(3*angle+k*.9)*math.sin(math.pi*k/max(1,len(rings)-1));point=c+u*((rx+fold)*math.cos(angle))+v*((ry+fold)*math.sin(angle));vs.append(point)
 for k in range(len(rings)-1):
  for i in range(N):a=k*N+i;b=k*N+(i+1)%N;faces.append((a,b,b+N,a+N))
 if close:faces.extend([tuple(reversed(range(N))),tuple((len(rings)-1)*N+i for i in range(N))])
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vs,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);o.data.materials.append(material)
 # A modest subdivision smooths the tailored silhouette rather than hiding block geometry.
 bpy.context.view_layer.objects.active=o;sub=o.modifiers.new('Tailored smooth cloth','SUBSURF');sub.levels=2;bpy.ops.object.modifier_apply(modifier=sub.name);return bind(o,bones)

def seam(name,points,material=dark,radius=.0017,bones=None,rigid=None):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=radius;c.bevel_resolution=3;s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);o.data.materials.append(material);return bind(o,bones,rigid)
bodybones=['Hips','Spine02','Spine01','Spine']
torso=loft('Tailored jumpsuit torso',[((0,0,z),w,d) for z,w,d in [(1.015,.157,.091),(1.035,.158,.092),(1.08,.15,.087),(1.18,.168,.10),(1.30,.191,.105),(1.39,.195,.10),(1.435,.16,.083),(1.46,.081,.061),(1.47,.075,.059)]],orange,bodybones)
# Padded standing collar, separate from the exposed black neck.
sphere('Black neck',(0,.012,1.54),(.061,.061,.09),black,'neck')
loft('Standing orange collar',[((0,.005,z),r,r*.85) for z,r in [(1.455,.083),(1.46,.086),(1.51,.082),(1.518,.078)]],orange,['Spine','neck'])
seam('Collar top seam',[(.079*math.cos(t),.005+.067*math.sin(t),1.512) for t in [i*2*math.pi/32 for i in range(33)]],radius=.0018,bones=['Spine','neck'])
sphere('Round reference head',(0,.008,1.785),(.221,.205,.221),black,'Head')
for label,sign in [('Left',1),('Right',-1)]:
 arm=[((sign*x,y,z),w,d) for x,y,z,w,d in [(.125,.015,1.376,.069,.07),(.16,.015,1.375,.077,.074),(.202,.018,1.342,.074,.073),(.24,.021,1.27,.069,.068),(.26,.024,1.225,.075,.075),(.277,.026,1.193,.067,.067),(.301,.026,1.125,.066,.067),(.326,.025,1.065,.069,.064),(.339,.024,1.027,.062,.06),(.343,.024,1.015,.061,.059)]]
 loft(label+' shaped sleeve',arm,orange,[label+'Arm',label+'ForeArm'],True)
 cuff=[((sign*x,.024,z),r,r) for x,z,r in [(.335,1.04,.064),(.34,1.026,.064),(.35,1.0,.061),(.354,.99,.06)]]
 loft(label+' sewn sleeve cuff',cuff,orange,[label+'ForeArm'],True)
 sphere(label+' black mitten',(sign*.368,.018,.928),(.066,.058,.092),black,label+'Hand')
 # Separate rounded thumb, deliberately understated like the approved image.
 sphere(label+' thumb',(sign*.327,-.009,.941),(.025,.033,.045),black,label+'Hand')
 rings=[((sign*x,y,z),w,d) for x,y,z,w,d in [(.087,.006,1.024,.094,.093),(.095,.007,.985,.103,.104),(.104,.01,.9,.108,.101),(.115,.012,.77,.099,.091),(.129,.012,.63,.09,.085),(.137,.011,.565,.096,.091),(.141,.009,.525,.088,.083),(.146,.006,.405,.089,.083),(.151,.001,.28,.091,.083),(.155,-.003,.205,.097,.088),(.156,-.006,.181,.091,.081),(.156,-.007,.167,.09,.08)]]
 loft(label+' folded trouser leg',rings,orange,['Hips',label+'UpLeg',label+'Leg'])
 shoe=sphere(label+' rounded black shoe',(sign*.157,-.046,.075),(.107,.153,.085),black,label+'Foot')
 for vertex in shoe.data.vertices:vertex.co.z=max(-.063,vertex.co.z)
 sphere(label+' concealed black ankle',(sign*.157,-.009,.15),(.061,.067,.06),black,label+'Foot')
 # Fine sole rim and upper garment seams give depth without heavy texture.
 seam(label+' pocket',[(sign*.065,-.094,1.0),(sign*.095,-.094,.953),(sign*.14,-.081,.926)],radius=.0022,bones=['Hips',label+'UpLeg'])
 seam(label+' shoulder seam',[(sign*.07,-.064,1.449),(sign*.115,-.087,1.425),(sign*.174,-.078,1.39)],bones=['Spine',label+'Arm'])
# Join garment volumes into one continuous tailored suit, eliminating floating
# shoulder caps and the shirt/trouser gap. This is real clothing geometry.
loft('Connected hip fabric',[((0,.008,z),w,d) for z,w,d in [(.91,.172,.099),(.95,.181,.105),(1.0,.172,.101),(1.055,.158,.093),(1.075,.154,.09)]],orange,bodybones)
garments=[o for o in objects if any(word in o.name for word in ['torso','shaped sleeve','trouser leg','Connected hip'])]
for o in garments:
 for modifier in list(o.modifiers):o.modifiers.remove(modifier)
bpy.ops.object.select_all(action='DESELECT')
for o in garments:o.select_set(True)
bpy.context.view_layer.objects.active=torso
bpy.ops.object.join();suit=bpy.context.object;suit.name='Continuous tailored jumpsuit'
# Preserve the tailored per-piece skin weights before remeshing.
weight_source=suit.copy();weight_source.data=suit.data.copy();scene.collection.objects.link(weight_source);weight_source.name='Temporary tailored weight source'
# Model in world metres, without the armature parent's centimetre transform.
world=suit.matrix_world.copy();suit.parent=None;suit.matrix_world=world
bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
suit.data.remesh_voxel_size=.009
bpy.ops.object.voxel_remesh()
smooth=suit.modifiers.new('Soft fabric transitions','SMOOTH');smooth.factor=.8;smooth.iterations=5;bpy.ops.object.modifier_apply(modifier=smooth.name)
# Sculpt shallow diagonal fabric creases into the actual front surface.
folds=[]
for sign in [1,-1]:
 for a,b in [((.063,.92),(.14,.88)),((.10,.78),(.16,.75)),((.095,.60),(.177,.56)),((.115,.38),(.18,.34)),((.105,.22),(.185,.20)),((.18,1.31),(.238,1.275)),((.245,1.205),(.29,1.18)),((.285,1.10),(.34,1.08)),((.045,1.10),(.13,1.073))]:
  folds.append((Vector((sign*a[0],a[1])),Vector((sign*b[0],b[1]))))
for v in suit.data.vertices:
 if v.co.y>-.025:continue
 point=Vector((v.co.x,v.co.z));dent=0
 for a,b in folds:
  d=b-a;t=max(0,min(1,(point-a).dot(d)/d.length_squared));crease_distance=(point-(a+t*d)).length
  dent+=.0045*math.exp(-crease_distance*crease_distance/(.011**2))*math.sin(math.pi*t)
 v.co.y+=dent
suit.data.update()
reduce=suit.modifiers.new('Efficient smooth garment','DECIMATE');reduce.ratio=.55;bpy.ops.object.modifier_apply(modifier=reduce.name)
for g in weight_source.vertex_groups:
 if not suit.vertex_groups.get(g.name):suit.vertex_groups.new(name=g.name)
transfer=suit.modifiers.new('Transfer tailored clothing weights','DATA_TRANSFER');transfer.object=weight_source;transfer.use_vert_data=True;transfer.data_types_verts={'VGROUP_WEIGHTS'};transfer.vert_mapping='POLYINTERP_NEAREST';bpy.ops.object.modifier_apply(modifier=transfer.name)
bpy.data.objects.remove(weight_source,do_unlink=True)
bpy.context.view_layer.objects.active=suit
neighbors=[[] for v in suit.data.vertices]
for edge in suit.data.edges:
 a,b=edge.vertices;neighbors[a].append(b);neighbors[b].append(a)
weights=[{g.group:g.weight for g in v.groups} for v in suit.data.vertices]
for iteration in range(4):
 result=[]
 for i,old in enumerate(weights):
  linked=neighbors[i]
  if not linked:result.append(old);continue
  mixed={g:w*.25 for g,w in old.items()}
  for k in linked:
   for g,w in weights[k].items():mixed[g]=mixed.get(g,0)+.75*w/len(linked)
  total=sum(mixed.values());result.append({g:w/total for g,w in mixed.items() if w>1e-5})
 weights=result
names=[g.name for g in suit.vertex_groups]
for group in list(suit.vertex_groups):suit.vertex_groups.remove(group)
groups=[suit.vertex_groups.new(name=name) for name in names]
for i,values in enumerate(weights):
 for g,w in values.items():groups[g].add([i],w,'REPLACE')
# Joined/deleted Blender IDs cannot be reused; rebuild the live mesh list.
objects=[o for o in scene.objects if o.type=='MESH' and o!=suit]
world=suit.matrix_world.copy();suit.parent=rig;suit.matrix_world=world;modifier=suit.modifiers.new('STB character skeleton','ARMATURE');modifier.object=rig
for face in suit.data.polygons:face.use_smooth=True
objects.append(suit)
torso=suit
# Waist stitching and the full, modeled zipper follow the curved front.
seam('Waist stitching',[(-.153,-.025,1.043),(-.108,-.076,1.04),(0,-.093,1.038),(.108,-.076,1.04),(.153,-.025,1.043)],radius=.002,bones=bodybones)
zipline=[(0,-.098,1.0),(0,-.104,1.09),(0,-.112,1.22),(0,-.113,1.32),(0,-.101,1.4),(0,-.074,1.475)]
seam('Zipper black edging',zipline,ink,.0044,bodybones);seam('Metal front zipper',[(x,y-.002,z) for x,y,z in zipline],metal,.0022,bodybones)
sphere('Silver zipper pull',(0,-.084,1.463),(.012,.005,.025),metal,'Spine')
sphere('Pull dark inset',(0,-.09,1.46),(.004,.002,.009),ink,'Spine')
bpy.ops.object.text_add(location=(0,-.133,1.269),rotation=(math.pi/2,0,0));text=bpy.context.object;text.name='STB bold chest print';text.data.body='STB';text.data.align_x='CENTER'
font=Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')
if font.exists():text.data.font=bpy.data.fonts.load(str(font))
text.data.size=.175;text.data.extrude=.0005;text.data.materials.append(ink);bpy.context.view_layer.update();text.scale.x=.264/text.dimensions.x
# Fit the lettering onto the actual curved torso instead of leaving a floating sign.
bpy.context.view_layer.objects.active=text;bpy.ops.object.convert(target='MESH');text=bpy.context.object;bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);wrap=text.modifiers.new('Printed onto cloth','SHRINKWRAP');wrap.wrap_method='PROJECT';wrap.use_project_y=True;wrap.use_project_z=False;wrap.use_positive_direction=True;wrap.use_negative_direction=False;wrap.target=torso;wrap.offset=.003;bpy.ops.object.modifier_apply(modifier=wrap.name);bind(text,bones=['Spine01','Spine'])
for im in bpy.data.images:
 if im.size[0] and not im.packed_file:
  try:im.pack()
  except RuntimeError:pass
# Preserve the editable rig and all 19 clips; new geometry uses these same bones.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'reference-jail-player.blend'),compress=True)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o in objects:o.select_set(True)
for parent in [rig.parent]:
 if parent:parent.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'animated.glb'),export_format='GLB',use_selection=True,export_animation_mode='ACTIONS',export_anim_single_armature=False,export_skins=True,export_extras=True)
# Controlled front and three-quarter review, including actual material gloss.
scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=640;scene.render.resolution_y=960;scene.render.resolution_percentage=100;scene.eevee.taa_render_samples=16
scene.world=bpy.data.worlds.new('Neutral studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.15,.17,.2,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.4
scene.view_settings.view_transform='Standard'
def light(name,loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.specular_factor=0 if 'fill' in name else 1;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
light('Large soft key',(-2.5,-3,4),220,3.5);light('Soft front fill',(2,-3,2),80,3);light('Gloss rim',(1,2,3),100,2)
bpy.ops.object.camera_add(location=(0,-5,1.11));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,1.01))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.23;scene.camera=cam
scene.render.filepath=str(OUT/'front-preview.png');bpy.ops.render.render(write_still=True)
cam.location=(2.7,-5,1.75);cam.rotation_euler=(Vector((0,0,1.03))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/'three-quarter-preview.png');bpy.ops.render.render(write_still=True)
report={'reference':'art/characters/jail-player/reference.png','referenceSha256':hashlib.sha256((ROOT/'art/characters/jail-player/reference.png').read_bytes()).hexdigest(),'method':'Blender modeled silhouette, tailored clothing, separate glossy head/hands/shoes, fitted bold lettering','rigSource':'art/characters/jail-player/animated-character.blend','bones':len(rig.data.bones),'clips':[a.name for a in bpy.data.actions],'triangles':sum(len(p.vertices)-2 for o in objects for p in o.data.polygons),'newMeshyCredits':0}
(OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n');print('REFERENCE_FIT_READY',json.dumps(report))
