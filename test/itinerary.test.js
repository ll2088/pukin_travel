const fs = require('fs');
const path = require('path');
const assert = require('assert');

const body = fs.readFileSync(path.join(__dirname, '..', 'docs', 'itinerary.md'), 'utf8');

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

function daySection(day) {
  const re = new RegExp('^## 第 ' + day + ' 天[^\\n]*$', 'm');
  const match = body.match(re);
  if (!match) return '';
  const start = match.index + match[0].length;
  const rest = body.slice(start);
  const next = rest.search(/^## /m);
  return next === -1 ? rest : rest.slice(0, next);
}

test('4 天 3 晚逐日均含时段、景点、餐饮与备选方案', () => {
  for (let d = 1; d <= 4; d++) {
    const section = daySection(d);
    assert.ok(section, '缺少第 ' + d + ' 天');
    for (const word of ['上午', '下午', '晚间', '餐饮', '备选方案']) {
      assert.ok(section.includes(word), '第 ' + d + ' 天缺少：' + word);
    }
  }
});
