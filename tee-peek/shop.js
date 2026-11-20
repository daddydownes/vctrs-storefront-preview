function setProductImage(image, file, sizes) {
  const name = file.replace(/\.jpg$/, '');
  if (sizes === '64px') {
    image.removeAttribute('srcset');
    image.src = `assets/optimized/${name}-160.webp`;
    image.decoding = 'async';
    return;
  }
  const width = ['mesh', 'badge', 'hat'].includes(name) ? 1067 : ['hat-front', 'hat-side'].includes(name) ? 934 : 933;
  const full = name === 'hat-side' ? 'assets/hat-side.jpg' : `assets/optimized/${name}.webp`;
  image.sizes = sizes;
  image.srcset = `assets/optimized/${name}-640.webp 640w, ${full} ${width}w`;
  image.src = `assets/optimized/${name}-640.webp`;
  image.decoding = 'async';
}

const products = {
  mesh: {
    name: 'V Star Mesh Tee',
    priceCents: 6000,
    stock: {M: 0, L: 0},
    photos: [
      ['mesh.jpg', 'Front of the V Star Mesh Tee'],
      ['mesh-brick.jpg', 'V Star Mesh Tee against a brick wall'],
      ['mesh-group.jpg', 'Group wearing the V Star Mesh Tee'],
    ],
  },
  badge: {
    name: 'Black Badge Tee',
    priceCents: 5000,
    stock: {S: 0, M: 0, XL: 0, '2XL': 0},
    photos: [
      ['badge.jpg', 'Front of the Black Badge Tee'],
      ['badge-duo.jpg', 'Two people wearing Black Badge Tees'],
      ['badge-car.jpg', 'Black Badge Tees styled beside a car'],
    ],
  },
  hat: {
    name: 'VCTRS Trucker Hat',
    priceCents: 5000,
    stock: {'One size': 0},
    photos: [
      ['hat.jpg', 'Close-up of the VCTRS Trucker Hat'],
      ['hat-front.jpg', 'Front view of the VCTRS Trucker Hat'],
      ['hat-side.jpg', 'Side view of the VCTRS Trucker Hat showing the mesh panel'],
    ],
  },
};

const moneyFormatter = new Intl.NumberFormat('en-AU', {style:'currency', currency:'AUD'});
const money = cents => moneyFormatter.format(cents / 100);
const productMoneyFormatter = new Intl.NumberFormat('en-AU', {style:'currency', currency:'AUD', minimumFractionDigits:0, maximumFractionDigits:2});
const productMoney = cents => productMoneyFormatter.format(cents / 100);
const cartStorageKey = 'vctrs-live-cart';
let shipping = 1000;
let catalogReady = false;
let storeOpen = false;
let testCheckout = false;
let catalogRequest;
const cart = readCart();
const productDialog = document.querySelector('#product-dialog');
const cartDialog = document.querySelector('#cart-dialog');
const checkoutDialog = document.querySelector('#checkout-dialog');
const productScroll = productDialog.querySelector('.dialog-body');
const cartScroll = cartDialog.querySelector('.bag-body');
const cartButton = document.querySelector('#floating-cart');
const floatingCartCount = document.querySelector('#floating-cart-count');
const floatingCartSubtotal = document.querySelector('#floating-cart-subtotal');
const checkoutStart = document.querySelector('#checkout-start');
const checkoutForm = document.querySelector('#checkout-form');
const deliveryDetails = document.querySelector('#checkout-delivery');
const reviewDetails = document.querySelector('#checkout-review-details');
const checkoutBody = checkoutForm.querySelector('.checkout-body');
const editDelivery = document.querySelector('#edit-delivery');
const checkoutMessage = document.querySelector('#checkout-message');
const couponInput = document.querySelector('#checkout-coupon');
const couponMessage = document.querySelector('#coupon-message');
const couponApply = document.querySelector('#apply-coupon');
const placeOrder = document.querySelector('#place-order');
let currentQuote;
let quoteVersion = 0;
let ordering = false;
let orderAttempt;
let paymentAttempt;
let reopeningCheckout;
let checkoutComplete = false;
const paymentSection = document.querySelector('#checkout-payment');
const paymentConfirmation = document.querySelector('#payment-confirm');
paymentConfirmation.addEventListener('change', () => setOrdering(ordering));
const completeSection = document.querySelector('#checkout-complete');
const pendingPaymentKey = 'vctrs-pending-transfer';
const checkoutDetailsKey = 'vctrs-checkout-details';
const galleryPhoto = document.querySelector('#gallery-photo');
const galleryCount = document.querySelector('#gallery-count');
const sizeField = document.querySelector('#size-field');
const sizeOptions = document.querySelector('#size-options');
const productFit = document.querySelector('#product-fit');
const quantityMinus = document.querySelector('#qty-minus');
const quantityPlus = document.querySelector('#qty-plus');
const quantityValue = document.querySelector('#qty-value');
const stockNote = document.querySelector('#stock-note');
const add = document.querySelector('.add');
const addLabel = document.querySelector('#add-label');
const addTotal = document.querySelector('#add-total');
const cartList = document.querySelector('#bag-list');
const cartFeedback = document.querySelector('#cart-feedback');
let activeProduct;
let productButton;
let activeVariant;
let cartOpener;
let photoIndex = 0;
let quantity = 1;

function cartKey(product, variant) {
  return `${product}:${variant}`;
}

function readCart() {
  const saved = new Map();
  try {
    const rows = JSON.parse(sessionStorage.getItem(cartStorageKey) || '[]');
    if (!Array.isArray(rows)) return saved;
    for (const row of rows) {
      if (!row || !Object.hasOwn(products, row.product)) continue;
      const stock = products[row.product].stock;
      if (!Object.hasOwn(stock, row.variant) || !Number.isInteger(row.quantity)) continue;
      if (row.quantity < 1 || row.quantity > 100) continue;
      saved.set(cartKey(row.product, row.variant), row);
    }
  } catch {
    // The cart can still run when browser storage is unavailable.
  }
  return saved;
}

