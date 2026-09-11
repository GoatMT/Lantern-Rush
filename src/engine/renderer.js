import * as T from '../../vendor/three.module.js';
import { Stadium } from './stadium.js';
import { PlayerModel,createBallMesh } from './models.js';
import { BroadcastCamera } from './camera.js';
import { FIELD,fieldUnits as u } from '../config.js';
export class GameRenderer{
  constructor(canvas,settings){
    this.canvas=canvas;this.scene=new T.Scene();this.scene.background=new T.Color('#112d32');this.scene.fog=new T.Fog('#112d32',u(80),u(180));
    this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.camera=new T.PerspectiveCamera(49,innerWidth/innerHeight,.2,u(260));this.broadcast=new BroadcastCamera(this.camera);
    this.scene.add(new T.HemisphereLight('#d9f0e2','#26574b',2.2));
    this.sun=new T.DirectionalLight('#fff2cd',2.6);this.sun.position.set(-u(18),u(40),u(10));this.sun.castShadow=true;
    Object.assign(this.sun.shadow.camera,{left:-u(45),right:u(45),top:u(40),bottom:-u(40),near:1,far:u(100)});this.sun.shadow.bias=-.0008;this.scene.add(this.sun);
    this.stadium=new Stadium(this.scene);this.models=[];this.ballMesh=createBallMesh();this.scene.add(this.ballMesh);
    this.ballShadow=new T.Mesh(new T.CircleGeometry(.45,12),new T.MeshBasicMaterial({color:'#001c18',transparent:true,opacity:.35,depthWrite:false}));this.ballShadow.rotation.x=-Math.PI/2;this.scene.add(this.ballShadow);
    this.time=0;this.quality=settings.graphics;this.applyGraphics(settings.graphics);this.resize();
    this.onResize=()=>this.resize();addEventListener('resize',this.onResize);
    this.projectVector=new T.Vector3();
    const aimGeometry=new T.BufferGeometry();aimGeometry.setAttribute('position',new T.BufferAttribute(new Float32Array(6),3));
    this.aimLine=new T.Line(aimGeometry,new T.LineDashedMaterial({color:'#f2e7a6',dashSize:.6,gapSize:.35,transparent:true,opacity:.8}));
    this.scene.add(this.aimLine);this.aimLine.visible=false;
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();document.dispatchEvent(new CustomEvent('game-context-lost'));});
    canvas.addEventListener('webglcontextrestored',()=>location.reload());
  }
  applyGraphics(level){this.quality=level;this.renderer.shadowMap.enabled=level!=='low';this.sun.shadow.mapSize.set(level==='high'?2048:1024,level==='high'?2048:1024);if(this.sun.shadow.map){this.sun.shadow.map.dispose();this.sun.shadow.map=null;}this.stadium.quality(level);this.resize();}
  resize(){const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,this.quality==='low'?1:this.quality==='medium'?1.35:2));this.renderer.setSize(w,h,false);}
  setMatch(match){
    for(const model of this.models){this.scene.remove(model.root);model.dispose();}this.models=[];
    for(const p of match.players){const m=new PlayerModel(p,match.teams[p.team].uniform||match.teams[p.team].kit);this.models.push(m);this.scene.add(m.root);}
    if(this.ref){this.scene.remove(this.ref.root);this.ref.dispose();}
    this.ref=new PlayerModel(match.referee,'#ffe554',true);this.scene.add(this.ref.root);
    this.stadium.score(0,0);
    this.stadium.setTeams(match.teams);
  }
  refreshPlayer(player,match){
    const index=this.models.findIndex(m=>m.player===player);if(index<0)return;
    const old=this.models[index];this.scene.remove(old.root);old.dispose();
    const model=new PlayerModel(player,match.teams[player.team].uniform||match.teams[player.team].kit);this.models[index]=model;this.scene.add(model.root);
  }
  render(dt,match){
    this.time+=dt;this.broadcast.update(dt,this.time,match);
    for(const model of this.models){
      model.update(this.time,match?.controlled===model.player&&match?.phase!=='home'&&match?.phase!=='intro',dt,this.quality);
      if(match?.phase==='intro'&&match.phaseTime<9.8)model.root.visible=false;
    }
    if(this.ref){this.ref.update(this.time,false,dt,this.quality);if(match?.phase==='intro'&&match.phaseTime<9.8)this.ref.root.visible=false;}
    if(match){
      const b=match.ball;this.ballMesh.position.set(b.x,b.y,b.z);this.ballMesh.rotation.set(b.rollX,b.rotationY,b.rollZ);
      this.ballShadow.position.set(b.x,.055,b.z);this.ballShadow.scale.setScalar(1+Math.min(b.y,6)*.1);
      this.stadium.update(this.time,match.phase==='goal');
      this.aimLine.visible=(match.phase==='restart'&&match.restart?.team===0)||match.charge>0;
      if(this.aimLine.visible){const a=this.aimLine.geometry.attributes.position;a.array.set([b.x,.18,b.z,match.direction(0)*FIELD.halfLength,.18,match.aimZ]);a.needsUpdate=true;this.aimLine.computeLineDistances();this.aimLine.geometry.computeBoundingSphere();}
    }
    this.renderer.render(this.scene,this.camera);
  }
  project(x,y,z){this.projectVector.set(x,y,z).project(this.camera);return {x:(this.projectVector.x*.5+.5)*this.canvas.clientWidth,y:(-.5*this.projectVector.y+.5)*this.canvas.clientHeight,visible:this.projectVector.z<1};}
}
