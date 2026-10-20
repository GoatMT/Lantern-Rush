import test from 'node:test';
import assert from 'node:assert/strict';
import {onlineTeamIdentity,roundRobinFixtures,seasonStandings,recordSeasonResult} from '../functions/engine/online-season.js';
import catalog from '../functions/catalog.json' with {type:'json'};

test('online club identity accepts only LSL badges and valid kit colors',()=>{
 const clubs=catalog['2026'],team=clubs[0],other=clubs[1];
 const identity=onlineTeamIdentity({teamId:team.id,name:'Friends FC',logoTeamId:other.id,primary:'#123456',secondary:'#ABCDEF',design:'stripe'},clubs);
 assert.deepEqual({teamId:identity.teamId,name:identity.name,logo:identity.logo,primary:identity.primary,secondary:identity.secondary,design:identity.design},{teamId:team.id,name:'Friends FC',logo:other.logo,primary:'#123456',secondary:'#ABCDEF',design:'stripe'});
 assert.throws(()=>onlineTeamIdentity({teamId:'unknown',primary:'#112233',secondary:'#445566'},clubs),/Choose a team/);
 assert.throws(()=>onlineTeamIdentity({teamId:team.id,primary:'url(evil)',secondary:'#445566'},clubs),/valid home kit/);
});

test('2 to 8 team round robins pair each opponent exactly once',()=>{
 for(let count=2;count<=8;count++){
  const members=Array.from({length:count},(_,i)=>({uid:'user-'+i,username:'User'+i})),fixtures=roundRobinFixtures(members),pairs=new Set(fixtures.map(f=>[f.homeUid,f.awayUid].sort().join('|')));
  assert.equal(fixtures.length,count*(count-1)/2);assert.equal(pairs.size,fixtures.length);assert.equal(fixtures.every(f=>f.status==='pending'&&f.stage==='regular'),true);
 }
});

test('regular season standings create and advance a playoff bracket',()=>{
 const members=Array.from({length:4},(_,i)=>({uid:'user-'+i,username:'User'+i})),teams=Object.fromEntries(members.map((member,i)=>[member.uid,{name:'Club '+i,teamId:'team-'+i}])),season={members,teams,stage:'regular',fixtures:roundRobinFixtures(members),activeFixtureId:null};
 for(const [index,fixture]of season.fixtures.slice().entries())recordSeasonResult(season,fixture.id,{score:index===0?[4,0]:[2,1],stats:{},goals:[]},index+1);
 assert.equal(season.stage,'playoffs');assert.equal(season.fixtures.filter(f=>f.stage==='semifinal').length,2);assert.equal(seasonStandings(season).length,4);
 for(const fixture of season.fixtures.filter(f=>f.stage==='semifinal'))recordSeasonResult(season,fixture.id,{score:[3,0],stats:{},goals:[]},10);
 const final=season.fixtures.find(f=>f.stage==='final');assert.ok(final);recordSeasonResult(season,final.id,{score:[2,1],stats:{},goals:[]},11);
 assert.equal(season.stage,'complete');assert.equal(season.championUid,final.homeUid);assert.equal(season.activeFixtureId,null);
});
