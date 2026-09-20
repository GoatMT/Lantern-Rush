import { clamp } from '../config.js';

const styleText=data=>`${data?.playstyle?.label||''} ${(data?.playstyle?.traits||[]).join(' ')}`.toLowerCase();

// The LSL site publishes OVR and playstyle profiles, rather than a complete
// attribute database. These compact game ratings are therefore derived from
// that published profile and kept separate from the official OVR.
export function playerRatings(data={}){
  const overall=Number.isFinite(data.overall)?clamp(data.overall,50,100):70;
  const quality=(overall-50)/50, style=styleText(data);
  const isGK=/goal|keeper/.test(data.position||data.role||'')||/goalkeeper/.test(style);
  const creator=/pass|creat|assist/.test(style), finisher=/finish|scor|goal/.test(style), anchor=/defen|tackle|mark|anchor/.test(style);
  const name=String(data.name||'').toLowerCase();
  const speed=name.includes('muhummud teli')||name.includes('muhammad teli')?100:Math.round(clamp(62+quality*31+(finisher?2:0),55,99));
  const ratings={speed,shooting:Math.round(clamp(58+quality*34+(finisher?6:0),50,99)),passing:Math.round(clamp(57+quality*34+(creator?7:0),50,99)),dribbling:Math.round(clamp(59+quality*32+(creator||finisher?4:0),50,99)),defending:Math.round(clamp(54+quality*33+(anchor?8:0),45,99)),stamina:Math.round(clamp(64+quality*28+(speed>90?4:0),55,99)),goalkeeping:isGK?Math.round(clamp(62+quality*35,55,99)):Math.round(clamp(35+quality*30,25,75))};
  return Object.freeze(ratings);
}

// Modest arcade effects from the published career OVR/style, identical for user and CPU.
// These modifiers are game balancing, not additional claimed LSL statistics.
export function playerAttributes(data={}){
  const quality=Number.isFinite(data.overall)?clamp((data.overall-50)/49,0,1):.5;
  const style=data.playstyle?.label||'';
  const finisher=['Elite Finisher','Goal-First Attacker'].includes(style);
  return Object.freeze({
    ratings:playerRatings(data),
    speed:.97+quality*.06,
    shotPower:.97+quality*.06,
    shotError:1.2-quality*.4-(finisher?.1:0),
    passLead:style==='Creator'?1.15:1,
    forwardRun:finisher?1.1:1,
    defending:style==='Defensive Anchor'?1.12:1,
    keeper:.94+quality*.12,
    dribble:clamp(.4+quality*.45+(style==='Creator'?.08:0),.4,.94)
  });
}
