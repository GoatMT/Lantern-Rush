import test from 'node:test';
import assert from 'node:assert/strict';
import {SeasonMenu,seasonTradeValueBand} from '../src/ui/season-mode.js';

const squad=(teamId,name,count=7)=>({id:teamId,name,roster:Array.from({length:count},(_,index)=>({id:`${teamId}-${index}`,name:`Player ${index}`,position:index?'FWD':'Goalkeeper',overall:70+index})),lineup:[],bench:[]});

test('trade value allows a small OVR gap and rejects an unbalanced offer',()=>{
 assert.deepEqual(seasonTradeValueBand(84,89),{outValue:84,inValue:89,allowed:9,difference:5,fair:true});
 assert.equal(seasonTradeValueBand(80,91).fair,false);
 assert.equal(seasonTradeValueBand(50,55).fair,true);
 assert.equal(seasonTradeValueBand(50,57).fair,false);
});

test('trade picker limits incoming cards to the selected club while Find Players knows current ownership',()=>{
 const teams=[squad('home','Home'),squad('north','North'),squad('south','South')];
 const app={settings:{value:{season:'2026',seasonMode:null,seasonFeatures:{}},set(){},save(){}},data:{get:()=>teams}};
 const menu=new SeasonMenu(app);menu.teamId='home';menu.state={trades:[]};
 const options=menu.tradeOptions('south');
 assert.equal(options.target.id,'south');
 assert.equal(options.incoming.length,7);
 assert.ok(options.incoming.every(player=>player.fromTeamId==='south'));
 assert.equal(options.allPlayers.find(player=>player.id==='north-0').currentTeamName,'North');
});
