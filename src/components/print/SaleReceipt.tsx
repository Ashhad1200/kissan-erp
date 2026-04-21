/**
 * SaleReceipt — reusable receipt template for POS sales and invoices.
 *
 * Uses CSS class names from print-styles.ts (NOT Tailwind).
 * Works both as a React preview component and as printable HTML (via usePrint).
 *
 * Variants:
 *   "thermal" — narrow 80mm POS receipt
 *   "invoice" — full A4 invoice
 */

export interface SaleReceiptItem {
  name: string;
  sku?: string;
  qty: number;
  unitPrice: number;
  discount?: number;
  total: number;
}

export interface SaleReceiptData {
  orderNumber: string;
  date: string;
  channel?: string;
  customerName?: string;
  items: SaleReceiptItem[];
  subtotal: number;
  discount?: number;
  total: number;
  paidAmount?: number;
  paymentMethod?: string;
  notes?: string;
  variant?: "thermal" | "invoice";
}

function pkr(n: number) {
  return `PKR ${n.toLocaleString("en-PK")}`;
}

function fmtDate(d: string) {
  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(d));
}

function fmtDateShort(d: string) {
  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(d));
}

/** Thermal 80mm POS receipt */
function ThermalReceipt({ data }: { data: Omit<SaleReceiptData, "variant"> }) {
  const change = (data.paidAmount ?? 0) > data.total ? (data.paidAmount! - data.total) : 0;
  return (
    <div className="km-thermal">
      <div className="km-thermal-header">
        <div className="km-company-name">🌿 KissanMall</div>
        <div className="km-tagline">Fresh From Farm To You</div>
        <div className="km-tagline">kissanmall.pk</div>
        <hr className="km-divider-dashed" />
        <div className="km-order-num">{data.orderNumber}</div>
        <div className="km-order-meta">{fmtDate(data.date)}</div>
        {data.customerName && (
          <div className="km-order-meta">Customer: {data.customerName}</div>
        )}
      </div>

      <hr className="km-divider-dashed" />

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th className="td-qty">Qty</th>
            <th className="td-price">Amt</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, i) => (
            <tr key={i}>
              <td>{item.name}</td>
              <td className="td-qty">{item.qty}</td>
              <td className="td-price">{pkr(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="km-thermal-totals">
        <div className="row"><span>Subtotal</span><span>{pkr(data.subtotal)}</span></div>
        {(data.discount ?? 0) > 0 && (
          <div className="row row-discount">
            <span>Discount</span><span>-{pkr(data.discount!)}</span>
          </div>
        )}
        <div className="row row-total"><span>TOTAL</span><span>{pkr(data.total)}</span></div>
        {data.paidAmount !== undefined && (
          <div className="row"><span>Paid</span><span>{pkr(data.paidAmount)}</span></div>
        )}
        {change > 0 && (
          <div className="row row-change"><span>Change</span><span>{pkr(change)}</span></div>
        )}
      </div>

      {data.paymentMethod && (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <span className="km-badge km-badge-green">{data.paymentMethod}</span>
        </div>
      )}

      <div className="km-thermal-footer">
        <p>Thank you for shopping with us!</p>
        <p>KissanMall — Lahore, Pakistan</p>
        <p>kissanmall.pk</p>
      </div>
    </div>
  );
}

/** Full A4 invoice */
function InvoiceReceipt({ data }: { data: Omit<SaleReceiptData, "variant"> }) {
  const balance = data.total - (data.paidAmount ?? data.total);
  const hasDiscount = data.items.some((i) => (i.discount ?? 0) > 0);

  return (
    <div className="km-doc">
      {/* Header */}
      <div className="km-doc-header">
        <div>
          <div className="km-company-name">🌿 KissanMall</div>
          <div className="km-tagline">kissanmall.pk | Lahore, Pakistan</div>
        </div>
        <div className="km-doc-meta">
          <div className="km-doc-title km-doc-title-sale">INVOICE</div>
          <div className="km-doc-number">{data.orderNumber}</div>
          <div className="km-doc-date">{fmtDateShort(data.date)}</div>
          {data.channel && (
            <div className="km-doc-date">
              {data.channel === "SHOPIFY" ? "Shopify Order" : "Physical Store"}
            </div>
          )}
        </div>
      </div>

      {/* Bill To */}
      {data.customerName && (
        <div className="km-meta-row single">
          <div className="km-meta-box">
            <div className="label">Bill To</div>
            <div className="value">{data.customerName}</div>
          </div>
        </div>
      )}

      {/* Items */}
      <table>
        <thead>
          <tr>
            <th style={{ width: 28 }}>#</th>
            <th>Product</th>
            <th className="r">Qty</th>
            <th className="r">Unit Price</th>
            {hasDiscount && <th className="r">Discount</th>}
            <th className="r">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, i) => (
            <tr key={i}>
              <td className="muted">{i + 1}</td>
              <td>
                <div>{item.name}</div>
                {item.sku && <div className="muted">{item.sku}</div>}
              </td>
              <td className="r">{item.qty}</td>
              <td className="r">{pkr(item.unitPrice)}</td>
              {hasDiscount && (
                <td className="r" style={{ color: "#dc2626" }}>
                  {(item.discount ?? 0) > 0 ? `-${pkr(item.discount!)}` : "—"}
                </td>
              )}
              <td className="r strong">{pkr(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="km-doc-totals">
        <div className="km-doc-totals-inner">
          <div className="row">
            <span className="label">Subtotal</span><span>{pkr(data.subtotal)}</span>
          </div>
          {(data.discount ?? 0) > 0 && (
            <div className="row">
              <span className="label">Discount</span>
              <span className="red">-{pkr(data.discount!)}</span>
            </div>
          )}
          {data.paidAmount !== undefined && (
            <div className="row">
              <span className="label">Paid</span>
              <span className="green">{pkr(data.paidAmount)}</span>
            </div>
          )}
          <div className="row row-total">
            <span>Total</span><span>{pkr(data.total)}</span>
          </div>
          {balance > 0 && (
            <div className="row">
              <span>Balance Due</span><span className="red">{pkr(balance)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {data.notes && (
        <div className="km-doc-notes">
          <div className="notes-label">Notes</div>
          <div>{data.notes}</div>
        </div>
      )}

      <div className="km-doc-footer">
        <p>KissanMall — Fresh From Farm To You</p>
        <p>kissanmall.pk | Lahore, Pakistan</p>
        <p style={{ marginTop: 6 }}>Thank you for your business!</p>
      </div>
    </div>
  );
}

/** Exported component — wrap in a div with ref={printRef} for usePrint */
export function SaleReceipt(props: SaleReceiptData) {
  const { variant = "thermal", ...data } = props;
  return variant === "invoice"
    ? <InvoiceReceipt data={data} />
    : <ThermalReceipt data={data} />;
}
