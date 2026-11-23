"""Original glossy harbor environment, authored against the shared collision/deck layout."""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
ROOT=Path('art/models/harbor');OUT=Path('apps/client/static/assets/harbor');OUT.mkdir(parents=True,exist_ok=True)
D=json.loads((ROOT/'layout.json').read_text());bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0;parts=[];mats={}
colors={'concrete':(.62,.65,.60),'wood':(.50,.32,.16),'steel':(.24,.31,.35),'white':(.84,.87,.81),'yellow':(.96,.64,.12),'blue':(.17,.43,.58),'red':(.68,.23,.16),'green':(.25,.46,.37),'orange':(.85,.40,.15),'glass':(.25,.62,.69),'rubber':(.10,.13,.15)}
for name,color in colors.items():
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*(c**2.2 for c in color),1);n.inputs['Roughness'].default_value=.38;n.inputs['Coat Weight'].default_value=.2;n.inputs['Metallic'].default_value=.2 if name=='steel' else 0;mats[name]=m
# Author in the game's X/elevation/Z axes; Blender exports Y-up GLB.
def finish(o,name,mat):o.name=name;o.data.materials.append(mats[mat]);parts.append(o);return o
def box(name,x,y,z,w,h,d,mat='steel',bevel=0):
 vs=[(x+dx*w/2,y+dy*h/2,z+dz*d/2) for dx,dy,dz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 o=mesh(name,vs,[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat)
 if bevel:
  bpy.context.view_layer.objects.active=o;o.select_set(True);m=o.modifiers.new('rounded glossy edges','BEVEL');m.width=min(bevel,w*.2,h*.2,d*.2);m.segments=2;bpy.ops.object.modifier_apply(modifier=m.name);o.select_set(False)
 return o

def rod(name,a,b,r,mat='steel',sides=8):
 a=Vector((a[0],-a[2],a[1]));b=Vector((b[0],-b[2],b[1]));bpy.ops.mesh.primitive_cylinder_add(vertices=sides,radius=r,depth=(b-a).length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return finish(o,name,mat)
def mesh(name,vs,fs,mat):
 d=bpy.data.meshes.new(name);d.from_pydata([(x,-z,y) for x,y,z in vs],[],fs);d.update();o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);return finish(o,name,mat)
box('cargo apron',-59,-.05,214.5,122,.08,39,'concrete')
# Tire lanes, expansion joints, loading bay markings and quay hazard stripes.
for x in [-74,-47]:box('service lane',x,.004,215,.14,.008,29,'white')
for z in [202,211,224]:box('apron joint',-59,.003,z,121,.005,.045,'steel')
for x in range(-117,-2,4):box('quay hazard stripe',x,.02,229,1.4,.025,.4,'yellow')
for deck in D['decks']:
 x,z,w,d=[deck[k] for k in ['x','z','width','depth']]
 box('dock structural deck',x,-.04,z,w,.36,d,'wood')
 for k in range(math.ceil(d/.42)):
  zz=z-d/2+(k+.5)*d/math.ceil(d/.42);box('separate dock plank',x,.155,zz,w-.06,.05,d/math.ceil(d/.42)-.018,'wood')
 for side in [-1,1]:
  for zz in [z-d/2+.5,z+d/2-.5]:
   rod('timber piling',(x+side*(w/2-.3),-2.5,zz),(x+side*(w/2-.3),.3,zz),.17,'wood')
for c in D['containers']:
 x,z,y,w,d,h=[c[k] for k in ['x','z','y','width','depth','height']];color=['blue','red','green','orange'][c['color']]
 box('shipping container',x,y+h/2,z,w,h,d,color,.05)
 for side in [-1,1]:
  for k in range(round(w/.32)):
   xx=x-w/2+(k+.5)*w/round(w/.32);box('corrugated steel side',xx,y+h/2,z+side*(d/2+.02),.075,h-.20,.06,color)
  for xx in [x-w/2,x+w/2]:box('container corner post',xx,y+h/2,z+side*d/2,.12,h,.12,'steel')
  for yy in [y+.07,y+h-.07]:box('container edge frame',x,yy,z+side*d/2,w,.12,.12,'steel')
 # Double end doors, inset panels and locking rods on the east end.
 for zz in [z-d/4,z+d/4]:
  box('double cargo door',x+w/2+.035,y+h/2,zz,.07,h-.20,d/2-.10,color)
  rod('door lock rod',(x+w/2+.09,y+.2,zz),(x+w/2+.09,y+h-.2,zz),.028,'white')
  box('door latch',x+w/2+.12,y+.95,zz,.08,.08,.32,'yellow')
 box('container identity plate',x,y+1.85,z-d/2-.065,1.2,.35,.018,'white')
for b in D['boxes']:
 role=b['role'];x,z,y,w,d,h=[b[k] for k in ['x','z','y','width','depth','height']]
 if role=='container':continue
 if role=='dock rail':
  horizontal=w>d;length=max(w,d)
  for yy in [.55,1.05]:box('dock rail',x,y+yy,z,w if horizontal else .08,.08,.08 if horizontal else d,'white')
  for k in range(math.ceil(length/2.5)+1):
   t=(k/math.ceil(length/2.5)-.5)*length;box('rail upright',x+(t if horizontal else 0),y+.53,z+(0 if horizontal else t),.09,1.06,.09,'steel')
 elif role=='barrel':
  rod('sealed dock barrel',(x,.04,z),(x,.94,z),.30,'blue',12)
  for yy in [.12,.78]:rod('barrel steel band',(x,yy,z),(x,yy+.07,z),.315,'steel',12)
 elif role=='bollard':
  box('mooring bollard base',x,.25,z,.65,.14,.65,'steel');rod('mooring post',(x,.25,z),(x,.78,z),.17,'yellow');rod('bollard crossbar',(x-.3,.65,z),(x+.3,.65,z),.1,'yellow')
 elif role=='pallet cargo':
  for k in range(5):box('pallet boards',x-w/2+(k+.5)*w/5,.15,z,w/5-.025,.12,d,'wood')
  box('strapped cargo crate',x,.85,z,w*.85,1.25,d*.85,'wood',.035)
  for dx in [-.4,.4]:box('cargo band',x+dx,.87,z,.06,1.28,d*.86,'steel')
 elif role=='forklift':
  box('forklift chassis',x,.65,z,1.5,1,2.4,'yellow',.1);box('forklift cab',x,1.65,z-.25,1.3,1.1,1.4,'glass',.04)
  for dx in [-.72,.72]:
   for dz in [-.8,.8]:rod('forklift wheel',(x+dx-.13,.4,z+dz),(x+dx+.13,.4,z+dz),.36,'rubber',12)
  for dx in [-.45,.45]:box('lifting mast',x+dx,1.5,z+1.2,.12,2.8,.18,'steel');box('fork tine',x+dx,.2,z+1.9,.13,.1,1.3,'steel')
 elif role=='office desk' or role=='workbench':
  box('worktop',x,y+h-.08,z,w,.16,d,'wood');
  for dx in [-w*.4,w*.4]:box('desk legs',x+dx,y+h/2,z,.12,h,.5,'steel')
 else:
  box(role,x,y+h/2,z,w,h,d,'yellow' if role=='crane support' else 'blue' if role=='office roof' else 'white',.025)
# Port office windows, notice panel, chair and desk radio.
for x in [-114,-108]:box('office front window',x,1.8,201.12,1.7,.9,.04,'glass');box('window sill',x,1.28,201.2,1.95,.12,.16,'steel')
box('port office sign board',-111,2.9,201.15,3.6,.55,.06,'blue');box('radio',-113,1.1,197,.4,.35,.3,'steel',.02)
# Traveling dock crane, open lattice boom and suspended hook.
box('crane upper bridge',-92,12.2,230,7.4,.7,1.3,'yellow');box('crane operator cab',-94,11.4,230,2,1.4,1.6,'glass')
for xx in [-95,-89]:
 for yy in range(1,12,2):rod('crane tower cross brace',(xx-.3,yy,229.7),(xx+.3,yy+2,230.3),.055,'steel')
for yy in [12.3,13.7]:rod('crane boom chord',(-92,yy,227),(-92,yy,253),.12,'yellow')
for zz in range(227,253,2):rod('crane boom lattice',(-92,12.3,zz),(-92,13.7,zz+2),.055,'yellow')
rod('crane hoist cable',(-92,13.6,249),(-92,3.5,249),.028,'steel');rod('crane hook',(-92,3.5,249),(-92,2.9,249),.13,'steel')
# Two moored workboats. Decorative: no vehicle controls or walkable water.
for x,z,l,w in [(-66,254,12,4),(-29,255,17,5.5)]:
 vs=[(x-w/2,0,z-l/2),(x+w/2,0,z-l/2),(x+w/2,0,z+l*.3),(x,0,z+l/2),(x-w/2,0,z+l*.3),(x-w*.38,-1.4,z-l*.4),(x+w*.38,-1.4,z-l*.4),(x+w*.34,-1.4,z+l*.25),(x,-1.4,z+l*.4),(x-w*.34,-1.4,z+l*.25)]
 mesh('workboat hull',vs,[(0,1,2,3,4),(5,9,8,7,6)]+[(i,(i+1)%5,(i+1)%5+5,i+5) for i in range(5)],'blue')
 box('raised boat gunwale',x,.35,z,w,.7,l*.76,'red',.15);box('boat deck',x,.74,z,w*.88,.12,l*.68,'wood');box('wheelhouse',x,2,z-l*.18,w*.62,2.4,3,'white',.08);box('wheelhouse windscreen',x,2.3,z-l*.18+1.53,w*.51,.7,.04,'glass')
 rod('boat exhaust',(x+.6,2.7,z-2),(x+.6,4,z-2),.14,'steel');rod('boat aerial',(x,3.2,z-2),(x,5,z-2),.025,'steel')
 for side in [-1,1]:
  for zz in [z-3,z+1,z+4]:rod('rubber fender',(x+side*w*.5,-.05,zz),(x+side*w*.5,.6,zz),.24,'rubber')
 # Taut mooring lines lead toward the nearest finger pier.
 pier=min(D['piers'],key=lambda p:abs(p['x']-x))
 rod('mooring rope',(x,.9,z+3),(pier['x'],.4,z+4),.035,'wood')
# Merge per material; one environmental asset, modest fixed draw count.
root=bpy.data.objects.new('south-harbor',None);bpy.context.collection.objects.link(root);root['source']='shared harbor-layout.ts';merged=[]
groups={material.name:[o for o in parts if o.data.materials[0]==material] for material in mats.values()}
for material in mats.values():
 group=groups[material.name]
 if not group:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in group:o.select_set(True)
 bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();o=bpy.context.object;o.name='harbor-'+material.name;o.parent=root;merged.append(o)
bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
for o in merged:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'south-harbor.glb'),export_format='GLB',use_selection=True,export_extras=True)
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in merged);(OUT/'manifest.json').write_text(json.dumps({'triangles':triangles,'materialMeshes':len(merged),'containers':len(D['containers']),'piers':len(D['piers']),'bytes':(OUT/'south-harbor.glb').stat().st_size},indent=2)+'\n')
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=False;scene.render.resolution_x=1000;scene.render.resolution_y=700;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.view_settings.view_transform='AgX';scene.world=bpy.data.worlds.new('studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
bpy.ops.object.camera_add(location=(50,-335,100));camera=bpy.context.object;target=Vector((-60,-233,2));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=160;scene.camera=camera
for position,power,size in [((-50,-210,100),130000,80),((-130,-250,80),90000,60)]:
 bpy.ops.object.light_add(type='AREA',location=position);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(ROOT/'preview.png');bpy.ops.render.render(write_still=True);bpy.ops.wm.save_as_mainfile(filepath=str((ROOT/'south-harbor.blend').resolve()),compress=True)
print('Harbor triangles',triangles)
