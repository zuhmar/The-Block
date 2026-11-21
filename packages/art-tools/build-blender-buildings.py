"""Fresh reference-guided Blender buildings and 30 reusable props.
Inputs: existing layout dimensions/fixtures and the five saved reference PNGs.
No previous model geometry is imported. Coordinates are authored in game X/Y-up/Z.
"""
import bpy,math,json,os,hashlib,shutil
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
OUT='art/buildings/blender';CLIENT='apps/client/src/fps/models/buildings'
os.makedirs(OUT+'/props',exist_ok=True);os.makedirs(CLIENT,exist_ok=True)
D=json.load(open(OUT+'/layout.json'));WALL=D['wall'];REFS=['general-store','the-haven','workshop','old-residence','warehouse']
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=False;scene.render.resolution_x=1100;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Studio');scene.world.color=(.25,.25,.25);scene.view_settings.view_transform='AgX'
def xyz(p):return (p[0],-p[2],p[1])
def linear(h):
 a=[int(h[i:i+2],16)/255 for i in (0,2,4)];return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in a)
def palette(i):
 shell=['e5a74e','60b6ae','c96d43','a58caf','6e8da1'][i];trim=['204f3c','20543f','303640','563d59','344555'][i]
 colors={'wall':shell,'trim':trim,'floor':['c6baa5','cec9b4','ada89e','9d775a','929ca1'][i],'wood':'b77d3d','woodLight':'d19b55','metal':'59626c','dark':'242b32','ivory':'ede3ce','cloth':['405b4e','36978f','9d633d','855671','566f81'][i],'accent':['d89f3a','397b58','b94039','75455e','d8a333'][i],'red':'c05245','blue':'4f96bc'}
 mats={}
 for k,h in colors.items():
  m=bpy.data.materials.new(f'{i}_{k}');m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*linear(h),1);p.inputs['Roughness'].default_value=.36 if k!='cloth' else .48;p.inputs['Metallic'].default_value=.32 if k=='metal' else .05;p.inputs['Coat Weight'].default_value=.22 if k in ['trim','cloth','accent'] else .08;mats[k]=m
 m=bpy.data.materials.new(f'{i}_glass');m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.4,.65,.72,.18);p.inputs['Alpha'].default_value=.18;p.inputs['Roughness'].default_value=.15;m.surface_render_method='DITHERED';mats['glass']=m
 m=bpy.data.materials.new(f'{i}_light');m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(1,.9,.65,1);p.inputs['Emission Color'].default_value=(1,.85,.5,1);p.inputs['Emission Strength'].default_value=.25;mats['light']=m
 return mats
class Builder:
 def __init__(self,mats):self.mats=mats;self.parts=[];self.role='shell';self.fixture=-1
 def finish(self,o,n,mat):
  o.name=n;o.data.materials.append(self.mats[mat]);o['part']=self.role;o['fixture']=self.fixture;self.parts.append(o)
  for p in o.data.polygons:p.use_smooth=True
  return o
 def box(self,n,p,s,mat='wood',r=.035):
  bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(p));o=bpy.context.object;o.dimensions=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  if r:
   b=o.modifiers.new('Rounded edges','BEVEL');b.width=min(r,min(s)*.35);b.segments=3 if r>.025 else 2;bpy.ops.object.modifier_apply(modifier=b.name);w=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=w.name)
  return self.finish(o,n,mat)
 def ball(self,n,p,s,mat='cloth'):
  bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,location=xyz(p));o=bpy.context.object;o.scale=(s[0]/2,s[2]/2,s[1]/2);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return self.finish(o,n,mat)
 def cyl(self,n,p,r,h,mat='metal',axis='y',verts=12):
  rot=(0,0,0) if axis=='y' else (math.pi/2,0,0) if axis=='z' else (0,math.pi/2,0)
  bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=h,location=xyz(p),rotation=rot);o=bpy.context.object;return self.finish(o,n,mat)
 def rod(self,n,a,b,r,mat='metal'):
  a=Vector(xyz(a));b=Vector(xyz(b));bpy.ops.mesh.primitive_cylinder_add(vertices=10,radius=r,depth=(b-a).length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return self.finish(o,n,mat)
 def text(self,n,words,p,size,front=1):
  c=bpy.data.curves.new(n,'FONT');c.body=words;c.align_x='CENTER';c.align_y='CENTER';c.size=size;c.extrude=.008;c.bevel_depth=.002;c.bevel_resolution=1;o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);o.location=xyz(p);o.rotation_euler=(math.pi/2,0,0 if front>0 else math.pi);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.select_set(False);return self.finish(o,n,'ivory')
 def group(self,name):
  g=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(g);return g
 def join(self,root):
  result=[]
  # Keep the animated door, roof, glass and culled furniture separate.
  for role in ['shell','roof','glass','door','interior']:
   for material in self.mats.values():
    group=[o for o in self.parts if o['part']==role and o.data.materials[0]==material]
    if not group:continue
    self.parts=[o for o in self.parts if o not in group]
    bpy.ops.object.select_all(action='DESELECT')
    for o in group:o.select_set(True)
    bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();o=bpy.context.object;o.name=role+'_'+material.name;o['part']=role
    bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');o.parent=root;result.append(o)
  return result

