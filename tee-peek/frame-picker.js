const choices = document.querySelector('.choices');
function showChoice(frame) {
  choices.querySelector('input[value="' + frame.id + '"]').checked = true;
  document.querySelector('#selected-frame').textContent = frame.id + ' · ' + frame.name;
  for (const [id,crop] of [['wide-proof','wide'],['phone-proof','tall']]) {
    const img = document.getElementById(id);
    img.src = stillPath(frame, crop);
    img.alt = frame.name + ' at ' + frame.time + ' seconds, ' + (crop === 'wide' ? 'desktop framing.' : 'phone framing.');
  }
  document.querySelector('#watch-hold').href = 'shop.html?frame=' + frame.id;
  document.querySelector('#watch-photo').href = 'shop.html?frame=' + frame.id + '&finish=photo';
}
showChoice(frameFor(smileParams.get('frame')));
choices.addEventListener('change', event => {
  const frame = frameFor(event.target.value);
  showChoice(frame);
  const url = new URL(location.href);
  url.searchParams.set('frame', frame.id);
  history.replaceState(null, '', url);
});
