const clampText=(value,max,fallback)=>String(value||'').trim().replace(/[<>]/g,'').slice(0,max)||fallback;
const hex=value=>/^#[0-9a-f]{6}$/i.test(String(value||''))?String(value).toUpperCase():null;
export function onlineTeamIdentity(input={},catalog=[]){
 const team=catalog.find(item=>item.id===input.teamId);
 if(!team)throw Error('Choose a team from this season.');
 const primary=hex(input.primary),secondary=hex(input.secondary);
 if(!primary||!secondary)throw Error('Choose valid home kit colours.');
 const logoTeam=catalog.find(item=>item.id===input.logoTeamId)||team;
 const designs=['solid','stripe','sash','gradient','sleeves'];
 const formations=['2-2-2','2-3-1','3-2-1','3-1-2','1-3-2'];
 return {teamId:team.id,name:clampText(input.name,24,team.name),logo:logoTeam.logo,logoTeamId:logoTeam.id,primary,secondary,design:designs.includes(input.design)?input.design:'stripe',formation:formations.includes(input.formation)?input.formation:'2-2-2'};
}
export function roundRobinFixtures(members){
 const fixtures=[];let number=1;
 for(let home=0;home<members.length;home++)for(let away=home+1;away<members.length;away++)fixtures.push({id:`league-${number++}`,stage:'regular',homeUid:members[home].uid,awayUid:members[away].uid,status:'pending',playReady:{},result:null});
 return fixtures;
}
export function seasonStandings(season){
 const rows=(season.members||[]).map(member=>({uid:member.uid,name:season.teams?.[member.uid]?.name||member.username,teamId:season.teams?.[member.uid]?.teamId||'',played:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}));
 const byUid=new Map(rows.map(row=>[row.uid,row]));
 for(const fixture of season.fixtures||[]){if(fixture.stage!=='regular'||fixture.status!=='played'||!fixture.result)continue;const home=byUid.get(fixture.homeUid),away=byUid.get(fixture.awayUid);if(!home||!away)continue;const [hg,ag]=fixture.result.score;home.played++;away.played++;home.gf+=hg;home.ga+=ag;away.gf+=ag;away.ga+=hg;if(hg>ag){home.w++;home.pts+=3;away.l++;}else if(ag>hg){away.w++;away.pts+=3;home.l++;}else{home.d++;away.d++;home.pts++;away.pts++;}}
 return rows.sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.name.localeCompare(b.name));
}
export function createPlayoffFixtures(season){
 const ranked=seasonStandings(season),qualifiers=ranked.slice(0,Math.min(4,ranked.length));
 if(qualifiers.length<2)return [];
 if(qualifiers.length<4)return [{id:'final',stage:'final',homeUid:qualifiers[0].uid,awayUid:qualifiers[1].uid,status:'pending',playReady:{},result:null}];
 return [
  {id:'semi-1',stage:'semifinal',homeUid:qualifiers[0].uid,awayUid:qualifiers[3].uid,status:'pending',playReady:{},result:null},
  {id:'semi-2',stage:'semifinal',homeUid:qualifiers[1].uid,awayUid:qualifiers[2].uid,status:'pending',playReady:{},result:null}
 ];
}
export function advancePlayoffs(season){
 const semis=(season.fixtures||[]).filter(f=>f.stage==='semifinal');
 if(season.stage==='playoffs'&&semis.length===2&&semis.every(f=>f.status==='played')&&!(season.fixtures||[]).some(f=>f.stage==='final')){
  const winner=f=>f.result.score[0]===f.result.score[1]?f.result.shootoutWinner===0?f.homeUid:f.awayUid:f.result.score[0]>f.result.score[1]?f.homeUid:f.awayUid;
  season.fixtures.push({id:'final',stage:'final',homeUid:winner(semis[0]),awayUid:winner(semis[1]),status:'pending',playReady:{},result:null});
 }
 const final=(season.fixtures||[]).find(f=>f.stage==='final');
 if(final?.status==='played'){
  const homeWin=final.result.score[0]===final.result.score[1]?final.result.shootoutWinner===0:final.result.score[0]>final.result.score[1];
  season.stage='complete';season.championUid=homeWin?final.homeUid:final.awayUid;
 }
 return season;
}
export function recordSeasonResult(season,fixtureId,report,now=Date.now()){
 const fixture=(season.fixtures||[]).find(item=>item.id===fixtureId);
 if(!fixture||fixture.status!=='pending')throw Error('This season fixture has already been completed.');
 fixture.status='played';fixture.playReady={};fixture.completedAt=now;
 fixture.result={score:[...report.score],shootoutWinner:report.shootout?.winner??null,stats:structuredClone(report.stats||{}),goals:structuredClone(report.goals||[]),playerOfMatch:structuredClone(report.playerOfMatch||null)};
 if(fixture.stage==='regular'&&(season.fixtures||[]).filter(item=>item.stage==='regular').every(item=>item.status==='played')){
  season.stage='playoffs';
  season.fixtures.push(...createPlayoffFixtures(season));
  if(!season.fixtures.some(item=>item.stage==='semifinal'||item.stage==='final'))season.stage='complete';
 }
 advancePlayoffs(season);
 season.activeFixtureId=season.fixtures.find(item=>item.status==='pending')?.id||null;
 season.activeRoomCode=null;season.updatedAt=now;
 return season;
}
