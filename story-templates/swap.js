/* ============================================================================
   swap.js — URL-param-driven text + color swap for canonical Docusign templates
   ----------------------------------------------------------------------------
   Canonical templates mark copy-swap slots with `data-swap="key"` and tenant
   color slots with `data-swap-style="key:css-prop"`. This script reads
   ?key=value pairs from the URL and applies them on DOMContentLoaded.

   Usage in template:
     <span data-swap="tenant-name">Default Tenant</span>
     <span class="t-mark" data-swap-style="tenant-color:background">...</span>

   Invocation:
     /story-templates/docusign-clear-idv.html?tenant-name=Pinnacle&tenant-color=%23C8102E&ctx-headline=Verify+your+identity+before+we+update+the+address

   Decodes URL-encoded values, sets plain-text content only (no HTML injection),
   and supports any number of swap keys. No dependencies.
   ============================================================================ */
(function () {
  function apply() {
    var url;
    try { url = new URL(window.location.href); } catch (_) { return; }
    var params = url.searchParams;
    if (!params) return;

    // Text swaps
    document.querySelectorAll('[data-swap]').forEach(function (el) {
      var key = el.getAttribute('data-swap');
      if (!key) return;
      var val = params.get(key);
      if (val !== null && val !== undefined) {
        el.textContent = val;
      }
    });

    // Style swaps ("key:css-prop" — sets that CSS property on the element)
    document.querySelectorAll('[data-swap-style]').forEach(function (el) {
      var spec = el.getAttribute('data-swap-style');
      if (!spec) return;
      spec.split(';').forEach(function (pair) {
        var parts = pair.split(':');
        if (parts.length !== 2) return;
        var key = parts[0].trim();
        var prop = parts[1].trim();
        var val = params.get(key);
        if (val !== null && val !== undefined) {
          try { el.style.setProperty(prop, val); } catch (_) {}
        }
      });
    });

    // CSS variable swaps on :root ("--name" keys set that custom property)
    var rootStyle = document.documentElement.style;
    params.forEach(function (val, key) {
      if (key && key.indexOf('--') === 0) {
        try { rootStyle.setProperty(key, val); } catch (_) {}
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
