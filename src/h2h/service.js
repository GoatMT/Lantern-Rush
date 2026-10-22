import {CloudAccount} from '../cloud-account.js';
export class LiveService{
 constructor(onError=()=>{}){this.account=new CloudAccount();this.onError=onError;this.stops=[];}
 async init(){await this.account.ready;if(!this.account.available)throw this.account.error||Error('Firebase unavailable.');this.fs=this.account.modules.firestore;this.db=this.account.db;this.uid=this.account.user?.uid;if(!this.account.store.call)throw Error('Free Live H2H has not been activated yet. Existing single-player accounts still work. See LIVE-H2H-SETUP.md for the free backend setup.');return this;}
 async signIn(username,passcode,create=false){await this.account[create?'create':'login'](username,passcode);this.uid=this.account.user.uid;return this.account.profile;}
 call(name,data){return this.account.store.call(name,data);}
 room(action,code,extra={}){return this.call('h2hRoom',{action,code,...extra});}
 listen(ref,callback){
  let stopped=false,stop=()=>{},retried=false;
  const subscribe=()=>{
   if(stopped)return;
   stop=this.fs.onSnapshot(ref,callback,async error=>{
    if(stopped)return;
    // A passcode reset or a token issued before the verified backend was
    // enabled can leave an otherwise valid signed-in player with a stale
    // Firebase token. Refresh once before reporting a room-stream failure.
    const auth=this.account.store?.auth,current=auth?.currentUser;
    if(error?.code==='permission-denied'&&!retried&&current){
     retried=true;
     try{await current.getIdToken(true);subscribe();return;}catch{}
    }
    this.onError(error);
   });
  };
  subscribe();
  const unsubscribe=()=>{stopped=true;stop?.();};
  this.stops.push(unsubscribe);return unsubscribe;
 }
 poll(read,callback,delay=1800){
  let stopped=false,last='',reported=false;
  const run=async()=>{
   if(stopped)return;
   try{const value=await read(),encoded=JSON.stringify(value??null);if(encoded!==last){last=encoded;callback(value);}reported=false;}
   catch(error){if(!reported){reported=true;this.onError(error);}}
   if(!stopped)setTimeout(run,delay);
  };
  run();
  return ()=>{stopped=true;};
 }
 watchRoom(code,callback){
  let pollStop=null,directStop=null,usingDirect=false;
  const startDirect=()=>{if(usingDirect)return;usingDirect=true;directStop=this.listen(this.fs.doc(this.db,'h2hRooms',code),snap=>callback(snap.exists()?snap.data():null));};
  pollStop=this.poll(async()=>{try{const result=await this.call('h2hRoom',{action:'read',code});return result.room||null;}catch(error){if(/Unsupported room operation/i.test(error.message||'')){startDirect();return null;}throw error;}},value=>{if(!usingDirect)callback(value);},1200);
  return ()=>{pollStop?.();directStop?.();};
 }
 watchList(path,callback){return this.listen(this.fs.collection(this.db,path),snap=>callback(snap.docs.map(d=>({id:d.id,...d.data()}))));}
 watchRooms(callback){
  let pollStop=null,directStop=null,usingDirect=false;
  const startDirect=()=>{if(usingDirect)return;usingDirect=true;directStop=this.listen(this.fs.query(this.fs.collection(this.db,'h2hRooms'),this.fs.where('members','array-contains',this.uid)),snap=>callback(snap.docs.map(d=>d.data()).filter(r=>r.expiresAt>Date.now())));};
  pollStop=this.poll(async()=>{try{const result=await this.call('h2hRoom',{action:'list'});return result.rooms||[];}catch(error){if(/Unsupported room operation/i.test(error.message||'')){startDirect();return [];}throw error;}},value=>{if(!usingDirect)callback(value);},2200);
  return ()=>{pollStop?.();directStop?.();};
 }
 async people(){const p=await this.account.getProfiles();return p.filter(p=>p.uid!==this.uid).map(p=>({uid:p.uid,username:p.username}));}
 async signal(code,epoch,kind,payload,spectatorUid=null){await this.call('h2hSignal',{action:'send',code,epoch,kind,payload,spectatorUid});}
 signals(code,epoch,callback,spectatorUid=null){
  const seen=new Set();
  return this.poll(async()=>{const result=await this.call('h2hSignal',{action:'read',code,epoch,spectatorUid});return result.signals||[];},signals=>{for(const signal of signals){if(seen.has(signal.id)||signal.from===this.uid)continue;seen.add(signal.id);callback(signal);}},650);
 }
 close(){this.stops.splice(0).forEach(stop=>stop());}
}
