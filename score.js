// Score manager for Two Scoops Please
(function () {
  const STORAGE_KEY = 'twoscoops_score';

  const ScoreManager = {
    score: 0,
    init() {
      const stored = parseInt(localStorage.getItem(STORAGE_KEY), 10);
      this.score = Number.isInteger(stored) && stored >= 0 ? stored : 0;
      this.updateDOM();
      window.scoreManager = this;
    },
    set(value) {
      const n = Math.max(0, Math.floor(Number(value) || 0));
      this.score = n;
      localStorage.setItem(STORAGE_KEY, String(this.score));
      this.updateDOM();
    },
    add(value) {
      const n = Math.floor(Number(value) || 0);
      this.set(this.score + n);
    },
    reset() { this.set(0); },
    get() { return this.score; },
    updateDOM() {
      const el = document.getElementById('score-number');
      if (el) el.textContent = String(this.score);
    }
  };

  document.addEventListener('DOMContentLoaded', () => ScoreManager.init());
})();