function remaining(product, variant) {
  return Math.max(0, (products[product].stock[variant] ?? 0) - (cart.get(cartKey(product, variant))?.quantity ?? 0));
}

function setPhoto(index) {
  const photos = products[activeProduct].photos;
  photoIndex = (index + photos.length) % photos.length;
  const [file, description] = photos[photoIndex];
  setProductImage(galleryPhoto, file, '(max-width: 650px) calc(100vw - 58px), 580px');
  galleryPhoto.alt = description;
  galleryCount.textContent = `${photoIndex + 1} / ${photos.length}`;

}

function renderSelection() {
  const product = products[activeProduct];
  const available = activeVariant ? remaining(activeProduct, activeVariant) : 0;
  const allInCart = Object.keys(product.stock).every(variant => remaining(activeProduct, variant) === 0);
  quantityMinus.disabled = !catalogReady || !storeOpen || quantity <= 1;
  quantityPlus.disabled = !catalogReady || !storeOpen || quantity >= available;
  quantityValue.textContent = quantity;
  add.disabled = !catalogReady || !storeOpen || allInCart || (Boolean(activeVariant) && quantity > available);
  addLabel.textContent = !catalogReady ? 'Stock unavailable' : !storeOpen ? 'Orders are closed' : allInCart ? 'Sold out' : activeVariant ? 'Add to bag' : 'Choose a size';
  addTotal.textContent = catalogReady && storeOpen && !allInCart ? productMoney(product.priceCents * quantity) : '';

  if (!catalogReady) stockNote.textContent = 'We couldn’t check stock. Please try again shortly.';
  else if (!storeOpen) stockNote.textContent = 'Online orders are temporarily closed.';
  else if (allInCart) stockNote.textContent = 'No more of this item is available to add.';
  else if (!activeVariant) stockNote.textContent = '';
  else if (available <= 3) stockNote.textContent = `Only ${available} available to add.`;
  else if (quantity === available) stockNote.textContent = 'Maximum available quantity selected.';
  else stockNote.textContent = 'In stock';
}

function openProduct(button) {
  activeProduct = button.closest('[data-product]').dataset.product;
  productButton = button;
  const product = products[activeProduct];
  document.querySelector('#product-name').textContent = product.name;
  document.querySelector('#product-price').textContent = productMoney(product.priceCents);
  setPhoto(Number(button.dataset.photoIndex || 0));
  activeVariant = null;
  quantity = 1;
  renderSizeOptions();
  productDialog.showModal();
  productScroll.scrollTop = 0;
}

function renderSizeOptions() {
  const variants = Object.keys(products[activeProduct].stock);
  const oneSize = variants.length === 1;
  productDialog.dataset.sizeCount = String(variants.length);
  if (oneSize) activeVariant = variants[0];
  else if (!variants.includes(activeVariant) || !remaining(activeProduct, activeVariant)) activeVariant = null;
  if (activeVariant) quantity = Math.min(quantity, Math.max(1, remaining(activeProduct, activeVariant)));
  else quantity = 1;
  sizeField.hidden = oneSize;
  productFit.hidden = !oneSize;
  productFit.textContent = oneSize ? variants[0] : '';
  sizeOptions.replaceChildren(...(oneSize ? [] : variants.map(variant => {
    const option = document.createElement('label');
    option.className = 'size-option';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'size';
    radio.value = variant;
    radio.checked = variant === activeVariant;
    radio.disabled = !catalogReady || !storeOpen || remaining(activeProduct, variant) === 0;
    if (radio.disabled) radio.setAttribute('aria-label', variant + ', unavailable');
    const label = document.createElement('span');
    label.textContent = variant;
    option.append(radio, label);
    return option;
  })));
  renderSelection();
}

function setCartFeedback(message) {
  cartFeedback.hidden = !message;
  cartFeedback.textContent = message;
}

function createStepButton(symbol, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'step-btn';
  button.textContent = symbol;
  button.setAttribute('aria-label', label);
  return button;
}

function getCartTotals() {
  let count = 0;
  let subtotal = 0;
  for (const {product, quantity: units} of cart.values()) {
    count += units;
    subtotal += products[product].priceCents * units;
  }
  return {count, subtotal, total: subtotal + (count ? shipping : 0)};
}

function updateCartButton({count, subtotal}) {
  floatingCartCount.textContent = count;
  floatingCartSubtotal.textContent = money(subtotal);
  floatingCartSubtotal.hidden = count === 0;
  const itemCount = count === 1 ? '1 item' : `${count} items`;
  cartButton.setAttribute('aria-label', count ? `Open cart, ${itemCount}, subtotal ${money(subtotal)}` : 'Open empty cart');
}

function restoreCartOpener() {
  const opener = cartOpener?.isConnected ? cartOpener : cartButton;
  opener.focus({preventScroll: true});
}

function showCart(opener) {
  if (paymentAttempt) return returnToCheckout('cart', opener);
  openCart(opener);
}

function openCart(opener) {
  cartOpener = opener;
  cartDialog.showModal();
  cartScroll.scrollTop = 0;
}

