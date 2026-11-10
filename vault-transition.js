(() => {
  const root = document.documentElement;
  const storageKey = 'vctrs-vault-transition';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let leaving = false;
  let pendingArrival;
  let timer;

  function clearBlackout() {
    clearTimeout(timer);
    root.classList.remove('vault-black-out', 'vault-black-hold', 'vault-black-in');
  }

  try {
    const ticket = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (ticket && ticket.until < Date.now()) sessionStorage.removeItem(storageKey);
    else if (ticket?.url === location.href) {
      sessionStorage.removeItem(storageKey);
      if (!reducedMotion.matches) pendingArrival = ticket.direction;
    }
  } catch {
    // Navigation still works if browser storage is unavailable.
  }

  if (pendingArrival) {
    root.classList.add('vault-black-hold');
    timer = setTimeout(() => {
      pendingArrival = undefined;
      clearBlackout();
    }, 7000);
  }

  function leave(direction, destination, {replace = false} = {}) {
    if (leaving) return;
    clearBlackout();
    pendingArrival = undefined;
    leaving = true;
    const url = new URL(destination, location.href);

    function navigate() {
      if (!reducedMotion.matches) {
        try {
          sessionStorage.setItem(storageKey, JSON.stringify({direction, url: url.href, until: Date.now() + 12000}));
        } catch {
          // The outgoing fade still works without storage.
        }
      }
      if (replace) location.replace(url.href);
      else location.assign(url.href);
    }

    if (reducedMotion.matches) navigate();
    else {
      root.classList.add('vault-black-out');
      // Match the 420ms fade and 300ms black hold from the approved preview.
      timer = setTimeout(navigate, 720);
    }
  }

  function arrive(direction) {
    if (pendingArrival !== direction) return;
    pendingArrival = undefined;
    clearBlackout();
    if (reducedMotion.matches) return;
    root.classList.add('vault-black-in');
    timer = setTimeout(clearBlackout, 660);
  }

  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    pendingArrival = undefined;
    leaving = false;
    clearBlackout();
  });
  window.vctrsVaultTransition = {leave, arrive};
})();