def prop(b,kind,w,d,variant=0):
 box=b.box
 def legs(top=.82):
  for x in [-w*.42,w*.42]:
   for z in [-d*.37,d*.37]:box('leg',(x,top/2,z),(.075,top,.075),'metal',.012)
 def cabinet(h=1.85,mat='metal'):
  box('cabinet carcass',(0,h/2,0),(w,h,d),mat,.055)
  for s in [-1,1]:
   box('cabinet door',(s*w*.245,h/2,d/2+.007),(w*.47,h-.12,.035),mat,.022);b.rod('vertical handle',(s*w*.075,h*.43,d/2+.045),(s*w*.075,h*.58,d/2+.045),.015,'ivory')
 def carton(x,y,z,cw,ch,cd):
  box('sealed carton',(x,y,z),(cw,ch,cd),'woodLight',.025);box('packing tape',(x,y+ch/2+.004,z),(.045,.008,cd*.99),'ivory',0)
 if kind in ['shelf','rack']:
  h=2.5 if kind=='rack' else 1.9
  for x in [-w*.46,w*.46]:
   for z in [-d*.43,d*.43]:box('upright',(x,h/2,z),(.065,h,.065),'metal',.01)
  levels=[.15,.75,1.35,1.95] if kind=='rack' else [.15,.68,1.21,1.74]
  for y in levels:
   box('shelf',(0,y,0),(w,.065,d),'metal' if kind=='rack' else 'wood',.015)
   count=max(2,min(6,round(w/.65)))
   for j in range(count):
    x=-w*.38+j*w*.76/(count-1)
    if kind=='rack':carton(x,y+.24,0,w*.65/count,.4,d*.75)
    elif y<1.7:
     for z in [-d*.2,d*.2]:
      m=['red','blue','accent'][(j+int(y*10))%3];box('product package',(x,y+.18,z),(min(.3,w*.7/count),.28,d*.32),m,.018);box('product label',(x,y+.18,z+d*.165),(.12,.09,.009),'ivory',0)
  return
 if kind in ['fridge','cabinet','wardrobe']:
  if kind!='fridge':return cabinet(1.9,'wood' if kind=='wardrobe' else 'metal')
  h=2.3;box('refrigerator shell',(0,h/2,0),(w,h,d),'metal',.06);box('dark display recess',(0,h*.49,d*.5+.008),(w*.9,h*.79,.025),'dark',.01)
  for row in range(3):
   y=.38+row*.53;box('fridge shelf',(0,y,d*.18),(w*.88,.035,d*.5),'ivory',.005)
   for col in range(4):
    x=-w*.32+col*w*.21;b.cyl('drink bottle',(x,y+.18,d*.23),min(.06,w*.04),.28,['blue','accent','red'][row]);b.cyl('bottle cap',(x,y+.335,d*.23),.038,.025,'ivory')
  old=b.role;b.role='glass' if old=='shell' else old
  for s in [-1,1]:
   box('glass door',(s*w*.235,h*.5,d*.53),(w*.45,h*.83,.018),'glass',.005);b.rod('fridge handle',(s*w*.07,.7,d*.57),(s*w*.07,1.45,d*.57),.018,'ivory')
  b.role=old;return
 if kind in ['counter','reception']:
  box('counter cabinet',(0,.51,0),(w,1.02,d),'wood',.08);box('rounded countertop',(0,1.06,0),(w+.02,.12,d+.02),'trim',.07)
  for x in [-w*.25,w*.25]:box('counter front inset',(x,.51,d/2+.01),(w*.43,.78,.025),'woodLight',.025)
  box('register base',(w*.22,1.17,0),(.32,.12,.28),'dark',.025);b.rod('screen stand',(w*.22,1.2,0),(w*.22,1.42,-.025),.025,'metal');o=box('register screen',(w*.22,1.47,-.04),(.4,.27,.045),'dark',.035);o.rotation_euler.x=.16
  return
 if kind in ['bed','double-bed']:
  box('bedframe',(0,.32,0),(w,.28,d),'wood',.055)
  for x in [-w*.4,w*.4]:
   for z in [-d*.4,d*.4]:box('bed leg',(x,.13,z),(.1,.26,.1),'wood',.025)
  box('mattress',(0,.54,0),(w*.94,.23,d*.94),'ivory',.12);box('soft blanket',(0,.675,d*.14),(w*.95,.12,d*.65),'cloth',.13)
  box('headboard',(0,.65,-d*.46),(w,1.05,.13),'wood',.1)
  for x in ([0] if w<1.55 else [-w*.23,w*.23]):b.ball('pillow',(x,.71,-d*.3),(w*.65 if w<1.55 else w*.4,.19,.4),'ivory')
  return
 if kind=='nightstand':
  box('bedside cabinet',(0,.3,0),(w,.6,d),'wood',.04)
  for y in [.17,.43]:box('drawer',(0,y,d/2+.01),(w*.9,.22,.025),'woodLight',.015);box('drawer handle',(0,y,d/2+.04),(w*.35,.035,.03),'ivory',.008)
  return
 if kind in ['sofa','bench']:
  h=.45;box('upholstered base',(0,.3,0),(w,.38,d),'wood' if kind=='bench' else 'cloth',.08)
  box('cushioned back',(0,.78,-d*.38),(w,.75,d*.25),'cloth',.12)
  for x in [-w*.45,w*.45]:box('rounded armrest',(x,.64,0),(w*.13,.38,d),'wood' if kind=='bench' else 'cloth',.1)
  for i in range(3):box('seat cushion',((i-1)*w*.25,.56,d*.08),(w*.24,.19,d*.65),'cloth',.09)
  return
 if kind in ['kitchen','kitchenette']:
  box('kitchen base',(0,.48,0),(w,.96,d),'trim' if variant==1 else 'wood',.04);box('countertop',(0,1,0),(w+.025,.09,d+.025),'ivory',.025)
  for i in range(4):
   x=(i-1.5)*w*.24;box('cupboard door',(x,.48,d/2+.01),(w*.225,.83,.03),'trim' if variant==1 else 'woodLight',.022);b.rod('cabinet pull',(x-.04,.6,d/2+.045),(x+.04,.6,d/2+.045),.012,'metal')
  box('sink rim',(-w*.23,1.056,0),(min(.75,w*.4),.025,d*.72),'metal',.06);box('sink basin',(-w*.23,1.07,0),(min(.62,w*.32),.008,d*.55),'dark',.05)
  x=-w*.23;b.rod('faucet riser',(x,1.06,-d*.28),(x,1.35,-d*.28),.025);b.rod('faucet spout',(x,1.35,-d*.28),(x,1.35,-d*.02),.025)
  for x in [w*.18,w*.36]:
   for z in [-d*.17,d*.17]:b.cyl('stove burner',(x,1.056,z),min(.1,w*.045),.013,'dark')
  return
 if kind in ['workbench','packing','fabrication','table','coffee-table','media']:
  top=.5 if kind=='coffee-table' else .84;legs(top);box('tabletop',(0,top,0),(w,.12,d),'metal' if kind=='fabrication' else 'woodLight',.045)
  if kind=='media':
   cabinet(.6,'wood');box('TV stand',(0,.68,0),(.45,.08,d*.5),'dark',.025);box('television',(0,1.08,0),(w*.9,.72,.06),'dark',.045);box('TV glass',(0,1.08,.034),(w*.83,.64,.006),'metal',.025)
  if kind=='workbench':
   box('pegboard',(0,1.6,-d*.41),(w*.94,1.22,.075),'metal',.035)
   for i in range(6):
    x=(i-2.5)*w*.14;b.rod('tool handle',(x,1.25,-d*.35),(x,1.7,-d*.35),.022,'red' if i%2 else 'wood');box('tool head',(x,1.76,-d*.35),(.16,.07,.05),'metal',.012)
   box('vise base',(w*.26,top+.12,d*.1),(.35,.14,.32),'blue',.025);box('vise jaws',(w*.26,top+.29,d*.1),(.4,.16,.16),'blue',.025)
  if kind=='fabrication':
   for x in [-w*.3,0,w*.3]:
    for z in [-d*.28,0,d*.28]:b.cyl('fixture hole',(x,top+.064,z),.027,.005,'dark')
  if kind=='packing':carton(w*.25,top+.25,0,w*.3,.4,d*.6)
  if kind=='table':b.cyl('mug',(w*.25,top+.16,0),.065,.2,'ivory');box('book',(-w*.2,top+.09,0),(.32,.055,.24),'cloth',.01)
  return
 if kind in ['pallet','cartons','cargo']:
  if kind!='cartons':
   for x in [-w*.34,0,w*.34]:box('pallet runner',(x,.075,0),(w*.12,.15,d),'wood',.012)
   for i in range(6):box('pallet plank',(0,.18,(i-2.5)*d*.15),(w,.06,d*.12),'woodLight',.012)
  if kind!='pallet':
   base=0 if kind=='cartons' else .22
   for x,z,cw,ch,cd in [(-w*.22,-d*.15,w*.42,.55,d*.65),(w*.23,-d*.18,w*.38,.76,d*.55),(0,d*.23,w*.48,.45,d*.4)]:carton(x,base+ch/2,z,cw,ch,cd)
  return
 if kind=='toolchest':
  box('red tool chest',(0,.52,0),(w,.83,d),'red',.05)
  for i in range(4):
   y=.25+i*.18;box('drawer',(0,y,d/2+.015),(w*.88,.13,.04),'red',.02);box('metal drawer pull',(0,y,d/2+.045),(w*.7,.025,.025),'ivory',.007)
  for x in [-w*.37,w*.37]:
   for z in [-d*.33,d*.33]:b.cyl('caster',(x,.09,z),.09,.05,'dark','x')
  return
 if kind in ['vent','fan']:
  box('vent casing',(0,.35,0),(w,.7,.15),'metal',.055);box('vent recess',(0,.35,.09),(w*.83,.53,.03),'dark',.04)
  for i in range(5):box('louver',(0,.13+i*.11,.12),(w*.77,.035,.03),'metal',.01)
  return
 if kind=='trash':
  box('bin',(0,.4,0),(w,.8,d),'trim',.08);box('bin lid',(0,.84,0),(w+.03,.16,d+.03),'trim',.065);box('bin opening',(0,.9,d*.18),(w*.7,.05,d*.34),'dark',.04);return
 if kind=='pegboard':
  box('tool pegboard',(0,.6,0),(w,1.2,.08),'metal',.025)
  for i in range(6):
   x=(i-2.5)*w*.13;b.rod('tool',(x,.25,.08),(x,.9,.08),.025,'red' if i%2 else 'wood');box('tool head',(x,.93,.08),(.16,.08,.05),'metal',.02)
  return
 if kind=='jack':
  for x in [-w*.3,w*.3]:box('pallet jack fork',(x,.12,d*.1),(w*.24,.1,d*.85),'accent',.025)
  box('hydraulic base',(0,.32,-d*.31),(w*.8,.55,d*.3),'accent',.08);b.rod('handle post',(0,.3,-d*.35),(0,1.2,-d*.48),.035,'dark');box('loop handle',(0,1.22,-d*.48),(w*.7,.25,.06),'dark',.07)
  for x in [-w*.3,w*.3]:b.cyl('roller',(x,.08,d*.4),.07,.11,'dark','x')
  return
 raise ValueError('Unknown prop '+kind)

