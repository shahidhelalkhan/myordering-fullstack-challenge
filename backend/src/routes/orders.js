"use strict";

/**
 * POST /api/orders  -> 201 with the created order
 *
 * ============================================================================
 *  YOUR JOB. This is a stub. Implement it against API_SPEC.md "POST /orders".
 * ============================================================================
 *
 * Summary of what it must do (the spec is authoritative):
 *
 *  1. Validate the body. First failure wins, in this order:
 *       - not an object / items missing or empty / item missing fields /
 *         quantity not a positive integer      -> 422 INVALID_ORDER
 *       - a productId does not exist            -> 422 PRODUCT_NOT_FOUND
 *       - quantity > current stock              -> 422 INSUFFICIENT_STOCK
 *       - couponCode present but not valid      -> 422 INVALID_COUPON
 *     On any failure: no order created, no stock changed.
 *
 *  2. On success:
 *       - decrement stock (store.commitStock)
 *       - subtotalCents = sum(priceCents * quantity)
 *       - discountCents = valid coupon ? round-half-up(10% of subtotal) : 0
 *       - totalCents    = subtotalCents - discountCents
 *       - persist via store.saveOrder, respond 201 with the spec shape
 *
 * `couponValidator.isValid(code)` returns a Promise<boolean> and already
 * enforces BOTH the length rule and the "2 of 3 files" rule.
 *
 * Repeated productId in items: treat as additive. Document how you represent it
 * in the response (DECISIONS.md).
 */

const express = require("express");
const { ok,ApiError, wrap } = require("../lib/apiResponse");
const invalid = (message, details) =>
  new ApiError(422, "INVALID_ORDER", message, details);


function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function parseBody(body) {
  if (!isPlainObject(body)) throw invalid("Request body must be a JSON object");

  const { items } = body;
  if (!Array.isArray(items) || items.length === 0) {
    throw invalid("items must be a non-empty array");
  }

  const merged = new Map();
  items.forEach((item, index) => {
    if (!isPlainObject(item)) throw invalid("Each item must be an object", { index });
    const { productId, quantity } = item;
    if (typeof productId !== "string" || productId === "") {
      throw invalid("productId must be a non-empty string", { index });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw invalid("quantity must be an integer >= 1", { index });
    }
    merged.set(productId, (merged.get(productId) || 0) + quantity);
  });

  let couponCode = null;
  if (body.couponCode !== undefined && body.couponCode !== null) {
    if (typeof body.couponCode !== "string" || body.couponCode === "") {
      throw invalid("couponCode must be a non-empty string when provided");
    }
    couponCode = body.couponCode;
  }

  const lines = [...merged].map(([productId, quantity]) => ({ productId, quantity }));
  return { lines , couponCode };
}
function resolveLines(store, lines) {
  const resolved = lines.map(({ productId, quantity }) => {
    const product = store.getProduct(productId);
    if (!product) {
      throw new ApiError(422, "PRODUCT_NOT_FOUND", `No product with id "${productId}"`, {
        productId,
      });
    }
    return { product, quantity };
  });

  for (const { product, quantity } of resolved) {
    if (quantity > product.stock) {
      throw new ApiError(
        422,
        "INSUFFICIENT_STOCK",
        `Only ${product.stock} of "${product.name}" available`,
        { productId: product.id, available: product.stock }
      );
    }
  }
  return resolved;
}
function tenPercentHalfUp(subtotalCents) {
  return Math.floor((subtotalCents + 5) / 10);
}
module.exports = function orderRoutes({ store, couponValidator }) {
  const router = express.Router();

  // `wrap` forwards async errors to the Express error handler — keep it.
  router.post(
    "/",
    wrap(async (req, res) => {
      const { lines, couponCode } = parseBody(req.body);
      resolveLines(store, lines);

      let couponApplied = false;
      if (couponCode !== null) {
        if (!(await couponValidator.isValid(couponCode))) {
          throw new ApiError(422, "INVALID_COUPON", `Coupon "${couponCode}" is not valid`, {
            couponCode,
          });
        }
        couponApplied = true;
      }
    

      const resolved = resolveLines(store, lines);
      store.commitStock(lines);

      const items = resolved.map(({ product, quantity }) => ({
        productId: product.id,
        name: product.name,
        priceCents: product.priceCents,
        quantity,
        lineTotalCents: product.priceCents * quantity,
      }));
      const subtotalCents = items.reduce((n, i) => n + i.lineTotalCents, 0);
      const discountCents = couponApplied ? tenPercentHalfUp(subtotalCents) : 0;

      const order = store.saveOrder({
        createdAt: new Date().toISOString(),
        items,
        couponCode,
        couponApplied,
        subtotalCents,
        discountCents,
        totalCents: subtotalCents - discountCents,
      });

      ok(res, order, 201);
    })
  );

  return router;
};
