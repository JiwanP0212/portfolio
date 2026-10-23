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
