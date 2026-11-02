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
  const lines = readme.split(/\r?\n/);
  let startLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('## ')) continue;
    const heading = line.slice(3).trim();
    if (heading === title) {
      startLine = i;
      break;
    }
    if (heading.startsWith(title) && title.length < heading.length) {
      const nextChar = heading.charAt(title.length);
      if (nextChar === '：' || nextChar === ':' || nextChar === ' ' || nextChar === '\t') {
        startLine = i;
        break;
      }
    }
  }
  if (startLine === -1) return '';
  let endLine = lines.length;
  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('## ')) {
      endLine = i;
      break;
    }
  }
  return lines.slice(startLine + 1, endLine).join('\n').trim();
}

function daySection(day) {
  const re = new RegExp('^#### Day ' + day + '[^\\n]*$', 'm');
  const match = readme.match(re);
  if (!match) return '';
  const start = match.index + match[0].length;
  const rest = readme.slice(start);
  const next = rest.search(/^#### /m);
  return next === -1 ? rest : rest.slice(0, next);
}

function itinerarySection(name) {
  const re = new RegExp('^###\\s*' + name + '[^\\n]*$', 'm');
  const match = readme.match(re);
  if (!match) return '';
  const start = match.index + match[0].length;
  const rest = readme.slice(start);
  const next = rest.search(/^### /m);
  return next === -1 ? rest : rest.slice(0, next);
}

test('README 包含行程A与行程B两套四日排法', () => {
  assert.ok(section('行程A').trim().length > 0, '缺少行程A小节');
  assert.ok(section('行程B').trim().length > 0, '缺少行程B小节');
  for (const name of ['行程A', '行程B']) {
    const body = section(name);
    for (let d = 1; d <= 4; d++) {
      assert.ok(body.includes('Day ' + d), name + ' 小节内容未包含 Day ' + d);
    }
  }
});

test('section() 支持带全角冒号后缀的二级标题', () => {
  const body = section('行程A');
  assert.ok(body.includes('Day 1'), '行程A 小节内容未包含 Day 1');
  assert.ok(body.includes('Day 4'), '行程A 小节内容未包含 Day 4');
  assert.ok(!body.includes('## 行程B'), '行程A 小节被下一个二级标题截断前混入了行程B');
});

test('两套行程均包含 Day 1 至 Day 4 且每天有上午/下午/晚间', () => {
  for (const name of ['行程A', '行程B']) {
    const body = itinerarySection(name);
    for (let d = 1; d <= 4; d++) {
      const re = new RegExp('^#### Day ' + d + '[^\\n]*$', 'm');
      assert.ok(re.test(body), name + ' 缺少 Day ' + d + ' 小节');
    }
  }
  for (let d = 1; d <= 4; d++) {
    const body = daySection(d);
    assert.ok(body, '缺少 Day ' + d + ' 小节');
    assert.ok(body.includes('上午'), 'Day ' + d + ' 缺少上午安排');
    assert.ok(body.includes('下午'), 'Day ' + d + ' 缺少下午安排');
    assert.ok(body.includes('晚间'), 'Day ' + d + ' 缺少晚间安排');
  }
});

test('两套行程均包含每日活动、餐饮与交通关键词', () => {
  for (const name of ['行程A', '行程B']) {
    const body = itinerarySection(name);
    for (const word of ['早餐', '午餐', '晚餐', '交通']) {
      assert.ok(body.includes(word), name + ' 缺少关键词：' + word);
    }
  }
});

test('README 包含住宿、交通、预算、行前准备四个独立小节', () => {
  for (const title of ['住宿', '交通', '预算', '行前准备']) {
    assert.ok(section(title).trim().length > 0, '缺少小节：' + title);
  }
});

test('预算与住宿部分含具体金额或选项说明', () => {
  assert.ok(section('预算').includes('元'), '预算缺少金额单位');
  assert.ok(section('住宿').includes('芭东'), '住宿缺少区域选项');
  assert.ok(section('住宿').includes('预订提示'), '住宿缺少预订提示');
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
  const defined = ['芭东', '卡塔', '卡伦', '普吉镇', '皮皮岛', '机场', 'Grab', 'Bolt', '包车', '一日游', '神仙半岛'];
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
