"""Reference-matched, fully volumetric inventory/drop resources. No world-node imports.
Front silhouettes and original painted detail come from the approved corrected sheet.
"""
import bpy,bmesh,math,json,hashlib,os
from pathlib import Path
from mathutils import Vector
ROOT=Path('art/models/resource-items');OUT=Path('apps/client/static/assets/resource-items');REF=Path('art/ai/resource-items/resource-items.png');REPORT=[]
for folder in [ROOT,OUT,ROOT/'renders']:folder.mkdir(parents=True,exist_ok=True)
ROCKS={
'rock':[
[(805,368),(804,294),(821,246),(863,215),(914,181),(952,144),(979,134),(1041,136),(1087,158),(1101,201),(1136,225),(1151,268),(1153,347),(1132,399),(1075,455),(990,463),(915,429),(855,415)],
[(689,492),(696,447),(727,409),(775,373),(813,350),(845,358),(889,393),(915,427),(935,468),(912,512),(883,546),(837,560),(772,559),(720,552),(699,532)],
[(866,548),(883,508),(914,463),(940,422),(960,376),(983,343),(1015,327),(1042,334),(1080,354),(1147,372),(1182,397),(1203,437),(1217,486),(1214,533),(1187,561),(1150,579),(1108,592),(1046,598),(983,593),(922,578),(886,566)]],
'sulfur':[
[(218,884),(218,821),(235,776),(271,752),(309,718),(350,707),(379,695),(400,693),(424,735),(452,753),(462,787),(467,828),(495,862),(485,908),(438,950),(365,965),(300,953),(254,928)],
[(107,1048),(111,1010),(106,977),(120,946),(139,923),(176,907),(204,882),(235,883),(275,913),(307,945),(319,980),(312,1010),(293,1050),(266,1079),(220,1091),(176,1080),(143,1069)],
[(283,1086),(284,1046),(315,1007),(327,965),(354,916),(390,893),(427,865),(460,848),(486,863),(511,893),(543,920),(565,955),(576,993),(563,1045),(535,1078),(495,1101),(448,1118),(388,1127),(342,1113)]],
'metal':[
[(820,901),(806,850),(818,812),(844,786),(871,753),(899,717),(931,708),(969,698),(1007,692),(1032,709),(1055,740),(1091,754),(1121,784),(1132,819),(1137,850),(1170,855),(1194,876),(1199,910),(1178,946),(1134,977),(1055,989),(958,973),(870,943)],
[(687,1049),(693,1010),(708,973),(740,944),(785,924),(808,894),(836,870),(875,870),(913,891),(940,922),(959,951),(975,982),(965,1014),(941,1053),(906,1082),(861,1096),(810,1095),(755,1078),(711,1072)],
[(888,1103),(905,1063),(915,1023),(930,992),(960,960),(996,943),(1030,919),(1061,910),(1090,910),(1122,927),(1155,941),(1184,960),(1204,995),(1213,1037),(1194,1066),(1162,1091),(1121,1111),(1075,1128),(1017,1125),(954,1115)]]}
BOUNDS={'wood':(90,130,636,589),'rock':(687,130,1221,601),'sulfur':(104,688,587,1130),'metal':(686,690,1220,1130)}
# Extract unmodified quadrants through Blender's image API; preserve original art.
bpy.ops.wm.read_factory_settings(use_empty=True);source=bpy.data.images.load(str(REF.resolve()));pixels=list(source.pixels);sheetw,sheeth=source.size[:];textures={}
for kind,(ox,oy) in zip(['wood','rock','sulfur','metal'],[(0,0),(654,0),(0,601),(654,601)]):
 image=bpy.data.images.new('reference-'+kind,width=654,height=601,alpha=True);data=[]
 for row in range(601):
  start=((sheeth-oy-601+row)*sheetw+ox)*4;data.extend(pixels[start:start+654*4])
 image.pixels=data;image.filepath_raw=str((ROOT/(kind+'-color.png')).resolve());image.file_format='PNG';image.save();textures[kind]=(image.filepath_raw,ox,oy)
