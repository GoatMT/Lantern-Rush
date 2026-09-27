const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export function staffPose(a,name,t,seconds){
  const weight=smooth(t/.14)*(1-smooth((t-.82)/.18)),beat=Math.sin(seconds*5);
  a.pitch=.03;a.laZ=-.10;a.raZ=.10;a.le=.35;a.re=.35;
  if(name==='staff-instructions'){a.raX=(-1.3+beat*.13)*weight;a.raZ=.35*weight;a.re=.22;a.headYaw=Math.sin(seconds*1.7)*.12;}
  if(name==='staff-talk'){a.laX=-.8*weight;a.le=1.2;a.raX=-.7*weight;a.re=(.8+beat*.2)*weight;a.headPitch=beat*.035;}
  if(name==='staff-listen'){a.laX=-.5*weight;a.le=1.25;a.raX=-.25*weight;a.re=.45;a.headPitch=(.06+Math.sin(seconds*3)*.04)*weight;}
  if(name==='staff-shout'){a.laX=-1.35*weight;a.raX=-1.35*weight;a.le=a.re=1.8*weight;a.laZ=-.22*weight;a.raZ=.22*weight;a.pitch=.12*weight;a.headPitch=-.10*weight;}
  if(name==='staff-argue'){a.laX=(-.65+beat*.12)*weight;a.raX=(-.8-beat*.12)*weight;a.laZ=-.55*weight;a.raZ=.55*weight;a.le=a.re=1.0*weight;a.headYaw=beat*.07;}
  if(name==='staff-welcome'){a.raX=-1.0*weight;a.raZ=.65*weight;a.re=.2;a.laX=-.15;}
  if(name==='staff-reflect'){a.raX=-.95*weight;a.re=1.7*weight;a.headPitch=.17*weight;a.laX=-.25;}
  if(name==='staff-applaud'){a.laX=a.raX=-1.1*weight;a.laY=.3*weight;a.raY=-.3*weight;a.laZ=(.17+beat*.08)*weight;a.raZ=(-.17-beat*.08)*weight;a.le=a.re=1.0*weight;}
  if(name==='staff-celebrate'){a.laX=-1.8*weight;a.raX=-2.1*weight;a.le=a.re=.6;a.y=Math.max(0,Math.sin(seconds*3))*.045*weight;}
}
