import type { Plugin } from 'prettier';

const PRETTIER_PARSERS: Record<string, string> = {
  html: 'html',
  css: 'css',
  javascript: 'babel',
  typescript: 'typescript',
  json: 'json',
  markdown: 'markdown',
};

export function isFormattingSupported(language: string): boolean {
  return Object.prototype.hasOwnProperty.call(
    PRETTIER_PARSERS,
    language.trim().toLowerCase()
  );
}

export type FormatResult =
  | { ok: true; formatted: string }
  | { ok: false; error: string };

export async function formatCodeWithPrettier(
  code: string,
  language: string
): Promise<FormatResult> {
  const lang = language.trim().toLowerCase();
  const parser = PRETTIER_PARSERS[lang];

  if (!parser) {
    return {
      ok: false,
      error:
        'Prettier formatting is supported for HTML, CSS, JavaScript, TypeScript, JSON, and Markdown.',
    };
  }

  if (!code.trim()) {
    return {
      ok: false,
      error: 'Cannot format an empty code snippet.',
    };
  }

  try {
    const prettier = await import('prettier/standalone');
    const plugins: Plugin[] = [];

    if (lang === 'html') {
      const htmlPlugin = await import('prettier/plugins/html');
      plugins.push((htmlPlugin.default ?? htmlPlugin) as Plugin);
    } else if (lang === 'css') {
      const cssPlugin = await import('prettier/plugins/postcss');
      plugins.push((cssPlugin.default ?? cssPlugin) as Plugin);
    } else if (lang === 'javascript' || lang === 'json') {
      const [babelPlugin, estreePlugin] = await Promise.all([
        import('prettier/plugins/babel'),
        import('prettier/plugins/estree'),
      ]);
      plugins.push(
        (babelPlugin.default ?? babelPlugin) as Plugin,
        (estreePlugin.default ?? estreePlugin) as Plugin
      );
    } else if (lang === 'typescript') {
      const [tsPlugin, estreePlugin] = await Promise.all([
        import('prettier/plugins/typescript'),
        import('prettier/plugins/estree'),
      ]);
      plugins.push(
        (tsPlugin.default ?? tsPlugin) as Plugin,
        (estreePlugin.default ?? estreePlugin) as Plugin
      );
    } else if (lang === 'markdown') {
      const mdPlugin = await import('prettier/plugins/markdown');
      plugins.push((mdPlugin.default ?? mdPlugin) as Plugin);
    }

    const formatted = await prettier.format(code, {
      parser,
      plugins,
      tabWidth: 2,
      useTabs: false,
      semi: true,
      singleQuote: false,
      printWidth: 80,
    });

    return {
      ok: true,
      formatted: formatted.replace(/\n$/, ''),
    };
  } catch (err: unknown) {
    const rawMsg =
      err instanceof Error ? err.message.split('\n')[0] : 'Syntax error in code.';
    return {
      ok: false,
      error: `Format failed: ${rawMsg}`,
    };
  }
}
