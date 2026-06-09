import re, json, os
ROOT="/sessions/kind-vibrant-meitner/mnt/TGK 2.0"
F=os.path.join(ROOT,"payor.html")
html=open(F,encoding="utf-8").read()
CS="components/current-state/"
FB="demos/{d}.html?embed=1&pack=healthcare&loop=1&brand=Unity%20Health%20Plan&lw=Unity&sub=Health&accent=%231FA37A&mark=U"
def fut(d,label): return {"type":"component","src":FB.format(d=d),"label":label}
def cur(slug): return {"type":"component","src":CS+slug}

STEPS=[
{"icon":"user","label":"Enrollment","heading":"Member enrollment intake",
 "current":{"heading":"Broker drops a spreadsheet; Ops re-keys it into core admin",
   "media":cur("component-benefitfocus-enrollment-hls-payor.html"),
   "items":["Broker submits enrollments as a CSV batch upload","Dependent SSNs arrive separately by email","Enrollment Ops re-keys records into HealthRules Payor","Nothing is active until the nightly EDI batch runs"],
   "points":["Benefitfocus eEnrollment","HealthRules Payor"]},
 "future":{"heading":"A branded Web Form straight into the plan",
   "items":["Member or broker completes one adaptive, validated form","Dependents and SSNs captured up front, no email back-and-forth","Clean structured data flows to the core admin system","No re-keying, no held batch"],
   "tags":["Web Forms","Agreement Repository"],
   "media":fut("web-forms","Web Forms → the plan — live loop")}},

{"icon":"shield-check","label":"Eligibility & Identity","heading":"Eligibility & identity verification",
 "current":{"heading":"Eligibility waits on a nightly 270/271 EDI batch",
   "media":cur("component-healthedge-core-admin-hls-payor.html"),
   "items":["Coverage confirmed by a nightly 270/271 EDI run","24–48h before the member shows active anywhere","Identity is assumed from the enrollment file, not verified","Point-of-care checks fail during the lag window"],
   "points":["HealthRules Payor","270/271 EDI"]},
 "future":{"heading":"Verified identity, bound the moment they enroll",
   "items":["Member verifies identity once, in the flow","Identity binds to the member record and every downstream event","Eligibility is established without the batch lag","One verification, trusted across care and service"],
   "tags":["Identity Verification","Maestro"],
   "media":fut("idv-clear","Identity → bound to the member — live loop")}},

{"icon":"signature","label":"Plan Documents","heading":"Plan documents & HIPAA consent",
 "current":{"heading":"SBC/EOC mailed; HIPAA authorization returns by fax",
   "media":cur("component-quadient-eoc-hipaa-hls-payor.html"),
   "items":["Summary of Benefits and EOC mailed as a 38-page PDF packet","HIPAA authorization signed wet-ink and returned by fax","Faxed forms scanned to imaging and indexed days later","Illegible or lost forms drop into an Ops exception queue"],
   "points":["Quadient Inspire","Imaging / Fax"]},
 "future":{"heading":"Acknowledged and authorized in one session",
   "items":["SBC/EOC acknowledgment and HIPAA authorization in the same flow","Identity-bound consent — no wet ink, no fax","A clean, audit-grade Certificate of Completion","Nothing to mail, scan, or re-index"],
   "tags":["eSignature","Certificate of Completion"],
   "media":fut("esignature","Acknowledge + authorize — live loop")}},

{"icon":"card","label":"ID Card","heading":"ID card & welcome kit",
 "current":{"heading":"Physical card printed and mailed by a fulfillment vendor",
   "media":cur("component-fulfillment-id-card-hls-payor.html"),
   "items":["Card order held until eligibility flips active","Third-party vendor prints and mails — 7–10 business days","No digital card in the meantime","Member can't fill an Rx or see a PCP until it arrives"],
   "points":["Fulfillment vendor","USPS"]},
 "future":{"heading":"A digital member card the moment they're active",
   "items":["Maestro issues a digital ID card on activation","Member transacts immediately — pharmacy, PCP, portal","Physical card still mails, but it's no longer the gate","Issuance orchestrated, tracked, and audit-logged"],
   "tags":["Maestro","Agreement Repository"],
   "media":fut("maestro","Orchestrated issuance — live loop")}},

{"icon":"checklist","label":"Prior Authorization","heading":"First prior authorization",
 "current":{"heading":"Provider faxes the request; a nurse re-keys it",
   "media":cur("component-um-prior-auth-fax-hls-payor.html"),
   "items":["Provider faxes a 14-page prior-auth packet","UM nurse re-keys it into the case before review","Status invisible to member and provider for days","Decision letter arrives by mail after the fact"],
   "points":["Utilization Mgmt (MCG)","Fax intake"]},
 "future":{"heading":"A structured request with status both sides can see",
   "items":["Provider submits a structured, validated prior-auth form","Member identity and coverage already bound — no re-keying","Status visible to provider and member in real time","Clean hand-off into clinical review"],
   "tags":["Web Forms","Maestro"],
   "media":fut("web-forms","Structured prior-auth intake — live loop")}},

{"icon":"database","label":"Claims & Record","heading":"First claim & member record",
 "current":{"heading":"One member, scattered across QNXT, imaging, and call logs",
   "media":cur("component-qnxt-claims-member-hls-payor.html"),
   "items":["First claim adjudicates in QNXT; EOB mailed on paper","Member calls to understand a denied line","Rep stitches QNXT, imaging, and call logs live","Prior auth and consent aren't linked to the claim"],
   "points":["TriZetto QNXT","Imaging / Call logs"]},
 "future":{"heading":"One queryable record, every event linked",
   "items":["Enrollment, consent, auth, and claim resolve to one record","Service reps answer from a single agreement view","Every event carries the identity binding and timestamps","Disputes resolve to one defensible chain"],
   "tags":["Navigator","Workspaces"],
   "media":fut("navigator","One member record — live loop")}},
]