function renderCart(focusKey, focusAction) {
  try {
    sessionStorage.setItem(cartStorageKey, JSON.stringify([...cart.values()]));
  } catch {
    // Keep the cart in memory if storage is unavailable.
  }
  const totals = getCartTotals();
  const {count, subtotal, total} = totals;
  const continueShopping = document.querySelector('#cart-continue');
  let nextFocus;
  cartList.replaceChildren();
  for (const [key, item] of cart) {
    const {name, priceCents, photos, stock} = products[item.product];

    const row = document.createElement('li');
    row.className = 'cart-item';
    const image = document.createElement('img');
    image.className = 'cart-photo';
    setProductImage(image, photos[0][0], '64px');
    image.alt = '';
    const label = document.createElement('div');
    label.className = 'cart-item-main';
    const itemName = document.createElement('strong');
    itemName.className = 'cart-item-name';
    itemName.textContent = name;
    const variant = document.createElement('span');
    variant.className = 'cart-variant';
    variant.textContent = item.variant === 'One size' ? item.variant : 'Size ' + item.variant;
    const unitPrice = document.createElement('span');
    unitPrice.className = 'cart-variant';
    unitPrice.textContent = `${money(priceCents)} each`;
    label.append(itemName, variant, unitPrice);

    const controls = document.createElement('div');
    controls.className = 'cart-item-controls';
    const stepper = document.createElement('div');
    stepper.className = 'quantity-stepper';
    stepper.setAttribute('role', 'group');
    const itemDescription = `${name}, ${item.variant}`;
    stepper.setAttribute('aria-label', `Quantity for ${itemDescription}`);
    const minus = createStepButton('−', `Decrease quantity for ${itemDescription}`);
    const plus = createStepButton('+', `Increase quantity for ${itemDescription}`);
    const value = document.createElement('output');
    value.textContent = item.quantity;
    minus.disabled = item.quantity <= 1;
    plus.disabled = !catalogReady || !storeOpen || item.quantity >= stock[item.variant];
    minus.addEventListener('click', () => changeCartQuantity(key, -1));
    plus.addEventListener('click', () => changeCartQuantity(key, 1));
    stepper.append(minus, value, plus);

    const remove = document.createElement('button');
    remove.className = 'bag-remove';
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', 'Remove ' + itemDescription);
    remove.addEventListener('click', () => {
      const keys = [...cart.keys()];
      const index = keys.indexOf(key);
      cart.delete(key);
      setCartFeedback('');
      renderCart(keys[index + 1] ?? keys[index - 1] ?? key, 'remove');
    });
    controls.append(stepper, remove);

    const lineTotal = document.createElement('strong');
    lineTotal.className = 'cart-item-total';
    lineTotal.textContent = money(priceCents * item.quantity);
    row.append(image, label, controls, lineTotal);
    cartList.append(row);

    if (key === focusKey) {
      if (focusAction === 'remove') nextFocus = remove;
      else if (focusAction === 'plus') nextFocus = !plus.disabled ? plus : minus;
      else nextFocus = !minus.disabled ? minus : plus;
      if (nextFocus.disabled) nextFocus = remove;
    }
  }
  document.querySelector('#cart-count').textContent = count ? `${count} ${count === 1 ? 'item' : 'items'}` : '';
  continueShopping.textContent = count ? 'Keep shopping' : 'Browse the drop';
  document.querySelector('#bag-empty').hidden = count > 0;
  document.querySelector('#bag-totals').hidden = count === 0;
  document.querySelector('#subtotal').textContent = money(subtotal);
  document.querySelector('#cart-shipping').textContent = money(shipping);
  document.querySelector('#total').textContent = money(total);
  checkoutStart.hidden = count === 0 && !paymentAttempt;
  checkoutStart.disabled = true;
  checkoutStart.querySelector('span').textContent = 'Checkout unavailable in this demo';
  updateCartButton(totals);
  if (focusKey) (nextFocus || continueShopping).focus({preventScroll: true});
}

function changeCartQuantity(key, change) {
  const item = cart.get(key);
  const nextQuantity = item.quantity + change;
  if (nextQuantity < 1 || (change > 0 && (!catalogReady || !storeOpen || nextQuantity > products[item.product].stock[item.variant]))) return;
  item.quantity = nextQuantity;
  setCartFeedback('');
  renderCart(key, change > 0 ? 'plus' : 'minus');
}

async function shopRequest(path, body, token) {
  const options = {cache:'no-store', headers:{Accept:'application/json'}, signal:AbortSignal.timeout?.(15000)};
  if (body !== undefined) {
    options.method = 'POST';
    options.headers['Content-Type'] = 'application/json';
    options.headers['X-Requested-With'] = 'VCTRS';
    options.body = JSON.stringify(body);
  }
  if (token) options.headers.Authorization = 'Bearer ' + token;
  let response;
  try { response = await fetch('api/' + path, options); }
  catch { throw new Error('Connection lost. Please try again.'); }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    const error = new Error(data?.error || 'The store is temporarily unavailable. Please try again shortly.');
    error.status = response.status;
    error.code = data?.code;
    throw error;
  }
  return data;
}

function refreshCatalog() {
  if (catalogRequest) return catalogRequest;
  const status = document.querySelector('#catalog-message');
  catalogRequest = (async () => {
    try {
      const data = await shopRequest('catalog');
      if (data.currency !== 'AUD' || !Number.isInteger(data.shippingCents) || !Array.isArray(data.products)) throw new Error();
      shipping = data.shippingCents;
      for (const [id, product] of Object.entries(products)) {
        const live = data.products.find(row => row.id === id);
        for (const size of Object.keys(product.stock)) {
          const available = live?.variants?.find(row => row.size === size)?.available;
          product.stock[size] = Number.isInteger(available) && available > 0 ? available : 0;
        }
        if (Number.isInteger(live?.priceCents) && live.priceCents > 0) product.priceCents = live.priceCents;
        const card = document.querySelector(`.card[data-product="${id}"]`);
        card.querySelector('.price').textContent = money(product.priceCents);
        card.querySelector('.view-label').textContent = Object.values(product.stock).some(Boolean) ? 'View product' : 'Sold out';
      }
      let changed = false;
      for (const [key, item] of cart) {
        const available = products[item.product].stock[item.variant] ?? 0;
        if (item.quantity <= available) continue;
        changed = true;
        if (available === 0) cart.delete(key);
        else item.quantity = available;
      }
      catalogReady = true;
      storeOpen = data.storeOpen !== false;
      testCheckout = data.mode === 'preview';
      document.querySelector('#checkout-preview-note').hidden = !testCheckout;
      status.hidden = storeOpen;
      status.textContent = storeOpen ? '' : 'Online orders are temporarily closed.';
      if (changed) setCartFeedback('Stock has changed. We updated the quantities in your cart.');
    } catch {
      catalogReady = false;
      storeOpen = false;
      status.hidden = false;
      status.textContent = 'We couldn’t check stock. Please refresh to try again.';
    } finally {
      renderCart();
      if (productDialog.open) {
        document.querySelector('#product-price').textContent = productMoney(products[activeProduct].priceCents);
        renderSizeOptions();
      }
    }
  })().finally(() => { catalogRequest = undefined; });
  return catalogRequest;
}