for kind in ([os.environ['RESOURCE_ITEM']] if os.environ.get('RESOURCE_ITEM') else ['wood','rock','sulfur','metal']):
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0;parts=[]
 texturePath,ox,oy=textures[kind];image=bpy.data.images.load(texturePath);image.pack()
 material=bpy.data.materials.new(kind+'-reference-finish');material.use_nodes=True;shader=material.node_tree.nodes.get('Principled BSDF');tex=material.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;tex.extension='EXTEND';material.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color']);shader.inputs['Roughness'].default_value=.65;shader.inputs['Coat Weight'].default_value=0;shader.inputs['Specular IOR Level'].default_value=0;material.node_tree.links.new(tex.outputs['Color'],shader.inputs['Emission Color']);shader.inputs['Emission Strength'].default_value=.08
 left,top,right,bottom=BOUNDS[kind];scale=.70/(right-left);center=(left+right)/2
 def point(px,py,depth):return ((px-center)*scale,depth,(bottom-py)*scale)
 def mesh(name,vs,fs,smooth=False,anchor=None):
  # Keep generated volume inside the approved opaque silhouette, including
  # the bold outline. This removes guessed cylinder bulges at log ends.
  anchor=anchor or (center,(top+bottom)/2)
  def alpha(px,py):
   x=int(round(px));y=int(round(py))
   return pixels[((sheeth-1-y)*sheetw+x)*4+3] if 0<=x<sheetw and 0<=y<sheeth else 0
  snapped=[]
  for x,y,z in vs:
   px=x/scale+center;py=bottom-z/scale
   if alpha(px,py)<.85:
    low=0.;high=1.
    for iteration in range(18):
     t=(low+high)/2;xx=px+(anchor[0]-px)*t;yy=py+(anchor[1]-py)*t
     if alpha(xx,yy)>=.85:high=t
     else:low=t
    px+=(anchor[0]-px)*high;py+=(anchor[1]-py)*high
    x=(px-center)*scale;z=(bottom-py)*scale
   snapped.append((x,y,z))
  vs[:]=snapped
  data=bpy.data.meshes.new(name);data.from_pydata(vs,[],fs);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(material)
  uv=o.data.uv_layers.new(name='approved reference projection')
  for loop in o.data.loops:
   p=o.data.vertices[loop.vertex_index].co;px=p.x/scale+center;py=bottom-p.z/scale;uv.data[loop.index].uv=((px-ox)/654,1-(py-oy)/601)
  for f in o.data.polygons:f.use_smooth=smooth
  parts.append(o);return o
 if kind=='wood':
  # Three actual solid logs. End-cap planes are perpendicular to each 3D axis;
  # their ellipse projection follows the cut end grain in the reference.
  logs=[((266,320),(449,221),83,99,.02,.36),((183,471),(402,368),81,91,-.13,.35),((369,490),(554,388),91,91,-.18,.35)]
  for index,(front,back,rx,rz,depth,length) in enumerate(logs):
   a=Vector(point(*front,depth));b=Vector(point(*back,depth+length));axis=b-a;vs=[];sides=32;rings=7
   for ring in range(rings):
    t=ring/(rings-1);c=a.lerp(b,t);taper=1-.045*t+.035*math.sin(t*math.pi)
    for j in range(sides):
     angle=j*math.tau/sides;irregular=1+.018*math.sin(j*2.9+index);dx=rx*scale*math.cos(angle)*taper*irregular;dz=rz*scale*math.sin(angle)*taper*irregular;dy=-(axis.x*dx+axis.z*dz)/axis.y;vs.append(tuple(c+Vector((dx,dy,dz))))
   fs=[tuple(range(sides-1,-1,-1)),tuple((rings-1)*sides+j for j in range(sides))]
   for ring in range(rings-1):
    for j in range(sides):a1=ring*sides+j;b1=ring*sides+(j+1)%sides;fs.append((a1,b1,b1+sides,a1+sides))
   o=mesh('solid cut log '+str(index+1),vs,fs,True,((front[0]+back[0])/2,(front[1]+back[1])/2))
   bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
   o.data.polygons[0].use_smooth=False;o.data.polygons[1].use_smooth=False
   for li in o.data.polygons[1].loop_indices:
    v=o.data.loops[li].vertex_index%sides;p=Vector(vs[v]);px=p.x/scale+center;py=bottom-p.z/scale;o.data.uv_layers[0].data[li].uv=((px-ox)/654,1-(py-oy)/601)
   # Blend original front detail into a clean bark wrap on hidden flanks.
   # Color blending is baked; no hard per-face UV changes survive export.
   wrap=o.data.uv_layers.new(name='Bark wrap');weight=o.data.color_attributes.new(name='Bark weight',type='FLOAT_COLOR',domain='CORNER')
   def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
   for face in o.data.polygons:
    for li in face.loop_indices:
     vi=o.data.loops[li].vertex_index;t=(vi//sides)/(rings-1);u=(1+math.sin((vi%sides)*math.tau/sides))*.5
     px=352+143*t+.386*(u-.5)*90;py=280-60*t+.922*(u-.5)*90
     wrap.data[li].uv=((px-ox)/654,1-(py-oy)/601)
     offset=vs[vi][1]-(depth+length*t);factor=smooth((offset+.025)/.07)
     ppx=vs[vi][0]/scale+center;ppy=bottom-vs[vi][2]/scale
     for other,(lf,lb,rrx,rrz,dep,leng) in enumerate(logs):
      if other==index:continue
      distance=math.sqrt(((ppx-lf[0])/rrx)**2+((ppy-lf[1])/rrz)**2);factor=max(factor,1-smooth((distance-.75)/.4))
     if face.index<2:factor=0
     weight.data[li].color=(factor,factor,factor,1)
   # Separate atlas slots keep all three logs in one embedded texture.
   o.data.uv_layers.new(name='Baked atlas');o.data.uv_layers.active_index=2
   bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.025);bpy.ops.object.mode_set(mode='OBJECT')
   for uv in o.data.uv_layers[2].data:uv.uv.x=(uv.uv.x+index)/3
  # Restore the explicit projection after the UV operator, using fresh layer
  # references (adding CustomData layers invalidates Blender array handles).
  for logIndex,o in enumerate(parts):
   projection=o.data.uv_layers['approved reference projection'];wrap=o.data.uv_layers['Bark wrap'];weight=o.data.color_attributes['Bark weight'];dep=logs[logIndex][4];leng=logs[logIndex][5]
   for face in o.data.polygons:
    for li in face.loop_indices:
     vi=o.data.loops[li].vertex_index
     p=o.data.vertices[vi%sides if face.index==1 else vi].co
     px=p.x/scale+center;py=bottom-p.z/scale;projection.data[li].uv=((px-ox)/654,1-(py-oy)/601)
     t=(vi//sides)/(rings-1);u=(1+math.sin((vi%sides)*math.tau/sides))*.5
     wx=352+143*t+.386*(u-.5)*90;wy=280-60*t+.922*(u-.5)*90;wrap.data[li].uv=((wx-ox)/654,1-(wy-oy)/601)
     v=o.data.vertices[vi].co;factor=smooth((v.y-(dep+leng*t)+.025)/.07);px=v.x/scale+center;py=bottom-v.z/scale
     for other,(lf,lb,rrx,rrz,dd,ll) in enumerate(logs):
      if other==logIndex:continue
      distance=math.sqrt(((px-lf[0])/rrx)**2+((py-lf[1])/rrz)**2);factor=max(factor,1-smooth((distance-.75)/.4))
     if face.index<2:factor=0
     weight.data[li].color=(factor,factor,factor,1)
  nodes=material.node_tree.nodes;links=material.node_tree.links
  uvFront=nodes.new('ShaderNodeUVMap');uvFront.uv_map='approved reference projection';links.new(uvFront.outputs['UV'],tex.inputs['Vector'])
  uvBark=nodes.new('ShaderNodeUVMap');uvBark.uv_map='Bark wrap';bark=nodes.new('ShaderNodeTexImage');bark.image=image;links.new(uvBark.outputs['UV'],bark.inputs['Vector'])
  attribute=nodes.new('ShaderNodeVertexColor');attribute.layer_name='Bark weight';mix=nodes.new('ShaderNodeMixRGB');links.new(attribute.outputs['Color'],mix.inputs[0]);links.new(tex.outputs['Color'],mix.inputs[1]);links.new(bark.outputs['Color'],mix.inputs[2])
  emission=nodes.new('ShaderNodeEmission');links.new(mix.outputs[0],emission.inputs[0]);links.new(emission.outputs[0],nodes.get('Material Output').inputs['Surface'])
  atlas=bpy.data.images.new('wood cylindrical atlas',width=2048,height=1024,alpha=True);targetNode=nodes.new('ShaderNodeTexImage');targetNode.image=atlas;nodes.active=targetNode
  bpy.ops.object.select_all(action='DESELECT')
  for o in parts:o.select_set(True);o.data.uv_layers.active_index=2;o.data.uv_layers[2].active_render=True
  bpy.context.view_layer.objects.active=parts[0];bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.samples=1;bpy.ops.object.bake(type='EMIT',margin=8,use_clear=False)
  atlas.filepath_raw=str((ROOT/'wood-atlas.png').resolve());atlas.file_format='PNG';atlas.save();atlas=bpy.data.images.load(atlas.filepath_raw);atlas.pack()
  material=bpy.data.materials.new('wood-baked-reference-finish');material.use_nodes=True;n=material.node_tree.nodes.get('Principled BSDF');n.inputs['Roughness'].default_value=.65;n.inputs['Specular IOR Level'].default_value=0;n.inputs['Emission Strength'].default_value=.08;texture=material.node_tree.nodes.new('ShaderNodeTexImage');texture.image=atlas;coord=material.node_tree.nodes.new('ShaderNodeUVMap');coord.uv_map='Baked atlas';material.node_tree.links.new(coord.outputs[0],texture.inputs[0]);material.node_tree.links.new(texture.outputs['Color'],n.inputs['Base Color']);material.node_tree.links.new(texture.outputs['Color'],n.inputs['Emission Color'])
  for o in parts:
   o.data.materials.clear();o.data.materials.append(material)
   if o.data.color_attributes.get('Bark weight'):o.data.color_attributes.remove(o.data.color_attributes['Bark weight'])
 else:
  for index,outline in enumerate(ROCKS[kind]):
   cx=sum(p[0] for p in outline)/len(outline);cy=sum(p[1] for p in outline)/len(outline);n=len(outline);depth=.36 if index==0 else .29;front=.04 if index==0 else -.19 if index==1 else -.23;vs=[]
   for factor,d in [(.55,front),(.86,front+depth*.15),(1,front+depth*.4),(.86,front+depth*.8),(.45,front+depth)]:
    for px,py in outline:vs.append(point(cx+(px-cx)*factor,cy+(py-cy)*factor,d))
   vs.extend([point(cx,cy,front-.015),point(cx,cy,front+depth+.015)]);fs=[]
   for j in range(n):fs.extend([(5*n,j,(j+1)%n),(5*n+1,4*n+(j+1)%n,4*n+j)])
   for ring in range(4):
    for j in range(n):a=ring*n+j;b=ring*n+(j+1)%n;fs.extend([(a,b,b+n),(a,b+n,a+n)])
   mesh('traced mineral chunk '+str(index+1),vs,fs,False,(cx,cy))
 # Make every closed volume outward-facing for Three.js single-sided PBR.
 for o in ([] if kind=='wood' else parts):
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
 # Move geometry to ground level, retaining projection UVs.
 floor=min(v.co.z for o in parts for v in o.data.vertices)
 for o in parts:
  for v in o.data.vertices:v.co.z-=floor
 root=bpy.data.objects.new('item-'+kind,None);bpy.context.collection.objects.link(root)
 root['itemResource']=kind;root['sourceReference']=str(REF);root['sourceSHA256']=hashlib.sha256(REF.read_bytes()).hexdigest();root['units']='metres';root['origin']='ground center';root['chunkCount']=3
 for o in parts:o.parent=root
 bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
 for o in parts:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/('item-'+kind+'.glb')),export_format='GLB',use_selection=True,export_extras=True,export_yup=True)
 points=[o.matrix_world@Vector(c) for o in parts for c in o.bound_box];lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)));size=hi-lo;triangles=sum(sum(len(f.vertices)-2 for f in o.data.polygons) for o in parts)
 REPORT.append({'id':kind,'file':'item-'+kind+'.glb','sourceSHA256':root['sourceSHA256'],'triangles':triangles,'materialMeshes':3,'sizeMetres':{'x':round(size.x,4),'y':round(size.z,4),'z':round(size.y,4)},'bytes':(OUT/('item-'+kind+'.glb')).stat().st_size})
 guide=bpy.data.objects.new('APPROVED IMAGE - '+kind,None);bpy.context.collection.objects.link(guide);guide.empty_display_type='IMAGE';guide.data=image;guide.empty_display_size=.8;guide.location=(1,0,.4);guide.hide_render=True
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=False;scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='Standard';scene.world=bpy.data.worlds.new('soft studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(1,1,1,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.85
 target=Vector((0,0,size.z/2));bpy.ops.object.camera_add(location=(0,-3,target.z));cam=bpy.context.object;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=max(size.x,size.z)*1.18;scene.camera=cam
 for delta,power,lightSize in [((-1,-2,2),40,3),((2,1,2),25,3)]:
  bpy.ops.object.light_add(type='AREA',location=target+Vector(delta));light=bpy.context.object;light.data.energy=power;light.data.size=lightSize;light.rotation_euler=(target-light.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(ROOT/'renders'/('item-'+kind+'.png'));bpy.ops.render.render(write_still=True)
 cam.location=target+Vector((1.6,-3,1.4));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=max(size.x,size.y,size.z)*1.32;scene.render.filepath=str(ROOT/'renders'/('item-'+kind+'-angle.png'));bpy.ops.render.render(write_still=True)
 cam.location=(0,-3,target.z);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();bpy.ops.wm.save_as_mainfile(filepath=str((ROOT/('item-'+kind+'.blend')).resolve()),compress=True)
if os.environ.get('RESOURCE_ITEM') and (OUT/'manifest.json').exists():
 old={m['id']:m for m in json.loads((OUT/'manifest.json').read_text())['models']};old.update({m['id']:m for m in REPORT});REPORT=[old[k] for k in ['wood','rock','sulfur','metal']]
(OUT/'manifest.json').write_text(json.dumps({'sourceReference':str(REF),'sourceSHA256':hashlib.sha256(REF.read_bytes()).hexdigest(),'units':'metres','models':REPORT},indent=2)+'\n');print(json.dumps(REPORT))
