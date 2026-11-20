const opener = document.querySelector('.opener');
const store = document.querySelector('#store');
const photo = document.querySelector('.campaign-photo');
const heading = document.getElementById('drop-title');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const connection = navigator.connection;
const devicePreview = smileParams.has('device');
const origin = location.protocol === 'file:' ? 'null' : location.origin;
const targetOrigin = origin === 'null' ? '*' : origin;
const introChoices = ['gold-aperture', 'gold-relay', 'rise', 'relay', 'aperture', 'tracking', 'gold'];
const selectedIntro = introChoices.includes(smileParams.get('intro')) ? smileParams.get('intro') : 'gold-aperture';
const goldLetters = selectedIntro === 'gold-aperture';
const teePeek = goldLetters && (smileParams.get('preview') === 'tee-peek' || !smileParams.has('intro'));
document.body.classList.toggle('tee-peek', teePeek);
const intro = goldLetters ? 'aperture' : selectedIntro;
const originalIntro = !smileParams.has('intro') && smileParams.get('opening') !== 'campaign';
heading.classList.toggle('gold-letters', goldLetters);
const polishedGold = intro === 'gold-relay';
const campaign = photo.closest('.campaign');
const dropLink = campaign.querySelector('.scroll-link');
const header = document.querySelector('.storebar');
const cartFadeTarget = document.querySelector(goldLetters ? '#floating-cart' : '.store-top');

let titleMotion;
let openerFrame;
let fallbackTimer;
let revealing = false;
let matchingStill = '';
let decodedStill = '';

function rememberDecodedStill() {
  const src = photo.currentSrc;
  if (!src) return;
  photo.decode().then(() => {
    if (src === photo.currentSrc) decodedStill = src;
  }).catch(() => {});
}
photo.addEventListener('load', rememberDecodedStill);
if (photo.complete) rememberDecodedStill();

function notifyGallery(available) {
  if (parent !== window) parent.postMessage({type:'vctrs-intro-replay', available}, targetOrigin);
}
function prefersStaticMedia() {
  return reducedMotion.matches || Boolean(connection?.saveData);
}
function useFilmStill() {
  document.querySelector('#tall-frame').srcset = 'assets/freeze/phone-tall.webp';
  document.querySelector('#phone-frame').srcset = 'assets/freeze/phone.webp';
  photo.srcset = 'assets/freeze/desktop.webp';
  photo.src = 'assets/freeze/desktop.webp';
  photo.alt = 'The VCTRS crew outside the roller door at the end of the film.';
}
if (photo.complete && !photo.naturalWidth) useFilmStill();
else photo.addEventListener('error', useFilmStill, {once:true});

function fadeAt(seconds, start, end) {
  const t = Math.min(1, Math.max(0, (seconds - start) / (end - start)));
  return t * t * (3 - 2 * t);
}
function paintFilmTime(seconds) {
  titleMotion.seek(seconds);
  // Keep per-frame style updates local to the elements that are fading.
  campaign.style.setProperty('--shade-ink', fadeAt(seconds, polishedGold ? 2.95 : 3.25, 4.6).toFixed(3));
  dropLink.style.opacity = fadeAt(seconds, polishedGold ? 4.18 : 4.45, 5).toFixed(3);
  if (goldLetters) {
    header.style.opacity = fadeAt(seconds, 3.44, 4.88).toFixed(3);
    cartFadeTarget.style.opacity = fadeAt(seconds, 3.68, 5).toFixed(3);
  } else {
    const navOpacity = fadeAt(seconds, polishedGold ? 4.25 : 4.68, 5).toFixed(3);
    header.style.opacity = navOpacity;
    cartFadeTarget.style.opacity = navOpacity;
  }
  // In the encoded hold, the movie and this photograph depict the same frame.
  // Let the decoded photograph take over before a mobile decoder releases its surface.
  const canHold = !portraitFinish && chosenSmile.frame < 125 && seconds >= chosenSmile.frame / 25
    && decodedStill === matchingStill && photo.currentSrc === matchingStill && Boolean(matchingStill);
  document.body.classList.toggle('film-hold', canHold);
  if (canHold) photo.parentElement.style.setProperty('--still-ink', fadeAt(seconds, chosenSmile.frame / 25, 4.94));
}

