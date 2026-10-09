import React, { useState } from "react";
import ProductGrid from "../components/ProductGrid";
import CartPanel from "../components/CartPanel";
import CouponField from "../components/CouponField";
import OrderSummary from "../components/OrderSummary";
import { useCart, selectCount } from "../store/cart";
import { usePlaceOrder } from "../hooks/usePlaceOrder";
import { buildOrderPayload } from "../hooks/usePlaceOrder";
import { getErrorMessage } from "../lib/errorMessages";

/**
 * The ordering screen. This composes the pieces; the interesting wiring is
 * yours:
 *
 *  - turn the cart lines into the POST /orders payload
 *  - run usePlaceOrder(); on success show <OrderSummary/> and clear the cart
 *  - feed the coupon code in, and route the INVALID_COUPON error back to
 *    <CouponField/> as a rejection reason
 *  - disable "Place order" when the cart is empty or a request is in flight
 *  - surface INSUFFICIENT_STOCK / NETWORK errors somewhere visible
 *
 * Layout: menu on the left, order on the right; single column on narrow
 * screens. Styling hooks are in styles/assignment.css (asg- prefix).
 */
export default function Assignment() {
  const count = useCart(selectCount);
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);

  const [coupon, setCoupon] = useState("");
  const [order, setOrder] = useState(null);
  const placeOrder = usePlaceOrder();

  const { error, isLoading } = placeOrder;
  const couponRejected = Boolean(error && error.code === "INVALID_COUPON");
 

  let couponStatus = { state: "idle" };
  if (isLoading && coupon.trim()) {
    couponStatus = { state: "pending" };
  } else if (couponRejected) {
    couponStatus = {
      state: "rejected",
      message: `“${(error.details && error.details.couponCode) || coupon}” isn’t a valid promo code.`,
    };
  }

 
  // TODO: build payload from `lines` (+ coupon) and call placeOrder.mutate(...)
  const onCouponChange = (value) => {
    setCoupon(value);
    if (couponRejected) placeOrder.reset(); 
  };

  const onPlaceOrder = () => {
    placeOrder.mutate(buildOrderPayload(lines, coupon), {
      onSuccess: (created) => {
        setOrder(created);
        clear();
      },
    });
  };

   const onDone = () => {
    setOrder(null);
    setCoupon("");
    placeOrder.reset();
  };

  return (
    <div className="asg-root">
      <header className="asg-header">
        <h1>myordering</h1>
        <span className="asg-cart-count">{count} in cart</span>
      </header>

      <main className="asg-layout">
        <section className="asg-col asg-col--menu">
          <h2 className="asg-panel__title">Menu</h2>
          <ProductGrid />
        </section>

        <aside className="asg-col asg-col--order">
          {order ? (
            <OrderSummary order={order} onDone={onDone} />
          ) : (
            <>
              <CartPanel disabled={isLoading} />
              <CouponField value={coupon} onChange={onCouponChange} status={couponStatus}/>
              <button
                className="asg-btn asg-btn--primary"
                disabled={lines.length === 0 || isLoading}
                onClick={onPlaceOrder}
              >
                {isLoading ? "Placing order…" : "Place order"}
              </button>
              {error  && !couponRejected && (
                <p className="asg-panel asg-error" role="alert">
                  {getErrorMessage(error)}
                </p>
              )}
            </>
          )}
        </aside>
      </main>
    </div>
  );
}
