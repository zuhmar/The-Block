"""Build original, closed-volume glossy ammunition matching the approved six-icon sheet.
Run from repository root: blender -b -t 4 --python-exit-code 1 --python packages/art-tools/build-ammo.py
"""
import bpy,math,json,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path('art/models/ammo');OUT=Path('apps/client/static/assets/ammo');REF=Path('art/ai/ammo/reference.png')
ROOT.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
REPORT=[]
def material(name,color,metal=.2):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Roughness'].default_value=.26;n.inputs['Metallic'].default_value=metal;n.inputs['Coat Weight'].default_value=.35
 image=bpy.data.images.new(name+' painted finish',width=32,height=32);rgb=[int(color[i:i+2],16)/255 for i in (0,2,4)];image.pixels=[*rgb,1]*1024;image.filepath_raw=str((ROOT/(name+'.png')).resolve());image.file_format='PNG';image.save();image.pack();tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;m.node_tree.links.new(tex.outputs['Color'],n.inputs['Base Color']);return m
for kind in ['pistol','smg','rifle','sniper','lmg','rockets']:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
 brass=material('warm brass','DE991E',.45);copper=material('copper bullet','BD582B',.28);dark=material('charcoal steel','393338',.25);olive=material('olive rocket','78813B',.15);orange=material('orange band','F39A19',.1)
 root=bpy.data.objects.new('ammo-'+kind,None);bpy.context.collection.objects.link(root);root['ammoKind']=kind;root['sourceReference']=str(REF);root['sourceSHA256']=hashlib.sha256(REF.read_bytes()).hexdigest();root['units']='metres';parts=[]
 def lathe(name,profile,mat,x=0,y=0,segments=32,parent=root):
  # Full revolution with explicit end caps; Z up in Blender, Y up in GLB.
  vs=[(x+r*math.cos(j*math.tau/segments),y+r*math.sin(j*math.tau/segments),z)for r,z in profile for j in range(segments)];fs=[]
  for i in range(len(profile)-1):
   for j in range(segments):a=i*segments+j;b=i*segments+(j+1)%segments;fs.append((a,b,b+segments,a+segments))
  fs.extend([tuple(range(segments-1,-1,-1)),tuple((len(profile)-1)*segments+j for j in range(segments))]);mesh=bpy.data.meshes.new(name);mesh.from_pydata(vs,[],fs);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(mat);o.parent=parent
  for p in mesh.polygons:p.use_smooth=len(p.vertices)==4
  # Cylindrical UVs, also valid for later hand painting.
  uv=mesh.uv_layers.new(name='cylindrical texture');height=max(z for r,z in profile)-min(z for r,z in profile)
  for loop in mesh.loops:
   vi=loop.vertex_index;uv.data[loop.index].uv=(vi%segments/segments,(profile[vi//segments][1]-profile[0][1])/max(.001,height))
  parts.append(o);return o
 def box(name,loc,scale,mat,bevel=.008):
  bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat);o.parent=root;mod=o.modifiers.new('rounded cartoon edges','BEVEL');mod.width=bevel;mod.segments=3;norm=o.modifiers.new('weighted smooth normals','WEIGHTED_NORMAL');parts.append(o);return o
 if kind=='rockets':
  lathe('olive rocket body',[(.045,0),(.054,.04),(.054,.18),(.09,.23),(.108,.36),(.10,.55),(.08,.61)],olive)
  lathe('dark pointed nose',[(.08,.61),(.075,.67),(.052,.75),(.008,.86),(.001,.87)],dark)
  lathe('orange identification band',[(.106,.46),(.106,.51)],orange)
  for i in range(4):
   a=i*math.pi/2;vs=[(.045,-.008,.03),(.17,-.008,.01),(.17,-.008,.13),(.053,-.008,.24),(.045,.008,.03),(.17,.008,.01),(.17,.008,.13),(.053,.008,.24)];vs=[(x*math.cos(a)-y*math.sin(a),x*math.sin(a)+y*math.cos(a),z)for x,y,z in vs];mesh=bpy.data.meshes.new('fin');mesh.from_pydata(vs,[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]);o=bpy.data.objects.new('dark tail fin',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(dark);o.parent=root;parts.append(o)
 else:
  short=kind in ['pistol','smg'];height=.43 if short else .66 if kind in ['rifle','lmg'] else .86;radius=.085 if short else .075 if kind=='sniper' else .085;case=height*(.65 if short else .62);tip=height-case
  centers=[(0,0)] if kind in ['pistol','rifle','sniper'] else [(-.18,.025),(0,-.01),(.18,.025)]
  for index,(x,y) in enumerate(centers):
   lathe('brass cartridge '+str(index+1),[(radius*1.07,0),(radius*1.1,.015),(radius*1.1,.035),(radius*.92,.045),(radius,.058),(radius*.98,case*.76),(radius*(.96 if short else .70),case*.90),(radius*(.96 if short else .70),case)],brass,x,y)
   r=radius*(.91 if short else .66)
   profile=[(r,case),(r*.98,case+tip*.32),(r*.80,case+tip*.70),(r*.46,case+tip*.92),(.001,height)] if short else [(r,case),(r*.9,case+tip*.22),(r*.62,case+tip*.58),(r*.25,case+tip*.87),(.001,height)]
   lathe('copper projectile '+str(index+1),profile,copper,x,y)
   # Small inset primer visible when inspecting from underneath.
   lathe('primer '+str(index+1),[(radius*.35,-.001),(radius*.35,0)],dark,x,y,24)
  if kind=='lmg':
   for x,y in centers:box('belt link',(x,y-.085,.22),(.15,.026,.095),dark)
   for x in [-.09,.09]:
    box('belt connector',(x,-.045,.22),(.06,.10,.065),dark)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=.017,location=(x,-.105,.22));rivet=bpy.context.object;rivet.name='belt rivet';rivet.scale.y=.4;rivet.data.materials.append(brass);rivet.parent=root;parts.append(rivet)
 bpy.context.view_layer.update();points=[o.matrix_world@Vector(c) for o in parts for c in o.bound_box];lo=Vector(tuple(min(p[i] for p in points)for i in range(3)));hi=Vector(tuple(max(p[i] for p in points)for i in range(3)));size=hi-lo
 bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
 for o in parts:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/('ammo-'+kind+'.glb')),export_format='GLB',use_selection=True,export_extras=True)
 if kind!='rockets':
  # Flying projectiles contain the bullet only, never the cartridge case or belt.
  bpy.ops.object.select_all(action='DESELECT');projectile=next(o for o in parts if o.name=='copper projectile 1');copy=projectile.copy();copy.data=projectile.data.copy();bpy.context.collection.objects.link(copy);copy.parent=None;copy.name='projectile-'+kind
  for v in copy.data.vertices:v.co.x-=centers[0][0];v.co.y-=centers[0][1];v.co.z-=case+tip/2
  copy.select_set(True);bpy.ops.export_scene.gltf(filepath=str(OUT/('projectile-'+kind+'.glb')),export_format='GLB',use_selection=True);bpy.data.objects.remove(copy,do_unlink=True)
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=128;scene.cycles.use_denoising=False;scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='Standard';scene.world=bpy.data.worlds.new('studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.7,.7,.7,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
 target=Vector((0,0,(lo.z+hi.z)/2));bpy.ops.object.camera_add(location=target+Vector((1,-4,.65)));cam=bpy.context.object;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=max(size.x,size.z)*1.26;scene.camera=cam
 for loc,power in [((-1,-2,2),100),((2,1,1.5),60)]:
  bpy.ops.object.light_add(type='AREA',location=target+Vector(loc));light=bpy.context.object;light.data.energy=power;light.data.size=3;light.rotation_euler=(target-light.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(OUT/('ammo-'+kind+'.png'));bpy.ops.render.render(write_still=True);bpy.ops.wm.save_as_mainfile(filepath=str((ROOT/('ammo-'+kind+'.blend')).resolve()),compress=True)
 REPORT.append({'id':kind,'file':'ammo-'+kind+'.glb','icon':'ammo-'+kind+'.png','bytes':(OUT/('ammo-'+kind+'.glb')).stat().st_size,'height':round(size.z,4),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in parts),'meshes':len(parts)})
(OUT/'manifest.json').write_text(json.dumps({'sourceReference':str(REF),'sourceSHA256':hashlib.sha256(REF.read_bytes()).hexdigest(),'units':'metres','upAxis':'Y','models':REPORT},indent=2)+'\n')
print(json.dumps(REPORT))
