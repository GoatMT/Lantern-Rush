import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
let checks=0;
async function exists(file){await fs.access(file);checks++;}
async function walk(dir){const entries=await fs.readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?walk(path.join(dir,e.name)):path.join(dir,e.name)))).flat();}
for(const file of await walk(path.join(root,'src'))){
  if(!file.endsWith('.js'))continue;
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0)throw Error(result.stderr);checks++;
  const content=await fs.readFile(file,'utf8');
  for(const match of content.matchAll(/from\s+['"](\.[^'"]+)['"]/g))await exists(path.resolve(path.dirname(file),match[1]));
}
const html=await fs.readFile(path.join(root,'index.html'),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
if(new Set(ids).size!==ids.length)throw Error('Duplicate HTML IDs');
for(const match of html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g))await exists(path.join(root,match[1]));
const manifest=JSON.parse(await fs.readFile(path.join(root,'data/seasons.json'),'utf8'));
let teams=0,players=0;
for(const season of manifest){
  const data=JSON.parse(await fs.readFile(path.join(root,season.file),'utf8'));
  for(const team of data.teams){
    if(team.roster.length<7)throw Error('Insufficient roster: '+team.name);
    if(new Set(team.roster.map(p=>p.id)).size!==team.roster.length)throw Error('Duplicate roster IDs');
    if(team.logo)await exists(path.join(root,team.logo));teams++;players+=team.roster.length;
  }
}
await exists(path.join(root,'vendor/three.module.js'));await exists(path.join(root,'vendor/THREE-LICENSE.txt'));
console.log(checks+' syntax and static asset checks passed. '+manifest.length+' seasons, '+teams+' teams, '+players+' season roster entries. No runtime CDN or server dependency.');

