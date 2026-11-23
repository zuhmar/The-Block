"""Original, deterministic, royalty-free game SFX. No downloaded sound recordings.
24 kHz mono PCM16 WAVs keep decoding and memory use small on phones.
"""
from pathlib import Path
import numpy as np,math,wave,json,hashlib
OUT=Path('apps/client/static/assets/audio');OUT.mkdir(parents=True,exist_ok=True);SR=24000;rng=np.random.default_rng(417023);report=[]
def lowpass(x,cutoff):
 a=1-math.exp(-2*math.pi*cutoff/SR);out=np.empty_like(x);v=0.
 for i,q in enumerate(x):v+=a*(q-v);out[i]=v
 return out
def noise(t,cutoff=7000):return lowpass(rng.uniform(-1,1,len(t)),cutoff)
def tone(t,f,decay=.08,end=None):
 phase=2*math.pi*(f*t if end is None else end*t+(f-end)*decay*(1-np.exp(-t/decay)))
 return np.sin(phase)
def burst(t,f=100,decay=.1):return tone(t,f,decay,f*.5)*np.exp(-t/decay)
def click(t,at,body=800):
 x=np.maximum(0,t-at);return (t>=at)*(noise(t,body*3)*.7+tone(x,body)*.3)*np.exp(-x/.018)
def make(name,seconds,kind,**kw):
 t=np.arange(int(SR*seconds))/SR;n=noise(t);x=np.zeros_like(t)
 if kind=='gun':
  body=kw['body'];decay=kw['decay'];x=.60*n*np.exp(-t/.019)+.48*lowpass(n,1800)*np.exp(-t/decay)+.42*burst(t,body,decay*.8);x=np.tanh(x*2.4)
  original=x.copy()
  for delay,gain in [(.026,.19),(.052,.12),(.095,.06)]:
   d=int(delay*SR);x[d:]+=original[:-d]*gain
 elif kind=='explosion':x=np.tanh((lowpass(n,1600)*1.8*np.exp(-t/.30)+lowpass(n,120)*2*np.exp(-t/.65)+burst(t,70,.30))*1.4)*(1-np.exp(-t/ .002))
 elif kind=='rocket':x=lowpass(n,1500+int(kw.get('bright',0)))*np.exp(-t/.24)*1.2+burst(t,90,.12)*.4
 elif kind=='step':x=burst(t,kw.get('body',95),.035)*.7+noise(t,kw.get('cutoff',3500))*np.exp(-t/.045)*.7+click(t,.045,340)*.12
 elif kind=='impact':x=noise(t,kw.get('cutoff',4200))*np.exp(-t/kw.get('decay',.055))*.6+burst(t,kw.get('body',160),kw.get('decay',.055))*.65
 elif kind=='metal':
  for f,g in [(490,1),(1053,.7),(1711,.35),(2800,.15)]:x+=tone(t,f)*np.exp(-t/.13)*g*.25
  x+=n*np.exp(-t/.012)*.5
 elif kind=='swing':x=noise(t,2000)*np.sin(np.minimum(t/seconds,1)*math.pi)**2*np.exp(-t/.18)
 elif kind=='mechanism':
  for at,body in kw.get('clicks',[(0,900),(.07,1800)]):x+=click(t,at,body)
 elif kind=='beep':
  for at,f in kw.get('notes',[(0,700),(.07,1000)]):
   u=np.maximum(0,t-at);x+=(t>=at)*tone(u,f)*np.exp(-u/.025)*.4
 elif kind=='fall':x=lowpass(n,1200)*(np.sin(t*17)**2)*np.exp(-t/.4)*.7+burst(t,90,.35)*.25+click(t,.36,260)*.4
 elif kind=='hurt':x=burst(t,115,.10)*.8+noise(t,800)*np.exp(-t/.07)*.5
 # Fade the first/last samples; normalize only this original source, not overlapping playback.
 x*=np.minimum(t/.001,1)*np.minimum((seconds-t)/.015,1);peak=float(np.max(np.abs(x)));x=x/max(peak,.001)*.78
 pcm=(np.clip(x,-1,1)*32767).astype('<i2');file=OUT/(name+'.wav')
 with wave.open(str(file),'wb')as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
 report.append({'id':name,'file':file.name,'seconds':seconds,'sampleRate':SR,'channels':1,'peak':round(float(np.max(np.abs(x))),4),'rms':round(float(np.sqrt(np.mean(x*x))),4),'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
for name,body,decay,length in [('pistol',150,.09,.35),('smg',220,.045,.20),('rifle',120,.12,.42),('sniper',78,.18,.65),('lmg',93,.105,.40)]:make(name,length,'gun',body=body,decay=decay)
make('rocket-launch',.65,'rocket');make('explosion',1.4,'explosion');make('grenade-throw',.22,'swing');make('c4-place',.28,'mechanism',clicks=[(0,240),(.09,1300),(.16,1800)]);make('detonate',.19,'beep',notes=[(0,1300),(.06,1700)])
make('empty',.09,'mechanism',clicks=[(0,1700)])
make('reload-out',.22,'mechanism',clicks=[(0,700),(.09,250)]);make('reload-in',.23,'mechanism',clicks=[(0,330),(.06,850)]);make('reload-rack',.28,'mechanism',clicks=[(0,1900),(.045,1200),(.10,450)]);make('equip',.16,'mechanism',clicks=[(0,700),(.055,1000)])
make('punch-swing',.20,'swing');make('punch-hit',.17,'impact',body=100,cutoff=1400);make('hit-marker',.10,'impact',body=480,cutoff=5000,decay=.025);make('hurt',.28,'hurt')
make('step-pavement',.19,'step',body=125,cutoff=2400);make('step-grass',.23,'step',body=75,cutoff=6500);make('jump',.16,'swing');make('land',.25,'impact',body=75,cutoff=1800,decay=.08)
make('chop',.22,'impact',body=190,cutoff=2800,decay=.06);make('mine',.30,'metal');make('tree-fall',1.1,'fall');make('node-break',.42,'impact',body=120,cutoff=5500,decay=.15)
make('build-wood',.32,'mechanism',clicks=[(0,220),(.065,170),(.15,300)]);make('build-stone',.28,'impact',body=90,cutoff=3600,decay=.10);make('build-metal',.32,'metal');make('dismantle',.38,'mechanism',clicks=[(0,600),(.08,350),(.18,180)])
make('door-open',.40,'mechanism',clicks=[(0,850),(.07,250),(.18,160)]);make('door-close',.25,'impact',body=95,cutoff=1600,decay=.07)
make('pickup',.17,'beep',notes=[(0,620),(.055,880)]);make('loot',.30,'mechanism',clicks=[(0,260),(.08,480),(.16,1100)])
make('ui-open',.12,'beep',notes=[(0,480),(.035,680)]);make('ui-close',.12,'beep',notes=[(0,680),(.035,480)])
(OUT/'manifest.json').write_text(json.dumps({'license':'Original project-generated synthesis; no third-party recordings','format':'mono PCM16 WAV','sounds':report},indent=2)+'\n')
print(f'Built {len(report)} sounds, {sum(s["bytes"] for s in report)} bytes')
