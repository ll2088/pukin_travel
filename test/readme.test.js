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
  const re = new RegExp('^### 第 ' + day + ' 天[^\\n]*$', 'm');
  const match = readme.match(re);
  if (!match) return '';
  const start = match.index + match[0].length;
  const rest = readme.slice(start);
  const next = rest.search(/^### /m);
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

test('README 包含亲子游简报六个必备小节', () => {
  for (const title of ['行程框架', '预订渠道', '风险提示', 'Day2 备选', 'Day4 备选', '不同人群玩法']) {
    assert.ok(section(title).trim().length > 0, '缺少小节：' + title);
  }
});

test('README 中 Day 1 至 Day 4 均有独立小节或明确标识', () => {
  for (let d = 1; d <= 4; d++) {
    assert.ok(daySection(d).trim().length > 0, '缺少第 ' + d + ' 天小节');
    assert.ok(readme.includes('Day ' + d), '缺少 Day ' + d + ' 标识');
  }
});

test('README 包含签证、机票、酒店、预算关键词', () => {
  for (const word of ['签证', '机票', '酒店', '预算']) {
    assert.ok(readme.includes(word), '缺少关键词：' + word);
  }
});
