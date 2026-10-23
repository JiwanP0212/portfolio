/* Photo gallery: fade-in on scroll, and a full-screen viewer.
   Each .shot is a photo. Swap the placeholder span for <img src="..." alt=""> and keep --ar (width / height). */
(function () {
  var shots = Array.prototype.slice.call(document.querySelectorAll(".gallery .shot"));
  if (!shots.length) return;

  // 1. Fade in as photos scroll into view
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      var k = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.style.transitionDelay = Math.min(k++ * 80, 320) + "ms";
        e.target.classList.add("in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    shots.forEach(function (s) { io.observe(s); });
  } else {
    shots.forEach(function (s) { s.classList.add("in"); });
  }
  // once a photo has faded in, drop its stagger delay so hover feels instant
  shots.forEach(function (s) {
    s.addEventListener("transitionend", function (e) { if (e.propertyName === "opacity") s.style.transitionDelay = ""; });
  });

  // 2. Viewer
  var lb = document.getElementById("lb");
  var stage = document.getElementById("lb-stage");
  var count = document.getElementById("lb-count");
  var cur = 0, opener = null, closing = 0;

  function content(i) {
    var s = shots[i], img = s.querySelector("img"), ar = s.style.getPropertyValue("--ar") || "1.5";
    var wrap = document.createElement("div");
    wrap.className = "lb-item";
    if (img) {
      var big = document.createElement("img");
      big.src = img.getAttribute("data-full") || img.currentSrc || img.src;
      big.alt = img.alt || "";
      wrap.appendChild(big);
    } else {
      var ph = document.createElement("div");
      ph.className = "lb-ph"; ph.style.setProperty("--ar", ar);
      ph.textContent = s.querySelector(".shot-no") ? s.querySelector(".shot-no").textContent : "";
      wrap.appendChild(ph);
    }
    return wrap;
  }
  function show(i) {
    cur = (i + shots.length) % shots.length;
    stage.textContent = "";
    stage.appendChild(content(cur));
    count.textContent = (cur + 1) + " / " + shots.length;
    // warm up the neighbours
    [cur + 1, cur - 1].forEach(function (n) {
      var im = shots[(n + shots.length) % shots.length].querySelector("img");
      if (im) { var p = new Image(); p.src = im.getAttribute("data-full") || im.src; }
    });
  }
  function open(i) {
    clearTimeout(closing);
    opener = document.activeElement;
    show(i);
    lb.hidden = false;
    document.documentElement.classList.add("lb-lock");
    requestAnimationFrame(function () { lb.classList.add("open"); });
    lb.querySelector(".lb-close").focus({ preventScroll: true });
  }
  function close() {
    lb.classList.remove("open");
    document.documentElement.classList.remove("lb-lock");
    closing = setTimeout(function () { lb.hidden = true; stage.textContent = ""; }, 280);
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  }

  shots.forEach(function (s, i) { s.addEventListener("click", function () { open(i); }); });
  lb.querySelector(".lb-close").addEventListener("click", close);
  lb.querySelector(".prev").addEventListener("click", function () { show(cur - 1); });
  lb.querySelector(".next").addEventListener("click", function () { show(cur + 1); });
  // click the dark area to close
  stage.addEventListener("click", function (e) { if (e.target === stage) close(); });
  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") show(cur + 1);
    else if (e.key === "ArrowLeft") show(cur - 1);
  });

  // swipe on touch screens
  var sx = null, sy = 0;
  stage.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener("touchend", function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(cur + (dx < 0 ? 1 : -1));
  }, { passive: true });
})();
