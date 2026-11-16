import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CodeEditorCard } from './components/CodeEditorCard';
import { Header } from './components/Header';
import { PageBackdrop } from './components/PageBackdrop';
import { SnippetsDrawer } from './components/SnippetsDrawer';
import { ConsoleLogEntry, TerminalTab } from './components/TerminalPanel';
import { executeSnippetInBrowserOrServer } from './utils/browserRunners';
import { ExecutionResult, isMarkupLanguage } from './utils/runner';
import {
  DEFAULT_HTML_SNIPPET,
  EditorTheme,
  SavedSnippet,
  SnippetState,
  extractSnippetIdFromPath,
  hasSnippetChanged,
  isValidSnippetId,
  normalizeLanguage,
  normalizeTheme,
} from './utils/snippet';

function NoteCodeWorkspace() {
  const { getIdToken } = useAuth();

  const [code, setCode] = useState<string>(DEFAULT_HTML_SNIPPET);
  const [language, setLanguage] = useState<string>('html');
  const [theme, setTheme] = useState<EditorTheme>('light');

  const [sharedId, setSharedId] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<SnippetState | null>(null);
  const [isLoadingSnippet, setIsLoadingSnippet] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [notFoundId, setNotFoundId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  const [terminalOpen, setTerminalOpen] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeTerminalTab, setActiveTerminalTab] = useState<TerminalTab>('console');
  const [stdinOpen, setStdinOpen] = useState<boolean>(false);
  const [stdinValue, setStdinValue] = useState<string>('');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [markupLogs, setMarkupLogs] = useState<ConsoleLogEntry[]>([]);
  const [runId, setRunId] = useState<string>('init');
  const activeRunIdRef = useRef<string>('init');
  // B1: synchronous re-entry guard (state updates are async, so isRunning alone can't stop Ctrl+Enter spam)
  const runningRef = useRef<boolean>(false);
  // B4: monotonically increasing token so only the latest snippet load may apply its result
  const loadSeqRef = useRef<number>(0);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as
        | { type?: string; runId?: string; level?: string; message?: string }
        | undefined;
      if (!data || data.runId !== activeRunIdRef.current) {
        return;
      }
      if (data.type === 'notecode-console') {
        const level =
          data.level === 'warn' || data.level === 'error' || data.level === 'info'
            ? data.level
            : 'log';
        setMarkupLogs((prev) => [
          ...prev,
          { level, message: String(data.message ?? '') },
        ]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const resetTerminalOutput = useCallback(() => {
    setExecutionResult(null);
    setMarkupLogs([]);
    setIsRunning(false);
  }, []);

  const loadSnippetById = useCallback(
    async (id: string) => {
      setErrorMessage(null);
      setNotFoundId(null);
      resetTerminalOutput();
      setTerminalOpen(false);

      const seq = ++loadSeqRef.current;

      if (!isValidSnippetId(id)) {
        setIsLoadingSnippet(false);
        setNotFoundId(id);
        setSharedId(null);
        setSavedSnapshot(null);
        return;
      }

      setIsLoadingSnippet(true);
      try {
        const res = await fetch(`/api/snippets/${encodeURIComponent(id)}`);
        if (seq !== loadSeqRef.current) return;
        if (res.status === 404) {
          setNotFoundId(id);
          setSharedId(null);
          setSavedSnapshot(null);
          return;
        }
        if (!res.ok) {
          throw new Error('Could not load snippet from the server.');
        }

        const data = (await res.json()) as { snippet: SavedSnippet };
        if (seq !== loadSeqRef.current) return;
        const normalizedLang = normalizeLanguage(data.snippet.language);
        const normalizedTheme = normalizeTheme(data.snippet.theme);

        setCode(data.snippet.code);
        setLanguage(normalizedLang);
        setTheme(normalizedTheme);
        setSharedId(data.snippet.id);
        setSavedSnapshot({
          code: data.snippet.code,
          language: normalizedLang,
          theme: normalizedTheme,
        });
      } catch (err: unknown) {
        if (seq !== loadSeqRef.current) return;
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred while loading the snippet.'
        );
      } finally {
        if (seq === loadSeqRef.current) {
          setIsLoadingSnippet(false);
        }
      }
    },
    [resetTerminalOutput]
  );

  const syncFromLocation = useCallback(() => {
    const id = extractSnippetIdFromPath(window.location.pathname);
    if (id) {
      loadSnippetById(id);
    } else {
      loadSeqRef.current++; // cancel any in-flight snippet load
      setIsLoadingSnippet(false);
      setNotFoundId(null);
      setErrorMessage(null);
      setSharedId(null);
      setSavedSnapshot(null);
      setCode(DEFAULT_HTML_SNIPPET);
      setLanguage('html');
      setTheme('light');
      resetTerminalOutput();
      setTerminalOpen(false);
    }
  }, [loadSnippetById, resetTerminalOutput]);

  useEffect(() => {
    syncFromLocation();
    const handlePopState = () => {
      syncFromLocation();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [syncFromLocation]);

  const handleNewSnippet = () => {
    loadSeqRef.current++; // cancel any in-flight snippet load
    setIsLoadingSnippet(false);
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    setNotFoundId(null);
    setErrorMessage(null);
    setSharedId(null);
    setSavedSnapshot(null);
    setCode(DEFAULT_HTML_SNIPPET);
    setLanguage('html');
    setTheme('light');
    resetTerminalOutput();
    setTerminalOpen(false);
  };

  const handleSelectSnippet = (id: string) => {
    const nextPath = `/${id}`;
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    loadSnippetById(id);
  };

  const handleShare = async () => {
    if (!code.trim()) {
      setErrorMessage('Please enter some code before sharing.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const token = await getIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch('/api/snippets', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          code,
          language,
          theme,
        }),
      });

      const rawBody = await res.text();
      let body: { snippet?: SavedSnippet; error?: string } = {};
      try {
        body = JSON.parse(rawBody) as typeof body;
      } catch {
        // Non-JSON response (e.g. a platform error page)
        throw new Error(
          `Server error (${res.status}). Please try again in a moment.`
        );
      }

      if (!res.ok || !body.snippet) {
        throw new Error(body.error || 'Failed to share snippet.');
      }

      const created = body.snippet;
      const nextPath = `/${created.id}`;
      window.history.pushState({}, '', nextPath);

      setSharedId(created.id);
      setSavedSnapshot({
        code: created.code,
        language: normalizeLanguage(created.language),
        theme: normalizeTheme(created.theme),
      });
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to share snippet. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRun = async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    const nextRunId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    activeRunIdRef.current = nextRunId;
    setRunId(nextRunId);
    setTerminalOpen(true);
    setIsRunning(true);
    setMarkupLogs([]);
    setErrorMessage(null);

    if (!isMarkupLanguage(language)) {
      setActiveTerminalTab('console');
    }

    try {
      const result = await executeSnippetInBrowserOrServer({
        code,
        language,
        stdin: stdinValue,
        runId: nextRunId,
      });
      if (activeRunIdRef.current === nextRunId) {
        setExecutionResult(result);
      }
    } catch (err: unknown) {
      if (activeRunIdRef.current === nextRunId) {
        setExecutionResult({
          stdout: '',
          stderr:
            err instanceof Error ? err.message : 'Unexpected execution failure.',
          exitCode: 1,
          durationMs: 0,
        });
      }
    } finally {
      runningRef.current = false;
      if (activeRunIdRef.current === nextRunId) {
        setIsRunning(false);
      }
    }
  };

  const canShare = hasSnippetChanged({ code, language, theme }, savedSnapshot);
  const showNewButton =
    sharedId !== null ||
    notFoundId !== null ||
    code !== DEFAULT_HTML_SNIPPET ||
    language !== 'html';

  return (
    <div className="relative min-h-screen w-full flex flex-col">
      <PageBackdrop />
      <Header
        onNewSnippet={handleNewSnippet}
        onOpenLibrary={() => setDrawerOpen(true)}
        showNewButton={showNewButton}
      />

      <main className="relative z-10 flex-1 w-full px-4 sm:px-6 pt-6 pb-12 flex flex-col items-center">
        <div className="text-center max-w-2xl mx-auto mb-9">
          <h1 className="text-[26px] sm:text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#121826] text-balance">
            Create &amp; Share
          </h1>
          <p className="mt-3.5 text-[32px] sm:text-[40px] font-semibold leading-[1.2] tracking-[-0.015em] text-[#121826] text-balance">
            Your Code easily
          </p>
        </div>

        {notFoundId ? (
          <section
            aria-label="Snippet not found"
            className={`w-full max-w-[640px] mx-auto rounded-2xl border p-8 sm:p-10 text-center shadow-[0_24px_60px_-15px_rgba(18,24,38,0.35)] ${
              theme === 'dark'
                ? 'bg-[#121826] border-[#364153] text-[#FFFFFE]'
                : 'bg-[#FFFFFE] border-[#CED6E1] text-[#121826]'
            }`}
          >
            <h2 className="text-2xl font-semibold">Snippet not found</h2>
            <p
              className={`mt-2 text-sm ${
                theme === 'dark' ? 'text-[#CED6E1]' : 'text-[#364153]'
              }`}
            >
              The code link you requested does not exist or may have been
              removed.
            </p>
            <button
              type="button"
              onClick={handleNewSnippet}
              className="mt-6 inline-flex items-center justify-center px-6 py-2.5 rounded-full text-[16px] font-semibold bg-[#406AFF] hover:bg-[#2F58E8] text-[#FFFFFE] transition-colors cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#406AFF]"
            >
              Create New Snippet
            </button>
          </section>
        ) : (
          <CodeEditorCard
            code={code}
            language={language}
            theme={theme}
            sharedId={sharedId}
            canShare={canShare}
            isSaving={isSaving}
            isLoadingSnippet={isLoadingSnippet}
            errorMessage={errorMessage}
            terminalOpen={terminalOpen}
            isRunning={isRunning}
            activeTerminalTab={activeTerminalTab}
            stdinOpen={stdinOpen}
            stdinValue={stdinValue}
            executionResult={executionResult}
            markupLogs={markupLogs}
            runId={runId}
            onCodeChange={(val) => {
              setErrorMessage(null);
              setCode(val);
            }}
            onLanguageChange={(lang) => {
              setErrorMessage(null);
              setLanguage(lang);
              resetTerminalOutput();
              if (!isMarkupLanguage(lang)) {
                setActiveTerminalTab('console');
              }
            }}
            onThemeChange={(nextTheme) => {
              setErrorMessage(null);
              setTheme(nextTheme);
            }}
            onShare={handleShare}
            onRun={handleRun}
            onToggleTerminal={() => setTerminalOpen((prev) => !prev)}
            onTerminalTabChange={setActiveTerminalTab}
            onToggleStdin={() => setStdinOpen((prev) => !prev)}
            onStdinChange={setStdinValue}
            onClearTerminal={() => {
              setExecutionResult(null);
              setMarkupLogs([]);
            }}
          />
        )}
      </main>

      <footer className="relative z-10 w-full py-5 px-4 text-center text-xs text-[#FFFFFE]/80">
        NoteCode — Instant code sharing with PostgreSQL persistence
      </footer>

      <SnippetsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelectSnippet={handleSelectSnippet}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NoteCodeWorkspace />
    </AuthProvider>
  );
}
