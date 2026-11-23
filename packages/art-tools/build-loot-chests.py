"""Prepare the five reference-derived Meshy loot containers, without changing gameplay."""
import bpy, json, math, hashlib
from pathlib import Path
from mathutils import Matrix, Vector
ROOT = Path('art/loot-chests')
OUT = ROOT / 'models'
OUT.mkdir(exist_ok=True)
(ROOT / 'textures').mkdir(exist_ok=True)
(ROOT / 'renders').mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.cycles.use_denoising = False
scene.render.resolution_x = 1000
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = True
scene.world = bpy.data.worlds.new('Soft studio')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.5,.5,.5,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .65
scene.view_settings.view_transform = 'Standard'
report = []
entries = [('tier-1-small',(.8,.7,.7)),('tier-2-supply',(1.1,.85,.9)),('tier-3-reinforced',(1.25,1,1.05)),('tier-4-long',(2.1,.6,.55)),('tier-5-heavy',(2.2,1,.9))]
models = []
for index,(name,dimensions) in enumerate(entries):
    source = ROOT / 'originals' / (name+'.glb')
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(source))
    imported = list(set(bpy.data.objects)-before)
    meshes = [o for o in imported if o.type=='MESH']
    assert meshes, name
    # Bake imported transforms, preserving the original UV coordinates and topology.
    for o in meshes:
        o.data.transform(o.matrix_world)
        o.parent = None
        o.matrix_world = Matrix.Identity(4)
    points = [v.co for o in meshes for v in o.data.vertices]
    lo = Vector([min(v[i] for v in points) for i in range(3)])
    hi = Vector([max(v[i] for v in points) for i in range(3)])
    size = hi-lo
    center = Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
    transform = Matrix.Diagonal(Vector((*[dimensions[i]/size[i] for i in range(3)],1))) @ Matrix.Translation(-center)
    for o in meshes:
        o.data.transform(transform)
        o.name = name
        o['tier'] = index+1
        o['source'] = 'Meshy image-to-3D: meshy-t2 / meshy-n1'
        o['state'] = 'closed static container'
        for mat in o.data.materials:
            if not mat or not mat.use_nodes: continue
            bsdf = next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
            if bsdf:
                bsdf.inputs['Roughness'].default_value = .38
                bsdf.inputs['Metallic'].default_value = .05 if index<2 else .18
            for node in mat.node_tree.nodes:
                if node.type=='TEX_IMAGE' and node.image:
                    im=node.image
                    assert im.size[0]>0 and im.size[1]>0
                    im.filepath_raw=str((ROOT/'textures'/f'{name}-{im.name.replace("/","_")}.png').resolve())
                    im.file_format='PNG'
                    im.save()
                    if not im.packed_file: im.pack()
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:o.select_set(True)
    bpy.context.view_layer.objects.active=meshes[0]
    dest=OUT/(name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_extras=True)
    tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
    report.append({'name':name,'dimensionsMeters':list(dimensions),'sourceDimensionsBlender':list(size),'triangles':tris,'meshes':len(meshes),'bytes':dest.stat().st_size,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'uvLayers':min(len(o.data.uv_layers) for o in meshes)})
    models.append(meshes)
    for o in meshes:o.hide_render=True
    for o in imported:
        if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
# Render real exported geometry under identical lighting, with no floor or background.
bpy.ops.object.camera_add()
cam=bpy.context.object
scene.camera=cam
cam.data.type='ORTHO'
for location,power,size in [((3,-4,6),450,5),((-4,-1,3),220,4),((1,4,5),300,3)]:
    bpy.ops.object.light_add(type='AREA',location=location)
    light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size
    light.rotation_euler=(-light.location).to_track_quat('-Z','Y').to_euler()
for (name,dims),meshes in zip(entries,models):
    for o in meshes:o.hide_render=False
    target=Vector((0,0,dims[2]*.5))
    cam.location=target+Vector((3,-5,3))
    cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.ortho_scale=max(dims[0]*1.4,dims[2]*1.9,1.5)
    scene.render.filepath=str(ROOT/'renders'/(name+'.png'))
    bpy.ops.render.render(write_still=True)
    for o in meshes:o.hide_render=True
for i,meshes in enumerate(models):
    for o in meshes:o.hide_render=False;o.location.x=i*3
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'loot-chest-library.blend'),compress=True)
(ROOT/'model-check.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
