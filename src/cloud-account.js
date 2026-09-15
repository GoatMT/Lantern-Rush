import {FIREBASE_CONFIG,FIREBASE_SDK_VERSION} from './firebase-config.js';

const PROFILE_COLLECTION='gameProfiles';
const ACCOUNT_EMAIL_DOMAIN='accounts.lsl-rivals.app';
export const ADMIN_EMAIL='admin@accounts.lsl-rivals.app';
export const ADMIN_PASSWORD='BlueM123';
const MODE_KEYS=Object.freeze(['all','quick','rivalry','tournament','season','dream']);
export const MODE_LABELS=Object.freeze({all:'All modes',quick:'Play Now',rivalry:'Rivalry Matches',tournament:'Tournament Mode',season:'Season Mode',dream:'LSL Dream F.C.'});
const STAT_KEYS=Object.freeze(['matches','goals','shots','saves','wins','losses','ties','shotsOnTarget','passes','completedPasses','fouls','corners','cleanSheets']);
const SESSION_KEY='lsl-rush-cloud-session-v1';

export const emptyStats=()=>Object.fromEntries(STAT_KEYS.map(key=>[key,0]));
export const emptyModeStats=()=>Object.fromEntries(MODE_KEYS.map(key=>[key,emptyStats()]));
export const normalizeUsername=value=>String(value??'').trim().toLowerCase();
export function validateCredentials(username,pin){
  const name=String(username??'').trim(),code=String(pin??'').trim();
  if(!/^[A-Za-z0-9_]{2,12}$/.test(name))throw new Error('Username must be 2–12 letters, numbers or underscores.');
  if(!/^\d{6}$/.test(code))throw new Error('Passcode must be exactly 6 digits.');
  return {username:name,pin:code,usernameKey:normalizeUsername(name)};
}
const clone=value=>JSON.parse(JSON.stringify(value));
const finite=value=>Number.isFinite(Number(value))?Number(value):0;
const uid=()=>globalThis.crypto?.randomUUID?.()||`match-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const modeFor=match=>match?.dream?'dream':match?.rivalry?'rivalry':match?.tournament?'tournament':match?.seasonMatch?'season':'quick';
const modeName=mode=>MODE_LABELS[mode]||MODE_LABELS.quick;
function fakeEmail(usernameKey){return `${usernameKey}@${ACCOUNT_EMAIL_DOMAIN}`;}
function profileTemplate(username,authUid){
  const usernameKey=normalizeUsername(username);
  return {uid:authUid,username,usernameKey,loginEmail:fakeEmail(usernameKey),avatarDataUrl:'',createdAtMs:Date.now(),updatedAtMs:Date.now(),stats:emptyStats(),modes:emptyModeStats(),records:{fastestOpeningGoal:null,fastestHattrick:null,fastestFiveGoalComeback:null,mostGoalsGame:null,biggestWin:null,longestWinningStreak:0},trophies:[],currentStreak:0,history:[]};
}
function sanitizeProfile(value,docId=''){
  const raw=value||{},modes=emptyModeStats();
  for(const mode of MODE_KEYS)Object.assign(modes[mode],raw.modes?.[mode]||{});
  const stats={...emptyStats(),...(raw.stats||{})};
  const username=raw.username||'LSL Player',usernameKey=raw.usernameKey||normalizeUsername(username);
  return {uid:raw.uid||docId,username,usernameKey,loginEmail:raw.loginEmail||fakeEmail(usernameKey),avatarDataUrl:raw.avatarDataUrl||'',createdAtMs:finite(raw.createdAtMs),updatedAtMs:finite(raw.updatedAtMs),stats,modes,records:{fastestOpeningGoal:null,fastestHattrick:null,fastestFiveGoalComeback:null,mostGoalsGame:null,biggestWin:null,longestWinningStreak:0,...(raw.records||{})},trophies:Array.isArray(raw.trophies)?raw.trophies.slice(0,20):[],currentStreak:finite(raw.currentStreak),history:Array.isArray(raw.history)?raw.history.slice(0,50):[]};
}
function addStats(target,source){for(const key of STAT_KEYS)target[key]=(target[key]||0)+(finite(source?.[key]));}
function matchRecord(match){
  const teamStats=match.stats?.[0]||emptyStats(),cpuStats=match.stats?.[1]||emptyStats();
  const diff=finite(teamStats.goals)-finite(cpuStats.goals),won=diff>0,tie=diff===0;
  const goals=(match.goalEvents||[]).map(goal=>({name:goal.name||'LSL Player',jersey:goal.jersey??null,team:finite(goal.team),time:finite(goal.time),assist:goal.assist||'',assistJersey:goal.assistJersey??null}));
  return {id:uid(),date:Date.now(),season:String(match.settings?.season||''),mode:modeFor(match),modeLabel:modeName(modeFor(match)),teams:(match.teams||[]).map(team=>team.name),score:[finite(teamStats.goals),finite(cpuStats.goals)],won,tie,stats:{user:{...teamStats},cpu:{...cpuStats}},goals};
}
function updateRecords(profile,record){
  const records=profile.records,goals=record.goals.filter(goal=>goal.team===0).sort((a,b)=>a.time-b.time);
  const opening=goals[0];if(opening&&(!records.fastestOpeningGoal||opening.time<finite(records.fastestOpeningGoal.seconds)))records.fastestOpeningGoal={seconds:opening.time,name:opening.name,jersey:opening.jersey,mode:record.modeLabel,season:record.season};
  const byPlayer=new Map();for(const goal of goals){const list=byPlayer.get(goal.name)||[];list.push(goal.time);byPlayer.set(goal.name,list);}
  for(const [name,times] of byPlayer){if(times.length<3)continue;const span=times[2]-times[0];if(!records.fastestHattrick||span<finite(records.fastestHattrick.seconds))records.fastestHattrick={seconds:span,name,mode:record.modeLabel,season:record.season};}
  if(record.won&&record.score[0]>=5){const seconds=goals.at(-1)?.time??Infinity;if(!records.fastestFiveGoalComeback||seconds<finite(records.fastestFiveGoalComeback.seconds))records.fastestFiveGoalComeback={seconds,score:record.score.join('–'),teams:record.teams,mode:record.modeLabel,season:record.season};}
  if(record.won&&(!records.mostGoalsGame||record.score[0]>finite(records.mostGoalsGame.goals)))records.mostGoalsGame={goals:record.score[0],name:record.teams[0],score:record.score.join('–'),mode:record.modeLabel,season:record.season};
  if(record.won&&(!records.biggestWin||record.score[0]-record.score[1]>finite(records.biggestWin.margin)))records.biggestWin={margin:record.score[0]-record.score[1],score:record.score.join('–'),team:record.teams[0],mode:record.modeLabel,season:record.season};
}
function applyRecord(profile,record){
  const user=record.stats.user,all=profile.stats,mode=profile.modes[record.mode]||emptyStats(),beforeMatches=all.matches;
  const common={matches:1,goals:user.goals,shots:user.shots,saves:user.saves,wins:record.won?1:0,losses:record.won||record.tie?0:1,ties:record.tie?1:0,shotsOnTarget:user.onTarget,passes:user.passes,completedPasses:user.completed,fouls:user.fouls,corners:user.corners,cleanSheets:record.won&&record.score[1]===0?1:0};
  addStats(all,common);addStats(mode,common);profile.modes.all=all;
  profile.currentStreak=record.won?finite(profile.currentStreak)+1:0;profile.records.longestWinningStreak=Math.max(finite(profile.records.longestWinningStreak),profile.currentStreak);const trophy=(id,title,description)=>{profile.trophies??=[];if(!profile.trophies.some(item=>item.id===id))profile.trophies.push({id,title,description,earnedAt:Date.now()});};if(beforeMatches===0)trophy('first-match','FIRST MATCH','Complete your first match.');if(record.won){trophy('first-win','FIRST WIN','Win a match.');if(profile.currentStreak>=3)trophy('hot-streak','HOT STREAK','Win three matches in a row.');if(record.mode==='rivalry')trophy('rivalry-win','RIVALRY NIGHT','Win a featured rivalry match.');if(record.mode==='tournament')trophy('tournament-win','TOURNAMENT RUN','Win an Inter-Madrasah fixture.');if(record.mode==='season')trophy('season-win','SEASON CAMPAIGN','Win a season fixture.');if(record.mode==='dream')trophy('dream-win','DREAM BUILDER','Win a Dream F.C. CPU match.');if(record.score[1]===0)trophy('clean-sheet','SHUTOUT','Win without conceding.');}updateRecords(profile,record);
  profile.history=[record,...(profile.history||[])].slice(0,50);profile.updatedAtMs=Date.now();return profile;
}
async function avatarDataUrl(file){
  if(!file)return '';
  const image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=reader.result;};reader.onerror=reject;reader.readAsDataURL(file);});
  const size=512,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d');
  const ratio=Math.max(size/image.width,size/image.height),width=image.width*ratio,height=image.height*ratio;ctx.drawImage(image,(size-width)/2,(size-height)/2,width,height);
  return canvas.toDataURL('image/webp',.84);
}

export class CloudAccount{
  constructor({onChange=()=>{}}={}){this.onChange=onChange;this.user=null;this.profile=null;this.adminClaim=false;this.available=false;this.error=null;this.ready=this.init();}
  async init(){
    try{
      const [app,auth,firestore]=await Promise.all([import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`),import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`)]);
      const existing=app.getApps().find(item=>item.name==='lantern-rush')||app.initializeApp(FIREBASE_CONFIG,'lantern-rush');
      this.modules={app,auth,firestore};this.auth=auth.getAuth(existing);this.db=firestore.getFirestore(existing);this.available=true;
      await new Promise(resolve=>{let first=true;this.unsubscribe=auth.onAuthStateChanged(this.auth,async user=>{this.user=user||null;this.adminClaim=false;if(user?.email===ADMIN_EMAIL){try{const token=await user.getIdTokenResult(true);this.adminClaim=token.claims.admin===true;}catch{this.adminClaim=false;}}this.profile=user?await this.loadProfile(user.uid):null;if(first){first=false;resolve();}this.onChange(this);});});
    }catch(error){this.error=error;this.available=false;this.onChange(this);}
    return this;
  }
  isSignedIn(){return Boolean(this.user&&this.profile);}
  async loadProfile(userUid){const snap=await this.modules.firestore.getDoc(this.modules.firestore.doc(this.db,PROFILE_COLLECTION,userUid));return snap.exists()?sanitizeProfile(snap.data(),snap.id):null;}
  async create(username,pin){const credentials=validateCredentials(username,pin);if(!this.available)throw new Error('Firebase is not available. Open the published HTTPS game or check the Firebase configuration.');const {auth,firestore}=this.modules;const credential=await auth.createUserWithEmailAndPassword(this.auth,fakeEmail(credentials.usernameKey),credentials.pin);const profile=profileTemplate(credentials.username,credential.user.uid);await firestore.setDoc(firestore.doc(this.db,PROFILE_COLLECTION,credential.user.uid),profile);this.user=credential.user;this.profile=sanitizeProfile(profile,credential.user.uid);this.onChange(this);return this.profile;}
  async login(username,pin){const credentials=validateCredentials(username,pin);if(!this.available)throw new Error('Firebase is not available. Open the published HTTPS game or check the Firebase configuration.');let credential;try{credential=await this.modules.auth.signInWithEmailAndPassword(this.auth,fakeEmail(credentials.usernameKey),credentials.pin);}catch(error){const profiles=await this.getProfiles(),renamed=profiles.find(item=>item.usernameKey===credentials.usernameKey&&item.loginEmail);if(!renamed)throw error;credential=await this.modules.auth.signInWithEmailAndPassword(this.auth,renamed.loginEmail,credentials.pin);}this.user=credential.user;this.profile=await this.loadProfile(credential.user.uid);if(!this.profile){const profile=profileTemplate(credentials.username,credential.user.uid);await this.modules.firestore.setDoc(this.modules.firestore.doc(this.db,PROFILE_COLLECTION,credential.user.uid),profile);this.profile=sanitizeProfile(profile,credential.user.uid);}this.onChange(this);return this.profile;}
  async logout(){if(this.available)await this.modules.auth.signOut(this.auth);this.user=null;this.profile=null;this.onChange(this);}
  async updateAvatar(file){if(!this.isSignedIn())throw new Error('Create an account before adding a profile picture.');const data=typeof file==='string'?file:await avatarDataUrl(file);if(!data)throw new Error('Choose an image first.');await this.modules.firestore.setDoc(this.modules.firestore.doc(this.db,PROFILE_COLLECTION,this.user.uid),{avatarDataUrl:data,updatedAtMs:Date.now()},{merge:true});this.profile=await this.loadProfile(this.user.uid);this.onChange(this);return data;}
  async recordMatch(match){await this.ready;if(!this.isSignedIn()||!match||match.cloudAccountRecorded)return null;match.cloudAccountRecorded=true;const record=matchRecord(match),ref=this.modules.firestore.doc(this.db,PROFILE_COLLECTION,this.user.uid),profile=clone(this.profile);applyRecord(profile,record);await this.modules.firestore.setDoc(ref,profile);this.profile=sanitizeProfile(profile,this.user.uid);this.onChange(this);return record;}
  async getProfiles(){await this.ready;if(!this.available)return [];const snapshot=await this.modules.firestore.getDocs(this.modules.firestore.collection(this.db,PROFILE_COLLECTION));return snapshot.docs.map(item=>sanitizeProfile(item.data(),item.id));}
  async getProfile(profileUid){await this.ready;if(!this.available||!profileUid)return null;const snapshot=await this.modules.firestore.getDoc(this.modules.firestore.doc(this.db,PROFILE_COLLECTION,profileUid));return snapshot.exists()?sanitizeProfile(snapshot.data(),snapshot.id):null;}
  async adminLogin(password){await this.ready;if(password!==ADMIN_PASSWORD)throw new Error('Incorrect admin password.');if(!this.available)throw new Error('Firebase is not available.');const {auth}=this.modules;let credential;try{credential=await auth.signInWithEmailAndPassword(this.auth,ADMIN_EMAIL,password);}catch(error){if(!['auth/user-not-found','auth/invalid-credential','auth/invalid-login-credentials'].includes(error.code))throw error;credential=await auth.createUserWithEmailAndPassword(this.auth,ADMIN_EMAIL,password);}this.user=credential.user;this.profile=null;const token=await credential.user.getIdTokenResult(true);this.adminClaim=token.claims.admin===true;this.onChange(this);return credential.user;}
  isAdmin(){return this.user?.email===ADMIN_EMAIL&&this.adminClaim===true;}
  async adminUpdateProfile(profileUid,patch){await this.ready;if(!this.isAdmin())throw new Error('Admin sign-in required.');const next={...patch,updatedAtMs:Date.now()};if(next.username){const credentials=validateCredentials(next.username,'000000');next.username=credentials.username;next.usernameKey=credentials.usernameKey;}await this.modules.firestore.setDoc(this.modules.firestore.doc(this.db,PROFILE_COLLECTION,profileUid),next,{merge:true});return this.getProfile(profileUid);}
  async adminDeleteProfile(profileUid){await this.ready;if(!this.isAdmin())throw new Error('Admin sign-in required.');await this.modules.firestore.deleteDoc(this.modules.firestore.doc(this.db,PROFILE_COLLECTION,profileUid));}
  async adminRequestPasswordReset(profileUid){await this.ready;if(!this.isAdmin())throw new Error('Admin sign-in required.');const profile=await this.getProfile(profileUid);if(!profile)throw new Error('Account not found.');await this.modules.firestore.setDoc(this.modules.firestore.doc(this.db,PROFILE_COLLECTION,profileUid),{passwordResetRequestedAtMs:Date.now(),updatedAtMs:Date.now()},{merge:true});return profile;}
}

export {MODE_KEYS,modeFor};
