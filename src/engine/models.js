import * as T from '../../vendor/three.module.js';
import { shirtTexture,numberColor } from './uniforms.js';
import { appearanceFor } from './appearance.js';
import { animationPose } from './animations.js';
const shared={
  sphere:new T.SphereGeometry(1,10,8),limb:new T.CylinderGeometry(1,1,1,7),
  torso:new T.CylinderGeometry(.34,.285,.69,10),boot:new T.BoxGeometry(.235,.15,.39),
  face:new T.PlaneGeometry(.37,.31),number:new T.PlaneGeometry(.37,.38),
  collar:new T.TorusGeometry(.17,.035,5,12),shadow:new T.PlaneGeometry(1.7,1.7)
};
const mat=color=>new T.MeshLambertMaterial({color});
function mesh(geometry,material,x=0,y=0,z=0,sx=1,sy=sx,sz=sx){
  const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;return m;
}
let contactTexture;
function softShadow(){
  if(contactTexture)return contactTexture;
  const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,5,32,32,32);
  g.addColorStop(0,'rgba(0,12,10,.42)');g.addColorStop(.55,'rgba(0,12,10,.2)');g.addColorStop(1,'rgba(0,12,10,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,64,64);contactTexture=new T.CanvasTexture(c);return contactTexture;
}
export function textTexture(text,{color='#fff',background='#0a302b',width=512,height=128,font=50}={}){
  const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');
  if(background){ctx.fillStyle=background;ctx.fillRect(0,0,width,height);}
  ctx.fillStyle=color;ctx.font='900 '+font+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,width/2,height/2,width-20);
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;
}
function faceTexture(appearance){
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');
  ctx.fillStyle='#352922';
  for(const x of [36,91]){ctx.beginPath();ctx.ellipse(x,48,7,9,0,0,Math.PI*2);ctx.fill();ctx.fillRect(x-11,31,21,4);}
  ctx.fillStyle='#fff';ctx.fillRect(34,43,3,3);ctx.fillRect(89,43,3,3);
  ctx.strokeStyle='#744739';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(51,88);ctx.quadraticCurveTo(64,93,77,88);ctx.stroke();
  if(appearance.beard){ctx.fillStyle=appearance.hair;ctx.globalAlpha=.6;ctx.beginPath();ctx.moveTo(22,76);ctx.quadraticCurveTo(64,125,106,76);ctx.lineTo(94,115);ctx.quadraticCurveTo(64,136,34,115);ctx.fill();}
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;
}
export class PlayerModel{
  constructor(player,color,referee=false){
    this.player=player;this.appearance=appearanceFor(player.id);const a=this.appearance;this.fineDetails=[];
    this.root=new T.Group();this.orientation=new T.Group();this.body=new T.Group();this.root.add(this.orientation);this.orientation.add(this.body);
    const kit=referee?{primary:'#ffe554',shorts:'#102a30',socks:'#102a30',trim:'#102a30'}:
      player.role==='GK'?{primary:'#fe944f',shorts:'#102a30',socks:'#ffae68',trim:'#102a30'}:
      typeof color==='string'?{primary:color,secondary:color,shorts:'#102a30',socks:color,trim:'#e7e8d6'}:color;
    this.uniformTexture=shirtTexture(kit);
    const shirt=new T.MeshLambertMaterial({map:this.uniformTexture}),sleeves=kit.pattern==='sleeves'?mat(kit.secondary):shirt;
    const skin=mat(a.skin),shorts=mat(kit.shorts),socks=mat(kit.socks),trim=mat(kit.trim||'#eee'),hair=mat(a.hair),boots=mat(a.hairstyle%2?'#f0f0d8':'#152332'),sole=mat('#b2c5b0');
    this.body.add(mesh(shared.torso,shirt,0,1.40,0));
    const collar=mesh(shared.collar,trim,0,1.76,0);collar.rotation.x=Math.PI/2;this.body.add(collar);
    this.body.add(mesh(shared.limb,shorts,0,.96,0,.28,.27,.26));
    this.head=new T.Group();this.head.position.y=1.89;this.body.add(this.head);
    this.head.add(mesh(shared.limb,skin,0,-.1,0,.105,.18,.10));
    this.head.add(mesh(shared.sphere,skin,0,.15,0,.255,.30,.235));
    const nose=mesh(shared.sphere,skin,0,.13,.225,.047,.057,.065);this.head.add(nose);this.fineDetails.push(nose);
    for(const side of [-1,1]){const ear=mesh(shared.sphere,skin,side*.25,.13,0,.055,.08,.045);this.head.add(ear);this.fineDetails.push(ear);}
    this.faceTexture=faceTexture(a);
    this.head.add(mesh(shared.face,new T.MeshBasicMaterial({map:this.faceTexture,transparent:true,depthWrite:false}),0,.14,.232));
    this.details=new T.Group();this.head.add(this.details);
    if(a.hairstyle!==4){
      const cap=mesh(new T.SphereGeometry(.26,10,6,0,Math.PI*2,0,Math.PI*.46),hair,0,.29,-.015,1,.8,1);this.head.add(cap);
      if(a.hairstyle===0){const quiff=mesh(shared.sphere,hair,.025,.435,.10,.21,.10,.16);quiff.rotation.z=-.15;this.details.add(quiff);}
      if(a.hairstyle===1){for(let i=0;i<4;i++)this.details.add(mesh(shared.sphere,hair,(i-1.5)*.1,.40,.10-i*.025,.09,.09,.16));}
      if(a.hairstyle===2){const curl=new T.InstancedMesh(shared.sphere,hair,9),dummy=new T.Object3D();for(let i=0;i<9;i++){dummy.position.set(Math.sin(i*2.4)*.19,.38+(i%3)*.025,Math.cos(i*2.4)*.17);dummy.scale.setScalar(.095);dummy.updateMatrix();curl.setMatrixAt(i,dummy.matrix);}curl.castShadow=true;this.details.add(curl);}
      if(a.hairstyle===3)this.details.add(mesh(shared.sphere,hair,0,.39,-.025,.25,.08,.22));
    }
    this.arms=[];this.elbows=[];this.legs=[];this.knees=[];
    for(const sign of [-1,1]){
      const arm=new T.Group();arm.position.set(sign*.37,1.66,0);
      arm.add(mesh(shared.limb,sleeves,0,-.12,0,.135,.26,.135));
      arm.add(mesh(shared.limb,skin,0,-.29,0,.095,.15,.095));
      const elbow=new T.Group();elbow.position.y=-.36;elbow.add(mesh(shared.limb,skin,0,-.14,0,.08,.28,.08));
      elbow.add(mesh(shared.sphere,player.role==='GK'?trim:skin,0,-.31,0,player.role==='GK'?.12:.085,.11,.075));
      arm.add(elbow);this.body.add(arm);this.arms.push(arm);this.elbows.push(elbow);
      const leg=new T.Group();leg.position.set(sign*.16,.91,0);
      leg.add(mesh(shared.limb,shorts,0,-.12,0,.16,.27,.15));leg.add(mesh(shared.limb,skin,0,-.33,0,.12,.20,.115));
      const knee=new T.Group();knee.position.y=-.43;knee.add(mesh(shared.sphere,skin,0,0,0,.12,.12,.115));
      knee.add(mesh(shared.limb,socks,0,-.19,0,.10,.37,.10));knee.add(mesh(shared.limb,trim,0,-.075,0,.105,.025,.105));
      knee.add(mesh(shared.boot,boots,0,-.38,.09));
      knee.add(mesh(shared.boot,sole,0,-.459,.085,1,.13,1));
      // One instanced draw for the six studs on each boot.
      const studs=new T.InstancedMesh(shared.sphere,sole,6),dummy=new T.Object3D();
      for(let i=0;i<6;i++){dummy.position.set(i%2?.07:-.07,-.477,-.03+Math.floor(i/2)*.11);dummy.scale.set(.025,.025,.025);dummy.updateMatrix();studs.setMatrixAt(i,dummy.matrix);}knee.add(studs);this.fineDetails.push(studs);
      leg.add(knee);this.body.add(leg);this.legs.push(leg);this.knees.push(knee);
    }
    if(player.data.leadershipRole==='captain'){const band=mesh(shared.limb,mat('#f3dc52'),0,-.18,0,.142,.095,.142);this.arms[0].add(band);}
    this.numberTexture=textTexture(player.jersey??'LSL',{background:null,color:numberColor(kit),font:69,width:128,height:128});
    const numberMat=new T.MeshBasicMaterial({map:this.numberTexture,transparent:true,side:T.DoubleSide,depthWrite:false});
    for(const z of [-.30,.30]){const num=mesh(shared.number,numberMat,0,1.40,z);if(z<0)num.rotation.y=Math.PI;this.body.add(num);}
    this.shadow=new T.Mesh(shared.shadow,new T.MeshBasicMaterial({map:softShadow(),transparent:true,depthWrite:false}));
    this.shadow.rotation.x=-Math.PI/2;this.shadow.position.y=.028;this.root.add(this.shadow);
    this.indicator=mesh(new T.ConeGeometry(.22,.40,3),new T.MeshBasicMaterial({color:'#ecfb84'}),0,3.05,0);
    this.indicator.rotation.z=Math.PI;this.root.add(this.indicator);
    this.ring=new T.Mesh(new T.RingGeometry(.66,.77,24),new T.MeshBasicMaterial({color:'#ecfb84',side:T.DoubleSide}));
    this.ring.rotation.x=-Math.PI/2;this.ring.position.y=.04;this.root.add(this.ring);
    this.root.scale.set(1.13*a.build,1.13*a.height,1.13*a.build);
    if(referee){this.card=mesh(new T.BoxGeometry(.20,.30,.035),new T.MeshBasicMaterial({color:'#ffe24b'}),0,-.34,.015);this.card.visible=false;this.elbows[0].add(this.card);}
    this.pose=null;
  }
  update(time,controlled=false,dt=1/60,quality='medium'){
    const p=this.player;this.root.visible=!p.sentOff;if(p.sentOff)return;
    this.root.position.set(p.x,0,p.z);this.orientation.rotation.y=Math.atan2(p.faceX,p.faceZ);
    this.indicator.visible=this.ring.visible=controlled;this.details.visible=quality!=='low';
    this.fineDetails.forEach(detail=>detail.visible=quality!=='low');
    const target=animationPose(p,time),blend=1-Math.exp(-dt*19);
    if(!this.pose)this.pose={...target};else for(const key of Object.keys(target))this.pose[key]+=(target[key]-this.pose[key])*blend;
    const q=this.pose;this.body.position.set(q.x,q.y,0);this.body.rotation.set(q.pitch,q.yaw,q.roll);
    this.head.rotation.set(q.headPitch,q.headYaw,0);
    this.arms[0].rotation.set(q.laX,0,q.laZ);this.arms[1].rotation.set(q.raX,0,q.raZ);
    this.elbows[0].rotation.x=-q.le;this.elbows[1].rotation.x=-q.re;
    this.legs[0].rotation.set(q.llX,0,q.llZ);this.legs[1].rotation.set(q.rlX,0,q.rlZ);
    this.knees[0].rotation.x=q.lk;this.knees[1].rotation.x=q.rk;
    this.shadow.scale.setScalar(1+Math.max(0,q.y)*.25);this.shadow.material.opacity=1-Math.max(0,q.y)*.3;
    if(this.card){this.card.visible=p.action?.name==='card'&&!!p.cardColor;if(p.cardColor)this.card.material.color.set(p.cardColor);}
  }
  dispose(){
    const materials=new Set(),geometries=new Set();
    this.root.traverse(o=>{if(o.isMesh){if(!Object.values(shared).includes(o.geometry))geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.numberTexture.dispose();this.uniformTexture.dispose();this.faceTexture.dispose();
  }
}
export function createBallMesh(){
  const ball=new T.Group();ball.add(mesh(new T.SphereGeometry(.32,16,12),mat('#fcf8e7')));
  const black=mat('#172e36');
  for(const d of [[0,1,0],[0,-1,0],[1,.25,0],[-1,.25,0],[0,.25,1],[0,.25,-1],[.7,-.5,.7],[-.7,-.5,-.7]]){
    const patch=new T.Mesh(new T.CircleGeometry(.105,5),black),v=new T.Vector3(...d).normalize();
    patch.position.copy(v.multiplyScalar(.322));patch.lookAt(patch.position.clone().multiplyScalar(2));ball.add(patch);
  }return ball;
}
