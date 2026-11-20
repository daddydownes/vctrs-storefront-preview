const orderMoney = new Intl.NumberFormat('en-AU', {style:'currency',currency:'AUD'});
const amount = cents => orderMoney.format(cents / 100);
const orderParams = new URLSearchParams(location.hash.slice(1));
const id = orderParams.get('id');
let token = orderParams.get('token');
const orderMessage = document.querySelector('#order-message');
const details = document.querySelector('#order-details');
const refresh = document.querySelector('#refresh-order');
const storageKey = 'vctrs-order-token:' + id;
let loading = false;
if (id) {
  try {
    if (token) sessionStorage.setItem(storageKey, token);
    else token = sessionStorage.getItem(storageKey);
  } catch { /* The link remains usable without browser storage. */ }
}

function bankRow(label, value, copyable) {
  const row = document.createElement('div');
  const title = document.createElement('dt');
  title.textContent = label;
  const content = document.createElement('dd');
  content.textContent = value;
  if (copyable && navigator.clipboard?.writeText) {
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copy';
    copy.setAttribute('aria-label', 'Copy ' + label);
    copy.addEventListener('click', async () => {
      const status = document.querySelector('#copy-message');
      try {
        await navigator.clipboard.writeText(value);
        status.textContent = label + ' copied.';
      } catch { status.textContent = 'Copy unavailable. You can select and copy the text.'; }
    });
    content.append(copy);
  }
  row.append(title, content);
  return row;
}

function renderOrder(order, bank) {
  const statuses = {
    awaiting_payment:'Awaiting payment',
    paid:'Payment confirmed',
    shipped:'Order shipped',
    cancelled:'Order cancelled',
    expired:'Order expired',
  };
  if (order.submissionState === 'draft' || order.submissionState === 'expired') {
    try { sessionStorage.setItem('vctrs-pending-transfer', JSON.stringify({id,token})); location.replace('index.html#products'); }
    catch { orderMessage.textContent = 'Keep this order link. Enable browser storage and return to checkout to submit your transfer confirmation.'; }
    return;
  }
  const waiting = order.status === 'awaiting_payment' && !order.paymentClaimedAt;
  const preview = order.mode === 'preview';
  const paymentReady = waiting && bank?.name && bank?.bsb && bank?.account;
  document.querySelector('#order-title').textContent = order.paymentClaimedAt && order.status === 'awaiting_payment' ? 'Transfer reported — awaiting bank confirmation' : statuses[order.status] || 'Your order';
  orderMessage.textContent = '';
  document.querySelector('#order-reference').textContent = order.reference;
  document.querySelector('#preview-order-note').hidden = !preview;
  document.querySelector('#amount-due').textContent = amount(order.totalCents);
  document.querySelector('#transfer-title-prefix').textContent = preview ? 'Test total' : 'Send';
  document.querySelector('#transfer-explanation').textContent = preview
    ? 'These sample details show how transfer instructions will look in the live store.'
    : 'Use your banking app to pay the amount shown. Enter the unique reference exactly as shown so we can match your payment to your order.';
  document.querySelector('#transfer-fulfillment').hidden = preview;
  document.querySelector('#transfer').hidden = !paymentReady;
  document.querySelector('#bank-unavailable').hidden = !waiting || paymentReady;
  document.querySelector('#copy-message').textContent = '';
  const bankDetails = document.querySelector('#bank-details');
  bankDetails.replaceChildren();
  if (paymentReady) {
    bankDetails.append(bankRow('Account name', bank.name, !preview), bankRow('BSB', bank.bsb, !preview), bankRow('Account number', bank.account, !preview), bankRow('Reference', order.reference, !preview));
  }
  const items = order.items.map(item => {
    const row = document.createElement('li');
    const label = document.createElement('div');
    label.textContent = item.name;
    if (['mesh', 'badge', 'hat'].includes(item.product)) {
      const photo = document.createElement('img');
      photo.src = 'assets/optimized/' + item.product + '-160.webp';
      photo.alt = item.name;
      photo.width = 48; photo.height = 64;
      photo.style.cssText = 'width:48px;height:64px;object-fit:cover;border-radius:6px;float:left;margin:0 12px 8px 0';
      label.prepend(photo);
    }
    const size = document.createElement('small');
    size.textContent = (item.size === 'One size' ? item.size : 'Size ' + item.size) + ' · Qty ' + item.quantity;
    label.append(size);
    const price = document.createElement('strong');
    price.textContent = amount(item.lineTotalCents);
    row.append(label, price);
    return row;
  });
  document.querySelector('#order-items').replaceChildren(...items);
  document.querySelector('#order-subtotal').textContent = amount(order.subtotalCents);
  document.querySelector('#order-shipping').textContent = order.shippingCents === 0 ? 'Free' : amount(order.shippingCents);
  document.querySelector('#order-total').textContent = amount(order.totalCents);
  const tracking = document.querySelector('#tracking');
  tracking.textContent = typeof order.tracking === 'string' && order.tracking ? 'Tracking: ' + order.tracking : '';
  tracking.hidden = !tracking.textContent;
  details.hidden = false;
}

async function loadOrder() {
  if (loading) return;
  if (!id || !token || id.length > 150 || token.length > 512 || /\s/.test(token)) {
    orderMessage.textContent = 'Open the full order link from your checkout or confirmation email.';
    return;
  }
  loading = true;
  refresh.hidden = false;
  refresh.disabled = true;
  document.querySelector('#transfer').hidden = true;
  orderMessage.textContent = 'Checking your order…';
  try {
    const response = await fetch('api/orders/' + encodeURIComponent(id), {
      cache:'no-store',
      headers:{Accept:'application/json', Authorization:'Bearer ' + token},
      signal:AbortSignal.timeout?.(15000),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.order) throw new Error(data?.error || 'We couldn’t load this order. Please try again.');
    renderOrder(data.order, data.bank);
  } catch (error) {
    // Stale bank instructions must not be shown when status cannot be refreshed.
    details.hidden = true;
    orderMessage.textContent = error.message;
  } finally {
    loading = false;
    refresh.disabled = false;
  }
}

refresh.addEventListener('click', loadOrder);
window.addEventListener('pageshow', event => { if (event.persisted) loadOrder(); });
loadOrder();

