import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const source=await fs.readFile(path.join(root,'index.html'),'utf8');
const pages=[['quick-match.html','quick','LANTERN RUSH · QUICK MATCH'],['rivalry-matches.html','rivalry','LANTERN RUSH · RIVALRY MATCHES'],['tournament-mode.html','tournament','LANTERN RUSH · TOURNAMENT MODE'],['season-mode.html','season','LANTERN RUSH · SEASON MODE']];
for(const [file,mode,title] of pages){const html=source.replace('<title>LANTERN RUSH</title>',`<title>${title}</title>`).replace('<body>','<body data-mode-page="'+mode+'">');await fs.writeFile(path.join(root,file),html);}
console.log('Synchronized dedicated LANTERN RUSH mode pages.');
