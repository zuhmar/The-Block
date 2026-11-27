"""Package the Blender render for phones, using the game's own footsteps and gate sounds."""
import array,json,math,subprocess,wave,hashlib,sys
from pathlib import Path
ROOT=Path.cwd();WORK=ROOT/'work/jail-intro';OUT=ROOT/'apps/client/static/assets/cinematics';OUT.mkdir(parents=True,exist_ok=True)
RATE=48000;DURATION=15;mix=[[0.0]*(RATE*DURATION) for _ in range(2)]
def effect(name,at,gain,pan=0,rate=1):
 path=ROOT/'apps/client/static/assets/audio'/f'{name}.wav'
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-ar',str(round(RATE/rate)),'-ac','1','-f','f32le','pipe:1'])
 samples=array.array('f');samples.frombytes(raw);start=round(at*RATE)
 for i,v in enumerate(samples):
  if start+i>=len(mix[0]):break
  for c,balance in enumerate([1-max(0,pan),1+min(0,pan)]):mix[c][start+i]+=v*gain*balance
for offset,gain,pan in [(0,.3,0),(.15,.2,-.5),(.32,.2,.5)]:
 t=.85+offset
 while t<10.8:effect('step-pavement',t,gain,pan);t+=.52
for name,at in [('door-open',4.5),('door-close',10.95)]:effect(name,at,.65,rate=.75)
with wave.open(str(WORK/'audio.wav'),'wb') as w:
 w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE);pcm=array.array('h')
 for i in range(len(mix[0])):
  fade=min(1,i/(RATE*.3),(len(mix[0])-i)/(RATE*.6))
  for c in range(2):pcm.append(round(max(-.95,min(.95,mix[c][i]*fade))*32767))
 w.writeframes(pcm.tobytes())
video=OUT/'jail-release-v2.mp4'
args=['ffmpeg','-y','-v','error','-i',str(WORK/'jail-release-silent.mp4'),'-i',str(WORK/'audio.wav'),'-loop','1','-framerate','24','-t','3','-i',str(ROOT/'art/cinematics/jail-release/welcome.png')]
world='[0:v]trim=end=12,setpts=PTS-STARTPTS'
if '--route-patch' in sys.argv:
 # A rendered replacement for frames 211–288; earlier source frames are unchanged.
 args+=['-i',str(ROOT/'work/jail-update/route.mp4')]
 world='[0:v]trim=end_frame=210,setpts=PTS-STARTPTS[pre];[3:v]trim=end_frame=78,setpts=PTS-STARTPTS[post];[pre][post]concat=n=2:v=1:a=0'
args+=['-filter_complex',world+',fade=t=in:st=0:d=0.25,fade=t=out:st=11.65:d=0.35[lead];[2:v]trim=end_frame=72,setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.25,fade=t=out:st=2.6:d=0.4[tail];[lead][tail]concat=n=2:v=1:a=0[v]','-map','[v]','-map','1:a:0']
args+=['-r','24','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart','-t','15',str(video)]
subprocess.run(args,check=True)
subprocess.run(['ffmpeg','-y','-v','error','-ss','10','-i',str(video),'-frames:v','1','-c:v','libwebp','-quality','85',str(OUT/'jail-release-v2.webp')],check=True)
meta=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_streams','-show_format','-of','json',str(video)]))
report={'bytes':video.stat().st_size,'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'duration':float(meta['format']['duration']),'streams':[{'codec':s['codec_name'],'type':s['codec_type'],'width':s.get('width'),'height':s.get('height'),'fps':s.get('r_frame_rate')}for s in meta['streams']]}
(ROOT/'art/cinematics/jail-release/video-check.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
