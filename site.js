/* Site-wide touches: header height for the scroll layout, and the cursor.
   The cursor is a small dot plus a ring. The ring grows and turns blue over
   anything clickable. Mouse only; touch devices keep their normal behavior. */
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
    var locked = false, lastWheel = 0;
    var targets = function () {
      var h = hdr ? hdr.offsetHeight : 69;
      var t = [0];
      document.querySelectorAll(".project").forEach(function (p) {
        t.push(Math.round(p.getBoundingClientRect().top + window.scrollY - h));
      });
      t.push(Math.max(0, root.scrollHeight - window.innerHeight));
      return t;
    };
    var release = function () {
      if (Date.now() - lastWheel > 120) locked = false; else setTimeout(release, 100);
    };
    window.addEventListener("wheel", function (e) {
      if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault();
      lastWheel = Date.now();
      if (locked || Math.abs(e.deltaY) < 4) return;
      var t = targets(), y = window.scrollY, cur = 0;
      t.forEach(function (v, i) { if (Math.abs(v - y) < Math.abs(t[cur] - y)) cur = i; });
      var next = e.deltaY > 0 ? Math.min(cur + 1, t.length - 1) : Math.max(cur - 1, 0);
      // if we are between two points, head for the next one in the scroll direction
      if (next === cur) { if (t[cur] > y + 2 && e.deltaY > 0) next = cur; else if (t[cur] < y - 2 && e.deltaY < 0) next = cur; }
      locked = true;
      window.scrollTo({ top: t[next], behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      setTimeout(release, 700);
    }, { passive: false });
  }

  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var ring = document.createElement("div");
  var dot = document.createElement("div");
  ring.className = "cursor-ring"; dot.className = "cursor-dot";
  ring.setAttribute("aria-hidden", "true"); dot.setAttribute("aria-hidden", "true");
  document.body.appendChild(ring); document.body.appendChild(dot);

  var CLICKABLE = 'a[href], button, summary, label, select, [role="button"], input[type="submit"]';
  var x = -100, y = -100, rx = -100, ry = -100, raf = 0, shown = false;

  function frame() {
    raf = 0;
    rx += (x - rx) * (reduce ? 1 : 0.22);
    ry += (y - ry) * (reduce ? 1 : 0.22);
    ring.style.transform = "translate(" + rx + "px," + ry + "px)";
    if (Math.abs(x - rx) > 0.1 || Math.abs(y - ry) > 0.1) raf = requestAnimationFrame(frame);
  }

  window.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    x = e.clientX; y = e.clientY;
    dot.style.transform = "translate(" + x + "px," + y + "px)";
    if (!shown) {
      shown = true; rx = x; ry = y;
      root.classList.add("has-cursor");
      ring.classList.add("on"); dot.classList.add("on");
    }
    var hot = !!(e.target.closest && e.target.closest(CLICKABLE));
    ring.classList.toggle("hot", hot); dot.classList.toggle("hot", hot);
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: true });

  window.addEventListener("pointerdown", function () { ring.classList.add("down"); });
  window.addEventListener("pointerup", function () { ring.classList.remove("down"); });
  document.addEventListener("pointerleave", function () { ring.classList.remove("on"); dot.classList.remove("on"); shown = false; });
  window.addEventListener("blur", function () { ring.classList.remove("on"); dot.classList.remove("on"); shown = false; });
})();
