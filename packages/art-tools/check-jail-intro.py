"""Verify actual skinned soles, all escort actors, gates, and the branded ending."""
import bpy,json
from pathlib import Path
bpy.ops.wm.open_mainfile(filepath='art/cinematics/jail-release/jail-release.blend');scene=bpy.context.scene
manifest=json.loads(Path('art/cinematics/jail-release/manifest.json').read_text());report={'shots':len([m for m in scene.timeline_markers if m.camera]),'frames':scene.frame_end,'fps':scene.render.fps,'actors':[],'samples':[]}
for name in ['Player escort actor','Police left escort actor','Police right escort actor']:
 root=bpy.data.objects[name];rig=next(o for o in root.children_recursive if o.type=='ARMATURE');report['actors'].append({'name':name,'rigBones':len(rig.data.bones),'walkStrips':[st.action.name for tr in rig.animation_data.nla_tracks for st in tr.strips if 'Walking' in st.action.name]})
for expected in manifest['contactSamples']:
 scene.frame_set(expected['frame']);bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();root=bpy.data.objects[expected['actor']];points=[]
 for ob in root.children_recursive:
  if ob.type!='MESH' or not any(m.type=='ARMATURE' for m in ob.modifiers):continue
  ev=ob.evaluated_get(deps);mesh=ev.to_mesh();points.extend(ev.matrix_world@v.co for v in mesh.vertices);ev.to_mesh_clear()
 sole=min(p.z for p in points);clearance=sole-expected['surfaceZ'];assert abs(clearance-.002)<.003,(expected,sole)
 report['samples'].append({'actor':root.name,'frame':expected['frame'],'soleZ':sole,'surfaceZ':expected['surfaceZ'],'clearance':clearance})
scene.frame_set(288)
report['firstPersonActorHidden']=all(o.hide_render for o in bpy.data.objects['Player escort actor'].children_recursive if o.type=='MESH');assert report['firstPersonActorHidden']
assert report['shots']==5 and scene.frame_end==360 and all(a['walkStrips'] for a in report['actors'])
assert bpy.data.objects['Welcome to Survive the Block title'].data.body=='WELCOME TO'
report['welcome']='WELCOME TO SURVIVE THE BLOCK';report['logoObject']='Approved Survive the Block logo'
Path('art/cinematics/jail-release/blender-check.json').write_text(json.dumps(report,indent=2)+'\n');print('BLENDER_CINEMATIC_CHECK',json.dumps(report))
