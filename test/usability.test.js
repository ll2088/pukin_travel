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

test('详细行程文档存在且包含 Day 1 至 Day 4 四个二级标题', () => {
  const docPath = path.join(__dirname, '..', 'docs', 'phuket-4d3n.md');
  assert.ok(fs.existsSync(docPath), 'docs/phuket-4d3n.md 不存在');
  const doc = fs.readFileSync(docPath, 'utf8');
  for (let d = 1; d <= 4; d++) {
    assert.ok(new RegExp('^## Day ' + d + '\\b', 'm').test(doc), '缺少 Day ' + d + ' 二级标题');
  }
});

test('详细行程文档包含景点、美食、一日游、预算、风险关键词', () => {
  const docPath = path.join(__dirname, '..', 'docs', 'phuket-4d3n.md');
  const doc = fs.readFileSync(docPath, 'utf8');
  for (const word of ['景点', '美食', '一日游', '预算', '风险']) {
    assert.ok(doc.includes(word), '缺少关键词：' + word);
  }
});

test('详细行程文档总字数不少于 1500 字', () => {
  const docPath = path.join(__dirname, '..', 'docs', 'phuket-4d3n.md');
  const doc = fs.readFileSync(docPath, 'utf8');
  assert.ok(doc.length >= 1500, '文档总字数不足 1500 字');
});
