import { useRef, useState } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import {
  AlignLeft,
  Check,
  ChevronDown,
  Copy,
  Link2,
  Loader2,
  Moon,
  Play,
  Share2,
  Sun,
  Terminal,
} from 'lucide-react';
import {
  formatCodeWithPrettier,
  isFormattingSupported,
} from '../utils/formatter';
import {
  EditorTheme,
  SUPPORTED_LANGUAGES,
  SUPPORTED_THEMES,
  formatShareUrl,
  getSnippetStats,
} from '../utils/snippet';
import { ExecutionResult } from '../utils/runner';
import {
  ConsoleLogEntry,
  TerminalPanel,
  TerminalTab,
} from './TerminalPanel';

interface CodeEditorCardProps {
  code: string;
  language: string;
  theme: EditorTheme;
  sharedId: string | null;
  canShare: boolean;
  isSaving: boolean;
  isLoadingSnippet: boolean;
  errorMessage: string | null;
  terminalOpen: boolean;
  isRunning: boolean;
  activeTerminalTab: TerminalTab;
  stdinOpen: boolean;
  stdinValue: string;
  executionResult: ExecutionResult | null;
  markupLogs: ConsoleLogEntry[];
  runId: string;
  onCodeChange: (value: string) => void;
  onLanguageChange: (language: string) => void;
  onThemeChange: (theme: EditorTheme) => void;
  onShare: () => void;
  onRun: () => void;
  onToggleTerminal: () => void;
  onTerminalTabChange: (tab: TerminalTab) => void;
  onToggleStdin: () => void;
  onStdinChange: (value: string) => void;
  onClearTerminal: () => void;
}

