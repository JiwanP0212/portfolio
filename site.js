/* Site-wide touches: header height, one-scroll-per-project on the home page, and the cursor.
   The cursor is a single ring. Mouse only; touch devices keep their normal behavior. */
(function () {
  var root = document.documentElement;

  // Header height, so full-screen project cards fit exactly under it
  var hdr = document.querySelector(".site-header");
  function setHdr() { if (hdr) root.style.setProperty("--hdr", hdr.offsetHeight + "px"); }
  setHdr();
  window.addEventListener("resize", setHdr);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setHdr);


  // Home page: one scroll gesture moves exactly one project (mouse wheel or trackpad).
  // A new swipe takes over right away, even while the page is still moving.
  if (root.classList.contains("snap") && matchMedia("(min-width: 900px) and (min-height: 640px)").matches) {
    var DURATION = 850;                // ms per move, raise it to go slower
    var lastWheel = 0, lastAbs = 0, lastDir = 0, lastTrigger = 0;
    var handled = false, animating = false, tIdx = 0, raf1 = 0;
    var instant = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var targets = function () {
      var h = hdr ? hdr.offsetHeight : 69;
      var t = [0];
      document.querySelectorAll(".project").forEach(function (p) {
        t.push(Math.round(p.getBoundingClientRect().top + window.scrollY - h));
      });
      t.push(Math.max(0, root.scrollHeight - window.innerHeight));
      return t;
    };
    var easeOut = function (p) { return 1 - Math.pow(1 - p, 4); };   // starts fast, settles gently
    var go = function (to) {
      var from = window.scrollY, t0 = performance.now();
      cancelAnimationFrame(raf1);
      if (instant || Math.abs(to - from) < 2) {
        window.scrollTo({ top: to, behavior: "instant" }); animating = false; return;
      }
      root.style.scrollSnapType = "none";
      animating = true;
      raf1 = requestAnimationFrame(function step(now) {
        var p = Math.min(1, (now - t0) / DURATION);
        window.scrollTo({ top: from + (to - from) * easeOut(p), behavior: "instant" });
        if (p < 1) raf1 = requestAnimationFrame(step);
        else { animating = false; root.style.scrollSnapType = ""; }
      });
    };
    window.addEventListener("wheel", function (e) {
      if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault();
      var now = Date.now(), abs = Math.abs(e.deltaY), dir = e.deltaY > 0 ? 1 : -1;
      var since = now - lastTrigger, gap = now - lastWheel;
      // New swipe: a pause, the other direction, a fresh push on top of a fading tail,
      // or a separate mouse-wheel click. A fading tail alone never counts.
      var fresh = gap > 140
        || (dir !== lastDir && since > 120)
        || (abs > 12 && abs > lastAbs * 1.5 + 3 && since > 300)
        || (abs >= 50 && abs === lastAbs && since > 120);
      lastWheel = now; lastAbs = abs; lastDir = dir;
      if (fresh) handled = false;
      if (handled || abs < 1) return;
      var t = targets(), y = window.scrollY, base = tIdx;
      if (!animating) {
        base = 0;
        t.forEach(function (v, i) { if (Math.abs(v - y) < Math.abs(t[base] - y)) base = i; });
      }
      var next = dir > 0 ? Math.min(base + 1, t.length - 1) : Math.max(base - 1, 0);
      handled = true;
      if (next === base && !animating) return;
      tIdx = next; lastTrigger = now;
      go(t[next]);
    }, { passive: false });
  }

  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var ring = document.createElement("div");
  ring.className = "cursor-ring";
  ring.setAttribute("aria-hidden", "true");
  document.body.appendChild(ring);

  var shown = false;
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    ring.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)";
    if (!shown) { shown = true; root.classList.add("has-cursor"); ring.classList.add("on"); }
  }, { passive: true });
  var press = function () { ring.classList.add("down"); };
  var release = function () { ring.classList.remove("down"); };
  window.addEventListener("pointerdown", function (e) { if (e.pointerType !== "touch") press(); });
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  window.addEventListener("mouseup", release);
  window.addEventListener("dragend", release);
  window.addEventListener("contextmenu", release);
  var hide = function () { ring.classList.remove("on"); shown = false; };
  document.addEventListener("pointerleave", hide);
  window.addEventListener("blur", function () { hide(); release(); });
})();
