const fs = require('fs');
const path = require('path');
const assert = require('assert');

const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
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

function section(title) {
  const re = new RegExp('^## ' + title + '\\s*$', 'm');
  const match = readme.match(re);
  if (!match) return '';
  const start = match.index + match[0].length;
  const rest = readme.slice(start);
  const next = rest.search(/^## /m);
  return next === -1 ? rest : rest.slice(0, next);
}

function daySection(day) {
  // 两种结构：单套行程用「### 第 N 天」，两套排法（行程A/B）用「#### Day N」。
  // 两套排法时取第一套（行程A）的当天内容。
  const re = new RegExp('^### 第 ' + day + ' 天[^\\n]*$', 'm');
  const match = readme.match(re);
  if (match) {
    const rest = readme.slice(match.index + match[0].length);
    const next = rest.search(/^### /m);
    return next === -1 ? rest : rest.slice(0, next);
  }
  const reAlt = new RegExp('^#### Day ' + day + '[^\\n]*$', 'm');
  const matchAlt = readme.match(reAlt);
  if (!matchAlt) return '';
  const rest = readme.slice(matchAlt.index + matchAlt[0].length);
  const next = rest.search(/^#### /m);
  return next === -1 ? rest : rest.slice(0, next);
}

test('README 包含 4 天逐日行程且每天有上午/下午/晚间', () => {
  for (let d = 1; d <= 4; d++) {
    const body = daySection(d);
    assert.ok(body, '缺少第 ' + d + ' 天小节');
    assert.ok(body.includes('上午'), '第 ' + d + ' 天缺少上午安排');
    assert.ok(body.includes('下午'), '第 ' + d + ' 天缺少下午安排');
    assert.ok(body.includes('晚间'), '第 ' + d + ' 天缺少晚间安排');
  }
});

test('README 包含住宿、交通、预算、行前准备四个独立小节', () => {
  for (const title of ['住宿', '交通', '预算', '行前准备']) {
    assert.ok(section(title).trim().length > 0, '缺少小节：' + title);
  }
});

test('预算分项之和等于总预算且非负', () => {
  const body = section('预算');
  const rows = body.split('\n').filter((line) => line.startsWith('|'));
  const items = {};
  for (const row of rows) {
    const cells = row.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;
    const value = Number(cells[1]);
    if (!Number.isNaN(value)) items[cells[0]] = value;
  }
  const total = items['合计'];
  assert.ok(typeof total === 'number', '缺少合计行');
  const parts = ['机票', '住宿', '餐饮', '交通', '门票与活动'];
  let sum = 0;
  for (const key of parts) {
    assert.ok(typeof items[key] === 'number', '缺少预算分项：' + key);
    assert.ok(items[key] >= 0, '预算分项为负：' + key);
    sum += items[key];
  }
  assert.strictEqual(sum, total, '分项之和 ' + sum + ' 不等于总预算 ' + total);
});

test('逐日行程引用的地点与交通方式在文档内有说明', () => {
  const defined = ['芭东', '卡塔', '卡伦', '普吉镇', '皮皮岛', '机场', 'Grab', 'Bolt', '包车', '一日游'];
  for (let d = 1; d <= 4; d++) {
    const body = daySection(d);
    for (const word of defined) {
      if (body.includes(word)) {
        assert.ok(readme.includes(word), '未定义引用：' + word);
      }
    }
  }
});

test('README 不残留占位符或搜索简报重复段落', () => {
  assert.ok(!/TODO|待补充/.test(readme), '存在占位符');
  assert.ok(!readme.includes('关键词: 普吉岛4天3晚旅游计划'), '残留搜索简报原文');
});

test('README 包含指向 docs/phuket-4d3n.md 的链接', () => {
  assert.ok(readme.includes('docs/phuket-4d3n.md'), '缺少详细行程文档链接');
});

test('README 指向新文档且无旧模板残留', () => {
  assert.ok(readme.includes('docs/phuket-4d3n.md'), '缺少详细行程文档链接');
  assert.ok(!/5天4晚|Day\s*5/.test(readme), 'README 残留旧模板表述');
});

test('详细行程文档包含 Day 1–Day 4 且不含 Day 5', () => {
  assert.ok(doc, 'docs/phuket-4d3n.md 不存在或为空');
  for (let d = 1; d <= 4; d++) {
    assert.ok(new RegExp('^## Day ' + d + '\\b', 'm').test(doc), '缺少 Day ' + d);
  }
  assert.ok(!/Day\s*5|5天4晚/.test(doc), '文档残留 Day 5 或 5天4晚');
});

test('详细行程文档预算按交通/住宿/餐饮/跳岛分项并含货币单位总计', () => {
  const budget = docSection('预算');
  assert.ok(budget.trim().length > 0, '缺少预算小节');
  for (const key of ['交通', '住宿', '餐饮', '跳岛']) {
    assert.ok(new RegExp('\\|\\s*' + key + '\\s*\\|').test(budget), '预算缺少分项：' + key);
  }
  assert.ok(/\|\s*合计\s*\|[^|]*元人民币/.test(budget), '预算缺少带货币单位的总计');
});

test('详细行程文档含交通、跳岛备选与 TDAC 说明', () => {
  const transport = docSection('交通');
  assert.ok(transport.includes('机场') && transport.includes('跳岛'), '交通小节缺少机场或跳岛说明');
  assert.ok(doc.includes('TDAC'), '缺少 TDAC 说明');
  assert.ok(/跳岛|环岛/.test(doc) && /取消|停驶|替代/.test(doc), '缺少跳岛备选或取消方案');
  assert.ok(doc.replace(/\s/g, '').length >= 1500, '正文非空白字符数不足 1500');
});

test('详细行程文档含交通价格对比、住宿分区与升级方案', () => {
  assert.ok(doc.includes('Bolt'), '缺少 Bolt 价格说明');
  assert.ok(doc.includes('40–80 泰铢'), '缺少芭东到普吉镇大巴价格');
  assert.ok(doc.includes('100 泰铢'), '缺少机场巴士价格');
  assert.ok(/^## 住宿分区与选择\s*$/m.test(doc), '缺少住宿分区小节');
  assert.ok(/^## 可选升级方案\s*$/m.test(doc), '缺少可选升级小节');
  assert.ok(doc.includes('10 月 15 日'), '缺少斯米兰开放期说明');
});

test('详细行程文档预算含交叉参考基线', () => {
  assert.ok(doc.includes('3251.5'), '缺少预算交叉参考');
  assert.ok(doc.includes('元人民币'), '缺少人民币总计');
});

function docSection(title) {
  const re = new RegExp('^## ' + title + '\\s*$', 'm');
  const match = doc.match(re);
  if (!match) return '';
  const start = match.index + match[0].length;
  const rest = doc.slice(start);
  const next = rest.search(/^## /m);
  return next === -1 ? rest : rest.slice(0, next);
}
