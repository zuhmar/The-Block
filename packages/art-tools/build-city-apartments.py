"""Separate West Court prefab: original-size modules, six large apartments and accessible roof."""
from pathlib import Path
# Reuse our authored module construction, never resize the existing tenement model.
source=Path('packages/art-tools/build-tenement-v2.py').read_text()
prefix=source.split('openings=[]')[0]
prefix=prefix.replace("ROOT=Path('art/buildings/apartments/tenement-v2')","ROOT=Path('art/buildings/apartments/west-court')")
prefix=prefix.replace("REF=ROOT/'references/concept.png'","REF=Path('art/buildings/apartments/tenement-v2/references/concept.png')")
prefix=prefix.replace("p.get('doorHinge')","p.get('doorHinge') or p.get('propInstance')")
prefix=prefix.replace("building=empty('tenement')","building=empty('city-apartments')").replace("building['assetVersion']='tenement-v2'","building['assetVersion']='west-court-v1'")
exec(compile(prefix,'shared-tenement-modules','exec'))
wallcode='openings=[]'+source.split('openings=[]')[1].split('# Face directions')[0]
wallcode=wallcode.replace('range(23)','range(math.ceil(length/.47)+1)')
exec(compile(wallcode,'shared-facade-builder','exec'))
for face,a,b,yaw in [('front',(-9,8),(9,8),math.pi),('right',(9,8),(9,-8),-math.pi/2),('rear',(9,-8),(-9,-8),0),('left',(-9,-8),(-9,8),math.pi/2)]:
 length=math.dist(a,b);centres=[2.5,5.8,9,12.2,15.5] if length==18 else [2.6,8,13.4];holes=[]
 for floor in range(3):
  for t in centres:
   if face=='front'and floor==0 and t==9:continue
   base=floor*3.2;holes.append((t-.8,t+.8,base+.9,base+2.7));x=a[0]+(b[0]-a[0])*t/length;z=a[1]+(b[1]-a[1])*t/length;place('window',x,base+.76,z,yaw,floor)
 if face=='front':holes.append((8.1,9.9,0,2.86))
 wall(face,a,b,holes)
batch(building)
print("Facade complete",flush=True)
# Belts and pilasters retain the same architectural vocabulary at actual metre scale.
for y in [.42,3.2,6.4,9.6]:
 h=.84 if y==.42 else .19
 for z in [-8,8]:
  if z==8 and y==.42:
   for x in [-4.98,4.98]:box('entry split base',x,y,z,8.0,h,.27,'cream',building,bevel=.012)
  else:box('facade belt',0,y,z,18.18,h,.27,'cream',building,bevel=.012)
 for x in [-9,9]:box('side belt',x,y,0,.27,h,16.18,'cream',building,bevel=.012)
for x in [-8.75,8.75]:
 for z in [-8,8]:
  for row in range(13):box('corner stone',x,.45+row*.7,z,.5,.58,.29,'cream',building,bevel=.012)
entry=place('entrance',0,0,8);entry.children_recursive[0] if False else None
for o in entry.children_recursive:
 if o.get('doorHinge'):o.name='city-apartments-door-hinge'
place('entry-canopy',0,2.95,8.38);place('mailboxes',1.3,1.1,8.18,math.pi);place('intercom',.94,1.3,8.18,math.pi)
for x in [-2,2]:place('wall-lamp',x,2.25,8.2,math.pi)
place('downpipe',8.75,0,8.22,math.pi);place('downpipe',-8.75,0,-8.22)
box('West Court sign',0,3.6,8.3,4.8,.85,.16,'teal',building,bevel=.03)
font=bpy.data.fonts.load('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')
def text(label,x,y,z,size=.22,yaw=0,parent=building):
 curve=bpy.data.curves.new('lettering','FONT');curve.body=label;curve.font=font;curve.align_x='CENTER';curve.size=size;curve.extrude=.001;curve.resolution_u=2
 o=bpy.data.objects.new(label,curve);bpy.context.collection.objects.link(o);o.location=xyz(x,y,z);o.rotation_euler=(math.pi/2,0,yaw);o.parent=parent;o.data.materials.append(M['cream']);o['part']='lettering';bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
