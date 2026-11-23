"""Original glossy crafting stations and refined materials, matching the station reference."""
import bpy,bmesh,math,json,hashlib
from mathutils import Vector
from pathlib import Path
ROOT=Path('art/models/crafting');OUT=Path('apps/client/static/assets/crafting');REF=Path('art/ai/crafting/stations-reference.png');REPORT=[]
for folder in [ROOT,OUT]:folder.mkdir(parents=True,exist_ok=True)
for kind in ['workbench','furnace','sulfur-refined','metal-fragments','charcoal','gunpowder']:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0;parts=[]
 def mat(name,color,metal=0,emit=0):
  m=bpy.data.materials.new(name);m.use_nodes=True;m.use_backface_culling=True;n=m.node_tree.nodes.get('Principled BSDF');srgb=tuple(int(color[i:i+2],16)/255 for i in (0,2,4));rgb=tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in srgb);n.inputs['Base Color'].default_value=(*rgb,1);n.inputs['Roughness'].default_value=.35;n.inputs['Metallic'].default_value=metal;n.inputs['Coat Weight'].default_value=.28
  if emit:n.inputs['Emission Color'].default_value=(*rgb,1);n.inputs['Emission Strength'].default_value=emit
  return m
 wood=mat('warm wood','9E582C');green=mat('olive green frame','465C31',.15);iron=mat('charcoal iron','302B2E',.3);steel=mat('warm gray steel','82766C',.45);stone=mat('warm stone','8F7D6B');gold=mat('brass fittings','C58B22',.4);ember=mat('fire coals','F3570D',0,1.5);yellow=mat('refined sulfur','E5BB24');black=mat('charcoal','211F20');cloth=mat('canvas sack','877255')
 def add(o,name,m):o.name=name;o.data.materials.append(m);parts.append(o);return o
 def cube(name,p,s,m,bevel=.025):
  bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.dimensions=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);add(o,name,m)
  if bevel:mod=o.modifiers.new('glossy rounded edges','BEVEL');mod.width=bevel;mod.segments=2;o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
  return o
 def sphere(name,p,s,m,ico=False):
  if ico:bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=p)
  else:bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=1,location=p)
  o=bpy.context.object;o.scale=s;add(o,name,m)
  for f in o.data.polygons:f.use_smooth=not ico
  return o
 def cylinder(name,p,r,h,m,r2=None):
  bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=r,radius2=r if r2 is None else r2,depth=h,location=p);o=bpy.context.object;add(o,name,m)
  for f in o.data.polygons:f.use_smooth=len(f.vertices)==4
  return o
 def mesh(name,vs,fs,m):
  data=bpy.data.meshes.new(name);data.from_pydata(vs,[],fs);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);return add(o,name,m)
 def tube(name,r,inside,z,h,m):
  n=32;vs=[(rad*math.cos(j*math.tau/n),rad*math.sin(j*math.tau/n),zz)for rad,zz in [(r,z),(r,z+h),(inside,z),(inside,z+h)]for j in range(n)];fs=[]
  for j in range(n):k=(j+1)%n;fs.extend([(j,k,n+k,n+j),(2*n+j,3*n+j,3*n+k,2*n+k),(j,2*n+j,2*n+k,k),(n+j,n+k,3*n+k,3*n+j)])
  return mesh(name,vs,fs,m)
 if kind=='workbench':
  cube('solid wood tabletop',(0,0,.92),(1.55,.8,.13),wood,.045);cube('wood lower shelf',(0,0,.24),(1.36,.65,.075),wood)
  for x in [-.65,.65]:
   for y in [-.29,.29]:cube('green leg',(x,y,.44),(.10,.10,.84),green,.015);cube('rubber foot',(x,y,.035),(.15,.15,.07),iron,.018)
   cube('side frame brace',(x,0,.78),(.10,.64,.10),green,.015)
  for y in [-.3,.3]:cube('frame rail',(0,y,.80),(1.39,.08,.1),green,.012)
  cube('press base',(-.45,-.02,1.015),(.38,.30,.08),green);cube('press upright',(-.58,.035,1.23),(.095,.13,.39),green);cube('press head',(-.44,.035,1.405),(.36,.18,.095),green);cylinder('press ram',(-.32,.035,1.29),.035,.20,steel)
  lever=cube('press lever',(-.22,.03,1.25),(.045,.05,.48),green,.012);lever.rotation_euler.y=.45;sphere('lever knob',(-.115,.03,1.48),(.055,.055,.055),iron)
  cube('vise base',(.48,.03,1.035),(.32,.28,.08),iron);cube('vise body',(.48,.05,1.125),(.20,.22,.16),iron)
  for x in [.39,.57]:cube('vise jaw',(x,.035,1.22),(.08,.29,.07),steel,.012)
  handle=cylinder('vise handle',(.65,-.02,1.12),.015,.27,steel);handle.rotation_euler.y=math.pi/2
  cube('ammo tray',(.02,-.17,1.015),(.31,.22,.055),iron,.012)
  for i in range(4):cylinder('brass round',(-.08+i*.055,-.17,1.10),.018,.11,gold);cylinder('round tip',(-.08+i*.055,-.17,1.17),.018,.035,gold,r2=.002)
 elif kind=='furnace':
  # Individual closed masonry wedges leave a genuine front firebox opening.
  n=12
  for row,(z,h,r)in enumerate([(0,.20,.64),(.205,.25,.62),(.46,.25,.59),(.715,.23,.56),(1.025,.14,.46)]):
   for j in range(n):
    a=j*math.tau/n+(row%2)*math.pi/n;center=a+math.pi/n
    if row in [1,2] and abs((center+math.pi/2+math.pi)%math.tau-math.pi)<.55:continue
    a+=.018;b=a+math.tau/n-.036;inner=r-.15;vs=[]
    for zz in [z,z+h]:
     for rad,aa in [(r,a),(r,b),(inner,b),(inner,a)]:vs.append((rad*math.cos(aa),rad*math.sin(aa),zz))
    o=mesh('stone brick',vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],stone);mod=o.modifiers.new('soft masonry edges','BEVEL');mod.width=.012;mod.segments=2;o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
  tube('iron upper strap',.58,.54,.93,.105,iron);tube('short open chimney',.19,.145,1.13,.45,iron);tube('chimney rim',.215,.145,1.54,.06,steel)
  outer=[(-.34,.16),(-.34,.50)]+[(.34*math.cos(math.pi-i*math.pi/16),.50+.34*math.sin(math.pi-i*math.pi/16))for i in range(17)]+[(.34,.16)]
  inner=[(-.26,.16),(-.26,.50)]+[(.26*math.cos(math.pi-i*math.pi/16),.50+.26*math.sin(math.pi-i*math.pi/16))for i in range(17)]+[(.26,.16)]
  vs=[(x,y,z)for y in [-.65,-.58]for ring in [outer,inner]for x,z in ring];n=len(outer);fs=[]
  for i in range(n):j=(i+1)%n;fs.extend([(i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),(i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)])
  mesh('arched firebox iron frame',vs,fs,iron);cube('dark firebox rear',(0,-.32,.43),(.55,.055,.58),iron,.02)
  for i in range(7):sphere('glowing coals',((i%3-1)*.14,-.48+(i//3)*.07,.22+(i%2)*.06),(.11,.10,.09),ember,True)
  for z in [.33,.63]:cylinder('brass door hinge',(.36,-.63,z),.025,.15,gold)
  cube('iron handle',(-.30,-.69,.40),(.035,.035,.21),steel,.012)
 elif kind in ['charcoal','sulfur-refined']:
  if kind=='sulfur-refined':cylinder('refining bowl',(0,0,.055),.25,.11,iron,r2=.28)
  for i,(x,y,z,r)in enumerate([(-.13,-.06,.12,.15),(.12,-.05,.13,.16),(0,.09,.23,.18),(.18,.12,.1,.11),(-.17,.12,.11,.12)]):sphere('refined mineral chunk' if kind=='sulfur-refined' else 'charcoal lump',(x,y,z),(r,r*.8,r*.75),yellow if kind=='sulfur-refined' else black,True)
 elif kind=='metal-fragments':
  for i in range(7):o=cube('smelted metal strip',((i%3-1)*.12,(i//3-1)*.08,.035+i*.025),(.28,.08,.04),steel,.008);o.rotation_euler.z=i*.7
 else:
  sphere('gunpowder canvas sack',(0,0,.20),(.24,.19,.24),cloth);tube('sack mouth',.17,.13,.32,.07,cloth)
  for i in range(14):sphere('dark powder grain',(((i*7)%9-4)*.025,((i*5)%7-3)*.024,.36),(.035,.03,.025),black,True)
 # Apply bevels; recompute outward normals and combine matching materials for batching.
 for o in parts:
  bpy.context.view_layer.objects.active=o
  for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();body=bpy.context.object;body.name=kind+' surfaces';bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 # Ground-centre all exports, preserving their actual proportions.
 points=[body.matrix_world@Vector(c)for c in body.bound_box];floor=min(p.z for p in points);body.location.z-=floor;bpy.context.view_layer.update();points=[body.matrix_world@Vector(c)for c in body.bound_box];lo=Vector(tuple(min(p[i]for p in points)for i in range(3)));hi=Vector(tuple(max(p[i]for p in points)for i in range(3)));size=hi-lo
 name=('station-' if kind in ['workbench','furnace'] else 'item-')+kind;parent=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(parent);body.parent=parent;parent['craftingKind']=kind;parent['sourceReference']=str(REF);parent['sourceSHA256']=hashlib.sha256(REF.read_bytes()).hexdigest();parent.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True,export_extras=True)
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=False;scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='Standard';scene.world=bpy.data.worlds.new('soft studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.7,.7,.7,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
 target=Vector((0,0,size.z/2));bpy.ops.object.camera_add(location=target+Vector((2,-4,1.8)));cam=bpy.context.object;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=max(size.x,size.z,size.y)*1.45;scene.camera=cam
 for pos,power in [((-2,-3,4),140),((2,1,2),80)]:
  bpy.ops.object.light_add(type='AREA',location=target+Vector(pos));light=bpy.context.object;light.data.energy=power;light.data.size=3;light.rotation_euler=(target-light.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True);bpy.ops.wm.save_as_mainfile(filepath=str((ROOT/(name+'.blend')).resolve()),compress=True)
 REPORT.append({'id':kind,'file':name+'.glb','icon':name+'.png','triangles':sum(len(p.vertices)-2 for p in body.data.polygons),'materials':len(body.data.materials),'size':[round(size.x,3),round(size.z,3),round(size.y,3)],'bytes':(OUT/(name+'.glb')).stat().st_size})
(OUT/'manifest.json').write_text(json.dumps({'models':REPORT,'units':'metres','upAxis':'Y'},indent=2)+'\n');print(json.dumps(REPORT))
