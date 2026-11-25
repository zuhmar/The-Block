"""Prepare the approved Meshy jail kit locally; no generation or paid reruns.
Source props retain their proportions. Exact architecture is rebuilt from the shared plan.
"""
import bpy,bmesh,json,math,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path('art/building-kits/jail-meshy');OUT=Path('apps/client/src/fps/models/jail-kit');OUT.mkdir(parents=True,exist_ok=True)
PLAN=json.loads((ROOT/'integration-layout.json').read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
report={'source':'Meshy meshy-t2 / meshy-n1 source props with Blender-authored architectural corrections','sources':{},'exports':{}}
materials={}
for key,c in {'concrete':(.48,.51,.56,1),'navy':(.08,.12,.2,1),'yellow':(.95,.62,.035,1),'steel':(.11,.14,.18,1),'court':(.39,.43,.43,1),'white':(.85,.87,.85,1)}.items():
 m=bpy.data.materials.new(key);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=c;p.inputs['Roughness'].default_value=.4;p.inputs['Coat Weight'].default_value=.18;materials[key]=m

def box(name,x,y,z,w,h,d,mat='concrete',parent=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.name=name;o.dimensions=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(materials[mat]);o.parent=parent;return o

def rod(name,a,b,r=.015,mat='steel'):
 a=Vector((a[0],-a[2],a[1]));b=Vector((b[0],-b[2],b[1]));v=b-a
 bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=r,depth=v.length,location=(a+b)/2);o=bpy.context.object;o.name=name;o.rotation_euler=v.to_track_quat('Z','Y').to_euler();o.data.materials.append(materials[mat]);return o

def cut(o,lo,hi):
 # Split triangles at all six exact planes before deleting interior faces. Keeps UVs.
 bm=bmesh.new();bm.from_mesh(o.data)
 for axis in range(3):
  for value in [lo[axis],hi[axis]]:
   co=[0,0,0];no=[0,0,0];co[axis]=value;no[axis]=1
   bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=co,plane_no=no)
 faces=[f for f in bm.faces if all(lo[k]-.00001<=f.calc_center_median()[k]<=hi[k]+.00001 for k in range(3))]
 bmesh.ops.delete(bm,geom=faces,context='FACES');bm.to_mesh(o.data);bm.free();o.data.update()

def import_raw(name,w,d,h):
 old=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'raw'/f'{name}.glb'))
 objs=[o for o in bpy.context.scene.objects if o not in old and o.type=='MESH']
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();o=bpy.context.object
 matrix=o.matrix_world.copy();o.parent=None;o.matrix_world=matrix
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 pts=[v.co for v in o.data.vertices];lo=Vector(tuple(min(v[k] for v in pts) for k in range(3)));hi=Vector(tuple(max(v[k] for v in pts) for k in range(3)))
 scale=min(w/(hi.x-lo.x),h/(hi.z-lo.z))
 for v in o.data.vertices:
  v.co=Vector((v.co.x-(lo.x+hi.x)/2,v.co.y-(lo.y+hi.y)/2,v.co.z-lo.z))*scale
 o['uniformScale']=scale
 o.name='meshy-'+name;o['meshySource']=name;o['sourceSha256']=hashlib.sha256((ROOT/'raw'/f'{name}.glb').read_bytes()).hexdigest();o['part']='shell'
 for m in o.data.materials:
  if not m or not m.use_nodes:continue
  p=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
  if p:p.inputs['Roughness'].default_value=.42;p.inputs['Metallic'].default_value=.08
  for node in m.node_tree.nodes:
   if node.type=='TEX_IMAGE' and node.image and node.image.size[0]>512:node.image.scale(512,512);node.image.pack()
 report['sources'][name]=o['sourceSha256'];return o

