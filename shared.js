// shared.js - Core configuration and utilities for GA4 Promotion Test Site
// ==================== CONFIG ====================
// Plain configuration object at the top of shared.js
const CONFIG = {
  GTM_ID: "GTM-XXXXXXX",
  CURRENCY: "EUR",
  LOCATION_ID: "ChIJIQBpAG2ahYAR_6128GcTUEo",
  EVENT_VIEW: "view_promotion",
  EVENT_SELECT: "select_promotion",
  CARRY_MODE: "both", // values: event, item, both
  CARRY_CREATIVE: true,
  CUSTOM_ITEM_PARAMS: true,
  RUN_ID_ENABLED: true,
  VISIBILITY_THRESHOLD: 0.5,
  REDIRECT_FALLBACK_MS: 500,
  PLACEHOLDER: {
    promotion_id: "no_promo",
    promotion_name: "No Promotion",
    creative_name: "no_creative",
    creative_slot: "no_slot"
  }
};

// ==================== CONSTANTS ====================
const FUNNEL_EVENTS = [
  "view_item_list",
  "view_item",
  "add_to_cart",
  "view_cart",
  "remove_from_cart",
  "begin_checkout",
  "add_shipping_info",
  "add_payment_info",
  "purchase"
];

// Constant item-level metadata common to every item
const CONSTANT_ITEM_FIELDS = {
  affiliation: "Test Store",
  item_brand: "TestBrand",
  item_category: "Apparel",
  item_category2: "Adult",
  item_category3: "Shirts",
  item_category4: "Crew",
  item_category5: "Short sleeve",
  location_id: "ChIJIQBpAG2ahYAR_6128GcTUEo",
  google_business_vertical: "retail"
};

// ==================== SESSION & PARAMETERS ====================
// Each parameter persists in sessionStorage after first use
function initSessionAndConfig() {
  const urlParams = new URLSearchParams(window.location.search);

  // reset=1 clears sessionStorage, then the page continues
  if (urlParams.get("reset") === "1") {
    sessionStorage.clear();
  }

  // debug=1 shows the debug panel
  if (urlParams.has("debug")) {
    sessionStorage.setItem("debug", urlParams.get("debug"));
  }

  // run=ID sets test_run_id. Default value: manual
  if (urlParams.has("run")) {
    sessionStorage.setItem("test_run_id", urlParams.get("run"));
  } else if (!sessionStorage.getItem("test_run_id")) {
    sessionStorage.setItem("test_run_id", "manual");
  }

  // eventLevel=first|multi|joined. Default first. Only batched.html reads this
  if (urlParams.has("eventLevel")) {
    sessionStorage.setItem("eventLevel", urlParams.get("eventLevel"));
  } else if (!sessionStorage.getItem("eventLevel")) {
    sessionStorage.setItem("eventLevel", "first");
  }

  // carry=event|item|both overrides CARRY_MODE
  if (urlParams.has("carry")) {
    sessionStorage.setItem("carry", urlParams.get("carry"));
  }
  if (sessionStorage.getItem("carry")) {
    CONFIG.CARRY_MODE = sessionStorage.getItem("carry");
  }

  // creative=on|off overrides CARRY_CREATIVE
  if (urlParams.has("creative")) {
    sessionStorage.setItem("creative", urlParams.get("creative"));
  }
  if (sessionStorage.getItem("creative")) {
    CONFIG.CARRY_CREATIVE = sessionStorage.getItem("creative") === "on";
  }
}

