/* Autopilot stage scaffolding — shared across story stage templates.
   Pairs with the autopilot state machine in stories/_shared/story-shell.html.

   Protocol (postMessage; mirrors the existing tgk: convention — {type:"tgk:..."}):
     shell → stage   {type:"tgk:gate", on:true,  hotspots:[{sel,eyebrow,title,body}]}
                     {type:"tgk:gate", on:false}
     stage → shell   {type:"tgk:grabWheel", index, sel, eyebrow, title, body}

   On gate-on: glow each hotspot whose `sel` resolves to a *visible* element and
   arm a click that grabs the wheel. On gate-off: clear all glows/handlers.

   Backward-compatible: does nothing until a tgk:gate message arrives, so any
   template that includes this but is never gated behaves exactly as before. */
(function () {
  if (window.__tgkAutopilotStage) return;          // idempotent include guard
  window.__tgkAutopilotStage = true;

  var GLOW = "tgk-ap-hot";
  var active = [];                                  // [{ el, handler }]

  // Inject the glow style once (no layout impact — outline + box-shadow only).
  var style = document.createElement("style");
  style.setAttribute("data-tgk-autopilot", "");
  style.textContent =
    "@keyframes tgk-ap-pulse{0%,100%{box-shadow:0 0 0 0 rgba(76,0,255,.45)}" +
    "50%{box-shadow:0 0 0 6px rgba(76,0,255,.10)}}" +
    "." + GLOW + "{outline:2px solid #4C00FF!important;outline-offset:2px;" +
    "border-radius:6px;cursor:pointer!important;animation:tgk-ap-pulse 1.6s ease-in-out infinite;}";
  document.head.appendChild(style);

  function clear() {
    active.forEach(function (a) {
      a.el.classList.remove(GLOW);
      a.el.removeEventListener("click", a.handler, true);
    });
    active = [];
  }

  function isVisible(el) {
    return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  }

  function gateOn(hotspots) {
    clear();
    (hotspots || []).forEach(function (h, i) {
      if (!h || !h.sel) return;
      var el;
      try { el = document.querySelector(h.sel); } catch (e) { return; }
      if (!isVisible(el)) return;
      var detail = {
        index: i, sel: h.sel,
        eyebrow: h.eyebrow || "", title: h.title || "", body: h.body || ""
      };
      var handler = function (ev) {
        // Only a real click on a declared hotspot grabs the wheel.
        ev.stopPropagation();
        try {
          parent.postMessage({
            type: "tgk:grabWheel",
            index: detail.index, sel: detail.sel,
            eyebrow: detail.eyebrow, title: detail.title, body: detail.body
          }, "*");
        } catch (e) {}
      };
      el.classList.add(GLOW);
      el.addEventListener("click", handler, true);
      active.push({ el: el, handler: handler });
    });
  }

  window.addEventListener("message", function (ev) {
    var msg = ev.data;
    if (!msg || typeof msg !== "object" || msg.type !== "tgk:gate") return;
    if (msg.on) gateOn(msg.hotspots);
    else clear();
  });
})();
