"""Prepare the approved Meshy jail kit locally; no generation or paid reruns.
Original meshes/textures are retained as skins; gameplay openings and open chain link are repaired.
"""
import bpy,bmesh,json,math,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path('art/building-kits/jail-meshy');OUT=Path('apps/client/src/fps/models/jail-kit');OUT.mkdir(parents=True,exist_ok=True)
PLAN=json.loads((ROOT/'integration-layout.json').read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
report={'source':'Meshy meshy-t2 / meshy-n1','sources':{},'exports':{}}
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
 for v in o.data.vertices:
  v.co=Vector(((v.co.x-(lo.x+hi.x)/2)*w/(hi.x-lo.x),(v.co.y-(lo.y+hi.y)/2)*d/(hi.y-lo.y),(v.co.z-lo.z)*h/(hi.z-lo.z)))
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

# Keep the verified hollow interior, walls, furniture and animated entrance leaf.
bpy.ops.import_scene.gltf(filepath=str(ROOT/'base-playable-jail.glb'))
base=list(bpy.context.scene.objects)
# Remove old ornamental exterior only; preserve the canonical collision shell and door.
for o in base:
 if o.type=='MESH' and o.get('part')=='shell':
  for m in o.data.materials:
   if m and m.use_nodes:
    p=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
    if p and m.name.startswith('concrete'):p.inputs['Base Color'].default_value=(.45,.49,.55,1)
# Meshy source geometry is hollowed to the exact existing 16x14m collision envelope.
o=import_raw('cellblock',16.12,14.12,5.5)
cut(o,(-7.83,-6.83,-.01),(7.83,6.83,5.35))
cut(o,(-.96,-8,-.1),(.96,-5.8,2.92))
# Thin entrance skin and corner-wing skins reinforce the approved modular facade.
for name,x,w in [('entrance',0,4),('corner-wing',-5.7,3.7),('corner-wing',5.7,3.7)]:
 q=import_raw(name,w,.25,5.5);q.location=(x,-7.12,0)
 if name=='entrance':cut(q,(-.96,-1,-.1),(.96,1,2.92))
# Add a consistent yellow base band without crossing the opening.
for x in [-4.45,4.45]:box('yellow facade stripe',x,.7,7.17,7.1,.16,.04,'yellow')
# Finish the unseen AI sides with matching barred windows instead of blank concrete.
for side in [-1,1]:
 for z in [-4,0,4]:
  for y in [1.65,3.85]:
   box('side window frame',side*8.18,y,z,.1,1.25,1.4,'navy')
   for dz in [-.45,-.15,.15,.45]:box('side security bar',side*8.25,y,z+dz,.04,1.25,.045,'white')
 box('side safety stripe',side*8.18,.7,0,.04,.16,14,'yellow')
for x in [-5.5,-2,2,5.5]:
 for y in [1.65,3.85]:
  box('rear window frame',x,y,-7.18,1.4,1.25,.1,'navy')
  for dx in [-.45,-.15,.15,.45]:box('rear security bar',x+dx,y,-7.25,.045,1.25,.04,'white')
export(Path('apps/client/src/fps/models/buildings/jail.glb'),list(bpy.context.scene.objects))
reset_scene()
# Independent normalized kit pieces for the map editor.
sizes={'cellblock':(12,8,8),'entrance':(8,8,8),'corner-wing':(8,8,8),'guard-tower':(3.5,3.5,6.2),'gatehouse':(3,3,2.8),'bridge':(8,32,1.3),'fence-straight':(4,.18,3.2),'fence-corner':(4,4,3.2),'vehicle-gate':(4,.18,3),'pedestrian-gate':(2,.18,3),'barrier-arm':(4,.3,1),'floodlight':(.8,.35,3.8),'basketball-hoop':(1.7,.7,3.3),'bench':(2,.65,.9),'picnic-table':(2,2,.9),'pullup-bars':(2,2,2.6),'weight-bench':(2,1.5,1.2),'trash-bin':(.65,.65,1)}
for name,(w,d,h) in sizes.items():
 o=import_raw(name,w,d,h)
 if name=='fence-straight':
  for low,high in [(.18,1.4),(1.65,2.84)]:cut(o,(-w/2+.16,-1,low),(w/2-.16,1,high))
  for sign in [-1,1]:
   for j in range(-14,15):
    start=j*.3;lo=max(.15,(-w/2+.16-start)/sign) if sign>0 else max(.15,start-w/2+.16);hi=min(2.85,w/2-.16-start) if sign>0 else min(2.85,start+w/2-.16)
    if hi>lo:rod('open chain link',(start+sign*lo,lo,0),(start+sign*hi,hi,0),.007)
 if name=='fence-corner':
  # AI made opaque corner infill: keep its signature posts/wire and replace panels with open rods.
  cut(o,(-1.75,-1.75,.16),(1.75,1.75,2.85))
 if name=='bridge':
  # Roadway must stay open; keep Meshy edge masonry and rail silhouettes.
  cut(o,(-3.65,-17,.12),(3.65,17,2))
  box('level bridge deck',0,-.025,0,8,.05,32,'court')
  for x in [-4.1,4.1]:box('bridge safety rail',x,.8,0,.12,.15,32,'white')
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
 if name=='gatehouse':
  cut(o,(-1.33,-1.33,-.1),(1.33,1.33,2.62));cut(o,(-.75,-2,-.1),(.75,-1,2.3))
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
 length=math.hypot(bx-ax,bz-az);count=math.ceil(length/4);span=length/count
 for i in range(count):
  root=place('fence-straight',ax+(bx-ax)*(i+.5)/count,az+(bz-az)*(i+.5)/count,yaw=math.atan2(bz-az,bx-ax));root.scale.x=span/4
for a,b in [((-17,-17),(17,-17)),((-17,-17),(-17,17)),((17,-17),(17,17)),((-17,17),(-2,17)),((2,17),(6,17)),((8,17),(17,17))]:fence(*a,*b)
# Corner modules retained as small wire/post accents, clear of traversal.
for x in [-17,17]:
 for z in [-17,17]:
  r=place('fence-corner',x,z);r.scale=(.1,.1,1)
for g in PLAN['gates']:
 # Meshy gate leaf follows one real hinge, while posts stay stationary.
 root=place(g['id']+'-gate',g['x'],17)
 bpy.context.view_layer.update()
 # Bake static source object transforms before splitting off the post zones.
 for o in list(root.children_recursive):
  if o.type!='MESH':continue
  world=o.matrix_world.copy();o.parent=None;o.matrix_world=world;bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
  cut(o,(-40,-19,-1),(g['x']-g['width']/2+.12,-15,4));cut(o,(g['x']+g['width']/2-.12,-19,-1),(40,-15,4))
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
place('bridge',0,36)
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
