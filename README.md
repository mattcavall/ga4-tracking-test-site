# GA4 Promotion Test Site

A static test site for Google Analytics 4 (GA4) ecommerce promotion tracking and attribution testing.

- Test A sends one batched `view_promotion` event with several items.
- Test B sends one `view_promotion` event per banner.
- A shared funnel tests promotion attribution through to purchase.

## How to Run

1. Open a terminal in this directory (`c:\Stuff\Tools\ga4-tracking-test-site`).
2. Start any local static web server, for example with Python:
   ```bash
   python -m http.server 8000
   ```
3. Open your browser and navigate to:
   ```
   http://localhost:8000/index.html
   ```

## Reference Journey (with Test IDs in Order)

### Test A: Batched Promotion Flow

1. Open `index.html` (`data-testid="page-index"`).
2. Click button `btn-test-a` (`data-testid="btn-test-a"`) -> navigates to `batched.html` (`data-testid="page-batched"`).
3. On page load: `view_promotion` fires automatically with the 3 Above The Fold (ATF) items.
4. Scroll down past `spacer-fold` (`data-testid="spacer-fold"`). When `set-batch-btf` (`data-testid="set-batch-btf"`) reaches 50% visibility, a second `view_promotion` fires with the 3 Below The Fold (BTF) items.
5. Click banner `banner-batch-btf-2` (`data-testid="banner-batch-btf-2"`):
   - Fires `select_promotion` with 1 item.
   - Sets `active_promo` in `sessionStorage` (`promotion_id: "batch-btf-2"`).
   - Redirects to `shop.html` (`data-testid="page-shop"`).
6. On page load: `view_item_list` fires with 3 shop products carrying the active promotion parameters.
7. Click `btn-view-1` (`data-testid="btn-view-1"`):
   - Fires `view_item` with product 1.
8. Click `btn-add-1` (`data-testid="btn-add-1"`):
   - Fires `add_to_cart` with product 1 (quantity 1).
   - Stores product 1 in the cart.
9. Click `btn-add-2` (`data-testid="btn-add-2"`):
   - Fires `add_to_cart` with product 2 (quantity 1).
   - Stores product 2 in the cart.
10. Click `link-cart` (`data-testid="link-cart"`) -> navigates to `cart.html` (`data-testid="page-cart"`).
11. On page load: `view_cart` fires with the 2 cart products (`cart-line-1` and `cart-line-2`).
12. Click `link-checkout` (`data-testid="link-checkout"`) -> navigates to `checkout.html` (`data-testid="page-checkout"`).
13. On page load: `begin_checkout` fires with the 2 items and order subtotal (EUR 60.00).
14. Click `btn-add-shipping` (`data-testid="btn-add-shipping"`):
    - Fires `add_shipping_info` with `shipping_tier: "Ground"`.
15. Click `btn-add-payment` (`data-testid="btn-add-payment"`):
    - Fires `add_payment_info` with `payment_type: "Credit Card"`.
16. Click `btn-place-order` (`data-testid="btn-place-order"`):
    - Fires `purchase` with generated `transaction_id`, shipping (3.33), tax (1.11), and customer_type ("new").
    - Clears `cart` and `active_promo` from `sessionStorage`.
    - Displays order confirmation message on page with transaction ID and order total (does not redirect).

### Test B: Separate Promotion Flow

Repeat the exact same journey starting from `index.html` by clicking `btn-test-b` (`data-testid="btn-test-b"`):
- `separate.html` fires 3 separate `view_promotion` events on load (one per ATF banner).
- Scrolling to BTF triggers 3 separate `view_promotion` events as each banner achieves 50% visibility.
- Clicking `banner-sep-btf-2` sets `active_promo` to `sep-btf-2` and enters the shop funnel.

## Expected Event Counts (Acceptance Criteria)

| Event Name | Test A | Test B |
|---|---|---|
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
| Total items inside view_promotion events | 6 | 6 |
| Clicked promotion_id on funnel events | batch-btf-2 | sep-btf-2 |

