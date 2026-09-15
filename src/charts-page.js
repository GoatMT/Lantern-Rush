import {CloudAccount,MODE_LABELS} from './cloud-account.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number=value=>Number(value)||0;
const formatSeconds=value=>{const total=Math.max(0,number(value));return `${Math.floor(total/60)}:${String(Math.floor(total%60)).padStart(2,'0')}`;};
const appRoot=document.getElementById('charts-app');
const service=new CloudAccount();
let profiles=[],mode='all';
function stats(profile){return profile.modes?.[mode]||profile.stats||{};}
function sorted(){return profiles.map(profile=>({profile,stats:stats(profile)})).sort((a,b)=>number(b.stats.wins)-number(a.stats.wins)||number(b.stats.goals)-number(a.stats.goals)||number(b.stats.shots)-number(a.stats.shots));}
function avatar(profile){return profile.avatarDataUrl||'./assets/lsl-logo.png';}
function recordCards(){
  const records=[
    ['FASTEST OPENING GOAL','fastestOpeningGoal',item=>item?`${formatSeconds(item.seconds)} · ${item.name}${item.jersey!=null?' #'+item.jersey:''}`:'No record yet'],
    ['FASTEST HAT-TRICK','fastestHattrick',item=>item?`${formatSeconds(item.seconds)} · ${item.name}`:'No record yet'],
    ['FASTEST 5-GOAL COMEBACK WIN','fastestFiveGoalComeback',item=>item?`${item.score} · ${item.teams?.join(' vs ')||'LSL match'}`:'No record yet'],
    ['MOST GOALS IN A GAME','mostGoalsGame',item=>item?`${item.goals} · ${item.name}`:'No record yet'],
    ['BIGGEST WIN','biggestWin',item=>item?`${item.score} · ${item.team}`:'No record yet'],
    ['LONGEST WINNING STREAK','longestWinningStreak',item=>item?`${item} matches`:'No record yet']
  ];
  return records.map(([label,key,format])=>{let holder=null;for(const profile of profiles){const value=profile.records?.[key];if(value==null)continue;const current=number(value.seconds??value.margin??value.goals??value);const lower=key==='fastestOpeningGoal'||key==='fastestHattrick'||key==='fastestFiveGoalComeback';if(!holder||(lower?current<number(holder.value.seconds??holder.value):current>number(holder.value.margin??holder.value.goals??holder.value))){holder={profile,value};}}return `<article class="record-holder"><small>${label}</small><strong>${esc(holder?format(holder.value):'No record yet')}</strong><span>${holder?`Held by ${esc(holder.profile.username)}`:'Play a match to claim it'}</span></article>`;}).join('');
}function render(){
  const list=sorted(),top=list.slice(0,3);
  appRoot.innerHTML=`<div class="charts-page"><header class="charts-top"><a class="back" href="./index.html">← LANTERN RUSH</a><div class="charts-top-actions"><a href="./account.html">MY ACCOUNT</a><a href="./index.html#account">SIGN IN</a></div></header><main class="charts-main"><span class="eyebrow">LSL MATCHDAY RECORDS</span><h1>CHARTS</h1><p class="charts-lede">A live leaderboard of every Lantern Rush account. Choose a mode to compare goals, shots, saves and results, then open a player profile for their complete match history.</p><div class="charts-toolbar"><label>COUNTED MODE<select id="charts-mode">${Object.entries(MODE_LABELS).map(([key,label])=>`<option value="${key}" ${key===mode?'selected':''}>${esc(label)}</option>`).join('')}</select></label><span class="charts-status">${profiles.length} player${profiles.length===1?'':'s'} on the chart · Firebase synced</span></div>${top.length?`<section class="podium" aria-label="Top players">${top.map((item,index)=>`<article class="podium-card"><span class="podium-place">${index+1}</span><img src="${esc(avatar(item.profile))}" alt=""><strong>${esc(item.profile.username)}</strong><small>${number(item.stats.wins)} wins · ${number(item.stats.goals)} goals</small></article>`).join('')}</section>`:'<div class="charts-empty">No match records are available yet. Create an account and play the first match.</div>'}<section class="chart-panel"><h2>PLAYER LEADERBOARD</h2><p>Results are ordered by wins, then goals, for the selected mode.</p>${list.length?`<table class="chart-table"><thead><tr><th>#</th><th>PLAYER</th><th>GOALS</th><th>SHOTS</th><th>SAVES</th><th>WINS</th><th>LOSSES</th><th>TIES</th><th>MATCHES</th></tr></thead><tbody>${list.map((item,index)=>`<tr><td>${index+1}</td><td><a href="./account.html?user=${encodeURIComponent(item.profile.uid)}">${esc(item.profile.username)}</a></td><td>${number(item.stats.goals)}</td><td>${number(item.stats.shots)}</td><td>${number(item.stats.saves)}</td><td>${number(item.stats.wins)}</td><td>${number(item.stats.losses)}</td><td>${number(item.stats.ties)}</td><td>${number(item.stats.matches)}</td></tr>`).join('')}</tbody></table>`:'<div class="charts-empty">No players have completed a match in this mode.</div>'}</section><section class="chart-panel"><h2>RECORD HOLDERS</h2><p>Best moments recorded across every game mode.</p><div class="record-holder-grid">${recordCards()}</div></section></main></div>`;
  appRoot.querySelector('#charts-mode')?.addEventListener('change',event=>{mode=event.target.value;render();});
}
service.ready.then(async()=>{try{profiles=await service.getProfiles();render();}catch(error){profiles=[];render('Charts are waiting for the Firebase Firestore rules to be deployed.');}});