# inject steps-data
data=json.dumps(STEPS,indent=2,ensure_ascii=False)
html=re.sub(r'(<script id="steps-data" type="application/json">)(.*?)(</script>)',
            lambda m: m.group(1)+"\n"+data+"\n"+m.group(3), html, count=1, flags=re.S)

# header swaps
reps=[
('<title>311 Citizen Reporting & Field Inspection — Current State vs. Future State | Docusign IAM</title>',
 '<title>Health Plan — Member Onboarding & First Claim — Current State vs. Future State | Docusign IAM</title>'),
('<meta name="description" content="Process-flow view of the 311 citizen reporting and field inspection intake journey today versus with Docusign IAM.">',
 '<meta name="description" content="Process-flow view of the health-plan member onboarding and first-claim journey today versus with Docusign IAM.">'),
('<h1>311 Citizen Reporting & Field Inspection — Current State vs. Future State</h1>',
 '<h1>Member Onboarding & First Claim — Current State vs. Future State</h1>'),
("A process-flow view of how agencies collect citizen reports and field-inspection milestones today, and how Docusign IAM transforms QR / link intake, geolocated photo collection, and ServiceNow case dispatch — without a signature. Click any node to compare today's friction with the future-state experience.",
 "A process-flow view of how a health plan onboards a new member and handles their first claim today — broker spreadsheets, EDI lag, mailed cards, faxed prior auths — and how Docusign IAM verifies identity once and binds it to enrollment, consent, authorization, and the claim. Click any node to compare today's friction with the future-state experience."),
('ServiceNow Public Sector CSM','HealthEdge HealthRules Payor'),
('GIS / Mapping Service','TriZetto QNXT Claims'),
('SMS Gateway','Utilization Mgmt (MCG)'),
('311 Citizen Reporting & Field Inspection — report to dispatch','Member Onboarding & First Claim — enroll to adjudicate'),
('Citizen / Contractor → Ops Center → ServiceNow · 6 steps','Member / Provider → Health Plan Ops → HealthEdge · 6 steps'),
]
miss=[]
for a,b in reps:
    if a in html: html=html.replace(a,b,1)
    else: miss.append(a[:50])
open(F,"w",encoding="utf-8").write(html)
print("steps:",len(STEPS),"| header swaps missed:",miss if miss else "none")
