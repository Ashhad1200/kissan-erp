"use client";

import { useRef, useCallback } from "react";
import { printHtml } from "@/lib/print";

/**
 * Attaches to a hidden/visible div and prints its innerHTML in a new window.
 *
 * Usage:
 *   const { ref, print } = usePrint("My Invoice");
 *   <button onClick={print}>Print</button>
 *   <div ref={ref} style={{ display: "none" }}>
 *     <SaleReceipt {...data} />
 *   </div>
 */
export function usePrint(title = "KissanMall — Print") {
  const ref = useRef<HTMLDivElement>(null);

  const print = useCallback(() => {
    if (!ref.current) return;
    printHtml(ref.current.innerHTML, title);
  }, [title]);

  return { ref, print };
}
