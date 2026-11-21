import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
function wrangler(args) {
 return spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,CI:'true',NO_COLOR:'1',WRANGLER_SEND_METRICS:'false'}});
}
export function deploy({configPath='wrangler.jsonc',run=wrangler,log=console.log}={}) {
 const config=JSON.parse(readFileSync(configPath,'utf8'));
 if(config.d1_databases?.length||config.r2_buckets?.length||config.kv_namespaces?.length||config.durable_objects?.bindings?.length)throw Error('This LiteOS edition uses device storage. Remove hosted storage bindings before deploying. Existing cloud resources will not be deleted.');
 log('Publishing LiteOS with device storage. No database or bucket will be created.');
 const result=run(['deploy','--config',configPath]);
 const output=[result.stdout,result.stderr,result.error?.message].filter(Boolean).join('\n').trim();
 if(result.status!==0)throw Error('LiteOS deployment failed.\n'+output);
 if(output)log(output);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{deploy();}catch(error){console.error(error.message);process.exitCode=1;}}
