import { clamp } from '../config.js';

// Modest arcade effects from the published career OVR/style, identical for user and CPU.
// These modifiers are game balancing, not additional claimed LSL statistics.
export function playerAttributes(data={}){
  const quality=Number.isFinite(data.overall)?clamp((data.overall-50)/49,0,1):.5;
  const style=data.playstyle?.label||'';
  const finisher=['Elite Finisher','Goal-First Attacker'].includes(style);
  return Object.freeze({
    speed:.97+quality*.06,
    shotPower:.97+quality*.06,
    shotError:1.2-quality*.4-(finisher?.1:0),
    endurance:style==='High-Activity Player'?1.12:style==='Steady Contributor'?1.06:1,
    passLead:style==='Creator'?1.15:1,
    forwardRun:finisher?1.1:1,
    defending:style==='Defensive Anchor'?1.12:1,
    keeper:.94+quality*.12,
    dribble:clamp(.4+quality*.45+(style==='Creator'?.08:0),.4,.94)
  });
}
