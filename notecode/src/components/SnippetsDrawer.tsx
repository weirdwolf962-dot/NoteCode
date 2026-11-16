import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, LogIn, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SavedSnippet, getSnippetPreviewLine } from '../utils/snippet';

interface SnippetsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSnippet: (id: string) => void;
}

export function SnippetsDrawer({
  isOpen,
  onClose,
  onSelectSnippet,
}: SnippetsDrawerProps) {
  const { user, signInWithGoogle, getIdToken } = useAuth();
  const [snippets, setSnippets] = useState<SavedSnippet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fetchSeqRef = useRef(0);

  // B8: drop the previous account's list immediately when the user changes,
  // and invalidate any fetch still in flight for them.
  useEffect(() => {
    fetchSeqRef.current++;
    setSnippets([]);
    setError(null);
    setLoading(false);
  }, [user?.uid]);

  const fetchMySnippets = useCallback(async () => {
    if (!user) return;
    const seq = ++fetchSeqRef.current;
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch('/api/me/snippets', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error('Failed to load your saved snippets.');
      }
      const data = (await res.json()) as { snippets: SavedSnippet[] };
      if (seq !== fetchSeqRef.current) return;
      setSnippets(data.snippets);
    } catch (err: unknown) {
      if (seq !== fetchSeqRef.current) return;
      setError(
        err instanceof Error ? err.message : 'Unable to load saved snippets.'
      );
    } finally {
      if (seq === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  }, [user, getIdToken]);

  useEffect(() => {
    if (isOpen && user) {
      fetchMySnippets();
    }
  }, [isOpen, user, fetchMySnippets]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`/api/snippets/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error('Could not delete snippet.');
      }
      setSnippets((prev) => prev.filter((item) => item.id !== id));
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete snippet.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#121826]/55 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="My saved snippets"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-full bg-[#FFFFFE] dark:bg-[#121826] text-[#121826] dark:text-[#FFFFFE] border-l border-[#CED6E1] dark:border-[#364153] shadow-2xl flex flex-col"
      >
        <div className="px-6 py-4 border-b border-[#CED6E1] dark:border-[#364153] flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">My Snippets</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close My Snippets drawer"
            className="p-2 rounded-lg text-[#364153] dark:text-[#CED6E1] hover:bg-[#CED6E1]/40 dark:hover:bg-[#364153] transition-colors cursor-pointer min-w-[40px] min-h-[40px] inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#406AFF]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!user ? (
            <div className="py-12 text-center space-y-4">
              <p className="text-sm text-[#364153] dark:text-[#CED6E1]">
                Sign in with Google to keep track of every code snippet you
                share and reopen or remove them anytime.
              </p>
              <button
                type="button"
                onClick={signInWithGoogle}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-[#406AFF] hover:bg-[#2F58E8] text-[#FFFFFE] transition-colors cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#406AFF]"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                <span>Sign in with Google</span>
              </button>
            </div>
          ) : loading ? (
            <div className="space-y-3" aria-busy="true">
              {[1, 2, 3].map((row) => (
                <div
                  key={row}
                  className="p-4 rounded-xl border border-[#CED6E1] dark:border-[#364153] animate-pulse space-y-2"
                >
                  <div className="h-4 w-2/3 rounded bg-[#CED6E1]/60 dark:bg-[#364153]" />
                  <div className="h-3 w-1/3 rounded bg-[#CED6E1]/50 dark:bg-[#364153]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-200 space-y-3">
              <p>{error}</p>
              <button
                type="button"
                onClick={fetchMySnippets}
                className="text-xs font-semibold underline underline-offset-4 cursor-pointer"
              >
                Try again
              </button>
            </div>
          ) : snippets.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-base font-semibold">No saved snippets yet</p>
              <p className="text-sm text-[#364153] dark:text-[#CED6E1]">
                Click Share in the editor while signed in to save a permalink
                here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#CED6E1]/70 dark:divide-[#364153]">
              {snippets.map((item) => (
                <li
                  key={item.id}
                  className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSnippet(item.id);
                      onClose();
                    }}
                    className="text-left flex-1 min-w-0 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#406AFF] rounded-lg p-1 -m-1"
                  >
                    <p className="font-mono text-sm font-medium truncate group-hover:text-[#406AFF] transition-colors">
                      {getSnippetPreviewLine(item.code)}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[#364153] dark:text-[#CED6E1]">
                      <span className="uppercase font-semibold">
                        {item.language}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{item.theme}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSnippet(item.id);
                        onClose();
                      }}
                      aria-label={`Open snippet ${item.id.slice(0, 8)}`}
                      className="p-2 rounded-lg text-[#364153] dark:text-[#CED6E1] hover:text-[#406AFF] hover:bg-[#CED6E1]/30 dark:hover:bg-[#364153] transition-colors cursor-pointer min-w-[36px] min-h-[36px] inline-flex items-center justify-center"
                    >
                      <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      aria-label={`Delete snippet ${item.id.slice(0, 8)}`}
                      className="p-2 rounded-lg text-[#364153] dark:text-[#CED6E1] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer min-w-[36px] min-h-[36px] inline-flex items-center justify-center disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
