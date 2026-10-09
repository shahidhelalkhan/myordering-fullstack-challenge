import React from "react";

/**
 * ============================================================================
 *  YOUR JOB. Promo-code input.
 * ============================================================================
 *
 * The API has no "check coupon" endpoint — a code is only judged when an order
 * is placed (POST /orders → 422 INVALID_COUPON if bad). Decide how to give the
 * user feedback:
 *   - lift the entered code up to the screen and let the order response drive
 *     "accepted / rejected", or
 *   - some other approach you can justify
 *
 * Show: the input, a pending state while an order attempt is in flight, a clear
 * "applied" state, and the reason when a code was rejected.
 *
 * Props are yours to design. `onChange(code)` lifting the value up is the
 * minimum.
 */
export default function CouponField({ value, onChange, status = { state: "idle" } }) {
  const rejected = status.state === "rejected";
  return (
    <div className="asg-coupon">
      <label className="asg-label" htmlFor="coupon">
        Promo code
      </label>
      <input
        id="coupon"
        className="asg-input"
        value={value || ""}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder="e.g. HAPPYHRS"
        autoComplete="off"
        disabled={status.state === "pending"}
        aria-invalid={rejected}
        aria-describedby="coupon-msg"
      />
      {/* TODO: reflect `status` — idle / pending / applied / rejected(reason) */}
       <p
        id="coupon-msg"
        role={rejected ? "alert" : undefined}
        className={rejected ? "asg-err" : "asg-muted"}
      >
        {status.state === "pending" && "Checking code…"}
        {rejected && status.message}
        {status.state === "idle" &&
          (value ? "Checked when you place the order." : "Optional — 10% off.")}
      </p>
    </div>
  );
}