// ==================== ITEM KEY ORDER FORMATTER ====================
// Item object key order specified by the prompt:
// item_id, item_name, affiliation, coupon, discount, index, item_brand,
// item_category, item_category2, item_category3, item_category4, item_category5,
// item_list_id, item_list_name, item_variant, location_id, price, quantity,
// google_business_vertical, creative_name, creative_slot, promotion_id,
// promotion_name, test_banner_set, test_fold, test_approach
function formatItem(raw) {
  const item = {
    item_id: raw.item_id,
    item_name: raw.item_name,
    affiliation: raw.affiliation !== undefined ? raw.affiliation : CONSTANT_ITEM_FIELDS.affiliation,
    coupon: raw.coupon,
    discount: typeof raw.discount === "number" ? parseFloat(raw.discount.toFixed(2)) : raw.discount,
    index: raw.index,
    item_brand: raw.item_brand !== undefined ? raw.item_brand : CONSTANT_ITEM_FIELDS.item_brand,
    item_category: raw.item_category !== undefined ? raw.item_category : CONSTANT_ITEM_FIELDS.item_category,
    item_category2: raw.item_category2 !== undefined ? raw.item_category2 : CONSTANT_ITEM_FIELDS.item_category2,
    item_category3: raw.item_category3 !== undefined ? raw.item_category3 : CONSTANT_ITEM_FIELDS.item_category3,
    item_category4: raw.item_category4 !== undefined ? raw.item_category4 : CONSTANT_ITEM_FIELDS.item_category4,
    item_category5: raw.item_category5 !== undefined ? raw.item_category5 : CONSTANT_ITEM_FIELDS.item_category5,
    item_list_id: raw.item_list_id,
    item_list_name: raw.item_list_name,
    item_variant: raw.item_variant,
    location_id: raw.location_id !== undefined ? raw.location_id : CONFIG.LOCATION_ID,
    price: typeof raw.price === "number" ? parseFloat(raw.price.toFixed(2)) : raw.price,
    quantity: raw.quantity,
    google_business_vertical: raw.google_business_vertical !== undefined ? raw.google_business_vertical : CONSTANT_ITEM_FIELDS.google_business_vertical
  };

  // Only include creative keys if present and creative switch is active
  if (raw.creative_name !== undefined && raw.creative_name !== null) {
    item.creative_name = raw.creative_name;
  }
  if (raw.creative_slot !== undefined && raw.creative_slot !== null) {
    item.creative_slot = raw.creative_slot;
  }

  // Only include promotion keys if present
  if (raw.promotion_id !== undefined && raw.promotion_id !== null) {
    item.promotion_id = raw.promotion_id;
  }
  if (raw.promotion_name !== undefined && raw.promotion_name !== null) {
    item.promotion_name = raw.promotion_name;
  }

  // The three test_ keys appear only when CUSTOM_ITEM_PARAMS is true
  if (CONFIG.CUSTOM_ITEM_PARAMS) {
    item.test_banner_set = raw.test_banner_set;
    item.test_fold = raw.test_fold;
    item.test_approach = raw.test_approach;
  }

  return item;
}

// ==================== BANNER GENERATOR ====================
// Inputs: approach A (batch or sep), fold F (atf or btf), number N (1 to 3)
function generateBanner(approach, fold, N) {
  const A = approach === "batched" || approach === "batch" ? "batch" : "sep";
  const ApproachName = A === "batch" ? "Batch" : "Sep";
  const foldLower = fold.toLowerCase();
  const foldUpper = fold.toUpperCase();

  const promotion_id = `${A}-${foldLower}-${N}`;
  const promotion_name = `${ApproachName} ${foldUpper} Promo ${N}`;
  const creative_name = `${A}_${foldLower}_creative_${N}`;
  const creative_slot = `${A}_${foldLower}_slot_${N}`;

  const item_id = `SKU-${A.toUpperCase()}-${foldUpper}-${N}`;
  const item_name = `${ApproachName} ${foldUpper} Item ${N}`;
  const item_list_id = `${A}_${foldLower}_list`;
  const item_list_name = `${ApproachName} ${foldUpper} List`;
  const index = N - 1;

  // list price L: 20 plus 10 times (N minus 1), plus 30 when F is btf
  const list_price = 20 + 10 * index + (foldLower === "btf" ? 30 : 0);
  const discount = N;
  const price = parseFloat((list_price - discount).toFixed(2));
  const quantity = 1;
  const item_variant = foldLower === "atf" ? "green" : "blue";
  const coupon = `SAVE${N}_ITEM`;
  const test_banner_set = foldLower === "atf" ? "set1" : "set2";
  const test_fold = foldLower;
  const test_approach = A === "batch" ? "batched" : "separate";

  const raw = {
    item_id,
    item_name,
    affiliation: CONSTANT_ITEM_FIELDS.affiliation,
    coupon,
    discount,
    index,
    item_brand: CONSTANT_ITEM_FIELDS.item_brand,
    item_category: CONSTANT_ITEM_FIELDS.item_category,
    item_category2: CONSTANT_ITEM_FIELDS.item_category2,
    item_category3: CONSTANT_ITEM_FIELDS.item_category3,
    item_category4: CONSTANT_ITEM_FIELDS.item_category4,
    item_category5: CONSTANT_ITEM_FIELDS.item_category5,
    item_list_id,
    item_list_name,
    item_variant,
    location_id: CONFIG.LOCATION_ID,
    price,
    quantity,
    google_business_vertical: CONSTANT_ITEM_FIELDS.google_business_vertical,
    creative_name,
    creative_slot,
    promotion_id,
    promotion_name,
    test_banner_set,
    test_fold,
    test_approach
  };

  return formatItem(raw);
}

