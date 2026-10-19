import * as T from '../../vendor/three.module.js';

const shirts=new Map();
const CANVAS_FONT='"Segoe UI",system-ui,sans-serif';
let fabricNormal;

// Original, woven kit artwork shared by every player wearing the same kit.
export function shirtTexture(kit){
  const key=JSON.stringify(kit),existing=shirts.get(key);
  if(existing){existing.references++;return existing.texture;}
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  c.fillStyle=kit.primary;c.fillRect(0,0,w,h);
  if(kit.pattern==='gradient'){
    const fade=c.createLinearGradient(0,0,0,h);fade.addColorStop(0,kit.primary);fade.addColorStop(.30,kit.primary);fade.addColorStop(.79,kit.secondary);
    c.fillStyle=fade;c.fillRect(0,0,w,h);
  }
  if(kit.pattern==='lantern-2025'){
    // Charcoal jacquard body and restrained gold pinstripes. The chest mark is
    // a separate front-facing decal so it cannot wrap around to the back.
    const shade=c.createLinearGradient(0,0,w,0);shade.addColorStop(0,'#111216');shade.addColorStop(.18,'#222328');shade.addColorStop(.5,'#191a1e');shade.addColorStop(.82,'#24252a');shade.addColorStop(1,'#131418');
    c.fillStyle=shade;c.fillRect(0,0,w,h);
    const folds=[[18,65,31,56,-.35],[78,105,46,78,.24],[179,77,37,64,-.22],[224,153,42,82,.38],[44,360,50,77,.32],[151,414,58,64,-.28],[207,330,38,76,.18]];
    folds.forEach(([x,y,rx,ry,rotation],i)=>{c.save();c.translate(x,y);c.rotate(rotation);c.fillStyle=i%2?'#ffffff08':'#00000014';c.beginPath();c.ellipse(0,0,rx,ry,0,0,Math.PI*2);c.fill();c.strokeStyle='#ffffff08';c.lineWidth=2;c.beginPath();c.ellipse(0,0,rx*.72,ry*.68,0,0,Math.PI*2);c.stroke();c.restore();});
    c.strokeStyle='#c9ad78';c.lineWidth=2;c.globalAlpha=.34;
    for(const x of [21,49,84,111,148,176,207,236]){c.beginPath();c.moveTo(x,18);c.bezierCurveTo(x-5,150,x+5,330,x,490);c.stroke();}
    c.globalAlpha=1;
    c.textAlign='right';c.font='bold 8px '+CANVAS_FONT;c.fillText('INTER-MADRASAH',235,91,77);c.fillText('2025',235,104,70);
  }
  if(kit.pattern==='lantern-2026'){
    const fade=c.createLinearGradient(0,0,0,h);fade.addColorStop(0,'#fbf9f1');fade.addColorStop(.27,'#f4f4e9');fade.addColorStop(.49,'#b5d8c1');fade.addColorStop(.74,'#328763');fade.addColorStop(1,'#0a6847');
    c.fillStyle=fade;c.fillRect(0,0,w,h);
    // Repeating low-contrast lantern weave across the emerald lower panels.
    c.save();c.globalAlpha=.12;c.strokeStyle='#d7ebd8';c.lineWidth=2;
    for(let row=0;row<8;row++)for(let col=0;col<11;col++){
      const x=14+col*24+(row%2)*12,y=270+row*31;
      c.beginPath();c.moveTo(x-4,y-6);c.lineTo(x,y-11);c.lineTo(x+4,y-6);c.lineTo(x+3,y+2);c.lineTo(x,y+6);c.lineTo(x-3,y+2);c.closePath();c.stroke();
      c.beginPath();c.moveTo(x,y+6);c.lineTo(x,y+10);c.stroke();
    }
    c.restore();
    c.fillStyle='#123f31';c.font='bold 7px '+CANVAS_FONT;c.textAlign='right';c.fillText('INTER-MADRASAH',239,40,70);c.fillText('2026',239,51,70);
  }
  if(kit.pattern==='umer-memon'){
    const base=c.createLinearGradient(0,0,w,h);base.addColorStop(0,'#fbfaf6');base.addColorStop(.52,'#f0efeb');base.addColorStop(1,'#e8e8e6');c.fillStyle=base;c.fillRect(0,0,w,h);
    // Fine branching navy marbling with occasional warm gold threads.
    const veins=[[-35,45,48,108,177,-2,292,78],[-32,122,55,57,170,198,286,118],[-42,205,40,275,178,121,294,213],[-36,286,44,205,175,365,291,278],[-38,374,60,302,178,462,292,348],[-28,466,47,392,190,532,290,428]];
    veins.forEach(([x,y,a,b,d,e,f,g],index)=>{
      for(let line=-4;line<=4;line++){
        c.beginPath();c.moveTo(x,y+line*3);c.bezierCurveTo(a,b+line*2,d,e+line*3,f,g+line*2);
        c.strokeStyle=index%3===1&&line===0?'#b69b5e':'#292b3c';c.globalAlpha=line===0?.78:.36;c.lineWidth=line===0?2.2:.85;c.stroke();
      }
      c.globalAlpha=1;
    });
    c.strokeStyle='#c6ad70';c.globalAlpha=.8;c.lineWidth=1;
    for(const [x,y] of [[18,72],[220,154],[27,248],[218,335],[37,418]]){c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+28,y+8,x+42,y+15,x+64,y+10);c.stroke();}
    c.globalAlpha=1;
  }
  if(kit.pattern==='jogiat-palace-2024'){
    const green=c.createLinearGradient(0,0,w,h);green.addColorStop(0,'#66756d');green.addColorStop(.48,'#58675f');green.addColorStop(1,'#46564e');c.fillStyle=green;c.fillRect(0,0,w,h);
    // Repeated angular chevrons echo the layered black pattern in the kit.
    c.strokeStyle='#202824';c.lineCap='square';c.globalAlpha=.74;
    for(let y=20;y<340;y+=25){
      c.lineWidth=3;
      for(let x=-24;x<w+20;x+=27){c.beginPath();c.moveTo(x,y);c.lineTo(x+13.5,y+14);c.lineTo(x+27,y);c.stroke();}
      c.globalAlpha=.42;c.lineWidth=1.4;
      for(let x=-10;x<w+24;x+=27){c.beginPath();c.moveTo(x,y+5);c.lineTo(x+13.5,y+19);c.lineTo(x+27,y+5);c.stroke();}
      c.globalAlpha=.74;
    }
    c.globalAlpha=1;
    // The thin red piping is limited to the shoulder seam, as on the photo.
    c.strokeStyle='#b8383d';c.lineWidth=4;c.beginPath();c.moveTo(15,19);c.quadraticCurveTo(128,35,241,19);c.stroke();
    for(const x of [24,232]){c.strokeStyle='#aeb8b1';c.lineWidth=1;c.beginPath();c.moveTo(x,26);c.lineTo(x,66);c.stroke();}
  }
  if(kit.pattern==='stripe'){
    c.fillStyle=kit.secondary;for(const x of [0,128,256])c.fillRect(x-23,0,46,h);
  }
  if(kit.pattern==='sash'){
    c.strokeStyle=kit.secondary;c.lineWidth=20;
    for(let i=-1;i<3;i++){c.beginPath();c.moveTo(i*128-36,450);c.bezierCurveTo(i*128+80,300,i*128-70,220,i*128+110,75);c.stroke();}
  }
  // Shaped side panels, seams and tonal folds read at broadcast distance.
  for(const x of [64,192]){
    const fold=c.createLinearGradient(x-22,0,x+22,0);fold.addColorStop(0,'#00000000');fold.addColorStop(.5,'#00000026');fold.addColorStop(1,'#00000000');
    c.fillStyle=fold;c.fillRect(x-22,0,44,h);c.fillStyle='#ffffff16';c.fillRect(x,25,1,h-45);
  }
  for(let y=2;y<h;y+=4){c.fillStyle=y%8?'#ffffff0a':'#00000008';c.fillRect(0,y,w,1);}
  for(let x=2;x<w;x+=4){c.fillStyle='#ffffff06';c.fillRect(x,0,1,h);}
  c.strokeStyle='#ffffff14';c.lineWidth=1;
  for(let i=0;i<9;i++){const x=i*31;c.beginPath();c.moveTo(x,h-20);c.bezierCurveTo(x-7,h*.72,x+9,h*.62,x+2,h*.4);c.stroke();}
  c.fillStyle=kit.trim||kit.secondary||kit.primary;c.globalAlpha=.75;c.fillRect(0,h-14,w,4);c.globalAlpha=1;
  c.fillStyle='#00000025';c.fillRect(0,h-5,w,3);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  texture.userData.kitKey=key;shirts.set(key,{texture,references:1});return texture;
}

