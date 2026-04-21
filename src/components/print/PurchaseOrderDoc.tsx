/**
 * PurchaseOrderDoc — A4 purchase order document template.
 *
 * Uses CSS class names from print-styles.ts (NOT Tailwind).
 * Works both as a React preview component and as printable HTML (via usePrint).
 */

export interface PODocItem {
  name: string;
  sku?: string;
  qty: number;
  receivedQty?: number;
  unitCost: number;
  total: number;
}

export interface PurchaseOrderDocData {
  poNumber: string;
  date: string;
  expectedDate?: string | null;
  supplierName?: string | null;
  supplierPhone?: string | null;
  supplierContact?: string | null;
  status?: string;
  items: PODocItem[];
  total: number;
  paidAmount?: number;
  notes?: string | null;
}

function pkr(n: number) {
  return `PKR ${n.toLocaleString("en-PK")}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(d));
}

function statusBadgeClass(status?: string) {
  if (!status) return "km-badge km-badge-blue";
  const map: Record<string, string> = {
    DRAFT:      "km-badge km-badge-yellow",
    ORDERED:    "km-badge km-badge-blue",
    PARTIAL:    "km-badge km-badge-yellow",
    RECEIVED:   "km-badge km-badge-green",
    CANCELLED:  "km-badge km-badge-red",
  };
  return map[status] ?? "km-badge km-badge-blue";
}

export function PurchaseOrderDoc(props: PurchaseOrderDocData) {
  const balance = props.total - (props.paidAmount ?? 0);
  const showReceived = props.items.some((i) => i.receivedQty !== undefined);

  return (
    <div className="km-doc">
      {/* Header */}
      <div className="km-doc-header">
        <div>
          <div className="km-company-name">🌿 KissanMall</div>
          <div className="km-tagline">kissanmall.pk | Lahore, Pakistan</div>
        </div>
        <div className="km-doc-meta">
          <div className="km-doc-title km-doc-title-purchase">PURCHASE ORDER</div>
          <div className="km-doc-number">{props.poNumber}</div>
          <div className="km-doc-date">Ordered: {fmtDate(props.date)}</div>
          {props.expectedDate && (
            <div className="km-doc-date">Expected: {fmtDate(props.expectedDate)}</div>
          )}
          {props.status && (
            <div style={{ marginTop: 6 }}>
              <span className={statusBadgeClass(props.status)}>{props.status}</span>
            </div>
          )}
        </div>
      </div>

      {/* Supplier */}
      {props.supplierName && (
        <div className="km-meta-row single">
          <div className="km-meta-box">
            <div className="label">Supplier</div>
            <div className="value">{props.supplierName}</div>
            {props.supplierPhone && <div className="sub">{props.supplierPhone}</div>}
            {props.supplierContact && (
              <div className="sub">Contact: {props.supplierContact}</div>
            )}
          </div>
        </div>
      )}

      {/* Items table */}
      <table>
        <thead>
          <tr>
            <th style={{ width: 28 }}>#</th>
            <th>Product</th>
            <th className="r">Ordered</th>
            {showReceived && <th className="r">Received</th>}
            <th className="r">Unit Cost</th>
            <th className="r">Total</th>
          </tr>
        </thead>
        <tbody>
          {props.items.map((item, i) => {
            const pending = showReceived ? item.qty - (item.receivedQty ?? 0) : 0;
            return (
              <tr key={i}>
                <td className="muted">{i + 1}</td>
                <td>
                  <div>{item.name}</div>
                  {item.sku && <div className="muted">{item.sku}</div>}
                </td>
                <td className="r">{item.qty}</td>
                {showReceived && (
                  <td className="r">
                    <span className="green">{item.receivedQty ?? 0}</span>
                    {pending > 0 && (
                      <span style={{ color: "#f59e0b", marginLeft: 4, fontSize: 11 }}>
                        ({pending} pending)
                      </span>
                    )}
                  </td>
                )}
                <td className="r">{pkr(item.unitCost)}</td>
                <td className="r strong">{pkr(item.total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="km-doc-totals">
        <div className="km-doc-totals-inner">
          {props.paidAmount !== undefined && (
            <div className="row">
              <span className="label">Paid</span>
              <span className="green">{pkr(props.paidAmount)}</span>
            </div>
          )}
          <div className="row row-total">
            <span>Total</span><span>{pkr(props.total)}</span>
          </div>
          {balance > 0 && (
            <div className="row">
              <span>Balance Due</span><span className="red">{pkr(balance)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {props.notes && (
        <div className="km-doc-notes">
          <div className="notes-label">Notes</div>
          <div>{props.notes}</div>
        </div>
      )}

      <div className="km-doc-footer">
        <p>KissanMall — Fresh From Farm To You</p>
        <p>kissanmall.pk | Lahore, Pakistan</p>
        <p style={{ marginTop: 6 }}>Authorized Purchase Order</p>
      </div>
    </div>
  );
}
