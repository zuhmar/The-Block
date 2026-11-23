"""Build original glossy harvest tools in Blender from the approved AI sprites.
Run from repository root. Local modeling only; no generated mesh or old tool geometry.
"""
import bpy, math, json, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path('art/models/harvest-tools'); OUT=Path('apps/client/static/assets/harvest-tools'); REPORT=[]
for kind in ['axe','pickaxe']:
 bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.preferences.filepaths.save_version=0
 objects=[]; mats={}
 for name,color,metal,rough in [('wood',(.62,.30,.095),0,.38),('wood-grain',(.33,.125,.035),0,.46),('grip',(.105,.095,.125),0,.43),('binding',(.94,.31,.035),0,.34),('steel',(.31,.38,.49),.5,.29),('edge',(.77,.84,.9),.65,.23)]:
  m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*(v**2.2 for v in color),1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough;n.inputs['Coat Weight'].default_value=.2;mats[name]=m
 def mesh(name,vs,faces,mat,smooth=False,bevel=0):
  d=bpy.data.meshes.new(name);d.from_pydata(vs,[],faces);d.update();o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.data.materials.append(mats[mat]);objects.append(o)
  for p in d.polygons:p.use_smooth=smooth
  if bevel:
   mod=o.modifiers.new('rounded crafted edges','BEVEL');mod.width=bevel;mod.segments=3
   bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
  return o
 def tube(name,path,radii,mat,sides=12):
  vs=[]
  for i,p in enumerate(path):
   tangent=(Vector(path[min(i+1,len(path)-1)])-Vector(path[max(0,i-1)])).normalized();a=tangent.cross(Vector((0,1,0))).normalized();b=tangent.cross(a)
   for j in range(sides):
    q=Vector(p)+radii[i]*(a*math.cos(j*math.tau/sides)+b*math.sin(j*math.tau/sides));vs.append(tuple(q))
  fs=[tuple(range(sides-1,-1,-1)),tuple((len(path)-1)*sides+j for j in range(sides))]
  for i in range(len(path)-1):
   for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;fs.append((a,b,b+sides,a+sides))
  return mesh(name,vs,fs,mat,True)
 def profile(name,coords,thickness,mat,bevel=.005):
  vs=[(x,y,z) for y in [-thickness/2,thickness/2] for x,z in coords];n=len(coords)
  fs=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
  return mesh(name,vs,fs,mat,False,bevel)
 # A curved, oval, solid wooden haft. The lower grip is centered at the origin.
 def cx(z):return .035*math.sin((z+.12)*math.pi/.95)
 path=[(cx(z),0,z) for z in [-.14,-.1,.0,.16,.32,.49,.65,.8,.9]]
 tube('curved wooden haft',path,[.039,.042,.036,.031,.029,.03,.034,.038,.036],'wood',16)
 # Sparse solid grain lines rather than noise textures; clear in close first-person views.
 for j in range(5):
  a=j*math.tau/5
  zs=[.2+i*.045 for i in range(13)];p=[(cx(z)+.0305*math.cos(a+.16*math.sin(i*.65)),.0305*math.sin(a+.16*math.sin(i*.65)),z) for i,z in enumerate(zs)]
  tube('carved wood grain',p,[.0018]*len(p),'wood-grain',5)
 # Layered leather winding follows the reference, with beveled seams and a visible wooden pommel.
 tube('leather underwrap',[(cx(z),0,z) for z in [-.12,.18]],[.0395,.0375],'grip',16)
 for i in range(8):
  z=-.095+i*.036;steps=20;vs=[]
  for dz in [-.016,.016]:
   for j in range(steps):
    a=j*math.tau/steps;zz=z+dz+.011*math.cos(a);r=.044 if i<2 else .04
    vs.append((cx(zz)+r*math.cos(a),r*math.sin(a),zz))
  mesh('overlapping charcoal grip wrap',vs,[(j,(j+1)%steps,(j+1)%steps+steps,j+steps) for j in range(steps)],'grip',True,.0015)
 # Orange diagonal bindings around the head socket.
 for direction in [-1,1]:
  for turn in range(2):
   vs=[];steps=30
   for offset in [-.009,.009]:
    for j in range(steps):
     a=j/(steps-1)*math.tau;z=.69+turn*.06+direction*.055*(j/(steps-1)-.5)+offset
     vs.append((cx(z)+.047*math.cos(a),.047*math.sin(a),z))
   o=mesh('orange cross binding',vs,[(j,j+1,j+1+steps,j+steps) for j in range(steps-1)],'binding',True)
   mod=o.modifiers.new('strap thickness','SOLIDIFY');mod.thickness=.005;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 profile('front and back crossing orange tie A',[(-.055,.71),(-.039,.70),(.065,.855),(.049,.866)],.103,'binding',.003)
 profile('front and back crossing orange tie B',[(-.055,.847),(-.042,.859),(.069,.717),(.054,.706)],.105,'binding',.003)
 if kind=='axe':
  # Crescent bit widens toward its swept cutting edge; compact poll balances the head.
  profile('forged axe body',[(-.14,.86),(-.02,.865),(.07,.825),(.15,.75),(.245,.72),(.34,.745),(.34,.745),(.337,.689),(.307,.62),(.247,.566),(.175,.548),(.12,.545),(.13,.585),(.12,.64),(.065,.695),(-.035,.73),(-.14,.735)],.075,'steel',.009)
  profile('polished crescent cutting bevel',[(.37,.77),(.365,.68),(.325,.59),(.255,.53),(.17,.505),(.095,.51),(.12,.545),(.175,.548),(.247,.566),(.307,.62),(.337,.689),(.34,.745)],.026,'edge',.0025)
  profile('bright poll face',[(-.14,.86),(-.105,.86),(-.105,.735),(-.14,.735)],.078,'edge',.004)
 else:
  # A true tapered curved spike, with opposite broad chisel, not a bent cylinder.
  centers=[(-.29,.86,.073,.018),(-.23,.85,.065,.026),(-.13,.818,.052,.035),(0,.765,.047,.044),(.10,.71,.04,.034),(.2,.63,.03,.025),(.29,.53,.018,.016),(.355,.415,.001,.001)]
  vs=[]
  for x,z,h,t in centers:
   vs.extend([(x,-t,z-h),(x,t,z-h),(x,t,z+h),(x,-t,z+h)])
  fs=[(3,2,1,0),(28,29,30,31)]
  for i in range(len(centers)-1):
   for j in range(4):fs.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
  head=mesh('curved tapered pick and chisel',vs,fs,'steel',False,.003)
  profile('polished chisel bevel',[(-.29,.933),(-.265,.924),(-.255,.79),(-.29,.787)],.04,'edge',.002)
  profile('polished mining point',[(.2,.6),(.29,.512),(.355,.414),(.29,.53),(.2,.616)],.012,'edge',.001)
 # UV unwrap every original mesh. Materials remain self-contained PBR colors in GLB.
 for o in objects:
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.015);bpy.ops.object.mode_set(mode='OBJECT')
 root=bpy.data.objects.new(kind,None);bpy.context.collection.objects.link(root)
 ref=Path('art/ai/harvest-tools')/(kind+'.png');sha=hashlib.sha256(ref.read_bytes()).hexdigest()
 root['sourceReference']=str(ref);root['sourceSHA256']=sha;root['gripOrigin']='center of lower wrapped grip';root['units']='metres';root['tool']=kind
 for o in objects:o.parent=root
 # Keep authoring parts editable in .blend; export merges by material for six draw calls.
 merged=[]
 for material in mats.values():
  copies=[]
  for source in objects:
   if source.data.materials[0]!=material:continue
   copy=source.copy();copy.data=source.data.copy();bpy.context.collection.objects.link(copy);copy.parent=root;copies.append(copy)
  if not copies:continue
  bpy.ops.object.select_all(action='DESELECT')
  for copy in copies:copy.select_set(True)
  bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.join();merged.append(bpy.context.object)
 bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
 for o in merged:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/(kind+'.glb')),export_format='GLB',use_selection=True,export_extras=True,export_yup=True)
 for o in merged:bpy.data.objects.remove(o,do_unlink=True)
 points=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box];lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)));size=hi-lo
 triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects)
 REPORT.append({'id':kind,'file':kind+'.glb','sourceReference':str(ref),'sourceSHA256':sha,'triangles':triangles,'sizeMetres':{'x':round(size.x,4),'y':round(size.z,4),'z':round(size.y,4)},'bytes':(OUT/(kind+'.glb')).stat().st_size})
 image=bpy.data.images.load(str(ref.resolve()));image.pack();guide=bpy.data.objects.new('REFERENCE - '+kind,None);bpy.context.collection.objects.link(guide);guide.empty_display_type='IMAGE';guide.data=image;guide.empty_display_size=1.2;guide.location=(1,0,.4);guide.hide_render=True
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=False;scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='AgX';scene.world=bpy.data.worlds.new('studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.3,.38,.48,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
 target=(hi+lo)/2;bpy.ops.object.camera_add(location=target+Vector((1.1,-3,1)));cam=bpy.context.object;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=1.3;scene.camera=cam
 for delta,power,s in [((2,-3,4),350,3),((-3,-1,2),200,3),((1,3,3),400,2)]:
  bpy.ops.object.light_add(type='AREA',location=target+Vector(delta));light=bpy.context.object;light.data.energy=power;light.data.size=s;light.rotation_euler=(target-light.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(ROOT/'renders'/(kind+'.png'));bpy.ops.render.render(write_still=True);bpy.ops.wm.save_as_mainfile(filepath=str((ROOT/(kind+'.blend')).resolve()),compress=True)
(OUT/'manifest.json').write_text(json.dumps({'units':'metres','models':REPORT},indent=2)+'\n');print(json.dumps(REPORT))