text('WEST COURT',0,3.62,8.39,.36);text('APARTMENTS',0,3.32,8.39,.24)
box('ground slab',0,-.08,0,17.76,.18,15.76,'stone',building,'interior',floor=0)
for slab in D['slabs']:
 box('structural slab',slab['x'],slab['y']-.09,slab['z'],slab['width'],.18,slab['depth'],'navy'if slab['y']>9 else 'stone',building,'roof'if slab['y']>9 else'interior',floor=round(slab['y']/3.2))
for p in D['partitions']:
 if p['y']>=9 and p['x']==-5:continue # Utility collision bounds are not visible architecture.
 box('room wall'if p['y']<9 else'roof guard or enclosure',p['x'],p['y']+p['height']/2,p['z'],p['width'],p['height'],p['depth'],'plaster'if p['y']<9 else'cream',building,'interior'if p['y']<9 else'roof',bevel=.008,floor=round(p['y']/3.2))
batch(building)
print("Shell complete",flush=True)
for floor in range(3):
 y=floor*3.2
 for col in range(46):box('timber floorboard',-8.74+col*.274,y+.014,-1,.267,.018,13.7,'wood2'if col%3==0 else'wood',building,'interior',floor=floor)
 for z in [-4,3,7]:box('hall ceiling lamp',5.15,y+2.98,z,.6,.06,.4,'light',building,'interior',floor=floor)
 for z in [-4,3]:
  for side in [-1,1]:box('bedroom casing',-2.9,y+1.35,z+side*.94,.1,2.7,.1,'wood2',building,'interior',floor=floor)
  box('bedroom lintel casing',-2.9,y+2.73,z,.1,.1,1.98,'wood2',building,'interior',floor=floor)
for stair in D['stairs']:
 floor=round(stair['y']/3.2)
 for step in range(20):
  rise=(step+1)*3.2/20;z=stair['startZ']-(step+.5)*stair['run']/20
  box('stair tread',stair['x'],stair['y']+rise-.1,z,stair['width'],.2,stair['run']/20,'wood2',building,'interior',floor=floor)
 for side in [-1,1]:
  x=stair['x']+side*(stair['width']/2+.07)
  for step in range(21):
   z=stair['startZ']-step*stair['run']/20;y=stair['y']+step*3.2/20
   rod('stair baluster',(x,y,z),(x,y+.88,z),.017,'metal',building,'interior',floor)
  rod('continuous handrail',(x,stair['y']+.9,stair['startZ']),(x,stair['y']+4.1,stair['startZ']-stair['run']),.026,'navy',building,'interior',floor)
batch(building)
print("Stairs complete",flush=True)
# Shared Meshy geometry is imported once, then instanced into all six apartments.
prop_templates={}
for asset in sorted(set(f['asset'] for f in D['fixtures'])):
 before=set(bpy.data.objects);path=Path('apps/client/src/fps/models/apartment-props')/(asset+'.glb')
 bpy.ops.import_scene.gltf(filepath=str(path.resolve()));new=[o for o in bpy.data.objects if o not in before];bpy.context.view_layer.update()
 meshes=[o for o in new if o.type=='MESH']
 for o in meshes:
  o.data.transform(o.matrix_world);o.parent=None;o.matrix_world=Matrix.Identity(4);o['part']='apartment-prop'
 for o in new:
  if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
 prop_templates[asset]=meshes
for f in D['fixtures']:
 floor=round(f['y']/3.2);r=empty(f['asset']+'-floor-'+str(floor),building)
 r.location=xyz(f['x'],f['y'],f['z']);r.rotation_euler.z=f.get('rotation',0);r['propInstance']=True;r['part']='apartment-prop'
 for original in prop_templates[f['asset']]:
  o=original.copy();o.data=original.data;bpy.context.collection.objects.link(o);o.parent=r;o['part']='apartment-prop';o['floor']=floor;o['propAsset']=f['asset']
for meshes in prop_templates.values():
 for o in meshes:bpy.data.objects.remove(o,do_unlink=True)
