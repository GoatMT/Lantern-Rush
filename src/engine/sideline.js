import * as T from '../../vendor/three.module.js';
import {Player} from '../match/player.js';
import {PlayerModel} from './models.js';
import {sidelineAnchor,SIDELINE_RETURN} from '../match/sideline.js';
import {FIELD} from '../config.js';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export class SidelineCast{
  constructor(scene){this.scene=scene;this.staff=[];this.benchActors=[];this.benchSignature='';this.visitor=null;this.huddle=null;this.cueId=null;}
  setMatch(match,scale){
    this.dispose();this.match=match;this.scale=scale;
    for(const team of [0,1])for(const assistant of [false,true]){
      const data={id:`${match.teams[team].id}-${assistant?'assistant':'coach'}`,name:assistant?'Assistant Coach':'Coach',jersey:null,staff:true};
      const player=new Player(data,team,3,1);player.role='STAFF';
      const anchor=sidelineAnchor(team);player.x=anchor.x+(assistant?2.2:0);player.z=anchor.z+(assistant?-.3:0);player.faceX=0;player.faceZ=1;
      const tint=match.teams[team].kit||match.teams[team].uniform?.primary||'#dbc783';
      const kit={primary:assistant?'#334951':'#172d35',secondary:'#172d35',shorts:'#1c2d35',socks:'#1c2d35',trim:tint,pattern:'solid'};
      const model=new PlayerModel(player,kit);model.setVisualScale(scale);this.scene.add(model.root);
      if(assistant){const clipboard=new T.Mesh(new T.BoxGeometry(.24,.32,.035),new T.MeshStandardMaterial({color:'#c6c8bb',roughness:.9}));clipboard.position.set(0,-.27,.055);model.elbows[0].add(clipboard);}
      this.staff.push({player,model,assistant,anchor});
    }
    this.syncBenches(match,null);
  }
  setVisualScale(scale){this.scale=scale;for(const s of this.staff)s.model.setVisualScale(scale);for(const s of this.benchActors)s.model.setVisualScale(scale);this.visitor?.model.setVisualScale(scale);}
  clearVisitor(){if(this.visitor){this.scene.remove(this.visitor.model.root);this.visitor.model.dispose();this.visitor=null;}}
  clearBench(){for(const actor of this.benchActors){this.scene.remove(actor.model.root);actor.model.dispose();}this.benchActors=[];this.benchSignature='';}
  seatPosition(team,index,count){const anchor=sidelineAnchor(team),spacing=count>8?10/Math.max(1,count-1):1.1;return {x:anchor.x+(index-(count-1)/2)*spacing,z:-FIELD.halfWidth-3.82};}
  syncBenches(match,cue){
    const omitted=cue?.kind==='substitution'?cue.outPlayer?.id:null,entries=[];
    for(const team of [0,1]){
      const rows=[...(match.benches?.[team]||[]),...(match.archive||[]).filter(p=>p.team===team).map(p=>({...p.data,id:p.id,name:p.name,jersey:p.jersey,team}))];
      const seen=new Set();for(const row of rows){if(!row?.id||row.id===omitted||seen.has(row.id)){continue;}seen.add(row.id);entries.push({data:row,team});}
    }
    const signature=entries.map(x=>x.team+':'+x.data.id).join('|');if(signature===this.benchSignature)return;
    this.clearBench();this.benchSignature=signature;
    const counts=[entries.filter(x=>x.team===0).length,entries.filter(x=>x.team===1).length],indices=[0,0];
    for(const {data,team} of entries){
      const index=indices[team]++,p=new Player(data,team,index,match.direction(team),match.formations[team]);
      p.role=data.backupGoalkeeper||/goal|keeper/i.test(data.position||'')?'GK':'SUB';p.x=this.seatPosition(team,index,counts[team]).x;p.z=this.seatPosition(team,index,counts[team]).z;p.faceX=0;p.faceZ=1;p.watch({x:sidelineAnchor(team).x,z:sidelineAnchor(team).z+2});
      const model=new PlayerModel(p,match.teams[team].uniform||match.teams[team].kit);model.setVisualScale(this.scale||1);this.scene.add(model.root);this.benchActors.push({team,index,count:counts[team],player:p,model});
    }
  }
  restoreHuddle(){if(!this.huddle)return;for(const {player:p,state} of this.huddle.actors)Object.assign(p,state);this.huddle=null;}
  startHuddle(match,cue){
    const actors=match.active(cue.team).map((p,index)=>{const state={x:p.x,z:p.z,vx:p.vx,vz:p.vz,faceX:p.faceX,faceZ:p.faceZ,lookX:p.lookX,lookZ:p.lookZ,gait:p.gait,locomotion:p.locomotion,action:p.action?{...p.action}:null};return {player:p,index,state};});
    this.huddle={id:cue.id,actors};const anchor=sidelineAnchor(cue.team);
    for(const {player:p,index} of actors){const col=index%4,row=Math.floor(index/4);p.x=anchor.x+(col-1.5)*1.25;p.z=anchor.z+2+row*.9;p.vx=p.vz=0;p.gait=0;p.faceX=0;p.faceZ=-1;p.watch({x:anchor.x,z:anchor.z});}
  }
  update(dt,time,match,quality,camera){
    const cue=match?.sideline;
    const cueId=cue?.id??null;
    if(cueId!==this.cueId){
      if(this.huddle)this.restoreHuddle();
      this.cueId=cueId;this.clearVisitor();this.syncBenches(match,cue);
      if(cue?.kind==='substitution'&&cue.outPlayer){
        const p=new Player(cue.outPlayer,cue.team,3,1);p.role=cue.outPlayer.role||'MID';
        const m=new PlayerModel(p,match.teams[cue.team].uniform||match.teams[cue.team].kit),count=this.benchActors.filter(a=>a.team===cue.team).length,seat=this.seatPosition(cue.team,count,count+1);m.setVisualScale(this.scale);this.scene.add(m.root);this.visitor={player:p,model:m,seat};
      }
      if(cue&&['halftime','timeout'].includes(cue.kind))this.startHuddle(match,cue);
    }
    for(const staff of this.staff){
      const {player:p,model,assistant,anchor}=staff;
      const active=cue?.team===p.team,t=cue?.time||0;
      let action=assistant?'staff-listen':'staff-instructions';
      if(active){
        const v=cue.variant;
        if(cue.kind==='timeout'&&v==='tactical'){action=assistant?(t<2.3?'staff-listen':'staff-talk'):'staff-timeout';}
        else if(v==='heated'){action=assistant?(t<1.6?'staff-argue':'staff-shout'):(t<1.6?'staff-shout':'staff-argue');}
        else if(v==='discussion')action=assistant?(t<2.1?'staff-talk':'staff-listen'):(t<2.1?'staff-listen':'staff-instructions');
        else if(v==='welcome')action=assistant?'staff-talk':'staff-welcome';
        else if(v==='appeal'||v==='urgent')action=assistant?'staff-argue':'staff-shout';
        else if(v==='celebrate')action=assistant?'staff-applaud':'staff-celebrate';
        else if(v==='applaud')action='staff-applaud';
        else if(v==='reflection')action=assistant?'staff-talk':'staff-reflect';
        const huddle=['timeout','halftime'].includes(cue.kind),talking=huddle||['heated','discussion','reflection','welcome'].includes(v);
        const target=talking&&t<cue.duration*.75?{x:anchor.x+(assistant?0:2.2),z:anchor.z+2}:{x:anchor.x,z:anchor.z+12};
        const desired=Math.atan2(target.x-p.x,target.z-p.z),angle=Math.atan2(p.faceX,p.faceZ),delta=Math.atan2(Math.sin(desired-angle),Math.cos(desired-angle)),next=angle+delta*(1-Math.exp(-dt*5));
        p.faceX=Math.sin(next);p.faceZ=Math.cos(next);p.watch(target);
        p.action={name:action,duration:cue.duration,time:Math.min(t,cue.duration),context:{}};
      }else{
        const cycle=(time+(assistant?2.1:0))%7,gesture=cycle<2.0?(assistant?'staff-listen':'staff-instructions'):cycle<3.4?'staff-talk':null;
        p.x=anchor.x+Math.sin(time*.45+(assistant?1.5:0))*.16;p.z=anchor.z+Math.cos(time*.35+(assistant?1.5:0))*.08;p.gait=Math.abs(Math.sin(time*.45))*1.2;
        p.action=gesture?{name:gesture,duration:7,time:cycle,context:{}}:null;p.watch(match?.ball||{x:0,z:0});
      }
      model.update(time,false,dt,quality,camera.position.distanceTo(model.root.position));
    }
    for(const actor of this.benchActors){
      const {team,index,count,player:p,model}=actor,seat=this.seatPosition(team,index,count),homeCue=cue?.team===team;
      p.x=seat.x;p.z=seat.z;p.vx=p.vz=0;p.faceX=0;p.faceZ=1;p.watch({x:sidelineAnchor(team).x,z:sidelineAnchor(team).z+1.5});
      if(homeCue&&cue.kind==='halftime'&&cue.variant==='water'&&index%3===0)p.action={name:'bench-drink',duration:cue.duration,time:Math.min(cue.time,cue.duration),context:{}};
      else if(homeCue&&['halftime','timeout','substitution'].includes(cue.kind))p.action={name:'bench-talk',duration:cue.duration,time:Math.min(cue.time,cue.duration),context:{}};
      else{const beat=(time+index*1.17)%8;p.action=beat<1.3?{name:'bench-talk',duration:1.3,time:beat,context:{}}:{name:'bench-sit',duration:8,time:beat,context:{}};}
      model.update(time,false,dt,quality,camera.position.distanceTo(model.root.position));
    }
    if(this.huddle&&cue?.id===this.huddle.id){
      for(const {player:p,index} of this.huddle.actors){const drink=cue.kind==='halftime'&&cue.variant==='water'&&index%3===0;p.action={name:drink?'team-drink':'team-talk',duration:cue.duration,time:Math.min(cue.time,cue.duration),context:{}};p.vx=p.vz=0;}
    }else if(this.huddle&&!cue)this.restoreHuddle();
    if(this.visitor&&cue){
      const {player:p,model,seat}=this.visitor,a=sidelineAnchor(cue.team),walk=smooth((cue.time-.25)/3.0),start={x:a.x-3.8,z:a.z+5.5};
      p.x=start.x+(seat.x-start.x)*walk;p.z=start.z+(seat.z-start.z)*walk;const turn=smooth((walk-.72)/.24);p.faceX=.15*(1-turn);p.faceZ=-1+2*turn;p.lookX=p.faceX;p.lookZ=p.faceZ;p.vx=(seat.x-start.x)*.8;p.vz=walk<.98?-1.8:0;p.gait=cue.time*4.6;
      p.action=walk>.9?{name:'bench-sit',duration:cue.duration,time:Math.max(0,cue.time-3.2),context:{}}:null;
      model.update(time,false,dt,quality,camera.position.distanceTo(model.root.position));
    }
  }
  dispose(){this.restoreHuddle();for(const s of this.staff){this.scene.remove(s.model.root);s.model.dispose();}this.staff=[];this.clearBench();this.clearVisitor();this.cueId=null;}
}
export function sidelineCamera(camera,cue){
  const a=sidelineAnchor(cue.team),t=cue.time;
  const weight=smooth(t/.8)*(1-smooth((t-cue.duration)/SIDELINE_RETURN));
  const change=smooth((t-1.3)/1.8),sub=cue.kind==='substitution',huddle=['timeout','halftime'].includes(cue.kind);
  camera.position.lerp(new T.Vector3(a.x+(sub?-5:huddle?-4:6)-change*1.4,huddle?5.1:4.2,a.z+(huddle?13.4:10.8)-change),weight);
  camera.target.lerp(new T.Vector3(a.x+(sub?-.7:0),huddle?1.65:2.05,a.z+(huddle?1.5:.4)),weight);
  return weight;
}
