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

  // 3. Filmstrip: the page scrolls sideways. Vertical scrolling drives the movement 1:1, then the page carries on.
  var film = document.getElementById("film");
  if (film) {
    var track = document.getElementById("film-track"), fill = document.getElementById("film-fill");
    var fcount = document.getElementById("film-count"), hint = document.getElementById("film-hint");
    var calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var items = shots.map(function (s, i) {
      var b = document.createElement("button");
      b.className = "fshot"; b.type = "button";
      b.style.setProperty("--ar", s.style.getPropertyValue("--ar") || "1.5");
      b.setAttribute("aria-label", "Open photo " + (i + 1));
      var im = s.querySelector("img"), c;
      if (im) { c = document.createElement("img"); c.src = im.currentSrc || im.src; c.alt = im.alt || ""; c.decoding = "async"; }
      else { c = document.createElement("span"); c.className = "shot-no"; c.textContent = (s.querySelector(".shot-no") || {}).textContent || ""; }
      b.appendChild(c);
      b.addEventListener("click", function () { open(i); });
      track.appendChild(b);
      return { el: b, img: im ? c : null, left: 0, w: 0 };
    });

    var SPEED = 1.4;   // sideways pixels per scrolled pixel
    var D = 0, R = 0, start = 0, pinW = 0, hdr = 0, pad = 0, raf2 = 0;
    function measureFilm() {
      if (!film.offsetParent && getComputedStyle(film).display === "none") return;
      hdr = document.querySelector(".site-header").offsetHeight;
      pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      pinW = film.querySelector(".film-pin").clientWidth;
      var last = items[items.length - 1];
      items.forEach(function (o) { o.left = o.el.offsetLeft; o.w = o.el.offsetWidth; });
      D = Math.max(0, last.left + last.w + pad - pinW);
      R = D / SPEED;
      film.style.height = (R + window.innerHeight - hdr) + "px";
      start = film.getBoundingClientRect().top + window.scrollY - hdr;
      updateFilm();
    }
    function updateFilm() {
      raf2 = 0;
      if (getComputedStyle(film).display === "none") return;
      var p = R ? Math.min(1, Math.max(0, (window.scrollY - start) / R)) : 0;
      var shift = p * D;
      track.style.transform = "translate3d(" + (-shift) + "px,0,0)";
      fill.style.transform = "scaleX(" + p + ")";
      hint.style.opacity = p > 0.02 ? 0 : 1;
      var nearest = 0, best = Infinity;
      items.forEach(function (o, i) {
        var off = o.left + o.w / 2 - shift - pinW / 2;
        var d = Math.abs(off);
        if (d < best) { best = d; nearest = i; }
        o.el.style.opacity = (0.3 + 0.7 * (1 - Math.min(1, d / (pinW * 0.55)))).toFixed(3);
        if (o.img && !calm) o.img.style.transform = "translate3d(" + (-off * 0.05).toFixed(1) + "px,0,0) scale(1.12)";
      });
      fcount.textContent = String(nearest + 1).padStart(2, "0") + " / " + String(items.length).padStart(2, "0");
    }
    function kickFilm() { if (!raf2) raf2 = requestAnimationFrame(updateFilm); }
    window.addEventListener("scroll", kickFilm, { passive: true });
    window.addEventListener("resize", measureFilm);
    window.addEventListener("load", measureFilm);
    measureFilm();

    // arrow keys step one photo at a time
    document.addEventListener("keydown", function (e) {
      if (!lb.hidden || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
      if (getComputedStyle(film).display === "none") return;
      var r = film.getBoundingClientRect();
      if (r.top > window.innerHeight || r.bottom < 0) return;
      e.preventDefault();
      var shiftNow = Math.min(1, Math.max(0, (window.scrollY - start) / (R || 1))) * D, idx = 0, best = Infinity;
      items.forEach(function (o, i) { var d = Math.abs(o.left + o.w / 2 - shiftNow - pinW / 2); if (d < best) { best = d; idx = i; } });
      idx = Math.min(items.length - 1, Math.max(0, idx + (e.key === "ArrowRight" ? 1 : -1)));
      var o = items[idx], target = start + Math.min(D, Math.max(0, o.left + o.w / 2 - pinW / 2)) / SPEED;
      window.scrollTo({ top: target, behavior: calm ? "auto" : "smooth" });
    });

    // Filmstrip / View all
    var root = document.documentElement;
    Array.prototype.forEach.call(document.querySelectorAll(".view-tab"), function (t) {
      t.addEventListener("click", function () {
        var grid = t.getAttribute("data-view") === "grid";
        root.classList.toggle("show-all", grid);
        Array.prototype.forEach.call(document.querySelectorAll(".view-tab"), function (x) { x.classList.toggle("on", x === t); });
        var bar = document.querySelector(".view-bar");
        window.scrollTo({ top: bar.getBoundingClientRect().top + window.scrollY - hdr, behavior: "auto" });
        if (!grid) measureFilm();
      });
    });
  }
})();
