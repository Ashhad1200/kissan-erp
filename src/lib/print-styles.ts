/** CSS injected into every print window. Uses plain class names — NOT Tailwind. */
export function getPrintStyles(): string {
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #111;
      background: #fff;
      font-size: 13px;
      line-height: 1.5;
    }

    /* ──────────────────────────── SHARED ──────────────────────────── */
    .km-company-name  { font-size: 22px; font-weight: 700; color: #15803d; }
    .km-tagline       { font-size: 11px; color: #666; margin-top: 2px; }
    .km-divider-dashed{ border: none; border-top: 1px dashed #bbb; margin: 8px 0; }
    .km-divider-solid { border: none; border-top: 1px solid #e5e7eb; margin: 8px 0; }
    .km-badge {
      display: inline-block; padding: 2px 10px; border-radius: 9999px;
      font-size: 11px; font-weight: 600;
    }
    .km-badge-green  { background: #dcfce7; color: #15803d; }
    .km-badge-blue   { background: #dbeafe; color: #1d4ed8; }
    .km-badge-yellow { background: #fef9c3; color: #854d0e; }
    .km-badge-red    { background: #fee2e2; color: #991b1b; }

    /* ──────────────────────────── THERMAL (80mm POS receipt) ──────────────────────────── */
    .km-thermal {
      width: 80mm;
      margin: 0 auto;
      padding: 10px 8px;
    }
    .km-thermal-header {
      text-align: center;
      padding-bottom: 10px;
    }
    .km-thermal-header .km-order-num {
      font-size: 13px; font-weight: 700; font-family: monospace; margin-top: 8px;
    }
    .km-thermal-header .km-order-meta {
      font-size: 11px; color: #555; margin-top: 3px;
    }
    .km-thermal table {
      width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px;
    }
    .km-thermal table th {
      text-align: left; border-bottom: 1px dashed #bbb;
      padding: 3px 0; font-size: 11px; color: #555;
    }
    .km-thermal table td { padding: 3px 0; vertical-align: top; }
    .km-thermal table .td-right { text-align: right; }
    .km-thermal table .td-qty   { text-align: right; width: 32px; }
    .km-thermal table .td-price { text-align: right; width: 72px; }
    .km-thermal-totals { padding-top: 8px; }
    .km-thermal-totals .row {
      display: flex; justify-content: space-between;
      padding: 2px 0; font-size: 12px;
    }
    .km-thermal-totals .row-discount { color: #dc2626; }
    .km-thermal-totals .row-total {
      font-weight: 700; font-size: 15px;
      border-top: 1px dashed #bbb; padding-top: 6px; margin-top: 4px;
    }
    .km-thermal-totals .row-change { color: #15803d; font-weight: 600; }
    .km-thermal-footer {
      text-align: center; margin-top: 12px;
      font-size: 11px; color: #666;
      border-top: 1px dashed #bbb; padding-top: 10px;
    }

    /* ──────────────────────────── A4 INVOICE / PO ──────────────────────────── */
    .km-doc {
      width: 100%; max-width: 760px;
      margin: 0 auto; padding: 28px 36px;
    }
    .km-doc-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 24px;
    }
    .km-doc-title {
      font-size: 30px; font-weight: 800;
      letter-spacing: -0.5px;
    }
    .km-doc-title-sale     { color: #15803d; }
    .km-doc-title-purchase { color: #1d4ed8; }
    .km-doc-meta { text-align: right; }
    .km-doc-meta .km-doc-number {
      font-family: monospace; font-weight: 700; font-size: 15px; margin-top: 6px;
    }
    .km-doc-meta .km-doc-date { font-size: 12px; color: #6b7280; margin-top: 3px; }

    .km-meta-row {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
      margin-bottom: 20px;
    }
    .km-meta-row.single { grid-template-columns: 1fr; }
    .km-meta-box {
      background: #f9fafb; border: 1px solid #e5e7eb;
      border-radius: 6px; padding: 12px 16px;
    }
    .km-meta-box .label {
      font-size: 10px; text-transform: uppercase;
      color: #6b7280; letter-spacing: 0.05em; margin-bottom: 4px;
    }
    .km-meta-box .value   { font-size: 13px; font-weight: 600; }
    .km-meta-box .sub     { font-size: 12px; color: #6b7280; margin-top: 2px; }

    .km-doc table {
      width: 100%; border-collapse: collapse; margin-bottom: 16px;
    }
    .km-doc table th {
      background: #f3f4f6; text-align: left;
      padding: 8px 12px; font-size: 11px;
      text-transform: uppercase; color: #6b7280;
      letter-spacing: 0.04em; border-bottom: 1px solid #e5e7eb;
    }
    .km-doc table th.r { text-align: right; }
    .km-doc table td {
      padding: 10px 12px; border-bottom: 1px solid #f0f0f0;
      font-size: 13px;
    }
    .km-doc table td.r   { text-align: right; }
    .km-doc table td.muted { color: #9ca3af; font-family: monospace; font-size: 11px; }
    .km-doc table td.strong { font-weight: 600; }
    .km-doc table td.green  { color: #15803d; font-weight: 600; }

    .km-doc-totals {
      display: flex; justify-content: flex-end; margin-top: 4px;
    }
    .km-doc-totals-inner { width: 240px; }
    .km-doc-totals-inner .row {
      display: flex; justify-content: space-between;
      padding: 4px 0; font-size: 13px;
    }
    .km-doc-totals-inner .row .label  { color: #6b7280; }
    .km-doc-totals-inner .row .green  { color: #15803d; }
    .km-doc-totals-inner .row .red    { color: #dc2626; font-weight: 600; }
    .km-doc-totals-inner .row-total {
      font-weight: 700; font-size: 16px;
      border-top: 2px solid #111; padding-top: 8px; margin-top: 4px;
    }
    .km-doc-notes {
      margin-top: 16px; padding: 12px 16px;
      background: #f9fafb; border-radius: 6px; font-size: 12px;
    }
    .km-doc-notes .notes-label {
      font-size: 10px; text-transform: uppercase;
      color: #6b7280; margin-bottom: 4px;
    }
    .km-doc-footer {
      margin-top: 32px; padding-top: 14px;
      border-top: 1px solid #e5e7eb;
      text-align: center; font-size: 11px; color: #9ca3af;
    }
    .km-doc-footer p { margin: 2px 0; }

    /* ──────────────────────────── PRINT MEDIA ──────────────────────────── */
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 8mm; }
    }
  `;
}