// ==================== SHOP PRODUCTS GENERATOR ====================
// Shop products 1 to 3
function generateShopItems() {
  const items = [];
  const prices = [25, 35, 45];
  const discounts = [2, 3, 4];
  const storedVariant = sessionStorage.getItem("test_variant") || "none";

  for (let N = 1; N <= 3; N++) {
    const raw = {
      item_id: `SKU-SHOP-${N}`,
      item_name: `Shop Item ${N}`,
      affiliation: CONSTANT_ITEM_FIELDS.affiliation,
      coupon: `SAVE${N}_ITEM`,
      discount: discounts[N - 1],
      index: N - 1,
      item_brand: CONSTANT_ITEM_FIELDS.item_brand,
      item_category: CONSTANT_ITEM_FIELDS.item_category,
      item_category2: CONSTANT_ITEM_FIELDS.item_category2,
      item_category3: CONSTANT_ITEM_FIELDS.item_category3,
      item_category4: CONSTANT_ITEM_FIELDS.item_category4,
      item_category5: CONSTANT_ITEM_FIELDS.item_category5,
      item_list_id: "shop_main",
      item_list_name: "Shop Main",
      item_variant: "green",
      location_id: CONFIG.LOCATION_ID,
      price: prices[N - 1],
      quantity: 1,
      google_business_vertical: CONSTANT_ITEM_FIELDS.google_business_vertical,
      test_banner_set: "none",
      test_fold: "none",
      test_approach: storedVariant
    };
    items.push(formatItem(raw));
  }
  return items;
}

// ==================== CARRY-FORWARD ====================
// Applies active promotion attribution to funnel events
function applyCarryForward(ecommerce) {
  let promoSource = null;
  try {
    const raw = sessionStorage.getItem("active_promo");
    if (raw) {
      promoSource = JSON.parse(raw);
    }
  } catch (err) {
    promoSource = null;
  }

  if (!promoSource || !promoSource.promotion_id) {
    promoSource = CONFIG.PLACEHOLDER;
  }

  const promoId = promoSource.promotion_id;
  const promoName = promoSource.promotion_name;
  const creativeName = promoSource.creative_name;
  const creativeSlot = promoSource.creative_slot;

  const applyEvent = CONFIG.CARRY_MODE === "event" || CONFIG.CARRY_MODE === "both";
  const applyItem = CONFIG.CARRY_MODE === "item" || CONFIG.CARRY_MODE === "both";

  if (applyEvent) {
    ecommerce.promotion_id = promoId;
    ecommerce.promotion_name = promoName;
    if (CONFIG.CARRY_CREATIVE) {
      ecommerce.creative_name = creativeName;
      ecommerce.creative_slot = creativeSlot;
    }
  }

  if (applyItem && Array.isArray(ecommerce.items)) {
    ecommerce.items = ecommerce.items.map(it => {
      const copy = { ...it };
      copy.promotion_id = promoId;
      copy.promotion_name = promoName;
      if (CONFIG.CARRY_CREATIVE) {
        copy.creative_name = creativeName;
        copy.creative_slot = creativeSlot;
      } else {
        delete copy.creative_name;
        delete copy.creative_slot;
      }
      return formatItem(copy);
    });
  }
}

