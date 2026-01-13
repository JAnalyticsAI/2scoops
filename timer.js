// Countdown timer manager
(function () {
  const DISPLAY_ID = 'timer-count';

  function formatTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm}:${ss.toString().padStart(2, '0')}`;
  }

/* onEnd handler to show "Level Complete" after timer hits 0 */
  /* function defaultOnEnd() {
    // Show a level-complete overlay with actions: Next, Retry, Close
    try { if (typeof window.pauseGame === 'function') window.pauseGame(); } catch (e) {}

    let overlay = document.getElementById('level-complete-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'level-complete-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);z-index:2147483647;';

      const win = document.createElement('div');
      win.className = 'level-complete-window';
      win.style.cssText = 'background:#fff;padding:20px;border-radius:8px;min-width:260px;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,0.25);';

      const title = document.createElement('h2');
      title.textContent = 'Level Complete';

      const msg = document.createElement('p');
      const lvl = (window.levelManager && window.levelManager.current) ? window.levelManager.current : '';
      msg.textContent = lvl ? `Level ${lvl} complete!` : 'Level complete!';

      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-top:12px;';

      const nextBtn = document.createElement('button');
      nextBtn.textContent = 'Next Level';
      nextBtn.className = 'primary';
      nextBtn.addEventListener('click', () => {
        hideLevelComplete();
        try { if (window.levelManager && typeof window.levelManager.next === 'function') window.levelManager.next(); } catch (e) {}
        try { if (typeof window.resumeGame === 'function') window.resumeGame(); } catch (e) {}
      });

      const retryBtn = document.createElement('button');
      retryBtn.textContent = 'Retry';
      retryBtn.addEventListener('click', () => {
        hideLevelComplete();
        try { if (window.timerManager && typeof window.timerManager.reset === 'function') window.timerManager.reset(); } catch (e) {}
        try { if (typeof window.centerCube === 'function') window.centerCube(); } catch (e) {}
        try { if (typeof window.resumeGame === 'function') window.resumeGame(); } catch (e) {}
      });

      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Close';
      closeBtn.addEventListener('click', () => {
        hideLevelComplete();
        try { if (typeof window.resumeGame === 'function') window.resumeGame(); } catch (e) {}
      }); 

      actions.appendChild(nextBtn);
      actions.appendChild(retryBtn);
      actions.appendChild(closeBtn);

      win.appendChild(title);
      win.appendChild(msg);
      win.appendChild(actions);
      overlay.appendChild(win);
      document.body.appendChild(overlay);

      // focus the Next button for keyboard users
      setTimeout(() => { try { nextBtn.focus(); } catch (e) {} }, 0);
    } else {
      // update message and show
      const msg = overlay.querySelector('p');
      const lvl = (window.levelManager && window.levelManager.current) ? window.levelManager.current : '';
      if (msg) msg.textContent = lvl ? `Level ${lvl} complete!` : 'Level complete!';
      overlay.style.display = 'flex';
    }

    function hideLevelComplete() {
      const ov = document.getElementById('level-complete-overlay');
      if (ov) ov.style.display = 'none';
    }
  } */

  const Timer = {
    startSeconds: 120,
    remaining: 120,
    intervalId: null,
    running: false,
    onEnd: null,

    init(options = {}) {
      if (options.startSeconds != null) this.startSeconds = Number(options.startSeconds) || this.startSeconds;
      this.remaining = this.startSeconds;
      this.onEnd = (typeof options.onEnd === 'function') ? options.onEnd : defaultOnEnd;
      this.updateDOM();
      window.timerManager = this;
    },

    set(seconds) {
      this.startSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
      this.remaining = this.startSeconds;
      this.updateDOM();
    },

    start() {
      if (this.running) return;
      if (this.remaining <= 0) this.remaining = this.startSeconds;
      this.running = true;
      this.updateDOM();
      this.intervalId = setInterval(() => {
        this.remaining -= 1;
        this.updateDOM();
        if (this.remaining <= 0) {
          this.stop();
          try {
            if (typeof this.onEnd === 'function') this.onEnd();
          } catch (e) {}
          // NOTE: we no longer pause the game by default when the timer ends.
        }
      }, 1000);
    },

    pause() {
      if (!this.running) return;
      this.running = false;
      if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
      this.updateDOM();
    },

    stop() {
      this.pause();
      this.remaining = 0;
      this.updateDOM();
    },

    reset() {
      this.pause();
      this.remaining = this.startSeconds;
      this.updateDOM();
    },

    updateDOM() {
      const el = document.getElementById(DISPLAY_ID);
      if (el) el.textContent = formatTime(this.remaining);
    }
  };

  // Initialize on DOMContentLoaded with default 2:00 if not customized, then auto-start
  document.addEventListener('DOMContentLoaded', () => {
    Timer.init({ startSeconds: 120 });
    Timer.start();
  });
})();
