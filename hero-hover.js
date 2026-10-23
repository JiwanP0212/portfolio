/* Hero hover: letters swell as the cursor gets close, then ease back.
   Words inside <em> get the bigger swell. Mouse only; skipped for touch
   and for people who have "reduce motion" turned on. */
(function () {
  var BASE_MAX = 1.3;     // how big normal letters get under the cursor
  var KEYWORD_MAX = 1.85; // how big the <em> words get
  var RADIUS = 150;       // px, how far the cursor's pull reaches
  var EASE = 0.16;        // 0 to 1, higher is snappier

  var root = document.querySelector(".display.flip");
  if (!root) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  // 1. Flatten the headline into letters, remembering which are inside <em>
  var chars = [];
  root.childNodes.forEach(function (n) {
    var kw = n.nodeType === 1 && n.tagName === "EM";
    Array.from(n.textContent).forEach(function (c) { chars.push({ c: c, kw: kw }); });
  });
  var plain = root.textContent;

  // 2. Break into lines after a full stop ("I notice things." / "Then I design them.")
  var lineChars = [[]];
  chars.forEach(function (o, i) {
    if (o.c === " " && chars[i - 1] && chars[i - 1].c === ".") { lineChars.push([]); return; }
    lineChars[lineChars.length - 1].push(o);
  });

  var original = root.innerHTML;
  var lines = [], all = [];

  function build() {
    root.innerHTML = "";
    root.setAttribute("aria-label", plain);
    root.classList.add("prox");
    lines = []; all = [];
    lineChars.forEach(function (list) {
      var line = document.createElement("span");
      line.className = "prox-line";
      line.setAttribute("aria-hidden", "true");
      var L = [];
      list.forEach(function (o) {
        var ch = document.createElement("span"); ch.className = "prox-ch" + (o.kw ? " is-kw" : "");
        var gl = document.createElement("span"); gl.className = "prox-gl";
        gl.textContent = o.c;
        ch.appendChild(gl); line.appendChild(ch);
        var rec = { ch: ch, gl: gl, kw: o.kw, space: o.c === " ", w: 0, s: 1 };
        L.push(rec); all.push(rec);
      });
      root.appendChild(line);
      lines.push({ el: line, letters: L, cy: 0 });
    });
  }

  var left = 0, mx = -9999, my = -9999, active = false, raf = 0, enabled = true;

  function reset() {
    all.forEach(function (o) { o.ch.style.width = ""; o.gl.style.transform = ""; o.s = 1; });
  }

  function measure() {
    reset();
    all.forEach(function (o) { o.w = o.ch.getBoundingClientRect().width; });
    var r = root.getBoundingClientRect();
    left = r.left + window.scrollX;
    // If a line is wider than its box (very narrow window), skip the effect
    enabled = lines.every(function (l) { return l.el.scrollWidth <= root.clientWidth + 1; });
    lines.forEach(function (l) {
      var b = l.el.getBoundingClientRect();
      l.cy = b.top + window.scrollY + b.height * 0.6;
    });
  }

  function frame() {
    raf = 0;
    if (!enabled) { reset(); return; }
    var moving = false;
    var px = mx + window.scrollX, py = my + window.scrollY;
    lines.forEach(function (l) {
      var x = left;
      l.letters.forEach(function (o) {
        var cx = x + (o.w * o.s) / 2;
        var target = 1;
        if (active && !o.space) {
          var dx = px - cx, dy = (py - l.cy) * 1.3;
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
    if (moving || active) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  build();
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    mx = e.clientX; my = e.clientY; active = true; kick();
  }, { passive: true });
  document.addEventListener("pointerleave", function () { active = false; kick(); });
  window.addEventListener("blur", function () { active = false; kick(); });
  window.addEventListener("resize", measure);
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(measure);
})();