// ==================== VALIDATOR ====================
// Validate every event-level and item-level value recursively.
// A value must be a non-empty string or a finite number.
function validatePush(eventName, ecommerce) {
  const errors = [];

  function checkVal(val, path) {
    if (val === undefined || val === null) {
      errors.push(`${path} is missing (${val})`);
      return;
    }
    if (typeof val === "string") {
      if (val.trim() === "") {
        errors.push(`${path} is an empty string`);
      }
    } else if (typeof val === "number") {
      if (isNaN(val) || !isFinite(val)) {
        errors.push(`${path} is not a finite number (${val})`);
      }
    } else {
      errors.push(`${path} has unexpected type (${typeof val})`);
    }
  }

  // 1. Check test_run_id if enabled
  if (CONFIG.RUN_ID_ENABLED) {
    checkVal(ecommerce.test_run_id, "ecommerce.test_run_id");
  }

  // 2. Check event-specific required fields
  if (eventName === "view_promotion" || eventName === "select_promotion") {
    checkVal(ecommerce.promotion_id, "ecommerce.promotion_id");
    checkVal(ecommerce.promotion_name, "ecommerce.promotion_name");
    checkVal(ecommerce.creative_name, "ecommerce.creative_name");
    checkVal(ecommerce.creative_slot, "ecommerce.creative_slot");
    checkVal(ecommerce.location_id, "ecommerce.location_id");
    checkVal(ecommerce.currency, "ecommerce.currency");
  } else if (eventName === "view_item_list") {
    checkVal(ecommerce.item_list_id, "ecommerce.item_list_id");
    checkVal(ecommerce.item_list_name, "ecommerce.item_list_name");
  } else if (["view_item", "add_to_cart", "view_cart", "remove_from_cart"].includes(eventName)) {
    checkVal(ecommerce.currency, "ecommerce.currency");
    checkVal(ecommerce.value, "ecommerce.value");
  } else if (eventName === "begin_checkout") {
    checkVal(ecommerce.currency, "ecommerce.currency");
    checkVal(ecommerce.value, "ecommerce.value");
    checkVal(ecommerce.coupon, "ecommerce.coupon");
  } else if (eventName === "add_shipping_info") {
    checkVal(ecommerce.currency, "ecommerce.currency");
    checkVal(ecommerce.value, "ecommerce.value");
    checkVal(ecommerce.coupon, "ecommerce.coupon");
    checkVal(ecommerce.shipping_tier, "ecommerce.shipping_tier");
  } else if (eventName === "add_payment_info") {
    checkVal(ecommerce.currency, "ecommerce.currency");
    checkVal(ecommerce.value, "ecommerce.value");
    checkVal(ecommerce.coupon, "ecommerce.coupon");
    checkVal(ecommerce.payment_type, "ecommerce.payment_type");
  } else if (eventName === "purchase") {
    checkVal(ecommerce.currency, "ecommerce.currency");
    checkVal(ecommerce.value, "ecommerce.value");
    checkVal(ecommerce.transaction_id, "ecommerce.transaction_id");
    checkVal(ecommerce.coupon, "ecommerce.coupon");
    checkVal(ecommerce.shipping, "ecommerce.shipping");
    checkVal(ecommerce.tax, "ecommerce.tax");
    checkVal(ecommerce.customer_type, "ecommerce.customer_type");
  }

  // 3. Check carry-forward fields at event level if applicable
  if (FUNNEL_EVENTS.includes(eventName)) {
    if (CONFIG.CARRY_MODE === "event" || CONFIG.CARRY_MODE === "both") {
      checkVal(ecommerce.promotion_id, "ecommerce.promotion_id");
      checkVal(ecommerce.promotion_name, "ecommerce.promotion_name");
      if (CONFIG.CARRY_CREATIVE) {
        checkVal(ecommerce.creative_name, "ecommerce.creative_name");
        checkVal(ecommerce.creative_slot, "ecommerce.creative_slot");
      }
    }
  }

  // 4. Check recursive properties on ecommerce (excluding items array and internal flags)
  for (const k of Object.keys(ecommerce)) {
    if (k !== "items" && !k.startsWith("_")) {
      checkVal(ecommerce[k], `ecommerce.${k}`);
    }
  }

  // 5. Check items array and every item field
  if (!Array.isArray(ecommerce.items)) {
    errors.push("ecommerce.items is not an array");
  } else {
    ecommerce.items.forEach((item, idx) => {
      // Base required item fields
      checkVal(item.item_id, `items[${idx}].item_id`);
      checkVal(item.item_name, `items[${idx}].item_name`);
      checkVal(item.affiliation, `items[${idx}].affiliation`);
      checkVal(item.coupon, `items[${idx}].coupon`);
      checkVal(item.discount, `items[${idx}].discount`);
      checkVal(item.index, `items[${idx}].index`);
      checkVal(item.item_brand, `items[${idx}].item_brand`);
      checkVal(item.item_category, `items[${idx}].item_category`);
      checkVal(item.item_category2, `items[${idx}].item_category2`);
      checkVal(item.item_category3, `items[${idx}].item_category3`);
      checkVal(item.item_category4, `items[${idx}].item_category4`);
      checkVal(item.item_category5, `items[${idx}].item_category5`);
      checkVal(item.item_list_id, `items[${idx}].item_list_id`);
      checkVal(item.item_list_name, `items[${idx}].item_list_name`);
      checkVal(item.item_variant, `items[${idx}].item_variant`);
      checkVal(item.location_id, `items[${idx}].location_id`);
      checkVal(item.price, `items[${idx}].price`);
      checkVal(item.quantity, `items[${idx}].quantity`);
      checkVal(item.google_business_vertical, `items[${idx}].google_business_vertical`);

      // If banner event or carry mode includes item
      const isBannerEvent = eventName === "view_promotion" || eventName === "select_promotion";
      const hasItemCarry = FUNNEL_EVENTS.includes(eventName) && (CONFIG.CARRY_MODE === "item" || CONFIG.CARRY_MODE === "both");

      if (isBannerEvent || hasItemCarry) {
        checkVal(item.promotion_id, `items[${idx}].promotion_id`);
        checkVal(item.promotion_name, `items[${idx}].promotion_name`);
        if (CONFIG.CARRY_CREATIVE || isBannerEvent) {
          checkVal(item.creative_name, `items[${idx}].creative_name`);
          checkVal(item.creative_slot, `items[${idx}].creative_slot`);
        }
      }

      // Custom item parameters
      if (CONFIG.CUSTOM_ITEM_PARAMS) {
        checkVal(item.test_banner_set, `items[${idx}].test_banner_set`);
        checkVal(item.test_fold, `items[${idx}].test_fold`);
        checkVal(item.test_approach, `items[${idx}].test_approach`);
      }

      // Check all present keys on the item
      for (const k of Object.keys(item)) {
        checkVal(item[k], `items[${idx}].${k}`);
      }
    });
  }

  return errors;
}

