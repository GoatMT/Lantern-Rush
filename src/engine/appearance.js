// Stable generic avatars. These are not claimed likenesses of real LSL players.
export function appearanceFor(id='player'){
  let hash=2166136261;for(const c of id)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
  const skin=['#e7bd9d','#ce9a74','#af7855','#8b563b','#683f2e','#d7a17d'];
  return {skin:skin[hash%skin.length],hair:['#211e22','#39291f','#171d23','#594336'][(hash>>>5)%4],
    hairstyle:(hash>>>9)%5,build:.93+((hash>>>13)%5)*.045,height:.97+((hash>>>17)%5)*.015,beard:(hash>>>21)%3===0};
}
