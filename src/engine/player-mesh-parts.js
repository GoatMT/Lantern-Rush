import * as T from '../../vendor/three.module.js';

// Static pieces on each animated joint are merged into one draw call.
export const playerShapes={
  sphere:new T.SphereGeometry(1,12,10),limb:new T.CylinderGeometry(1,1,1,10),
  taper:new T.CylinderGeometry(.88,1,1,10),box:new T.BoxGeometry(1,1,1),
  cap:new T.SphereGeometry(1,12,7,0,Math.PI*2,0,Math.PI*.52),
  collar:new T.TorusGeometry(1,.15,5,16)
};
export const jointMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.79,metalness:0});

export function part(shape,color,x,y,z,sx,sy=sx,sz=sx,rx=0,ry=0,rz=0){
  return {shape,color,position:[x,y,z],scale:[sx,sy,sz],rotation:[rx,ry,rz]};
}

export function mergeParts(parts){
  const vertices=[],normals=[],colors=[],matrix=new T.Matrix4(),normalMatrix=new T.Matrix3(),transform=new T.Object3D(),v=new T.Vector3(),n=new T.Vector3();
  for(const item of parts){
    const source=playerShapes[item.shape],geometry=source.index?source.toNonIndexed():source;
    transform.position.set(...item.position);transform.scale.set(...item.scale);transform.rotation.set(...item.rotation);transform.updateMatrix();matrix.copy(transform.matrix);normalMatrix.getNormalMatrix(matrix);
    const position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),color=new T.Color(item.color);
    for(let i=0;i<position.count;i++){
      v.fromBufferAttribute(position,i).applyMatrix4(matrix);n.fromBufferAttribute(normal,i).applyNormalMatrix(normalMatrix);
      vertices.push(v.x,v.y,v.z);normals.push(n.x,n.y,n.z);colors.push(color.r,color.g,color.b);
    }
    if(geometry!==source)geometry.dispose();
  }
  const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(vertices,3));result.setAttribute('normal',new T.Float32BufferAttribute(normals,3));result.setAttribute('color',new T.Float32BufferAttribute(colors,3));result.computeBoundingSphere();return result;
}

export function solid(parts){const m=new T.Mesh(mergeParts(parts),jointMaterial);m.castShadow=m.receiveShadow=true;return m;}

export function tailoredTorso(){
  const rings=[[0,.255,.15],[.12,.265,.165],[.42,.29,.18],[.64,.34,.155],[.76,.235,.13]],segments=16,positions=[],uv=[],indices=[];
  for(const [y,rx,rz] of rings)for(let s=0;s<=segments;s++){const a=s/segments*Math.PI*2;positions.push(Math.sin(a)*rx,y,Math.cos(a)*rz);uv.push(s/segments,y/.76);}
  for(let r=0;r<rings.length-1;r++)for(let s=0;s<segments;s++){const a=r*(segments+1)+s,b=a+segments+1;indices.push(a,a+1,b,b,a+1,b+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