def export(path,objs):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0]
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_image_format='WEBP')
 report['exports'][str(path)]={'bytes':path.stat().st_size,'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objs if o.type=='MESH')}

def reset_scene():
 for o in list(bpy.context.scene.objects):bpy.data.objects.remove(o,do_unlink=True)

# Rebuild the shell to the U plan; retain the verified entrance hinge and door leaf.
bpy.ops.import_scene.gltf(filepath=str(ROOT/'base-playable-jail.glb'))
for o in list(bpy.context.scene.objects):
 if o.type=='MESH' and o.get('part')!='door':bpy.data.objects.remove(o,do_unlink=True)
hinge=bpy.data.objects.get('jail-door-hinge');hinge.location.y=1
for w in PLAN['jail']['walls']:
 o=box('U shell wall',w['x'],w['y']+w['height']/2,w['z'],w['width'],w['height'],w['depth']);o['part']='shell'
for slab in PLAN['jail']['slabs']:
 o=box('U shaped roof',slab['x'],5.57,slab['z'],slab['width']+.12,.18,slab['depth']+.12,'navy');o['part']='roof'
 o=box('room floor',slab['x'],.007,slab['z'],slab['width'],.025,slab['depth'],'court');o['part']='interior'
for f in PLAN['jail']['partitions']:
 if f['depth']>1:
  o=box('cell divider',f['x'],f['height']/2,f['z'],f['width'],f['height'],f['depth']);o['part']='interior'
 else:
  for i in range(int(f['width']/.22)+1):
   o=box('cell bars',f['x']-f['width']/2+i*.22,f['height']/2,f['z'],.04,f['height'],.06,'steel');o['part']='interior'
for f in PLAN['jail']['fixtures']:
 x,z,w,d=[f[k] for k in ['x','z','width','depth']]
 if f['kind']=='bed':
  o=box('bed frame',x,.3,z,w,.16,d,'steel');o['part']='interior'
  o=box('mattress',x,.5,z,w*.94,.22,d*.94,'white');o['part']='interior'
 else:
  height=.65 if f['kind']=='bench' else 1.1 if f['kind']=='counter' else 1.9
  o=box(f['kind'],x,height/2,z,w,height,d,'navy');o['part']='interior'
# Window sizes repeat without stretching a facade mesh over the building.
def window(x,z,side=False):
 for y in [1.65,3.85]:
  box('barred window recess',x,y,z,.1 if side else 1.3,1.15,1.3 if side else .1,'navy')
  for delta in [-.42,-.14,.14,.42]:box('window bar',x if side else x+delta,y,z+delta if side else z,.055,1.15,.055,'white')
for x in [-6,-2,2,6]:window(x,-7.15)
for x in [-6,-2.5,2.5,6]:window(x,-.85)
for x in [-8.15,8.15]:
 for z in [-4,0,4]:window(x,z,True)
for x in [-3.85,3.85]:
 for z in [1,5]:window(x,z,True)
for side in [-1,1]:
 box('safety band outer',side*8.15,.7,0,.05,.16,14,'yellow')
 box('safety band courtyard',side*3.85,.7,3,.05,.16,8,'yellow')
 for x in [side*6-1.45,side*6+1.45]:box('wing entry safety stripe',x,.7,7.15,1.1,.16,.04,'yellow')
for x in [-2.45,2.45]:box('main entry safety stripe',x,.7,-.85,3.1,.16,.04,'yellow')
export(Path('apps/client/src/fps/models/buildings/jail.glb'),list(bpy.context.scene.objects))
reset_scene()
# Independent normalized kit pieces for the map editor.
sizes={'cellblock':(12,8,8),'entrance':(8,8,8),'corner-wing':(8,8,8),'guard-tower':(3.5,3.5,6.2),'gatehouse':(3,3,2.8),'bridge':(8,8,1.3),'fence-straight':(4,.18,3.2),'fence-corner':(4,4,3.2),'vehicle-gate':(4,.18,3),'pedestrian-gate':(2,.18,3),'barrier-arm':(4,.3,1),'floodlight':(.8,.35,3.8),'basketball-hoop':(1.7,.7,3.3),'bench':(2,.65,.9),'picnic-table':(2,2,.9),'pullup-bars':(2,2,2.6),'weight-bench':(2,1.5,1.2),'trash-bin':(.65,.65,1)}
for name,(w,d,h) in sizes.items():
 o=import_raw(name,w,d,h)
 if name in ['bridge','fence-straight','fence-corner','vehicle-gate','pedestrian-gate','gatehouse']:
  # Re-author precise modular envelopes rather than distorting the Meshy source geometry.
  bpy.data.objects.remove(o,do_unlink=True)
  if name=='bridge':
   box('bridge deck',0,-.025,0,8,.05,8,'court')
   for x in [-4,4]:
    for z in [-4,4]:box('stone bridge pier',x,.65,z,.32,1.3,.32)
    for y in [.35,.95]:box('bridge rail',x,y,0,.12,.12,8,'navy' if y>.5 else 'yellow')
  elif name.startswith('fence-'):
   def panel(ax,az,bx,bz):
    for x,z in [(ax,az),(bx,bz)]:rod('fence post',(x,0,z),(x,3.2,z),.06)
    for y in [.12,1.5,2.95]:rod('fence rail',(ax,y,az),(bx,y,bz),.035)
    for sign in [-1,1]:
     for j in range(-10,15):
      start=j*.3;lo=max(.15,-start) if sign>0 else max(.15,start-4);hi=min(2.85,4-start) if sign>0 else min(2.85,start)
      if hi>lo:
       t1=start+sign*lo;t2=start+sign*hi
       rod('chain link',(ax+(bx-ax)*t1/4,lo,az+(bz-az)*t1/4),(ax+(bx-ax)*t2/4,hi,az+(bz-az)*t2/4),.007)
   if name=='fence-straight':panel(-2,0,2,0)
   else:panel(0,0,4,0);panel(0,0,0,4)
  elif name in ['vehicle-gate','pedestrian-gate']:
   for y in [.15,1.5,2.9]:box('gate frame',0,y,0,w,.12,.14,'navy')
   for i in range(round(w/.25)+1):box('gate bars',-w/2+i*w/round(w/.25),1.5,0,.055,2.85,.09,'steel')
  else:
   for x in [-1.5,1.5]:box('gatehouse side',x,1.4,0,.16,2.8,3)
   box('gatehouse back',0,1.4,-1.5,3,2.8,.16)
   for x in [-1.125,1.125]:box('gatehouse front',x,1.4,1.5,.75,2.8,.16)
   box('gatehouse lintel',0,2.55,1.5,1.5,.5,.16)
   box('gatehouse roof',0,2.85,0,3.15,.16,3.15,'navy')
 if name=='barrier-arm':
  # Keep the pedestal on the ground; only the striped arm rotates.
  low=[v.co.x for v in o.data.vertices if v.co.z < .3]
  pivot=(min(low)+max(low))/2
  arm=o.copy();arm.data=o.data.copy();bpy.context.collection.objects.link(arm);arm.name='striped barrier arm'
  cut(arm,(pivot-.4,-2,-1),(pivot+.4,2,2));cut(arm,(-5,-2,-1),(5,2,.6))
  cut(o,(-5,-2,-1),(pivot-.4,2,2));cut(o,(pivot+.4,-2,-1),(5,2,2))
  hinge=bpy.data.objects.new('jail-barrier-hinge',None);bpy.context.collection.objects.link(hinge);hinge.location=(pivot,0,.8);hinge['raiseDirection']=1 if pivot<0 else -1
  for v in arm.data.vertices:v.co-=Vector((pivot,0,.8))
  arm.parent=hinge
 if name=='guard-tower':
  cut(o,(-4,-4,-.1),(4,4,3.2));cut(o,(-.75,-4,3.15),(.75,-1,5.3))
 export(OUT/(name+'.glb'),list(bpy.context.scene.objects));reset_scene()
# Place the prepared meshes from shared physics layout into one assembly.
def place(name,x,z,y=0,yaw=0):
 old=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(OUT/(name+'.glb')))
 objs=[o for o in bpy.context.scene.objects if o not in old]
 root=bpy.data.objects.new(name+'-instance',None);bpy.context.collection.objects.link(root)
 for o in objs:
  if o.parent is None:o.parent=root
 root.location=(x,-z,y);root.rotation_euler.z=-yaw
 return root
