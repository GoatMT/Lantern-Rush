import {ACCOUNT_SESSION_KEY} from './account-store.js';
import {FIREBASE_SDK_VERSION} from './firebase-config.js';
export class VerifiedAccountStore{
 constructor(fs,db,instance){this.fs=fs;this.db=db;this.instance=instance;this.ready=this.init();}
 async init(){const [a,f]=await Promise.all([import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`),import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-functions.js`)]);this.authModule=a;this.auth=a.getAuth(this.instance);this.functions=f.getFunctions(this.instance,'us-central1');this.callable=f.httpsCallable;await this.auth.authStateReady();}
 async call(name,data){await this.ready;try{return (await this.callable(this.functions,name)(data)).data;}catch(e){if(['functions/not-found','functions/unavailable','functions/internal'].includes(e.code))throw new Error('Online services are not available yet. Deploy the Lantern Rush Firebase functions and rules described in LIVE-H2H-SETUP.md.');throw e;}}
 profileRef(id){return this.fs.doc(this.db,'gameProfiles',id);}
 async profile(id){const snap=await this.fs.getDoc(this.profileRef(id));return snap.exists()?{...snap.data(),uid:snap.id}:null;}
 async restore(){await this.ready;return this.auth.currentUser?this.profile(this.auth.currentUser.uid):null;}
 async sign(action,username,passcode){const data=await this.call('accountAuth',{action,username,passcode});await this.authModule.signInWithCustomToken(this.auth,data.token);try{localStorage.setItem(ACCOUNT_SESSION_KEY,JSON.stringify({uid:data.profile.uid,verified:true}));}catch{}return data.profile;}
 create(username,pin){return this.sign('create',username,pin);}
 login(username,pin){return this.sign('login',username,pin);}
 async clearSession(){await this.ready;await this.authModule.signOut(this.auth);try{localStorage.removeItem(ACCOUNT_SESSION_KEY);}catch{}}
 async authorizeAdmin(){return this.call('accountAdmin',{action:'authorize'});}
 async rename(uid,username){return this.call('accountAdmin',{action:'rename',uid,username});}
 async resetPasscode(uid,passcode){return this.call('accountAdmin',{action:'reset',uid,passcode});}
 async remove(uid){return this.call('accountAdmin',{action:'remove',uid});}
 async merge(source,target){return this.call('accountAdmin',{action:'merge',source,target});}
}