PROPSETS=[ [('checkout','counter',2.4,.85),('shelf','shelf',1.8,.7),('refrigerator','fridge',1.6,.8),('cabinet','cabinet',1.2,.65),('trash-bin','trash',.55,.55),('wall-vent','vent',.7,.15)], [('single-bed','bed',1.3,2.2),('bedside-cabinet','nightstand',.55,.5),('waiting-bench','bench',1.8,.65),('dining-table','table',2,1.1),('kitchenette','kitchenette',2.6,.75),('reception','reception',2.4,.85)], [('workbench','workbench',2.5,.85),('tool-chest','toolchest',.85,.6),('pegboard','pegboard',1.8,.1),('parts-cabinet','cabinet',1.2,.65),('fabrication-table','fabrication',1.8,1.1),('exhaust-fan','fan',.7,.15)], [('sofa','sofa',2.1,.85),('coffee-table','coffee-table',1.2,.7),('tv-cabinet','media',1.5,.5),('double-bed','double-bed',1.8,2.2),('wardrobe','wardrobe',1.4,.65),('kitchen','kitchen',2.6,.75)], [('storage-rack','rack',2.5,.9),('pallet','pallet',1.2,1),('cartons','cartons',1.4,1),('packing-bench','packing',2,.8),('cabinet','cabinet',1.2,.65),('pallet-jack','jack',.75,1.6)] ]
report={'source':'Fresh Blender scenes measured to current layout; five saved reference images','buildings':[],'props':[]};models=[];packed=[]
def export(root,parts,path):
 bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
 for o in parts:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_extras=True)
