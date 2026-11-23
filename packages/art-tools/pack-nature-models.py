"""Package Blender sources, GLB LODs, and a labeled render preview for delivery."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,zipfile
ROOT=Path('art/models/nature');OUT=Path('apps/client/static/assets/nature-models')
items=[('tree-broadleaf','BROADLEAF'),('tree-pine','PINE'),('tree-birch','BIRCH'),('node-rock','ROCK'),('node-sulfur','SULFUR'),('node-metal','METAL')]
preview=Image.new('RGB',(1536,1120),'#14232c');draw=ImageDraw.Draw(preview);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',24)
for i,(key,label) in enumerate(items):
 x=(i%3)*512;y=(i//3)*560;draw.rounded_rectangle((x+10,y+10,x+502,y+550),radius=16,fill='#223541',outline='#3b515f',width=2)
 render=Image.open(ROOT/'renders'/(key+'.png'));assert render.mode=='RGBA' and render.size==(512,512);assert render.getchannel('A').getextrema()==(0,255)
 preview.paste(render,(x,y),render);draw.text((x+256,y+529),label,font=font,anchor='mm',fill='#edf2e6')
preview.save(OUT/'preview.png');preview.save(ROOT/'preview.png')
with zipfile.ZipFile(OUT/'street-survival-nature-models.zip','w',compression=zipfile.ZIP_DEFLATED) as archive:
 for key,_ in items:
  for suffix in ['.glb','-lod1.glb']:archive.write(OUT/(key+suffix),key+suffix)
  archive.write(ROOT/(key+'.blend'),'blender/'+key+'.blend');archive.write(ROOT/'renders'/(key+'.png'),'renders/'+key+'.png')
 for file in [OUT/'manifest.json',OUT/'preview.png',ROOT/'README.md']:archive.write(file,file.name)
print(json.dumps({'models':6,'glbLODs':12,'blenderSources':6,'zipBytes':(OUT/'street-survival-nature-models.zip').stat().st_size}))
