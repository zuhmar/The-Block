"""Original 3D interpretations of the generated nature sprites, built in Blender.
Organic geometry, palette materials, ground-level origins, and lightweight distant LODs.
"""
import bpy,math,random,json,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path('art/models/nature');OUT=Path('apps/client/static/assets/nature-models');REF=Path('art/ai/nature/tree-resource-nodes.png')
ROOT.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True);(ROOT/'renders').mkdir(exist_ok=True)
REF_HASH=hashlib.sha256(REF.read_bytes()).hexdigest();REPORT=[]
KINDS=['tree-broadleaf','tree-pine','tree-birch','node-rock','node-sulfur','node-metal']
for kind in KINDS:
 for lod in [0,1]:
  bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
  rng=random.Random(130+KINDS.index(kind));objects=[];mats={}
  colors={'bark':(.42,.19,.065),'barkLight':(.57,.31,.10),'barkDark':(.20,.09,.025),'leaf':(.26,.44,.045),'leafLight':(.45,.60,.07),'leafDark':(.12,.25,.025),'pine':(.055,.22,.035),'pineLight':(.15,.36,.045),'pineDark':(.022,.11,.021),'birch':(.82,.79,.66),'birchMark':(.11,.12,.11),'stone':(.38,.41,.44),'stoneLight':(.53,.56,.59),'stoneDark':(.23,.26,.29),'sulfur':(.97,.76,.014),'sulfurLight':(1,.9,.055),'sulfurDark':(.67,.48,.008),'rust':(.55,.17,.035),'copper':(.83,.31,.064),'iron':(.29,.34,.38)}
  for name,color in colors.items():
   m=bpy.data.materials.new(name);m.use_nodes=True;node=m.node_tree.nodes.get('Principled BSDF');node.inputs['Base Color'].default_value=(*(c**2.2 for c in color),1);node.inputs['Roughness'].default_value=.55 if name.startswith(('leaf','pine')) else .45;node.inputs['Coat Weight'].default_value=.08 if name.startswith(('leaf','pine')) else .18;node.inputs['Metallic'].default_value=.3 if name in ['copper','iron'] else .02;mats[name]=m
  def mesh(name,verts,faces,mat,role,smooth=False):
   data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(mats[mat]);o['part']=role
   for p in data.polygons:p.use_smooth=smooth
   objects.append(o);return o
  def tube(name,path,radii,mat='bark',role='bark',sides=None):
   sides=sides or (10 if lod==0 else 6);verts=[]
   for i,p in enumerate(path):
    tangent=(Vector(path[min(i+1,len(path)-1)])-Vector(path[max(0,i-1)])).normalized()
    if i==0:
     ref=Vector((1,0,0)) if abs(tangent.x)<.9 else Vector((0,1,0));right=(ref-tangent*ref.dot(tangent)).normalized()
    else:right=previous.rotation_difference(tangent)@right
    right=(right-tangent*right.dot(tangent)).normalized();across=tangent.cross(right);previous=tangent
    for j in range(sides):
     a=j*math.tau/sides;offset=right*(radii[i]*math.cos(a))+across*(radii[i]*math.sin(a));verts.append(tuple(Vector(p)+offset))
   faces=[tuple(range(sides-1,-1,-1)),tuple((len(path)-1)*sides+j for j in range(sides))]
   for i in range(len(path)-1):
    for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;faces.append((a,b,b+sides,a+sides))
   return mesh(name,verts,faces,mat,role,True)
  def lump(name,pos,scale,mat='leaf',role='canopy',detail=1,deform=.09,smooth=True):
   bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=detail,radius=1,location=pos);o=bpy.context.object;o.name=name
   for v in o.data.vertices:
    q=v.co;factor=1+deform*math.sin(q.x*6.1+q.y*4.9+q.z*7.3+len(objects)*.7);q.x*=scale[0]*factor;q.y*=scale[1]*factor;q.z*=scale[2]*factor
   o.data.update();o.data.materials.append(mats[mat]);o['part']=role
   for p in o.data.polygons:p.use_smooth=smooth
   objects.append(o);return o
  def leaf(pos,angle,size,mat='leafLight',normal=None):
   # Rounded, folded solid leaves: no diamond spikes, planes, or alpha overdraw.
   normal=Vector(normal or (0,0,1)).normalized();rot=normal.to_track_quat('Z','Y');p=Vector(pos);verts=[]
   width=.2 if mat.startswith('pine') else .48
   for j in range(12):
    a=j*math.tau/12;x=math.cos(a)*size;y=math.sin(a)*size*width
    q=Vector((math.cos(angle)*x-math.sin(angle)*y,math.sin(angle)*x+math.cos(angle)*y,.035*size*math.cos(a)));verts.append(tuple(p+rot@q))
   verts.extend([tuple(p+normal*size*.045),tuple(p-normal*size*.03)])
   return mesh('rounded folded leaf',verts,[(j,(j+1)%12,12) for j in range(12)]+[((j+1)%12,j,13) for j in range(12)],mat,'canopy',True)
  def roots(radius,mat='bark'):
   for i in range(6 if lod==0 else 4):
    a=i*math.tau/(6 if lod==0 else 4)+.25;length=radius*(.85+.2*math.sin(i*3));tube('exposed root',[(0,0,.42),(math.cos(a)*length*.55,math.sin(a)*length*.55,.17),(math.cos(a)*length,math.sin(a)*length,.035)],[radius*.21,radius*.14,.025],mat,sides=6)
  if kind=='tree-broadleaf':
   roots(1.15);tube('branching oak trunk',[(0,0,.1),(-.08,.02,1.2),(.13,.06,2.65),(0,.05,3.8),(.2,.1,4.85)],[.45,.35,.29,.18,.05])
   crowns=[(-1.9,-.55,4.35,1.28),(-1.8,.95,4.8,1.25),(-.2,1.6,5.35,1.4),(1.55,1.1,5.05,1.35),(1.9,-.55,4.6,1.3),(.2,-1.5,4.65,1.3),(-.4,-.15,6.0,1.65),(.6,.55,6.1,1.35)]
   for i,(x,y,z,r) in enumerate(crowns):
    tube('swept oak limb',[(.05,.05,2.1+i%3*.3),(x*.5,y*.5,z-.9),(x,y,z-.05)],[.19,.12,.035],'barkLight' if i%3==0 else 'bark')
    lump('scalloped oak foliage',(x,y,z),(r,r*.85,r*.72),detail=2 if lod==0 else 1)
    if lod==0:
     for j in range(4):
      a=j*math.tau/4+i;px=x+math.cos(a)*r*.7;py=y+math.sin(a)*r*.62;pz=z+r*.2*math.sin(j*2);lump('leaf cluster lobe',(px,py,pz),(r*.53,r*.46,r*.4),['leaf','leafLight','leafDark'][j%3])
     for ring,v in enumerate([-.35,.15,.7]):
      for j in range(8):
       a=j*math.tau/8+ring*.35+i*.4;rr=math.sqrt(1-v*v);normal=(math.cos(a)*rr,math.sin(a)*rr,v)
       pos=(x+normal[0]*r*.96,y+normal[1]*r*.83,z+normal[2]*r*.76)
       leaf(pos,a,r*.43,'leafLight' if (j+ring)%3==0 else 'leaf',normal)
  elif kind=='tree-pine':
   roots(.75);tube('tapered pine trunk',[(0,0,.05),(.04,.02,2.2),(-.04,0,4.4),(0,.02,6.5),(0,0,7.6)],[.29,.21,.13,.06,.01])
   for layer in range(5):
    z=1.75+layer*1.05;r=2.1-layer*.34;height=1.8 if layer<4 else 1.65;sides=28 if lod==0 else 12;verts=[]
    for ring,(progress,rad) in enumerate([(0,.7),(.16,1),(.5,.65),(1,.025)]):
     for j in range(sides):
      a=j*math.tau/sides;wave=1+.13*math.cos(a*7+layer*.8);verts.append((math.cos(a)*r*rad*wave,math.sin(a)*r*rad*wave,z+height*progress+.09*math.cos(a*7+layer)*rad))
    faces=[]
    for ring in range(3):
     for j in range(sides):faces.append((ring*sides+j,ring*sides+(j+1)%sides,(ring+1)*sides+(j+1)%sides,(ring+1)*sides+j))
    faces.extend([tuple(range(sides-1,-1,-1)),tuple(3*sides+j for j in range(sides))]);mesh('layered scalloped pine boughs',verts,faces,'pine' if layer%2==0 else 'pineLight','canopy',True)
    if lod==0:
     for j in range(7):
      a=j*math.tau/7+layer*.17;tube('pine branch',[(0,0,z+.6),(math.cos(a)*r*.65,math.sin(a)*r*.65,z+.2)],[.045,.008])
      leaf((math.cos(a)*r*.65,math.sin(a)*r*.65,z+.55),a,r*.35,'pineLight')
  elif kind=='tree-birch':
   roots(.7,'birch')
   knots=[(0,0,.05),(-.12,.03,1.4),(.13,0,3.0),(.03,.03,4.6),(.25,.06,6.55)];radii=[.27,.22,.17,.1,.025]
   path=[];widths=[]
   for i in range(29 if lod==0 else 17):
    z=.05+i*6.5/(28 if lod==0 else 16);k=next((k for k in range(4) if z<=knots[k+1][2]),3);t=(z-knots[k][2])/(knots[k+1][2]-knots[k][2]);path.append(tuple(Vector(knots[k]).lerp(Vector(knots[k+1]),t)));widths.append(radii[k]*(1-t)+radii[k+1]*t)
   trunk=tube('white birch trunk',path,widths,'birch');trunk.data.materials.append(mats['birchMark']);sides=10 if lod==0 else 6
   for face in trunk.data.polygons:
    if face.index<2:continue
    ring=(face.index-2)//sides;section=(face.index-2)%sides
    if ring%3==1 and (section+ring*2)%sides<max(1,sides//3):face.material_index=1
   crowns=[(-1.6,-.4,3.9,1.0),(1.65,-.25,4.4,1.1),(-1.6,.65,5.05,.95),(1.3,.8,5.7,1.05),(-.55,-.7,5.8,1.05),(.15,.1,6.6,1.0)]
   for i,(x,y,z,r) in enumerate(crowns):
    tube('slender birch fork',[(0,0,2.25+i*.31),(x*.55,y*.55,z-.9),(x,y,z)],[.095,.055,.015],'birch')
    for j in range(2 if lod else 4):
     a=j*2.2+i;pos=(x+math.cos(a)*r*.4,y+math.sin(a)*r*.4,z+math.sin(j*2)*.18);lump('airy birch leaf cluster',pos,(r*.7,r*.62,r*.65),'leafLight' if j%2 else 'leaf',detail=2 if lod==0 and j==0 else 1)
     if lod==0:
      for ring,v in enumerate([-.2,.65]):
       for k in range(5):
        a=k*math.tau/5+j*.7;rr=math.sqrt(1-v*v);normal=(math.cos(a)*rr,math.sin(a)*rr,v);center=(pos[0]+normal[0]*r*.72,pos[1]+normal[1]*r*.65,pos[2]+normal[2]*r*.72)
        leaf(center,a,r*.3,'leafLight' if (k+j)%3 else 'leaf',normal)
  else:
   boulders=[((-.12,.1,.82),(.78,.65,.83)),((-.65,-.2,.39),(.6,.52,.4)),((.6,.05,.4),(.58,.57,.43)),((.08,-.55,.28),(.68,.42,.31)),((.35,.49,.44),(.5,.43,.47))]
   for i,(pos,scale) in enumerate(boulders):
    o=lump('irregular ore boulder',pos,scale,'stone','stone',detail=3 if lod==0 else 1,deform=.12,smooth=False)
    for material in ['stoneLight','stoneDark','rust','copper','iron']:o.data.materials.append(mats[material])
    for face in o.data.polygons:
     co=face.center if face.center.length else sum((o.data.vertices[n].co for n in face.vertices),Vector())/len(face.vertices)
     stripe=abs(co.x/scale[0]+.38*co.z/scale[2]-.18*math.sin(co.z/scale[2]*5+i))
     if kind=='node-metal' and stripe<.26:face.material_index=3 if face.index%3 else 4
     elif kind=='node-metal' and face.index%9==0:face.material_index=5
     else:face.material_index=1 if face.normal.z>.45 else 2 if face.normal.z<-.2 else 0
   if kind=='node-sulfur':
    chunks=[((-.18,.05,1.52),(.38,.31,.3)),((-.12,-.57,.95),(.48,.29,.39)),((.55,-.38,1.08),(.3,.27,.3)),((-.7,-.33,.78),(.29,.24,.24)),((.53,-.49,.3),(.25,.21,.2)),((-.48,-.62,.23),(.27,.2,.23))]
    for i,(pos,scale) in enumerate(chunks if lod==0 else chunks[:3]):
     o=lump('embedded sulfur deposit',pos,scale,'sulfur','mineral',detail=2 if lod==0 else 1,deform=.15,smooth=False);o.data.materials.append(mats['sulfurLight']);o.data.materials.append(mats['sulfurDark'])
     for face in o.data.polygons:face.material_index=1 if face.normal.z>.25 else 2 if face.index%5==0 else 0
  # Bake positions to real coordinates, normalize the bottom to z=0, batch by role/material.
  bpy.context.view_layer.update();bottom=min((o.matrix_world@v.co).z for o in objects for v in o.data.vertices)
  for o in objects:o.location.z-=bottom
  bpy.context.view_layer.update()
  root=bpy.data.objects.new(kind+(f'-lod{lod}' if lod else ''),None);bpy.context.collection.objects.link(root);root['assetKind']='tree' if kind.startswith('tree') else 'resource-node';root['resource']='wood' if kind.startswith('tree') else kind[5:];root['sourceReference']=str(REF);root['sourceSHA256']=REF_HASH;root['lod']=lod;root['units']='metres';merged=[]
  for role in sorted({o['part'] for o in objects}):
   group=[o for o in list(bpy.context.scene.objects) if o.type=='MESH' and o.get('part')==role];bpy.ops.object.select_all(action='DESELECT')
   for o in group:o.select_set(True)
   bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();o=bpy.context.object;o.name=kind+'-'+role;o['part']=role;o.parent=root;merged.append(o)
  bpy.context.view_layer.update();points=[o.matrix_world@v.co for o in merged for v in o.data.vertices];lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)));size=hi-lo
  root['collisionType']='capsule' if kind.startswith('tree') else 'box';root['collisionRadius']=.4 if kind=='tree-broadleaf' else .28 if kind.startswith('tree') else max(size.x,size.y)/2
  root['collisionHeight']=2.8 if kind.startswith('tree') else size.z
  bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
  for o in merged:o.select_set(True)
  filename=kind+(f'-lod{lod}' if lod else '')+'.glb';bpy.ops.export_scene.gltf(filepath=str(OUT/filename),export_format='GLB',use_selection=True,export_extras=True)
  triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in merged);draws=sum(len({p.material_index for p in o.data.polygons}) for o in merged)
  REPORT.append({'id':kind,'lod':lod,'file':filename,'triangles':triangles,'drawCalls':draws,'sizeMetres':{'x':round(size.x,3),'y':round(size.z,3),'z':round(size.y,3)},'bytes':(OUT/filename).stat().st_size})
  if lod:continue
  # Pack the corresponding reference image into the editable Blender source as a non-rendering guide.
  image=bpy.data.images.load(str(Path('apps/client/static/assets/nature-sprites')/(kind+'.png')));image.pack();guide=bpy.data.objects.new('REFERENCE - '+kind,None);bpy.context.collection.objects.link(guide);guide.empty_display_type='IMAGE';guide.data=image;guide.empty_display_size=4;guide.location=(size.x+1,0,size.z/2);guide.hide_render=True
  scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=False;scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='AgX';scene.world=bpy.data.worlds.new('soft studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.35,.43,.5,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
  target=(lo+hi)/2;bpy.ops.object.camera_add(location=target+Vector((8,-12,7)));cam=bpy.context.object;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';scene.camera=cam;inv=cam.rotation_euler.to_matrix().transposed();projected=[inv@(p-target) for p in points];cam.data.ortho_scale=max(max(p.x for p in projected)-min(p.x for p in projected),max(p.y for p in projected)-min(p.y for p in projected))*1.18
  for delta,power,light_size in [((4,-5,10),1600,7),((-5,-1,7),900,6),((2,6,9),1300,5)]:
   bpy.ops.object.light_add(type='AREA',location=target+Vector(delta));light=bpy.context.object;light.data.energy=power*.7;light.data.shape='DISK';light.data.size=light_size;light.rotation_euler=(target-light.location).to_track_quat('-Z','Y').to_euler()
  scene.render.filepath=str(ROOT/'renders'/(kind+'.png'));bpy.ops.render.render(write_still=True);bpy.ops.wm.save_as_mainfile(filepath=str((ROOT/(kind+'.blend')).resolve()),compress=True)
(ROOT/'report.json').write_text(json.dumps(REPORT,indent=2)+'\n');(OUT/'manifest.json').write_text(json.dumps({'sourceReference':str(REF),'sourceSHA256':REF_HASH,'units':'metres','models':REPORT},indent=2)+'\n');print(json.dumps(REPORT))