for t in PLAN['towers']:
 place('guard-tower',t['x'],t['z'],yaw=math.pi if t['front']==1 else 0)
 box('tower shaft',t['x'],1.6,t['z'],1.6,3.2,1.6)
 box('tower platform',t['x'],3.11,t['z'],3,.18,3,'navy')
 # Rendered stair treads match the exact same 5.5m ramp in physics.
 for i in range(20):box('tower access stair',t['x'],(i+1)/20*3.2-.1,t['front']*(7+(i+.5)/20*5.5),1.4,.2,5.5/20,'concrete')
 for side in [-1,1]:rod('tower stair handrail',(t['x']+side*.78,.9,t['front']*7),(t['x']+side*.78,4.1,t['front']*12.5),.025,'yellow')
for p in PLAN['props']:place(p['kind'],p['x'],p['z'])
place('gatehouse',-7,15,yaw=math.pi)
box('gatehouse roof',-7,2.85,15,3.12,.15,3.12,'navy')
# Straight open-mesh panels are tiled at post-center spans; no giant opaque fence stretches.
def fence(ax,az,bx,bz):
 length=math.hypot(bx-ax,bz-az);count=math.ceil(length/4);ux=(bx-ax)/length;uz=(bz-az)/length
 for i in range(count):
  span=min(4,length-i*4);distance=i*4+span/2
  root=place('fence-straight',ax+ux*distance,az+uz*distance,yaw=math.atan2(bz-az,bx-ax))
  if span<3.999:
   bpy.context.view_layer.update()
   for o in list(root.children_recursive):
    if o.type=='MESH':
     transform=root.matrix_world.inverted()@o.matrix_world;o.data.transform(transform);o.parent=root;o.matrix_basis.identity()
     cut(o,(-10,-10,-1),(-span/2,10,5));cut(o,(span/2,-10,-1),(10,10,5))
   for t in [i*4,i*4+span]:rod('trimmed panel end post',(ax+ux*t,0,az+uz*t),(ax+ux*t,3.2,az+uz*t),.06)