def triangles(parts):return sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in parts)
for index,data in enumerate(D['buildings']):
 typ=data['type'];ref='../references/'+REFS[index]+'.png';refpath=os.path.normpath(OUT+'/'+ref);raw=open(refpath,'rb').read();sha=hashlib.sha256(raw).hexdigest();im=bpy.data.images.load(refpath);im.pack();packed.append(im);mats=palette(index)
 # Separate reusable, centered prop assets, available even when not placed in this room.
 for name,kind,pw,pd in PROPSETS[index]:
  p=Builder(mats);p.role='interior';prop(p,kind,pw,pd,index);root=p.group(typ+'-'+name);root['referenceSha256']=sha;parts=p.join(root);export(root,parts,OUT+'/props/'+typ+'-'+name+'.glb');report['props'].append({'name':typ+'-'+name,'triangles':triangles(parts),'drawCalls':len(parts)})
  root.location=(index*18,-22-PROPSETS[index].index((name,kind,pw,pd))*3,0)
  for o in parts:o.hide_render=True
 b=Builder(mats);w=data['width'];d=data['depth'];h=data['height'];front=data['front'];fz=front*d/2;box=b.box
 root=b.group(typ+'-building');root['referenceSha256']=sha;root['buildingIndex']=index;root['designSource']=REFS[index]+'.png + layout.json';root['layoutWidth']=w;root['layoutDepth']=d
 box('floor',(0,.007,0),(w-.2,.025,d-.2),'floor',.005);box('foundation',(0,-.07,0),(w+.4,.14,d+.4),'metal',.025)
 winlo,winhi=(4.0,4.8) if typ=='warehouse' else (1.2,2.75)
 for side in [-1,1]:
  x=side*w/2;centers=[-d*.25,d*.25];zcuts=sorted(set([-d/2,d/2]+[z+offset for z in centers for offset in [-.8,.8]]));ys=sorted(set([0,winlo,winhi,h]))
  for a,c in zip(zcuts,zcuts[1:]):
   for lo,hi in zip(ys,ys[1:]):
    z=(a+c)/2;y=(lo+hi)/2
    if winlo<y<winhi and any(abs(z-at)<.8 for at in centers):continue
    box('side wall',(x,y,z),(WALL,hi-lo,c-a),'wall',.008)
  for z in centers:
   b.role='glass';box('side window glass',(x,(winlo+winhi)/2,z),(.018,winhi-winlo,1.6),'glass',.004);b.role='shell'
   for dz in [-.845,.845]:box('side window jamb',(x,(winlo+winhi)/2,z+dz),(.27,winhi-winlo+.16,.09),'trim',.018)
   for y in [winlo-.05,winhi+.05]:box('side window rail',(x,y,z),(.27,.1,1.78),'trim',.018)
  box('utility box',(x+side*.2,1.05,d*.4),(.18,.6,.35),'metal',.03)
  b.rod('utility conduit',(x+side*.18,1.35,d*.4),(x+side*.18,2.8,d*.4),.025,'metal')
 box('back wall',(0,h/2,-fz),(w,h,WALL),'wall',.012)
 openings=[(-.9,.9,0,2.85)]+[(s*w*.3-1,s*w*.3+1,winlo,winhi) for s in [-1,1]]
 cuts=sorted(set([-w/2,w/2]+[v for a,c,lo,hi in openings for v in [a,c]]));heights=sorted(set([0,winlo,winhi,2.85,h]))
 for a,c in zip(cuts,cuts[1:]):
  for lo,hi in zip(heights,heights[1:]):
   x=(a+c)/2;y=(lo+hi)/2
   if any(l<x<r and bottom<y<top for l,r,bottom,top in openings):continue
   box('cut facade',(x,y,fz),(c-a,hi-lo,WALL),'wall',.006)
 # Real window openings with glass and rounded trim.
 for x in [-w*.3,w*.3]:
  b.role='glass';box('window glass',(x,(winlo+winhi)/2,fz),(2,winhi-winlo,.018),'glass',.004);b.role='shell'
  for s in [-1,1]:box('window jamb',(x+s*1.045,(winlo+winhi)/2,fz+front*.025),(.11,winhi-winlo+.18,.29),'trim',.022)
  for y in [winlo-.05,winhi+.05]:box('window rail',(x,y,fz+front*.025),(2.18,.11,.29),'trim',.022)
  box('mullion',(x,(winlo+winhi)/2,fz),(.055,winhi-winlo,.07),'trim',.012)
 for x in [-.87,.87]:box('door frame',(x,1.425,fz),(.08,2.85,.28),'trim',.015)
 box('lintel',(0,2.89,fz),(1.85,.1,.29),'trim',.018)
 b.role='door'
 if typ=='home':
  box('door leaf',(0,1.4,fz),(1.6,2.8,.14),'trim',.035)
  box('door inset',(0,1.85,fz+front*.08),(1.22,1.17,.025),'cloth',.045)
 else:
  pane_width=1.18 if typ in ['store','shelter'] else .7
  pane_lo,pane_hi=(1.15,2.5) if typ in ['store','shelter'] else (1.65,2.35)
  side_width=(1.6-pane_width)/2
  for side in [-1,1]:box('door stile',(side*(pane_width/2+side_width/2),1.4,fz),(side_width,2.8,.14),'trim',.024)
  box('door bottom panel',(0,pane_lo/2,fz),(pane_width,pane_lo,.14),'trim',.025)
  box('door top rail',(0,(2.8+pane_hi)/2,fz),(pane_width,2.8-pane_hi,.14),'trim',.022)
  box('door glass',(0,(pane_lo+pane_hi)/2,fz),(pane_width,pane_hi-pane_lo,.02),'glass',.004)
 b.rod('door pull',(.59,1.04,fz+front*.12),(.59,1.45,fz+front*.12),.025,'ivory')
 b.role='shell'
 for x in [-w/2,w/2]:
  for z in [-d/2,d/2]:box('corner trim',(x,1.55,z),(.2,3.1,.2),'trim',.025)
 for z in [-d/2,d/2]:box('plinth',(0,.24,z),(w+.12,.48,.15),'trim',.025)
 for x in [-w/2,w/2]:box('plinth',(x,.24,0),(.15,.48,d),'trim',.025)
 # Ceiling remains at the established human-scale interior height.
 b.role='roof'
 box('ceiling',(0,3.25,0),(w-.25,.1,d-.25),'ivory',.005)
 b.role='shell'
 for z in [-d*.23,d*.23]:box('ceiling light',(0,3.15,z),(1.3,.07,.3),'light',.018)
 for part in data['partitions']:box('bedroom partition',(part['x'],part['height']/2,part['z']),(part['width'],part['height'],part['depth']),'wall',.008)
 sign_y=3.45 if typ=='warehouse' else 3.65
 box('sign back',(0,sign_y,fz+front*.18),(min(w-1,7.2),.8,.16),'trim',.09);b.text('business lettering',data['name'],(0,sign_y,fz+front*.275),.39,front)
 for x in [-w*.33,w*.33]:
  box('exterior lamp housing',(x,3.12,fz+front*.2),(.35,.18,.27),'trim',.045);box('exterior lamp lens',(x,3.04,fz+front*.24),(.28,.04,.2),'light',.015)
 if typ=='store':
  o=box('rounded shop awning',(0,3.03,fz+front*.65),(w*.83,.18,1.35),'trim',.075)
  for j in range(7):box('awning stripe',((j-3)*w*.105,3.129,fz+front*.65),(w*.045,.012,1.27),'ivory',.004)
 elif typ=='shelter':box('entrance canopy',(0,3.03,fz+front*.5),(2.8,.15,1.15),'trim',.055)
 elif typ in ['warehouse','workshop']:
  # Decorative closed shutter is on a side wall; the established front doorway stays clear.
  sx=w/2+.13;box('closed side loading shutter',(sx,1.6,0),(.05,2.9,3.2),'metal',.018)
  for j in range(12):box('shutter rib',(sx+.035,.3+j*.23,0),(.035,.035,3.08),'dark',.005)
  if typ=='warehouse':
   for side in [-1,1]:
    for z in [j*.48-d*.43 for j in range(max(2,int(d*1.8)))]:box('corrugated siding',(side*(w/2+.12),h*.52,z),(.035,h*.83,.045),'metal',.004)
 b.role='roof'
 if typ=='home':
  half=w/2+.22;rise=1.15
  for side in [-1,1]:
   o=box('sloped roof',(side*half/2,h+rise/2,0),(math.hypot(half,rise),.14,d+.5),'trim',.035);o.rotation_euler.y=side*math.atan2(rise,half)
  # Closed gables rather than open triangular gaps.
  for side in [-1,1]:
   verts=[(-w/2,side*d/2,h),(w/2,side*d/2,h),(0,side*d/2,h+rise)];mesh=bpy.data.meshes.new('gable');mesh.from_pydata([xyz(v) for v in verts],[],[(0,1,2),(2,1,0)]);o=bpy.data.objects.new('gable',mesh);bpy.context.collection.objects.link(o);b.finish(o,'roof gable','wall')
 else:
  box('roof cap',(0,h+.08,0),(w+.5,.2,d+.5),'trim',.055)
  for z in [-d/2,d/2]:box('parapet',(0,h+.2,z),(w+.24,.3,.18),'trim',.035)
  for x in [-w/2,w/2]:box('parapet',(x,h+.2,0),(.18,.3,d+.24),'trim',.035)
  box('roof HVAC',(w*.25,h+.45,-d*.15),(1.1,.6,.8),'metal',.055)
  for j in range(5):box('HVAC grille',(w*.25,h+.25+j*.09,-d*.15+.415),(.9,.028,.025),'dark',.004)
 # Furnish exactly the existing reserved collision footprints.
 b.role='interior'
 for fi,f in enumerate(data['fixtures']):
  start=len(b.parts);fw=f['width'];fd=f['depth'];kind=f['kind'];turn=0
  if kind in ['shelf','rack','sofa','cabinet','workbench'] and fd>fw*1.25:fw,fd=fd,fw;turn=math.pi/2 if f['x']<0 else -math.pi/2
  elif kind in ['kitchen','workbench','cabinet'] and f['z']>d*.2:turn=math.pi
  if typ=='home' and kind=='table':kind='media' if f['x']>0 else 'coffee-table'
  elif typ=='workshop' and kind=='table':kind='fabrication'
  elif typ=='warehouse' and kind=='workbench':kind='packing'
  elif kind=='pallet':kind='cargo'
  b.fixture=fi;prop(b,kind,fw,fd,index)
  for o in b.parts[start:]:
   # Bake each prop transform, so all furniture can merge by material.
   gp=Vector((f['x'], -f['z'],0))
   if turn:
    from mathutils import Matrix
    R=Matrix.Rotation(-turn,4,'Z');o.matrix_world=R@o.matrix_world
   o.location+=gp
 b.fixture=-1;parts=b.join(root)
 hinge=b.group(typ+'-door-hinge');hinge.location=xyz((-D['doorWidth']/2,0,fz));hinge.parent=root
 bpy.context.view_layer.update()
 for o in parts:
  if o['part']=='door':mw=o.matrix_world.copy();o.parent=hinge;o.matrix_world=mw
 root['source']='blender';allparts=parts+[hinge];export(root,allparts,CLIENT+'/'+typ+'.glb')
 report['buildings'].append({'kind':typ,'referenceSha256':sha,'triangles':triangles(parts),'drawCalls':len(parts),'bytes':os.path.getsize(CLIENT+'/'+typ+'.glb')})
 models.append((root,parts,hinge));
 for o in parts:o.hide_render=True
