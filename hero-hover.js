/* Headline hover: letters swell as the cursor gets close, then ease back.
   Add data-prox to any headline to use it. Words inside <em> get the bigger swell.
   Lines are found from the way the browser wraps the text, then locked in place.
   Mouse only; skipped for touch and for people who have "reduce motion" turned on. */
(function () {
  var BASE_MAX = 1.08;    // how big normal letters get under the cursor
  var KEYWORD_MAX = 1.3;  // how big the <em> words get
  var RADIUS = 120;       // px, how far the cursor's pull reaches
  var EASE = 0.12;        // 0 to 1, higher is snappier

  var roots = Array.prototype.slice.call(document.querySelectorAll("[data-prox]"));
  if (!roots.length) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  var mx = -9999, my = -9999, active = false, raf = 0;

  function setup(root) {
    // 1. Flatten the headline into letters, remembering which are inside <em>
    var chars = [];
    root.childNodes.forEach(function (n) {
      var kw = n.nodeType === 1 && n.tagName === "EM";
      Array.from(n.textContent).forEach(function (c) {
        if (/\s/.test(c)) c = " ";
        if (c === " " && (!chars.length || chars[chars.length - 1].c === " ")) return;
        chars.push({ c: c, kw: kw });
      });
    });
    if (chars.length && chars[chars.length - 1].c === " ") chars.pop();
    var plain = chars.map(function (o) { return o.c; }).join("");

    // 2. Split into words
    var words = [[]];
    chars.forEach(function (o) {
      if (o.c === " ") words.push([]); else words[words.length - 1].push(o);
    });

    var lines = [], all = [], left = 0, enabled = true;

    function make(o) {
      var ch = document.createElement("span"); ch.className = "prox-ch" + (o.kw ? " is-kw" : "");
      var gl = document.createElement("span"); gl.className = "prox-gl";
      gl.textContent = o.c;
      ch.appendChild(gl);
      return { ch: ch, gl: gl, kw: o.kw, space: o.c === " ", w: 0, s: 1 };
    }

    // 3. Let the browser wrap the words, note where each line breaks, then lock those lines
    function layout() {
      root.textContent = "";
      root.classList.add("prox");
      root.setAttribute("aria-label", plain);
      var wordRecs = words.map(function (w) { return w.map(make); });
      var wordEls = wordRecs.map(function (recs, i) {
        var el = document.createElement("span");
        el.className = "prox-word"; el.setAttribute("aria-hidden", "true");
        recs.forEach(function (r) { el.appendChild(r.ch); });
        root.appendChild(el);
        if (i < wordRecs.length - 1) root.appendChild(document.createTextNode(" "));
        return el;
      });
      var groups = [], lastTop = null;
      wordEls.forEach(function (el, i) {
        var t = el.offsetTop;
        if (lastTop === null || Math.abs(t - lastTop) > 2) { groups.push([]); lastTop = t; }
        groups[groups.length - 1].push(i);
      });
      root.textContent = "";
      lines = []; all = [];
      groups.forEach(function (idxs) {
        var line = document.createElement("span");
        line.className = "prox-line"; line.setAttribute("aria-hidden", "true");
        var L = [];
        idxs.forEach(function (wi, k) {
          if (k > 0) { var sp = make({ c: " ", kw: false }); line.appendChild(sp.ch); L.push(sp); all.push(sp); }
          wordRecs[wi].forEach(function (r) { line.appendChild(r.ch); L.push(r); all.push(r); });
        });
        root.appendChild(line);
        lines.push({ el: line, letters: L, cy: 0, h: 0 });
      });
    }

    function reset() {
      all.forEach(function (o) { o.ch.style.width = ""; o.gl.style.transform = ""; o.s = 1; });
    }

    function measure() {
      reset();
      all.forEach(function (o) { o.w = o.ch.getBoundingClientRect().width; });
      left = root.getBoundingClientRect().left + window.scrollX;
      // If a line is wider than its box (very narrow window), skip the effect
      enabled = lines.every(function (l) { return l.el.scrollWidth <= root.clientWidth + 1; });
      lines.forEach(function (l) {
        var b = l.el.getBoundingClientRect();
        l.cy = b.top + window.scrollY + b.height * 0.6;
        l.h = b.height;
      });
    }

    function frame(px, py) {
      if (!enabled) { reset(); return false; }
      var moving = false;
      // Only the line the cursor is on reacts. Between lines, the closer one wins.
      var act = -1, best = Infinity;
      if (active) {
        lines.forEach(function (l, i) {
          var d = Math.abs(py - l.cy);
          if (d < best) { best = d; act = i; }
        });
        if (act > -1 && best > lines[act].h * 0.65) act = -1;
      }
      lines.forEach(function (l, li) {
        var x = left;
        l.letters.forEach(function (o) {
          var cx = x + (o.w * o.s) / 2;
          var target = 1;
          if (li === act && !o.space) {
            var dx = px - cx, dy = py - l.cy;
            var g = Math.exp(-(dx * dx + dy * dy) / (RADIUS * RADIUS));
            target = 1 + ((o.kw ? KEYWORD_MAX : BASE_MAX) - 1) * g;
          }
          o.s += (target - o.s) * EASE;
          if (Math.abs(target - o.s) > 0.002) moving = true; else o.s = target;
          o.ch.style.width = o.w * o.s + "px";
          o.gl.style.transform = "scale(" + o.s + ")";
          x += o.w * o.s;
        });
      });
      return moving;
    }

    function relayout() { layout(); measure(); }
    relayout();
    return { frame: frame, relayout: relayout };
  }

  var insts = roots.map(setup);

  function tick() {
    raf = 0;
    var px = mx + window.scrollX, py = my + window.scrollY, moving = false;
    insts.forEach(function (i) { if (i.frame(px, py)) moving = true; });
    if (moving || active) raf = requestAnimationFrame(tick);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }

  window.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    mx = e.clientX; my = e.clientY; active = true; kick();
  }, { passive: true });
  document.addEventListener("pointerleave", function () { active = false; kick(); });
  window.addEventListener("blur", function () { active = false; kick(); });

  var pending = 0;
  window.addEventListener("resize", function () {
    if (pending) return;
    pending = requestAnimationFrame(function () { pending = 0; insts.forEach(function (i) { i.relayout(); }); });
  });
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
    insts.forEach(function (i) { i.relayout(); });
  });
})();
