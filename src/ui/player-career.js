import {escapeHTML as e} from '../config.js';
import {createLineup} from '../data.js';
import {buildSeasonFixtures} from '../season-data.js';
import {playerLabel} from '../player-label.js';

const $=id=>document.getElementById(id);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const positionName=player=>player.position||player.role||'Field player';
const rosterOf=team=>[...(team?.lineup||[]),...(team?.bench||[])].filter((player,index,all)=>player?.id&&!all.slice(0,index).some(other=>other.id===player.id));

export class PlayerCareerMenu{
  constructor(app){
    this.app=app;this.stage='choose';this.teamId='';this.playerId='';this.state=null;
    this.flow=$('career-flow');
    this.flow?.addEventListener('click',event=>this.onClick(event));
    this.flow?.addEventListener('change',event=>this.onChange(event));
  }
  teams(year=this.app.settings.value.season){return this.app.data.get(year)||[];}
  team(id=this.teamId,year=this.app.settings.value.season){return this.teams(year).find(team=>team.id===id)||null;}
  player(team=this.team(),id=this.playerId){return rosterOf(team).find(player=>player.id===id)||null;}
  prepare(){
    if(this.app.mode!=='career')return;
    const saved=this.app.settings.value.playerCareer;
    if(saved&&saved.year&&saved.teamId&&saved.playerId&&this.team(saved.teamId,String(saved.year))&&this.player(this.team(saved.teamId,String(saved.year)),saved.playerId)){
      this.state=saved;this.state.results||={};this.state.stats||={appearances:0,goals:0,assists:0,shots:0,passes:0,tackles:0,saves:0};
      this.app.settings.value.season=String(saved.year);this.teamId=saved.teamId;this.playerId=saved.playerId;this.stage='hub';this.app.selected.user=this.team();
    }else{this.state=null;this.teamId=this.teams()[0]?.id||'';this.playerId=rosterOf(this.team())[0]?.id||'';this.stage='choose';}
  }
  fixtureList(state=this.state){
    if(!state)return[];
    return state.fixtures||buildSeasonFixtures(this.teams(state.year),state.year).filter(f=>f.homeTeamId===state.teamId||f.awayTeamId===state.teamId);
  }
  nextFixture(){return this.fixtureList().find(f=>!this.state.results?.[f.id])||null;}
  save(){if(this.state){this.app.settings.value.playerCareer=this.state;this.app.settings.save();}}
  opponent(fixture=this.nextFixture()){
    if(!fixture)return null;
    const id=fixture.homeTeamId===this.state.teamId?fixture.awayTeamId:fixture.homeTeamId;
    return this.team(id,this.state.year);
  }
  onChange(event){
    if(event.target.id==='career-team'){
      this.teamId=event.target.value;this.playerId=rosterOf(this.team())[0]?.id||'';this.render();
    }else if(event.target.id==='career-player')this.playerId=event.target.value;
  }
  onClick(event){
    const button=event.target.closest('[data-career-action]');if(!button)return;
    const action=button.dataset.careerAction;
    if(action==='create')this.create();
    if(action==='play')this.play();
    if(action==='next-season')this.nextSeason();
    if(action==='new'){
      if(!confirm('Start a new Road to LSL career? This replaces the career saved on this device.'))return;
      this.stage='choose';this.teamId=this.teams()[0]?.id||'';this.playerId=rosterOf(this.team())[0]?.id||'';this.render();
    }
  }
  create(){
    const year=String(this.app.settings.value.season),team=this.team(this.flow.querySelector('#career-team')?.value,year),player=this.player(team,this.flow.querySelector('#career-player')?.value);
    if(!team||!player)return;
    const fixtures=buildSeasonFixtures(this.teams(year),year).filter(f=>f.homeTeamId===team.id||f.awayTeamId===team.id);
    this.state={year,teamId:team.id,playerId:player.id,xp:0,level:1,careerSeason:1,results:{},fixtures,stats:{appearances:0,goals:0,assists:0,shots:0,passes:0,tackles:0,saves:0},createdAt:Date.now()};
    this.teamId=team.id;this.playerId=player.id;this.stage='hub';this.app.selected.user=team;this.app.settings.value.playerCareer=this.state;this.app.settings.save();this.app.saveSelection();this.render();
  }
  careerTeam(team=this.team()){
    if(!team||!this.state)return team;
    const base=this.app.formation?.teamForMatch(team)||{...team},all=rosterOf(base),player=all.find(candidate=>candidate.id===this.state.playerId);
    if(!player)return base;
    let lineup=[...(base.lineup||[])];
    const existing=lineup.findIndex(candidate=>candidate.id===player.id);
    if(existing<0){
      const goalkeeper=/goal|keeper/i.test(positionName(player));
      const exact=lineup.map((candidate,index)=>({candidate,index})).filter(item=>/goal|keeper/i.test(positionName(item.candidate))===goalkeeper);
      const target=(exact.length?exact:lineup.map((candidate,index)=>({candidate,index})).filter(item=>item.candidate.role!=='GK')).sort((a,b)=>(Number(a.candidate.overall)||0)-(Number(b.candidate.overall)||0))[0];
      if(target){lineup[target.index]={...player,role:target.candidate.role,slot:target.index};}
    }
    lineup=lineup.slice(0,7).map((candidate,index)=>{
      const copy={...candidate,slot:index};
      if(candidate.id===this.state.playerId){
        const boosts=Math.min(.18,Math.max(0,(this.state.level||1)-1)*.025),ratings={...(candidate.gameplayProfile?.ratings||{})};
        for(const key of ['speed','shooting','passing','dribbling','defending','goalkeeping'])ratings[key]=Math.min(1.25,(Number(ratings[key])||1)+boosts);
        copy.gameplayProfile={...(candidate.gameplayProfile||{}),ratings};
      }
      return copy;
    });
    const used=new Set(lineup.map(candidate=>candidate.id));
    return {...base,lineup,bench:all.filter(candidate=>!used.has(candidate.id))};
  }
  play(){
    const fixture=this.nextFixture(),opponent=this.opponent(fixture),team=this.team(this.state?.teamId,this.state?.year);
    if(!fixture||!opponent||!team)return;
    this.app.selected={user:team,cpu:opponent};this.app.saveSelection();
    this.app.careerFixtureId=fixture.id;this.app.start();
  }
  nextSeason(){
    if(this.nextFixture())return;
    this.state.careerSeason=(this.state.careerSeason||1)+1;this.state.results={};this.state.lastResult=null;this.save();this.render();
  }
  afterGame(match){
    if(!match?.career||match.careerProgressSaved)return;
    const state=this.state,fixture=this.fixtureList().find(item=>item.id===match.career.fixtureId),player=[...(match.players||[]),...(match.archive||[])].find(candidate=>candidate.team===0&&candidate.id===state?.playerId);
    if(!state||!fixture||state.results?.[fixture.id]||!player)return;
    const won=match.stats[0].goals>match.stats[1].goals,tie=match.stats[0].goals===match.stats[1].goals;
    const rating=clamp(6.0+player.goals*1.5+player.assists*1.05+player.onTarget*.18+player.tackles*.12+player.saves*.2-Math.max(0,player.yellow)*.3-(player.sentOff?2:0),3,10);
    const xp=Math.round(65+rating*8+(won?20:tie?8:0));
    state.xp=(state.xp||0)+xp;state.level=Math.floor(state.xp/300)+1;
    state.stats.appearances=(state.stats.appearances||0)+1;for(const key of ['goals','assists','shots','passes','tackles','saves'])state.stats[key]=(state.stats[key]||0)+(Number(player[key])||0);
    state.results[fixture.id]={fixtureId:fixture.id,opponent:match.teams[1].name,score:[match.stats[0].goals,match.stats[1].goals],rating:Number(rating.toFixed(1)),xp,player:{goals:player.goals,assists:player.assists,shots:player.shots,passes:player.passes,tackles:player.tackles,saves:player.saves},date:Date.now()};
    state.lastResult=state.results[fixture.id];match.careerResult={rating:Number(rating.toFixed(1)),xp,level:state.level,playerId:state.playerId};this.app.settings.value.playerCareer=state;this.app.settings.save();match.careerProgressSaved=true;
  }
  render(){
    const active=this.app.mode==='career';this.flow.hidden=!active;
    document.querySelector('.versus-layout').hidden=active;document.querySelector('.selection-footer').hidden=active;
    document.querySelector('.selection-heading').hidden=active;document.querySelector('.selection>.topbar .season-label').hidden=active;
    if(!active)return;
    const selection=$('selection');selection.dataset.mode='career';$('selection-mode').textContent='PLAYER CAREER';
    if(this.stage==='choose')this.renderChoose();else this.renderHub();
  }
  renderChoose(){
    const year=String(this.app.settings.value.season),teams=this.teams(year),team=this.team(this.teamId,year)||teams[0],players=rosterOf(team);
    if(!players.some(player=>player.id===this.playerId))this.playerId=players[0]?.id||'';
    this.flow.innerHTML='<section class="career-flow-card"><span class="eyebrow">ROAD TO LSL · PLAYER CAREER · '+e(year)+'</span><h2>YOUR CAREER STARTS HERE.</h2><p>Pick a real LSL player. Take control of them on the pitch, play through the season, and build their career with every match.</p><div class="career-pick-grid"><label>CLUB<select id="career-team">'+teams.map(item=>'<option value="'+e(item.id)+'" '+(item.id===team?.id?'selected':'')+'>'+e(item.name)+'</option>').join('')+'</select></label><label>PLAYER<select id="career-player">'+players.map(player=>'<option value="'+e(player.id)+'" '+(player.id===this.playerId?'selected':'')+'>'+e(playerLabel(player))+' · '+e(positionName(player))+' · '+e(String(player.overall??'—'))+' OVR</option>').join('')+'</select></label></div><p class="career-data-note">Official player and roster data · '+players.length+' available players</p><div class="career-flow-actions"><button class="primary" data-career-action="create">START CAREER →</button></div></section>';
  }
  renderHub(){
    const state=this.state,team=this.team(state?.teamId,state?.year),player=this.player(team,state?.playerId),fixture=this.nextFixture(),opponent=this.opponent(fixture),played=this.fixtureList().filter(item=>state.results?.[item.id]),stats=state.stats||{};
    const schedule=this.fixtureList().map((item,index)=>{const result=state.results?.[item.id],enemy=this.team(item.homeTeamId===state.teamId?item.awayTeamId:item.homeTeamId,state.year);return '<div class="career-fixture '+(!result&&item.id===fixture?.id?'next':'')+'"><span>MATCHDAY '+(index+1)+'</span><strong>'+e(enemy?.name||'Opponent')+'</strong><b>'+(result?result.score.join(' — ')+' · '+result.rating+'★':'UP NEXT')+'</b></div>';}).join('');
    this.flow.innerHTML='<section class="career-flow-card"><div class="career-hub-head"><div><span class="eyebrow">ROAD TO LSL · CAREER SEASON '+e(String(state.careerSeason||1))+' · '+e(state.year)+' PLAYER DATA</span><h2>'+e(player?.name||'PLAYER')+'</h2><p>'+e(team?.name||'LSL Club')+' · '+e(positionName(player||{}))+' · '+e(String(player?.overall??'—'))+' OFFICIAL OVR</p></div><span class="career-level">LEVEL <b>'+e(String(state.level||1))+'</b></span></div><div class="career-progress"><span><b>CAREER XP</b><strong>'+e(String(state.xp||0))+'</strong></span><div><i style="width:'+((state.xp||0)%300/3)+'%"></i></div><small>Next level · '+(300-(state.xp||0)%300)+' XP</small></div><div class="career-summary"><div><small>APPEARANCES</small><strong>'+e(String(stats.appearances||0))+'</strong></div><div><small>GOALS</small><strong>'+e(String(stats.goals||0))+'</strong></div><div><small>ASSISTS</small><strong>'+e(String(stats.assists||0))+'</strong></div><div><small>SEASON FIXTURES</small><strong>'+played.length+' / '+this.fixtureList().length+'</strong></div></div>'+(fixture?'<div class="career-next"><span class="eyebrow">NEXT MATCH · MATCHDAY '+(played.length+1)+'</span><strong>'+e(team?.name||'Your club')+' vs '+e(opponent?.name||'Opponent')+'</strong><small>Play as '+e(playerLabel(player||{}))+' · teammates are controlled by the game</small><button class="primary" data-career-action="play">PLAY NEXT MATCH →</button></div>':'<div class="career-next career-complete"><span class="eyebrow">SEASON COMPLETE</span><strong>Your season is in the books.</strong><small>'+played.length+' appearances · '+(stats.goals||0)+' goals · '+(stats.assists||0)+' assists</small><button class="primary" data-career-action="next-season">START NEXT CAREER SEASON →</button></div>')+'<div class="career-dashboard-columns"><section class="career-panel"><h3>SEASON SCHEDULE</h3><div class="career-schedule">'+schedule+'</div></section><section class="career-panel"><h3>CAREER PROGRESSION</h3><p>Every completed appearance earns career XP. Level-ups improve this player’s game-only attributes while the published LSL rating stays unchanged.</p><div class="career-growth">CAREER ATTRIBUTE BOOST <b>+'+Math.round(Math.min(.18,Math.max(0,(state.level||1)-1)*.025)*100)+'%</b></div></section></div><div class="career-flow-actions"><button class="secondary" data-career-action="new">START A NEW CAREER</button></div></section>';
  }
}
