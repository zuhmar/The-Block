"""Validate a Meshy prop pack without altering its geometry or textures."""
from pathlib import Path
from io import BytesIO
from PIL import Image
import hashlib,json,math,struct,sys

assert len(sys.argv)==2, 'Usage: python packages/art-tools/check-meshy-props.py PACK_DIRECTORY'
ROOT=Path(sys.argv[1])
manifest=json.loads((ROOT/'manifest.json').read_text())
checks=[]
for prop in manifest['props']:
    name=prop['name'];path=ROOT/'models'/(name+'.glb');raw=path.read_bytes()
    magic,version,length=struct.unpack_from('<4sII',raw)
    assert magic==b'glTF' and version==2 and length==len(raw),f'{name}: invalid GLB header'
    chunks=[];offset=12
    while offset<len(raw):
        size,kind=struct.unpack_from('<II',raw,offset);offset+=8
        chunk=raw[offset:offset+size];assert len(chunk)==size
        chunks.append((kind,chunk));offset+=size
    assert offset==len(raw)
    doc=json.loads(chunks[0][1]);binary=next(data for kind,data in chunks if kind==0x004e4942)
    assert doc['asset']['version']=='2.0'
    assert all('uri' not in b for b in doc.get('buffers',[])),f'{name}: external buffer'
    assert doc.get('meshes') and doc.get('materials') and doc.get('images'),f'{name}: missing textured geometry'
    textures=[]
    for image in doc['images']:
        assert 'uri' not in image and 'bufferView' in image,f'{name}: external image'
        view=doc['bufferViews'][image['bufferView']];start=view.get('byteOffset',0);end=start+view['byteLength']
        assert 0<=start<end<=len(binary)
        im=Image.open(BytesIO(binary[start:end]));im.verify()
        textures.append({'width':im.width,'height':im.height,'format':im.format})
    triangles=0;vertices=0
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            assert primitive.get('mode',4)==4,f'{name}: non-triangle primitive'
            position=doc['accessors'][primitive['attributes']['POSITION']];vertices+=position['count']
            assert position['count']>0
            for field in ['min','max']:
                assert len(position[field])==3 and all(math.isfinite(x) for x in position[field])
            indices=doc['accessors'][primitive['indices']]['count'] if 'indices' in primitive else position['count']
            assert indices%3==0;triangles+=indices//3
            material=doc['materials'][primitive['material']]
            assert 'baseColorTexture' in material.get('pbrMetallicRoughness',{}),f'{name}: missing base-color texture'
    assert 0<triangles<=prop['targetPolycount']*1.5,f'{name}: exceeds intended smart-topology budget'
    reference=ROOT/'references'/(name+'.png');ref=Image.open(reference)
    assert ref.size==(1024,1024)
    check={'name':name,'triangles':triangles,'vertices':vertices,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'embeddedTextures':textures,'selfContained':True,'referenceSha256':hashlib.sha256(reference.read_bytes()).hexdigest()}
    checks.append(check)
    prop['modelPath']='models/'+name+'.glb';prop['referencePath']='references/'+name+'.png';prop['previewPath']='previews/'+name+'.png';prop['checks']=check
report={'props':checks,'totalTriangles':sum(c['triangles'] for c in checks),'totalModelBytes':sum(c['bytes'] for c in checks),'allSelfContained':True,'scope':'Static GLB structure, embedded image decoding and polygon budgets; this does not place models in the game.'}
(ROOT/'checks.json').write_text(json.dumps(report,indent=2)+'\n')
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'props':len(checks),'totalTriangles':report['totalTriangles'],'totalModelBytes':report['totalModelBytes'],'allSelfContained':True}))
