const fs = require('fs');
const path = require('path');
const assert = require('assert');

const docPath = path.join(__dirname, '..', 'docs', 'phuket-4d3n.md');
const doc = fs.existsSync(docPath) ? fs.readFileSync(docPath, 'utf8') : '';

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

test('详细行程文档包含五个必备章节', () => {
  assert.ok(doc, 'docs/phuket-4d3n.md 不存在或为空');
  for (const title of ['行程', '住宿', '实用贴士', '风险提示', '行前清单']) {
    assert.ok(new RegExp('^## ' + title + '\\s*$', 'm').test(doc), '缺少章节：' + title);
  }
});

test('详细行程文档恰好有 4 个 Day 三级标题', () => {
  const days = doc.match(/^### Day /gm) || [];
  assert.strictEqual(days.length, 4, 'Day 三级标题数量应为 4，实际为 ' + days.length);
});

test('详细行程文档总字数不少于 2000 字符且含预算与备选关键词', () => {
  assert.ok(doc.length >= 2000, '文档总字符数不足 2000，实际为 ' + doc.length);
  assert.ok(doc.includes('预算'), '缺少预算关键词');
  assert.ok(doc.includes('备选'), '缺少备选关键词');
  assert.ok(doc.includes('餐饮'), '缺少餐饮关键词');
});
