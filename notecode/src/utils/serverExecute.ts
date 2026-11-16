import { spawn } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  type ExecutionResult,
  detectUnsupportedPackageImport,
  formatPackageErrorMessage,
} from './runner.ts';

const EXECUTION_TIMEOUT_MS = 3000;
const MAX_OUTPUT_BYTES = 64 * 1024;
const MAX_CODE_BYTES = 200_000;
const MAX_STDIN_BYTES = 64 * 1024;

export async function executeServerScript(params: {
  code: string;
  language: string;
  stdin?: string;
}): Promise<ExecutionResult> {
  const { code, language, stdin = '' } = params;
  const lang = language.trim().toLowerCase();

  if (lang !== 'javascript' && lang !== 'typescript') {
    return {
      stdout: '',
      stderr: `Server execution is not configured for "${language}".`,
      exitCode: 1,
      durationMs: 0,
    };
  }

  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
    return {
      stdout: '',
      stderr: 'Code exceeds the 200KB execution limit.',
      exitCode: 1,
      durationMs: 0,
    };
  }

  if (Buffer.byteLength(stdin, 'utf8') > MAX_STDIN_BYTES) {
    return {
      stdout: '',
      stderr: 'Standard input exceeds the 64KB limit.',
      exitCode: 1,
      durationMs: 0,
    };
  }

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

  const start = Date.now();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'notecode-run-'));

  try {
    const usesCommonJs =
      lang === 'javascript' &&
      /\brequire\s*\(|\bmodule\.exports\b/.test(code) &&
      !/^\s*(import|export)\s+/m.test(code);

    const filename =
      lang === 'typescript'
        ? 'main.ts'
        : usesCommonJs
          ? 'main.cjs'
          : 'main.mjs';

    const filePath = path.join(tmpDir, filename);
    await fs.writeFile(filePath, code, 'utf8');

    const nodeArgs =
      lang === 'typescript'
        ? ['--no-warnings', '--experimental-strip-types', filePath]
        : ['--no-warnings', filePath];

    return await new Promise<ExecutionResult>((resolve) => {
      const child = spawn(process.execPath, nodeArgs, {
        cwd: tmpDir,
        env: {
          PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
          NO_COLOR: '1',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let truncated = false;
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, EXECUTION_TIMEOUT_MS);

      child.stdout.on('data', (chunk: Buffer) => {
        if (stdout.length + chunk.length > MAX_OUTPUT_BYTES) {
          stdout += chunk.toString('utf8', 0, Math.max(0, MAX_OUTPUT_BYTES - stdout.length));
          truncated = true;
          child.kill('SIGKILL');
          return;
        }
        stdout += chunk.toString('utf8');
      });

      child.stderr.on('data', (chunk: Buffer) => {
        if (stderr.length + chunk.length > MAX_OUTPUT_BYTES) {
          stderr += chunk.toString('utf8', 0, Math.max(0, MAX_OUTPUT_BYTES - stderr.length));
          truncated = true;
          child.kill('SIGKILL');
          return;
        }
        stderr += chunk.toString('utf8');
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr: err.message || 'Execution failed to start.',
          exitCode: 1,
          durationMs: Date.now() - start,
        });
      });

      child.on('close', (exitCode) => {
        clearTimeout(timer);
        const durationMs = Math.max(1, Date.now() - start);

        if (timedOut) {
          resolve({
            stdout,
            stderr: `${stderr ? `${stderr}\n` : ''}Execution timed out after ${EXECUTION_TIMEOUT_MS / 1000}s.`,
            exitCode: 124,
            durationMs,
          });
          return;
        }

        const moduleNotFound =
          /ERR_MODULE_NOT_FOUND|Cannot find module|Cannot find package/i.test(stderr);

        const finalStderr = truncated
          ? `${stderr}\n[Output truncated at 64KB]`
          : moduleNotFound
            ? `${stderr.trim()}\n\n${formatPackageErrorMessage()}`
            : stderr;

        resolve({
          stdout,
          stderr: finalStderr,
          exitCode: exitCode ?? 1,
          durationMs,
          packageError: moduleNotFound,
        });
      });

      // B6: the program may exit without reading stdin, which raises EPIPE.
      // Without a handler this becomes an unhandled 'error' event and can crash the server.
      child.stdin.on('error', () => {});

      if (stdin) {
        child.stdin.write(stdin);
      }
      child.stdin.end();
    });
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
