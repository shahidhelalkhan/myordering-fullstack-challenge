import React from "react";
import { useCart, selectSubtotalCents } from "../store/cart";
import { formatCents } from "../lib/money";
import { useProducts } from "../hooks/useProducts";

/**
 * ============================================================================
 *  YOUR JOB. Render the cart.
 * ============================================================================
 *
 *  - one row per line: name, unit price, a quantity control (+ / −, or an
 *    input), line total, a remove button
 *  - subtotal at the bottom (use the `selectSubtotalCents` selector once you
 *    have implemented it)
 *  - empty state when there are no lines
 *  - quantity changes go through `setQuantity` on the store
 *
 * Keep it a controlled, predictable component — no local copy of the cart.
 */
export default function CartPanel() {
  const { data: products } = useProducts();
  const lines = useCart((s) => s.lines);
  const subtotalCents = useCart(selectSubtotalCents);
  const setQuantity = useCart((s) => s.setQuantity);
  const removeLine = useCart((s) => s.removeLine);

  const getStock = (id) => {
    const product = products?.find((p) => p.id === id);

    if (!product) {
      return 0;
    }

    return product.stock;
  };

  return (
    <div className="asg-panel">
      <h2 className="asg-panel__title">Your order</h2>
      {lines.length === 0 ? (
        <p className="asg-muted">Your cart is empty. Add something from the menu.</p>
      ) : (
        <>
          <ul className="asg-lines">
            {lines.map((l) => (
              <li key={l.productId} className="asg-line flex">
                <div className="asg-line__info">
                  <span className="asg-line__name">{l.name}</span>
                  <span className="asg-muted">{formatCents(l.priceCents)} each</span>
                </div>
                <div className="asg-qty">
                  <button
                    className="asg-btn"
                    aria-label={`Decrease ${l.name}`}
                    onClick={() => setQuantity(l.productId, l.quantity - 1)}

                  >
                    −
                  </button>
                  <span className="asg-qty__n" aria-label={`${l.name} quantity`}>
                    {l.quantity}
                  </span>
                  <button
                    className="asg-btn"
                    aria-label={`Increase ${l.name}`}
                    onClick={() => setQuantity(l.productId, l.quantity + 1)}
                    disabled={l.quantity >= getStock(l.productId)}
                  >
                    +
                  </button>
                </div>
                <span className="asg-line__total">
                  {formatCents(l.priceCents * l.quantity)}
                </span>
                <button
                  className="asg-btn"
                  aria-label={`Remove ${l.name}`}
                  onClick={() => removeLine(l.productId)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="asg-total-row">
            <span>Subtotal</span>
            <strong data-testid="subtotal">{formatCents(subtotalCents)}</strong>
          </div>
        </>
      )}
    </div>
  );
}
