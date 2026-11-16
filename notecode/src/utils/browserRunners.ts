import {
  ExecutionResult,
  buildMarkupPreviewDocument,
  detectUnsupportedPackageImport,
  formatPackageErrorMessage,
  formatSqlTable,
  isMarkupLanguage,
  runStructuredDataValidation,
} from './runner';

interface PyodideInstance {
  runPythonAsync: (code: string) => Promise<unknown>;
  globals: {
    set: (name: string, value: unknown) => void;
    get: (name: string) => unknown;
  };
}

interface SqlJsDatabase {
  exec: (sql: string) => Array<{ columns: string[]; values: unknown[][] }>;
  close: () => void;
}

interface SqlJsStatic {
  Database: new () => SqlJsDatabase;
}

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideInstance>;
    initSqlJs?: (opts: { locateFile: (file: string) => string }) => Promise<SqlJsStatic>;
  }
}

let pyodidePromise: Promise<PyodideInstance> | null = null;
let sqlJsPromise: Promise<SqlJsStatic> | null = null;

function loadExternalScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error(`Failed to load runtime script: ${src}`)),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener('load', () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    });
    script.addEventListener('error', () => {
      reject(new Error(`Failed to load runtime script: ${src}`));
    });
    document.head.appendChild(script);
  });
}

async function getPyodide(): Promise<PyodideInstance> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const baseUrl = 'https://cdn.jsdelivr.net/pyodide/v0.27.5/full/';
      await loadExternalScript(`${baseUrl}pyodide.js`);
      if (!window.loadPyodide) {
        throw new Error('Python WebAssembly runtime failed to initialize.');
      }
      return await window.loadPyodide({ indexURL: baseUrl });
    })().catch((err) => {
      pyodidePromise = null;
      throw err;
    });
  }
  return await pyodidePromise;
}

async function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    sqlJsPromise = (async () => {
      const baseUrl = 'https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/';
      await loadExternalScript(`${baseUrl}sql-wasm.js`);
      if (!window.initSqlJs) {
        throw new Error('SQLite WebAssembly runtime failed to initialize.');
      }
      return await window.initSqlJs({
        locateFile: (file: string) => `${baseUrl}${file}`,
      });
    })().catch((err) => {
      sqlJsPromise = null;
      throw err;
    });
  }
  return await sqlJsPromise;
}

async function runPythonCode(code: string, stdin: string): Promise<ExecutionResult> {
  const unsupportedPkg = detectUnsupportedPackageImport(code, 'python');
  if (unsupportedPkg) {
    return {
      stdout: '',
      stderr: formatPackageErrorMessage(unsupportedPkg),
      exitCode: 1,
      durationMs: 1,
      packageError: true,
    };
  }

  const start = performance.now();
  try {
    const pyodide = await getPyodide();
    pyodide.globals.set('__notecode_user_code', code);
    pyodide.globals.set('__notecode_user_stdin', stdin);

    const harness = `
import io, sys, traceback
__orig_stdout, __orig_stderr, __orig_stdin = sys.stdout, sys.stderr, sys.stdin
__out_buf = io.StringIO()
__err_buf = io.StringIO()
sys.stdout = __out_buf
sys.stderr = __err_buf
sys.stdin = io.StringIO(__notecode_user_stdin)
__exit_code = 0
try:
    exec(compile(__notecode_user_code, "<notecode>", "exec"), {"__name__": "__main__"})
except SystemExit as e:
    # sys.exit() is a normal way to finish a script, not an error.
    if e.code is None:
        __exit_code = 0
    elif isinstance(e.code, int):
        __exit_code = e.code
    else:
        __exit_code = 1
        print(e.code, file=__err_buf)
except BaseException:
    __exit_code = 1
    traceback.print_exc(file=__err_buf)
finally:
    sys.stdout = __orig_stdout
    sys.stderr = __orig_stderr
    sys.stdin = __orig_stdin
(__out_buf.getvalue(), __err_buf.getvalue(), __exit_code)
`;
    const result = (await pyodide.runPythonAsync(harness)) as {
      toJs?: () => unknown[];
      destroy?: () => void;
    };
    const [stdoutRaw, stderrRaw, exitRaw] = result.toJs
      ? (result.toJs() as [string, string, number])
      : ['', '', 0];
    if (result.destroy) {
      result.destroy();
    }

    const durationMs = Math.max(1, Math.round(performance.now() - start));
    const isPackageMissing = /ModuleNotFoundError|No module named/i.test(stderrRaw);
    const stderr = isPackageMissing
      ? `${stderrRaw.trim()}\n\n${formatPackageErrorMessage()}`
      : stderrRaw;

    return {
      stdout: stdoutRaw,
      stderr,
      exitCode: exitRaw,
      durationMs,
      packageError: isPackageMissing,
    };
  } catch (err: unknown) {
    return {
      stdout: '',
      stderr:
        err instanceof Error
          ? err.message
          : 'Failed to execute Python snippet.',
      exitCode: 1,
      durationMs: Math.max(1, Math.round(performance.now() - start)),
    };
  }
}

