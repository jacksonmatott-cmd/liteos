// Profiles live only in this browser. No hosted database or object store is used.
// These controls protect the LiteOS interface, not a device from its administrator.
const encode = new TextEncoder();
const id = () => crypto.randomUUID();
const hex = value => Array.from(new Uint8Array(value), b => b.toString(16).padStart(2, '0')).join('');
const tokenDigest = async token => hex(await crypto.subtle.digest('SHA-256',encode.encode(token)));
const fail = (message, status = 400) => { throw Object.assign(Error(message), {status}); };
export const DEVICE_POLICIES = Object.freeze({allowAI:true,allowSharing:true,allowTerminal:true,allowExternalApps:true,allowImports:true,childAI:false,childSharing:false,childExternalApps:false,maxUploadMB:20,autoLockMinutes:15});
export async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', encode.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:encode.encode(salt),iterations:210000,hash:'SHA-256'},key,256));
}
export function devicePath(value) {
  if (typeof value !== 'string' || value.length > 700 || /[\x00-\x1f]/.test(value)) fail('Invalid LiteFS path.');
  const parts = value.replaceAll('\\','/').replace(/^L:/i,'').split('/').filter(Boolean);
  if (parts.some(p => p === '.' || p === '..' || p.length > 120 || /[<>:"|?*]/.test(p)) || parts[0] !== 'Home' || parts.length < 2) fail('Use a valid path inside L:/Home.');
  return '/' + parts.join('/');
}
const password = p => { if (typeof p !== 'string' || p.length < 8 || p.length > 200) fail('Use a password between 8 and 200 characters.'); };
const username = n => { n = String(n || '').trim().toLowerCase(); if (!/^[a-z0-9_]{3,30}$/.test(n)) fail('Use 3–30 letters, numbers, or underscores.'); return n; };
const publicUser = u => ({id:u.id,username:u.username,display_name:u.display_name,role:u.role,household_id:u.household_id,preferences:u.preferences || {}});
const policy = (u, pol, feature) => { if (pol[feature] === false || u.role === 'child' && ({allowAI:'childAI',allowSharing:'childSharing',allowExternalApps:'childExternalApps'}[feature]) && !pol[{allowAI:'childAI',allowSharing:'childSharing',allowExternalApps:'childExternalApps'}[feature]]) fail('A parent has restricted this action.',403); };

export class DeviceAccounts {
  constructor({get,set,seed,getToken,setToken,clock=Date.now,device='This browser',lock,restore}) {
    Object.assign(this,{get,set,seed,getToken,setToken,clock,device,lock,restore});
    this.pending = Promise.resolve();
  }
  request(path, options = {}) {
    const execute = () => this.dispatch(path, options);
    if (this.lock) return this.lock(execute);
    const next = this.pending.then(execute, execute);
    this.pending = next.catch(() => {});
    return next;
  }
  async dispatch(path, options) {
    const method = options.method || 'GET';
    const d = typeof options.body === 'string' ? JSON.parse(options.body) : options.body || {};
    const meta = await this.get('accounts-v2') || {users:[],families:[],sessions:[],approvals:[],attempts:{}};
    const time = this.clock();
    meta.sessions = meta.sessions.filter(s => s.expires_at > time);
    meta.approvals = meta.approvals.filter(s => s.expires_at > time);
    const save = () => this.set('accounts-v2', meta);
    const log = (u,event) => { const h=meta.families.find(h=>h.id===u.household_id); h.events=[{id:id(),username:u.username,event,created_at:time},...(h.events || [])].slice(0,500); };
    const reauth = async (u, p) => {
      const k = 'auth:' + u.id;
      const attempt = meta.attempts[k];
      if (attempt?.until > time && attempt.count >= 8) fail('Too many password attempts. Wait five minutes.',429);
      if (typeof p !== 'string' || p.length > 200 || await passwordHash(p,u.salt) !== u.password_hash) {
        meta.attempts[k] = {count:(attempt?.until > time ? attempt.count : 0) + 1,until:time + 300000};
        await save(); fail('Username or password is incorrect.',403);
      }
      delete meta.attempts[k];
    };
    const makeUser = async (data, household, role) => {
      const name = username(data.username); password(data.password);
      if (meta.users.some(u=>u.username===name)) fail('That username already exists on this device.',409);
      const u={id:id(),username:name,display_name:String(data.display_name || name).trim().slice(0,60),household_id:household,role,salt:id(),preferences:{}};
      u.password_hash=await passwordHash(data.password,u.salt);
      // Persist the new file space before publishing the account record.
      await this.set('profile:'+u.id,this.seed());
      meta.users.push(u); log(u,'account.created'); return u;
    };
    const start = async u => {
      const token=id()+id();
      meta.sessions.push({token_hash:await tokenDigest(token),user_id:u.id,created_at:time,expires_at:time+(d.remember ? 2592000000 : 43200000),device:this.device});
      await save(); await this.setToken(token,!!d.remember);
      return {user:publicUser(u),policies:{...DEVICE_POLICIES,...meta.families.find(h=>h.id===u.household_id).policies}};
    };
    if (path === '/auth/register' && method === 'POST') {
      const household=id(); meta.families.push({id:household,policies:{},events:[]});
      const u=await makeUser(d,household,'parent'); return start(u);
    }
    if (path === '/auth/login' && method === 'POST') {
      const u=meta.users.find(u=>u.username===String(d.username || '').trim().toLowerCase());
      if (!u) { await passwordHash(String(d.password || '').slice(0,200),'missing-user'); fail('Username or password is incorrect.',401); }
      await reauth(u,d.password); log(u,'session.login'); return start(u);
    }
    const token=await this.getToken();
    const tokenHash=token ? await tokenDigest(token) : '';
    const session=meta.sessions.find(s=>s.token_hash===tokenHash);
    const u=session && meta.users.find(u=>u.id===session.user_id);
    if (!u) fail('Sign in to a profile on this device.',401);
    const household=meta.families.find(h=>h.id===u.household_id);
    const pol={...DEVICE_POLICIES,...household.policies};
    const requireParent=() => { if(u.role!=='parent') fail('A parent account is required.',403); };
    if (path === '/me') return {user:publicUser(u),policies:pol};
    if (path === '/feature') { policy(u,pol,d.feature); return {ok:true}; }
    if (path === '/auth/logout') { meta.sessions=meta.sessions.filter(s=>s!==session); await save(); await this.setToken(null); return {ok:true}; }
    if (path === '/preferences' && method === 'PATCH') { u.preferences={...u.preferences,...d}; await save(); return {preferences:u.preferences}; }
    if (path === '/password' && method === 'POST') {
      await reauth(u,d.current); password(d.password); u.salt=id(); u.password_hash=await passwordHash(d.password,u.salt);
      meta.sessions=meta.sessions.filter(s=>s===session || s.user_id!==u.id); log(u,'password.changed'); await save(); return {ok:true};
    }
    if (path === '/family' && method === 'GET') { requireParent(); return {members:meta.users.filter(x=>x.household_id===u.household_id).map(publicUser)}; }
    if (path === '/family' && method === 'POST') {
      requireParent(); await reauth(u,d.parentPassword);
      if (!['child','parent'].includes(d.role || 'child')) fail('Choose a parent or child role.');
      const member=await makeUser(d,u.household_id,d.role || 'child'); await save(); return {user:publicUser(member)};
    }
    if (path === '/policies' && method === 'PATCH') {
      requireParent(); await reauth(u,d.parentPassword);
      for (const [key,value] of Object.entries(d.policies || {})) {
        if (!(key in DEVICE_POLICIES)) fail('Unknown policy.');
        if (typeof DEVICE_POLICIES[key] === 'boolean' && typeof value !== 'boolean') fail('Invalid policy value.');
        if (key === 'maxUploadMB' && ![1,5,10,20].includes(value)) fail('Choose a supported file size.');
        if (key === 'autoLockMinutes' && ![0,5,15,30,60].includes(value)) fail('Choose a supported lock timeout.');
      }
      Object.assign(household.policies,d.policies); log(u,'policies.changed'); await save(); return {policies:{...DEVICE_POLICIES,...household.policies}};
    }
    if (path === '/audit') { requireParent(); return {events:household.events || []}; }
    if (path === '/sessions') return {sessions:meta.sessions.filter(s=>s.user_id===u.id).map(s=>({...s,current:s===session}))};
    if (path === '/sessions/revoke') { meta.sessions=meta.sessions.filter(s=>s.user_id!==u.id || s.token_hash!==d.id); await save(); return {ok:true}; }
    if (path === '/shares') return {shares:[]};
    if (path === '/parent-approve' && method === 'POST') {
      const parent=meta.users.find(p=>p.username===String(d.username || '').trim().toLowerCase() && p.role==='parent' && p.household_id===u.household_id);
      if(!parent) fail('Use a parent account from your family on this device.',403);
      await reauth(parent,d.password); const approval=id();
      meta.approvals.push({approval,session:tokenHash,expires_at:time+60000}); await save(); return {approval};
    }
    if (path === '/clear-browser-data' && method === 'POST') {
      const approved=meta.approvals.find(a=>a.approval===d.approval && a.session===tokenHash);
      if(!approved) fail('Fresh parent approval is required.',403);
      meta.approvals=meta.approvals.filter(a=>a!==approved); await save(); return {ok:true};
    }
    const files=await this.get('profile:'+u.id) || [];
    const persist=async () => { await this.set('profile:'+u.id,files); await save(); return {ok:true}; };
    const quota=(incoming,replaced=0) => { if(files.reduce((sum,f)=>sum+(f.size || 0),0)-replaced+incoming>250*1048576) fail('This profile has reached its 250 MB allowance.',413); };
    const getFile = fileId => files.find(f=>f.id===fileId) || fail('File not found.',404);
    const add = (input,blob) => {
      const path=devicePath(input.path),parent=path.slice(0,path.lastIndexOf('/'));
      if(files.some(f=>f.path===path)) fail('A file already exists at this path.',409);
      if(parent!=='/Home'&&!files.some(f=>f.path===parent&&f.kind==='folder'&&!f.trashed)) fail('Parent folder does not exist.');
      const content=String(input.content || ''),kind=input.kind==='folder'?'folder':'file';
      if(!blob && encode.encode(content).length>1048576) fail('Text documents support up to 1 MB.',413);
      const size=kind==='folder'?0:blob?blob.size:encode.encode(content).length; quota(size);
      files.push({id:id(),path,name:path.split('/').at(-1),kind,mime:kind==='folder'?'inode/directory':blob?.type || 'text/plain',size,content:blob?null:content,blob:blob || null,modified_at:time,trashed:0});
    };
    if(path==='/workspace/import' && method==='POST') {
      policy(u,pol,'allowImports');
      if(!this.restore) fail('Workspace restore is unavailable.');
      const restored=this.restore(files,d.workspace);
      if(d.workspace.files.some(f=>f.size>pol.maxUploadMB*1048576)) fail('A backup file exceeds your family import limit.');
      await this.set('profile:'+u.id,restored.files);
      Object.assign(u.preferences,restored.preferences);log(u,'workspace.imported');await save();return {preferences:u.preferences};
    }
    if(path==='/files' && method==='GET') return {files};
    if(path==='/files' && method==='POST') { add(d); return persist(); }
    if(path==='/files/import' && method==='POST') {
      policy(u,pol,'allowImports'); const blob=d.get('file');
      if(!(blob instanceof Blob)) fail('Choose a file.');
      if(blob.size>pol.maxUploadMB*1048576) fail('This file exceeds the family upload limit.',413);
      add({path:d.get('path')},blob); log(u,'file.imported'); return persist();
    }
    if(path.startsWith('/files/') && method==='PATCH') {
      const f=getFile(path.split('/')[2]);
      if('content' in d) {
        const content=String(d.content);const size=encode.encode(content).length;
        if(size>1048576) fail('Text documents support up to 1 MB.',413);quota(size,f.size);
        Object.assign(f,{content,size,blob:null,mime:'text/plain'});
      }
      if('name' in d) {
        if(typeof d.name!=='string'||!d.name.trim()||/[\\/:*?"<>|]/.test(d.name)) fail('Use a filename without slashes or special characters.');
        const old=f.path,next=devicePath(old.slice(0,old.lastIndexOf('/')+1)+d.name);
        if(files.some(x=>x!==f&&x.path===next)) fail('That name already exists.',409);
        for(const child of files) if(child.path.startsWith(old+'/')) child.path=next+child.path.slice(old.length);
        f.name=d.name;f.path=next;
      }
      if('trashed' in d) { f.trashed=d.trashed?1:0; if(f.kind==='folder') for(const child of files) if(child.path.startsWith(f.path+'/')) child.trashed=f.trashed; }
      f.modified_at=time;return persist();
    }
    if(path.startsWith('/files/') && method==='DELETE') {
      const f=getFile(path.split('/')[2]);if(!f.trashed) fail('Move the file to Recycle Bin first.');
      await this.set('profile:'+u.id,files.filter(x=>x.id!==f.id&&!(f.kind==='folder'&&x.path.startsWith(f.path+'/'))));
      log(u,'file.deleted');await save();return {ok:true};
    }
    fail('This device action is not available.',404);
  }
}
