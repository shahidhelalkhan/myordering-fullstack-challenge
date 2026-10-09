# Decisions

## Promo-code engine

**Approach.** I used one Bloom filter per coupon file, so three in total. Each one is a 32 MB bit array and every code sets 7 bits in it. When the server starts, it reads each file line by line and adds the codes that are 8 to 10 characters long to that file's filter. A coupon is accepted if it looks present in at least two of the three filters. The code is in `backend/src/coupons/validator.js`. Nothing is written to disk.

**Memory.** With the three default 200 MB files the process uses about 213 MB. That includes the filters, Node itself and the stream buffers. I measured it with `node scripts/bench-coupons.js`.

**Latency.** Once everything is loaded, `isValid()` takes about 0.006 ms at p95, since it only checks bits in memory.

**Warm-up:** I didn't build an index on disk ahead of time. The server starts taking requests right away and loads the coupon files in the background, and the filters are built in memory while that happens. For the default files this takes about 47 seconds, which is inside the 90 second limit. If an order with a coupon comes in before loading is done, it just waits until the filters are ready.

**Startup.** The server starts taking requests right away and loads the coupon files in the background. For the default files that takes about 47 seconds, which is inside the 90 second limit. If an order with a coupon comes in before loading is done, it just waits until the filters are ready.

**Accuracy.** A Bloom filter can say a coupon is there when it isn't, but it never misses one that was added. With roughly 1.5 crore codes per file, I estimate about 0.04% false positives per file. Since a code has to look present in two files, getting a wrong one through is much less likely. I accepted this because it keeps the code simple. If we ever need exact answers, we can confirm each positive by scanning the files, or store sorted hashes on disk and binary-search them.

**Scaling to 50 files.** At this size, 50 filters would take around 1.6 GB just for the filters. To cope with that I'd size each filter by the number of codes in its file, build them in parallel with worker threads, and save them to disk so restarts are faster. For really large sets I'd build one combined index that stores how many files contain each coupon, so a lookup is a single check and not one per file.

## API

**Repeated product IDs.** The spec says the same `productId` can appear more than once in `items`, and that the quantities should be added together. It leaves the response format to us, so I decided to merge repeats into a single line per product. I did this because the cart in the frontend also keeps one line per product, and a duplicate row in the order summary would only confuse the user.

The merged line takes the position of the first time the product appeared in the request. Stock is checked against the combined quantity and not against each entry separately, otherwise two small entries could each pass the check while the total is more than what we have.

For example, this request:

```json
{
  "items": [
    { "productId": "prod_cola",  "quantity": 2 },
    { "productId": "prod_pizza", "quantity": 1 },
    { "productId": "prod_cola",  "quantity": 3 }
  ]
}
```

gives one line for cola with quantity 5, followed by pizza:

```json
"items": [
  { "productId": "prod_cola",  "quantity": 5, "lineTotalCents": "5 x cola price" },
  { "productId": "prod_pizza", "quantity": 1, "lineTotalCents": "1 x pizza price" }
]
```

The stock check works the same way. If veggie has 3 in stock and the request is:

```json
{
  "items": [
    { "productId": "prod_veggie", "quantity": 2 },
    { "productId": "prod_veggie", "quantity": 2 }
  ]
}
```

each entry is fine on its own, but the total of 4 is more than 3, so the API returns `422 INSUFFICIENT_STOCK` with `details.available` set to 3. No order is created and the stock does not change.

**Validation order.** First the request format is checked, and a bad one returns `INVALID_ORDER`. After that it checks that every product exists (`PRODUCT_NOT_FOUND`), then stock (`INSUFFICIENT_STOCK`), and last the coupon.

**Concurrent orders.** The coupon check is async. Once it's done, I check stock again and commit the order with no `await` in between. This way two requests can't both buy the last item. There is a test for this.

**Discount.** The 10% is calculated as `floor((subtotal + 5) / 10)`. That rounds half up and uses only integers, so there is no floating point involved.

**Coupon field.** An empty string or a value that isn't a string for `couponCode` returns `422 INVALID_ORDER`. A `null` is treated as if no coupon was sent.

**Spec.** I haven't found anything that differs from the spec.

## Frontend

**State.** React Query handles the products and the place-order request. Products are refetched after every order attempt, successful or not, because stock may have changed. The cart lives in Zustand with persistence. The coupon code the user typed and the order shown in the summary are kept in local `useState`.

**Coupon feedback.** There's no endpoint to check a coupon before ordering, so the code is only checked when the order is submitted. While the request is running the coupon field shows a pending state. If the coupon is rejected, the reason is shown, and changing the code clears the error. When the order goes through, the summary shows the coupon and the discount, since the cart is cleared by then. The downside is that users only learn whether a code works when they place the order. A separate check endpoint would fix that, but it's outside the current API.

**Errors.** The place-order button is disabled when the cart is empty, and the controls are disabled while a request is in flight. `INSUFFICIENT_STOCK`, `PRODUCT_NOT_FOUND`, network failures and any other unexpected error show up as an alert. The Add button is disabled once the cart already holds all the available stock.

**Cart prices.** As in the skeleton, the cart keeps the name and price from the moment the item was added. The backend decides the final price, so the subtotal shown before ordering can be out of date if a price changed.

## Scope

**What I'd do next.**
Later I'd like to save an index for each file on disk, split into buckets that can be searched, and reuse it after a restart. It would be rebuilt only when a source file changes. That would make restarts quicker because the files wouldn't need to be processed again.

**Extra backend tests.**
I would also add few test cases as per the new functionality that I have not done yet due to short of time.

## Anything else

I didn't add any new dependencies.
 