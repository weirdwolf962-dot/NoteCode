import { FolderCode, LogIn, LogOut, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  onNewSnippet: () => void;
  onOpenLibrary: () => void;
  showNewButton: boolean;
}

/** Blue brand mark (the old /logo.png is white, so it disappears on a light page). */
function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <rect
        x="4"
        y="5"
        width="18"
        height="22"
        rx="5"
        transform="rotate(-14 13 16)"
        fill="#406AFF"
      />
      <rect
        x="10"
        y="5"
        width="18"
        height="22"
        rx="5"
        transform="rotate(10 19 16)"
        fill="#7A9BFF"
        fillOpacity="0.85"
      />
    </svg>
  );
}

const navButtonBase =
  'inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#364153] hover:text-[#121826] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 min-h-[40px] px-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#406AFF] rounded-lg';

export function Header({
  onNewSnippet,
  onOpenLibrary,
  showNewButton,
}: HeaderProps) {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  return (
    <header className="relative z-10 w-full max-w-[1040px] mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-2 flex items-center justify-between gap-2 sm:gap-6 md:grid md:grid-cols-[1fr_auto_1fr]">
      {/* Empty left column so the brand stays centred on desktop (as in the design) */}
      <div className="hidden md:block" aria-hidden="true" />

      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          onNewSnippet();
        }}
        className="inline-flex items-center gap-2 sm:gap-2.5 text-[#121826] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#406AFF] rounded-lg px-1 py-1"
      >
        <BrandMark className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
        <span className="flex flex-col leading-tight">
          <span className="text-lg sm:text-xl font-semibold tracking-tight">
            NoteCode
          </span>
          <span className="text-[11px] font-medium text-[#364153]/80 tracking-normal">
            by Quantum coders
          </span>
        </span>
      </a>

      <nav
        aria-label="Primary actions"
        className="flex items-center gap-1.5 sm:gap-4 shrink-0 md:justify-self-end"
      >
        {showNewButton && (
          <button
            type="button"
            onClick={onNewSnippet}
            aria-label="New Snippet"
            className={navButtonBase}
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
          className={navButtonBase}
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
              className="inline-flex items-center gap-2 px-2.5 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#121826] bg-[#121826]/5 hover:bg-[#121826]/10 border border-[#CED6E1] rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[40px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#406AFF]"
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
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[#121826] bg-[#FFFFFE] hover:bg-[#F1F5F9] border border-[#CED6E1] rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[40px] shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#406AFF]"
            >
              <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Sign in</span>
            </button>
          ))}
      </nav>
    </header>
  );
}
