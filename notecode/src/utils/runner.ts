export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  packageError?: boolean;
  previewHtml?: string;
}

export const PACKAGE_UNSUPPORTED_NOTICE = 'External packages are not supported';

const NODE_BUILTINS = new Set([
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'domain',
  'events',
  'fs',
  'fs/promises',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'timers',
  'timers/promises',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'wasi',
  'worker_threads',
  'zlib',
]);

const PYTHON_STDLIB = new Set([
  'abc',
  'argparse',
  'array',
  'ast',
  'asyncio',
  'base64',
  'binascii',
  'bisect',
  'builtins',
  'calendar',
  'cmath',
  'collections',
  'contextlib',
  'copy',
  'csv',
  'dataclasses',
  'datetime',
  'decimal',
  'difflib',
  'enum',
  'errno',
  'fractions',
  'functools',
  'gc',
  'getopt',
  'getpass',
  'glob',
  'gzip',
  'hashlib',
  'heapq',
  'hmac',
  'html',
  'inspect',
  'io',
  'itertools',
  'json',
  'keyword',
  'linecache',
  'locale',
  'logging',
  'math',
  'numbers',
  'operator',
  'os',
  'pathlib',
  'pickle',
  'platform',
  'pprint',
  'queue',
  'random',
  're',
  'reprlib',
  'secrets',
  'shutil',
  'signal',
  'socket',
  'sqlite3',
  'statistics',
  'string',
  'struct',
  'sys',
  'tempfile',
  'textwrap',
  'threading',
  'time',
  'timeit',
  'traceback',
  'types',
  'typing',
  'unicodedata',
  'unittest',
  'urllib',
  'uuid',
  'warnings',
  'weakref',
  'xml',
  'zipfile',
  'zlib',
]);

export function formatPackageErrorMessage(pkgName?: string | null): string {
  if (pkgName) {
    return `Cannot load "${pkgName}". ${PACKAGE_UNSUPPORTED_NOTICE} — only built-in language features and standard libraries are available.`;
  }
  return `${PACKAGE_UNSUPPORTED_NOTICE} — only built-in language features and standard libraries are available.`;
}