async function revealStore(playedToEnd = false) {
  if (opener.hidden || revealing) return;
  revealing = true;
  clearTimeout(fallbackTimer);
  notifyGallery(playedToEnd && !prefersStaticMedia());
  // Finish the title synchronously at the film cut, even if the image decoder is busy.
  paintFilmTime(5);
  titleMotion.finish();
  if (playedToEnd) {
    await Promise.race([photo.decode().catch(() => {}), new Promise(resolve => setTimeout(resolve, 1000))]);
  }
  store.inert = false;
  if (teePeek && playedToEnd && !prefersStaticMedia()) document.body.classList.add('show-tees');
  document.body.classList.remove('opening');
  opener.classList.add('fade');
  await Promise.allSettled(opener.getAnimations().map(animation => animation.finished));
  opener.hidden = true;
  openerFrame?.remove();
  openerFrame = undefined;
  document.body.classList.remove('film-hold');
  campaign.style.removeProperty('--shade-ink');
  photo.parentElement.style.removeProperty('--still-ink');
  for (const element of [dropLink, header, cartFadeTarget]) element.style.removeProperty('opacity');
}
function playOpening() {
  titleMotion = createTitleMotion(heading, intro);
  titleMotion.seek(0);
  window.scrollTo({top:0, behavior:'instant'});
  if (originalIntro) document.body.append(opener);
  document.body.classList.toggle('film-timed-header', goldLetters && !originalIntro);
  document.body.classList.add('opening');
  store.inert = true;
  opener.hidden = false;
  openerFrame = document.createElement('iframe');
  openerFrame.title = 'VCTRS opening film';
  openerFrame.tabIndex = -1;
  openerFrame.setAttribute('aria-hidden', 'true');
  openerFrame.allow = 'autoplay';
  openerFrame.src = originalIntro
    ? 'original-opener.html?embedded=1'
    : 'production-opener.html?embedded=1&hold=' + chosenSmile.frame + '&intro=' + intro;
  opener.append(openerFrame);
  armOpeningTimeout();
}
function armOpeningTimeout() {
  clearTimeout(fallbackTimer);
  if (!document.hidden && !opener.hidden && !revealing) {
    fallbackTimer = setTimeout(() => revealStore(), 18000);
  }
}
document.addEventListener('visibilitychange', armOpeningTimeout);
window.addEventListener('message', event => {
  if (!openerFrame || event.source !== openerFrame.contentWindow || event.origin !== origin || revealing) return;
  const message = event.data;
  if (message?.type === 'vctrs-opener-ready') {
    const crop = {'desktop':'wide', 'desktop-compact':'wide', 'phone':'phone', 'phone-tall':'tall'}[message.filmCut];
    if (crop) matchingStill = new URL(stillPath(chosenSmile, crop), document.baseURI).href;
    openerFrame.contentWindow.postMessage({type:'vctrs-opener-start'}, targetOrigin);
  } else if (message?.type === 'vctrs-film-playing') {
    notifyGallery(true);
  } else if (message?.type === 'vctrs-film-time' && Number.isFinite(message.seconds)) {
    paintFilmTime(message.seconds);
  } else if (message?.type === 'vctrs-opener-complete') {
    revealStore(message.reason === 'ended');
  }
});
function syncMediaPreference() {
  if (prefersStaticMedia() && !opener.hidden) revealStore();
}
reducedMotion.addEventListener('change', syncMediaPreference);
connection?.addEventListener?.('change', syncMediaPreference);
const galleryUrl = 'intros.html?intro=' + selectedIntro;
for (const link of document.querySelectorAll('[data-frame-picker]')) {
  link.href = 'frames.html?frame=' + chosenSmile.id;
  link.target = '_top';
}
document.querySelector('[data-intro-gallery]').href = galleryUrl;
if (smileParams.has('intro')) {
  const logo = document.querySelector('.storebar .logo');
  logo.href = galleryUrl;
  logo.setAttribute('aria-label','VCTRS — compare intros');
}
if (!prefersStaticMedia() && !devicePreview && !location.hash && typeof createTitleMotion === 'function') playOpening();
else notifyGallery(false);
document.documentElement.classList.remove('intro-pending');

if (polishedGold || teePeek) {
  document.querySelector('.scroll-link').addEventListener('click', event => {
    if (prefersStaticMedia() || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    // The anchor owns focus, history and the destination. Limit smooth scrolling
    // to this activation, so restoration and other links keep their usual behavior.
    const root = document.documentElement;
    root.classList.add('follow-drop');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('follow-drop')));
  });
}