## URL Parameters

Parameters persist in `sessionStorage` after first use:

| Parameter | Default | Description |
|---|---|---|
| `debug=1` | (none) | Displays the fixed floating JSON debug panel on the page. |
| `reset=1` | (none) | Clears `sessionStorage` immediately, then page execution continues. |
| `run=ID` | `manual` | Sets `test_run_id` which is added to every ecommerce push. |
| `eventLevel=first\|multi\|joined` | `first` | Configures event-level promotion fields on `batched.html`. |
| `carry=event\|item\|both` | `both` | Configures promotion attribution carry-forward level. |
| `creative=on\|off` | `on` | Toggles whether `creative_name` and `creative_slot` are included. |

## window.testApi Reference

Open the browser developer console (F12) to inspect tracking status anytime:

```javascript
// Get all ecommerce pushes recorded on the current page
window.testApi.getPushes();

// Get count of pushes grouped by event name
window.testApi.getCounts();

// Get summary of all promotion IDs captured per event and level (event or item)
window.testApi.getPromoSummary();

// Validate all captured pushes against GA4 rules (returns empty array [] if valid)
window.testApi.validate();

// Clear sessionStorage and reset recorded pushes
window.testApi.reset();
```

## ASSUMPTIONS

1. **GTM Container ID**: The site is configured with container ID `GTM-KGTK8ZXX` across all pages.
2. **Fallback Redirect**: The redirect fallback timer is set to 500ms (`CONFIG.REDIRECT_FALLBACK_MS`), which guarantees smooth page transitions even when the GTM container ID is a placeholder or blocked by ad blockers.
3. **Storage Persistence**: `sessionStorage` is used to persist URL parameter overrides (`carry`, `creative`, `run`, `eventLevel`), active promotion attribution, and cart items between page navigations in the same tab.
4. **Zero External Dependencies**: The entire project uses pure vanilla HTML, vanilla CSS, and vanilla JavaScript without any external libraries or build tools.
5. **No Animations**: In strict accordance with stability rules, CSS transitions and animations are globally disabled (`transition: none !important; animation: none !important;`).
6. **Key Ordering**: All item objects strictly follow the required 26-key sequence from `item_id` to `test_approach`. Numbers are always output as finite JSON numbers rounded to two decimal places.
7. **Post-Purchase Display**: Per user instruction, the checkout page does not redirect to `index.html` after placing an order. Instead, it displays an on-page order confirmation box with transaction ID, items purchased, and order total so that the purchase event, dataLayer, and `window.testApi` can be inspected in place.

## MANUAL CHECK

To manually verify the complete flow if a test runner is not active:

1. Open `http://localhost:8000/index.html?debug=1&reset=1`.
2. Click `Test A: Batched`.
3. Open DevTools Console. Verify `window.testApi.getCounts()` shows `{ view_promotion: 1 }`.
4. Scroll to bottom. Verify `window.testApi.getCounts()` updates to `{ view_promotion: 2 }`.
5. Click banner 2 below fold (`Batch BTF Promo 2`).
6. On `shop.html`, open console:
   - Check `window.testApi.getCounts()` has `{ view_item_list: 1 }`.
   - Verify `window.testApi.validate()` returns `[]`.
7. Click `View Shop Item 1`.
8. Click `Add Shop Item 1`, then `Add Shop Item 2`.
9. Click `Cart`. On `cart.html`, verify `view_cart` is pushed.
10. Click `Checkout`. On `checkout.html`, verify `begin_checkout` is pushed on load.
11. Click `Add Shipping Info` -> verify `add_shipping_info` push.
12. Click `Add Payment Info` -> verify `add_payment_info` push.
13. Click `Place Order` -> verify `purchase` push, and verify the order confirmation box appears on page with the transaction ID.
14. Navigate back to `shop.html` and verify `view_item_list` now carries `no_promo` placeholder values.
