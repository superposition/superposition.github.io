/* The soundtrack control.

   The audio element ships with no source and preload="none", so not one byte of
   the track is requested until someone presses the button, and the button
   itself ships hidden so a reader without JavaScript never meets a control that
   cannot work. The remembered choice never starts playback: it paints the
   control for a listener who asked for the music before, and the press is still
   theirs to make. */

(() => {
  const audio = document.querySelector('[data-soundtrack-audio]');
  const button = document.querySelector('[data-soundtrack-toggle]');
  if (!audio || !button) return;

  const KEY = 'soundtrack';
  const LABEL = { on: 'Pause the soundtrack', off: 'Play the soundtrack' };

  const store = (on) => {
    try {
      localStorage.setItem(KEY, on ? 'on' : 'off');
    } catch (error) {
      /* A browser with storage off keeps the choice for this page only. */
    }
  };

  const remembered = () => {
    try {
      return localStorage.getItem(KEY) === 'on';
    } catch (error) {
      return false;
    }
  };

  const paint = (on) => {
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
    button.setAttribute('aria-label', on ? LABEL.on : LABEL.off);
  };

  const prefer = (on) => {
    button.setAttribute('data-pref', on ? 'on' : 'off');
    store(on);
  };

  button.setAttribute('data-pref', remembered() ? 'on' : 'off');
  paint(false);
  button.hidden = false;

  button.addEventListener('click', () => {
    if (!audio.paused) {
      audio.pause();
      prefer(false);
      return;
    }
    if (!audio.getAttribute('src')) audio.src = audio.getAttribute('data-src');
    const started = audio.play();
    if (started) started.catch(() => paint(false));
  });

  audio.addEventListener('play', () => {
    paint(true);
    prefer(true);
  });

  audio.addEventListener('pause', () => paint(false));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !audio.paused) audio.pause();
  });

  window.addEventListener('pagehide', () => {
    if (!audio.paused) audio.pause();
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) paint(false);
  });
})();
