"""Validate the rendered RGBA icons, pack their atlas, and make a review/download bundle."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib,zipfile
OUT=Path('apps/client/public/assets/weapon-icons');ROOT=Path('art/weapons/sprites')
items=[('pistol','PISTOL'),('smg','SMG'),('assault-rifle','ASSAULT RIFLE'),('sniper','SNIPER'),('light-machine-gun','LIGHT MACHINE GUN'),('rocket-launcher','ROCKET LAUNCHER'),('grenade','GRENADE'),('c4','C4')]
atlas=Image.new('RGBA',(1024,1024));preview=Image.new('RGB',(1024,1248),'#14232c');draw=ImageDraw.Draw(preview);frames={};checks=[]
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',22)
for i,(key,label) in enumerate(items):
 file=OUT/(key+'.png');icon=Image.open(file);assert icon.mode=='RGBA' and icon.size==(512,256),key
 alpha=icon.getchannel('A');bounds=alpha.getbbox();assert bounds and min(bounds[0],bounds[1],512-bounds[2],256-bounds[3])>=12,(key,bounds)
 assert alpha.getextrema()==(0,255),key
 x=(i%2)*512;y=(i//2)*256;atlas.alpha_composite(icon,(x,y));frames[key]={'frame':{'x':x,'y':y,'w':512,'h':256},'rotated':False,'trimmed':False,'sourceSize':{'w':512,'h':256},'spriteSourceSize':{'x':0,'y':0,'w':512,'h':256},'pivot':{'x':.5,'y':.5}}
 py=(i//2)*312;draw.rounded_rectangle((x+12,py+12,x+500,py+300),radius=18,fill='#223541',outline='#3b515f',width=2);preview.paste(icon,(x,py+6),icon);draw.text((x+256,py+276),label,font=font,anchor='mm',fill='#edf2e6')
 checks.append({'id':key,'dimensions':list(icon.size),'alphaRange':list(alpha.getextrema()),'contentBounds':list(bounds),'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
atlas.save(OUT/'weapon-atlas.png');preview.save(ROOT/'preview.png');preview.save(OUT/'preview.png')
manifest={'frames':frames,'meta':{'image':'weapon-atlas.png','format':'RGBA8888','size':{'w':1024,'h':1024},'scale':'1'}}
(OUT/'weapon-atlas.json').write_text(json.dumps(manifest,indent=2)+'\n');(ROOT/'sprite-checks.json').write_text(json.dumps(checks,indent=2)+'\n')
with zipfile.ZipFile(OUT/'street-survival-weapon-sprites.zip','w',compression=zipfile.ZIP_DEFLATED) as archive:
 for file in [*[OUT/(key+'.png') for key,_ in items],OUT/'weapon-atlas.png',OUT/'weapon-atlas.json',OUT/'preview.png']:archive.write(file,file.name)
print(json.dumps({'sprites':len(checks),'dimensions':[512,256],'atlas':[1024,1024],'alphaAndPaddingValidated':True,'zipBytes':(OUT/'street-survival-weapon-sprites.zip').stat().st_size}))
