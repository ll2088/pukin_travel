const fs = require('fs');
const path = require('path');
const assert = require('assert');

const body = fs.readFileSync(path.join(__dirname, '..', 'docs', 'transport.md'), 'utf8');

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

test('交通文档含入境流程、机场到酒店方式与费用区间、岛内交通', () => {
  assert.ok(body.includes('## 入境流程'), '缺少入境流程');
  assert.ok(body.includes('TDAC'), '缺少 TDAC');
  assert.ok(body.includes('机场巴士'), '缺少机场巴士');
  assert.ok(body.includes('mini bus'), '缺少 mini bus');
  assert.ok(body.includes('Grab'), '缺少 Grab');
  assert.ok(/\d+–\d+ 泰铢/.test(body), '缺少费用区间');
  assert.ok(body.includes('## 岛内交通'), '缺少岛内交通');
});
