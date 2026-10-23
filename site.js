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
