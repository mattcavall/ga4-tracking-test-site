# Prompt for AI Developer Agent: GA4 Promotion Test Site

## ROLE

You are an autonomous front-end developer agent. Build the project below exactly as written. Do not ask questions. When a detail is ambiguous, follow the literal text and record the assumption in `README.md` under ASSUMPTIONS. Use no frameworks, no build tools and no external libraries. Add no features beyond this specification.

## PURPOSE

A static test site for GA4 promotion tracking.

- Test A sends one batched `view_promotion` event with several items.
- Test B sends one `view_promotion` event per banner.
- A shared funnel tests promotion attribution through to purchase.

A human configures GTM and GA4 later. A Playwright script drives the site later. You build the site and the dataLayer pushes only.

## FILES

- `index.html`
- `batched.html`
- `separate.html`
- `shop.html`
- `cart.html`
- `checkout.html`
- `shared.js`
- `README.md`

Each page loads `shared.js` with a plain script tag and carries its own inline CSS. Comment the code heavily.

## CONFIG

Plain object at the top of `shared.js`.

| Key | Value |
| --- | --- |
| GTM_ID | GTM-XXXXXXX |
| CURRENCY | EUR |
| LOCATION_ID | ChIJIQBpAG2ahYAR_6128GcTUEo |
| EVENT_VIEW | view_promotion |
| EVENT_SELECT | select_promotion |
| CARRY_MODE | both (values: event, item, both) |
| CARRY_CREATIVE | true |
| CUSTOM_ITEM_PARAMS | true |
| RUN_ID_ENABLED | true |
| VISIBILITY_THRESHOLD | 0.5 |
| REDIRECT_FALLBACK_MS | 500 |
| PLACEHOLDER | promotion_id `no_promo`, promotion_name `No Promotion`, creative_name `no_creative`, creative_slot `no_slot` |

## URL PARAMETERS

Each value persists in sessionStorage after first use.

| Parameter | Behaviour |
| --- | --- |
| `debug=1` | Shows the debug panel. |
| `reset=1` | Clears sessionStorage, then the page continues. |
| `run=ID` | Sets `test_run_id`. Default value: `manual`. |
| `eventLevel=first\|multi\|joined` | Default `first`. Only `batched.html` reads this. |
| `carry=event\|item\|both` | Overrides CARRY_MODE. |
| `creative=on\|off` | Overrides CARRY_CREATIVE. |

## DATA MODEL

### Banner generator

Inputs: approach `A` (batch or sep), fold `F` (atf or btf), number `N` (1 to 3).

| Field | Rule |
| --- | --- |
| promotion_id | `A-F-N`, for example `batch-atf-1` |
| promotion_name | `Approach Fold Promo N`, for example `Batch ATF Promo 1` (Approach is Batch or Sep, Fold is uppercase) |
| creative_name | `A_F_creative_N` |
| creative_slot | `A_F_slot_N` |
| item_id | `SKU-A-F-N` in uppercase, for example `SKU-BATCH-ATF-1` |
| item_name | `Approach Fold Item N` |
| item_list_id | `A_F_list` |
| item_list_name | `Approach Fold List` |
| index | N minus 1 |
| list price L | 20 plus 10 times (N minus 1), plus 30 when F is btf |
| discount | N |
| price | L minus discount |
| quantity | 1 |
| item_variant | `green` for atf, `blue` for btf |
| coupon | `SAVEN_ITEM` |
| test_banner_set | `set1` for atf, `set2` for btf |
| test_fold | F |
| test_approach | `batched` or `separate` |

### Shop products 1 to 3

| Field | Rule |
| --- | --- |
| item_id | `SKU-SHOP-N` |
| item_name | `Shop Item N` |
| price | 25, 35, 45 |
| discount | 2, 3, 4 |
| index | N minus 1 |
| item_list_id | `shop_main` |
| item_list_name | `Shop Main` |
| item_variant | `green` |
| coupon | `SAVEN_ITEM` |
| test_banner_set | `none` |
| test_fold | `none` |
| test_approach | stored test_variant, or `none` |

### Constant item fields (every item)

- affiliation: `Test Store`
- item_brand: `TestBrand`
- item_category: `Apparel`
- item_category2: `Adult`
- item_category3: `Shirts`
- item_category4: `Crew`
- item_category5: `Short sleeve`
- location_id: from CONFIG
- google_business_vertical: `retail`

