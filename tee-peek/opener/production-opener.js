// Original VCTRS opening, isolated from the production page's collection and Vault.
(function () {
  'use strict';

  const film = document.getElementById('film');
  const stage = document.getElementById('stage');
  const cardCover = document.getElementById('cardCover');
  const vslot = document.getElementById('vslot');
  const vbase = document.getElementById('vbase');
  const vpour = document.getElementById('vpour');
  const introVHalo = document.getElementById('introVHalo');
  const introGlowFront = document.getElementById('introGlowFront');
  const introGlowTail = document.getElementById('introGlowTail');
  let glowFrontLast = '', glowTailLast = '';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const directVault = false;
  const connection = navigator.connection;
  const compact = connection?.saveData || /(^|-)2g$|^3g$/.test(connection?.effectiveType || '');
  const portrait = matchMedia('(max-width:820px) and (orientation:portrait)').matches;
  const compactLandscape = compact || matchMedia('(max-width:1000px)').matches;
  const landscapeCut = compactLandscape ? 'desktop-compact' : 'desktop';
  const filmDirectory = 'assets/campaign-film/';
  const tallPhone = portrait && matchMedia('(max-aspect-ratio: 2/3)').matches;
  const phoneCut = tallPhone ? 'phone-tall' : 'phone';
  const cut = portrait ? phoneCut : landscapeCut;
  film.poster = filmDirectory + (portrait ? phoneCut : 'desktop') + '.jpg';
  const options = new URLSearchParams(location.search);
  const requestedFrame = options.get('hold');
  const sharedDissolve = options.get('intro') === 'gold-relay';
  const introScene = document.getElementById('introScene');
  stage.classList.toggle('shared-dissolve', sharedDissolve);
  const edit = ['90','112','117'].includes(requestedFrame) ? 'hold-' + requestedFrame + '/' : '';
  film.src = filmDirectory + edit + cut + '.mp4';
  const srcReady = Boolean(film.getAttribute('src'));
  let playWanted = false;
  let phase = 'ready';
  let begun = false;

  const embedded = parent !== window;
  const filePreview = location.protocol === 'file:';
  const messageOrigin = filePreview ? 'null' : location.origin;
  const targetOrigin = filePreview ? '*' : location.origin;
  function notify(type, reason) {
    if (embedded) parent.postMessage({type, reason, filmCut: cut}, targetOrigin);
  }

  // Warm the first frame under the original intro, then return to frame zero.
  // Every asynchronous completion belongs to either preparation or real playback.
  var filmPrimeGeneration=0, filmPrimeActive=false, filmPrimeFrame=0, filmPrimeKind='';
  var filmLaunchGeneration=0, filmLaunchPending=false, filmRevealFrame=0, filmRevealKind='';
  var filmPlayConfirmed=false, filmCrossfadeActive=false, filmRevealAt=0;
  function cancelFilmPrime(reset){
    filmPrimeGeneration++;
    if(filmPrimeFrame){
      if(filmPrimeKind==='video'&&film.cancelVideoFrameCallback) film.cancelVideoFrameCallback(filmPrimeFrame);
      else cancelAnimationFrame(filmPrimeFrame);
    }
    filmPrimeFrame=0;filmPrimeKind='';filmPrimeActive=false;
    if(reset&&phase==='ready'){
      film.pause();
      try{ if(film.currentTime>0)film.currentTime=0; }catch(_primeSeekError){}
    }
  }
  function completeFilmPrime(generation){
    if(generation!==filmPrimeGeneration||!filmPrimeActive||phase!=='ready'||document.hidden) return;
    filmPrimeFrame=0;filmPrimeKind='';filmPrimeActive=false;
    film.pause();
    try{ if(film.currentTime>0)film.currentTime=0; }catch(_primeSeekError){}
  }
  function queueFilmPrimeFrame(generation){
    if(generation!==filmPrimeGeneration||!filmPrimeActive||filmPrimeFrame||phase!=='ready'||document.hidden) return;
    if(film.requestVideoFrameCallback){
      filmPrimeKind='video';filmPrimeFrame=film.requestVideoFrameCallback(function(){completeFilmPrime(generation);});
    }else{
      filmPrimeKind='raf';filmPrimeFrame=requestAnimationFrame(function(){completeFilmPrime(generation);});
    }
  }
  function primeOpeningFilm(){
    if(!srcReady||phase!=='ready'||reduced||directVault||document.hidden||filmPrimeActive||playWanted) return;
    var generation=++filmPrimeGeneration;
    filmPrimeActive=true;film.muted=true;film.defaultMuted=true;film.playsInline=true;
    try{
      var preparing=film.play();
      if(preparing&&preparing.then) preparing.then(function(){queueFilmPrimeFrame(generation);},function(){
        if(generation===filmPrimeGeneration&&phase==='ready'){filmPrimeActive=false;}
      });
    }catch(_primePlayError){filmPrimeActive=false;}
  }
  function cancelFilmReveal(){
    filmLaunchGeneration++;filmPlayConfirmed=false;
    if(filmRevealFrame){
      if(filmRevealKind==='video'&&film.cancelVideoFrameCallback) film.cancelVideoFrameCallback(filmRevealFrame);
      else cancelAnimationFrame(filmRevealFrame);
    }
    filmRevealFrame=0;filmRevealKind='';
  }
  function revealOpeningFilm(generation){
    if(generation!==filmLaunchGeneration||!filmLaunchPending||!filmPlayConfirmed||phase!=='playing'||document.hidden) return;
    filmRevealFrame=0;filmRevealKind='';
    if(film.readyState < HTMLMediaElement.HAVE_CURRENT_DATA){
      queueFilmReveal(generation);
      return;
    }
    filmLaunchPending=false;
    filmCrossfadeActive=true;
    filmRevealAt=sharedDissolve ? film.currentTime : motionNow();
    stage.classList.add('playing','opening-crossfade');wakeMotion();
    // The parent paints the real shop heading over this film. Sample the media
    // clock so the lettering also waits during buffering and background pauses.
    if (embedded) {
      notify('vctrs-film-playing');
      let previousTime = -1;
      addMotionTask(() => {
        const seconds = film.currentTime;
        if (seconds !== previousTime && seconds >= 2.5) {
          parent.postMessage({type:'vctrs-film-time', seconds}, targetOrigin);
          previousTime = seconds;
        }
        return phase === 'playing';
      });
    }
  }
  function queueFilmReveal(generation){
    if(generation!==filmLaunchGeneration||!filmLaunchPending||!filmPlayConfirmed||filmRevealFrame||phase!=='playing'||document.hidden) return;
    if(film.requestVideoFrameCallback){
      filmRevealKind='video';filmRevealFrame=film.requestVideoFrameCallback(function(){revealOpeningFilm(generation);});
    }else{
      filmRevealKind='raf';filmRevealFrame=requestAnimationFrame(function(){revealOpeningFilm(generation);});
    }
  }
  function requestOpeningPlayback(){
    var generation=++filmLaunchGeneration;
    filmPlayConfirmed=false;
    try{
      var playback=film.play();
      if(playback&&playback.then) playback.then(function(){
        if(generation!==filmLaunchGeneration||phase!=='playing'||document.hidden) return;
        filmPlayConfirmed=true;queueFilmReveal(generation);
      },function(){
        if(generation===filmLaunchGeneration&&phase==='playing'&&!document.hidden) failOpen();
      });
      else {filmPlayConfirmed=true;queueFilmReveal(generation);}
    }catch(_openingPlayError){if(generation===filmLaunchGeneration&&phase==='playing'&&!document.hidden) failOpen();}
  }
  film.addEventListener('playing',function(){
    if(phase==='ready'&&filmPrimeActive) queueFilmPrimeFrame(filmPrimeGeneration);
    else if(phase==='playing'&&filmLaunchPending) queueFilmReveal(filmLaunchGeneration);
  });

  // Keep the V timing independent of time spent in a hidden tab.
  let hiddenAt = document.hidden ? performance.now() : null;
  let timePaused = 0;
  let motionFrame = 0;
  let lastTick = 0;
  let watchdog = 0;
  const motionTasks = new Set();
  function motionNow() {
    return (hiddenAt ?? performance.now()) - timePaused;
  }
  function tick() {
    motionFrame = 0;
    if (document.hidden || phase === 'done') return;
    lastTick = performance.now();
    for (const task of [...motionTasks]) {
      if (task(0, motionNow()) === false) motionTasks.delete(task);
    }
    wakeMotion();
  }
  function wakeMotion() {
    if (motionFrame || document.hidden || !motionTasks.size || phase === 'done') return;
    motionFrame = requestAnimationFrame(tick);
  }
  function addMotionTask(task) {
    motionTasks.add(task);
    wakeMotion();
    return task;
  }

  var VWHITE=[255,255,255], VGOLD=[240,212,146];
  function vs2l(c){c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
  function vl2sf(l){l=l<0?0:l>1?1:l;var v=l<=0.0031308?l*12.92:1.055*Math.pow(l,1/2.4)-0.055;return (v*255).toFixed(2);}
  function vlerp(a,b,t){return 'rgb('+vl2sf(vs2l(a[0])+(vs2l(b[0])-vs2l(a[0]))*t)+','+vl2sf(vs2l(a[1])+(vs2l(b[1])-vs2l(a[1]))*t)+','+vl2sf(vs2l(a[2])+(vs2l(b[2])-vs2l(a[2]))*t)+')';}
  function vclamp(p){return p<0?0:p>1?1:p;}
  function vout(p){return 1-Math.pow(1-p,3);}
  function vinout(p){return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;}
  /* Compact opening: reveal, gold pour, one restrained glow, then motion. */
  var VI={FADE:500, WHITE:500, POUR:800, HOLD:600, EXIT:320, F:20, WARM:320};
  /* the solo V centres its BODY, but the star fills the mark's top-right:
     measured on the traced path, V-body mid-x = 42.0% of mark width, bbox mid-x
     = 49.9% — so a bbox-centred mark parks the V body ~8% of its width LEFT of
     screen centre and reads off-centre. Bias the solo position right by that.
     ×k: dx lands in UNSCALED parent px but the offset lives on the k-scaled mark;
     0.122 accounts for the body offset and the vSLOT's .1em trailing margin.
     Verified: the V body sits on the visual centre at desktop and mobile sizes. */
  VI.STARX=0.122;
  VI.glowA=VI.FADE+VI.WHITE+VI.POUR;
  VI.exitA=VI.glowA+VI.HOLD;
  VI.launch=VI.exitA+VI.EXIT;
  VI.end=VI.launch;
  var vRect=null, vGlowRect=null, glowNeedsPlacement=true, vStart=0, vFired=false, introTask=null;
  /* measured ONCE with the transform cleared — a per-tick read would feed the
     last frame's transform back into the measurement (the demo bug) */
  function vMeasure(){
    vslot.style.transform='none'; vRect=vslot.getBoundingClientRect();
    // pin the pour copy 1:1 over the BASE svg (CSS height:100% tracked the slot's
    // line box — font-strut tall — and painted a second offset V during the pour)
    var br=vbase.getBoundingClientRect();
    vGlowRect=br; glowNeedsPlacement=true;
    vpour.style.left=(br.left-vRect.left).toFixed(2)+'px';
    vpour.style.top=(br.top-vRect.top).toFixed(2)+'px';
    vpour.style.width=br.width.toFixed(2)+'px';
    vpour.style.height=br.height.toFixed(2)+'px';
  }
  function vRender(te){
    var fade=vinout(vclamp(te/VI.FADE));
    var pourT=vclamp((te-(VI.FADE+VI.WHITE))/VI.POUR), pv=vout(pourT);
    vbase.style.color=vlerp(VWHITE,VGOLD,vout(vclamp((te-(VI.FADE+VI.WHITE))/VI.WARM)));
    var pos=pv*(100+2*VI.F)-VI.F;
    var m='linear-gradient(to bottom, rgba(0,0,0,0) '+(pos-VI.F).toFixed(2)+'%, #000 '+(pos+VI.F).toFixed(2)+'%, #000 100%)';
    vpour.style.opacity=(pourT>=1?0:1); vpour.style.color='#fff';
    vpour.style.webkitMaskImage=m; vpour.style.maskImage=m;
    // Emit light only from the part of the V already becoming gold. This
    // gradient is inside the blur, so its travelling edge stays soft.
    var front=vclamp((pos-8)/100).toFixed(4), tail=vclamp((pos+12)/100).toFixed(4);
    if(front!==glowFrontLast){introGlowFront.setAttribute('offset',front);glowFrontLast=front;}
    if(tail!==glowTailLast){introGlowTail.setAttribute('offset',tail);glowTailLast=tail;}
    // The original exit overlaps the first moving frame. If Safari is still
    // preparing it, hold the finished V rather than fade to a blank poster.
    var exit=1;
    if(filmCrossfadeActive){
      if(sharedDissolve){
        // Composite the entire black-and-gold card above the decoded film.
        // A single opacity curve keeps both its silhouette and its light in step.
        const t=vclamp((film.currentTime-filmRevealAt)/.64);
        exit=1-t*t*(3-2*t);
        introScene.style.opacity=String(exit);
      }else{
        exit=1-vinout(vclamp((motionNow()-filmRevealAt)/VI.EXIT));
      }
    }
    const markOpacity=fade*(sharedDissolve ? 1 : exit);
    // One continuous swell crests as the pour completes, then rests warm.
    var ignition=vout(vclamp(pourT/0.75));
    var breath=Math.sin(Math.PI*vclamp((te-(VI.FADE+VI.WHITE+400))/850));
    var gA=ignition*(0.34+0.34*breath);
    introVHalo.style.opacity=(markOpacity*gA).toFixed(3);
    var soloH=Math.min(innerHeight*0.38,320), k=soloH/vRect.height;
    /* clientWidth, not innerWidth: innerWidth counts a classic scrollbar and
       would push the otherwise centred V several pixels to the right. */
    var dx=document.documentElement.clientWidth/2-(vRect.left+vRect.width/2)+vRect.width*k*VI.STARX, dy=innerHeight/2-(vRect.top+vRect.height/2);
    vslot.style.transform='translate('+dx.toFixed(1)+'px,'+dy.toFixed(1)+'px) scale('+k.toFixed(4)+')';
    vslot.style.opacity=markOpacity.toFixed(3);
    if(glowNeedsPlacement){
      // Place once per measurement, outside the scaled/masked title wrapper.
      var host=stage.getBoundingClientRect();
      introVHalo.style.left=(vRect.left+vRect.width/2+dx+(vGlowRect.left-vRect.left-vRect.width/2)*k-host.left).toFixed(2)+'px';
      introVHalo.style.top=(vRect.top+vRect.height/2+dy+(vGlowRect.top-vRect.top-vRect.height/2)*k-host.top).toFixed(2)+'px';
      introVHalo.style.width=(vGlowRect.width*k).toFixed(2)+'px';
      introVHalo.style.height=(vGlowRect.height*k).toFixed(2)+'px';
      glowNeedsPlacement=false;
    }
    if(filmCrossfadeActive&&exit<=0){filmCrossfadeActive=false;stage.classList.remove('opening-crossfade');}
    if(te>=VI.exitA && !vFired){ vFired=true; play(); }
  }

  let lastFilmTime = 0;
  let lastFilmProgress = 0;
  let resumeFilm = false;
  let pausedAnimations = [];

  function play() {
    if (!begun || phase !== 'ready') return;
    if (!srcReady) { failOpen('missing-film'); return; }
    if (document.hidden) { playWanted = true; return; }
    playWanted = false;
    cancelFilmPrime(true);
    cancelFilmReveal();
    phase = 'playing';
    filmLaunchPending = true;
    lastFilmTime = film.currentTime;
    lastFilmProgress = motionNow();
    requestOpeningPlayback();
  }

  function finish(reason) {
    if (phase === 'done') return;
    phase = 'done';
    cancelFilmPrime(false);
    cancelFilmReveal();
    filmLaunchPending = false;
    filmCrossfadeActive = false;
    if (motionFrame) cancelAnimationFrame(motionFrame);
    clearInterval(watchdog);
    motionTasks.clear();
    film.pause();
    // Calling load(), seeking or showing the old black card here would
    // displace the decoded frame before the parent has painted its still.
    if (reason !== 'ended') {
      cardCover.style.display = 'block';
      cardCover.style.opacity = '1';
    }
    stage.classList.remove('playing', 'opening-crossfade');
    stage.classList.add('done', 'cardend');
    notify('vctrs-opener-complete', reason);
  }

  function failOpen(reason = 'blocked') {
    finish(reason);
  }

  function begin() {
    if (begun) return;
    begun = true;
    if (reduced) { finish('reduced-motion'); return; }
    document.getElementById('titleBlock').style.opacity = '';
    vMeasure();
    vStart = motionNow();
    introTask = addMotionTask(function (_, now) {
      if (phase !== 'ready' && !filmLaunchPending && !filmCrossfadeActive) return false;
      vRender(Math.min(now - vStart, VI.end + 1));
    });
    vRender(0);
    primeOpeningFilm();

    // Safari can hold frame callbacks while preparing a clip. Keep the V
    // present until playback progresses and leave a stalled clip safely.
    watchdog = setInterval(function () {
      if (document.hidden || phase === 'done') return;
      if (motionTasks.size && performance.now() - lastTick > 200) {
        if (motionFrame) cancelAnimationFrame(motionFrame);
        tick();
      }
      if (phase !== 'playing') return;
      if (film.currentTime > lastFilmTime) {
        lastFilmTime = film.currentTime;
        lastFilmProgress = motionNow();
      }
      if (film.ended) finish('ended');
      else if (motionNow() - lastFilmProgress > 15000) failOpen('stalled');
    }, 250);
  }

  addEventListener('resize', function () {
    if (!begun || reduced || (phase !== 'ready' && !filmLaunchPending && !filmCrossfadeActive)) return;
    vMeasure();
    vRender(Math.min(motionNow() - vStart, VI.end + 1));
  });

  addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (hiddenAt === null) hiddenAt = performance.now();
      if (!begun || phase === 'done') return;
      if (motionFrame) cancelAnimationFrame(motionFrame);
      motionFrame = 0;
      pausedAnimations = (document.getAnimations?.() || []).filter(animation => animation.playState === 'running');
      for (const animation of pausedAnimations) animation.pause();
      cancelFilmPrime(true);
      cancelFilmReveal();
      resumeFilm = phase === 'playing' && !film.ended && (filmLaunchPending || !film.paused);
      if (resumeFilm) film.pause();
    } else {
      if (hiddenAt !== null) timePaused += performance.now() - hiddenAt;
      hiddenAt = null;
      if (!begun || phase === 'done') return;
      for (const animation of pausedAnimations) if (animation.playState === 'paused') animation.play();
      pausedAnimations = [];
      if (resumeFilm) { resumeFilm = false; requestOpeningPlayback(); }
      else if (phase === 'ready') {
        if (playWanted) play();
        else primeOpeningFilm();
      }
      wakeMotion();
    }
  });

  function arm() {
    if (begun && phase === 'ready') play();
  }
  let startTouchY = null;
  addEventListener('wheel', arm, {passive: true});
  addEventListener('touchstart', event => { startTouchY = event.touches[0]?.clientY ?? null; }, {passive: true});
  addEventListener('touchmove', event => {
    const y = event.touches[0]?.clientY;
    if (startTouchY !== null && y !== undefined && Math.abs(y - startTouchY) >= 16) { startTouchY = null; arm(); }
  }, {passive: true});
  addEventListener('touchend', () => { startTouchY = null; }, {passive: true});
  addEventListener('touchcancel', () => { startTouchY = null; }, {passive: true});
  addEventListener('keydown', event => {
    if (begun && phase === 'ready' && [' ', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      arm();
    }
  });

  film.addEventListener('ended', () => finish('ended'));
  film.addEventListener('error', () => { if (begun) failOpen('media-error'); });

  if (embedded) {
    addEventListener('message', function (event) {
      if (event.source === parent && event.origin === messageOrigin && event.data?.type === 'vctrs-opener-start') begin();
    });
    notify('vctrs-opener-ready');
  } else {
    begin();
  }
})();
