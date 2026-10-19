import fs from 'node:fs/promises';
import path from 'node:path';
import { loadWebsiteProfiles } from './website-profiles.mjs';
const root=path.resolve(import.meta.dirname,'..'),args=process.argv.slice(2),check=args.includes('--check');
const source=path.resolve(args.find(arg=>arg!=='--check')||path.join(root,'../LSL Website'));
const {profiles,aliases,teamRatings,provenance}=await loadWebsiteProfiles(source);
const seasons=JSON.parse(await fs.readFile(path.join(root,'data/seasons.json'),'utf8'));
const pending=[],differences=[],ratingSnapshot={schemaVersion:1,source:'LSL Website',basis:provenance.basis,generatedAt:new Date().toISOString(),seasons:{}};let players=0,keepers=0,teams=0;
for(const season of seasons){
  const file=path.resolve(root,season.file);
  if(!file.startsWith(root+path.sep))throw Error('Invalid season path');
  const data=JSON.parse(await fs.readFile(file,'utf8')),ratings=teamRatings.get(String(season.year)),snapshotTeams=[];
  if(!ratings)throw Error('Website season unavailable: '+season.year);
  for(const team of data.teams){
    if(!ratings.has(team.id))throw Error('Website team unavailable: '+season.year+'/'+team.id);
    const expectedTeam=ratings.get(team.id);
    if(team.overall!==expectedTeam)differences.push({season:season.year,kind:'team',id:team.id,name:team.name,game:team.overall??null,website:expectedTeam});
    team.overall=expectedTeam;teams++;const snapshotPlayers=[];
    for(const player of team.roster){
      const profileId=aliases[player.id]||player.id,profile=profiles.get(profileId);
      if(!profile||!Number.isFinite(profile.overall))throw Error('Website player rating unavailable: '+profileId);
      const kind=/goal|keeper|gk/i.test(player.position)?'goalkeeper':'player';
      if(player.overall!==profile.overall)differences.push({season:season.year,kind,id:player.id,name:player.name,game:player.overall??null,website:profile.overall});
      player.profileId=profileId;player.overall=profile.overall;player.playstyle=profile.playstyle;
      snapshotPlayers.push({id:player.id,profileId,name:player.name,position:player.position||'Field',overall:profile.overall});
      players++;if(kind==='goalkeeper')keepers++;
    }
    snapshotTeams.push({id:team.id,name:team.name,overall:expectedTeam,players:snapshotPlayers});
  }
  ratingSnapshot.seasons[String(season.year)]={teams:snapshotTeams};
  pending.push([file,JSON.stringify(data,null,2)+'\n']);
}
if(check){
  if(differences.length){console.error(JSON.stringify(differences,null,2));process.exitCode=1;}
  else console.log('Website parity verified: '+players+' roster entries (including '+keepers+' goalkeepers), '+teams+' teams; zero OVR mismatches.');
}else{
  // Validate all seasons before writing any data. Keep non-rating fields intact.
  for(const [file,content] of pending)await fs.writeFile(file,content);
  await fs.writeFile(path.join(root,'data/profile-source.json'),JSON.stringify(provenance,null,2)+'\n');
  await fs.writeFile(path.join(root,'data/website-ratings.json'),JSON.stringify(ratingSnapshot,null,2)+'\n');
  console.log('Synced '+players+' roster entries (including '+keepers+' goalkeepers) and '+teams+' teams from the LSL Website. Updated '+differences.filter(d=>d.kind!=='team').length+' player ratings and '+differences.filter(d=>d.kind==='team').length+' team ratings.');
}
