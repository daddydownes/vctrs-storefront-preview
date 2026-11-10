const products = {
  mesh: {
    name: 'V Star Mesh Tee',
    price: 60,
    stock: {M: 1, L: 2},
    photos: [
      ['mesh.jpg', 'Front of the V Star Mesh Tee'],
      ['mesh-brick.jpg', 'V Star Mesh Tee against a brick wall'],
      ['mesh-group.jpg', 'Group wearing the V Star Mesh Tee'],
    ],
  },
  badge: {
    name: 'Black Badge Tee',
    price: 50,
    stock: {S: 2, M: 12, XL: 2, '2XL': 2},
    photos: [
      ['badge.jpg', 'Front of the Black Badge Tee'],
      ['badge-duo.jpg', 'Two people wearing Black Badge Tees'],
      ['badge-car.jpg', 'Black Badge Tees styled beside a car'],
    ],
  },
  hat: {
    name: 'VCTRS Trucker Hat',
    price: 50,
    stock: {'One size': 40},
    photos: [
      ['hat.jpg', 'Close-up of the VCTRS Trucker Hat'],
      ['hat-front.jpg', 'Front view of the VCTRS Trucker Hat'],
      ['hat-side.jpg', 'Side view of the VCTRS Trucker Hat showing the mesh panel'],
    ],
  },
};

const shipping = 10;
const cartStorageKey = 'vctrs-demo-cart';
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
const checkoutReview = document.querySelector('#checkout-review');
const checkoutConfirmation = document.querySelector('#checkout-confirmation');
const galleryPhoto = document.querySelector('#gallery-photo');
const thumbnails = document.querySelector('#thumbs');
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
      if (row.quantity < 1 || row.quantity > stock[row.variant]) continue;
      saved.set(cartKey(row.product, row.variant), row);
    }
  } catch {
    // The demo can still run when browser storage is unavailable.
  }
  return saved;
}

function remaining(product, variant) {
  return products[product].stock[variant] - (cart.get(cartKey(product, variant))?.quantity ?? 0);
}

function setPhoto(index) {
  const photos = products[activeProduct].photos;
  photoIndex = (index + photos.length) % photos.length;
  const [file, description] = photos[photoIndex];
  galleryPhoto.src = 'assets/' + file;
  galleryPhoto.alt = description;
  galleryCount.textContent = `${photoIndex + 1} / ${photos.length}`;
  for (const [position, thumb] of [...thumbnails.children].entries()) {
    thumb.setAttribute('aria-pressed', String(position === photoIndex));
  }
}

function renderSelection() {
  const product = products[activeProduct];
  const available = activeVariant ? remaining(activeProduct, activeVariant) : 0;
  const allInCart = Object.keys(product.stock).every(variant => remaining(activeProduct, variant) === 0);
  quantityMinus.disabled = quantity <= 1;
  quantityPlus.disabled = quantity >= available;
  quantityValue.textContent = quantity;
  add.disabled = quantity > available;
  addLabel.textContent = allInCart ? 'Stock limit reached' : activeVariant ? 'Add to cart' : 'Select a size';
  addTotal.textContent = available > 0 ? '$' + product.price * quantity : '';

  if (allInCart) stockNote.textContent = 'All available stock is already in your cart.';
  else if (!activeVariant) stockNote.textContent = 'Select a size to choose a quantity.';
  else if (available <= 3) stockNote.textContent = `Only ${available} available to add.`;
  else if (quantity === available) stockNote.textContent = 'Maximum available quantity selected.';
  else stockNote.textContent = 'In stock';
}

function openProduct(button) {
  activeProduct = button.closest('[data-product]').dataset.product;
  productButton = button;
  const product = products[activeProduct];
  document.querySelector('#product-name').textContent = product.name;
  document.querySelector('#product-price').textContent = '$' + product.price;
  thumbnails.replaceChildren(...product.photos.map(([file, description], index) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'thumb';
    thumb.setAttribute('aria-label', description);
    const image = document.createElement('img');
    image.src = 'assets/' + file;
    image.alt = '';
    thumb.append(image);
    thumb.addEventListener('click', () => setPhoto(index));
    return thumb;
  }));
  setPhoto(0);
  const variants = Object.keys(product.stock);
  const oneSize = variants.length === 1;
  activeVariant = oneSize ? variants[0] : null;
  quantity = 1;
  sizeField.hidden = oneSize;
  productFit.hidden = !oneSize;
  productFit.textContent = oneSize ? variants[0] : '';
  sizeOptions.replaceChildren(...(oneSize ? [] : variants.map(variant => {
    const available = remaining(activeProduct, variant) > 0;
    const option = document.createElement('label');
    option.className = 'size-option';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'size';
    radio.value = variant;
    radio.disabled = !available;
    if (!available) radio.setAttribute('aria-label', `${variant}, stock limit reached`);
    const label = document.createElement('span');
    label.textContent = variant;
    option.append(radio, label);
    return option;
  })));
  renderSelection();
  productDialog.showModal();
  productScroll.scrollTop = 0;
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
    subtotal += products[product].price * units;
  }
  return {count, subtotal, total: subtotal + (count ? shipping : 0)};
}

function updateCartButton({count, subtotal}) {
  floatingCartCount.textContent = count;
  floatingCartSubtotal.textContent = '$' + subtotal;
  floatingCartSubtotal.hidden = count === 0;
  const itemCount = count === 1 ? '1 item' : `${count} items`;
  cartButton.setAttribute('aria-label', count ? `Open cart, ${itemCount}, subtotal $${subtotal}` : 'Open empty cart');
}

