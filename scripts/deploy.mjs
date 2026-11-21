import {spawnSync} from 'node:child_process';
function run(args){const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{stdio:'inherit'});if(r.status)process.exit(r.status);}
// First deployment provisions DB/BUCKET. Migrations are then applied before the next release.
run(['deploy','--config','wrangler.jsonc']);run(['d1','migrations','apply','DB','--remote','--config','wrangler.jsonc']);
