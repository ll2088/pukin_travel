const fs = require('fs');
const path = require('path');
const assert = require('assert');

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

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('docs/itinerary.md 含行程概览与逐日小节', () => {
  const body = read('docs/itinerary.md');
  assert.ok(body.includes('## 行程概览'), '缺少行程概览');
  for (let d = 1; d <= 4; d++) {
    assert.ok(body.includes('## 第 ' + d + ' 天'), '缺少第 ' + d + ' 天');
  }
});

test('docs/transport.md 含入境流程、交通与住宿小节', () => {
  const body = read('docs/transport.md');
  for (const title of ['入境流程', '机场到酒店', '岛内交通', '住宿区域']) {
    assert.ok(body.includes('## ' + title), '缺少小节：' + title);
  }
});

test('docs/preparation.md 含行前准备清单', () => {
  const body = read('docs/preparation.md');
  assert.ok(body.includes('## 行前准备'), '缺少行前准备');
  assert.ok(/- \[ \]/.test(body), '缺少可勾选清单');
});

test('docs/safety.md 含安全小节', () => {
  const body = read('docs/safety.md');
  assert.ok(body.includes('## 安全'), '缺少安全小节');
});
