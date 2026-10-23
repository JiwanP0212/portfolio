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


  // Project images drift a little toward the cursor (the zoom itself is CSS)
  if (matchMedia("(hover: hover) and (pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var media = null;
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      var m = e.target.closest ? e.target.closest(".media") : null;
      if (m !== media) {
        if (media) { media.style.removeProperty("--mx"); media.style.removeProperty("--my"); }
        media = m;
      }
      if (m) {
        var r = m.getBoundingClientRect();
        m.style.setProperty("--mx", (((e.clientX - r.left) / r.width) - 0.5) * 2);
        m.style.setProperty("--my", (((e.clientY - r.top) / r.height) - 0.5) * 2);
      }
    }, { passive: true });
  }

  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var ring = document.createElement("div");
  ring.className = "cursor-ring";
  ring.setAttribute("aria-hidden", "true");
  document.body.appendChild(ring);

  var shown = false, lastX = 0, lastY = 0, KEY = "cursor-pos";
  var showAt = function (x, y) {
    ring.style.transform = "translate(" + x + "px," + y + "px)";
    if (!shown) { shown = true; root.classList.add("has-cursor"); ring.classList.add("on"); }
  };
  // Pick up where the cursor was on the last page, so it doesn't blink out between pages
  try {
    var saved = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (saved && Date.now() - saved.t < 4000) { lastX = saved.x; lastY = saved.y; showAt(saved.x, saved.y); }
  } catch (err) {}
  window.addEventListener("pagehide", function () {
    try { sessionStorage.setItem(KEY, JSON.stringify({ x: lastX, y: lastY, t: Date.now() })); } catch (err) {}
  });
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    lastX = e.clientX; lastY = e.clientY;
    showAt(e.clientX, e.clientY);
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
