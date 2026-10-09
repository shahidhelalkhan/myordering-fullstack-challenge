const ERROR_MESSAGES = {
    NETWORK: "Can’t reach the server. Check your connection and try again.",
    INSUFFICIENT_STOCK: (err) => `${err.message}. Adjust your cart and try again.`,
    PRODUCT_NOT_FOUND: "An item in your cart is no longer on the menu. Remove it and try again.",
};

export function getErrorMessage(err) {
    const msg = ERROR_MESSAGES[err.code];
    if (typeof msg === "function") return msg(err);
    return msg || err.message || "Something went wrong placing your order.";
}