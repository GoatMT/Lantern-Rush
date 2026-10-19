import {appearanceFor} from '../engine/appearance.js';

const cache=new Map();
const color=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(String(value||''))?String(value):fallback;
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));

/**
 * Lightweight card portrait built from the same appearance profile as the
 * Three.js PlayerModel. It is an SVG data URL so cards stay self-contained on
 * GitHub Pages and do not add a texture download per card.
 */
export function playerPortrait(card={}){
 const key=card.cardKey||card.id||card.name||'player';
 if(cache.has(key))return cache.get(key);
 const a=appearanceFor(card.source||card),shirt=color(card.teamKit||card.kit||card.source?.teamKit,'#2d7566');
 const width=Math.round(29+(a.build-0.94)*34),headWidth=Math.round(25+(a.build-1)*8),hair=a.hair,skin=a.skin;
 const hairShape=a.hairstyle==='long'
   ? `<path d="M${50-headWidth/2-3} 32c-3 15 0 31 8 38l5-3V31zM${50+headWidth/2+3} 32c3 15 0 31-8 38l-5-3V31z" fill="${hair}"/>`
   : a.hairstyle===4?'':`<path d="M${50-headWidth/2} 31c2-13 12-18 24-18s22 5 24 18c-7-4-15-6-24-6s-17 2-24 6z" fill="${hair}"/>`;
 const number=card.jersey===null||card.jersey===undefined?'':esc(card.jersey);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 128" role="img" aria-label="Player portrait">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#204d45"/><stop offset="1" stop-color="#102d35"/></linearGradient><linearGradient id="shirt" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${shirt}"/><stop offset="1" stop-color="#0e292b"/></linearGradient></defs>
  <rect width="100" height="128" rx="12" fill="url(#bg)"/>
  <ellipse cx="50" cy="119" rx="43" ry="11" fill="#071a20" opacity=".45"/>
  <path d="M${50-width/2} 128c2-24 10-39 23-44h-46c13 5 21 20 23 44z" fill="url(#shirt)"/>
  <path d="M39 80h22v16H39z" fill="${skin}"/>
  <ellipse cx="50" cy="53" rx="${headWidth/2}" ry="25" fill="${skin}"/>
  ${hairShape}
  <ellipse cx="41" cy="54" rx="3.7" ry="2.2" fill="#f8f2e5"/><ellipse cx="59" cy="54" rx="3.7" ry="2.2" fill="#f8f2e5"/>
  <circle cx="41" cy="54" r="1.7" fill="${a.eye}"/><circle cx="59" cy="54" r="1.7" fill="${a.eye}"/>
  <path d="M48 59l-2 8 5 1" fill="none" stroke="#704638" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M44 75q6 4 12 0" fill="none" stroke="#713f3a" stroke-width="1.6" stroke-linecap="round"/>
  ${a.beard?`<path d="M36 66q2 23 14 24 12-1 14-24-5 8-14 10-9-2-14-10z" fill="${hair}" opacity=".28"/>`:''}
  ${a.glasses?`<g fill="none" stroke="#1c2d31" stroke-width="2"><rect x="33" y="49" width="16" height="11" rx="4"/><rect x="51" y="49" width="16" height="11" rx="4"/><path d="M49 53h2M33 53l-5-2M67 53l5-2"/></g>`:''}
  ${number?`<text x="50" y="115" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="900" fill="#f3e8be">${number}</text>`:''}
 </svg>`;
 const url='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);cache.set(key,url);return url;
}
