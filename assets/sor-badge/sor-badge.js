/* System of Record (SoR) Badge — JavaScript initialization
   ============================================================
   Reads ?preset=<vertical> from iframe URL and populates the badge.
   Call sorBadge.init() on page load.
*/

window.sorBadge = (function() {
  // Mapping of vertical key → vendor name
  const SOR_MAP = {
    // Banking
    'banking': 'nCino',
    'banking-deposits': 'nCino',

    // Wealth
    'wealth': 'Charles Schwab Advisor Center',
    'wealth-discovery': 'Charles Schwab Advisor Center',
    'wealth-hillside-aster': 'Charles Schwab Advisor Center',

    // Insurance
    'insurance': 'Guidewire PAS',
    'insurance-life': 'Guidewire',
    'insurance-pc': 'Guidewire',

    // Provider / HLS
    'provider': 'Epic',
    'provider-roi': 'Epic',

    // Life Sciences
    'lifesciences': 'Veeva Vault',

    // Payor
    'payor': 'HealthEdge',

    // Government
    'fedgov': 'Workday',
    'slgov': 'Salesforce Public Sector Solutions',
    'slgov-311': 'Salesforce Public Sector Solutions',
    'slgov-benefits': 'Salesforce Public Sector Solutions',
    'slgov-recertification': 'Salesforce Public Sector Solutions',
    'slgov-vendor-compliance': 'Salesforce Public Sector Solutions',
    'slgov-employee-onboarding': 'Workday',
    'slgov-licensing': 'Salesforce Public Sector Solutions',

    // Education & Nonprofit
    'education': 'Workday Student',
    'nonprofit': 'Salesforce NPSP',

    // Cross-org (e.g., sales & procurement not usually embedded in scene, but included for completeness)
    'sales': 'Salesforce CRM',
    'procurement': 'Coupa',
  };

  function getPresetFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('preset');
  }

  function populate() {
    const preset = getPresetFromUrl();
    const vendor = preset && SOR_MAP[preset] ? SOR_MAP[preset] : null;

    // Find or create the badge element
    let badge = document.getElementById('sor-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'sor-badge';
      badge.className = 'sor-badge';
      document.body.appendChild(badge);
    }

    // Populate the badge or hide it
    if (vendor) {
      badge.textContent = 'System of record: ' + vendor;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }

  return {
    init: function() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', populate);
      } else {
        populate();
      }
    },
    // Allow manual update if preset changes post-load
    update: populate
  };
})();

// Auto-initialize on load
window.sorBadge.init();
