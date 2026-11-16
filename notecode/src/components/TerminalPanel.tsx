import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  Terminal,
  Trash2,
} from 'lucide-react';
import { EditorTheme } from '../utils/snippet';
import {
  ExecutionResult,
  PACKAGE_UNSUPPORTED_NOTICE,
  isMarkupLanguage,
} from '../utils/runner';

export type TerminalTab = 'console' | 'preview';

export interface ConsoleLogEntry {
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
}

interface TerminalPanelProps {
  isOpen: boolean;
  theme: EditorTheme;
  language: string;
  isRunning: boolean;
  activeTab: TerminalTab;
  stdinOpen: boolean;
  stdinValue: string;
  result: ExecutionResult | null;
  markupLogs: ConsoleLogEntry[];
  runId: string;
  onTabChange: (tab: TerminalTab) => void;
  onToggleStdin: () => void;
  onStdinChange: (value: string) => void;
  onClear: () => void;
  onCollapse: () => void;
}

export function TerminalPanel({
  isOpen,
  theme,
  language,
  isRunning,
  activeTab,
  stdinOpen,
  stdinValue,
  result,
  markupLogs,
  runId,
  onTabChange,
  onToggleStdin,
  onStdinChange,
  onClear,
  onCollapse,
}: TerminalPanelProps) {
  if (!isOpen) {
    return null;
  }

  const isDark = theme === 'dark';
  const showMarkupTabs = isMarkupLanguage(language);
  const effectiveTab: TerminalTab = showMarkupTabs ? activeTab : 'console';

  const hasResult = result !== null;
  const combinedStderr = [
    result?.stderr ?? '',
    ...markupLogs
      .filter((entry) => entry.level === 'error')
      .map((entry) => entry.message),
  ]
    .filter(Boolean)
    .join('\n');

  const markupStdoutLines = markupLogs.filter((entry) => entry.level !== 'error');

  return (
    <section
      aria-label="Execution terminal"
      data-testid="terminal-panel"
      className={`border-t transition-colors ${
        isDark
          ? 'bg-[#0B0F19] border-[#364153] text-[#FFFFFE]'
          : 'bg-[#F8FAFC] border-[#CED6E1] text-[#121826]'
      }`}
    >
      <div
        className={`px-4 sm:px-6 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 ${
          isDark ? 'border-[#364153]' : 'border-[#CED6E1]'
        }`}
      >
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
            <Terminal
              className="w-3.5 h-3.5 text-[#406AFF] shrink-0"
              aria-hidden="true"
            />
            <span>Terminal</span>
          </div>

          <span
            data-testid="package-notice"
            className={`text-xs font-medium ${
              isDark ? 'text-[#CED6E1]/80' : 'text-[#364153]'
            }`}
          >
            {PACKAGE_UNSUPPORTED_NOTICE}
          </span>

          {showMarkupTabs && (
            <div
              role="group"
              aria-label="Terminal view mode"
              className={`inline-flex items-center gap-1 p-0.5 rounded-lg border ${
                isDark
                  ? 'bg-[#121826] border-[#364153]'
                  : 'bg-[#FFFFFE] border-[#CED6E1]'
              }`}
            >
              <button
                type="button"
                onClick={() => onTabChange('console')}
                aria-pressed={effectiveTab === 'console'}
                data-testid="tab-console"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-md transition-colors cursor-pointer min-h-[28px] ${
                  effectiveTab === 'console'
                    ? 'bg-[#406AFF] text-[#FFFFFE]'
                    : isDark
                      ? 'text-[#CED6E1] hover:text-[#FFFFFE]'
                      : 'text-[#364153] hover:text-[#121826]'
                }`}
              >
                <Terminal className="w-3 h-3" aria-hidden="true" />
                <span>Console</span>
              </button>
              <button
                type="button"
                onClick={() => onTabChange('preview')}
                aria-pressed={effectiveTab === 'preview'}
                data-testid="tab-preview"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-md transition-colors cursor-pointer min-h-[28px] ${
                  effectiveTab === 'preview'
                    ? 'bg-[#406AFF] text-[#FFFFFE]'
                    : isDark
                      ? 'text-[#CED6E1] hover:text-[#FFFFFE]'
                      : 'text-[#364153] hover:text-[#121826]'
                }`}
              >
                <Eye className="w-3 h-3" aria-hidden="true" />
                <span>Preview</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {hasResult && !isRunning && (
            <span
              className={`text-[11px] font-mono tabular-nums flex items-center gap-1.5 pr-1 ${
                isDark ? 'text-[#CED6E1]/80' : 'text-[#364153]'
              }`}
            >
              <span>{result.durationMs} ms</span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  result.exitCode === 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }
              >
                Exit {result.exitCode}
              </span>
            </span>
          )}

          {!showMarkupTabs && (
            <button
              type="button"
              onClick={onToggleStdin}
              aria-expanded={stdinOpen}
              data-testid="toggle-stdin-button"
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-full border transition-colors cursor-pointer min-h-[30px] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#406AFF] ${
                stdinOpen
                  ? 'bg-[#406AFF] border-[#406AFF] text-[#FFFFFE]'
                  : isDark
                    ? 'border-[#364153] text-[#CED6E1] hover:bg-[#364153]/60'
                    : 'border-[#CED6E1] text-[#364153] hover:bg-[#CED6E1]/40'
              }`}
            >
              <span>Stdin</span>
              {stdinOpen ? (
                <ChevronUp className="w-3 h-3" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-3 h-3" aria-hidden="true" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onClear}
            aria-label="Clear terminal output"
            data-testid="clear-terminal-button"
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-full border transition-colors cursor-pointer min-h-[30px] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#406AFF] ${
              isDark
                ? 'border-[#364153] text-[#CED6E1] hover:bg-[#364153]/60'
                : 'border-[#CED6E1] text-[#364153] hover:bg-[#CED6E1]/40'
            }`}
          >
            <Trash2 className="w-3 h-3" aria-hidden="true" />
            <span>Clear</span>
          </button>

          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse terminal"
            data-testid="collapse-terminal-button"
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-full border transition-colors cursor-pointer min-h-[30px] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#406AFF] ${
              isDark
                ? 'border-[#364153] text-[#CED6E1] hover:bg-[#364153]/60'
                : 'border-[#CED6E1] text-[#364153] hover:bg-[#CED6E1]/40'
            }`}
          >
            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Hide</span>
          </button>
        </div>
      </div>

      {stdinOpen && !showMarkupTabs && (
        <div
          className={`px-4 sm:px-6 py-3 border-b ${
            isDark
              ? 'bg-[#121826]/70 border-[#364153]'
              : 'bg-[#FFFFFE] border-[#CED6E1]'
          }`}
        >
          <label
            htmlFor="terminal-stdin"
            className={`block text-[10px] font-semibold uppercase tracking-wide mb-1.5 ${
              isDark ? 'text-[#CED6E1]' : 'text-[#364153]'
            }`}
          >
            Standard Input (stdin)
          </label>
          <textarea
            id="terminal-stdin"
            rows={2}
            value={stdinValue}
            onChange={(e) => onStdinChange(e.target.value)}
            placeholder="Enter input lines passed to your program..."
            className={`w-full rounded-lg border px-3 py-2 text-xs font-mono resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#406AFF] ${
              isDark
                ? 'bg-[#0B0F19] border-[#364153] text-[#FFFFFE] placeholder:text-[#CED6E1]/45'
                : 'bg-[#F8FAFC] border-[#CED6E1] text-[#121826] placeholder:text-[#364153]/50'
            }`}
          />
        </div>
      )}

      {showMarkupTabs && result?.previewHtml && (
        <div
          className={
            effectiveTab === 'preview'
              ? 'h-[240px] w-full bg-[#FFFFFE]'
              : 'hidden'
          }
        >
          <iframe
            key={runId}
            title="HTML output preview"
            data-testid="html-preview-iframe"
            sandbox="allow-scripts"
            srcDoc={result.previewHtml}
            className="w-full h-full border-0 bg-[#FFFFFE]"
          />
        </div>
      )}

      {effectiveTab === 'console' && (
        <div
          data-testid="terminal-output"
          className="h-[220px] overflow-y-auto px-4 sm:px-6 py-3.5 font-mono text-xs leading-relaxed space-y-2"
        >
          {isRunning ? (
            <div className="flex items-center gap-2 text-[#406AFF]">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Running {language} snippet...</span>
            </div>
          ) : !hasResult ? (
            <p className={isDark ? 'text-[#CED6E1]/70' : 'text-[#364153]/80'}>
              Click Run to execute the current snippet.
            </p>
          ) : (
            <>
              {result.packageError && (
                <div
                  role="alert"
                  className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                    isDark
                      ? 'bg-amber-950/35 border-amber-700/60 text-amber-200'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <AlertTriangle
                    className="w-4 h-4 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-semibold">Package Not Supported</p>
                    <p className="mt-0.5 opacity-90">{PACKAGE_UNSUPPORTED_NOTICE}.</p>
                  </div>
                </div>
              )}

              {result.stdout && (
                <pre className="whitespace-pre-wrap break-words m-0">
                  {result.stdout}
                </pre>
              )}

              {markupStdoutLines.map((entry, index) => (
                <div
                  key={`${runId}-${index}`}
                  className={
                    entry.level === 'warn'
                      ? 'text-amber-600 dark:text-amber-300 whitespace-pre-wrap break-words'
                      : 'whitespace-pre-wrap break-words'
                  }
                >
                  {entry.message}
                </div>
              ))}

              {combinedStderr && (
                <pre className="whitespace-pre-wrap break-words m-0 text-red-600 dark:text-red-400">
                  {combinedStderr}
                </pre>
              )}

              {!result.stdout &&
                !combinedStderr &&
                markupStdoutLines.length === 0 && (
                  <p
                    className={
                      isDark ? 'text-[#CED6E1]/70' : 'text-[#364153]/80'
                    }
                  >
                    {showMarkupTabs
                      ? 'Document rendered with no console output. Switch to Preview to inspect the rendered result.'
                      : '(Program finished with no output)'}
                  </p>
                )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
