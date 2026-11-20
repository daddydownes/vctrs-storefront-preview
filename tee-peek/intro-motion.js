/* The player supplies media time. These effects have no independently running clock. */
function createTitleMotion(heading, styleName) {
  const words = Array.from(heading.querySelectorAll('.title-word'));
  const ink = words.map(word => word.querySelector('.title-ink'));
  const effects = [];
  const decorations = [];

  function effect(element, start, end, frames, easing = 'linear') {
    const animation = element.animate(frames, {
      delay: start * 1000,
      duration: (end - start) * 1000,
      fill: 'both',
      easing
    });
    animation.pause();
    animation.currentTime = 0;
    effects.push(animation);
  }

  function decorate(parent, className) {
    const layer = document.createElement('span');
    layer.className = className;
    layer.setAttribute('aria-hidden', 'true');
    parent.append(layer);
    decorations.push(layer);
    return layer;
  }

  const arrive = 'cubic-bezier(.24,.60,.28,1)';
  const sweep = 'cubic-bezier(.42,0,.28,1)';
  const up = distance => 'translateY(' + distance + 'em)';

  function pourGold(index, outlineAt, fillAt, coolAt, end) {
    const word = ink[index];
    const storefrontColor = getComputedStyle(word).color;
    const outline = decorate(words[index], 'title-outline');
    outline.textContent = word.textContent;
    effect(outline, outlineAt, end, [
      {opacity: 0}, {opacity: 1, offset: .23},
      {opacity: 1, offset: .69}, {opacity: 0}
    ]);
    const closed = 'inset(100% -22% -15% -15%)';
    effect(word, fillAt, end, [
      {opacity: 0, clipPath: closed},
      {opacity: 1, clipPath: closed, offset: .02},
      {opacity: 1, clipPath: 'inset(-18% -22% -15% -15%)'}
    ], sweep);
    effect(word, coolAt, end, [
      {color: '#ebcc8f'}, {color: storefrontColor}
    ], 'cubic-bezier(.30,.32,.65,.78)');
  }

  function softGold(word, index, start, fillAt, coolAt, end) {
    const fill = ink[index];
    const storefrontColor = getComputedStyle(fill).color;
    const outline = decorate(word, 'title-outline');
    outline.textContent = fill.textContent;
    effect(outline, start, end, [
      {opacity: 0, easing: 'ease-in-out'}, {opacity: .83, offset: .28},
      {opacity: .76, offset: .55, easing: 'ease-in-out'}, {opacity: 0}
    ]);
    if (CSS.supports('mask-clip', 'no-clip')) {
      fill.classList.add('soft-gold-fill');
      effect(fill, fillAt, end - .06, [
        {opacity: 0, maskPosition: '50% 0%'},
        {opacity: 1, offset: .16},
        {opacity: 1, maskPosition: '50% 100%'}
      ], 'cubic-bezier(.39,.08,.43,.97)');
    } else {
      effect(fill, fillAt, end - .06, [
        {opacity: 0, clipPath: 'inset(105% -22% -15% -15%)'},
        {opacity: 1, clipPath: 'inset(-18% -22% -15% -15%)'}
      ], sweep);
    }
    effect(fill, coolAt, end, [
      {color: '#ebcc8f'}, {color: storefrontColor}
    ], 'ease-in-out');
  }

  switch (styleName) {
    case 'relay':
      ink.forEach((word, index) => {
        effect(word, index ? 4.14 : 3.52, index ? 5 : 4.45, [
          {opacity: 0, transform: up(.64)},
          {opacity: 1, transform: up(0)}
        ], index ? 'cubic-bezier(.26,.70,.50,.95)' : arrive);
      });
      break;

    case 'aperture':
      ink.forEach((word, index) => {
        const closed = index ? 'inset(-28% 100% -28% -1%)' : 'inset(-28% -1% -28% 100%)';
        effect(words[index], 3.70, 5, [
          {clipPath: closed, opacity: 0},
          {clipPath: closed, opacity: 1, offset: .025},
          {clipPath: 'inset(-28% -22% -28% -15%)', opacity: 1}
        ], sweep);
        // Keep the masks fixed at the seam while each word slides home.
        effect(word, 3.70, 5, [
          {transform: 'translateX(' + (index ? '-.30em' : '.30em') + ')'},
          {transform: 'translateX(0)'}
        ], 'cubic-bezier(.32,.48,.61,.90)');
      });
      break;

    case 'tracking': {
      // The moving copy is out of flow so tracking never nudges the shop link.
      const tracked = decorate(heading, 'title-tracked');
      words.forEach((word, i) => {
        if (i) tracked.append(document.createTextNode(' '));
        tracked.append(word.cloneNode(true));
      });
      const type = getComputedStyle(heading);
      const finalSpacing = (parseFloat(type.letterSpacing) || 0) / parseFloat(type.fontSize);
      const fontSize = parseFloat(type.fontSize);
      const spareWidth = Math.max(0, heading.parentElement.clientWidth - heading.offsetWidth - fontSize * .16);
      const openSpacing = Math.min(.11, finalSpacing + spareWidth / (tracked.textContent.length * fontSize));
      words.forEach(word => effect(word, 0, 5, [{opacity: 0}, {opacity: 0}]));
      effect(tracked, 3.55, 5, [
        {opacity: 0, letterSpacing: openSpacing + 'em', transform: up(.10)},
        {opacity: 1, offset: .56},
        {opacity: 1, letterSpacing: finalSpacing + 'em', transform: up(0)}
      ], 'cubic-bezier(.27,.56,.46,.935)');
      break;
    }

    case 'gold':
      words.forEach((word, i) => pourGold(i, 3.46, i ? 3.90 : 3.80, 4.48, 5));
      break;

    case 'gold-relay':
      words.forEach((word, i) => {
        const start = i ? 3.57 : 3.17;
        const end = i ? 5 : 4.61;
        effect(word, start, end, [
          {transform: up(.33)}, {transform: up(0)}
        ], 'cubic-bezier(.34,.055,.52,.95)');
        softGold(word, i, start, start + .08, start + .49, end);
      });
      break;

    default:
      effect(heading, 3.65, 5, [
        {opacity: 0, transform: up(.42)},
        {opacity: 1, transform: up(0)}
      ], 'cubic-bezier(.35,.49,.64,.90)');
  }

  return {
    seek(seconds) {
      const milliseconds = Math.max(0, Math.min(5000, seconds * 1000));
      for (const animation of effects) animation.currentTime = milliseconds;
    },
    finish() {
      for (const animation of effects) animation.cancel();
      effects.length = 0;
      for (const decoration of decorations) decoration.remove();
      decorations.length = 0;
      for (const word of ink) word.classList.remove('soft-gold-fill');
    }
  };
}
