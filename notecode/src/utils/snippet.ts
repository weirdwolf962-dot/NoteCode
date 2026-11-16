export type EditorTheme = 'light' | 'dark';

export interface LanguageOption {
  value: string;
  label: string;
}

export const SUPPORTED_LANGUAGES: readonly LanguageOption[] = [
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'json', label: 'JSON' },
  { value: 'python', label: 'Python' },
  { value: 'sql', label: 'SQL' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'xml', label: 'XML' },
] as const;

export const SUPPORTED_THEMES: readonly { value: EditorTheme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

export const DEFAULT_HTML_SNIPPET = `<html>
  <head>
    <title>HTML Sample</title>
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <style type="text/css">
      h1 {
        color: #CCA3A3;
      }
    </style>
    <script type="text/javascript">
      alert("I am a sample... visit devChallengs.io for more projects");
    </script>
  </head>
  <body>
    <h1>Heading No.1</h1>
    <input disabled type="button" value="Click me" />
  </body>
</html>`;

export interface SnippetState {
  code: string;
  language: string;
  theme: EditorTheme;
}

export interface SavedSnippet extends SnippetState {
  id: string;
  createdAt: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_CODE_BYTES = 200_000;

const ALLOWED_LANGUAGE_SET = new Set(SUPPORTED_LANGUAGES.map((l) => l.value));

export function isValidSnippetId(id: string): boolean {
  return UUID_REGEX.test(id.trim());
}

export function extractSnippetIdFromPath(pathname: string): string | null {
  const cleaned = pathname.replace(/^\/+|\/+$/g, '');
  if (!cleaned) {
    return null;
  }
  const segments = cleaned.split('/');
  if (segments.length !== 1) {
    return null;
  }
  return segments[0];
}

export function normalizeLanguage(language: unknown): string {
  if (typeof language !== 'string') {
    return 'html';
  }
  const normalized = language.trim().toLowerCase();
  return ALLOWED_LANGUAGE_SET.has(normalized) ? normalized : 'html';
}

export function normalizeTheme(theme: unknown): EditorTheme {
  return theme === 'dark' ? 'dark' : 'light';
}

export type ValidationResult =
  | { valid: true; data: SnippetState }
  | { valid: false; error: string };

export function validateSnippetPayload(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }

  const record = input as Record<string, unknown>;
  const { code, language, theme } = record;

  if (typeof code !== 'string') {
    return { valid: false, error: 'Code must be a string.' };
  }
  if (code.trim().length === 0) {
    return { valid: false, error: 'Code snippet cannot be empty.' };
  }
  if (code.includes('\u0000')) {
    return { valid: false, error: 'Code cannot contain null characters.' };
  }
  if (new TextEncoder().encode(code).length > MAX_CODE_BYTES) {
    return {
      valid: false,
      error: 'Code snippet exceeds the 200KB size limit.',
    };
  }

  if (
    typeof language !== 'string' ||
    !ALLOWED_LANGUAGE_SET.has(language.trim().toLowerCase())
  ) {
    return { valid: false, error: 'Unsupported language selected.' };
  }

  if (theme !== 'light' && theme !== 'dark') {
    return { valid: false, error: 'Theme must be either light or dark.' };
  }

  return {
    valid: true,
    data: {
      code,
      language: language.trim().toLowerCase(),
      theme,
    },
  };
}

export function hasSnippetChanged(
  current: SnippetState,
  saved: SnippetState | null
): boolean {
  if (!saved) {
    return true;
  }
  return (
    current.code !== saved.code ||
    current.language !== saved.language ||
    current.theme !== saved.theme
  );
}

export function formatShareUrl(origin: string, id: string): string {
  const normalizedOrigin = origin.replace(/\/+$/, '');
  return `${normalizedOrigin}/${id}`;
}

export function getSnippetStats(code: string): {
  lines: number;
  characters: number;
} {
  if (!code) {
    return { lines: 0, characters: 0 };
  }
  return {
    lines: code.split(/\r\n|\r|\n/).length,
    characters: code.length,
  };
}

export function getSnippetPreviewLine(code: string): string {
  const firstNonEmpty = code
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstNonEmpty) {
    return 'Empty snippet';
  }
  return firstNonEmpty.length > 52
    ? `${firstNonEmpty.slice(0, 49)}...`
    : firstNonEmpty;
}
