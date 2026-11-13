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

function docSection(title) {
  const re = new RegExp('^## ' + title + '\\s*$', 'm');
  const match = doc.match(re);
  if (!match) return '';
  const start = match.index + match[0].length;
  const rest = doc.slice(start);
  const next = rest.search(/^## /m);
  return next === -1 ? rest : rest.slice(0, next);
}

test('详细行程文档存在且总字数不低于 3000 字符', () => {
  assert.ok(doc, 'docs/phuket-4d3n.md 不存在或为空');
  assert.ok(doc.length >= 3000, '文档字符数不足 3000，当前 ' + doc.length);
});

test('详细行程文档包含逐日行程 Day 1 至 Day 4', () => {
  for (let d = 1; d <= 4; d++) {
    assert.ok(new RegExp('^## Day ' + d + '\\b', 'm').test(doc), '缺少 Day ' + d);
  }
  assert.ok(!/Day\s*5|5天4晚/.test(doc), '文档残留 Day 5 或 5天4晚');
});

test('详细行程文档包含 ETA 签证、交通、住宿、预算与备选方案小节', () => {
  for (const title of ['ETA', '交通', '住宿', '季节与住宿区决策', '预算', '备选方案']) {
    assert.ok(docSection(title).trim().length > 0, '缺少小节：' + title);
  }
});

test('ETA 小节说明停留期冲突并标注来源与日期', () => {
  const eta = docSection('ETA');
  assert.ok(eta.includes('60 天'), 'ETA 小节缺少 60 天停留期说明');
  assert.ok(eta.includes('30 天'), 'ETA 小节缺少与免签 30 天的冲突说明');
  assert.ok(eta.includes('检索日期'), 'ETA 小节缺少来源日期');
  assert.ok(/官方/.test(eta), 'ETA 小节缺少以官方为准的提示');
});

test('预算小节包含具体金额数字与货币单位', () => {
  const budget = docSection('预算');
  assert.ok(budget.trim().length > 0, '缺少预算小节');
  assert.ok(/\d{3,}/.test(budget), '预算缺少具体金额数字');
  assert.ok(/元人民币|泰铢/.test(budget), '预算缺少货币单位');
  assert.ok(/\|\s*合计\s*\|/.test(budget), '预算缺少合计行');
});

test('备选方案小节至少包含一条可执行备选', () => {
  const alt = docSection('备选方案');
  assert.ok(alt.trim().length > 0, '缺少备选方案小节');
  const items = alt.split('\n').filter((line) => line.trim().startsWith('-'));
  assert.ok(items.length >= 1, '备选方案缺少条目');
});
