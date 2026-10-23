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


  // Home page: one scroll gesture moves exactly one project (mouse wheel or trackpad)
  if (root.classList.contains("snap") && matchMedia("(min-width: 900px) and (min-height: 640px)").matches) {
    var DURATION = 1000;               // ms per move, raise it to go slower
    var busyUntil = 0, lastWheel = 0, lastAbs = 0, lastDir = 0, handled = false, raf1 = 0;
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
    var ease = function (p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
    var go = function (to) {
      var from = window.scrollY, t0 = performance.now();
      if (instant || Math.abs(to - from) < 2) { window.scrollTo({ top: to, behavior: "instant" }); return; }
      root.style.scrollSnapType = "none";
      cancelAnimationFrame(raf1);
      raf1 = requestAnimationFrame(function step(now) {
        var p = Math.min(1, (now - t0) / DURATION);
        window.scrollTo({ top: from + (to - from) * ease(p), behavior: "instant" });
        if (p < 1) raf1 = requestAnimationFrame(step); else root.style.scrollSnapType = "";
      });
    };
    window.addEventListener("wheel", function (e) {
      if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault();
      var now = Date.now(), abs = Math.abs(e.deltaY), dir = e.deltaY > 0 ? 1 : -1;
      if (now < busyUntil) { lastWheel = now; lastAbs = abs; lastDir = dir; return; }
      // A new swipe starts after a pause, a push in the other direction, or a fresh burst
      // on top of the previous swipe's fading tail. A fading tail alone never counts.
      if (now - lastWheel > 140 || dir !== lastDir || abs > lastAbs * 1.5 + 3) handled = false;
      lastWheel = now; lastAbs = abs; lastDir = dir;
      if (handled || abs < 4) return;
      var t = targets(), y = window.scrollY, cur = 0;
      t.forEach(function (v, i) { if (Math.abs(v - y) < Math.abs(t[cur] - y)) cur = i; });
      var next = dir > 0 ? Math.min(cur + 1, t.length - 1) : Math.max(cur - 1, 0);
      handled = true;
      busyUntil = now + (instant ? 0 : DURATION + 80);
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
  window.addEventListener("pointerdown", function () { ring.classList.add("down"); });
  window.addEventListener("pointerup", function () { ring.classList.remove("down"); });
  var hide = function () { ring.classList.remove("on"); shown = false; };
  document.addEventListener("pointerleave", hide);
  window.addEventListener("blur", hide);
})();
