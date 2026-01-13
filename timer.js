// Countdown timer manager
(function () {
  const DISPLAY_ID = 'timer-count';

  function formatTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm}:${ss.toString().padStart(2, '0')}`;
  }

  const Timer = {
    startSeconds: 120,
    remaining: 120,
    intervalId: null,
    running: false,
    onEnd: null,

    init(options = {}) {
      if (options.startSeconds != null) this.startSeconds = Number(options.startSeconds) || this.startSeconds;
      this.remaining = this.startSeconds;
      if (typeof options.onEnd === 'function') this.onEnd = options.onEnd;
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
          // default behavior: pause the game if possible
          try { if (typeof window.pauseGame === 'function') window.pauseGame(); } catch (e) {}
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