function checkoutItems() {
  return [...cart.values()].map(({product, variant, quantity}) => ({product, size: variant, quantity}));
}

function renderCheckout(quote) {
  const rows = quote.items.map(({product, name, size, quantity: units, lineTotalCents}) => {
    const row = document.createElement('li');
    row.className = 'checkout-line';
    if (Object.hasOwn(products, product)) {
      const image = document.createElement('img');
      image.className = 'checkout-photo';
      image.alt = name;
      image.width = 48;
      image.height = 64;
      setProductImage(image, products[product].photos[0][0], '64px');
      image.addEventListener('error', () => { image.hidden = true; row.classList.add('checkout-line-no-photo'); }, {once:true});
      row.append(image);
    } else row.classList.add('checkout-line-no-photo');
    const details = document.createElement('div');
    details.className = 'checkout-line-detail';
    const itemName = document.createElement('strong');
    itemName.className = 'checkout-line-name';
    itemName.textContent = name;
    const variant = document.createElement('span');
    variant.className = 'checkout-line-variant';
    variant.textContent = `${size === 'One size' ? size : 'Size ' + size} · Qty ${units}`;
    details.append(itemName, variant);
    const amount = document.createElement('strong');
    amount.className = 'checkout-line-total';
    amount.textContent = money(lineTotalCents);
    row.append(details, amount);
    return row;
  });
  document.querySelector('#checkout-items').replaceChildren(...rows);
  document.querySelector('#checkout-subtotal').textContent = money(quote.subtotalCents);
  document.querySelector('#checkout-shipping').textContent = quote.shippingCents === 0 ? 'Free' : money(quote.shippingCents);
  document.querySelector('#checkout-total').textContent = money(quote.totalCents);
  document.querySelector('#place-order-total').textContent = money(quote.totalCents);
  document.querySelector('#checkout-totals').hidden = false;
}

function showCheckoutStep(review) {
  paymentSection.hidden = true;
  completeSection.hidden = true;
  checkoutDialog.classList.remove('payment-stage');
  checkoutDialog.classList.remove('awaiting-transfer');
  checkoutComplete = false;
  document.querySelector('#checkout-back').hidden = false;
  document.querySelector('#checkout-back').textContent = 'Back to cart';
  deliveryDetails.hidden = review;
  reviewDetails.hidden = !review;
  const submitLabel = document.querySelector('#place-order-label');
  if (!review) submitLabel.textContent = 'Review order';
  else submitLabel.textContent = 'Continue to payment';
  checkoutMessage.textContent = '';
  checkoutBody.scrollTop = 0;
  document.querySelector(review ? '#review-heading' : '#delivery-heading').focus({preventScroll: true});
}

function setOrdering(value) {
  ordering = value;
  placeOrder.disabled = value || (paymentAttempt ? !paymentConfirmation.checked : !currentQuote);
  paymentConfirmation.disabled = value || !paymentAttempt;
  paymentConfirmation.closest('label').hidden = !paymentAttempt;
  couponApply.disabled = value || !!paymentAttempt;
  editDelivery.disabled = value || !!paymentAttempt;
  checkoutForm.querySelectorAll('fieldset').forEach(fieldset => { fieldset.disabled = value || !!paymentAttempt; });
  couponInput.disabled = value || !!paymentAttempt;
  document.querySelector('#checkout-back').disabled = value;
  checkoutDialog.querySelector('.close').disabled = value;
}

async function copyPaymentValue(value, text, message, label) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(value);
    message.textContent = label + ' copied.';
    return true;
  } catch {
    // Selecting visible text preserves a manual route when the browser blocks
    // clipboard access. Never report success when the write was rejected.
    try {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(text);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch { /* Text remains available for native long-press selection. */ }
    message.textContent = 'Copy blocked. Touch and hold the ' + label.toLowerCase() + ', then choose Copy.';
    return false;
  }
}

function rememberPayment() {
  try { sessionStorage.setItem(pendingPaymentKey, JSON.stringify({id:paymentAttempt.order.id, token:paymentAttempt.token})); }
  catch { /* The open page remains usable without storage. */ }
}

