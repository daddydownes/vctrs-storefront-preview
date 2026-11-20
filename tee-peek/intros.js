(() => {
  const choices = [...document.querySelectorAll('.takes a')];
  const replay = document.querySelector('#replay');
  const monitor = document.querySelector('#monitor');
  const full = document.querySelector('#full-demo');
  let selected;
  let currentFrame;

  function mount() {
    replay.hidden = true;
    const frame = document.createElement('iframe');
    frame.title = selected.querySelector('strong').textContent + ' — VCTRS intro and shop';
    frame.allow = 'autoplay';
    frame.src = selected.href;
    currentFrame = frame;
    monitor.replaceChildren(frame);
  }

  function select(slug) {
    selected = choices.find(link => link.dataset.intro === slug) || choices[0];
    for (const link of choices) {
      if (link === selected) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    full.href = selected.href;
    mount();
  }

  for (const link of choices) {
    link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      if (link !== selected) {
        const url = new URL(location.href);
        url.searchParams.set('intro', link.dataset.intro);
        history.pushState(null, '', url);
      }
      select(link.dataset.intro);
    });
  }
  window.addEventListener('message', event => {
    if (!currentFrame || event.source !== currentFrame.contentWindow || event.origin !== location.origin) return;
    const message = event.data;
    if (message?.type === 'vctrs-intro-replay' && typeof message.available === 'boolean') {
      replay.hidden = !message.available;
    }
  });
  replay.addEventListener('click', mount);
  window.addEventListener('popstate', () => select(new URLSearchParams(location.search).get('intro')));
  select(new URLSearchParams(location.search).get('intro'));
})();
