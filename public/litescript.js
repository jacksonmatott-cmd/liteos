// LiteScript 0.1: an intentionally small interpreter. No eval, shell, or host access.
export function tokenize(line){const out=[];const re=/"([^"\n]*)"|'([^'\n]*)'|([^\s]+)/g;let m;while((m=re.exec(line)))out.push(m[1]??m[2]??m[3]);return out;}
export async function runLiteScript(source,host,{maxSteps=200}={}){
 const vars={USER:host.username||'Guest',HOME:'/Home',VERSION:'0.1.0'};let cwd='/Home',steps=0;
 function path(raw=''){raw=raw.replace(/^L:/i,'');if(!raw.startsWith('/'))raw=cwd+'/'+raw;const parts=[];for(const s of raw.replaceAll('\\','/').split('/')){if(!s||s==='.')continue;if(s==='..'){parts.pop();continue;}parts.push(s);}const p='/'+parts.join('/');if(p!=='/Home'&&!p.startsWith('/Home/'))throw Error('Access is limited to L:/Home.');return p;}
 for(const raw of String(source).split(/\r?\n/)){
  if(++steps>maxSteps)throw Error('LiteScript stopped at its command limit.');const line=raw.trim().replace(/%([A-Za-z0-9_]+)%/g,(_,k)=>vars[k.toUpperCase()]??'');if(!line||/^(@?echo off|rem\b|::)/i.test(line))continue;
  const tokens=tokenize(line),cmd=tokens.shift()?.replace(/^@/,'').toLowerCase(),args=tokens,rest=args.join(' ');
  switch(cmd){
   case 'help':host.print('LiteScript commands\nECHO text · SET NAME=value · DIR [path] · CD path · PWD\nMKDIR path · TYPE file · WRITE file text · APPEND file text\nCOPY source destination · MOVE source destination · DEL file\nOPEN app · WHOAMI · DATE · VER · CLEAR · REM comment\nQuote paths with spaces. Variables use %NAME%. Scripts end in .lite.');break;
   case 'echo':host.print(rest);break;
   case 'set':{const i=rest.indexOf('=');if(i<1)throw Error('Usage: SET NAME=value');vars[rest.slice(0,i).toUpperCase().trim()]=rest.slice(i+1);break;}
   case 'pwd':host.print('L:'+cwd);break;
   case 'cd':{const p=path(args[0]||'/Home');if(p!=='/Home'&&!await host.isFolder(p))throw Error('Folder not found.');cwd=p;host.print('L:'+cwd);break;}
   case 'dir':{const p=path(args[0]||'');const files=await host.list(p);host.print('Directory of L:'+p+'\n'+(files.map(f=>(f.kind==='folder'?'<DIR>   ':'        ')+f.name).join('\n')||'(empty)'));break;}
   case 'mkdir':if(!args[0])throw Error('Usage: MKDIR path');await host.mkdir(path(args[0]));host.print('Folder created.');break;
   case 'type':if(!args[0])throw Error('Usage: TYPE file');host.print(await host.read(path(args[0])));break;
   case 'write':case 'append':{const p=path(args[0]||'');if(!args[0])throw Error('Usage: WRITE file text');await host.write(p,(cmd==='append'?await host.read(p):'')+args.slice(1).join(' '));host.print('Saved L:'+p);break;}
   case 'copy':case 'move':{if(args.length<2)throw Error('Usage: '+cmd.toUpperCase()+' source destination');const from=path(args[0]),to=path(args[1]);await host.write(to,await host.read(from));if(cmd==='move')await host.remove(from);host.print('File '+(cmd==='move'?'moved.':'copied.'));break;}
   case 'del':if(!args[0])throw Error('Usage: DEL file');await host.remove(path(args[0]));host.print('Moved to Recycle Bin.');break;
   case 'open':await host.open(rest);break;
   case 'date':host.print(new Date().toLocaleString());break;
   case 'whoami':host.print(host.username||'Guest');break;
   case 'ver':host.print('LiteOS 0.1 · LiteScript 0.1');break;
   case 'clear':case 'cls':host.clear();break;
   default:throw Error('Unknown command: '+cmd+'. Type HELP for commands.');
  }
 }
 return vars;
}