# Pack all five references as source-study image empties.
for i,im in enumerate(packed):
 e=bpy.data.objects.new('REFERENCE '+REFS[i],None);bpy.context.collection.objects.link(e);e.empty_display_type='IMAGE';e.data=im;e.empty_display_size=12;e.location=(i*18,12,4);e.hide_render=True
# Studio renders of each complete building and roof-removed furnishing study.
target=Vector((0,0,1.8));bpy.ops.object.camera_add(location=(17,-20,15));cam=bpy.context.object;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=20;scene.camera=cam
for pos,power,size in [((4,-8,15),1800,10),((-9,-2,10),1200,9),((3,10,12),1800,9)]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
for i,(root,parts,hinge) in enumerate(models):
 for _,others,_ in models:
  for o in others:o.hide_render=True
 for o in parts:o.hide_render=False
 # Rotate only the studio presentation, not exported game data.
 if D['buildings'][i]['front']<0:root.rotation_euler.z=math.pi
 hinge.rotation_euler.z=-D['buildings'][i]['front']*.8
 scene.render.filepath=OUT+'/'+D['buildings'][i]['type']+'-exterior.png';bpy.ops.render.render(write_still=True)
 for o in parts:
  if o['part']=='roof':o.hide_render=True
 cam.location=(13,-16,28);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=OUT+'/'+D['buildings'][i]['type']+'-interior.png';bpy.ops.render.render(write_still=True)
 cam.location=(17,-20,15);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
 for o in parts:o.hide_render=True
 hinge.rotation_euler.z=0;root.rotation_euler.z=0;root.location=(i*18,0,0)
for _,parts,_ in models:
 for o in parts:o.hide_render=False
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(OUT+'/building-library.blend'));json.dump(report,open(OUT+'/report.json','w'),indent=2);print(json.dumps(report))