export function CodeEditorCard({
  code,
  language,
  theme,
  sharedId,
  canShare,
  isSaving,
  isLoadingSnippet,
  errorMessage,
  terminalOpen,
  isRunning,
  activeTerminalTab,
  stdinOpen,
  stdinValue,
  executionResult,
  markupLogs,
  runId,
  onCodeChange,
  onLanguageChange,
  onThemeChange,
  onShare,
  onRun,
  onToggleTerminal,
  onTerminalTabChange,
  onToggleStdin,
  onStdinChange,
  onClearTerminal,
}: CodeEditorCardProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [formattedSuccess, setFormattedSuccess] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  const monacoConfigured = useRef(false);
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;

  const isDark = theme === 'dark';
  const canFormat = isFormattingSupported(language);
  const activeError = errorMessage || formatError;
  const stats = getSnippetStats(code);
  const shareUrl =
    sharedId && typeof window !== 'undefined'
      ? formatShareUrl(window.location.origin, sharedId)
      : null;

  const handleBeforeMount = (monaco: Monaco) => {
    if (monacoConfigured.current) {
      return;
    }
    monacoConfigured.current = true;

    monaco.editor.defineTheme('notecode-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
        { token: 'tag', foreground: '406AFF' },
        { token: 'attribute.name', foreground: '743EE4' },
        { token: 'attribute.value', foreground: '0F766E' },
        { token: 'string', foreground: '0F766E' },
        { token: 'keyword', foreground: '406AFF' },
      ],
      colors: {
        'editor.background': '#FFFFFE',
        'editor.foreground': '#121826',
        'editor.lineHighlightBackground': '#FFFFFE00', 'editor.lineHighlightBorder': '#E5E7EB',
        'editorLineNumber.foreground': '#94A3B8',
        'editorLineNumber.activeForeground': '#121826',
        'editor.selectionBackground': '#406AFF26',
        'editorCursor.foreground': '#406AFF',
        'editorGutter.background': '#FFFFFE',
      },
    });

    monaco.editor.defineTheme('notecode-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '94A3B8', fontStyle: 'italic' },
        { token: 'tag', foreground: '7AA2FF' },
        { token: 'attribute.name', foreground: 'C4B5FD' },
        { token: 'attribute.value', foreground: '5EEAD4' },
        { token: 'string', foreground: '5EEAD4' },
        { token: 'keyword', foreground: '7AA2FF' },
      ],
      colors: {
        'editor.background': '#121826',
        'editor.foreground': '#FFFFFE',
        'editor.lineHighlightBackground': '#1E293B',
        'editorLineNumber.foreground': '#64748B',
        'editorLineNumber.activeForeground': '#FFFFFE',
        'editor.selectionBackground': '#406AFF44',
        'editorCursor.foreground': '#406AFF',
        'editorGutter.background': '#121826',
      },
    });
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleFormatCode = async () => {
    if (!canFormat || isFormatting || isLoadingSnippet) return;
    setIsFormatting(true);
    setFormatError(null);
    const result = await formatCodeWithPrettier(code, language);
    setIsFormatting(false);

    if (result.ok) {
      onCodeChange(result.formatted);
      setFormattedSuccess(true);
      window.setTimeout(() => setFormattedSuccess(false), 1800);
    } else {
      setFormatError(result.error);
    }
  };

  return (
    <section
      aria-label="Code editor workspace"
      data-testid="code-editor-container"
      data-theme={theme}
      data-language={language}
      className={`w-full max-w-[880px] mx-auto rounded-2xl border shadow-[0_12px_40px_-12px_rgba(18,24,38,0.18)] transition-colors duration-150 overflow-hidden ${
        isDark
          ? 'bg-[#121826] border-[#364153] text-[#FFFFFE]'
          : 'bg-[#FFFFFE] border-[#CED6E1] text-[#121826]'
      }`}
    >
      {activeError && (
        <div
          role="alert"
          className={`px-5 py-3 text-sm font-medium border-b flex items-center justify-between gap-3 ${
            isDark
              ? 'bg-red-950/50 border-red-800/60 text-red-200'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <span>{activeError}</span>
        </div>
      )}

      <div className="relative h-[360px] sm:h-[420px] w-full">
        {isLoadingSnippet ? (
          <div
            aria-busy="true"
            aria-label="Loading code snippet"
            className="h-full w-full p-6 space-y-3 animate-pulse"
          >
            <div
              className={`h-4 w-1/3 rounded ${
                isDark ? 'bg-[#364153]' : 'bg-[#CED6E1]/60'
              }`}
            />
            <div
              className={`h-4 w-2/3 rounded ${
                isDark ? 'bg-[#364153]' : 'bg-[#CED6E1]/60'
              }`}
            />
            <div
              className={`h-4 w-1/2 rounded ${
                isDark ? 'bg-[#364153]' : 'bg-[#CED6E1]/60'
              }`}
            />
            <div
              className={`h-4 w-3/4 rounded ${
                isDark ? 'bg-[#364153]' : 'bg-[#CED6E1]/60'
              }`}
            />
            <div
              className={`h-4 w-1/4 rounded ${
                isDark ? 'bg-[#364153]' : 'bg-[#CED6E1]/60'
              }`}
            />
          </div>
        ) : (
          <Editor
            height="100%"
            language={language}
            value={code}
            theme={isDark ? 'notecode-dark' : 'notecode-light'}
            beforeMount={handleBeforeMount}
            onMount={(editor, monaco) => {
              // Park the cursor at the end of the snippet (matches the design mockup)
              const model = editor.getModel();
              if (model) {
                const last = model.getLineCount();
                editor.setPosition({
                  lineNumber: last,
                  column: model.getLineMaxColumn(last),
                });
              }
              editor.addCommand(
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                () => {
                  onRunRef.current();
                }
              );
            }}
            onChange={(val) => {
              setFormatError(null);
              onCodeChange(val ?? '');
            }}
            loading={
              <div className="h-full w-full flex items-center justify-center text-sm text-[#364153] dark:text-[#CED6E1]">
                Initializing editor...
              </div>
            }
            options={{
              fontSize: 12,
              lineHeight: 18,
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              minimap: { enabled: true, renderCharacters: false, maxColumn: 60, scale: 1 },
              scrollBeyondLastLine: false,
              padding: { top: 20, bottom: 20 },
              lineNumbersMinChars: 3,
              glyphMargin: false,
              folding: true, showFoldingControls: 'always', guides: { indentation: true },
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              renderLineHighlight: 'all',
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
            }}
          />
        )}
      </div>

      <div
        className={`px-4 sm:px-6 py-3.5 border-t flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'border-[#364153]' : 'border-[#CED6E1]/80'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <div className="relative inline-flex items-center">
            <label htmlFor="language-select" className="sr-only">
              Programming language
            </label>
            <select
              id="language-select"
              value={language}
              onChange={(e) => {
                setFormatError(null);
                onLanguageChange(e.target.value);
              }}
              className={`appearance-none text-[10px] font-semibold tracking-wide uppercase pl-3.5 pr-8 py-2 rounded-full border transition-colors cursor-pointer min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#406AFF] ${
                isDark
                  ? 'bg-[#364153] border-[#364153] text-[#FFFFFE] hover:bg-[#364153]/80'
                  : 'bg-[#CED6E1]/55 border-[#CED6E1] text-[#364153] hover:bg-[#CED6E1]/80'
              }`}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option
                  key={lang.value}
                  value={lang.value}
                  className={
                    isDark
                      ? 'bg-[#121826] text-[#FFFFFE]'
                      : 'bg-[#FFFFFE] text-[#121826]'
                  }
                >
                  {lang.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 ${
                isDark ? 'text-[#CED6E1]' : 'text-[#364153]'
              }`}
              aria-hidden="true"
            />
          </div>

          <div className="relative inline-flex items-center">
            <label htmlFor="theme-select" className="sr-only">
              Editor theme
            </label>
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute left-3 ${
                isDark ? 'text-[#CED6E1]' : 'text-[#364153]'
              }`}
            >
              {isDark ? (
                <Moon className="w-3 h-3" />
              ) : (
                <Sun className="w-3 h-3" />
              )}
            </span>
            <select
              id="theme-select"
              value={theme}
              onChange={(e) => onThemeChange(e.target.value as EditorTheme)}
              className={`appearance-none text-[10px] font-semibold tracking-wide uppercase pl-8 pr-8 py-2 rounded-full border transition-colors cursor-pointer min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#406AFF] ${
                isDark
                  ? 'bg-[#364153] border-[#364153] text-[#FFFFFE] hover:bg-[#364153]/80'
                  : 'bg-[#CED6E1]/55 border-[#CED6E1] text-[#364153] hover:bg-[#CED6E1]/80'
              }`}
            >
              {SUPPORTED_THEMES.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                  className={
                    isDark
                      ? 'bg-[#121826] text-[#FFFFFE]'
                      : 'bg-[#FFFFFE] text-[#121826]'
                  }
                >
                  {item.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 ${
                isDark ? 'text-[#CED6E1]' : 'text-[#364153]'
              }`}
              aria-hidden="true"
            />
          </div>

          <button
            type="button"
            onClick={handleFormatCode}
            disabled={!canFormat || isFormatting || isLoadingSnippet}
            data-testid="format-button"
            aria-label="Format code with Prettier"
            title={
              canFormat
                ? 'Beautify code with Prettier'
                : 'Prettier formatting is available for HTML, CSS, JavaScript, TypeScript, JSON, and Markdown'
            }
            className={`inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wide uppercase px-3 sm:px-3.5 py-2 rounded-full border transition-colors min-h-[36px] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#406AFF] ${
              !canFormat || isFormatting || isLoadingSnippet
                ? isDark
                  ? 'border-[#364153] text-[#CED6E1]/40 cursor-not-allowed'
                  : 'border-[#CED6E1] text-[#364153]/45 cursor-not-allowed'
                : isDark
                  ? 'bg-transparent border-[#364153] text-[#CED6E1] hover:bg-[#364153]/60 hover:text-[#FFFFFE] cursor-pointer'
                  : 'bg-transparent border-[#CED6E1] text-[#364153] hover:bg-[#CED6E1]/40 cursor-pointer'
            }`}
          >
            {isFormatting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                <span>Formatting</span>
              </>
            ) : formattedSuccess ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" aria-hidden="true" />
                <span>Formatted</span>
              </>
            ) : (
              <>
                <AlignLeft className="w-3 h-3" aria-hidden="true" />
                <span>Format</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopyCode}
            aria-label="Copy code to clipboard"
            className={`inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wide uppercase px-3 sm:px-3.5 py-2 rounded-full border transition-colors cursor-pointer min-h-[36px] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#406AFF] ${
              isDark
                ? 'bg-transparent border-[#364153] text-[#CED6E1] hover:bg-[#364153]/60 hover:text-[#FFFFFE]'
                : 'bg-transparent border-[#CED6E1] text-[#364153] hover:bg-[#CED6E1]/40'
            }`}
          >
            {copiedCode ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" aria-hidden="true" />
                <span className="hidden sm:inline">Copy Code</span>
                <span className="sm:hidden">Copy</span>
              </>
            )}
          </button>

          {!terminalOpen && executionResult !== null && (
            <button
              type="button"
              onClick={onToggleTerminal}
              aria-label="Show terminal output"
              className={`inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wide uppercase px-3 py-2 rounded-full border transition-colors cursor-pointer min-h-[36px] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#406AFF] ${
                isDark
                  ? 'bg-transparent border-[#364153] text-[#CED6E1] hover:bg-[#364153]/60'
                  : 'bg-transparent border-[#CED6E1] text-[#364153] hover:bg-[#CED6E1]/40'
              }`}
            >
              <Terminal className="w-3 h-3" aria-hidden="true" />
              <span>Terminal</span>
            </button>
          )}

          <span
            className={`hidden 2xl:inline-flex items-center gap-1.5 text-xs font-mono tabular-nums pl-1 ${
              isDark ? 'text-[#CED6E1]/85' : 'text-[#364153]/85'
            }`}
          >
            <span>{stats.lines} lines</span>
            <span aria-hidden="true">·</span>
            <span>{stats.characters} chars</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 ml-auto flex-wrap">
          {shareUrl && (
            <button
              type="button"
              onClick={handleCopyLink}
              aria-label="Copy shareable snippet URL"
              data-testid="copy-share-link"
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-mono transition-colors cursor-pointer min-h-[40px] max-w-[200px] sm:max-w-[260px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#406AFF] ${
                isDark
                  ? 'border-[#364153] bg-[#364153]/40 text-[#CED6E1] hover:text-[#FFFFFE] hover:bg-[#364153]/70'
                  : 'border-[#CED6E1] bg-[#CED6E1]/25 text-[#364153] hover:bg-[#CED6E1]/50'
              }`}
            >
              {copiedLink ? (
                <Check
                  className="w-3.5 h-3.5 text-emerald-500 shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <Link2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              )}
              <span className="truncate">
                {copiedLink ? 'Link copied!' : `.../${sharedId?.slice(0, 8)}`}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onRun}
            disabled={isRunning || isLoadingSnippet}
            data-testid="run-button"
            title="Run code (Ctrl/Cmd + Enter)"
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[16px] font-semibold leading-none whitespace-nowrap shrink-0 min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#406AFF] ${
              isRunning || isLoadingSnippet
                ? isDark
                  ? 'bg-[#364153] text-[#CED6E1]/60 cursor-not-allowed'
                  : 'bg-[#CED6E1] text-[#364153]/70 cursor-not-allowed'
                : isDark
                  ? 'bg-[#364153] hover:bg-[#475569] text-[#FFFFFE] cursor-pointer'
                  : 'bg-[#121826] hover:bg-[#1E293B] text-[#FFFFFE] cursor-pointer'
            }`}
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="w-4 h-4 fill-current" aria-hidden="true" />
            )}
            <span>{isRunning ? 'Running...' : 'Run'}</span>
          </button>

          <button
            type="button"
            onClick={onShare}
            disabled={!canShare || isSaving || isLoadingSnippet}
            data-testid="share-button"
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-[16px] font-semibold leading-none whitespace-nowrap shrink-0 min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#406AFF] ${
              canShare && !isSaving && !isLoadingSnippet
                ? 'bg-[#406AFF] hover:bg-[#2F58E8] text-[#FFFFFE] cursor-pointer shadow-sm'
                : isDark
                  ? 'bg-[#364153] text-[#CED6E1]/60 cursor-not-allowed'
                  : 'bg-[#CED6E1] text-[#364153]/70 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Share2 className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{isSaving ? 'Sharing...' : 'Share'}</span>
          </button>
        </div>
      </div>

      <TerminalPanel
        isOpen={terminalOpen}
        theme={theme}
        language={language}
        isRunning={isRunning}
        activeTab={activeTerminalTab}
        stdinOpen={stdinOpen}
        stdinValue={stdinValue}
        result={executionResult}
        markupLogs={markupLogs}
        runId={runId}
        onTabChange={onTerminalTabChange}
        onToggleStdin={onToggleStdin}
        onStdinChange={onStdinChange}
        onClear={onClearTerminal}
        onCollapse={onToggleTerminal}
      />
    </section>
  );
}