// ==================== PUSH HELPER ====================
// Single writer of ecommerce pushes
// push(eventName, eventLevelFields, items, extras) performs these steps in order:
// 1. Build the ecommerce object from eventLevelFields, test_run_id and items.
// 2. For funnel events, apply carry-forward (see CARRY-FORWARD).
// 3. Validate every event-level and item-level value recursively.
// 4. Run dataLayer.push({ ecommerce: null }), then dataLayer.push({ event: eventName, ecommerce: object, ...extras }).
// 5. Append a deep copy to window.__pushes. Set body attribute data-last-event to eventName. Refresh the debug panel.
function push(eventName, eventLevelFields = {}, items = [], extras = {}) {
  // Step 1: Build base ecommerce object
  const ecommerce = { ...eventLevelFields };

  if (CONFIG.RUN_ID_ENABLED) {
    const runId = sessionStorage.getItem("test_run_id") || "manual";
    ecommerce.test_run_id = runId;
  }

  ecommerce.items = items.map(it => formatItem(it));

  // Step 2: For funnel events, apply carry-forward
  if (FUNNEL_EVENTS.includes(eventName)) {
    applyCarryForward(ecommerce);
  }

  // Ensure item key order is formatted cleanly
  if (Array.isArray(ecommerce.items)) {
    ecommerce.items = ecommerce.items.map(it => formatItem(it));
  }

  // Step 3: Validate
  const validationErrors = validatePush(eventName, ecommerce);
  let isInvalid = false;
  if (validationErrors.length > 0) {
    console.error(`Validation failed for push "${eventName}":`, validationErrors);
    isInvalid = true;
  }

  // Step 4: Push to dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null });

  const pushPayload = {
    event: eventName,
    ecommerce: ecommerce,
    ...extras
  };
  window.dataLayer.push(pushPayload);

  // Step 5: Append deep copy to window.__pushes, set attribute, refresh debug panel
  window.__pushes = window.__pushes || [];
  const storedCopy = JSON.parse(JSON.stringify(pushPayload));
  if (isInvalid) {
    storedCopy._invalid = true;
    storedCopy._validationErrors = validationErrors;
  }
  window.__pushes.push(storedCopy);

  document.body.setAttribute("data-last-event", eventName);
  refreshDebugPanel();
}

