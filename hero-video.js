// Load one optimized source with the existing muted inline/Safari playback fallback.
document.addEventListener('DOMContentLoaded', function() {
  const video = document.getElementById('hero-vid');
  const motionToggle = document.getElementById('hero-motion-toggle');
  if (!video) return;

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');

  const ensureHeroSource = () => {
    if (video.querySelector('source')) return;
    const source = document.createElement('source');
    // Assign one source only, before loading. Resizing never swaps variants.
    source.src = window.matchMedia('(max-width: 480px)').matches
      ? './video/hero-mobile-crf22.mp4'
      : './video/hero-desktop-crf22.mp4';
    source.type = 'video/mp4';
    video.appendChild(source);
    video.preload = 'none';
    video.load();
  };

  try {
    video.playbackRate = 0.90;
  } catch (e) {
  }

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersReducedMotion = motionPreference.matches;
  let allowKickstart = !prefersReducedMotion;

  const setMotionToggleState = (isPaused) => {
    if (!motionToggle) return;

    motionToggle.classList.toggle('is-paused', isPaused);
    motionToggle.setAttribute('aria-pressed', isPaused ? 'true' : 'false');
    motionToggle.setAttribute('aria-label', isPaused ? 'Play background video' : 'Pause background video');

    const screenReaderText = motionToggle.querySelector('.sr-only');
    if (screenReaderText) {
      screenReaderText.textContent = isPaused ? 'Play background video' : 'Pause background video';
    }
  };

  // A pending play() call is not proof that playback has actually started.
  const syncMotionToggleState = () => {
    setMotionToggleState(video.paused || video.ended || !video.classList.contains('is-ready'));
  };
  const onPlayRejected = () => {
    // An older rejected promise must not hide a newer successful playback.
    if (video.paused) video.classList.remove('is-ready');
    syncMotionToggleState();
  };
  const attemptPlayback = (onPlayed = () => {}) => {
    try {
      Promise.resolve(video.play()).then(() => {
        syncMotionToggleState();
        if (!video.paused) onPlayed();
      }).catch(onPlayRejected);
    } catch (_) {
      onPlayRejected();
    }
  };

  // Keep the still visible until a decoded frame is actually playing.
  video.addEventListener('playing', () => {
    video.classList.add('is-ready');
    syncMotionToggleState();
  });
  video.addEventListener('pause', syncMotionToggleState);
  video.addEventListener('ended', syncMotionToggleState);
  video.addEventListener('error', () => {
    video.classList.remove('is-ready');
    syncMotionToggleState();
  });
  syncMotionToggleState();

  const detachKickstartListeners = () => {
    document.removeEventListener('touchstart', kickstartPlayback);
    document.removeEventListener('click', kickstartPlayback);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pageshow', kickstartPlayback);
    video.removeEventListener('canplay', kickstartPlayback);
    video.removeEventListener('loadeddata', kickstartPlayback);
  };

  const kickstartPlayback = () => {
    if (!allowKickstart || !video.paused || document.hidden) return;

    attemptPlayback(detachKickstartListeners);
  };

  const onVisibilityChange = () => {
    if (!document.hidden) {
      kickstartPlayback();
    }
  };

  const toggleMotion = () => {
    allowKickstart = false;
    detachKickstartListeners();
    ensureHeroSource();

    if (video.paused || !video.classList.contains('is-ready')) {
      attemptPlayback();
    } else {
      video.pause();
      setMotionToggleState(true);
    }
  };

  if (prefersReducedMotion) {
    video.pause();
    setMotionToggleState(true);
  } else {
    syncMotionToggleState();

    const startHeroVideo = () => {
      if (!allowKickstart || motionPreference.matches) return;
      ensureHeroSource();
      kickstartPlayback();
    };
    const scheduleHeroVideo = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(startHeroVideo, { timeout: 2500 });
      } else {
        setTimeout(startHeroVideo, 1500);
      }
    };

    // Safari can reject the first play call before media is ready; retry on media/visibility events.
    document.addEventListener('touchstart', kickstartPlayback, { passive: true });
    document.addEventListener('click', kickstartPlayback);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', kickstartPlayback);
    video.addEventListener('canplay', kickstartPlayback);
    video.addEventListener('loadeddata', kickstartPlayback);

    if (document.readyState === 'complete') scheduleHeroVideo();
    else window.addEventListener('load', scheduleHeroVideo, { once: true });
  }

  // Respect preference changes after playback starts as well as initial load.
  motionPreference.addEventListener('change', (event) => {
    if (!event.matches) return;
    allowKickstart = false;
    detachKickstartListeners();
    video.pause();
    setMotionToggleState(true);
  });

  if (motionToggle) {
    motionToggle.addEventListener('click', toggleMotion);
  }
});
