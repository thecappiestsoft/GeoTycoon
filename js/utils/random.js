/*
 * Deterministyczny generator pseudolosowy (mulberry32) z ziarnem zapisywanym w stanie gry.
 * Dzięki temu wczytana rozgrywka losuje te same zdarzenia.
 */
(function (GT) {
  function next(state) {
    var t = (state.rngState = (state.rngState + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function weightedPick(state, items, weightFn) {
    var total = 0;
    for (var i = 0; i < items.length; i++) total += Math.max(0, weightFn(items[i]));
    if (total <= 0) return null;
    var r = next(state) * total;
    for (var j = 0; j < items.length; j++) {
      r -= Math.max(0, weightFn(items[j]));
      if (r < 0) return items[j];
    }
    return items[items.length - 1];
  }

  function newSeed() {
    return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  }

  GT.random = { next: next, weightedPick: weightedPick, newSeed: newSeed };
})(window.GT = window.GT || {});
