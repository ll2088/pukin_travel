const fs = require('fs');
const path = require('path');
const assert = require('assert');

const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');

function test(name, fn) {
  try {
    fn();
    console.log('PASS ' + name);
  } catch (err) {
    console.error('FAIL ' + name);
    console.error(err.message);
    process.exitCode = 1;
  }
}

test('标题层级清晰且包含一级标题', () => {
  assert.ok(/^# /m.test(readme), '缺少一级标题');
  assert.ok(/^## /m.test(readme), '缺少二级标题');
  assert.ok(/^### /m.test(readme), '缺少三级标题');
});

test('行前准备使用可勾选清单', () => {
  const match = readme.match(/^## 行前准备\s*$/m);
  assert.ok(match, '缺少行前准备小节');
  const rest = readme.slice(match.index + match[0].length);
  const next = rest.search(/^## /m);
  const body = next === -1 ? rest : rest.slice(0, next);
  assert.ok(/- \[ \]/.test(body), '行前准备缺少可勾选清单');
});

test('关键信息易检索：包含地址/时段/预订提示关键词', () => {
  assert.ok(readme.includes('预订提示'), '缺少预订提示');
  assert.ok(readme.includes('车程'), '缺少时段/车程信息');
  assert.ok(readme.includes('集合时间'), '缺少集合时间提示');
});

test('详细行程文档存在且包含至少 4 个二级标题和 4 个三级标题', () => {
  const docPath = path.join(__dirname, '..', 'docs', 'phuket-4d3n.md');
  assert.ok(fs.existsSync(docPath), 'docs/phuket-4d3n.md 不存在');
  const doc = fs.readFileSync(docPath, 'utf8');
  const h2 = doc.match(/^## /gm) || [];
  assert.ok(h2.length >= 4, '二级标题数量不足 4 个');
  const h3 = doc.match(/^### /gm) || [];
  assert.ok(h3.length >= 4, '三级标题数量不足 4 个');
});

test('详细行程文档无空小节与 TODO/占位符', () => {
  const docPath = path.join(__dirname, '..', 'docs', 'phuket-4d3n.md');
  const doc = fs.readFileSync(docPath, 'utf8');
  assert.ok(!/TODO|待补充|占位/.test(doc), '文档存在占位符');
  const parts = doc.split(/^## /m).slice(1);
  for (const part of parts) {
    const title = part.split('\n')[0].trim();
    const body = part.split('\n').slice(1).join('\n').trim();
    assert.ok(body.length > 0, '空小节：' + title);
  }
});

test('详细行程文档内相对链接目标存在', () => {
  const docPath = path.join(__dirname, '..', 'docs', 'phuket-4d3n.md');
  const doc = fs.readFileSync(docPath, 'utf8');
  const links = [...doc.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
  for (const link of links) {
    if (/^(https?:|#|mailto:)/.test(link)) continue;
    const target = path.resolve(path.dirname(docPath), link.split('#')[0]);
    assert.ok(fs.existsSync(target), '断链：' + link);
  }
});

test('详细行程文档每日至少 3 条含时段或地点的安排', () => {
  const docPath = path.join(__dirname, '..', 'docs', 'phuket-4d3n.md');
  const doc = fs.readFileSync(docPath, 'utf8');
  for (let d = 1; d <= 4; d++) {
    const match = doc.match(new RegExp('^## Day ' + d + '[^\\n]*$', 'm'));
    assert.ok(match, '缺少 Day ' + d);
    const rest = doc.slice(match.index + match[0].length);
    const next = rest.search(/^## /m);
    const body = next === -1 ? rest : rest.slice(0, next);
    const items = body.split('\n').filter((line) => /^上午：|^下午：|^晚间：/.test(line.trim()));
    assert.ok(items.length >= 3, 'Day ' + d + ' 时段安排不足 3 条');
  }
});
