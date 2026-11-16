import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCodeWithPrettier, isFormattingSupported } from './formatter';

test('isFormattingSupported identifies supported and unsupported languages', () => {
  assert.equal(isFormattingSupported('html'), true);
  assert.equal(isFormattingSupported('javascript'), true);
  assert.equal(isFormattingSupported('typescript'), true);
  assert.equal(isFormattingSupported('css'), true);
  assert.equal(isFormattingSupported('json'), true);
  assert.equal(isFormattingSupported('markdown'), true);
  assert.equal(isFormattingSupported('python'), false);
  assert.equal(isFormattingSupported('sql'), false);
});

test('formatCodeWithPrettier formats messy JavaScript, HTML, CSS, and JSON', async () => {
  const jsRes = await formatCodeWithPrettier(
    'function   add(a,b){return   a+b}',
    'javascript'
  );
  assert.equal(jsRes.ok, true);
  if (jsRes.ok) {
    assert.equal(jsRes.formatted, 'function add(a, b) {\n  return a + b;\n}');
  }

  const htmlRes = await formatCodeWithPrettier(
    '<div><h1>Hello</h1><p>World</p></div>',
    'html'
  );
  assert.equal(htmlRes.ok, true);
  if (htmlRes.ok) {
    assert.ok(htmlRes.formatted.includes('  <h1>Hello</h1>'));
  }

  const cssRes = await formatCodeWithPrettier(
    'h1{color:red;margin:0}',
    'css'
  );
  assert.equal(cssRes.ok, true);
  if (cssRes.ok) {
    assert.ok(cssRes.formatted.includes('  color: red;'));
  }

  const jsonRes = await formatCodeWithPrettier('{"b":2,"a":1}', 'json');
  assert.equal(jsonRes.ok, true);
  if (jsonRes.ok) {
    assert.equal(jsonRes.formatted, '{ "b": 2, "a": 1 }');
  }
});

test('formatCodeWithPrettier returns clean error on syntax errors or unsupported languages', async () => {
  const badJs = await formatCodeWithPrettier('function ( {', 'javascript');
  assert.equal(badJs.ok, false);
  if (!badJs.ok) {
    assert.ok(badJs.error.startsWith('Format failed:'));
  }

  const pyRes = await formatCodeWithPrettier('print("hi")', 'python');
  assert.equal(pyRes.ok, false);
});
