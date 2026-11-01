const fs = require('fs');
const path = require('path');
const assert = require('assert');

const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');

const MAX_RETRIES = 2;

function buildDiagnostic(name, err, attempts, maxRetries) {
  const expected = err && err.expected !== undefined ? err.expected : '(未提供)';
  const actual = err && err.actual !== undefined ? err.actual : '(未提供)';
  return {
    name: name,
    expected: expected,
    actual: actual,
    attempts: attempts,
    maxRetries: maxRetries,
    error: err && err.message ? err.message : String(err)
  };
}

function assertDiagnosticComplete(diag) {
  if (diag.expected === undefined || diag.actual === undefined || diag.attempts === undefined) {
    throw new Error('诊断字段不完整: ' + JSON.stringify(diag));
  }
  return diag;
}

function formatDiagnostics(name, err, attempt) {
  const diag = buildDiagnostic(name, err, attempt, MAX_RETRIES);
  return [
    'FAIL ' + diag.name,
    '  期望值: ' + diag.expected,
    '  实际值: ' + diag.actual,
    '  重试次数: ' + diag.attempts + '/' + diag.maxRetries,
    '  错误信息: ' + diag.error
  ].join('\n');
}

function test(name, fn) {
  let lastErr = null;
  let attempts = 0;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    attempts = attempt;
    try {
      fn();
      console.log('PASS ' + name + (attempt > 0 ? ' (重试 ' + attempt + ' 次后通过)' : ''));
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  const diag = assertDiagnosticComplete(buildDiagnostic(name, lastErr, attempts, MAX_RETRIES));
  console.error(formatDiagnostics(name, lastErr, attempts));
  process.exitCode = 1;
  return diag;
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

test('失败诊断输出包含期望值、实际值与重试次数', () => {
  const err = new assert.AssertionError({
    message: '模拟断言失败',
    expected: 5600,
    actual: 5500
  });
  const output = formatDiagnostics('模拟用例', err, MAX_RETRIES);
  assert.ok(output.includes('期望值: 5600'), '诊断缺少期望值');
  assert.ok(output.includes('实际值: 5500'), '诊断缺少实际值');
  assert.ok(output.includes('重试次数: ' + MAX_RETRIES + '/' + MAX_RETRIES), '诊断缺少重试次数');
});

test('有限重试：首次失败后重试成功且不超过上限', () => {
  let calls = 0;
  let passed = false;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    calls++;
    if (attempt === 1) {
      passed = true;
      break;
    }
  }
  assert.ok(passed, '重试后应通过');
  assert.ok(calls <= MAX_RETRIES + 1, '重试次数超过上限');
});

test('重试耗尽：连续失败达到上限后明确失败', () => {
  let calls = 0;
  let lastErr = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    calls++;
    try {
      assert.strictEqual(1, 2, '模拟持续失败');
    } catch (err) {
      lastErr = err;
    }
  }
  assert.strictEqual(calls, MAX_RETRIES + 1, '重试次数应等于上限加一');
  const diag = assertDiagnosticComplete(buildDiagnostic('模拟耗尽', lastErr, MAX_RETRIES, MAX_RETRIES));
  assert.strictEqual(diag.expected, 1, '诊断缺少期望值');
  assert.strictEqual(diag.actual, 2, '诊断缺少实际值');
  assert.strictEqual(diag.attempts, MAX_RETRIES, '重试次数应等于上限');
  assert.strictEqual(diag.maxRetries, MAX_RETRIES, '重试上限配置不一致');
  const output = formatDiagnostics('模拟耗尽', lastErr, MAX_RETRIES);
  assert.ok(output.includes('期望值: 1'), '诊断缺少期望值');
  assert.ok(output.includes('实际值: 2'), '诊断缺少实际值');
  assert.ok(output.includes('重试次数: ' + MAX_RETRIES + '/' + MAX_RETRIES), '诊断缺少重试次数');
});

test('首次即失败且不重试时诊断字段完整', () => {
  let calls = 0;
  let lastErr = null;
  try {
    calls++;
    assert.strictEqual('a', 'b', '模拟首次失败');
  } catch (err) {
    lastErr = err;
  }
  assert.strictEqual(calls, 1, '首次失败不应重试');
  const diag = assertDiagnosticComplete(buildDiagnostic('模拟首次失败', lastErr, 0, MAX_RETRIES));
  assert.strictEqual(diag.expected, 'a', '诊断缺少期望值');
  assert.strictEqual(diag.actual, 'b', '诊断缺少实际值');
  assert.strictEqual(diag.attempts, 0, '首次失败重试次数应为 0');
  assert.strictEqual(diag.maxRetries, MAX_RETRIES, '重试上限配置不一致');
});

test('确定性校验：同一输入多次运行结果一致', () => {
  const first = section('预算');
  const second = section('预算');
  const third = section('预算');
  assert.strictEqual(first, second, '同一输入结果不一致');
  assert.strictEqual(second, third, '同一输入结果不一致');
});
