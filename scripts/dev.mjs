import {spawnSync,spawn} from 'node:child_process';
import {watch} from 'node:fs';
const config='wrangler.jsonc';
function run(args){const r=spawnSync(process.execPath,args,{stdio:'inherit'});if(r.status)process.exit(r.status);}
run(['scripts/build.mjs']);run(['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config',config]);
let timer;for(const dir of ['public','worker'])watch(dir,{recursive:true},()=>{clearTimeout(timer);timer=setTimeout(()=>spawnSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit'}),200);});
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config',config,'--ip','0.0.0.0','--port',process.env.PORT||'3000'],{stdio:'inherit'});for(const s of ['SIGINT','SIGTERM'])process.on(s,()=>child.kill(s));child.on('exit',c=>process.exit(c||0));