export function releaseShirtTexture(texture){
  const key=texture?.userData.kitKey,item=shirts.get(key);if(!item)return;
  if(--item.references===0){item.texture.dispose();shirts.delete(key);}
}

export function frontKitBadge(kit){
  const pattern=kit?.pattern;
  if(!['jogiat-palace-2024','umer-memon','lantern-2025','lantern-2026'].includes(pattern))return null;
  const c=document.createElement('canvas'),ctx=c.getContext('2d');
  if(pattern==='jogiat-palace-2024'){
    c.width=256;c.height=192;
    ctx.fillStyle='#d2f28b';ctx.beginPath();ctx.roundRect(12,12,232,168,22);ctx.fill();
    ctx.strokeStyle='#f0ffd1';ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(16,16,224,160,18);ctx.stroke();
    ctx.fillStyle='#314139';ctx.strokeStyle='#314139';ctx.lineWidth=7;
    ctx.beginPath();ctx.arc(128,72,31,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(128,72,8,0,Math.PI*2);ctx.fill();
    for(const [x,y,r] of [[128,33,5],[97,65,5],[159,65,5],[106,96,5],[150,96,5]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
    ctx.beginPath();ctx.moveTo(78,78);ctx.lineTo(116,54);ctx.lineTo(140,91);ctx.lineTo(178,66);ctx.stroke();
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 21px '+CANVAS_FONT;ctx.fillText('JOGIAT',128,127);ctx.font='800 15px '+CANVAS_FONT;ctx.fillText('P A L A C E',128,151);
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;return {texture,width:.34,height:.255,x:0,y:1.39};
  }
  if(pattern==='umer-memon'){
    c.width=480;c.height=300;ctx.strokeStyle='#1b2030';ctx.lineWidth=5;ctx.beginPath();ctx.arc(82,73,34,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#1b2030';ctx.font='900 23px '+CANVAS_FONT;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('LSL',82,72);
    ctx.strokeStyle='#1b2030';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(365,39);ctx.lineTo(399,73);ctx.lineTo(365,107);ctx.lineTo(331,73);ctx.closePath();ctx.stroke();
    ctx.font='900 16px '+CANVAS_FONT;ctx.fillStyle='#1b2030';ctx.fillText('UM',365,73);
    ctx.fillStyle='#202331';ctx.font='900 42px Georgia,serif';ctx.fillText('UMER MEMON',240,174,430);
    ctx.strokeStyle='#b69b5e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(88,213);ctx.lineTo(392,213);ctx.stroke();
    ctx.font='600 19px '+CANVAS_FONT;ctx.fillStyle='#202331';ctx.fillText('F O O T B A L L   C L U B',240,247);
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;return {texture,width:.48,height:.30,x:0,y:1.42};
  }
  if(pattern==='lantern-2025'){
    c.width=480;c.height=260;ctx.strokeStyle='#d6bd83';ctx.fillStyle='#d6bd83';ctx.lineWidth=7;
    ctx.beginPath();ctx.moveTo(54,91);ctx.lineTo(76,38);ctx.lineTo(98,91);ctx.lineTo(92,149);ctx.lineTo(60,149);ctx.closePath();ctx.stroke();
    ctx.beginPath();ctx.moveTo(63,104);ctx.lineTo(89,104);ctx.moveTo(76,149);ctx.lineTo(76,187);ctx.stroke();
    ctx.textAlign='left';ctx.textBaseline='middle';ctx.font='italic 36px Georgia,serif';ctx.fillText('Lantern of',125,75,310);
    ctx.font='bold 51px Georgia,serif';ctx.fillText('Knowledge',125,126,310);
    ctx.font='24px Georgia,serif';ctx.fillText('A C A D E M Y',128,176,300);
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;return {texture,width:.45,height:.245,x:0,y:1.40};
  }
  c.width=480;c.height=500;
  ctx.strokeStyle='#083e2e';ctx.fillStyle='#083e2e';ctx.lineWidth=7;ctx.beginPath();ctx.arc(95,68,38,0,Math.PI*2);ctx.stroke();
  ctx.font='900 25px '+CANVAS_FONT;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('LSL',95,62);ctx.font='700 10px '+CANVAS_FONT;ctx.fillText('LANTERN SOCCER',95,82);
  ctx.fillStyle='#123f31';ctx.font='700 17px Georgia,serif';ctx.fillText('LANTERN OF KNOWLEDGE',273,64,300);ctx.font='700 16px Georgia,serif';ctx.fillText('ACADEMY',273,88,260);
  ctx.save();ctx.translate(324,294);ctx.strokeStyle='#f2df92';ctx.fillStyle='#07523a';ctx.lineWidth=8;
  ctx.beginPath();ctx.moveTo(-60,57);ctx.lineTo(-54,-69);ctx.quadraticCurveTo(-48,-128,0,-167);ctx.quadraticCurveTo(48,-128,54,-69);ctx.lineTo(60,57);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-34,38);ctx.lineTo(-31,-67);ctx.quadraticCurveTo(-29,-104,0,-136);ctx.quadraticCurveTo(29,-104,31,-67);ctx.lineTo(34,38);ctx.moveTo(-34,-38);ctx.lineTo(34,-38);ctx.moveTo(-34,5);ctx.lineTo(34,5);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-60,57);ctx.lineTo(60,57);ctx.lineTo(0,178);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.arc(0,108,13,0,Math.PI*2);ctx.stroke();ctx.restore();
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;return {texture,width:.43,height:.48,x:.035,y:1.38};
}

// A tiny shared normal map adds a fabric highlight without external downloads.
export function fabricNormalTexture(){
  if(fabricNormal)return fabricNormal;
  const size=64,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4;data[i]=128+Math.round(Math.sin(x*Math.PI/2)*18);data[i+1]=128+Math.round(Math.sin(y*Math.PI/2)*18);data[i+2]=253;data[i+3]=255;
  }
  fabricNormal=new T.DataTexture(data,size,size);fabricNormal.wrapS=fabricNormal.wrapT=T.RepeatWrapping;fabricNormal.repeat.set(5,8);fabricNormal.needsUpdate=true;return fabricNormal;
}

export function goalkeeperKit(team=0){
  return team===1?{primary:'#57bbaa',secondary:'#367f81',shorts:'#224449',socks:'#4daea0',trim:'#d9e5dd',pattern:'gradient'}:
    {primary:'#e6c955',secondary:'#bb922e',shorts:'#26333b',socks:'#dbc45c',trim:'#25333c',pattern:'gradient'};
}
export function numberColor(kit){
  if(kit.pattern==='lantern-2025')return '#d5b879';
  if(kit.pattern==='lantern-2026')return '#07563b';
  if(kit.pattern==='umer-memon')return '#171b25';
  if(kit.pattern==='jogiat-palace-2024')return '#f7f6f1';
  const rgb=[1,3,5].map(i=>parseInt(kit.primary.slice(i,i+2),16));
  return kit.pattern==='gradient'||rgb.reduce((a,b)=>a+b,0)<490?'#fff9e8':'#172b42';
}
