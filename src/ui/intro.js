import { escapeHTML as e } from '../config.js';
import { appearanceFor } from '../engine/appearance.js';
import { kitSwatch } from '../kits.js';
import { teamOverall } from '../ratings.js';
export const introStage=t=>t<1.6?'stadium':t<3.2?'versus':t<6.4?'user':t<8.1?'cpu':t<9.8?'watch':'walk';
const roles={GK:'GOALKEEPER',DEF:'DEFENDER',MID:'MIDFIELDER',FWD:'FORWARD'};
function card(p,team,index,watch=false){
  const a=appearanceFor(p.id);
  return '<article class="intro-card slot-'+p.slot+(watch?' watch-card':'')+'" data-order="'+index+'" style="--team-color:'+e(team.kit)+'"><div class="card-top"><b>'+e(p.data.overall??'—')+'<small>OVR</small></b><img src="'+e(team.logo)+'" alt=""></div><div class="card-avatar" style="--skin:'+a.skin+';--hair:'+a.hair+';--jersey:'+kitSwatch(team.uniform||{primary:team.kit})+'"><i class="avatar-shirt"></i><i class="avatar-neck"></i><i class="avatar-head"><b></b></i><i class="avatar-hair hair-'+a.hairstyle+'"></i><span>'+e(p.jersey??'LSL')+'</span></div><div class="card-name"><strong>'+e(p.name)+'</strong><span>'+roles[p.role]+' · '+e(p.jersey==null?'LSL':'#'+p.jersey)+'</span><small>'+e(p.data.playstyle?.label||'')+'</small></div></article>';
}
export class MatchIntro{
  constructor(){this.root=document.getElementById('intro-content');this.match=null;this.stage='';}
  update(match){
    if(match.phase!=='intro')return;
    if(this.match!==match){this.match=match;this.stage='';}
    const stage=introStage(match.phaseTime),teams=match.teams;
    document.getElementById('intro-progress').style.width=(match.phaseTime/14*100)+'%';
    document.getElementById('intro-overlay').dataset.stage=stage;
    if(stage!==this.stage){
      this.stage=stage;
      if(stage==='stadium')this.root.innerHTML='<div class="intro-establish"><span class="eyebrow">LANTERN SOCCER LEAGUE · '+e(teams[0].season)+'</span><h1>THE LIGHTS<br>ARE YOURS.</h1><p>GRENOBLE FIELD <i>•</i> 7v7 KICKOFF</p></div>';
      if(stage==='versus')this.root.innerHTML='<div class="intro-versus">'+teams.map((t,i)=>'<article><span class="tag">'+(i?'CPU':'YOU')+'</span><img src="'+e(t.logo)+'" alt="'+e(t.name)+' badge"><h2>'+e(t.name)+'</h2><span>2 — 2 — 2 · '+(teamOverall(match.active(i))??'—')+' TEAM OVR</span></article>'+(i?'':'<strong>VS</strong>')).join('')+'</div>';
      if(stage==='user'||stage==='cpu'){
        const side=stage==='user'?0:1,team=teams[side];
        this.root.innerHTML='<div class="intro-squad"><header><span class="tag">'+(side?'CPU':'YOU')+'</span><h2>'+e(team.name)+'</h2><span>THE STARTING SEVEN · 2 — 2 — 2 · '+(teamOverall(match.active(side))??'—')+' OVR</span></header><div class="intro-formation">'+match.active(side).map((p,i)=>card(p,team,i)).join('')+'</div></div>';
      }
      if(stage==='watch')this.root.innerHTML='<div class="intro-watch"><header><span class="eyebrow">MAKE THE DIFFERENCE</span><h2>PLAYERS TO WATCH</h2></header><div>'+teams.map((team,i)=>{const p=match.active(i).filter(p=>p.role!=='GK').sort((a,b)=>(b.data.overall||0)-(a.data.overall||0))[0];return '<section><span class="tag">'+(i?'CPU':'YOU')+'</span>'+card(p,team,0,true)+'</section>';}).join('')+'</div></div>';
      if(stage==='walk')this.root.innerHTML='<div class="intro-walk"><span class="eyebrow">YOUR STARTING SEVEN</span><h2>TAKE YOUR POSITION.</h2><p>'+e(teams[0].name)+' <b>VS</b> '+e(teams[1].name)+'</p></div>';
    }
    if(stage==='user'||stage==='cpu'){
      const start=stage==='user'?3.2:6.4,interval=stage==='user'?.27:.13;
      this.root.querySelectorAll('[data-order]').forEach(c=>c.classList.toggle('revealed',match.phaseTime-start>=Number(c.dataset.order)*interval));
    }
  }
}
