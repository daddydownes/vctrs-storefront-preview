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
  const srcReady = Boolean(film.getAttribute('src'));
  let playWanted = false;
  let phase = 'ready';
  let begun = false;

  const embedded = parent !== window;
  const filePreview = location.protocol === 'file:';
  const messageOrigin = filePreview ? 'null' : location.origin;
  const targetOrigin = filePreview ? '*' : location.origin;
  function notify(type, reason) {
    if (embedded) parent.postMessage({type, reason}, targetOrigin);
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
    filmRevealFrame=0;filmRevealKind='';filmLaunchPending=false;
    filmCrossfadeActive=true;filmRevealAt=motionNow();
    stage.classList.add('playing','opening-crossfade');startCam();wakeMotion();
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

  // Use the original foreground-only time base for the V and the black dip.
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
    var exit=filmCrossfadeActive?1-vinout(vclamp((motionNow()-filmRevealAt)/VI.EXIT)):1;
    // One continuous swell crests as the pour completes, then rests warm.
    var ignition=vout(vclamp(pourT/0.75));
    var breath=Math.sin(Math.PI*vclamp((te-(VI.FADE+VI.WHITE+400))/850));
    var gA=ignition*(0.34+0.34*breath);
    introVHalo.style.opacity=(fade*exit*gA).toFixed(3);
    var soloH=Math.min(innerHeight*0.38,320), k=soloH/vRect.height;
    /* clientWidth, not innerWidth: innerWidth counts a classic scrollbar and
       would push the otherwise centred V several pixels to the right. */
    var dx=document.documentElement.clientWidth/2-(vRect.left+vRect.width/2)+vRect.width*k*VI.STARX, dy=innerHeight/2-(vRect.top+vRect.height/2);
    vslot.style.transform='translate('+dx.toFixed(1)+'px,'+dy.toFixed(1)+'px) scale('+k.toFixed(4)+')';
    vslot.style.opacity=(fade*exit).toFixed(3);
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

  /* ===== COVER+ — the virtual camera (Jacob's pick from the fit demo) =====
     Same full-bleed fit, gentle drift and decoded-frame callbacks. Reframe
     on this edit's actual 30fps cuts, keeping the hat, bike and faces in the
     phone crop. The footage itself is the user's complete, unchanged cut. */
  var SHOTS=[
    [0,17/30,                 44,35, 45,35, 1.05,1.05],
    [17/30,36/30,             48,40, 49,40, 1.04,1.03],
    [36/30,48/30,             55,40, 56,40, 1.03,1.03],
    [48/30,76/30,             55,45, 57,45, 1.03,1.03],
    [76/30,90/30,             53,35, 54,35, 1.03,1.03],
    [90/30,97/30,             54,35, 54,35, 1.03,1.03],
    [97/30,112/30,            50,40, 50,40, 1.030,1.004],
    [112/30,99,               50,50, 50,50, 1.004,1.004]
  ];
  function camAt(t){
    var s=SHOTS[SHOTS.length-1];
    // Browser frame metadata may round PTS to microseconds.
    for(var i=0;i<SHOTS.length;i++){ if(t+0.000001<SHOTS[i][1]){ s=SHOTS[i]; break; } }
    var u=(t-s[0])/Math.max(0.001,s[1]-s[0]);
    u=u<0?0:u>1?1:u; u=u*u*(3-2*u);          // smooth drift within the shot
    return [t, s[2]+(s[4]-s[2])*u, s[3]+(s[5]-s[3])*u, Math.max(1,s[6]+(s[7]-s[6])*u)];
  }
  var camHandle=0, camKind='', camRunning=false, camGen=0, camLastTime=-1;
  /* hold frame 0 already framed as SHOT 0 — otherwise the first cam tick snaps
     50%/50%/scale(1) → shot-0 framing the very instant the film starts
     (that was the visible jitter at launch). Reduced-motion keeps the plain
     full-frame hold, since startCam never runs there. */
  if(!reduced){
    var c0=camAt(0);
    film.style.objectPosition=c0[1].toFixed(2)+'% '+c0[2].toFixed(2)+'%';
    film.style.transform='scale('+c0[3].toFixed(4)+')';
  }
  function paintCam(t){
    if(t===camLastTime) return; camLastTime=t;
    var c=camAt(t||0);
    film.style.objectPosition=c[1].toFixed(2)+'% '+c[2].toFixed(2)+'%';
    film.style.transform='scale('+c[3].toFixed(4)+')';
  }
  function cancelCamFrame(){
    camGen++;
    if(camHandle){
      if(camKind==='video'&&film.cancelVideoFrameCallback) film.cancelVideoFrameCallback(camHandle);
      else cancelAnimationFrame(camHandle);
    }
    camHandle=0; camKind='';
  }
  function queueCam(){
    if(!camRunning||camHandle||phase!=='playing'||document.hidden||film.paused||film.ended) return;
    var gen=camGen;
    if(film.requestVideoFrameCallback){
      camKind='video';
      camHandle=film.requestVideoFrameCallback(function(_,meta){
        camHandle=0; if(gen!==camGen) return;
        paintCam(meta&&isFinite(meta.mediaTime)?meta.mediaTime:(film.currentTime||0)); queueCam();
      });
    }else{
      camKind='raf';
      camHandle=requestAnimationFrame(function(){ camHandle=0; if(gen!==camGen) return; paintCam(film.currentTime||0); queueCam(); });
    }
  }
  function startCam(){
    if(reduced) return;
    if(!camRunning){ camRunning=true; camGen++; camLastTime=-1; paintCam(film.currentTime||0); }
    queueCam();
  }
  function stopCam(){ // path has already settled at centre/1 — this just pins it
    camRunning=false; cancelCamFrame(); camLastTime=-1;
    film.style.objectPosition='50% 50%';
    film.style.transform='';
  }
  film.addEventListener('playing',function(){if(phase==='playing'&&!filmLaunchPending)startCam();});
  film.addEventListener('pause',function(){ if(camRunning) cancelCamFrame(); });
  film.addEventListener('seeked',function(){ if(camRunning){ paintCam(film.currentTime||0); queueCam(); } });
  addEventListener('visibilitychange',function(){ if(document.hidden) cancelCamFrame(); else if(camRunning) queueCam(); });

  let lastFilmTime = 0;
  let lastFilmProgress = 0;
  let resumeFilm = false;
  let ending = false;
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
    stopCam();
    cardCover.style.display = 'block';
    cardCover.style.opacity = '1';
    stage.classList.remove('playing', 'opening-crossfade');
    stage.classList.add('done', 'cardend');
    notify('vctrs-opener-complete', reason);
  }

  function failOpen(reason = 'blocked') {
    finish(reason);
  }

  function fadeToStore() {
    if (ending || phase !== 'playing') return;
    ending = true;
    cardCover.style.display = 'block';
    // The same 200 ms smootherstep to true black as on vctrsclo.com.
    const COVER = 200;
    const t0 = motionNow();
    addMotionTask(function (_, now) {
      const t = Math.min(1, Math.max(0, (now - t0) / COVER));
      cardCover.style.opacity = (t*t*t*(t*(t*6-15)+10)).toFixed(4);
      if (t >= 1) { finish('ended'); return false; }
    });
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
      if (phase !== 'playing' || ending) return;
      if (film.currentTime > lastFilmTime) {
        lastFilmTime = film.currentTime;
        lastFilmProgress = motionNow();
      }
      if (film.ended) fadeToStore();
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

  film.addEventListener('ended', fadeToStore);
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