### Item object key order

`item_id`, `item_name`, `affiliation`, `coupon`, `discount`, `index`, `item_brand`, `item_category`, `item_category2`, `item_category3`, `item_category4`, `item_category5`, `item_list_id`, `item_list_name`, `item_variant`, `location_id`, `price`, `quantity`, `google_business_vertical`, `creative_name`, `creative_slot`, `promotion_id`, `promotion_name`, `test_banner_set`, `test_fold`, `test_approach`

- The three `test_` keys appear only when CUSTOM_ITEM_PARAMS is true.
- Numbers are JSON numbers rounded to two decimals, never strings.

## EVENT-LEVEL FIELDS

All values are non-empty. `test_run_id` is added to every ecommerce push when RUN_ID_ENABLED is true.

| Event | Fields |
| --- | --- |
| view_promotion, select_promotion | creative_name, creative_slot, promotion_id, promotion_name, location_id, currency, items |
| view_item_list | item_list_id (`shop_main`), item_list_name (`Shop Main`), items |
| view_item, add_to_cart, view_cart, remove_from_cart | currency, value, items |
| begin_checkout | currency, value, coupon, items |
| add_shipping_info | currency, value, coupon, shipping_tier (`Ground`), items |
| add_payment_info | currency, value, coupon, payment_type (`Credit Card`), items |
| purchase | currency, value, transaction_id, coupon, shipping (3.33), tax (1.11), customer_type (`new`), items |

- `value` is the sum of price times quantity over items, rounded to two decimals.
- Event-level coupon is `ORDER_SAVE10`.

## PUSH HELPER

Single writer of ecommerce pushes. `push(eventName, eventLevelFields, items, extras)` performs these steps in order:

1. Build the ecommerce object from eventLevelFields, test_run_id and items.
2. For funnel events, apply carry-forward (see CARRY-FORWARD).
3. Validate every event-level and item-level value recursively. A value must be a non-empty string or a finite number. The only permitted absences are fields omitted by the carry and creative switches. On failure, log `console.error` and mark the push red in the debug panel. Push anyway.
4. Run `dataLayer.push({ ecommerce: null })`, then `dataLayer.push({ event: eventName, ecommerce: object, ...extras })`.
5. Append a deep copy to `window.__pushes`. Set body attribute `data-last-event` to eventName. Refresh the debug panel.

Never write ecommerce data to the dataLayer anywhere else. Never use a `promotions` key.

## GLOBAL PAGE RULES

- Place the GTM snippet with GTM_ID in the head and the noscript iframe after the opening body tag. Add a comment telling me where to replace the ID.
- Before the GTM snippet, create `window.dataLayer` and push `{ page_type, test_variant }`.
  - page_type: `home`, `batched`, `separate`, `shop`, `cart` or `checkout`.
  - test_variant: `none`, `batched` or `separate` (stored value on funnel pages).
- Never push `page_view`.
- Add a link with testid `link-home` on every page except `index.html`.
- Debug panel (only with `debug=1`): fixed box listing every push as JSON, red border for invalid pushes, plus active_promo and the current carry and eventLevel modes.

## PAGES

### index.html (page_type home)

Heading, one sentence, two buttons:

- "Test A: Batched" (testid `btn-test-a`, goes to `batched.html`)
- "Test B: Separate" (testid `btn-test-b`, goes to `separate.html`)

No ecommerce events.

### batched.html (test_variant batched)

Layout in order:

1. header (height at most 100px)
2. `set-batch-atf` (three banners, each 160px high, one row on desktop, stacked with 12px gaps below 700px width)
3. `spacer-fold` (height 150vh)
4. `set-batch-btf` (three banners)

Each banner is an anchor element showing promotion_name and promotion_id.

On load: one `view_promotion` with the three set1 items. Event-level promotion fields follow `eventLevel`:

- `first`: the four promotion values of banner 1 of the set sent.
- `multi`: promotion_id `batch_multi`, promotion_name `Batch Multi Promo`, creative_name `batch_multi_creative`, creative_slot `batch_multi_slot`.
- `joined`: the three banners' values joined with commas, per field.

When `set-batch-btf` is 50 percent visible (IntersectionObserver, VISIBILITY_THRESHOLD): one `view_promotion` with the three set2 items, same eventLevel logic. Fire once per page load. Use a guard flag.

