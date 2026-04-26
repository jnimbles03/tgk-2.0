# PRESETS schema — docusign-workspace.html

The `PRESETS` registry at the bottom of `docusign-workspace.html` holds
all tenant, vertical, and process-specific content for Scene 4. Every
string, color, and imagery decision lives here — **no tenant content
lives in the DOM above the registry.** Add a new entry to support a
new vertical, sub-vertical, or specific process.

## Key naming convention

Top-level keys use one of two patterns:

- **Vertical-only:** `wealth`, `banking`, `insurance` — short, used for
  the classic 10-vertical loop where each vertical has one canonical
  onboarding/new-customer process.
- **Vertical-subvertical-process:** `banking-commercial-loan-mod`,
  `lifesciences-mlr-review`, `wealth-estate-transition` — hyphenated,
  used when a single vertical needs multiple distinct Workspace demos
  (e.g., banking has both "new commercial facility" and "loan
  modification" as separate scenarios).

Sub-vertical keys do **not** need to match any tenant name or customer
— they're just routing slugs. The tenant name, customer, and process
details live in the preset fields.

## Full preset shape

Every preset is an object with this shape (all fields required unless
noted):

```javascript
"preset-key": {
  label: "Display Name",            // shown in the bottom-right chip

  tenant: {
    name:      "Tenant Full Name",  // e.g., "Hillside Advisors"
    wordmark:  "Tenant",            // short, shown in tenant bar + email header
    primary:   "#0F2A1F",           // --tn-primary (dark brand color)
    accent:    "#3FDA99",           // --tn-accent  (tenant highlight)
    markColor: "#3FDA99",           // SVG mark stroke color (matches accent)
    mark:      '<svg viewBox="0 0 24 24" fill="none">...</svg>'
                                    // inline SVG for tenant mark
                                    // use stroke="currentColor" so markColor applies
  },

  email: {
    greeting: "Hello Amy,",
    p1:       "Opening paragraph explaining why the workspace was opened…",
    p2:       "Closing paragraph inviting them to reach out with questions.",
    sender:   "Casey Anderson",     // shown as signature name
    role:     "Investment Advisor"  // shown below signature
                                    // tenant org auto-fills from tenant.name
  },

  workspace: {
    title:         "New Wealth Management Client — Amy Peters",
                                    // large title in Scene 2 header
    avatars:       ["FA","CU","IN"],// initials for 3 visible participant avatars
    moreCount:     4,               // "+N more" badge count (0 hides it)
    userInitials:  "CA",            // initials in the Docusign topbar avatar
                                    // (represents the logged-in user, usually the sender)
    tenantSub:     "Private wealth onboarding"
                                    // small subtitle in tenant bar next to wordmark
                                    // Good place for sub-vertical / case number / process label
  },

  summary: {
    heroTitle: "Welcome back, Casey — here's where Amy's workspace stands.",
                                    // Overview tab hero h2
    heroLede:  "Amy opened her access email… 6 onboarding tasks waiting…",
                                    // paragraph under the hero
    pct:       33,                  // overall progress %  (0-100)
    tiles: [                        // 4 KPI tiles (exactly 4)
      { lab:"Open tasks",     val:"6",      sub:"Waiting on Amy"          },
      { lab:"Risk score",     val:"25/100", sub:"Low · preliminary",   accent:true },
      { lab:"Docs signed",    val:"0/3",    sub:"IAA, Disclosures…"      },
      { lab:"Next deadline",  val:"Apr 30", sub:"6 days · onboarding", warn:true   }
    ],
    list: [                         // 3 "recent signatures & uploads" rows
      { nm:"Event headline", mt:"Event detail", rt:"10:14 am"               },
      { nm:"Event headline", mt:"Event detail", rt:"Delivered", ok:true     }
    ]
  },

  sections: [                       // exactly 2 task sections
    {
      title: "Section 1 heading",
      tasks: [                      // 3 tasks recommended per section
        { name:"Task name" },
        { name:"Task with meta",   meta:"e.g., Risk score 25/100"     },
        { name:"Task with chip",   chip:"e.g., Imported from Quik!"   }
      ]
    },
    {
      title: "Section 2 heading",
      tasks: [
        { name:"Task name" },
        { name:"Task name" },
        { name:"Task name" }
      ]
    }
  ],

  activity: [                       // Activity rail — 3 most-recent events
    { kind:"Tasks sent",      time:"10:01 am", detail:"Plain-text or <b>HTML</b>" },
    { kind:"Roles assigned",  time:"9:54 am",  detail:"...",  link:"View roles" },
    { kind:"Workspace created",time:"9:26 am", detail:"Created from the <b>Template Name</b> template." }
  ],

  iris: {
    heroTitle: "Iris can answer across Amy's agreements.",
                                    // Iris rail hero headline
    heroDesc:  "Ask about … risk, clauses, anything uploaded.",
                                    // paragraph under hero
    prompt:    "Try: \"Summarize Amy's risk profile…\"",
                                    // italic suggested query under the button
    agreements: [                   // 5-6 agreement rows
                                    // format: "Name · Status · Page count"
      "Client Intake Form · In progress · 4 pages",
      "California Driver's License · Uploaded · 1 page",
      "Investment Advisory Agreement · Ready to send · 8 pages"
    ]
  },

  agent: {
    title: "Wealth Agent",          // agent title in drill-down agent panel
    sub:   "KYC & Risk",            // subtitle (vertical auto-prepends tenant wordmark)
    checks: [                       // 7 checks recommended — the drill-down animates through
      ["Check label",     "Detail text shown below the label"],
      ["Identity match",  "Name, DOB, address match intake form"],
      ["…",                "…"]
    ],
    summary: "<b>7 checks passed · 0 advisory notes.</b> Summary sentence."
                                    // HTML allowed; shown after checks complete
  }
}
```

## Minimum viable preset

If you're in a rush, the smallest viable preset has: `label`, `tenant`
(all 6 fields), `email` (5 fields), `workspace` (5 fields), `summary`
(heroTitle + heroLede + pct + 4 tiles + 3 list rows), `sections` (2
sections with at least 1 task each), `activity` (at least 1 event),
`iris` (heroTitle + heroDesc + prompt + at least 1 agreement), `agent`
(title + sub + at least 3 checks + summary). Any field left blank will
render an empty slot, not break layout.

## After adding a preset

1. Append the new key to `PRESET_ORDER` at the bottom of the file so it
   shows up in the chip selector. Order is alphabetical by convention
   but not enforced — put big/important sub-presets next to their
   parent vertical.
2. Test via URL: `docusign-workspace.html?preset=your-new-key`
3. Test with the MasterCard splash:
   `docusign-workspace.html?splash=1&preset=your-new-key`
4. If the new sub-preset is the canonical Scene 4 for a vertical, link
   it from that vertical's `recipe.json` `spineRoles.mastercard`:
   `/story-templates/docusign-workspace.html?splash=1&preset=your-new-key`

## Iris icon convention

The agent panel icon and the "Ask Iris" button use the same 8-point
sparkle polygon:
`<polygon points="12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9 12 2"/>`.
Don't swap this — it's the project Iris mark. Sub-preset agents get a
different `title` (e.g., "Commercial KYB Agent", "MLR Review Agent"),
not a different visual.

## Tenant color discipline

- `tenant.primary` should be a dark, confident brand color (reads on
  Ecru background surfaces).
- `tenant.accent` should be light enough to show as the tenant mark
  fill on the dark primary. Typical: 200-400 lightness range.
- Don't reuse Docusign purple (#4B00E9) as a tenant color — that's
  reserved for the Docusign topbar and product chrome.
- Want to see how a color combination reads? Preview with
  `?preset=your-key` and check the email header, tenant bar, and the
  tenant chip styling at a glance.

## Existing presets (reference)

Top-level vertical presets (10): `wealth`, `banking`, `insurance`,
`provider`, `lifesciences`, `payor`, `fedgov`, `slgov`, `education`,
`nonprofit`.

Sub-vertical presets: `banking-commercial-loan-mod`,
`lifesciences-mlr-review`, `wealth-estate-transition` (as of
2026-04-24). Add more as real sub-processes come up — don't force a
preset to exist without a concrete scenario behind it.