for a,b in [((-13,-17),(13,-17)),((-17,-13),(-17,13)),((17,-13),(17,13)),((-13,17),(-2,17)),((2,17),(6,17)),((8,17),(13,17))]:fence(*a,*b)
for x,z,yaw in [(-17,-17,0),(17,-17,math.pi/2),(17,17,math.pi),(-17,17,math.pi*1.5)]:place('fence-corner',x,z,yaw=yaw)
for g in PLAN['gates']:
 # Meshy gate leaf follows one real hinge, while posts stay stationary.
 root=place(g['id']+'-gate',g['x'],17)
 bpy.context.view_layer.update()
 # Bake static source object transforms before splitting off the post zones.
 for o in list(root.children_recursive):
  if o.type!='MESH':continue
  world=o.matrix_world.copy();o.parent=None;o.matrix_world=world;bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
  # Prepared gate assets contain the leaf alone; their shape remains unchanged.
  hinge=bpy.data.objects.get('jail-'+g['id']+'-hinge')
  if not hinge:hinge=bpy.data.objects.new('jail-'+g['id']+'-hinge',None);bpy.context.collection.objects.link(hinge);hinge.location=(g['x']-g['width']/2,-17,0)
  world=o.matrix_world.copy();bpy.context.view_layer.update();o.parent=hinge;o.matrix_world=world
 for x in [g['x']-g['width']/2,g['x']+g['width']/2]:box('gate pillar',x,1.55,17,.28,3.1,.3)
# Barrier tilts above the approach together with the gate. Pivot placed at left pedestal.
r=place('barrier-arm',0,19);r.name='barrier-instance';r['decorative']=True
for x,z in [(-10,5),(10,5),(-11,-10),(11,-10)]:place('floodlight',x,z)
# Court surface and painted markings are separate from the prop sprites.
box('basketball court',-4,.012,12,6,.024,6,'court')
for x in [-7,-1]:box('court sideline',x,.03,12,.04,.015,6,'white')
for z in [9,15]:box('court baseline',-4,.03,z,6,.015,.04,'white')
for z in [24,32,40,48]:place('bridge',0,z)
report['bridgeModules']=[{'x':0,'z':z,'scale':[1,1,1]} for z in [24,32,40,48]]
# Bake the latest instance transforms before detaching imported children.
bpy.context.view_layer.update()
# Deduplicate repeated imports and batch static geometry by material. Dynamic gates stay separate.
images={};mat_keys={}
for o in list(bpy.context.scene.objects):
 if o.type!='MESH':continue
 for slot in o.material_slots:
  m=slot.material
  if not m or not m.use_nodes:continue
  keys=[]
  p=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
  for node in m.node_tree.nodes:
   if node.type=='TEX_IMAGE' and node.image:
    im=node.image
    key=hashlib.sha256(bytes(im.packed_file.data) if im.packed_file else bytes(str(list(im.size)),'utf8')).hexdigest()
    if key not in images:images[key]=im
    node.image=images[key];keys.append(key)
  if keys or p:
   key=tuple(keys) if keys else tuple(round(v,4) for v in p.inputs['Base Color'].default_value)
   if key in mat_keys:slot.material=mat_keys[key]
   else:mat_keys[key]=m
static=[]
for o in list(bpy.context.scene.objects):
 if o.type!='MESH':continue
 parent=o.parent;dynamic=False
 while parent:
  if parent.name.startswith('jail-') and ('hinge' in parent.name or parent.name=='jail-barrier'):dynamic=True
  parent=parent.parent
 if dynamic:continue
 world=o.matrix_world.copy();o.parent=None;o.matrix_world=world
 static.append(o)
# Adjacent bridge tiles share their junction posts; keep one copy at each joint.
seen_posts=set()
for o in list(static):
 if o.name.startswith('stone bridge pier'):
  key=tuple(round(v,4) for v in o.matrix_world.translation)
  if key in seen_posts:static.remove(o);bpy.data.objects.remove(o,do_unlink=True)
  else:seen_posts.add(key)
# Join all static meshes once; glTF will emit one primitive per shared material.
if static:
 bpy.ops.object.select_all(action='DESELECT')
 for o in static:o.select_set(True)
 bpy.context.view_layer.objects.active=static[0];bpy.ops.object.join();bpy.context.object.name='jail-static-meshy-assembly'
 o=bpy.context.object;mod=o.modifiers.new('Mobile static geometry budget','DECIMATE');mod.ratio=.55;bpy.ops.object.modifier_apply(modifier=mod.name)
export(Path('apps/client/src/fps/models/street/jail-meshy-grounds.glb'),list(bpy.context.scene.objects))
ROOT.joinpath('integration-report.json').write_text(json.dumps(report,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'jail-assembly.blend'),compress=True)
print(json.dumps(report['exports'],indent=2))
