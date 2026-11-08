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

test('README 索引锚点在 docs 中有对应标题', () => {
  const marker = '(docs/phuket-4d3n.md#';
  const anchors = [];
  let i = readme.indexOf(marker);
  while (i !== -1) {
    const end = readme.indexOf(')', i);
    anchors.push(readme.slice(i + marker.length, end));
    i = readme.indexOf(marker, end);
  }
  assert.ok(anchors.length > 0, 'README 缺少指向详细文档小节的索引链接');
  for (const anchor of anchors) {
    assert.ok(new RegExp('^## ' + anchor + '\\s*$', 'm').test(doc), '索引锚点无对应二级标题：' + anchor);
  }
});

test('README 住宿分区与 docs 住宿分区一致', () => {
  const readmeStay = section('住宿');
  const docStay = docSection('住宿分区与选择');
  assert.ok(readmeStay.trim().length > 0, 'README 缺少住宿小节');
  assert.ok(docStay.trim().length > 0, 'docs 缺少住宿分区与选择小节');
  for (const area of ['芭东', '卡伦', '卡塔', '普吉镇']) {
    assert.ok(readmeStay.includes('| ' + area + ' |'), 'README 住宿表缺少区域：' + area);
    assert.ok(docStay.includes('| ' + area + ' |'), 'docs 住宿表缺少区域：' + area);
  }
  for (const price of ['300–500', '350–600', '250–450']) {
    assert.ok(readmeStay.includes(price), 'README 住宿价位缺失：' + price);
    assert.ok(docStay.includes(price), 'docs 住宿价位缺失：' + price);
  }
});

test('README 交通价格提示与 docs 交通小节一致', () => {
  const readmeTraffic = section('交通');
  const docTraffic = docSection('交通');
  for (const token of ['40–80 泰铢', '100 泰铢', 'Bolt']) {
    assert.ok(readmeTraffic.includes(token), 'README 交通缺少：' + token);
    assert.ok(docTraffic.includes(token), 'docs 交通缺少：' + token);
  }
  assert.ok(docTraffic.includes('核对依据'), 'docs 交通价格缺少逐行核对依据');
});

test('docs 关键数字标注来源与检索日期', () => {
  const budget = docSection('预算');
  assert.ok(budget.includes('3251.5'), '缺少 3251.5 交叉参考');
  assert.ok(budget.includes('去哪儿'), '3251.5 未标注来源');
  assert.ok(budget.includes('检索日期'), '3251.5 未标注检索日期');
  const smilan = docSection('备选方案')
    .split('\n')
    .filter((line) => line.includes('10 月 15 日'))
    .join('');
  assert.ok(smilan.includes('检索日期'), '斯米兰开放期未标注检索日期');
  assert.ok(smilan.includes('Hopetrip'), '斯米兰开放期未标注来源');
});

test('docs 交通价格来源含 URL 且检索日期格式合规', () => {
  const docTraffic = docSection('交通');
  const basis = docTraffic.slice(docTraffic.indexOf('逐行核对依据'));
  assert.ok(basis.trim().length > 0, '交通小节缺少逐行核对依据');
  assert.ok(/https?:\/\/[^\s)]+/.test(basis), '交通价格来源缺少 URL');
  assert.ok(/检索日期 20\d{2}-\d{2}-\d{2}/.test(basis), '检索日期格式不正确');
});

test('docs 空链接与空来源边界检查', () => {
  assert.ok(!/\]\(\)/.test(doc), '存在空 Markdown 链接');
  assert.ok(!/\(https?:\s*\)/.test(doc), '存在空 URL 链接');
  assert.ok(!/来源：\s*[，,；;)]/.test(doc), '存在空来源标记');
});

test('docs 非空且关键小节非空', () => {
  assert.ok(doc.trim().length > 0, 'docs 为空');
  for (const title of ['交通', '住宿分区与选择', '预算', '备选方案', '可选升级方案']) {
    assert.ok(docSection(title).trim().length > 0, 'docs 缺少或空小节：' + title);
  }
});

test('docs 中检索日期均为合法 YYYY-MM-DD', () => {
  const markers = doc.match(/检索日期/g) || [];
  const dates = [...doc.matchAll(/检索日期\s*(\d{4})-(\d{2})-(\d{2})/g)];
  const invalid = [...doc.matchAll(/检索日期[^\n]{0,24}/g)]
    .map((match) => match[0])
    .filter((text) => !/检索日期\s*\d{4}-\d{2}-\d{2}/.test(text));
  assert.strictEqual(dates.length, markers.length, '存在非 YYYY-MM-DD 的检索日期：' + invalid.join(' | '));
  for (const [, y, m, d] of dates) {
    const month = Number(m);
    const day = Number(d);
    assert.ok(month >= 1 && month <= 12, '检索日期月份非法：' + y + '-' + m + '-' + d);
    assert.ok(day >= 1 && day <= 31, '检索日期日非法：' + y + '-' + m + '-' + d);
  }
});

test('docs 中出现的 URL 均在来源登记中且有检索日期', () => {
  const registerPath = path.join(__dirname, '..', 'docs', 'source-register.md');
  assert.ok(fs.existsSync(registerPath), '缺少 docs/source-register.md');
  const register = fs.readFileSync(registerPath, 'utf8');
  const urls = [...new Set([...doc.matchAll(/https?:\/\/[^\s)），,；;]+/g)].map((m) => m[0]))];
  assert.ok(urls.length > 0, 'docs 未包含任何来源 URL');
  for (const url of urls) {
    assert.ok(register.includes(url), '来源登记缺少 URL：' + url);
    const line = register.split('\n').find((row) => row.includes(url)) || '';
    assert.ok(/20\d{2}-\d{2}-\d{2}/.test(line), '来源登记缺少检索日期：' + url);
  }
});

test('docs 关键来源段落含 URL 与检索日期', () => {
  const cases = [
    ['预算', '3251.5'],
    ['备选方案', '10 月 15 日'],
    ['可选升级方案', '200 泰铢']
  ];
  for (const [title, token] of cases) {
    const body = docSection(title);
    assert.ok(body.includes(token), title + ' 缺少关键数字：' + token);
    const line = body.split('\n').find((row) => row.includes(token)) || '';
    assert.ok(/https?:\/\//.test(line), title + ' 的关键数字缺少来源 URL：' + token);
    assert.ok(/检索日期 20\d{2}-\d{2}-\d{2}/.test(line), title + ' 的关键数字缺少检索日期：' + token);
  }
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