function showPayment(result) {
  if (paymentAttempt?.order.id !== result.order.id) paymentConfirmation.checked = false;
  paymentAttempt = result;
  renderCart();
  checkoutComplete = false;
  rememberPayment();
  deliveryDetails.hidden = reviewDetails.hidden = completeSection.hidden = true;
  paymentSection.hidden = false;
  checkoutDialog.classList.add('payment-stage');
  checkoutDialog.classList.add('awaiting-transfer');
  currentQuote = {quote:result.order};
  renderCheckout(result.order);
  const expired = result.order.submissionState === 'expired';
  const ready = result.bank?.name && result.bank?.bsb && result.bank?.account;
  document.querySelector('#payment-heading').textContent = expired ? 'Payment window ended' : 'PAY NOW';
  document.querySelector('#payment-instructions').textContent = expired
    ? 'Do not send a new payment. If you already transferred, confirm below so we can review it. Your items are no longer reserved.'
    : ready ? 'Make your bank transfer now. Then return here and confirm.' : 'Bank details are unavailable. Do not send a new payment. If you already transferred, confirm below so we can review it.';
  const rows = [['Amount (AUD)', money(result.order.totalCents)], ...(ready ? [['Account name',result.bank.name],['BSB',result.bank.bsb],['Account number',result.bank.account]] : []), ['Payment reference',result.order.reference]];
  document.querySelector('#checkout-bank').replaceChildren(...rows.map(([label,value]) => {
    const row = document.createElement('div');
    const dt = document.createElement('dt'); dt.textContent = label;
    const dd = document.createElement('dd');
    const text = document.createElement('span'); text.textContent = value; dd.append(text);
    const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'checkout-back transfer-copy'; copy.textContent = 'Copy'; copy.setAttribute('aria-label','Copy ' + label);
    copy.addEventListener('click', () => copyPaymentValue(value, text, document.querySelector('#payment-copy-message'), label));
    dd.append(copy);
    row.append(dt,dd); return row;
  }));
  document.querySelector('#payment-hold').textContent = '';
  document.querySelector('#payment-hold').hidden = true;
  document.querySelector('#payment-copy-message').textContent = '';
  document.querySelector('#place-order-label').textContent = 'Submit order';
  document.querySelector('#place-order-total').textContent = '';
  document.querySelector('#checkout-back').textContent = 'Back to review';
  document.querySelector('#checkout-back').hidden = false;
  checkoutMessage.textContent = '';
  setOrdering(false);
  checkoutBody.scrollTop = 0;
  document.querySelector('#payment-heading').focus({preventScroll:true});
}

function showComplete(result) {
  checkoutDialog.classList.remove('awaiting-transfer');
  paymentConfirmation.checked = false;
  paymentConfirmation.disabled = true;
  paymentConfirmation.closest('label').hidden = true;
  checkoutDialog.classList.add('payment-stage');
  renderCheckout(result.order);
  paymentAttempt = null;
  renderCart();
  checkoutComplete = true;
  try { sessionStorage.removeItem(pendingPaymentKey); } catch {}
  try { sessionStorage.removeItem(checkoutDetailsKey); } catch {}
  paymentSection.hidden = deliveryDetails.hidden = reviewDetails.hidden = true;
  completeSection.hidden = false;
  document.querySelector('#complete-message').textContent = result.order.status === 'cancelled'
    ? `Your payment report for ${result.order.reference} has been submitted for review. The stock hold ended; please keep your bank receipt. We’ll check the transfer and contact you. Do not pay again.`
    : `Order ${result.order.reference} is submitted. You’ve told us the transfer is sent. We’ll check the deposit and email you when your order is shipped. Do not pay again.`;
  document.querySelector('#place-order-label').textContent = 'Continue shopping';
  document.querySelector('#place-order-total').textContent = '';
  document.querySelector('#checkout-back').hidden = true;
  placeOrder.disabled = false;
  checkoutMessage.textContent = '';
  document.querySelector('#complete-heading').focus({preventScroll:true});
}

async function resumePayment() {
  let saved;
  try { saved = JSON.parse(sessionStorage.getItem(pendingPaymentKey)); } catch {}
  if ((!saved?.id || !saved?.token) && paymentAttempt) saved = {id:paymentAttempt.order.id, token:paymentAttempt.token};
  if (!saved?.id || !saved?.token) return false;
  const result = await shopRequest('orders/' + saved.id, undefined, saved.token);
  result.token = saved.token;
  if (!checkoutDialog.open) checkoutDialog.showModal();
  if (result.order.submissionState === 'submitted') showComplete(result);
  else showPayment(result);
  return true;
}

function saveCheckoutDetails() {
  try {
    const customer = Object.fromEntries(['name','email','phone','address1','address2','city','state','postcode']
      .map(name => [name, checkoutForm.elements.namedItem(name)?.value || '']));
    sessionStorage.setItem(checkoutDetailsKey, JSON.stringify({customer, coupon:couponInput.value}));
  } catch { /* The form remains available in this tab. */ }
}

function fillCheckoutDetails(customer, coupon = '') {
  for (const [name, value] of Object.entries(customer || {})) {
    const field = checkoutForm.elements.namedItem(name);
    if (field && typeof value === 'string') field.value = value;
  }
  couponInput.value = coupon || '';
  saveCheckoutDetails();
}

function returnToCheckout(target, opener = cartOpener) {
  if (reopeningCheckout) return reopeningCheckout;
  if (!paymentAttempt || ordering) return;
  const pending = paymentAttempt;
  setOrdering(true);
  checkoutMessage.textContent = 'Restoring your order for editing…';
  reopeningCheckout = (async () => {
    try {
      // Let an older stock refresh finish before releasing the reserved items.
      if (catalogRequest) await catalogRequest;
      const restored = await shopRequest('orders/' + pending.order.id + '/reopen-checkout', {}, pending.token);
      paymentAttempt = null;
      orderAttempt = null;
      currentQuote = null;
      ++quoteVersion;
      fillCheckoutDetails(restored.customer, restored.order.coupon);
      for (const item of restored.order.items) {
        const key = cartKey(item.product, item.size);
        cart.set(key, {product:item.product, variant:item.size, quantity:(cart.get(key)?.quantity || 0) + item.quantity});
      }
      renderCart();
      try { sessionStorage.removeItem(pendingPaymentKey); } catch {}
      await refreshCatalog();
      if (target === 'cart') {
        checkoutDialog.close();
        openCart(opener);
      } else {
        if (!checkoutDialog.open) checkoutDialog.showModal();
        const customer = restored.customer;
        document.querySelector('#review-contact').textContent = [customer.name, customer.email, customer.phone].join('\n');
        document.querySelector('#review-address').textContent = [customer.address1, customer.address2, `${customer.city} ${customer.state} ${customer.postcode}`, 'Australia'].filter(Boolean).join('\n');
        showCheckoutStep(true);
        await updateQuote();
      }
    } catch (error) {
      checkoutMessage.textContent = error.message + ' Your saved payment has not been replaced.';
      if (!checkoutDialog.open) {
        setCartFeedback(checkoutMessage.textContent);
        openCart(opener);
      }
    } finally {
      setOrdering(false);
      reopeningCheckout = null;
    }
  })();
  return reopeningCheckout;
}