export function detectUnsupportedPackageImport(
  code: string,
  language: string
): string | null {
  const lang = language.trim().toLowerCase();

  if (lang === 'javascript' || lang === 'typescript') {
    const patterns = [
      /(?:import\s+(?:[\s\S]*?\s+from\s+)?|import\s*\(\s*)['"]([^'"]+)['"]/g,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    ];

    for (const regex of patterns) {
      let match: RegExpExecArray | null;
      while ((match = regex.exec(code)) !== null) {
        const spec = match[1].trim();
        if (!spec) continue;
        if (spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('/')) {
          return spec;
        }
        if (spec.startsWith('node:')) {
          const coreName = spec.slice(5);
          if (!NODE_BUILTINS.has(coreName)) {
            return spec;
          }
          continue;
        }
        const rootPkg = spec.split('/')[0];
        if (!NODE_BUILTINS.has(spec) && !NODE_BUILTINS.has(rootPkg)) {
          return spec;
        }
      }
    }
    return null;
  }

  if (lang === 'python') {
    const lines = code.split(/\r\n|\r|\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const importMatch = line.match(/^import\s+([a-zA-Z0-9_.,\s]+)$/);
      if (importMatch) {
        const modules = importMatch[1].split(',').map((m) =>
          m
            .trim()
            .split(/\s+as\s+/)[0]
            .split('.')[0]
            .trim()
        );
        for (const mod of modules) {
          if (mod && !PYTHON_STDLIB.has(mod)) {
            return mod;
          }
        }
      }

      const fromMatch = line.match(/^from\s+([a-zA-Z0-9_.]+)\s+import\s+/);
      if (fromMatch) {
        const rootMod = fromMatch[1].split('.')[0].trim();
        if (rootMod && !PYTHON_STDLIB.has(rootMod)) {
          return rootMod;
        }
      }
    }
    return null;
  }

  return null;
}

export function isMarkupLanguage(language: string): boolean {
  const normalized = language.trim().toLowerCase();
  return (
    normalized === 'html' ||
    normalized === 'css' ||
    normalized === 'markdown'
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatInlineMarkdown(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  return out;
}

export function renderMarkdownToHtml(markdown: string): string {
  const lines = markdown.split(/\r\n|\r|\n/);
  const htmlParts: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      htmlParts.push('</ul>');
      inList = false;
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      closeList();
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLines = [];
      } else {
        inCodeBlock = false;
        htmlParts.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      closeList();
      htmlParts.push('<hr />');
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      htmlParts.push(`<h${level}>${formatInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    if (trimmed.startsWith('> ')) {
      closeList();
      htmlParts.push(
        `<blockquote>${formatInlineMarkdown(trimmed.slice(2))}</blockquote>`
      );
      continue;
    }

    const listMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (listMatch) {
      if (!inList) {
        htmlParts.push('<ul>');
        inList = true;
      }
      htmlParts.push(`<li>${formatInlineMarkdown(listMatch[1])}</li>`);
      continue;
    }

    closeList();
    htmlParts.push(`<p>${formatInlineMarkdown(trimmed)}</p>`);
  }

  closeList();
  if (inCodeBlock) {
    htmlParts.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  }

  return htmlParts.join('\n');
}

const HEAD_OPEN_RE = /<head(?:\s[^>]*)?>/i;
const HTML_OPEN_RE = /<html(?:\s[^>]*)?>/i;

export function buildMarkupPreviewDocument(
  code: string,
  language: string,
  runId: string
): string {
  const safeRunId = JSON.stringify(runId);
  const bridgeScript = `<script>
(function() {
  var RUN_ID = ${safeRunId};
  function send(level, args) {
    try {
      var text = Array.prototype.slice.call(args).map(function(item) {
        if (typeof item === 'string') return item;
        try { return JSON.stringify(item); } catch (e) { return String(item); }
      }).join(' ');
      window.parent.postMessage({ type: 'notecode-console', runId: RUN_ID, level: level, message: text }, '*');
    } catch (e) {}
  }
  ['log', 'info', 'warn', 'error'].forEach(function(lvl) {
    var orig = console[lvl];
    console[lvl] = function() {
      send(lvl, arguments);
      if (orig) orig.apply(console, arguments);
    };
  });
  window.alert = function(msg) {
    send('info', ['[alert] ' + String(msg === undefined ? '' : msg)]);
  };
  window.addEventListener('error', function(ev) {
    send('error', [ev.message || 'Runtime error']);
  });
  window.addEventListener('unhandledrejection', function(ev) {
    send('error', ['Unhandled promise rejection: ' + String(ev.reason)]);
  });
  window.addEventListener('DOMContentLoaded', function() {
    window.parent.postMessage({ type: 'notecode-console-done', runId: RUN_ID }, '*');
  });
})();
</script>`;

  const lang = language.trim().toLowerCase();

  if (lang === 'css') {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
${bridgeScript}
<style>
  body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #121826; background: #FFFFFE; }
  ${code}
</style>
</head>
<body>
  <div class="preview-shell">
    <h1>CSS Preview Heading</h1>
    <p>Paragraph text styled by your CSS rules.</p>
    <button type="button">Sample Button</button>
  </div>
  <script>console.log('CSS stylesheet applied.');</script>
</body>
</html>`;
  }

  if (lang === 'markdown') {
    const bodyHtml = renderMarkdownToHtml(code);
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
${bridgeScript}
<style>
  body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; line-height: 1.6; color: #121826; background: #FFFFFE; max-width: 72ch; }
  h1, h2, h3 { margin: 0.9em 0 0.4em; font-weight: 600; }
  pre { background: #F1F5F9; padding: 12px; border-radius: 8px; overflow-x: auto; }
  code { font-family: ui-monospace, monospace; font-size: 0.9em; }
  blockquote { border-left: 3px solid #CED6E1; margin: 0.8em 0; padding-left: 12px; color: #364153; }
</style>
</head>
<body>
${bodyHtml}
<script>console.log('Markdown rendered.');</script>
</body>
</html>`;
  }

  // HTML: inject bridge script before </head> or at start of document.
  // `(?:\s[^>]*)?` ensures <head> does not match <header>.
  if (HEAD_OPEN_RE.test(code)) {
    return code.replace(HEAD_OPEN_RE, (match) => `${match}\n${bridgeScript}`);
  }
  if (HTML_OPEN_RE.test(code)) {
    return code.replace(HTML_OPEN_RE, (match) => `${match}\n<head>${bridgeScript}</head>`);
  }
  return `<!doctype html><html><head>${bridgeScript}</head><body>${code}</body></html>`;
}

export function formatSqlTable(columns: string[], rows: unknown[][]): string {
  if (columns.length === 0) {
    return '(Query returned 0 columns)';
  }
  const stringRows = rows.map((row) =>
    row.map((cell) => (cell === null || cell === undefined ? 'NULL' : String(cell)))
  );

  const widths = columns.map((col, idx) => {
    const cellWidths = stringRows.map((r) => (r[idx] ?? '').length);
    return Math.max(col.length, ...cellWidths);
  });

  const formatRow = (cells: string[]) =>
    cells.map((val, i) => val.padEnd(widths[i], ' ')).join(' | ');

  const divider = widths.map((w) => '-'.repeat(w)).join('-+-');
  const lines = [formatRow(columns), divider, ...stringRows.map(formatRow)];
  return lines.join('\n');
}

export function runStructuredDataValidation(
  code: string,
  language: 'json' | 'xml'
): ExecutionResult {
  const start = Date.now();
  if (!code.trim()) {
    return {
      stdout: '',
      stderr: `Error: ${language.toUpperCase()} input is empty.`,
      exitCode: 1,
      durationMs: Date.now() - start,
    };
  }

  if (language === 'json') {
    try {
      const parsed = JSON.parse(code);
      const formatted = JSON.stringify(parsed, null, 2);
      const summary = Array.isArray(parsed)
        ? `Valid JSON array (${parsed.length} items)`
        : parsed && typeof parsed === 'object'
          ? `Valid JSON object (${Object.keys(parsed).length} keys)`
          : `Valid JSON value (${typeof parsed})`;

      return {
        stdout: `${summary}\n\n${formatted}`,
        stderr: '',
        exitCode: 0,
        durationMs: Math.max(1, Date.now() - start),
      };
    } catch (err: unknown) {
      return {
        stdout: '',
        stderr: err instanceof Error ? err.message : 'Invalid JSON syntax.',
        exitCode: 1,
        durationMs: Math.max(1, Date.now() - start),
      };
    }
  }

  // XML validation (DOMParser in browser, lightweight fallback in Node unit tests)
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(code, 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return {
        stdout: '',
        stderr: parseError.textContent?.trim() || 'Invalid XML syntax.',
        exitCode: 1,
        durationMs: Math.max(1, Date.now() - start),
      };
    }
    const rootName = doc.documentElement?.tagName ?? 'root';
    const elementCount = doc.getElementsByTagName('*').length;
    return {
      stdout: `Valid XML document (root: <${rootName}>, ${elementCount} elements)`,
      stderr: '',
      exitCode: 0,
      durationMs: Math.max(1, Date.now() - start),
    };
  }

  const tagMatch = code.trim().match(/^<([a-zA-Z_][\w:.-]*)/);
  if (!tagMatch) {
    return {
      stdout: '',
      stderr: 'Invalid XML: missing root element.',
      exitCode: 1,
      durationMs: Math.max(1, Date.now() - start),
    };
  }

  return {
    stdout: `Valid XML structure (root: <${tagMatch[1]}>)`,
    stderr: '',
    exitCode: 0,
    durationMs: Math.max(1, Date.now() - start),
  };
}
