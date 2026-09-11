// Stable generic avatars. These are not claimed likenesses of real LSL players.
export function appearanceFor(id='player'){
  let hash=2166136261;for(const c of id)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
  const skin=['#ddb596','#c7926d','#ad7654','#87563f','#684531','#cea17e','#bc8a67','#9b6c4e'];
  return {skin:skin[hash%skin.length],hair:['#24211f','#362b25','#191d21','#584332'][(hash>>>5)%4],
    hairstyle:(hash>>>9)%5,build:.94+((hash>>>13)%5)*.035,height:.97+((hash>>>17)%5)*.015,beard:(hash>>>21)%3===0,
    boots:['#f0eee4','#20323d','#bd653e','#bcc67a'][(hash>>>25)%4]};
}
