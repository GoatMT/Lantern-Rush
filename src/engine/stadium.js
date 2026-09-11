import * as T from '../../vendor/three.module.js';
import { FIELD,fieldUnits as u } from '../config.js';
import { textTexture } from './models.js';
const mat=color=>new T.MeshLambertMaterial({color});
export class Stadium {
  constructor(scene){
    this.root=new T.Group();scene.add(this.root);this.detail=new T.Group();this.crowdGroup=new T.Group();this.root.add(this.detail,this.crowdGroup);this.nets=[];this.banners=[];
    const L=FIELD.halfLength,W=FIELD.halfWidth;
    this.box(u(112),.8,u(91),0,-.6,0,'#132f30');
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=768;const c=canvas.getContext('2d');
    c.fillStyle='#38896a';c.fillRect(0,0,1024,768);
    for(let i=0;i<16;i++){c.fillStyle=i%2?'#3b916d':'#32815e';c.fillRect(i*64,0,64,768);}
    let seed=37;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<38000;i++){const x=random()*1024,y=random()*768;c.fillStyle=i%2?'#ffffff05':'#00150808';c.fillRect(x,y,1,2);}
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
    this.pitch=new T.Mesh(new T.PlaneGeometry(L*2,W*2),new T.MeshLambertMaterial({map:texture}));
    this.pitch.rotation.x=-Math.PI/2;this.pitch.receiveShadow=true;this.root.add(this.pitch);
    this.box(L*2+u(12),.07,W*2+u(10),0,-.1,0,'#286651');
    this.line([[-L,-W],[L,-W],[L,W],[-L,W],[-L,-W]]);this.line([[0,-W],[0,W]]);this.circle(0,0,FIELD.centerRadius);this.circle(0,0,.16);
    for(const side of [-1,1]){
      this.line([[side*L,-FIELD.boxHalf],[side*(L-FIELD.boxDepth),-FIELD.boxHalf],[side*(L-FIELD.boxDepth),FIELD.boxHalf],[side*L,FIELD.boxHalf]]);
      this.line([[side*L,-FIELD.goalBoxHalf],[side*(L-FIELD.goalBoxDepth),-FIELD.goalBoxHalf],[side*(L-FIELD.goalBoxDepth),FIELD.goalBoxHalf],[side*L,FIELD.goalBoxHalf]]);
      this.circle(side*(L-FIELD.penaltyDistance),0,.16);this.goal(side);
      for(const z of [-W,W]){
        this.box(.1,1.6,.1,side*L,.8,z,'#eceadd');
        const flag=new T.Mesh(new T.PlaneGeometry(.8,.5),new T.MeshBasicMaterial({color:'#e6ce78',side:T.DoubleSide}));
        flag.position.set(side*L+.4,1.5,z);this.root.add(flag);
      }
      this.box(u(72),1.4,.4,0,.7,side*u(25),'#173b3a');
      this.box(.4,1.4,u(49),side*u(37),.7,0,'#173b3a');
      for(let row=0;row<4;row++){
        this.box(u(76),.65,u(2.3),0,.35+row*.8,side*u(28+row*2.1),row%2?'#214848':'#295857');
        this.box(u(2.3),.65,u(48),side*u(40+row*2.1),.35+row*.8,0,'#244b4c');
      }
      for(let i=-2;i<=2;i++){
        const board=new T.Mesh(new T.PlaneGeometry(u(13),1.1),new T.MeshBasicMaterial({map:textTexture(i%2?'LANTERN RUSH':'LANTERN SOCCER LEAGUE',{background:i%2?'#e6d083':'#164c3d',color:i%2?'#112c29':'#edecdc',font:30})}));
        board.position.set(u(i*14),.85,side*u(24.74));if(side>0)board.rotation.y=Math.PI;this.root.add(board);this.banners.push(board);
      }
      for(const x of [-u(28),u(28)]){
        this.box(.24,u(17),.24,x,u(8.5),side*u(29),'#73938b');
        this.box(4,1.3,.55,x,u(17),side*u(29),'#c4d4c8');
        const glow=new T.Mesh(new T.PlaneGeometry(3.7,1),new T.MeshBasicMaterial({color:'#fff8d3',side:T.DoubleSide}));
        glow.position.set(x,u(17),side*u(29)+.31);this.root.add(glow);
      }
    }
    // Props and spectators keep their original body sizes; their placement follows the stadium.
    for(const x of [-u(11),u(11)]){
      this.box(8,.3,1.2,x,.6,u(24),'#d0dac9');this.box(8,1,.16,x,1.2,u(24)+.6,'#24465b');this.box(9,.15,2,x,2.6,u(24)+.5,'#86aaa0');
      for(const sign of [-1,1])this.box(.12,2.5,.12,x+sign*4.3,1.3,u(24)+.5,'#acd0bd');
    }
    this.scoreTexture=textTexture('LSL   0 : 0',{width:512,height:200,font:70});
    const score=new T.Mesh(new T.PlaneGeometry(u(9),u(3.5)),new T.MeshBasicMaterial({map:this.scoreTexture}));score.position.set(0,u(8),-u(36));this.root.add(score);
    for(const x of [-u(3),u(3)])this.box(.3,u(7),.3,x,u(3.5),-u(36),'#75938b');
    const geom=new T.SphereGeometry(.27,5,4),cm=new T.MeshLambertMaterial({color:'#efb977'});
    const crowd=new T.InstancedMesh(geom,cm,1056),dummy=new T.Object3D(),color=new T.Color();
    const colors=['#e7dca3','#b8c4bc','#214459','#d66f45','#6cad9f','#e3e9cf'];
    // Interleave stands so every graphics level includes all four sides without more instances.
    let k=0;for(let r=0;r<4;r++)for(let j=0;j<88;j++)for(const side of [-1,1]){
      dummy.position.set(u((j-44)*.83),1.15+r*.8,side*u(28+r*2.1));dummy.scale.set(1,1.9,1);dummy.updateMatrix();
      crowd.setMatrixAt(k,dummy.matrix);crowd.setColorAt(k++,color.set(colors[(j*7+r)%colors.length]));
      if(j%2===0){
        dummy.position.set(side*u(40+r*2.1),1.15+r*.8,u((j/2-22)*1.05));dummy.updateMatrix();
        crowd.setMatrixAt(k,dummy.matrix);crowd.setColorAt(k++,color.set(colors[(j+r)%colors.length]));
      }
    }
    crowd.count=k;this.crowd=crowd;this.crowdGroup.add(crowd);
    for(let i=0;i<32;i++)this.box(u(1.5),u(3+(i%4)),u(1.5),u((i-16)*3.8),u(1.5),-u(43),'#102c2d',this.detail);
  }
  box(w,h,d,x,y,z,color,parent=this.root){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.receiveShadow=true;parent.add(m);return m;}
  line(points){const vertices=points.map(([x,z])=>new T.Vector3(x,.04,z));this.root.add(new T.Line(new T.BufferGeometry().setFromPoints(vertices),new T.LineBasicMaterial({color:'#e5ecce'})));}
  circle(x,z,r){const pts=[];for(let i=0;i<=64;i++){const a=i/64*Math.PI*2;pts.push([x+Math.cos(a)*r,z+Math.sin(a)*r]);}this.line(pts);}
  goal(side){
    const x=side*FIELD.halfLength,G=FIELD.goalHalf,H=FIELD.goalHeight,D=FIELD.goalDepth,post=FIELD.postRadius*2;
    for(const z of [-G,G])this.box(post,H,post,x,H/2,z,'#f3efd6');
    this.box(post,post,G*2+post,x,H,0,'#f3efd6');
    const positions=[];
    for(let i=0;i<=24;i++){const z=-G+i*G/12;positions.push(x,H,z,x+side*D,H*.91,z,x+side*D,H*.91,z,x+side*D,0,z);}
    for(let i=0;i<=12;i++){const y=i*H/12;positions.push(x+side*D,y*.91,-G,x+side*D,y*.91,G);for(const z of [-G,G])positions.push(x,y,z,x+side*D,y*.91,z);}
    for(let i=0;i<=6;i++){const a=D*i/6;positions.push(x+side*a,H*(1-.09*i/6),-G,x+side*a,H*(1-.09*i/6),G);}
    const net=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3)),new T.LineBasicMaterial({color:'#d8e9d0',transparent:true,opacity:.44}));
    this.root.add(net);this.nets.push(net);
  }
  quality(level){this.detail.visible=level!=='low';this.crowd.count=level==='low'?352:level==='medium'?704:1056;this.pitch.material.map.anisotropy=level==='high'?8:2;this.pitch.material.map.needsUpdate=true;}
  setTeams(teams){this.banners.forEach((b,i)=>{const team=teams[i%2];b.material.map.dispose();b.material.map=textTexture(i%3===0?'LANTERN RUSH':team.name.toUpperCase(),{background:team.kit,color:'#ffffff',font:32});b.material.needsUpdate=true;});}
  score(a,b){const canvas=this.scoreTexture.image,c=canvas.getContext('2d');c.fillStyle='#0a302b';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#f1dda0';c.font='900 75px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText('LSL   '+a+' : '+b,256,100);this.scoreTexture.needsUpdate=true;}
  update(t,celebrating){this.nets.forEach((n,i)=>{n.position.x=celebrating?Math.sin(t*24+i)*.05:0;});}
}
