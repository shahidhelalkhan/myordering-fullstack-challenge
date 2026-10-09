import React from "react";
import { useProducts } from "../hooks/useProducts";
import { useCart } from "../store/cart";
import { formatCents } from "../lib/money";

/**
 * Catalogue grid. Mostly done — it shows the loading / error / list states so
 * you have a reference. You may need to touch it when you wire up "merge on
 * re-add" or disable adding past available stock.
 */
export default function ProductGrid() {
  const { data: products, isLoading, isError, error, refetch } = useProducts();
  const addLine = useCart((s) => s.addLine);
  const lines = useCart((s) => s.lines)
  const inCart = (id) => {
    const line = lines.find((l) => l.productId === id);

    if (!line) {
      return 0;
    }

    return line.quantity;
  };
  if (isLoading) {
    return <div className="asg-panel asg-muted">Loading menu…</div>;
  }

  if (isError) {
    return (
      <div className="asg-panel asg-error">
        <p>Couldn’t load the menu ({error?.message}).</p>
        <button className="asg-btn" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="asg-grid">
      {products.map((p) => (
        <article key={p.id} className="asg-card">
          <img src={p.imageUrl} alt="" className="asg-card__img" loading="lazy" />
          <div className="asg-card__body">
            <h3 className="asg-card__name">{p.name}</h3>
            <p className="asg-card__desc">{p.description}</p>
            <div className="asg-card__foot">
              <span className="asg-price">{formatCents(p.priceCents)}</span>
              <button
                className="asg-btn"
                disabled={p.stock <= 0 || inCart(p.id) >= p.stock}
                onClick={() => addLine(p, 1)}
              >
                {p.stock <= 0 ? "Sold out" : inCart(p.id) >= p.stock ? "Max in cart" : "Add"}
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
