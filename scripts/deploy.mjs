import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {stripVTControlCharacters} from 'node:util';

function wrangler(args){
  return spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{
    encoding:'utf8',stdio:['ignore','pipe','pipe'],
    env:{...process.env,CI:'true',NO_COLOR:'1',WRANGLER_SEND_METRICS:'false'}
  });
}
function output(result){return [result.stdout,result.stderr,result.error?.message].filter(Boolean).join('\n').trim();}
function failed(result){return result.status!==0;}
function bucketNames(stdout){
  const text=stripVTControlCharacters(stdout||'').trim();
  if(text.startsWith('[')){
    const list=JSON.parse(text);
    if(!Array.isArray(list))throw Error('Invalid R2 bucket list.');
    return list.map(bucket=>bucket.name);
  }
  const names=[...text.matchAll(/^\s*name:\s*(\S+)\s*$/gm)].map(match=>match[1]);
  if(!names.length&&!/Listing buckets\.\.\./.test(text))throw Error('Wrangler returned an unreadable R2 bucket list. No Worker was published.');
  return names;
}

// Explicit storage checks work in Workers Builds even when automatic binding
// provisioning is skipped. No cloud resources or user records are deleted.
export function deploy({configPath='wrangler.jsonc',run=wrangler,log=console.log}={}){
  const config=JSON.parse(readFileSync(configPath,'utf8'));
  const bucket=config.r2_buckets?.find(b=>b.binding==='BUCKET');
  const database=config.d1_databases?.find(d=>d.binding==='DB');
  if(!bucket?.bucket_name||!database?.database_name)throw Error('LiteOS requires named BUCKET and DB bindings in wrangler.jsonc.');
  const options=['--config',configPath];
  const region=bucket.jurisdiction?['--jurisdiction',bucket.jurisdiction]:[];
  const invoke=args=>run([...args,...options]);
  function checked(args,label){
    const result=invoke(args);
    if(failed(result))throw Error(`${label}\n${output(result)}`);
    if(output(result))log(output(result));
    return result;
  }

  log(`Checking R2 bucket ${bucket.bucket_name}…`);
  // The list command only needs storage access. The info command also queries
  // analytics, which is unnecessary for deployment and can reject build tokens.
  function hasBucket(){
    const result=invoke(['r2','bucket','list',...region]);
    if(failed(result))throw Error(`Cannot access R2 storage. R2 must be enabled on this Cloudflare account, and the build token must have R2 storage access.\n${output(result)}`);
    return bucketNames(result.stdout).includes(bucket.bucket_name);
  }
  if(!hasBucket()){
    log(`Creating R2 bucket ${bucket.bucket_name}…`);
    const creation=invoke(['r2','bucket','create',bucket.bucket_name,...region]);
    // A simultaneous build can create the bucket first. Only accept that case
    // after a fresh storage listing confirms the exact configured bucket.
    if(!hasBucket())throw Error(`Could not provision R2 bucket ${bucket.bucket_name}. Enable R2 and grant the build token R2 storage access, then retry.\n${output(creation)}`);
    log(`R2 bucket ${bucket.bucket_name} is ready.`);
  }else log(`Using existing R2 bucket ${bucket.bucket_name}.`);

  if(!database.database_id){
    function findDatabase(){
      const result=invoke(['d1','list','--json']);
      if(failed(result))throw Error(`Cannot list D1 databases. The build token needs D1 access.\n${output(result)}`);
      let list;
      try{list=JSON.parse(result.stdout);}catch{throw Error('Wrangler returned an unreadable D1 database list. No Worker was published.');}
      if(!Array.isArray(list))throw Error('Wrangler returned an invalid D1 database list. No Worker was published.');
      return list.find(d=>d.name===database.database_name);
    }
    let existing=findDatabase();
    if(!existing){
      log(`Creating D1 database ${database.database_name}…`);
      const creation=invoke(['d1','create',database.database_name]);
      existing=findDatabase();
      if(!existing)throw Error(`Could not provision D1 database ${database.database_name}.\n${output(creation)}`);
    }
    if(typeof existing.uuid!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(existing.uuid))throw Error('Cloudflare did not return a valid D1 database ID. No Worker was published.');
    database.database_id=existing.uuid;
    const temporary=configPath+'.liteos.tmp';
    writeFileSync(temporary,JSON.stringify(config,null,2)+'\n');
    renameSync(temporary,configPath);
    log(`Resolved D1 database ${database.database_name}.`);
  }else log(`Using configured D1 database ${database.database_name}.`);

  log('Applying database migrations before publishing…');
  checked(['d1','migrations','apply','DB','--remote'],'Database migration failed. The Worker was not published.');
  log('Publishing LiteOS…');
  checked(['deploy'],'LiteOS deployment failed.');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{deploy();}catch(error){console.error(`LiteOS deployment stopped: ${error.message}`);process.exitCode=1;}
}
