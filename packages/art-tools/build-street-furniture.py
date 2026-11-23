"""Original glossy roadside bins and prison grounds; dimensions shared with gameplay."""
import bpy,json,math
from pathlib import Path
D=json.loads(Path('art/buildings/blender/layout.json').read_text())
OUT=Path('apps/client/src/fps/models/street');OUT.mkdir(parents=True,exist_ok=True)
def reset():
 bpy.ops.wm.read_factory_settings(use_empty=True)
 global mats
 mats={}
 for key,col in {'steel':(.24,.32,.36,1),'green':(.12,.35,.23,1),'blue':(.16,.35,.49,1),'dark':(.06,.09,.1,1),'wood':(.42,.27,.12,1),'court':(.3,.38,.36,1),'white':(.83,.83,.66,1),'orange':(.84,.3,.08,1)}.items():
  m=bpy.data.materials.new(key);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=col;p.inputs['Roughness'].default_value=.33;p.inputs['Coat Weight'].default_value=.25;mats[key]=m
 def noop():pass
def box(name,x,y,z,w,h,d,mat='steel'):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.name=name;o.dimensions=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mats[mat]);return o
def rod(name,a,b,r=.018,mat='steel'):
 from mathutils import Vector
 a=Vector((a[0],-a[2],a[1]));b=Vector((b[0],-b[2],b[1]));v=b-a
 bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=r,depth=v.length,location=(a+b)/2);o=bpy.context.object;o.name=name;o.rotation_euler=v.to_track_quat('Z','Y').to_euler();o.data.materials.append(mats[mat]);return o
def save(name):
 # Merge by material so repeated detail costs only a handful of draws.
 for m in mats.values():
  group=[o for o in list(bpy.context.scene.objects) if o.type=='MESH' and o.data.materials[0]==m]
  if not group:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in group:o.select_set(True)
  bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join()
 bpy.ops.object.select_all(action='SELECT');bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB')
for kind,w,d,h in [('metal',.6,.6,.95),('wheelie',.65,.7,1.1),('litter',.65,.65,1)]:
 reset();mat={'metal':'steel','wheelie':'green','litter':'blue'}[kind]
 if kind=='metal':
  rod('ribbed can',(0,.04,0),(0,h-.07,0),.27)
  for i in range(16):
   a=i*math.tau/16;rod('rolled ribs',(.27*math.cos(a),.1,.27*math.sin(a)),(.27*math.cos(a),h-.14,.27*math.sin(a)),.012)
  rod('lid',(0,h-.08,0),(0,h-.035,0),.3);box('lid handle',0,h-.01,0,.15,.02,.05,'dark')
 else:
  box('bin body',0,h*.44,0,w*.9,h*.83,d*.9,mat);box('lid',0,h-.055,0,w,.11,d,'dark')
  if kind=='wheelie':
   for x in [-w*.37,w*.37]:
    o=rod('wheel',(x-.035,.1,-d*.3),(x+.035,.1,-d*.3),.1,'dark')
   box('handle',0,h-.12,-d*.46,w*.6,.06,.07,'steel')
  else:box('opening',0,h*.77,d*.455,w*.58,.17,.025,'dark')
  box('recycling badge',0,h*.5,d*.46,.19,.2,.025,'white')
 save('bin-'+kind)
reset()
for b in D['jail']['boxes']:
 x=b['x'];z=b['z'];y=b['y'];w=b['width'];d=b['depth'];h=b['height'];role=b['role']
 if role!='fence':box(role,x,y+h/2,z,w,h,d,'wood' if role=='bench' else 'steel');continue
 horizontal=w>d;length=max(w,d)
 def pos(t,height):return (x+(t if horizontal else 0),height,z+(0 if horizontal else t))
 for k in range(math.ceil(length/2)+1):
  t=-length/2+k*length/math.ceil(length/2);rod('fence post',pos(t,0),pos(t,3.15),.045)
 for height in [.12,2.95]:rod('fence rail',pos(-length/2,height),pos(length/2,height),.03)
 # Open diamond mesh without an opaque collision box on screen.
 for sign in [-1,1]:
  for j in range(math.ceil((length+3)/.4)):
   start=-length/2-3+j*.4;lo=max(0,(-length/2-start)/sign) if sign>0 else max(0,(start-length/2));hi=min(3,(length/2-start)) if sign>0 else min(3,start+length/2)
   if hi>lo:rod('chain link',pos(start+sign*lo,lo),pos(start+sign*hi,hi),.006)
for t in D['jail']['towers']:
 x=t['x'];z=t['z'];box('tower platform',x,3.11,z,3,.18,3,'wood');box('tower canopy',x,6.12,z,3.5,.14,3.5,'blue')
for s in D['jail']['stairs']:
 for i in range(20):
  progress=(i+.5)/20;z=s['startZ']+s['direction']*s['run']*progress;y=(i+1)/20*s['rise'];box('tower stair',s['x'],y-.1,z,s['width'],.2,s['run']/20,'wood')
 for side in [-1,1]:
  x=s['x']+side*(s['width']/2+.08);rod('stair rail',(x,.9,s['startZ']),(x,4.1,s['startZ']+s['direction']*s['run']),.025)
box('courtyard surface',0,.015,9.5,15,.03,4,'court')
for x in [-7,7]:box('court sideline',x,.04,9.5,.05,.015,3,'white')
for z in [8,11]:box('court baseline',0,.04,z,14,.015,.05,'white')
box('backboard',5.5,2.8,10.5,1.5,.9,.1,'white')
# Hoop faces the yard, no ground decal baked into a prop.
for i in range(16):
 a=i*math.tau/16;b=(i+1)*math.tau/16;rod('basketball rim',(5.5+.3*math.cos(a),2.5,10.1+.3*math.sin(a)),(5.5+.3*math.cos(b),2.5,10.1+.3*math.sin(b)),.022,'orange')
save('jail-grounds')