// ==================== DEBUG PANEL ====================
// Fixed box listing every push as JSON, red border for invalid pushes,
// plus active_promo and the current carry and eventLevel modes.
function refreshDebugPanel() {
  if (sessionStorage.getItem("debug") !== "1") return;

  let panel = document.getElementById("debug-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "debug-panel";
    panel.style.cssText = [
      "position: fixed",
      "bottom: 0",
      "right: 0",
      "width: 420px",
      "max-height: 55vh",
      "overflow-y: auto",
      "background: #141414",
      "color: #e0e0e0",
      "border: 2px solid #444",
      "font-family: monospace",
      "font-size: 11px",
      "padding: 8px",
      "z-index: 99999",
      "box-sizing: border-box"
    ].join(";");

    const header = document.createElement("div");
    header.id = "debug-panel-header";
    header.style.cssText = "border-bottom: 2px solid #555; padding-bottom: 6px; margin-bottom: 6px; font-weight: bold;";
    panel.appendChild(header);

    const list = document.createElement("div");
    list.id = "debug-panel-entries";
    panel.appendChild(list);

    document.body.appendChild(panel);
  }

  // Update header status info
  const header = document.getElementById("debug-panel-header");
  if (header) {
    const activePromo = sessionStorage.getItem("active_promo") || "(none)";
    const carryMode = CONFIG.CARRY_MODE;
    const creativeMode = CONFIG.CARRY_CREATIVE ? "on" : "off";
    const eventLevel = sessionStorage.getItem("eventLevel") || "first";
    const runId = sessionStorage.getItem("test_run_id") || "manual";
    header.innerHTML = `
      <div style="color: #64b5f6; font-size: 12px; margin-bottom: 4px;">GA4 TRACKING DEBUG PANEL</div>
      <div><strong>active_promo:</strong> <span style="color:#81c784;">${activePromo}</span></div>
      <div><strong>carry:</strong> ${carryMode} | <strong>creative:</strong> ${creativeMode}</div>
      <div><strong>eventLevel:</strong> ${eventLevel} | <strong>run:</strong> ${runId}</div>
    `;
  }

  // Render entries
  const list = document.getElementById("debug-panel-entries");
  if (list) {
    list.innerHTML = "";
    (window.__pushes || []).forEach((p, idx) => {
      const entry = document.createElement("div");
      const isBad = p._invalid === true;
      entry.style.cssText = [
        `border: ${isBad ? "2px solid #ff4444" : "1px solid #333"}`,
        `background: ${isBad ? "rgba(255, 0, 0, 0.15)" : "#1e1e1e"}`,
        "margin: 4px 0",
        "padding: 6px",
        "border-radius: 4px"
      ].join(";");

      const title = document.createElement("div");
      title.style.cssText = `font-weight: bold; color: ${isBad ? "#ff6666" : "#4fc3f7"}; margin-bottom: 4px;`;
      title.textContent = `#${idx + 1}: ${p.event} ${isBad ? "[INVALID]" : ""}`;
      entry.appendChild(title);

      if (isBad && p._validationErrors) {
        const errBox = document.createElement("div");
        errBox.style.cssText = "color: #ff8888; font-size: 10px; margin-bottom: 4px;";
        errBox.textContent = `Errors: ${p._validationErrors.join("; ")}`;
        entry.appendChild(errBox);
      }

      const pre = document.createElement("pre");
      pre.style.cssText = "margin: 0; white-space: pre-wrap; word-break: break-all; font-size: 10px; max-height: 120px; overflow-y: auto;";
      pre.textContent = JSON.stringify(p, null, 2);
      entry.appendChild(pre);

      list.appendChild(entry);
    });
  }
}