async function runSqlCode(code: string): Promise<ExecutionResult> {
  const start = performance.now();
  try {
    const SQL = await getSqlJs();
    const db = new SQL.Database();
    try {
      const results = db.exec(code);
      const durationMs = Math.max(1, Math.round(performance.now() - start));
      if (results.length === 0) {
        return {
          stdout: 'SQL executed successfully (0 result sets returned).',
          stderr: '',
          exitCode: 0,
          durationMs,
        };
      }
      const formatted = results
        .map((res) => formatSqlTable(res.columns, res.values))
        .join('\n\n');
      return {
        stdout: formatted,
        stderr: '',
        exitCode: 0,
        durationMs,
      };
    } finally {
      db.close();
    }
  } catch (err: unknown) {
    return {
      stdout: '',
      stderr: err instanceof Error ? err.message : 'SQL execution failed.',
      exitCode: 1,
      durationMs: Math.max(1, Math.round(performance.now() - start)),
    };
  }
}

export async function executeSnippetInBrowserOrServer(params: {
  code: string;
  language: string;
  stdin: string;
  runId: string;
}): Promise<ExecutionResult> {
  const { code, language, stdin, runId } = params;
  const lang = language.trim().toLowerCase();

  if (!code.trim()) {
    return {
      stdout: '',
      stderr: 'Cannot run an empty code snippet.',
      exitCode: 1,
      durationMs: 0,
    };
  }

  if (isMarkupLanguage(lang)) {
    const previewHtml = buildMarkupPreviewDocument(code, lang, runId);
    return {
      stdout: '',
      stderr: '',
      exitCode: 0,
      durationMs: 1,
      previewHtml,
    };
  }

  if (lang === 'json' || lang === 'xml') {
    return runStructuredDataValidation(code, lang);
  }

  if (lang === 'python') {
    return await runPythonCode(code, stdin);
  }

  if (lang === 'sql') {
    return await runSqlCode(code);
  }

  if (lang === 'javascript' || lang === 'typescript') {
    const unsupportedPkg = detectUnsupportedPackageImport(code, lang);
    if (unsupportedPkg) {
      return {
        stdout: '',
        stderr: formatPackageErrorMessage(unsupportedPkg),
        exitCode: 1,
        durationMs: 1,
        packageError: true,
      };
    }

    const res = await fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language: lang, stdin }),
    });
    const payload = (await res.json()) as ExecutionResult & { error?: string };
    if (!res.ok) {
      return {
        stdout: '',
        stderr: payload.error || 'Execution request failed.',
        exitCode: 1,
        durationMs: 0,
      };
    }
    return payload;
  }

  return {
    stdout: '',
    stderr: `Execution is not supported for language "${language}".`,
    exitCode: 1,
    durationMs: 0,
  };
}
