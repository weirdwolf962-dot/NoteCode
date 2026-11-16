import { FolderCode, LogIn, LogOut, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  onNewSnippet: () => void;
  onOpenLibrary: () => void;
  showNewButton: boolean;
}

export function Header({
  onNewSnippet,
  onOpenLibrary,
  showNewButton,
}: HeaderProps) {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  return (
    <header className="w-full max-w-[1040px] mx-auto px-3 sm:px-6 pt-4 sm:pt-5 pb-2 flex items-center justify-between gap-2 sm:gap-6">
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          onNewSnippet();
        }}
        className="inline-flex items-center gap-2 sm:gap-2.5 text-[#FFFFFE] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFFFE] rounded-lg px-1 py-1"
      >
        <img
          src="/logo.png"
          alt="NoteCode logo"
          width={32}
          height={32}
          referrerPolicy="no-referrer"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain shrink-0"
        />
        <span className="flex flex-col leading-tight">
          <span className="text-lg sm:text-xl font-semibold tracking-tight">
            NoteCode
          </span>
          <span className="text-[11px] font-medium text-[#FFFFFE]/80 tracking-normal">
            by Quantum coders
          </span>
        </span>
      </a>

      <nav
        aria-label="Primary actions"
        className="flex items-center gap-1.5 sm:gap-4 shrink-0"
      >
        {showNewButton && (
          <button
            type="button"
            onClick={onNewSnippet}
            aria-label="New Snippet"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#FFFFFE]/90 hover:text-[#FFFFFE] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 min-h-[40px] px-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFFFE] rounded-lg"
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">New Snippet</span>
            <span className="sm:hidden">New</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenLibrary}
          aria-label="My Snippets"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#FFFFFE]/90 hover:text-[#FFFFFE] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 min-h-[40px] px-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFFFE] rounded-lg"
        >
          <FolderCode className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">My Snippets</span>
          <span className="sm:hidden">Saved</span>
        </button>

        {!loading &&
          (user ? (
            <button
              type="button"
              onClick={signOut}
              aria-label={`Sign out ${user.displayName || user.email || 'account'}`}
              className="inline-flex items-center gap-2 px-2.5 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#FFFFFE] bg-[#121826]/35 hover:bg-[#121826]/50 border border-[#FFFFFE]/25 rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[40px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFFFE]"
            >
              <span className="max-w-[120px] truncate hidden sm:inline">
                {user.displayName || user.email}
              </span>
              <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[#121826] bg-[#FFFFFE] hover:bg-[#FFFFFE]/90 rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[40px] shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFFFE]"
            >
              <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Sign in</span>
            </button>
          ))}
      </nav>
    </header>
  );
}