async function updateQuote({fromCoupon = false, items = checkoutItems()} = {}) {
  const version = ++quoteVersion;
  const coupon = couponInput.value.trim();
  currentQuote = null;
  placeOrder.disabled = true;
  couponApply.disabled = true;
  checkoutMessage.textContent = fromCoupon ? '' : 'Checking stock and delivery…';
  couponMessage.textContent = fromCoupon ? 'Checking code…' : '';
  try {
    const quote = await shopRequest('checkout/quote', {items, ...(coupon && {coupon})});
    if (version !== quoteVersion || !checkoutDialog.open) return null;
    currentQuote = {quote, input:coupon, items:JSON.stringify(items)};
    renderCheckout(quote);
    if (coupon && quote.shippingCents === 0) couponMessage.textContent = 'Free shipping applied.';
    else if (coupon && !quote.coupon) couponMessage.textContent = 'That coupon code is not valid.';
    else couponMessage.textContent = '';
    if (coupon && !quote.coupon && quote.shippingCents !== 0) {
      currentQuote = null;
      return null;
    }
    checkoutMessage.textContent = '';
    return currentQuote;
  } catch (error) {
    if (version !== quoteVersion || !checkoutDialog.open) return null;
    if (error.code === 'insufficient_stock') refreshCatalog();
    if (fromCoupon) couponMessage.textContent = error.message;
    else checkoutMessage.textContent = error.message;
    return null;
  } finally {
    if (version === quoteVersion) {
      placeOrder.disabled = ordering || !currentQuote;
      couponApply.disabled = ordering;
    }
  }
}