// ==================== TEST API ====================
// Required testApi methods on window
window.testApi = {
  // getPushes() returns all pushes as JSON
  getPushes: function() {
    return JSON.parse(JSON.stringify(window.__pushes || []));
  },

  // getCounts() returns event name counts
  getCounts: function() {
    const counts = {};
    (window.__pushes || []).forEach(p => {
      const name = p.event;
      if (name) {
        counts[name] = (counts[name] || 0) + 1;
      }
    });
    return counts;
  },

  // getPromoSummary() returns promotion IDs per event with level (item or event)
  getPromoSummary: function() {
    const summary = [];
    (window.__pushes || []).forEach(p => {
      const ev = p.event;
      const ecom = p.ecommerce || {};
      if (ecom.promotion_id) {
        summary.push({ event: ev, promotion_id: ecom.promotion_id, level: "event" });
      }
      if (Array.isArray(ecom.items)) {
        ecom.items.forEach(it => {
          if (it.promotion_id) {
            summary.push({ event: ev, promotion_id: it.promotion_id, level: "item" });
          }
        });
      }
    });
    return summary;
  },

  // validate() returns the list of invalid pushes
  validate: function() {
    const invalid = [];
    (window.__pushes || []).forEach((p, idx) => {
      const errs = validatePush(p.event, p.ecommerce || {});
      if (errs.length > 0) {
        invalid.push({ index: idx, event: p.event, errors: errs, push: p });
      }
    });
    return invalid;
  },

  // reset() clears sessionStorage and pushes
  reset: function() {
    sessionStorage.clear();
    window.__pushes = [];
    document.body.removeAttribute("data-last-event");
    const list = document.getElementById("debug-panel-entries");
    if (list) list.innerHTML = "";
    const panel = document.getElementById("debug-panel");
    if (panel && panel.parentNode) {
      panel.parentNode.removeChild(panel);
    }
  }
};

// Expose functions on window for global access across scripts
window.CONFIG = CONFIG;
window.generateBanner = generateBanner;
window.generateShopItems = generateShopItems;
window.formatItem = formatItem;
window.push = push;

// ==================== AUTO-INITIALIZATION ====================
(function() {
  window.dataLayer = window.dataLayer || [];
  window.__pushes = window.__pushes || [];
  initSessionAndConfig();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refreshDebugPanel);
  } else {
    refreshDebugPanel();
  }
})();
