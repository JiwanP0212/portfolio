/* Site-wide touches: header height (for scroll alignment) and the cursor.
   The cursor is a single ring. Mouse only; touch devices keep their normal behavior. */
(function () {
  var root = document.documentElement;

  // Header height, so full-screen project cards fit exactly under it
  var hdr = document.querySelector(".site-header");
  function setHdr() { if (hdr) root.style.setProperty("--hdr", hdr.offsetHeight + "px"); }
  setHdr();
  window.addEventListener("resize", setHdr);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setHdr);


  // Home page: scroll like any other site, but a single swipe can't carry you past the end
  // of a project. Inside a project it's free; at the edge the page stops, and the next swipe goes on.
  if (root.classList.contains("snap") && matchMedia("(min-width: 900px) and (min-height: 640px)").matches) {
    var lastWheel = 0, lastAbs = 0, lastDir = 0;
    var sum = 0, startY = 0, limUp = 0, limDown = 0, blocked = false;
    var walls = function () {
      var h = hdr ? hdr.offsetHeight : 69;
      var t = [0];
      document.querySelectorAll(".project").forEach(function (p) {
        t.push(Math.round(p.getBoundingClientRect().top + window.scrollY - h));
      });
      t.push(Math.max(0, root.scrollHeight - window.innerHeight));
      return t;
    };
    window.addEventListener("wheel", function (e) {
      if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      var now = Date.now(), dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
      var abs = Math.abs(dy), dir = dy > 0 ? 1 : -1, gap = now - lastWheel;
      // A new swipe: after a pause, in the other direction, or a fresh push on a fading tail
      var fresh = gap > 140 || dir !== lastDir || (abs > 12 && abs > lastAbs * 1.5 + 3);
      lastWheel = now; lastAbs = abs; lastDir = dir;
      if (fresh) {
        blocked = false; sum = 0;
        var w = walls(), y = window.scrollY;
        for (var i = 0; i < w.length; i++) if (Math.abs(w[i] - y) < 60) { y = w[i]; break; }
        startY = y;
        var above = w.filter(function (v) { return v < y - 2; });
        var below = w.filter(function (v) { return v > y + 2; });
        limUp = above.length ? above[above.length - 1] : 0;
        limDown = below.length ? below[0] : w[w.length - 1];
      }
      if (blocked) { e.preventDefault(); return; }
      sum += dy;
      var pos = startY + sum;
      if (dy > 0 && pos >= limDown) { e.preventDefault(); blocked = true; window.scrollTo({ top: limDown, behavior: "smooth" }); }
      else if (dy < 0 && pos <= limUp) { e.preventDefault(); blocked = true; window.scrollTo({ top: limUp, behavior: "smooth" }); }
    }, { passive: false });

    // Stop near the edge of a project and the page settles onto it. Anywhere else, it stays put.
    var settleTimer = 0;
    var settle = function () {
      var w = walls(), y = window.scrollY, zone = Math.max(120, window.innerHeight * 0.2);
      var best = w[0];
      w.forEach(function (v) { if (Math.abs(v - y) < Math.abs(best - y)) best = v; });
      if (Math.abs(best - y) > 2 && Math.abs(best - y) <= zone) window.scrollTo({ top: best, behavior: "smooth" });
    };
    window.addEventListener("scroll", function () {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, 160);
    }, { passive: true });
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
