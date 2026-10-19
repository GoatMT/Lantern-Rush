const SKIN_TONES=['#ddb596','#c7926d','#ad7654','#87563f','#684531','#cea17e','#bc8a67','#9b6c4e'];
const HAIR_TONES=['#24211f','#362b25','#191d21','#584332','#6c4931'];
const BOOT_TONES=['#f0eee4','#20323d','#bd653e','#bcc67a'];

function hex(value,fallback){
 const text=String(value||'').trim();
 return /^#[0-9a-f]{6}$/i.test(text)?text:fallback;
}

function traitHas(traits,needle){
 return Array.isArray(traits)&&traits.some(t=>String(t).toLowerCase().includes(needle));
}

/**
 * Return a compact, deterministic appearance profile for a roster player.
 * The mesh is shared by every game mode; profile values are read from the
 * scouting data when present and only fall back to a stable variation for
 * players whose LSL data has not supplied a visual detail yet.
 */
export function appearanceFor(player='player'){
 const id=typeof player==='string'?player:(player?.id||'player');let hash=2166136261;for(const c of id)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
 const profile=typeof player==='object'?player?.gameplayProfile||{}:{};
 const physical=profile.physical||{},traits=profile.traits||[];
 const sourceBuild=Number(physical.build)||1,build=.94+((hash>>>13)%5)*.035,height=.97+((hash>>>17)%5)*.015;
 const requestedHair=String(physical.hairStyle||physical.hairstyle||'').toLowerCase();
 let hairstyle=requestedHair.includes('long')?'long':requestedHair.includes('short')?5:requestedHair.includes('bald')?4:(hash>>>9)%5;
 // Build profiles shape the torso, but only add a small amount to the full-body
 // scale so heavier players read as broad without dwarfing teammates.
 const bulk=Math.max(0,Math.min(.9,(sourceBuild-1)/.55));
 const buildScale=Math.max(.97,Math.min(1.035,1+(sourceBuild-1)*.08));
 const defaultSkin=SKIN_TONES[hash%SKIN_TONES.length],defaultHair=HAIR_TONES[(hash>>>5)%HAIR_TONES.length];
 const beardValue=physical.beard??physical.facialHair;
 // Facial hair is never invented for an identified player.  It is rendered
 // only when the LSL profile explicitly records it, so the model does not
 // silently add a feature that may not match the real person.
 const beard=typeof beardValue==='boolean'?beardValue:Boolean(beardValue)||traitHas(traits,'beard');
 return {
  skin:hex(physical.skinTone||physical.skin||physical.complexion,defaultSkin),
  hair:hex(physical.hairColor||physical.hair,defaultHair),
  eye:hex(physical.eyeColor||physical.eyes,['#2b211d','#392b20','#1f2a32','#4c3323'][(hash>>>27)%4]),
  hairstyle,build:build*buildScale,height:height*Math.max(.88,Math.min(1.14,Number(physical.height)||1)),bulk,
  glasses:physical.glasses===true||traitHas(traits,'glasses'),beard,
  boots:hex(physical.bootColor||physical.boots,BOOT_TONES[(hash>>>25)%BOOT_TONES.length])
 };
}
