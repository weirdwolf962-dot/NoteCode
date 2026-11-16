import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMarkupPreviewDocument,
  detectUnsupportedPackageImport,
  formatPackageErrorMessage,
  formatSqlTable,
  isMarkupLanguage,
  renderMarkdownToHtml,
  runStructuredDataValidation,
} from './runner';

test('detectUnsupportedPackageImport allows builtins and flags external JS/TS packages', () => {
  assert.equal(
    detectUnsupportedPackageImport(
      "import fs from 'node:fs';\nconsole.log('ok');",
      'javascript'
    ),
    null
  );
  assert.equal(
    detectUnsupportedPackageImport(
      "import axios from 'axios';\nconsole.log(axios);",
      'javascript'
    ),
    'axios'
  );
  assert.equal(
    detectUnsupportedPackageImport(
      "const _ = require('lodash');",
      'typescript'
    ),
    'lodash'
  );
});

test('detectUnsupportedPackageImport allows stdlib and flags external Python packages', () => {
  assert.equal(
    detectUnsupportedPackageImport(
      'import math\nfrom collections import Counter\nprint(math.pi)',
      'python'
    ),
    null
  );
  assert.equal(
    detectUnsupportedPackageImport('import numpy as np\nprint(np)', 'python'),
    'numpy'
  );
  assert.equal(
    detectUnsupportedPackageImport('from requests import get', 'python'),
    'requests'
  );
});

test('formatPackageErrorMessage states that external packages are not supported', () => {
  const msg = formatPackageErrorMessage('express');
  assert.ok(msg.includes('External packages are not supported'));
  assert.ok(msg.includes('express'));
});

test('isMarkupLanguage identifies HTML, CSS, and Markdown', () => {
  assert.equal(isMarkupLanguage('html'), true);
  assert.equal(isMarkupLanguage('css'), true);
  assert.equal(isMarkupLanguage('markdown'), true);
  assert.equal(isMarkupLanguage('javascript'), false);
  assert.equal(isMarkupLanguage('python'), false);
});

test('renderMarkdownToHtml renders headings, lists, and code blocks', () => {
  const html = renderMarkdownToHtml('# Title\n\n- Item A\n- Item B');
  assert.ok(html.includes('<h1>Title</h1>'));
  assert.ok(html.includes('<ul>'));
  assert.ok(html.includes('<li>Item A</li>'));
});

test('buildMarkupPreviewDocument injects console bridge into HTML', () => {
  const doc = buildMarkupPreviewDocument(
    '<html><head><title>Test</title></head><body><h1>Hi</h1></body></html>',
    'html',
    'run-1'
  );
  assert.ok(doc.includes('notecode-console'));
  assert.ok(doc.includes('<h1>Hi</h1>'));
});

test('buildMarkupPreviewDocument does not treat <header> as <head>', () => {
  const doc = buildMarkupPreviewDocument(
    '<header>Top</header><script>console.log(1)</script>',
    'html',
    'run-2'
  );
  assert.ok(doc.startsWith('<!doctype html><html><head>'));
  assert.ok(doc.indexOf('notecode-console') < doc.indexOf('<header>'));
});

test('formatSqlTable aligns columns and rows cleanly', () => {
  const table = formatSqlTable(
    ['id', 'name'],
    [
      [1, 'Ada'],
      [2, 'Grace'],
    ]
  );
  assert.ok(table.includes('id | name'));
  assert.ok(table.includes('1  | Ada'));
  assert.ok(table.includes('2  | Grace'));
});

test('runStructuredDataValidation validates valid and invalid JSON', () => {
  const ok = runStructuredDataValidation('{"a": 1}', 'json');
  assert.equal(ok.exitCode, 0);
  assert.ok(ok.stdout.includes('Valid JSON object'));

  const bad = runStructuredDataValidation('{bad json}', 'json');
  assert.equal(bad.exitCode, 1);
  assert.ok(bad.stderr.length > 0);
});