for (const button of document.querySelectorAll('.product-open')) {
  button.addEventListener('click', () => {
    openProduct(button);
    refreshCatalog();
  });
}
document.querySelector('#gallery-prev').addEventListener('click', () => setPhoto(photoIndex - 1));
document.querySelector('#gallery-next').addEventListener('click', () => setPhoto(photoIndex + 1));
const galleryStage = document.querySelector('.gallery-stage');
let galleryGesture;
galleryStage.addEventListener('pointerdown', event => {
  galleryGesture = event.isPrimary && event.button === 0 ? {x:event.clientX, y:event.clientY, id:event.pointerId} : null;
});
galleryStage.addEventListener('pointerup', event => {
  if (galleryGesture?.id === event.pointerId) {
    const dx = event.clientX - galleryGesture.x;
    const dy = event.clientY - galleryGesture.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) setPhoto(photoIndex + (dx < 0 ? 1 : -1));
  }
  galleryGesture = null;
});
galleryStage.addEventListener('pointercancel', () => { galleryGesture = null; });
document.querySelector('.gallery').addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    setPhoto(photoIndex + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
sizeOptions.addEventListener('change', event => {
  if (event.target.name !== 'size') return;
  activeVariant = event.target.value;
  quantity = 1;
  renderSelection();
});
quantityMinus.addEventListener('click', () => {
  if (quantity <= 1) return;
  quantity -= 1;
  renderSelection();
  if (quantityMinus.disabled && !quantityPlus.disabled) quantityPlus.focus({preventScroll: true});
});
quantityPlus.addEventListener('click', () => {
  if (!activeVariant || quantity >= remaining(activeProduct, activeVariant)) return;
  quantity += 1;
  renderSelection();
  if (quantityPlus.disabled) quantityMinus.focus({preventScroll: true});
});
document.querySelector('#buy').addEventListener('submit', event => {
  event.preventDefault();
  if (!catalogReady || !storeOpen) return;
  if (!activeVariant) {
    stockNote.textContent = 'Choose a size to continue.';
    sizeOptions.querySelector('input:not(:disabled)')?.focus({preventScroll:true});
    return;
  }
  if (quantity > remaining(activeProduct, activeVariant)) return;
  const key = cartKey(activeProduct, activeVariant);
  const totalQuantity = (cart.get(key)?.quantity ?? 0) + quantity;
  cart.set(key, {product: activeProduct, variant: activeVariant, quantity: totalQuantity});
  renderCart();
  productDialog.close();
  const {name} = products[activeProduct];
  const size = activeVariant === 'One size' ? activeVariant : `size ${activeVariant}`;
  setCartFeedback(`Added ${quantity} × ${name} (${size}) to your cart.`);
  showCart(productButton);
});
cartButton.addEventListener('click', () => {
  setCartFeedback('');
  showCart(cartButton);
  if (!paymentAttempt) refreshCatalog();
});

document.querySelector('#cart-continue').addEventListener('click', event => {
  if (cart.size) return;
  event.preventDefault();
  cartOpener = document.querySelector('#products .product-open');
  cartDialog.close();
  cartOpener.scrollIntoView({block: 'center'});
});

cartDialog.addEventListener('close', () => {
  if (!checkoutDialog.open) restoreCartOpener();
});
checkoutStart.addEventListener('click', async () => {
  if (paymentAttempt) { cartDialog.close(); try { await resumePayment(); } catch { checkoutDialog.showModal(); checkoutMessage.textContent = 'Could not refresh your payment details. Please reconnect and try again. Do not send another transfer.'; } return; }
  if (!cart.size || !catalogReady || !storeOpen) return;
  cartDialog.close();
  checkoutDialog.showModal();
  document.querySelector('#checkout-back').hidden = false;
  document.querySelector('#checkout-back').textContent = 'Back to cart';
  showCheckoutStep(false);
  setOrdering(false);
  document.querySelector('#checkout-totals').hidden = true;
  document.querySelector('#checkout-items').replaceChildren();
  document.querySelector('#place-order-total').textContent = '';
  updateQuote();
});
document.querySelector('#checkout-back').addEventListener('click', () => {
  if (ordering) return;
  if (paymentAttempt) { returnToCheckout('review'); return; }
  checkoutDialog.close();
  showCart(cartOpener);
  checkoutStart.focus({preventScroll: true});
  refreshCatalog();
});
checkoutDialog.addEventListener('cancel', event => {
  if (ordering) event.preventDefault();
});
editDelivery.addEventListener('click', () => showCheckoutStep(false));
couponApply.addEventListener('click', () => updateQuote({fromCoupon:true}));
couponInput.addEventListener('input', () => {
  ++quoteVersion;
  couponApply.disabled = false;
  couponMessage.textContent = 'Apply the code to update your total.';
  currentQuote = null;
  placeOrder.disabled = true;
});
couponInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    if (!ordering) updateQuote({fromCoupon:true});
  }
});
checkoutForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (checkoutComplete) { checkoutDialog.close(); return; }
  if (ordering) return;
  if (paymentAttempt) {
    if (!paymentConfirmation.checked) { checkoutMessage.textContent = 'Confirm that you’ve sent the transfer first.'; return; }
    setOrdering(true);
    checkoutMessage.textContent = 'Submitting your order…';
    try {
      const result = await shopRequest('orders/' + paymentAttempt.order.id + '/confirm-transfer', {paymentSent:true}, paymentAttempt.token);
      showComplete(result);
    } catch (error) { checkoutMessage.textContent = error.message + ' Your payment reference is unchanged. Do not transfer again; retry this button.'; }
    finally { if (!checkoutComplete) setOrdering(false); else { ordering = false; checkoutDialog.querySelector('.close').disabled = false; } }
    return;
  }
  if (!currentQuote || !checkoutForm.reportValidity()) return;
  const lastQuote = currentQuote;
  const items = checkoutItems();
  const customer = Object.fromEntries([...new FormData(checkoutForm)].map(([key,value]) => [key,value.trim()]));
  if (reviewDetails.hidden) {
    document.querySelector('#review-contact').textContent = [customer.name, customer.email, customer.phone].join('\n');
    document.querySelector('#review-address').textContent = [customer.address1, customer.address2, `${customer.city} ${customer.state} ${customer.postcode}`, 'Australia'].filter(Boolean).join('\n');
    showCheckoutStep(true);
    return;
  }
  setOrdering(true);
  try {
    const latest = await updateQuote({items});
    if (!latest) return;
    if (latest.quote.totalCents !== lastQuote.quote.totalCents || latest.items !== lastQuote.items || latest.items !== JSON.stringify(checkoutItems())) {
      checkoutMessage.textContent = 'Your order changed. Review it before placing your order.';
      return;
    }
    const payload = {items, ...(latest.input && {coupon:latest.input.toLowerCase()}), customer};
    const signature = JSON.stringify(payload);
    if (orderAttempt?.signature !== signature) orderAttempt = {signature, id:crypto.randomUUID()};
    checkoutMessage.textContent = 'Preparing your payment details…';
    const result = await shopRequest('orders', {...payload, requestId:orderAttempt.id});
    if (!result.order?.id || !result.token) throw new Error('We couldn’t open the order. Please retry with the same details.');
    if (result.order.submissionState === 'submitted') showComplete(result);
    else { cart.clear(); renderCart(); showPayment(result); }
  } catch (error) {
    checkoutMessage.textContent = error.message;
    if (error.code === 'insufficient_stock') refreshCatalog();
  } finally {
    if (!checkoutComplete) setOrdering(false);
    else { ordering = false; checkoutDialog.querySelector('.close').disabled = false; }
  }
});
checkoutDialog.addEventListener('close', () => {
  ++quoteVersion;
  if (!cartDialog.open) restoreCartOpener();
});

try {
  const saved = JSON.parse(sessionStorage.getItem(checkoutDetailsKey));
  if (saved) fillCheckoutDetails(saved.customer, saved.coupon);
} catch { /* Start with an empty delivery form if storage is unavailable. */ }
checkoutForm.addEventListener('input', saveCheckoutDetails);
checkoutForm.addEventListener('change', saveCheckoutDetails);
renderCart();
refreshCatalog();
resumePayment().catch(() => { if (!checkoutDialog.open) checkoutDialog.showModal(); checkoutMessage.textContent = 'Could not restore your payment step. Reconnect and press Retry payment details. Do not send another transfer.'; document.querySelector('#resume-payment').hidden = false; placeOrder.disabled = true; });
document.querySelector('#resume-payment').addEventListener('click', async event => { const retryButton = event.currentTarget; try { await resumePayment(); retryButton.hidden = true; } catch { checkoutMessage.textContent = 'Still unable to reconnect. Keep this tab and your transfer receipt, then try again.'; } });
window.addEventListener('pageshow', event => {
  if (event.persisted) refreshCatalog();
});
window.addEventListener('online', refreshCatalog);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !checkoutDialog.open) refreshCatalog();
});

