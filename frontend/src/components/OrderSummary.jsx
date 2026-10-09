import React from "react";
import { formatCents } from "../lib/money";

/**
 * ============================================================================
 *  YOUR JOB. Shown after a successful POST /orders.
 * ============================================================================
 *
 * Render the created order: id, line items, subtotal, discount (if any),
 * total. Give the user a way to start again (which should clear the cart).
 */
export default function OrderSummary({ order, onDone }) {
  if (!order) return null;
  return (
    <div className="asg-panel asg-ok" role="status">
      <h2 className="asg-panel__title">Order placed</h2>
      <p className="asg-muted">
        Order <code>{order.id}</code>
      </p>
      <ul className="asg-lines">
        {order.items.map((i) => (
          <li key={i.productId} className="asg-line">
            <div className="asg-line__info">
              <span className="asg-line__name">
                {i.quantity} × {i.name}
              </span>
            </div>
            <span className="asg-line__total">{formatCents(i.lineTotalCents)}</span>
          </li>
        ))}
      </ul>
      <div className="asg-total-row">
        <span>Subtotal</span>
        <span>{formatCents(order.subtotalCents)}</span>
      </div>
      {order.couponApplied && (
        <div className="asg-total-row">
          <span>Promo {order.couponCode}</span>
          <span>−{formatCents(order.discountCents)}</span>
        </div>
      )}
      <div className="asg-total-row">
        <strong>Total</strong>
        <strong data-testid="order-total">{formatCents(order.totalCents)}</strong>
      </div>
      <button className="asg-btn" onClick={onDone}>
        New order
      </button>
    </div>
  );
}