building['propSet']='meshy-apartments-v1';building['propInstances']=len(D['fixtures'])
# Individually numbered entrance leaves and a functioning roof exit, exported as separate hinges.
for id,d in enumerate(D['doors']):
 frame=empty('apartment-frame-'+str(id),building);frame.location=xyz(d['x'],d['y'],d['z']);frame.rotation_euler.z=d['yaw']
 for x in [-.08,d['width']+.08]:box('door jamb',x,d['height']/2,0,.12,d['height']+.1,.22,'wood2',frame,'interior'if id<6 else'roof')
 box('door frame header',d['width']/2,d['height']+.08,0,d['width']+.28,.12,.22,'wood2',frame,'interior'if id<6 else'roof')
 hinge=empty('apartment-door-'+str(id),frame);hinge['doorHinge']=True
 box('apartment door leaf',d['width']/2,d['height']/2,0,d['width'],d['height'],.14,'teal'if id==6 else'wood',hinge,'apartment-door',.018)
 for y in [.7,1.8]:box('recessed door panel',d['width']/2,y,-.078,d['width']-.24,.8,.025,'navy'if id==6 else'wood2',hinge,'apartment-door',.015)
 rod('lever handle',(d['width']-.17,1.15,-.12),(d['width']-.38,1.15,-.12),.024,'metal',hinge,'apartment-door')
 box('unit number plaque',d['width']/2,2.1,-.1,.6,.28,.04,'navy',hinge,'apartment-door',.015)
 text('ROOF'if id==6 else d['label'].split()[-1],d['width']/2,2.04,-.125,.15,yaw=math.pi,parent=hinge)
# Roof deck is already cut around the stairwell in the authoritative slabs.
box('stair head roof',7.65,12.62,-.8,2.7,.24,10.85,'navy',building,'roof',.018)
for z in [-8,8]:box('parapet cap',0,10.74,z,18.3,.18,.4,'navy',building,'roof',.025)
for x in [-9,9]:box('side parapet cap',x,10.74,0,.4,.18,16.3,'navy',building,'roof',.025)
place('roof-ac',-5,9.7,-4);place('roof-vent',-5,9.7,2)
batch(building);bpy.context.scene.frame_set(1)
full=export(building,ROOT/'city-apartments.glb')
originals={}
for o in building.children_recursive:
 if o.type!='MESH' or o.get('part')in ['brick-detail','fine-detail','interior','lettering','door','apartment-door','apartment-prop'] or o.data.materials[0].name in ['apt-glass','apt-grout']:continue
 originals[o]=o.data;o.data=o.data.copy();bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('distance simplification','DECIMATE');mod.ratio=.28;bpy.ops.object.modifier_apply(modifier=mod.name)
low=export(building,ROOT/'city-apartments-lod.glb',('brick-detail','fine-detail','interior','lettering','apartment-door','apartment-prop'))
for o,m in originals.items():o.data=m
report={'assetVersion':'west-court-v1','footprint':[18,16],'stories':3,'apartments':6,'floorLevels':[0,3.2,6.4],'roofLevel':9.6,'individualDoors':7,'full':full,'lod':low,'scale':[1,1,1],'propSet':'meshy-apartments-v1','propInstances':len(D['fixtures']),'uniquePropAssets':8}
(ROOT/'model-report.json').write_text(json.dumps(report,indent=2)+'\n');(ROOT/'facade-openings.json').write_text(json.dumps(openings,indent=2)+'\n')
runtime=Path('apps/client/src/fps/models/city-apartments');runtime.mkdir(parents=True,exist_ok=True)
for name in ['city-apartments.glb','city-apartments-lod.glb','layout.json']:shutil.copyfile(ROOT/name,runtime/name)
library=bpy.data.collections.new('Reusable apartment modules');bpy.context.scene.collection.children.link(library);library.hide_render=True
for i,r in enumerate(components.values()):
 r.location=(30+(i%4)*6,-(i//4)*7,0)
 for o in members(r):
  for col in list(o.users_collection):col.objects.unlink(o)
  library.objects.link(o);o.hide_render=True
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=False;scene.render.resolution_x=1200;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.render.film_transparent=True
scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.72,.8,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
for pos,power in [((8,-18,24),3400),((-15,-9,16),2600),((3,14,20),3000)]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.size=12;o.rotation_euler=(Vector((0,0,4))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(25,-30,22));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=30;cam.rotation_euler=(Vector((0,0,5))-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam
scene.render.image_settings.color_mode='RGBA';scene.render.filepath=str((ROOT/'preview.png').resolve());bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str((ROOT/'city-apartments.blend').resolve()),compress=True)
print(json.dumps(report))
