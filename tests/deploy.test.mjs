import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {deploy} from '../scripts/deploy.mjs';
function fixture(config={name:'liteos',main:'dist/server/index.js'}){const directory=mkdtempSync(join(tmpdir(),'liteos-deploy-')),configPath=join(directory,'wrangler.jsonc');writeFileSync(configPath,JSON.stringify(config));return {configPath,close:()=>rmSync(directory,{recursive:true,force:true})};}
test('deploy publishes directly without listing or provisioning any storage',()=>{const f=fixture(),calls=[];try{deploy({configPath:f.configPath,log:()=>{},run:args=>{calls.push(args);return {status:0,stdout:'Published',stderr:''};}});assert.deepEqual(calls,[['deploy','--config',f.configPath]]);}finally{f.close();}});
test('legacy storage configuration is rejected without deleting resources or publishing',()=>{for(const binding of [{d1_databases:[{binding:'DB'}]},{r2_buckets:[{binding:'BUCKET'}]},{kv_namespaces:[{binding:'KV'}]}]){const f=fixture({name:'liteos',...binding});let ran=false;try{assert.throws(()=>deploy({configPath:f.configPath,log:()=>{},run:()=>{ran=true;}}),/device storage/);assert.equal(ran,false);assert.deepEqual(JSON.parse(readFileSync(f.configPath,'utf8')),{name:'liteos',...binding});}finally{f.close();}}});
test('failed deployments report the actual provider error',()=>{const f=fixture();try{assert.throws(()=>deploy({configPath:f.configPath,log:()=>{},run:()=>({status:1,stderr:'Worker permission denied'})}),/Worker permission denied/);}finally{f.close();}});
test('repository configuration declares no hosted storage',()=>{const config=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));const hosting=JSON.parse(readFileSync(new URL('../.openai/hosting.json',import.meta.url),'utf8'));assert.equal(config.d1_databases,undefined);assert.equal(config.r2_buckets,undefined);assert.equal(hosting.d1,undefined);assert.equal(hosting.r2,undefined);});
