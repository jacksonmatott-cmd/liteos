const MiB = 1024 * 1024;
export const SIZE_ACK_BYTES = 512 * MiB;
export const MOBILE_CAP_BYTES = 1024 * MiB;
export const DESKTOP_CAP_BYTES = 6 * 1024 * MiB;

export function normalizeOblivionPath(input) {
  if (typeof input !== 'string' || !input || input.length > 900 || /[\x00-\x1f]/.test(input)) throw Error('Invalid selected file path.');
  const parts = input.replaceAll('\\', '/').split('/').filter(Boolean);
  if (!parts.length || parts.some(part => part === '.' || part === '..' || /[:<>"|?*]/.test(part))) throw Error('The selected path contains unsupported characters.');
  const name = parts.at(-1);
  const dataIndex = parts.findIndex(part => part.toLowerCase() === 'data');
  if (/^oblivion(?:\s*\(\d+\))?\.esm$/i.test(name)) return '/Oblivion/Data/Oblivion.esm';
  if (/^oblivion\.exe$/i.test(name)) return '/Oblivion/Oblivion.exe';
  if (dataIndex >= 0) return '/Oblivion/Data/' + parts.slice(dataIndex + 1).join('/');
  if (/\.(?:bsa|esm|esp)$/i.test(name)) return '/Oblivion/Data/' + name;
  if (parts.length > 1 && !/\.(?:dll|ini|txt|cfg)$/i.test(name)) {
    // A complete selected installation preserves folders such as Music and Video.
    return '/Oblivion/' + parts.slice(1).join('/');
  }
  return '/Oblivion/' + name;
}

// Resolve a selected Steam library to one installation before normalizing paths.
// Only the chosen Oblivion subtree is staged; Steam accounts/client files stay out.
export function planOblivionImport(input){
  if(!Array.isArray(input)||input.length>30000)throw Error('Choose one Oblivion folder with fewer than 30,000 files.');
  const entries=input.map(file=>{const source=file.webkitRelativePath||file.name;if(typeof source!=='string'||!source||source.length>900||/^[\\/]|[\x00-\x1f:]/.test(source))throw Error('Invalid selected file path.');const parts=source.replaceAll('\\','/').split('/');if(parts.some(p=>!p||p==='.'||p==='..'||/[<>"|?*]/.test(p)))throw Error('Invalid selected file path.');return {file,parts};});
  const roots=new Map();for(const entry of entries)if(entry.parts.at(-1).toLowerCase()==='oblivion.exe'){const root=entry.parts.slice(0,-1);roots.set(root.join('/').toLowerCase(),root);}
  if(roots.size>1)throw Error('Several Oblivion installations were selected. Choose one steamapps/common/Oblivion folder.');
  if(!roots.size&&entries.some(e=>e.parts.some(p=>/oblivion.?remastered/i.test(p))))throw Error('This preset requires classic 32-bit Oblivion, not Oblivion Remastered.');
  const root=roots.values().next().value,records=[],seen=new Set();
  for(const entry of entries){let parts=entry.parts;
    if(root){if(parts.length<=root.length||root.some((p,i)=>p.toLowerCase()!==parts[i].toLowerCase()))continue;parts=parts.slice(root.length);}
    if(/^(?:_CommonRedist|DirectX|DXRedist|Installers|__MACOSX)$/i.test(parts[0])||/^\./.test(parts.at(-1)))continue;
    let path;
    if(root){if(parts[0].toLowerCase()==='data')parts[0]='Data';const name=parts.at(-1);if(parts.length===1&&/^oblivion\.exe$/i.test(name))parts[0]='Oblivion.exe';if(parts.length===1&&/^oblivion(?:\s*\(\d+\))?\.esm$/i.test(name))parts=['Data','Oblivion.esm'];if(parts.length===1&&/\.(bsa|esm|esp)$/i.test(parts[0]))parts=['Data',parts[0]];path='/Oblivion/'+parts.join('/');}
    else path=normalizeOblivionPath(parts.join('/'));
    const key=path.toLowerCase();if(seen.has(key))throw Error('Duplicate game path: '+path);seen.add(key);
    if(!Number.isSafeInteger(entry.file.size)||entry.file.size<0)throw Error('Invalid selected file size.');
    records.push({file:entry.file,path});
  }
  if(records.length>12000)throw Error('This experiment accepts up to 12,000 game files.');
  return {records,skipped:input.length-records.length,root:root?.join('/')||''};
}

export function stagedSummary(records) {
  const values = [...records];
  return {
    count: values.length,
    bytes: values.reduce((sum, record) => sum + record.file.size, 0),
    hasExe: values.some(record => record.path.toLowerCase() === '/oblivion/oblivion.exe'),
    hasMaster: values.some(record => record.path.toLowerCase() === '/oblivion/data/oblivion.esm'),
    hasBink: values.some(record => record.path.toLowerCase() === '/oblivion/binkw32.dll'),
    archives: values.filter(record => /\.bsa$/i.test(record.path)).length,
  };
}

export function budgetError(bytes, mobile, acknowledged) {
  if (!Number.isSafeInteger(bytes) || bytes < 0) return 'Invalid selection size.';
  if (bytes > (mobile ? MOBILE_CAP_BYTES : DESKTOP_CAP_BYTES)) return mobile
    ? 'This probe limits touch devices to 1 GB of selected files. Use a desktop for a larger experiment.'
    : 'This dependency probe limits a selection to 6 GB. It does not provide lazy loading for a full installation.';
  if (bytes > SIZE_ACK_BYTES && !acknowledged) return 'Acknowledge the memory requirement before importing more than 512 MB.';
  return '';
}
