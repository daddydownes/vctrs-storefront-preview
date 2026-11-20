(() => {
  const link = document.querySelector('.vault-link');
  if (!link || !HTMLDialogElement.prototype.showModal) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const constrained = connection?.saveData || /(^|-)2g$|^3g$/.test(connection?.effectiveType || '');
  const shell = document.createElement('dialog');
  shell.id = 'vault-shell';
  shell.setAttribute('aria-label', 'The Vault');
  shell.innerHTML = '<iframe title="The Vault — brand photographs"></iframe><div class="vault-shell-curtain"></div><div class="vault-shell-loading" role="status">Opening the Vault…</div><button class="vault-shell-back" type="button">↑ &nbsp; BACK TO STORE</button>';
  document.body.append(shell);
  const frame = shell.querySelector('iframe');
  const curtain = shell.querySelector('.vault-shell-curtain');
  const status = shell.querySelector('[role=status]');
  const back = shell.querySelector('button');
  let prepared = false, ready = false, open = false, moving = false;
  let savedScroll = 0, previousHash = '#previous-drops', errorTimer, transitionTimer;
  const delay = () => reducedMotion.matches ? 0 : 720;
  function activity(active) {
    frame.contentWindow?.postMessage({type: 'vctrs-vault-active', active}, location.origin);
    window.dispatchEvent(new CustomEvent('vctrs-vault-visibility', {detail: {active}}));
  }
  function prepare() {
    if (prepared) return;
    prepared = true;
    const url = new URL(link.href);
    url.searchParams.set('embedded', '1');
    frame.src = url.href;
    frame.addEventListener('load', () => activity(open));
  }
  function reveal() {
    if (!open || !shell.open || !ready) return;
    clearTimeout(errorTimer);
    shell.classList.add('vault-shell-ready');
    status.hidden = back.hidden = true;
    curtain.classList.remove('cover');
    frame.focus();
  }
  function enter(push = true) {
    if (open || moving) return;
    clearTimeout(transitionTimer);
    document.documentElement.classList.remove('vault-black-in');
    savedScroll = scrollY;
    previousHash = location.hash && location.hash !== '#vault' ? location.hash : '#previous-drops';
    if (push) history.pushState({vctrsVaultShell: true}, '', '#vault');
    open = moving = true;
    prepare();
    document.body.classList.add('vault-open');
    activity(true);
    document.documentElement.classList.add('vault-black-out');
    transitionTimer = setTimeout(() => {
      shell.showModal();
      document.documentElement.classList.remove('vault-black-out');
      moving = false;
      reveal();
      if (!ready) errorTimer = setTimeout(() => {
        status.textContent = 'The Vault is taking a moment to load. You can return to the store while it finishes.';
      }, 8000);
    }, delay());
  }
  function exit() {
    if (!open) return;
    open = false;
    moving = true;
    clearTimeout(transitionTimer);
    clearTimeout(errorTimer);
    document.documentElement.classList.remove('vault-black-out');
    curtain.classList.add('cover');
    transitionTimer = setTimeout(() => {
      shell.close();
      shell.classList.remove('vault-shell-ready');
      status.hidden = back.hidden = false;
      status.textContent = 'Opening the Vault…';
      activity(false);
      document.body.classList.remove('vault-open');
      scrollTo(0, savedScroll);
      link.focus({preventScroll: true});
      document.documentElement.classList.add('vault-black-in');
      transitionTimer = setTimeout(() => document.documentElement.classList.remove('vault-black-in'), reducedMotion.matches ? 0 : 660);
      moving = false;
      // Back/Forward can change the desired route during the outgoing fade.
      if (location.hash === '#vault') enter(false);
    }, delay());
  }
  function requestExit() {
    if (!open || moving) return;
    if (history.state?.vctrsVaultShell) history.back();
    else {
      history.replaceState(null, '', previousHash);
      exit();
    }
  }
  link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    enter();
  });
  back.addEventListener('click', requestExit);
  shell.addEventListener('cancel', event => { event.preventDefault(); requestExit(); });
  window.addEventListener('message', event => {
    if (event.source !== frame.contentWindow || event.origin !== location.origin) return;
    if (event.data?.type === 'vctrs-vault-ready') { ready = true; reveal(); }
    if (event.data?.type === 'vctrs-vault-close') requestExit();
  });
  window.addEventListener('popstate', () => {
    if (location.hash === '#vault') enter(false);
    else exit();
  });
  if (!constrained) {
    link.addEventListener('pointerenter', prepare, {once: true});
    link.addEventListener('focus', prepare, {once: true});
    window.addEventListener('vctrs-product-photos-ready', prepare, {once: true});
  }
  if (location.hash === '#vault') enter(false);
})();
