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

export function stagedSummary(records) {
  const values = [...records];
  return {
    count: values.length,
    bytes: values.reduce((sum, record) => sum + record.file.size, 0),
    hasExe: values.some(record => record.path === '/Oblivion/Oblivion.exe'),
    hasMaster: values.some(record => record.path === '/Oblivion/Data/Oblivion.esm'),
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
