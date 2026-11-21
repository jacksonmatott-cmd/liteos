import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {deploy} from '../scripts/deploy.mjs';

const id='12345678-1234-1234-1234-123456789abc';
const ok=(stdout='')=>({status:0,stdout,stderr:''});
const error=stderr=>({status:1,stdout:'',stderr});
const buckets=exists=>ok('Listing buckets...\n'+(exists?'name:           liteos-files\ncreation_date:  2026-11-21T00:00:00Z\n':''));
function fixture(overrides={}){
  const dir=mkdtempSync(join(tmpdir(),'liteos-deploy-')),configPath=join(dir,'wrangler.jsonc');
  const config={name:'liteos',vars:{AI_MODEL:'gemma4:31b'},d1_databases:[{binding:'DB',database_name:'liteos-db',migrations_dir:'drizzle',...overrides}],r2_buckets:[{binding:'BUCKET',bucket_name:'liteos-files'}]};
  writeFileSync(configPath,JSON.stringify(config));
  return {configPath,config,cleanup:()=>rmSync(dir,{recursive:true,force:true})};
}
function command(args){return args.slice(0,args.indexOf('--config')).join(' ');}
test('first deployment creates missing storage, resolves the real ID, then migrates before publishing',()=>{
  const f=fixture(),calls=[];let bucket=false,database=false;
  try{deploy({configPath:f.configPath,log:()=>{},run:args=>{
    const c=command(args);calls.push(c);
    if(c==='r2 bucket list')return buckets(bucket);
    if(c==='r2 bucket create liteos-files'){bucket=true;return ok();}
    if(c==='d1 list --json')return ok(JSON.stringify(database?[{uuid:id,name:'liteos-db'}]:[]));
    if(c==='d1 create liteos-db'){database=true;return ok();}
    if(c==='d1 migrations apply DB --remote'){assert.equal(JSON.parse(readFileSync(f.configPath)).d1_databases[0].database_id,id);return ok();}
    if(c==='deploy')return ok();
    throw Error('Unexpected command: '+c);
  }});assert.deepEqual(calls,['r2 bucket list','r2 bucket create liteos-files','r2 bucket list','d1 list --json','d1 create liteos-db','d1 list --json','d1 migrations apply DB --remote','deploy']);const saved=JSON.parse(readFileSync(f.configPath));assert.deepEqual(saved.vars,f.config.vars);assert.equal(saved.d1_databases[0].migrations_dir,'drizzle');}finally{f.cleanup();}
});
test('repeat deployment reuses existing resources and preserves an explicit database ID',()=>{
  const f=fixture({database_id:id}),calls=[];
  try{const before=readFileSync(f.configPath,'utf8');deploy({configPath:f.configPath,log:()=>{},run:args=>{calls.push(command(args));return command(args)==='r2 bucket list'?buckets(true):ok('{}');}});assert.deepEqual(calls,['r2 bucket list','d1 migrations apply DB --remote','deploy']);assert.equal(readFileSync(f.configPath,'utf8'),before);}finally{f.cleanup();}
});
test('an existing named database is bound without creating a replacement',()=>{
  const f=fixture(),calls=[];
  try{deploy({configPath:f.configPath,log:()=>{},run:args=>{const c=command(args);calls.push(c);if(c==='d1 list --json')return ok(JSON.stringify([{uuid:id,name:'liteos-db'}]));return c==='r2 bucket list'?buckets(true):ok('{}');}});assert.ok(!calls.some(c=>c.includes('create')));assert.equal(JSON.parse(readFileSync(f.configPath)).d1_databases[0].database_id,id);}finally{f.cleanup();}
});
test('an R2 permission failure is not mistaken for a missing bucket',()=>{
  const f=fixture(),calls=[];
  try{assert.throws(()=>deploy({configPath:f.configPath,log:()=>{},run:args=>{calls.push(command(args));return error('Authentication error [code: 10000]');}}),/Cannot access R2 storage/);assert.deepEqual(calls,['r2 bucket list']);}finally{f.cleanup();}
});
test('an unsuccessful bucket creation stops before database mutation or publication',()=>{
  const f=fixture(),calls=[];
  try{assert.throws(()=>deploy({configPath:f.configPath,log:()=>{},run:args=>{const c=command(args);calls.push(c);return c.includes(' create ')?error('Please enable R2'):buckets(false);}}),/Could not provision R2/);assert.ok(!calls.some(c=>c.startsWith('d1')||c==='deploy'));}finally{f.cleanup();}
});
test('a migration failure leaves the currently deployed Worker untouched',()=>{
  const f=fixture({database_id:id}),calls=[];
  try{assert.throws(()=>deploy({configPath:f.configPath,log:()=>{},run:args=>{const c=command(args);calls.push(c);return c.startsWith('d1 migrations')?error('SQL migration failed'):c==='r2 bucket list'?buckets(true):ok('{}');}}),/Worker was not published/);assert.ok(!calls.includes('deploy'));}finally{f.cleanup();}
});
test('a bucket created by a concurrent build is accepted only after verification',()=>{
  const f=fixture({database_id:id});let checks=0;
  try{deploy({configPath:f.configPath,log:()=>{},run:args=>{const c=command(args);if(c==='r2 bucket list')return buckets(++checks>1);if(c.startsWith('r2 bucket create'))return error('Bucket already exists');return ok();}});assert.equal(checks,2);}finally{f.cleanup();}
});
