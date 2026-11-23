"""Build the two image-referenced flat-lid player chests, grounded and sized in meters."""
import bpy,bmesh,json,hashlib
from pathlib import Path
from mathutils import Vector
OUT=Path('apps/client/static/assets/player-storage');SRC=Path('art/models/player-storage');REPORT=[]
for size,w,d,h in [('small',1,.8,.8),('large',1.8,1,.95)]:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0;parts=[]
 ref=Path(f'art/ai/player-storage/chest-{size}-reference.png')
 def mat(name,hex,metal=0):
  m=bpy.data.materials.new(name);m.use_nodes=True;m.use_backface_culling=True;n=m.node_tree.nodes.get('Principled BSDF');srgb=[int(hex[i:i+2],16)/255 for i in (0,2,4)];rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in srgb];n.inputs['Base Color'].default_value=(*rgb,1);n.inputs['Roughness'].default_value=.31;n.inputs['Metallic'].default_value=metal;n.inputs['Coat Weight'].default_value=.3;return m
 wood=[mat('amber plank '+str(i),c) for i,c in enumerate(['BD5F17','D87821','E08A2B'])];iron=mat('charcoal steel straps','393A45',.35);edge=mat('soft silver fittings','A2A0A2',.6);dark=mat('plank seams','512D19')
 def box(name,x,y,z,sx,sy,sz,m,bevel=.012):
  bpy.ops.mesh.primitive_cube_add(size=1,location=(x,y,z));o=bpy.context.object;o.name=name;o.dimensions=(sx,sy,sz);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
  if bevel:mod=o.modifiers.new('rounded cartoon edges','BEVEL');mod.width=min(bevel,min(sx,sy,sz)*.3);mod.segments=2;o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
  parts.append(o);return o
 # All fittings stay within the exact collision envelope. Lid upper surface is flat.
 box('dark inner body',0,0,h*.45,w-.05,d-.05,h*.86,dark)
 for row in range(4):
  z=.055+(h*.73/4)*(row+.5);rh=h*.73/4-.008
  for y in [-d/2+.028,d/2-.028]:box('front back amber plank',0,y,z,w-.06,.045,rh,wood[row%3])
  for x in [-w/2+.028,w/2-.028]:box('side amber plank',x,0,z,.045,d-.09,rh,wood[(row+1)%3])
 box('flat lid rim',0,0,h-.095,w-.025,d-.025,.15,wood[0],.016)
 for row in range(4):box('flat lid plank',0,-d*.375+row*d*.25,h-.034,w-.03,d*.25-.008,.038,wood[(row+1)%3],.007)
 bands=[-w*.29,w*.29] if size=='small' else [-w*.35,0,w*.35]
 for x in bands:
  box('level lid strap',x,0,h-.009,.075,d-.025,.018,iron,.005)
  for y in [-d/2+.013,d/2-.013]:
   box('vertical iron strap',x,y,h*.47,.075,.026,h*.86,iron,.009)
   for z in [.12,h*.53,h-.11]:box('silver strap rivet',x,y+(-.014 if y<0 else .014),z,.025,.012,.025,edge,.006)
 for x in [-w/2+.045,w/2-.045]:
  for y in [-d/2+.045,d/2-.045]:
   for z in [.055,h-.055]:box('corner reinforcement',x,y,z,.09,.09,.11,iron,.014)
 # A single silver front latch, outside the center strap on the large chest.
 box('latch backing plate',0,-d/2+.01,h*.65,.16,.02,.14,iron,.01)
 box('silver front latch',0,-d/2+.001,h*.62,.075,.018,.18,edge,.012)
 box('latch pin',0,-d/2+.001,h*.58,.095,.018,.027,iron,.006)
 if size=='large':
  for x in [-w/2+.013,w/2-.013]:
   box('recessed side handle backing',x,0,h*.52,.018,.20,.14,iron,.014)
   for y in [-.075,.075]:box('side handle edge',x+(-.007 if x<0 else .007),y,h*.52,.012,.025,.1,edge,.006)
   box('side handle bar',x+(-.007 if x<0 else .007),0,h*.56,.012,.17,.025,edge,.006)
 # Apply modifiers and batch by material for instancing in the existing renderer.
 for o in parts:
  bpy.context.view_layer.objects.active=o
  for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 root=bpy.data.objects.new(f'chest-{size}',None);bpy.context.collection.objects.link(root);root['sourceReference']=str(ref);root['sourceSHA256']=hashlib.sha256(ref.read_bytes()).hexdigest();root['storageSize']=size
 for m in list(bpy.data.materials):
  group=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials[0]==m]
  if not group:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in group:o.select_set(True)
  bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();o=bpy.context.object;o.parent=root
 bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=root
 bpy.ops.export_scene.gltf(filepath=str(OUT/f'chest-{size}.glb'),export_format='GLB',export_extras=True,use_selection=True)
 bpy.ops.wm.save_as_mainfile(filepath=str(SRC/f'chest-{size}.blend'))
 triangles=sum(len(p.vertices)-2 for o in bpy.context.scene.objects if o.type=='MESH' for p in o.data.polygons)
 REPORT.append({'size':size,'width':w,'depth':d,'height':h,'triangles':triangles,'reference':str(ref),'sourceSHA256':root['sourceSHA256'],'glbBytes':(OUT/f'chest-{size}.glb').stat().st_size})
(OUT/'manifest.json').write_text(json.dumps(REPORT,indent=2)+'\n')
