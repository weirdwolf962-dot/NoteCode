import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_HTML_SNIPPET,
  extractSnippetIdFromPath,
  formatShareUrl,
  getSnippetPreviewLine,
  getSnippetStats,
  hasSnippetChanged,
  isValidSnippetId,
  validateSnippetPayload,
} from './snippet';

test('DEFAULT_HTML_SNIPPET contains expected title and body markup', () => {
  assert.ok(DEFAULT_HTML_SNIPPET.includes('<title>HTML Sample</title>'));
  assert.ok(DEFAULT_HTML_SNIPPET.includes('<h1>Heading No.1</h1>'));
  assert.ok(
    DEFAULT_HTML_SNIPPET.includes(
      'alert("I am a sample... visit devChallengs.io for more projects");'
    )
  );
});

test('isValidSnippetId validates v4 UUIDs accurately', () => {
  assert.equal(
    isValidSnippetId('550e8400-e29b-41d4-a716-446655440000'),
    true
  );
  assert.equal(isValidSnippetId('not-a-uuid'), false);
  assert.equal(isValidSnippetId(''), false);
});

test('extractSnippetIdFromPath parses root and single-segment paths', () => {
  assert.equal(extractSnippetIdFromPath('/'), null);
  assert.equal(
    extractSnippetIdFromPath('/550e8400-e29b-41d4-a716-446655440000'),
    '550e8400-e29b-41d4-a716-446655440000'
  );
  assert.equal(extractSnippetIdFromPath('/api/snippets'), null);
});

test('validateSnippetPayload accepts valid payloads and rejects invalid ones', () => {
  const valid = validateSnippetPayload({
    code: 'console.log("hello");',
    language: 'JavaScript',
    theme: 'dark',
  });
  assert.equal(valid.valid, true);
  if (valid.valid) {
    assert.equal(valid.data.language, 'javascript');
    assert.equal(valid.data.theme, 'dark');
  }

  const empty = validateSnippetPayload({
    code: '   ',
    language: 'html',
    theme: 'light',
  });
  assert.equal(empty.valid, false);

  const badLang = validateSnippetPayload({
    code: 'print(1)',
    language: 'brainfuck',
    theme: 'light',
  });
  assert.equal(badLang.valid, false);

  const badTheme = validateSnippetPayload({
    code: 'print(1)',
    language: 'python',
    theme: 'neon',
  });
  assert.equal(badTheme.valid, false);
});

test('validateSnippetPayload rejects null characters', () => {
  const result = validateSnippetPayload({
    code: 'abc\u0000def',
    language: 'javascript',
    theme: 'light',
  });
  assert.equal(result.valid, false);
});

test('hasSnippetChanged enables Share when unsaved or modified', () => {
  const initial = {
    code: DEFAULT_HTML_SNIPPET,
    language: 'html',
    theme: 'light' as const,
  };
  assert.equal(hasSnippetChanged(initial, null), true);
  assert.equal(hasSnippetChanged(initial, { ...initial }), false);
  assert.equal(
    hasSnippetChanged({ ...initial, theme: 'dark' }, initial),
    true
  );
  assert.equal(
    hasSnippetChanged({ ...initial, language: 'xml' }, initial),
    true
  );
  assert.equal(
    hasSnippetChanged({ ...initial, code: '<h1>Updated</h1>' }, initial),
    true
  );
});

test('formatShareUrl and stats helpers produce expected results', () => {
  assert.equal(
    formatShareUrl('https://notecode.app/', 'abc-123'),
    'https://notecode.app/abc-123'
  );
  assert.deepEqual(getSnippetStats('line1\nline2\nline3'), {
    lines: 3,
    characters: 17,
  });
  assert.equal(getSnippetPreviewLine('\n  <html>\n  </html>'), '<html>');
});
