/* =================================================================
   demo-stage.js
   -----------------------------------------------------------------
   Drop-in primitive that turns a demo video + a JSON timeline into
   a keyboard-navigable demo stage. Pairs with /assets/demo-stage/demo-stage.css

   Public API
     window.DemoStage.init(rootSelector, config)

   Config
     beats: [
       { t: 12.5, eyebrow?: "Salesforce", title: "Mary opens the opp", body: "...", durationMs?: 5000 }
     ]
     cursorTrack: [
       { t: 17.0, x: 1166, y: 666, action?: "click" }   // optional overlay
     ]
     showTicks?: boolean   (default true — render beat markers on the scrubber)
     showCallouts?: boolean (default true — show beat callouts as overlay cards)

   Keyboard
     Space            play / pause
     ArrowLeft  /  ArrowRight        jump to prev / next BEAT
     Shift+ArrowLeft / Shift+ArrowRight   ±5s scrub
     ,    /   .       ±0.1x speed
     Esc              if `?embed=1`, posts message to host; else does nothing

   URL params
     ?embed=1          strip outer chrome (host page applies body.embed)
     ?autoplay=1       start playing on load (muted to satisfy autoplay policy)
     ?start=N          start at video time N seconds
     ?beat=N           start at beat index N (1-based; overrides ?start)
     ?speed=X          set playbackRate (e.g. 0.75, 1, 1.5)
   ================================================================= */