function restoreCartOpener() {
  const opener = cartOpener?.isConnected ? cartOpener : cartButton;
  opener.focus({preventScroll: true});
}

function showCart(opener) {
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
  let nextFocus;
  cartList.replaceChildren();
  for (const [key, item] of cart) {
    const {name, price, photos, stock} = products[item.product];

    const row = document.createElement('li');
    row.className = 'cart-item';
    const image = document.createElement('img');
    image.className = 'cart-photo';
    image.src = 'assets/' + photos[0][0];
    image.alt = '';
    const label = document.createElement('div');
    label.className = 'cart-item-main';
    const itemName = document.createElement('strong');
    itemName.className = 'cart-item-name';
    itemName.textContent = name;
    const variant = document.createElement('span');
    variant.className = 'cart-variant';
    variant.textContent = item.variant === 'One size' ? item.variant : 'Size ' + item.variant;
    label.append(itemName, variant);

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
    plus.disabled = item.quantity >= stock[item.variant];
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
    lineTotal.textContent = '$' + price * item.quantity;
    row.append(image, label, controls, lineTotal);
    cartList.append(row);

    if (key === focusKey) {
      if (focusAction === 'remove') nextFocus = remove;
      else if (focusAction === 'plus') nextFocus = !plus.disabled ? plus : minus;
      else nextFocus = !minus.disabled ? minus : plus;
      if (nextFocus.disabled) nextFocus = remove;
    }
  }
  document.querySelector('#bag-empty').hidden = count > 0;
  document.querySelector('#bag-totals').hidden = count === 0;
  document.querySelector('#subtotal').textContent = '$' + subtotal;
  document.querySelector('#total').textContent = '$' + total;
  checkoutStart.hidden = count === 0;
  document.querySelector('#checkout-cta-total').textContent = '$' + total;
  updateCartButton(totals);
  if (focusKey) (nextFocus || cartDialog.querySelector('.close')).focus({preventScroll: true});
}

function changeCartQuantity(key, change) {
  const item = cart.get(key);
  const nextQuantity = item.quantity + change;
  if (nextQuantity < 1 || nextQuantity > products[item.product].stock[item.variant]) return;
  item.quantity = nextQuantity;
  setCartFeedback('');
  renderCart(key, change > 0 ? 'plus' : 'minus');
}

function renderCheckout({subtotal, total}) {
  const rows = [];
  for (const {product, variant, quantity: units} of cart.values()) {
    const {name, price} = products[product];
    const row = document.createElement('li');
    row.className = 'checkout-line';
    const details = document.createElement('div');
    details.className = 'checkout-line-detail';
    const itemName = document.createElement('strong');
    itemName.className = 'checkout-line-name';
    itemName.textContent = name;
    const itemVariant = document.createElement('span');
    itemVariant.className = 'checkout-line-variant';
    itemVariant.textContent = `${variant === 'One size' ? variant : 'Size ' + variant} · Qty ${units}`;
    details.append(itemName, itemVariant);
    const amount = document.createElement('strong');
    amount.className = 'checkout-line-total';
    amount.textContent = '$' + price * units;
    row.append(details, amount);
    rows.push(row);
  }
  document.querySelector('#checkout-items').replaceChildren(...rows);
  document.querySelector('#checkout-subtotal').textContent = '$' + subtotal;
  document.querySelector('#checkout-total').textContent = '$' + total;
  checkoutReview.hidden = false;
  checkoutConfirmation.hidden = true;
}

for (const button of document.querySelectorAll('.product-open')) {
  button.addEventListener('click', () => openProduct(button));
}
document.querySelector('#gallery-prev').addEventListener('click', () => setPhoto(photoIndex - 1));
document.querySelector('#gallery-next').addEventListener('click', () => setPhoto(photoIndex + 1));
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
  if (!activeVariant || quantity > remaining(activeProduct, activeVariant)) return;
  const key = cartKey(activeProduct, activeVariant);
  const totalQuantity = (cart.get(key)?.quantity ?? 0) + quantity;
  cart.set(key, {product: activeProduct, variant: activeVariant, quantity: totalQuantity});
  renderCart();
  productDialog.close();
  setCartFeedback(quantity === 1 ? 'Added to cart' : `Added ${quantity} items to your cart`);
  showCart(productButton);
});
cartButton.addEventListener('click', () => {
  setCartFeedback('');
  showCart(cartButton);
});

cartDialog.addEventListener('close', () => {
  if (!checkoutDialog.open) restoreCartOpener();
});
checkoutStart.addEventListener('click', () => {
  const totals = getCartTotals();
  if (!totals.count) return;
  renderCheckout(totals);
  cartDialog.close();
  checkoutDialog.showModal();
  checkoutReview.scrollTop = 0;
});
document.querySelector('#checkout-back').addEventListener('click', () => {
  checkoutDialog.close();
  showCart(cartOpener);
  checkoutStart.focus({preventScroll: true});
});
document.querySelector('#place-demo-order').addEventListener('click', () => {
  const {count, total} = getCartTotals();
  if (!count) return;
  cart.clear();
  setCartFeedback('');
  renderCart();
  document.querySelector('#checkout-placed-total').textContent = '$' + total;
  checkoutReview.hidden = true;
  checkoutConfirmation.hidden = false;
  document.querySelector('#checkout-done').focus({preventScroll: true});
});
checkoutDialog.addEventListener('close', () => {
  if (!cartDialog.open) restoreCartOpener();
});

renderCart();
