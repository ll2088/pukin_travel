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

test('README 无乱码且内部锚点链接有效', () => {
  assert.ok(!/\uFFFD/.test(readme), '存在乱码字符');
  const anchors = new Set();
  for (const line of readme.split('\n')) {
    const m = line.match(/^#{1,6}\s+(.+)$/);
    if (!m) continue;
    const slug = m[1]
      .trim()
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5\- ]/g, '')
      .replace(/\s+/g, '-');
    anchors.add(slug);
  }
  const links = readme.match(/\]\(#[^)]+\)/g) || [];
  for (const link of links) {
    const target = link.slice(2, -1);
    assert.ok(anchors.has(target), '无效锚点链接：#' + target);
  }
});
