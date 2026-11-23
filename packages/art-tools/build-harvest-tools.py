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
 # Trace the approved image in its own pixel coordinates, then convert to
 # grip-local metres. The same transform supplies planar texture projection.
 base=Vector((180,950)) if kind=='axe' else Vector((318,956))
 socket=Vector((1000,270)) if kind=='axe' else Vector((920,245))
 axis=(socket-base).normalized();across=Vector((-axis.y,axis.x));length=(socket-base).length
 def mapped(pixel):
  q=Vector(pixel)-base
  return (q.dot(across)/length,q.dot(axis)/length-.12)
 def pixel(x,z):
  q=base+across*(x*length)+axis*((z+.12)*length)
  return q
 def curve(points,steps=5,closed=False):
  pts=[Vector(p) for p in points];result=[];n=len(pts)
  for i in range(n if closed else n-1):
   a=pts[(i-1)%n] if closed or i else pts[0];b=pts[i];c=pts[(i+1)%n];d=pts[(i+2)%n] if closed or i+2<n else pts[-1]
   for j in range(steps):
    t=j/steps;v=.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);result.append(tuple(v))
  if not closed:result.append(tuple(pts[-1]))
  return result
 if kind=='axe':
  haft=[(180,950,72),(271,868,70),(390,766,63),(485,680,52),(647,565,47),(805,425,49),(950,290,62),(1010,240,64)]
  outline=[(1001,22),(1041,44),(1095,95),(1160,117),(1200,166),(1235,215),(1266,270),(1325,310),(1403,340),(1486,352),(1461,424),(1411,496),(1342,549),(1262,586),(1182,608),(1092,605),(1118,564),(1130,518),(1132,456),(1117,409),(1089,369),(1049,349),(1017,316),(985,285),(939,244),(913,206),(911,161),(932,120),(970,79)]
  edgeOutside=[(1486,352),(1461,424),(1411,496),(1342,549),(1262,586),(1182,608),(1092,605)]
  edgeInside=[(1453,369),(1429,424),(1381,474),(1315,516),(1245,548),(1170,562),(1115,555)]
  straps=[[(997,204),(1022,252),(1051,313),(1055,351)],[(947,252),(987,266),(1027,280),(1071,289)],[(934,276),(972,292),(1011,310),(1040,328)],[(933,288),(964,314),(991,338),(1017,354)]]
 else:
  haft=[(318,956,66),(409,846,62),(490,738,56),(563,650,50),(683,516,48),(804,382,49),(909,264,55),(995,115,54)]
  outline=[(626,10),(706,49),(788,88),(866,125),(931,165),(993,204),(1068,241),(1122,294),(1178,352),(1220,410),(1261,471),(1289,527),(1300,580),(1258,530),(1218,489),(1175,454),(1118,410),(1064,384),(1007,362),(953,342),(907,319),(867,289),(829,261),(783,233),(729,207),(676,186),(623,167),(578,158),(541,152)]
  edgeOutside=[(1300,580),(1258,530),(1218,489),(1175,454),(1118,410),(1064,384)]
  edgeInside=[(1280,534),(1252,496),(1210,456),(1161,419),(1112,389),(1068,369)]
  straps=[[(895,124),(918,187),(942,252),(968,324)],[(850,252),(910,237),(978,220),(1040,212)],[(838,278),(881,285),(925,312),(966,331)]]
 # Oval sculpted handle, thicker pommel and gently waisted exposed wood.
 knots=[(*mapped((x,z)),r/length) for x,z,r in haft]
 smooth=curve(knots,4);path=[(x,0,z) for x,z,r in smooth];radii=[r for x,z,r in smooth]
 tube('reference-shaped carved wooden haft',path,radii,'wood',20)
 # Leather follows the broad lower grip; each winding has a slanted overlap.
 gripEnd=.235
 def haftAt(z):
  for i in range(len(smooth)-1):
   a,b=smooth[i],smooth[i+1]
   if a[1]<=z<=b[1]:
    t=(z-a[1])/(b[1]-a[1]);return (a[0]*(1-t)+b[0]*t,a[2]*(1-t)+b[2]*t)
  return smooth[0][0],smooth[0][2]
 zs=[-.1+i*(gripEnd+.1)/12 for i in range(13)]
 tube('leather grip underlay',[(haftAt(z)[0],0,z) for z in zs],[haftAt(z)[1]+.002 for z in zs],'grip',20)
 for i in range(9):
  center=-.078+i*.036;vs=[];steps=24
  for dz in [-.019,.019]:
   for j in range(steps):
    a=j*math.tau/steps;z=center+dz+.023*math.cos(a);x,r=haftAt(z);r+=.006
    vs.append((x+r*math.cos(a),r*math.sin(a),z))
  o=mesh('diagonal overlapping leather winding',vs,[(j,(j+1)%steps,(j+1)%steps+steps,j+steps) for j in range(steps)],'grip',True)
  solid=o.modifiers.new('real leather thickness','SOLIDIFY');solid.thickness=.002;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=solid.name)
 # The entire head silhouette is sampled from the reference, not a guessed polygon.
 # Its broad beveled face carries the original steel's painted facet variation.
 coords=curve([mapped(p) for p in outline],3,True)
 profile('reference-traced forged head',coords,.105,'steel',.008)
 # A separate swept, sharp cutting band follows the exact edge in the picture.
 # Surface overlays are seated above the head face, with a real metal side edge.
 band=curve([mapped(p) for p in edgeOutside],4)+list(reversed(curve([mapped(p) for p in edgeInside],4)))
 o=profile('wide polished working bevel',band,.109,'edge',.0015)
 # Orange straps follow curved paths across the socket, then wrap around the
 # sides and rear. They are rounded solid ribbons, not flat crossed bars.
 for index,strap in enumerate(straps):
  front=curve([mapped(p) for p in strap],5);vs=[];width=.012 if kind=='axe' else .014
  for side in [-1,1]:
   for i,(x,z) in enumerate(front):
    prev=Vector(front[max(0,i-1)]);nxt=Vector(front[min(len(front)-1,i+1)]);t=(nxt-prev).normalized();normal=Vector((-t.y,t.x))
    vs.append((x+normal.x*width*side,-.065-.005*math.sin(i/(len(front)-1)*math.pi),z+normal.y*width*side))
  n=len(front);o=mesh('rounded orange socket wrap '+str(index),vs,[(j,j+1,j+1+n,j+n) for j in range(n-1)],'binding',True)
  solid=o.modifiers.new('strap thickness','SOLIDIFY');solid.thickness=.004;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=solid.name)
  bevel=o.modifiers.new('soft strap edges','BEVEL');bevel.width=.0015;bevel.segments=2;bpy.ops.object.modifier_apply(modifier=bevel.name)
  # Matching rear strip and rounded return ends complete the physical binding.
  rear=o.copy();rear.data=o.data.copy();bpy.context.collection.objects.link(rear)
  for v in rear.data.vertices:v.co.y=-v.co.y
  objects.append(rear)
  for x,z in [front[0],front[-1]]:
   tube('strap return around socket',[(x,-.065,z),(x-.012,-.045,z),(x-.02,0,z),(x-.012,.045,z),(x,.065,z)],[width*.3]*5,'binding',6)
 # Use the actual approved image for wood grain and steel facet coloration.
 # Projection is baked into UV coordinates and the image is embedded in GLB.
 refImage=bpy.data.images.load(str((Path('art/ai/harvest-tools')/(kind+'.png')).resolve()));refImage.pack()
 for name in ['wood','steel','edge','grip','binding']:
  m=mats[name];nodes=m.node_tree.nodes;tex=nodes.new('ShaderNodeTexImage');tex.image=refImage;tex.extension='EXTEND';shader=nodes.get('Principled BSDF');m.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color']);shader.inputs['Roughness'].default_value=.36 if name in ['wood','grip'] else .3;shader.inputs['Metallic'].default_value=.12 if name in ['steel','edge'] else 0
 for o in objects:
  uv=o.data.uv_layers.new(name='Reference projection')
  for loop in o.data.loops:
   p=pixel(o.data.vertices[loop.vertex_index].co.x,o.data.vertices[loop.vertex_index].co.z);uv.data[loop.index].uv=(p.x/1536,1-p.y/1024)
 root=bpy.data.objects.new(kind,None);bpy.context.collection.objects.link(root)
 ref=Path('art/ai/harvest-tools')/(kind+'.png');sha=hashlib.sha256(ref.read_bytes()).hexdigest()
 root['sourceReference']=str(ref);root['sourceSHA256']=sha;root['gripOrigin']='center of lower wrapped grip';root['units']='metres';root['tool']=kind
 for o in objects:o.parent=root
 # Keep authoring parts editable in .blend; export merges by material for at most six draw calls.
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
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=False;scene.render.resolution_x=768;scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='AgX';scene.world=bpy.data.worlds.new('studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.3,.38,.48,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
 target=(hi+lo)/2;bpy.ops.object.camera_add(location=target+Vector((.15,-4,.08)));cam=bpy.context.object;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.rotation_euler.rotate_axis('Z',math.atan2(axis.x,-axis.y));cam.data.type='ORTHO';scene.camera=cam;inv=cam.rotation_euler.to_matrix().transposed();projected=[inv@(p-target) for p in points];cam.data.ortho_scale=max(max(p.x for p in projected)-min(p.x for p in projected),(max(p.y for p in projected)-min(p.y for p in projected))*1.5)*1.12
 for delta,power,s in [((2,-3,4),350,3),((-3,-1,2),200,3),((1,3,3),400,2)]:
  bpy.ops.object.light_add(type='AREA',location=target+Vector(delta));light=bpy.context.object;light.data.energy=power;light.data.size=s;light.rotation_euler=(target-light.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(ROOT/'renders'/(kind+'.png'));bpy.ops.render.render(write_still=True);bpy.ops.wm.save_as_mainfile(filepath=str((ROOT/(kind+'.blend')).resolve()),compress=True)
(OUT/'manifest.json').write_text(json.dumps({'units':'metres','models':REPORT},indent=2)+'\n');print(json.dumps(REPORT))
