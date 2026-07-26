/**
 * Helpers for the print/export pop-ups.
 *
 * Every one of these views is built by writing an HTML string into a
 * `window.open('')` pop-up. Such a document inherits the opener's
 * Content-Security-Policy, so anything the markup needs has to satisfy the
 * site's CSP. Two habits in the original templates were what kept the CSP stuck
 * in report-only mode:
 *
 *   1. `<script src="https://cdn.tailwindcss.com">` — a remote JIT compiler,
 *      which would have required whitelisting the CDN *and* 'unsafe-eval'.
 *   2. Inline `<script>` blocks and `onclick="window.print()"` attributes, both
 *      of which need `script-src 'unsafe-inline'` — the single directive that
 *      gives away most of what a CSP buys you.
 *
 * Neither is necessary. The opener can style the pop-up from the app's own
 * stylesheet and drive its behaviour directly through the returned Window
 * handle, so the pop-up needs no script of its own.
 */

/** Marker attribute on any element in a pop-up that should trigger printing. */
export const PRINT_TRIGGER_ATTR = 'data-print-trigger';

/**
 * Same-origin `<link rel="stylesheet">` tags copied from the current document.
 *
 * The Tailwind CDN was never needed here: Tailwind's scanner covers
 * `./src/**\/*.{ts,tsx}` (tailwind.config.ts) and this print markup lives in
 * template literals inside those files, so every utility class it references is
 * already compiled into the app's own stylesheet. Pointing the pop-up at that
 * file produces identical output while satisfying `style-src 'self'`.
 *
 * Non-Tailwind helpers such as `.page-break` and `.avoid-break` are declared in
 * each template's own inline <style> block and are unaffected.
 */
export function appStylesheetTags(): string {
  if (typeof document === 'undefined') return '';

  const origin = window.location.origin;

  return Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  )
    .map((link) => link.href)
    // Same-origin only — a cross-origin sheet would reintroduce the dependency
    // this exists to remove.
    .filter((href) => href.startsWith(origin))
    .map((href) => `<link rel="stylesheet" href="${href}">`)
    .join('\n          ');
}

/**
 * Close a pop-up's document and wire up its printing behaviour from here,
 * replacing the inline script the markup used to carry.
 *
 * Call this instead of `printWindow.document.close()`.
 *
 * @param printWindow the handle returned by `window.open('')`
 * @param options.auto print as soon as the document finishes loading, which is
 *   what the old `window.onload = () => window.print()` blocks did. Leave it off
 *   for pop-ups that offer a "Cetak" button instead.
 */
export function finalizePrintWindow(
  printWindow: Window,
  options: { auto?: boolean } = {},
): void {
  printWindow.document.close();

  // Buttons inside the pop-up opt in with data-print-trigger rather than an
  // inline onclick handler.
  printWindow.document
    .querySelectorAll<HTMLElement>(`[${PRINT_TRIGGER_ATTR}]`)
    .forEach((el) => {
      el.addEventListener('click', () => printWindow.print());
    });

  if (!options.auto) return;

  // document.close() can leave the document already complete, in which case the
  // load event has been and gone — printing immediately is then correct.
  if (printWindow.document.readyState === 'complete') {
    printWindow.print();
  } else {
    printWindow.addEventListener('load', () => printWindow.print(), { once: true });
  }
}