### separate.html (test_variant separate)

Same layout and generator with approach `sep`.

- On load: three `view_promotion` events, one per set1 banner. Each event has event-level promotion fields equal to the banner values and an items array with one item.
- For set2: observe each banner. When 50 percent visible, push its `view_promotion` once per page load.

### Banner click (both pages, same structure)

1. On click, call `preventDefault`, then push `select_promotion`. Event-level fields come from the clicked banner. The items array holds one item. Include `eventCallback` and `eventTimeout` in extras.
2. Save `active_promo` in sessionStorage: promotion_id, promotion_name, creative_name, creative_slot, test_variant. Overwrite on every click.
3. Redirect to `shop.html` when eventCallback runs or after REDIRECT_FALLBACK_MS, whichever comes first. Redirect once. Set body `data-redirected` to `true` before redirecting. The fallback must work with the placeholder GTM ID.

### Funnel pages

**shop.html (page_type shop)**

- On load push `view_item_list` with the three products.
- Each product card has a View button (`btn-view-N`, pushes `view_item` with that product) and an Add to cart button (`btn-add-N`, pushes `add_to_cart` with quantity 1 and stores the line in the sessionStorage cart).
- Link to `cart.html` (`link-cart`).

**cart.html (page_type cart)**

- On load push `view_cart` with all cart lines.
- Each line (`cart-line-N`) has a Remove button (`btn-remove-N`) pushing `remove_from_cart` for that item and deleting the line.
- Link to `checkout.html` (`link-checkout`).
- With an empty cart, show a message and push nothing. Push `view_cart` only when at least one line exists.

**checkout.html (page_type checkout)**

- On load push `begin_checkout`.
- `btn-add-shipping` pushes `add_shipping_info`.
- `btn-add-payment` pushes `add_payment_info`.
- `btn-place-order` pushes `purchase` with transaction_id `T_` plus current timestamp plus a four-digit random number.
- After the purchase push, clear cart and active_promo, then redirect to `index.html` with the same callback and fallback logic as banner clicks.

## CARRY-FORWARD

Funnel events only: `view_item_list`, `view_item`, `add_to_cart`, `view_cart`, `remove_from_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase`.

Source values: `active_promo` when present, otherwise PLACEHOLDER values.

Apply by carry mode:

- `event`: promotion_id and promotion_name at event level only.
- `item`: the same two on every item only.
- `both`: both levels (default).

When creative is on, also apply creative_name and creative_slot at the same levels. When creative is off, omit creative_name and creative_slot. Omitted fields from these two switches are the only permitted absences.

## AUTOMATION MARKUP

Every interactive element and section gets a `data-testid` and an `id` with the same value. Use lowercase words with hyphens. Add `aria-label` equal to the visible text on every button and link.

| Page | Test IDs |
| --- | --- |
| index | `page-index`, `btn-test-a`, `btn-test-b` |
| batched | `page-batched`, `set-batch-atf`, `set-batch-btf`, `spacer-fold`, `banner-batch-atf-1` to `3`, `banner-batch-btf-1` to `3` |
| separate | `page-separate`, `set-sep-atf`, `set-sep-btf`, `spacer-fold`, `banner-sep-atf-1` to `3`, `banner-sep-btf-1` to `3` |
| shop | `page-shop`, `product-1` to `3`, `btn-view-1` to `3`, `btn-add-1` to `3`, `link-cart` |
| cart | `page-cart`, `cart-line-1` to `3`, `btn-remove-1` to `3`, `link-checkout` |
| checkout | `page-checkout`, `btn-add-shipping`, `btn-add-payment`, `btn-place-order` |
| all except index | `link-home` |

Data attributes:

- Banners: `data-promotion-id`, `data-promotion-name`, `data-creative-name`, `data-creative-slot`, `data-item-id`, `data-fold`.
- Products and cart lines: `data-item-id`, `data-price`, `data-qty`.

Body state markers:

- `data-ready`: `false` until the GTM snippet and observers are in place, then `true`.
- `data-step`: `step-1-home`, `step-2-test-page`, `step-3-shop`, `step-4-cart`, `step-5-checkout`.
- `data-fold-set2-fired`: `true` after set 2 fires.
- `data-last-event`
- `data-redirected`

`window.testApi`:

