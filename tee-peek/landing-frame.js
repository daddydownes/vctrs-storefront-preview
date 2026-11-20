const chosenSmile = frameFor(smileParams.get('frame'));
const portraitFinish = smileParams.get('finish') === 'photo';
const heroPhoto = document.querySelector('.campaign-photo');
const tallSource = document.querySelector('#tall-frame');
const phoneSource = document.querySelector('#phone-frame');
if (portraitFinish) {
  document.body.classList.add('portrait-finish');
  tallSource.media = '(orientation:portrait)';
  tallSource.sizes = 'max(100vw, 66.7vh)';
  tallSource.srcset = 'assets/optimized/mesh-brick-640.webp 640w, assets/optimized/mesh-brick.webp 933w';
  heroPhoto.sizes = 'max(100vw, 155vh)';
  heroPhoto.srcset = 'assets/freeze/campaign-pair-1120.webp 1120w, assets/freeze/campaign-pair-1920.webp 1920w';
  heroPhoto.src = 'assets/freeze/campaign-pair-1920.webp';
  heroPhoto.alt = 'VCTRS campaign photography featuring the V Star Mesh Tee.';
} else {
  tallSource.srcset = stillPath(chosenSmile, 'tall');
  phoneSource.srcset = stillPath(chosenSmile, 'phone');
  heroPhoto.src = stillPath(chosenSmile, 'wide');
  heroPhoto.alt = chosenSmile.name + ', outside the roller door in the V Star Mesh Tee.';
}
