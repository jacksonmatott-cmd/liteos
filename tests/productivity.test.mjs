import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateCell,sheetValue,sampleSheet,parseCSV,parseSheet,toCSV,markdownHTML} from '../public/productivity.js';
import {sandboxPolicy} from '../worker/core.js';
test('sheets calculate dependent cells, ranges, and arithmetic precedence',()=>{
  const cells={...sampleSheet(),F1:'=D6+10/2',F2:'=AVERAGE(B2:B5)',F3:'=MAX(B2:B4)-MIN(B2:B4)',F4:'=SUM(B2, 2, B3:B4)',F5:'=-(2+3)*4'};
  assert.equal(evaluateCell(cells,'D6'),22);assert.equal(evaluateCell(cells,'F1'),27);assert.equal(evaluateCell(cells,'F2'),8.5/3);assert.equal(evaluateCell(cells,'F3'),3.5);assert.equal(evaluateCell(cells,'F4'),10.5);assert.equal(evaluateCell(cells,'F5'),-20);
});
test('sheets reject executable expressions, invalid references, cycles, and division by zero',()=>{
  assert.equal(sheetValue({A1:'=B1',B1:'=A1'},'A1'),'#CYCLE!');assert.equal(sheetValue({A1:'=1/0'},'A1'),'#DIV/0!');assert.equal(sheetValue({A1:'=A25'},'A1'),'#REF!');assert.equal(sheetValue({A1:'=process.exit()'},'A1'),'#FORMULA!');assert.equal(sheetValue({A1:'=globalThis.fetch("https://example.com")'},'A1'),'#FORMULA!');
});
test('CSV imports quoted commas, newlines, escaped quotes, and rejects data beyond the grid',()=>{
  const cells=parseCSV('Name,Description\r\nTest,"A comma, a quote "" and a\nnewline"');assert.equal(cells.A2,'Test');assert.equal(cells.B2,'A comma, a quote " and a\nnewline');assert.throws(()=>parseCSV('a,b,c,d,e,f,g,h,i'),/8 columns/);assert.throws(()=>parseCSV('"unfinished'),/unclosed/);
});
test('spreadsheet saves preserve formulas while CSV exports values and neutralizes formula-like text',()=>{
  const cells={A1:'Value',A2:'12',B2:'=A2*2',A3:'@malicious',B3:'+not_a_number'};assert.deepEqual(parseSheet(JSON.stringify({version:1,cells})),cells);const csv=toCSV(cells);assert.match(csv,/"12","24"/);assert.match(csv,/"'@malicious","'\+not_a_number"/);assert.throws(()=>parseSheet('{"version":1,"cells":{"Z100":"x"}}'),/#REF!/);
});
test('document preview formats text while escaping executable markup',()=>{
  const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');const html=markdownHTML('# Hello\n\n**Bold** and _italic_\n- <img src=x onerror=alert(1)>',escape);assert.match(html,/<h1>Hello<\/h1>/);assert.match(html,/<strong>Bold<\/strong>/);assert.match(html,/<em>italic<\/em>/);assert.ok(!html.includes('<img'));assert.match(html,/&lt;img/);
});
test('HTML apps have an opaque sandbox, no network connection permission, and a separate script policy',()=>{
  const policy=sandboxPolicy('https://liteos.test');assert.match(policy,/sandbox allow-scripts allow-downloads/);assert.ok(!policy.includes('allow-same-origin'));assert.match(policy,/connect-src 'none'/);assert.match(policy,/form-action 'none'/);assert.match(policy,/script-src 'unsafe-inline'/);
});
