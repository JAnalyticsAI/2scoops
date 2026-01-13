// Level manager for Two Scoops Please
(function () {
  const STORAGE_KEY = 'twoscoops_level';

  const LevelManager = {
    current: 1,
    init() {
      const stored = parseInt(localStorage.getItem(STORAGE_KEY), 10);
      this.current = Number.isInteger(stored) && stored > 0 ? stored : 1;
      this.updateDOM();
      window.levelManager = this;
    },
    set(level) {
      const n = Math.max(1, Math.floor(Number(level) || 1));
      this.current = n;
      localStorage.setItem(STORAGE_KEY, String(this.current));
      this.updateDOM();
    },
    next() { this.set(this.current + 1); },
    prev() { this.set(Math.max(1, this.current - 1)); },
    reset() { this.set(1); },
    updateDOM() {
      const el = document.getElementById('level-number');
      if (el) el.textContent = String(this.current);
    }
  };

  document.addEventListener('DOMContentLoaded', () => LevelManager.init());
})();
