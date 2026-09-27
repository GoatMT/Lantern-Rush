export function appearanceFor(player='player'){
 const id=typeof player==='string'?player:(player?.id||'player');let hash=2166136261;for(const c of id)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
 const skin=['#ddb596','#c7926d','#ad7654','#87563f','#684531','#cea17e','#bc8a67','#9b6c4e'],physical=typeof player==='object'?player?.gameplayProfile?.physical||{}:{};
 const build=.94+((hash>>>13)%5)*.035,height=.97+((hash>>>17)%5)*.015;
 return {skin:skin[hash%skin.length],hair:['#24211f','#362b25','#191d21','#584332'][(hash>>>5)%4],hairstyle:(hash>>>9)%5,build:build*(physical.build||1),height:height*(physical.height||1),glasses:physical.glasses===true,beard:(hash>>>21)%3===0,boots:['#f0eee4','#20323d','#bd653e','#bcc67a'][(hash>>>25)%4]};
}
