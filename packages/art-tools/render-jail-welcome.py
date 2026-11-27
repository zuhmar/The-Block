"""Render the Blender welcome card with flat graphic lighting and the approved logo."""
import bpy
bpy.ops.wm.open_mainfile(filepath='art/cinematics/jail-release/jail-release.blend')
s=bpy.context.scene;s.frame_set(320);s.display.shading.light='FLAT';s.display.shading.show_shadows=False;s.display.shading.show_cavity=False;s.display.shading.show_specular_highlight=False;s.render.image_settings.file_format='PNG';s.render.resolution_percentage=100;s.view_settings.view_transform='Standard';s.view_settings.look='None';s.render.filepath='art/cinematics/jail-release/welcome.png';bpy.ops.render.render(write_still=True)