// The two tee cards share the product gallery's photos and responsive sources.
const teePhotoInterval = 4300;
function startTeeLoop(stage, cardIndex) {
  const card = stage.closest('.card');
  const product = products[card.dataset.product];
  const link = stage.closest('.product-open');
  const images = [stage.querySelector('.photo')];
  let visible = false;
  let timer;
  let index = 0;

  function advance() {
    if (!canPlay()) return;
    const next = (index + 1) % images.length;
    if (images[next].complete && images[next].naturalWidth) {
      stage.querySelector('.is-outgoing')?.classList.remove('is-outgoing');
      images[index].classList.replace('is-current', 'is-outgoing');
      images[next].classList.add('is-current');
      index = next;
      link.dataset.photoIndex = String(index);
    }
    timer = setTimeout(advance, teePhotoInterval);
  }

  function canPlay() {
    return visible && !prefersStaticMedia() && !document.hidden && !document.querySelector('dialog[open]');
  }

  function sync() {
    clearTimeout(timer);
    if (!canPlay()) return;
    if (images.length === 1) {
      for (const [file, alt] of product.photos.slice(1)) {
        const image = new Image();
        image.className = 'photo';
        image.alt = alt;
        setProductImage(image, file, images[0].sizes);
        images.push(image);
        stage.append(image);
      }
    }
    // Offset the two cards so only one starts a dissolve at a time.
    timer = setTimeout(advance, teePhotoInterval + cardIndex * (teePhotoInterval / 2));
  }

  reducedMotion.addEventListener('change', sync);
  connection?.addEventListener?.('change', sync);
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('toggle', sync, true);
  document.addEventListener('close', sync, true);
  new IntersectionObserver(([entry]) => {
    visible = entry.intersectionRatio >= 0.12;
    sync();
  }, {threshold: [0, 0.12]}).observe(stage);
  sync();
}
document.querySelectorAll('.tee-photos').forEach(startTeeLoop);

// Warm the product galleries only after the opening and visible shop media.
// One low-priority image at a time avoids competing with the initial page.
const photoWarmQueue = [];
const photoWarmCache = new Map();
let photoWarmBusy = false;
let photoWarmStarted = false;
function warmProductPhotos(product, urgent = false) {
  for (const [file] of products[product].photos) {
    const key = file;
    if (photoWarmCache.has(key)) continue;
    const queued = photoWarmQueue.findIndex(job => job.key === key);
    if (queued !== -1) {
      if (urgent) {
        const [job] = photoWarmQueue.splice(queued, 1);
        job.urgent = true;
        photoWarmQueue.unshift(job);
      }
      continue;
    }
    const job = {key, file, urgent};
    if (urgent) photoWarmQueue.unshift(job);
    else photoWarmQueue.push(job);
  }
  drainPhotoWarmQueue();
}
function drainPhotoWarmQueue() {
  if (photoWarmBusy || document.hidden || document.body.classList.contains('opening') ||
      document.body.classList.contains('vault-open') || checkoutDialog.open) return;
  const job = photoWarmQueue.shift();
  if (!job) {
    if (photoWarmStarted) window.dispatchEvent(new Event('vctrs-product-photos-ready'));
    return;
  }
  photoWarmBusy = true;
  const image = new Image();
  image.fetchPriority = job.urgent ? 'high' : 'low';
  photoWarmCache.set(job.key, image);
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    photoWarmBusy = false;
    // Failed warmups can be retried naturally when the product is opened.
    if (!image.naturalWidth) photoWarmCache.delete(job.key);
    setTimeout(drainPhotoWarmQueue, 100);
  };
  image.onload = image.onerror = finish;
  setProductImage(image, job.file, '(max-width: 650px) calc(100vw - 58px), 580px');
}
function startPhotoWarmup() {
  if (photoWarmStarted || navigator.connection?.saveData) return;
  const visiblePhotos = [...document.querySelectorAll('.card .photo')].filter(image => {
    const rect = image.getBoundingClientRect();
    return rect.top < innerHeight && rect.bottom > 0;
  });
  const campaign = document.querySelector('#campaign');
  if (document.hidden || document.body.classList.contains('opening') || !catalogReady ||
      visiblePhotos.some(image => !image.complete) || (campaign && !campaign.paused && campaign.readyState < 4)) {
    setTimeout(startPhotoWarmup, 1000);
    return;
  }
  photoWarmStarted = true;
  for (const product of Object.keys(products)) warmProductPhotos(product);
}
for (const button of document.querySelectorAll('.product-open')) {
  const warm = () => warmProductPhotos(button.closest('[data-product]').dataset.product, true);
  button.addEventListener('pointerenter', warm, {once:true});
  button.addEventListener('focus', warm, {once:true});
  button.addEventListener('pointerdown', warm, {once:true, passive:true});
}
window.addEventListener('load', () => setTimeout(startPhotoWarmup, 1500), {once:true});
document.addEventListener('visibilitychange', () => { if (!document.hidden) drainPhotoWarmQueue(); });

window.addEventListener('vctrs-vault-visibility', event => { if (!event.detail.active) drainPhotoWarmQueue(); });
checkoutDialog.addEventListener('close', drainPhotoWarmQueue);


async function refreshPaymentHold() {
  if (!paymentAttempt || ordering || document.hidden) return;
  const pending = paymentAttempt;
  try {
    const result = await shopRequest('orders/' + pending.order.id, undefined, pending.token);
    if (paymentAttempt !== pending || ordering) return;
    result.token = pending.token;
    if (result.order.submissionState === 'submitted') { showComplete(result); return; }
    if (result.order.submissionState !== paymentAttempt.order.submissionState || JSON.stringify(result.bank) !== JSON.stringify(paymentAttempt.bank)) showPayment(result);
  } catch { /* Confirmation will recheck the held record and remains retryable. */ }
}
document.addEventListener('visibilitychange', refreshPaymentHold);
setInterval(refreshPaymentHold, 60000);