- `getPushes()` returns all pushes as JSON.
- `getCounts()` returns event name counts.
- `getPromoSummary()` returns promotion IDs per event with level (item or event).
- `validate()` returns the list of invalid pushes.
- `reset()` clears sessionStorage.

## STABILITY RULES

- No popups, alerts, dialogs, cookie banners or modals.
- No animations or transitions. Honour `prefers-reduced-motion`.
- No timers other than the redirect fallback.
- Banners and buttons never move, hide or change after load.
- Set 2 stays below the first screen at 1366x768 and 390x844.

## EXAMPLE PUSH

`batched.html`, set 1, `eventLevel=first`:

```json
{
  "event": "view_promotion",
  "ecommerce": {
    "creative_name": "batch_atf_creative_1",
    "creative_slot": "batch_atf_slot_1",
    "promotion_id": "batch-atf-1",
    "promotion_name": "Batch ATF Promo 1",
    "location_id": "ChIJIQBpAG2ahYAR_6128GcTUEo",
    "currency": "EUR",
    "test_run_id": "manual",
    "items": [
      {
        "item_id": "SKU-BATCH-ATF-1",
        "item_name": "Batch ATF Item 1",
        "affiliation": "Test Store",
        "coupon": "SAVE1_ITEM",
        "discount": 1,
        "index": 0,
        "item_brand": "TestBrand",
        "item_category": "Apparel",
        "item_category2": "Adult",
        "item_category3": "Shirts",
        "item_category4": "Crew",
        "item_category5": "Short sleeve",
        "item_list_id": "batch_atf_list",
        "item_list_name": "Batch ATF List",
        "item_variant": "green",
        "location_id": "ChIJIQBpAG2ahYAR_6128GcTUEo",
        "price": 19,
        "quantity": 1,
        "google_business_vertical": "retail",
        "creative_name": "batch_atf_creative_1",
        "creative_slot": "batch_atf_slot_1",
        "promotion_id": "batch-atf-1",
        "promotion_name": "Batch ATF Promo 1",
        "test_banner_set": "set1",
        "test_fold": "atf",
        "test_approach": "batched"
      }
    ]
  }
}
```

Items 2 and 3 follow the same shape, built from the generator with N equal to 2 and 3.

## SELF-CHECK

Run before finishing.

If a headless browser is available, serve the folder with `python3 -m http.server 8000` and run the reference journey:

1. Open `index.html`.
2. Choose Test A.
3. Scroll to the bottom.
4. Click `banner-batch-btf-2`.
5. Click `btn-view-1`.
6. Add products 1 and 2.
7. Open the cart.
8. Open checkout.
9. Click shipping, payment and place order.

Print `testApi.getCounts()` and `testApi.validate()`. Repeat for Test B.

If no browser is available, write the same steps in the README under MANUAL CHECK.

## ACCEPTANCE

Reference journey, default settings.

| Check | Test A | Test B |
| --- | --- | --- |
| view_promotion | 2 | 6 |
| select_promotion | 1 | 1 |
| view_item_list | 1 | 1 |
| view_item | 1 | 1 |
| add_to_cart | 2 | 2 |
| view_cart | 1 | 1 |
| remove_from_cart | 0 | 0 |
| begin_checkout | 1 | 1 |
| add_shipping_info | 1 | 1 |
| add_payment_info | 1 | 1 |
| purchase | 1 | 1 |
| Items inside view_promotion events | 6 | 6 |
| Clicked promotion_id on funnel events | `batch-btf-2` | `sep-btf-2` |

Also:

- `validate()` returns an empty list in both tests.
- Funnel events count 9 with event-level carry. Items count 16 with item-level carry.
- After purchase, the next `view_item_list` carries the placeholder values.
- `body data-ready` turns `true` within two seconds on every page.
- No console errors at 1366x768 and 390x844.

## README CONTENT

How to run, the journey with testids in order, URL parameters with defaults, testApi examples, ASSUMPTIONS, MANUAL CHECK when needed.

## BUILD ORDER

1. `shared.js` (config, generator, catalogue, helper, validator, debug panel, testApi, storage).
2. `batched.html` and `separate.html`.
3. `shop.html`, `cart.html`, `checkout.html`.
4. `index.html`.
5. `README.md`.
6. Self-check, fix failures, repeat.

## DELIVERABLES

All files in one folder, ready to serve.
