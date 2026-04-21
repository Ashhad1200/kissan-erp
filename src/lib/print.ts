import { getPrintStyles } from "./print-styles";

/**
 * Opens a new browser window, injects HTML + print styles, then triggers print.
 * Called from click handlers so browser won't block the popup.
 */
export function printHtml(html: string, title = "KissanMall — Print") {
  const win = window.open("", "_blank", "width=900,height=700,menubar=no,toolbar=no,scrollbars=yes");
  if (!win) {
    alert("Printing blocked. Please allow pop-ups for this site and try again.");
    return;
  }
  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>${getPrintStyles()}</style>
</head>
<body>${html}</body>
</html>`);
  win.document.close();
  win.focus();
  // Small delay lets the browser finish layout before printing
  setTimeout(() => {
    win.print();
    win.close();
  }, 350);
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