(function (global) {
  "use strict";

  // Cursor SVG — simple Mac-style arrow
  var CURSOR_SVG =
    '<svg class="ds-cursor" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M4 2 L4 18 L8.5 14 L11.5 21 L14 20 L11 13 L17 13 Z" ' +
            'fill="#FFFFFF" stroke="#130032" stroke-width="1.2" stroke-linejoin="round"/>' +
    '</svg>';

  // Play overlay — first-paint affordance
  var PLAY_OVERLAY_HTML =
    '<div class="ds-play-overlay">' +
      '<div class="ds-play-overlay-inner">' +
        '<button type="button" class="ds-play-button" aria-label="Play">' +
          '<svg viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">' +
            '<polygon points="6 4 20 12 6 20 6 4"></polygon>' +
          '</svg>' +
        '</button>' +
        '<div class="ds-play-overlay-hint">' +
          'Press <kbd>Space</kbd> or click to play' +
        '</div>' +
      '</div>' +
    '</div>';

  function fmt(t) {
    if (!isFinite(t)) return "0:00";
    var s = Math.max(0, Math.floor(t));
    var m = Math.floor(s / 60);
    var ss = String(s % 60).padStart(2, "0");
    return m + ":" + ss;
  }

  /* -----------------------------------------------------------------
     Virtual clock — drop-in replacement for an HTMLVideoElement when
     the stage is in scenes-mode (HTML scenes instead of a real video).
     Mimics the subset of the HTMLMediaElement API the player uses.
     ----------------------------------------------------------------- */
  function createVirtualClock(durationS) {
    var state = {
      currentTime: 0,
      duration: durationS,
      paused: true,
      playbackRate: 1,
      muted: false,
      ended: false
    };
    var listeners = {};
    function on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); }
    function emit(name) { (listeners[name] || []).forEach(function (f) { try { f({ target: api }); } catch (_) {} }); }
    var raf = 0, lastTick = 0;
    function step(now) {
      if (state.paused) return;
      if (!lastTick) lastTick = now;
      var dt = (now - lastTick) / 1000 * state.playbackRate;
      lastTick = now;
      var nt = state.currentTime + dt;
      if (nt >= state.duration) {
        state.currentTime = state.duration;
        state.paused = true;
        emit("timeupdate");
        emit("pause");
        return;
      }
      state.currentTime = nt;
      emit("timeupdate");
      raf = requestAnimationFrame(step);
    }
    var api = {
      _isVirtual: true,
      addEventListener: on,
      removeEventListener: function () {},
      play: function () {
        if (!state.paused) return Promise.resolve();
        state.paused = false;
        lastTick = 0;
        raf = requestAnimationFrame(step);
        emit("play");
        return Promise.resolve();
      },
      pause: function () {
        if (state.paused) return;
        state.paused = true;
        cancelAnimationFrame(raf);
        lastTick = 0;
        emit("pause");
      },
      get currentTime() { return state.currentTime; },
      set currentTime(v) {
        state.currentTime = Math.max(0, Math.min(state.duration - 0.001, +v || 0));
        if (!state.paused) lastTick = 0;
        emit("timeupdate");
      },
      get duration() { return state.duration; },
      get paused() { return state.paused; },
      get playbackRate() { return state.playbackRate; },
      set playbackRate(v) { state.playbackRate = +v || 1; },
      get muted() { return state.muted; },
      set muted(v) { state.muted = !!v; },
      get src() { return ""; },
      set src(v) {},
      get poster() { return ""; },
      set poster(v) {},
      _start: function () {
        // Defer loadedmetadata so listeners registered after init can hear it
        setTimeout(function () { emit("loadedmetadata"); }, 0);
      }
    };
    return api;
  }

  function init(rootSel, cfg) {
    var root = typeof rootSel === "string" ? document.querySelector(rootSel) : rootSel;
    if (!root) { console.warn("[demo-stage] root not found:", rootSel); return null; }

    cfg = cfg || {};
    var beats = (cfg.beats || []).slice().sort(function (a, b) { return a.t - b.t; });
    var cursorTrack = (cfg.cursorTrack || []).slice().sort(function (a, b) { return a.t - b.t; });
    var showTicks = cfg.showTicks !== false;
    var showCallouts = cfg.showCallouts !== false;

    var params = new URLSearchParams(location.search);
    var isEmbed = params.get("embed") === "1";
    var wantsAutoplay = params.get("autoplay") === "1";
    var startSec = parseFloat(params.get("start") || "0");
    var startBeat = parseInt(params.get("beat") || "0", 10);
    var speedOverride = parseFloat(params.get("speed") || "0");

    if (isEmbed) document.body.classList.add("embed");

    // Decide mode: video-backed or scenes-backed
    var hasVideoAttr = root.hasAttribute("data-video");
    var hasScenes = !!root.querySelector(".ds-scene");
    var useScenes = !hasVideoAttr && hasScenes;
    var video;

    if (useScenes) {
      // scenes-mode: virtual clock, no <video> element
      root.classList.add("scenes-mode");
      // Remove a placeholder <video> if the host page included one
      var stub = root.querySelector("video.ds-video");
      if (stub) stub.parentNode.removeChild(stub);
      var totalDuration = (cfg.totalDuration && +cfg.totalDuration) || (
        beats.length ? (beats[beats.length - 1].t + (cfg.lastBeatDuration || 30)) : 30
      );
      video = createVirtualClock(totalDuration);
    } else {
      video = root.querySelector("video.ds-video");
      if (!video) {
        video = document.createElement("video");
        video.className = "ds-video";
        video.setAttribute("preload", "metadata");
        video.setAttribute("playsinline", "");
        root.appendChild(video);
      }
      var src = root.getAttribute("data-video");
      if (src && !video.src) video.src = src;
      var poster = root.getAttribute("data-poster");
      if (poster) video.poster = poster;
    }

    // Play overlay — shown until first play, then hidden permanently
    root.insertAdjacentHTML("beforeend", PLAY_OVERLAY_HTML);
    var playOverlay = root.querySelector(".ds-play-overlay");
    var playOverlayBtn = root.querySelector(".ds-play-button");
    if (playOverlay) {
      playOverlay.addEventListener("click", function () {
        video.play().catch(function () {});
      });
    }
    if (playOverlayBtn) {
      playOverlayBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        video.play().catch(function () {});
      });
    }

    // Cursor overlay
    var cursorEl = null;
    if (cursorTrack.length) {
      root.insertAdjacentHTML("beforeend", CURSOR_SVG);
      cursorEl = root.querySelector(".ds-cursor");
    }

    // Callout overlay
    var calloutEl = null;
    if (showCallouts) {
      calloutEl = document.createElement("div");
      calloutEl.className = "ds-callout";
      calloutEl.innerHTML =
        '<div class="ds-callout-head">' +
          '<span class="ds-callout-eyebrow"></span>' +
          '<span class="ds-callout-counter"></span>' +
        '</div>' +
        '<div class="ds-callout-title"></div>' +
        '<p class="ds-callout-body"></p>';
      root.appendChild(calloutEl);
    }

    // Beat strip — scannable list of all beats, click to jump
    var stripEl = document.getElementById("ds-beats");
    if (stripEl && beats.length) {
      stripEl.innerHTML = "";
      beats.forEach(function (b, i) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ds-beat-chip";
        btn.dataset.beat = String(i);
        btn.innerHTML =
          '<span class="ds-beat-meta">' +
            '<span class="ds-beat-num">Beat ' + (i + 1) + '</span>' +
            '<span class="ds-beat-time">' + fmt(b.t) + '</span>' +
          '</span>' +
          '<span class="ds-beat-eyebrow">' + escapeHtml(b.eyebrow || "") + '</span>' +
          '<span class="ds-beat-title">' + escapeHtml(b.title || "") + '</span>';
        btn.addEventListener("click", function () {
          if (isFinite(video.duration)) {
            video.currentTime = b.t;
            video.play().catch(function () {});
          }
        });
        stripEl.appendChild(btn);
      });
      // Set the count in the section header (rendered by host page)
      var countEl = document.querySelector(".ds-beats-count");
      if (countEl) countEl.textContent = beats.length + " beats · " + fmt(beats[beats.length-1].t + 30);
    }
    var lastChipIdx = -1;
    function paintActiveChip() {
      if (!stripEl) return;
      var idx = currentBeatIndex();
      var nodes = stripEl.querySelectorAll(".ds-beat-chip");
      nodes.forEach(function (n, i) {
        var active = i === idx;
        n.classList.toggle("is-active", active);
        if (active) {
          // Compute progress through the beat (0..1)
          var nextT = (i + 1 < beats.length) ? beats[i + 1].t : (video.duration || beats[i].t + 30);
          var span = Math.max(0.5, nextT - beats[i].t);
          var p = Math.max(0, Math.min(1, (video.currentTime - beats[i].t) / span));
          n.style.setProperty("--beat-progress", p.toFixed(3));
        } else {
          n.style.removeProperty("--beat-progress");
        }
      });
      // Scroll active chip into view if changed
      if (idx !== lastChipIdx && idx >= 0) {
        lastChipIdx = idx;
        var active = nodes[idx];
        if (active && active.scrollIntoView) {
          // Only scroll within the strip, not the page — use behavior:smooth on supporting browsers
          var rect = active.getBoundingClientRect();
          var stripRect = stripEl.getBoundingClientRect();
          if (rect.left < stripRect.left || rect.right > stripRect.right ||
              rect.top  < stripRect.top  || rect.bottom > stripRect.bottom) {
            try {
              active.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
            } catch (_) {
              active.scrollIntoView();
            }
          }
        }
      }
    }
    function escapeHtml(s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
      });
    }

    // External controls (rendered by host page, queried by id)
    var playBtn   = document.getElementById("ds-play");
    var prevBtn   = document.getElementById("ds-prev");
    var nextBtn   = document.getElementById("ds-next");
    var scrub     = document.getElementById("ds-scrub");
    var timeEl    = document.getElementById("ds-time");
    var speedSel  = document.getElementById("ds-speed");
    var ticksEl   = document.getElementById("ds-ticks");
    var playLabel = document.getElementById("ds-play-label");
    var playIcon  = document.getElementById("ds-play-icon");

    function setPlayingUI(isPlaying) {
      if (playLabel) playLabel.textContent = isPlaying ? "Pause" : "Play";
      if (playIcon) {
        playIcon.innerHTML = isPlaying
          ? '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>'
          : '<polygon points="6 4 20 12 6 20 6 4"></polygon>';
      }
    }

    function paintTime() {
      if (!timeEl || !isFinite(video.duration)) return;
      timeEl.textContent = fmt(video.currentTime) + " / " + fmt(video.duration);
    }
    function paintScrub() {
      if (!scrub || !isFinite(video.duration)) return;
      var v = (video.currentTime / video.duration) * 1000;
      scrub.value = String(v);
      scrub.style.setProperty("--pct", (v / 10) + "%");
    }

    // Beat ticks on the scrubber
    function buildTicks() {
      if (!ticksEl || !showTicks || !isFinite(video.duration)) return;
      ticksEl.innerHTML = "";
      beats.forEach(function (b, i) {
        var pct = (b.t / video.duration) * 100;
        var tick = document.createElement("span");
        tick.className = "ds-tick";
        tick.dataset.beat = String(i);
        tick.style.left = pct.toFixed(2) + "%";
        tick.title = (b.eyebrow ? b.eyebrow + " — " : "") + (b.title || "");
        ticksEl.appendChild(tick);
      });
    }
    function paintActiveTick() {
      if (!ticksEl) return;
      var nodes = ticksEl.querySelectorAll(".ds-tick");
      var idx = currentBeatIndex();
      nodes.forEach(function (n, i) {
        n.classList.toggle("is-active", i === idx);
      });
    }

    // Beat index helper — based on current time
    function currentBeatIndex() {
      var t = video.currentTime;
      var idx = -1;
      for (var i = 0; i < beats.length; i++) {
        if (beats[i].t <= t + 0.05) idx = i;
        else break;
      }
      return idx;
    }

    // Cursor index helper — most recent cursorTrack keyframe at <= t
    function currentCursorIndex() {
      if (!cursorTrack.length) return -1;
      var t = video.currentTime;
      var idx = -1;
      for (var i = 0; i < cursorTrack.length; i++) {
        if (cursorTrack[i].t <= t + 0.001) idx = i;
        else break;
      }
      return idx;
    }

    // Callout — prefer cursor-anchored `say` field; fall back to beat copy.
    // The cursor is the protagonist; cursorTrack[i].say drives narration.
    var lastCalloutKey = "";
    function paintCallout() {
      if (!calloutEl) return;
      var ci = currentCursorIndex();
      var bi = currentBeatIndex();
      var say = null, counterStr = "", total = 0, idx = -1;
      // Walk back from current cursor to find the most recent `say`
      if (ci >= 0) {
        for (var i = ci; i >= 0; i--) {
          if (cursorTrack[i].say) { say = cursorTrack[i].say; idx = i; break; }
        }
        // Counter = "N / total cursor moves"
        total = cursorTrack.length;
        counterStr = (ci + 1) + " / " + total;
      }
      // Fallback to beat copy if no cursor say found
      if (!say && bi >= 0) {
        var b = beats[bi];
        say = { eyebrow: b.eyebrow, title: b.title, body: b.body };
        total = beats.length;
        counterStr = (bi + 1) + " / " + total;
      }
      if (!say) {
        calloutEl.classList.remove("is-visible");
        return;
      }
      var key = (idx >= 0 ? "c" + idx : "b" + bi);
      if (key === lastCalloutKey) return;
      lastCalloutKey = key;
      calloutEl.querySelector(".ds-callout-eyebrow").textContent = say.eyebrow || "Demo";
      var counterEl = calloutEl.querySelector(".ds-callout-counter");
      if (counterEl) counterEl.textContent = counterStr;
      calloutEl.querySelector(".ds-callout-title").textContent = say.title || "";
      calloutEl.querySelector(".ds-callout-body").textContent  = say.body || "";
      calloutEl.classList.add("is-visible");
    }

    // Cursor overlay positioning — assumes coords are normalized to a 1280x720 reference
    var CURSOR_REF_W = 1280, CURSOR_REF_H = 720;
    function paintCursor() {
      if (!cursorEl || !cursorTrack.length) return;
      var t = video.currentTime;
      var prev = null, next = null;
      for (var i = 0; i < cursorTrack.length; i++) {
        if (cursorTrack[i].t <= t) prev = cursorTrack[i];
        else { next = cursorTrack[i]; break; }
      }
      if (!prev) { cursorEl.classList.remove("is-visible"); return; }
      var stageRect = root.getBoundingClientRect();
      var sx = stageRect.width / CURSOR_REF_W;
      var sy = stageRect.height / CURSOR_REF_H;
      // Linear interp toward `next` if within 1.5s window
      var x = prev.x, y = prev.y;
      if (next && (next.t - prev.t) < 4) {
        var k = Math.min(1, (t - prev.t) / Math.max(0.05, next.t - prev.t));
        x = prev.x + (next.x - prev.x) * k;
        y = prev.y + (next.y - prev.y) * k;
      }
      cursorEl.style.left = (x * sx) + "px";
      cursorEl.style.top  = (y * sy) + "px";
      cursorEl.classList.add("is-visible");
      if (prev.action === "click" && Math.abs(t - prev.t) < 0.25) {
        cursorEl.classList.add("is-clicking");
        setTimeout(function () { cursorEl && cursorEl.classList.remove("is-clicking"); }, 420);
      }
    }

    // Scene scaling — fits the 1280×720 design space into the responsive 16:9 stage
    function rescaleScenes() {
      if (!useScenes) return;
      var rect = root.getBoundingClientRect();
      if (!rect.width) return;
      var sx = rect.width / 1280;
      var scenes = root.querySelectorAll(".ds-scene");
      scenes.forEach(function (el) { el.style.transform = "scale(" + sx + ")"; });
    }
    if (useScenes) {
      rescaleScenes();
      if (typeof ResizeObserver !== "undefined") {
        new ResizeObserver(rescaleScenes).observe(root);
      } else {
        window.addEventListener("resize", rescaleScenes);
      }
    }

    // Active-scene paint (scenes-mode only)
    function paintActiveScene() {
      if (!useScenes) return;
      var idx = currentBeatIndex();
      if (idx < 0) return;
      var sceneId = beats[idx].sceneId;
      if (!sceneId) return;
      var scenes = root.querySelectorAll(".ds-scene");
      scenes.forEach(function (s) {
        s.classList.toggle("is-active", s.dataset.scene === sceneId);
      });
    }

    // Time-update tick
    video.addEventListener("timeupdate", function () {
      paintTime();
      paintScrub();
      paintCallout();
      paintActiveTick();
      paintActiveChip();
      paintActiveScene();
      paintCursor();
    });
    video.addEventListener("loadedmetadata", function () {
      if (scrub) { scrub.min = "0"; scrub.max = "1000"; scrub.step = "1"; }
      buildTicks();
      paintTime();
      paintScrub();
      paintCallout();
      paintActiveTick();
      paintActiveChip();
      paintActiveScene();
      paintCursor();
      // Honor ?start / ?beat
      if (startBeat > 0 && beats[startBeat - 1]) {
        video.currentTime = beats[startBeat - 1].t;
      } else if (startSec > 0) {
        video.currentTime = Math.min(startSec, video.duration - 0.1);
      }
      if (speedOverride > 0) {
        video.playbackRate = speedOverride;
        if (speedSel) speedSel.value = String(speedOverride);
      }
      if (wantsAutoplay) {
        video.muted = true;
        video.play().catch(function () { /* autoplay blocked — user gesture required */ });
      }
    });
    video.addEventListener("play",  function () {
      setPlayingUI(true);
      if (playOverlay) playOverlay.classList.add("is-hidden");
    });
    video.addEventListener("pause", function () { setPlayingUI(false); });

    // Controls
    function jumpToBeat(d) {
      var idx = currentBeatIndex();
      var target = idx + d;
      if (target < 0) target = 0;
      if (target >= beats.length) target = beats.length - 1;
      if (beats[target]) video.currentTime = beats[target].t;
    }
    // Step through cursor keyframes — each press = one micro-action.
    // Falls back to beat-step when the demo has no cursorTrack.
    function jumpToCursor(d) {
      if (!cursorTrack.length) { jumpToBeat(d); return; }
      var ci = currentCursorIndex();
      var target = ci + d;
      if (target < 0) target = 0;
      if (target >= cursorTrack.length) target = cursorTrack.length - 1;
      var kf = cursorTrack[target];
      if (kf) video.currentTime = kf.t;
    }
    function nudge(dt) {
      var t = Math.max(0, Math.min((video.duration || 0) - 0.05, video.currentTime + dt));
      video.currentTime = t;
    }
    function toggle() {
      if (video.paused) video.play().catch(function () {}); else video.pause();
    }

    if (playBtn) playBtn.addEventListener("click", toggle);
    if (prevBtn) prevBtn.addEventListener("click", function () { jumpToCursor(-1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { jumpToCursor(1); });
    if (scrub) {
      scrub.addEventListener("input", function (e) {
        if (!isFinite(video.duration)) return;
        var v = parseInt(e.target.value, 10) / 1000;
        video.currentTime = v * video.duration;
      });
    }
    if (speedSel) {
      speedSel.addEventListener("change", function () {
        video.playbackRate = parseFloat(speedSel.value) || 1;
      });
    }

    // Keyboard
    document.addEventListener("keydown", function (e) {
      var tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.key === " " || e.key === "Spacebar") { toggle(); e.preventDefault(); return; }
      if (e.key === "ArrowLeft")  {
        if (e.shiftKey) nudge(-5); else jumpToCursor(-1);
        e.preventDefault(); return;
      }
      if (e.key === "ArrowRight") {
        if (e.shiftKey) nudge(5);  else jumpToCursor(1);
        e.preventDefault(); return;
      }
      if (e.key === ",") { video.playbackRate = Math.max(0.25, video.playbackRate - 0.1); return; }
      if (e.key === ".") { video.playbackRate = Math.min(3,    video.playbackRate + 0.1); return; }
      if (e.key === "Escape" && isEmbed) {
        try { window.parent.postMessage({ type: "ds:exit" }, "*"); } catch (_) {}
      }
    });

    // First paint
    setPlayingUI(false);

    // Kick off the virtual clock (fires loadedmetadata)
    if (useScenes && typeof video._start === "function") video._start();

    return {
      el: root,
      video: video,
      jumpToBeat: jumpToBeat,
      seek: function (t) { video.currentTime = t; },
      beats: beats
    };
  }

  global.DemoStage = { init: init };
})(window);
