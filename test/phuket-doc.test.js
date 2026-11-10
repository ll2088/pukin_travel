const fs = require('fs');
const path = require('path');
const assert = require('assert');

const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', 'phuket-4d3n.md'), 'utf8');

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
  const match = doc.match(re);
  if (!match) return '';
  const rest = doc.slice(match.index + match[0].length);
  const next = rest.search(/^## /m);
  return next === -1 ? rest : rest.slice(0, next);
}

test('每天行程包含至少一个景点或活动', () => {
  const places = ['海滩', '皇帝岛', '珊瑚岛', '查龙寺', '大佛', '普吉老城', '哈努曼世界', '夜市', '按摩', '浮潜', '深潜'];
  for (let d = 1; d <= 4; d++) {
    const match = doc.match(new RegExp('^## Day ' + d + '[^\\n]*$', 'm'));
    assert.ok(match, '缺少 Day ' + d);
    const rest = doc.slice(match.index + match[0].length);
    const next = rest.search(/^## /m);
    const body = next === -1 ? rest : rest.slice(0, next);
    assert.ok(places.some((p) => body.includes(p)), 'Day ' + d + ' 缺少景点或活动');
  }
});

test('预算部分包含货币单位与金额数字', () => {
  const budget = section('预算');
  assert.ok(budget.trim().length > 0, '缺少预算小节');
  assert.ok(/元人民币/.test(budget), '预算缺少货币单位');
  assert.ok(/\d+/.test(budget), '预算缺少金额数字');
});

test('必备小节齐全且总字数达标', () => {
  for (const title of ['行程概览', '逐日安排', '预算', '备选方案']) {
    assert.ok(section(title).trim().length > 0, '缺少小节：' + title);
  }
  assert.ok(doc.replace(/\s/g, '').length >= 1500, '文档非空白字符数不足 1500');
});
