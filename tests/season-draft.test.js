import test from 'node:test';
import assert from 'node:assert/strict';
import {SeasonMenu,draftPickError} from '../src/ui/season-mode.js';

const roster=(prefix,includeKeepers=true)=>[
  ...(includeKeepers?[{id:prefix+'-gk1',name:prefix+' Keeper One',position:'Goalkeeper',overall:80},{id:prefix+'-gk2',name:prefix+' Keeper Two',position:'Goalkeeper',overall:76}]:[]),
  ...['Defender','Defender','Midfielder','Midfielder','Forward','Forward','Forward','Forward'].map((position,index)=>({id:prefix+'-'+index,name:prefix+' Player '+index,position,overall:70-index}))
];

test("fantasy draft accepts deep rosters and caps the user keepers at two",()=>{
  assert.equal(draftPickError(7,1,6,false),'');
  assert.equal(draftPickError(8,2,6,false),'');
  assert.equal(draftPickError(8,2,6,true),'Your roster already has two goalkeepers.');
  const menu=new SeasonMenu({settings:{value:{season:'2026'}}});
  assert.equal(menu.isDraftKeeper({position:'Player',role:'Goalkeeper'}),true);
});

test('fantasy draft uses the editable team order for snake rounds',()=>{
  const a={id:'a',name:'Club A'},b={id:'b',name:'Club B'},c={id:'c',name:'Club C'};
  const menu=new SeasonMenu({settings:{value:{season:'2026'}}});
  menu.teamId='b';menu.state={draft:{teamOrder:['b','c','a']}};menu.draftTeams=()=>[a,b,c];
  assert.equal(menu.draftOrder(0).id,'b');
  assert.equal(menu.draftOrder(1).id,'c');
  assert.equal(menu.draftOrder(2).id,'a');
  assert.equal(menu.draftOrder(3).id,'a');
  assert.equal(menu.draftOrder(4).id,'c');
  assert.equal(menu.draftOrder(5).id,'b');
});

test('a completed fantasy draft replaces every club roster with unique drafted players',()=>{
  const teams=[{id:'a',name:'Club A',roster:roster('a')},{id:'b',name:'Club B',roster:roster('b',false)}];
  const picks=teams.flatMap((team,index)=>team.roster.map(player=>({teamId:index===0?'a':'b',playerId:player.id})));
  const menu=new SeasonMenu({settings:{value:{season:'2026'},seasonTeam:'a'},data:{get:()=>teams}});
  menu.teamId='a';menu.state={draft:{picks}};
  const drafted=menu.teams(),ids=drafted.flatMap(team=>team.roster.map(player=>player.id));
  assert.equal(drafted.find(team=>team.id==='a').roster.length,10);
  assert.equal(drafted.find(team=>team.id==='b').roster.length,8);
  assert.equal(drafted.every(team=>team.lineup.length===7),true);
  assert.equal(new Set(ids).size,18);
  assert.equal(ids.length,18);
});

test('fantasy draft squad renders all picks beyond a starting seven',()=>{
  const team={id:'user',name:'Your Club',division:'SENIORS'};
  const selected=Array.from({length:10},(_,index)=>({id:'p'+index,name:'Drafted Player '+index,position:index<2?'Goalkeeper':'Forward',overall:70}));
  const menu=new SeasonMenu({settings:{value:{season:'2026'}}});
  menu.state={draft:{picks:Array.from({length:10},(_,index)=>({pickNumber:index+1,round:1,teamId:'user',teamName:'Your Club',playerId:'p'+index,playerName:'Drafted Player '+index,position:'Forward',overall:70})),totalPlayers:20,teamOrder:['user']}};
  menu.teamId='user';menu.draftTeams=()=>[team];menu.draftPlayers=()=>selected;menu.draftPool=()=>[];menu.draftUserPool=()=>[];menu.draftComplete=()=>false;menu.draftOrder=()=>team;menu.team=()=>team;
  const markup=menu.draftMarkup();
  assert.match(markup,/10 YOUR PICKS/);
  assert.equal((markup.match(/season-draft-picked filled/g)||[]).length,10);
  assert.match(markup,/CONTINUE TO LINEUP/);
});
