/* ===================================================================
   demo-engine.js — shared player for re-skinnable animated demos.
   Injects the full chrome (top bar + pack picker, narration sidebar,
   stage, cursor, transport) around a demo's product scenes, then runs
   the timeline. Product-specific text/state is delegated to the demo
   via paintContent(pack) and onTime(time, pack).

   Usage (in a demo HTML file):
     <div id="demo-root"></div>
     <script src="engine/demo-engine.js"></script>
     <script> DemoEngine.init({
        meta:{ title, productTag, home:"index.html",
               footnote:"...", stageDots:true },
        packs:{ banking:{...}, healthcare:{...} },
        defaultPack:"banking",
        timeline:{ totalDuration, beats:[{t,key,sceneId}],
                   cursorTrack:[{t,x,y,action,sayKey,fill}] },   // x/y in 1280x720
        scenes:"<section class='de-scene' data-scene='form'>…</section>…",
        paintContent(pack, root){…},   // inject brand/labels/values text
        onTime(time, pack, root){…}     // optional per-frame state (fills, steps)
     }); </script>

   Pack shape:
     theme:{ "--tenant-accent","--tenant-accent-soft","--tenant-ink" }
     brand:{ name, mark, poweredBy }
     persona:{ name, role, side }
     url, sorBadge
     say:{ key:{ eyebrow, title, body } }
   Deep-links: ?pack=<key>  ?t=<seconds>
=================================================================== */
(function (global) {
  "use strict";
  const CURSOR = '<div class="ring"></div><svg viewBox="0 0 24 24"><path d="M4 2 L4 18 L8.5 14 L11.5 21 L14 20 L11 13 L17 13 Z" fill="#fff" stroke="#130032" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  const RESTART = '<svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>';
  const PLAY = '<polygon points="6 4 20 12 6 20 6 4"/>';
  const PAUSE = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';

  function fmt(s){ s=Math.max(0,Math.floor(s)); return Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); }
  function initials(n){ return (n||"·").split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase()||"·"; }

  // Per-embed tenant override: discovery drill-downs pass accent/brand/mark in the
  // URL so one set of demos can wear each story's tenant without authoring packs.
  function overridePack(p){
    const q = new URLSearchParams(location.search);
    if(!q.has("accent") && !q.has("brand")) return p;
    const c = JSON.parse(JSON.stringify(p));
    const tint=(hex)=>{ const m=hex.replace('#',''); if(m.length<6) return hex;
      const r=parseInt(m.slice(0,2),16),g=parseInt(m.slice(2,4),16),b=parseInt(m.slice(4,6),16),mix=v=>Math.round(v+(255-v)*0.88);
      return 'rgb('+mix(r)+','+mix(g)+','+mix(b)+')'; };
    if(q.get("accent")){ c.theme["--tenant-accent"]=q.get("accent"); c.theme["--tenant-accent-soft"]=q.get("accentSoft")||tint(q.get("accent")); }
    if(q.get("ink")) c.theme["--tenant-ink"]=q.get("ink");
    const b=q.get("brand");
    if(b){ if(c.brand) c.brand.name=b; c.cobrand=b; if(c.logo){ c.logo.lw=q.get("lw")||b; if(q.has("sub")) c.logo.sub=q.get("sub"); } }
    if(q.get("mark")&&c.brand) c.brand.mark=q.get("mark");
    return c;
  }

  function init(DEMO){
    const Q = new URLSearchParams(location.search);
    const packKeys = Object.keys(DEMO.packs);
    let pack = Q.get("pack") && DEMO.packs[Q.get("pack")] ? Q.get("pack") : (DEMO.defaultPack || packKeys[0]);
    const TL = DEMO.timeline;
    const beats = TL.beats.slice().sort((a,b)=>a.t-b.t);
    const track = TL.cursorTrack.slice().sort((a,b)=>a.t-b.t);
    const DUR = TL.totalDuration;
    let t = 0, playing = false, raf = 0, lastTick = 0, lastClick = -1, lastPos = null;

    // ---- build chrome ----
    const root = document.getElementById("demo-root");
    root.className = "de-wrap";
    root.innerHTML =
      '<div class="de-top"><h1><span class="tag" id="de-tag"></span><span id="de-title"></span></h1>'+
        '<div class="de-picker"><span class="lbl">Vertical</span><span id="de-packbtns"></span>'+
        (DEMO.meta && DEMO.meta.home ? '<a class="home" href="'+DEMO.meta.home+'">All demos</a>' : '')+'</div></div>'+
      '<div class="de-shell">'+
        '<aside class="de-side">'+
          '<div class="de-brand"><div class="mark" id="de-mark"></div><div><div class="bn" id="de-brand"></div><div class="pb" id="de-pb"></div></div></div>'+
          '<div class="de-persona" id="de-persona"><div class="avatar" id="de-av"></div><div><div class="nm" id="de-nm"></div><div class="rl" id="de-rl"></div></div></div>'+
          '<div class="de-step" id="de-step"></div><div class="de-head" id="de-head"></div><div class="de-lede" id="de-lede"></div>'+
          '<div class="de-spacer"></div>'+
          '<div class="de-pips" id="de-pips"></div>'+
          '<div class="de-meta"><span id="de-counter"></span><span id="de-timer"></span></div>'+
          '<div class="de-trans"><button class="de-tbtn" id="de-restart" title="Restart">'+RESTART+'</button>'+
            '<button class="de-tbtn play" id="de-play"><svg viewBox="0 0 24 24" id="de-playicon">'+PLAY+'</svg><span id="de-playlbl">Play</span></button></div>'+
        '</aside>'+
        '<div class="de-stageframe"><div class="de-stagebar">'+
            '<span class="dots"><i></i><i></i><i></i></span><span id="de-url"></span><span class="sor" id="de-sor"></span></div>'+
          '<div class="de-stage" id="de-stage"><div class="de-canvas" id="de-canvas">'+
            DEMO.scenes + '<div class="de-cursor" id="de-cursor">'+CURSOR+'</div>'+
          '</div></div></div>'+
      '</div>'+
      (DEMO.meta && DEMO.meta.footnote ? '<div class="de-foot">'+DEMO.meta.footnote+'</div>' : '');

    const $ = id => document.getElementById(id);
    $("de-tag").textContent = (DEMO.meta && DEMO.meta.productTag) || "";
    $("de-title").textContent = " " + ((DEMO.meta && DEMO.meta.title) || "");

    // pack buttons
    $("de-packbtns").innerHTML = packKeys.map(k=>{
      const p = DEMO.packs[k];
      return '<button class="de-vbtn" data-pack="'+k+'" style="--vd:'+(p.theme["--tenant-accent"]||"#888")+'">'+
        '<span class="dot"></span> '+(p.label || p.brand.name)+'</button>';
    }).join("");
    document.querySelectorAll(".de-vbtn").forEach(b=>b.addEventListener("click",()=>{ pack=b.dataset.pack; applyPack(); }));

    // ---- painters ----
    function applyPack(){
      const p = overridePack(DEMO.packs[pack]), rs = document.documentElement;
      Object.entries(p.theme).forEach(([k,v])=>rs.style.setProperty(k,v));
      $("de-mark").textContent = p.brand.mark; $("de-brand").textContent = p.brand.name; $("de-pb").textContent = p.brand.poweredBy || "Powered by Docusign";
      $("de-persona").dataset.side = p.persona.side || "advisor";
      $("de-av").textContent = initials(p.persona.name); $("de-nm").textContent = p.persona.name; $("de-rl").textContent = p.persona.role;
      $("de-url").textContent = p.url || ""; $("de-sor").textContent = p.sorBadge || "";
      document.querySelectorAll(".de-vbtn").forEach(b=>b.classList.toggle("is-active",b.dataset.pack===pack));
      if (DEMO.paintContent) DEMO.paintContent(p, $("de-canvas"));
      paintAll();
    }
    function beatIdx(){ let i=0; beats.forEach((b,k)=>{ if(b.t<=t+0.02) i=k; }); return i; }
    function curBeat(){ return beats[beatIdx()]; }
    function paintNarr(){
      const p = DEMO.packs[pack]; let say=null;
      for(let i=track.length-1;i>=0;i--){ const c=track[i]; if(c.t<=t+0.02 && c.sayKey){ say=p.say[c.sayKey]; break; } }
      if(!say){ const b=curBeat(); if(b) say=p.say[b.key]; }
      if(!say) return;
      const bi=beatIdx();
      $("de-step").textContent=(say.eyebrow||"DEMO").toUpperCase()+" · "+(bi+1)+" / "+beats.length;
      $("de-head").textContent=say.title||""; $("de-lede").innerHTML="<p>"+(say.body||"")+"</p>";
    }
    function paintScene(){ const b=curBeat(); if(!b) return;
      document.querySelectorAll(".de-scene").forEach(s=>s.classList.toggle("is-active",s.dataset.scene===b.sceneId)); }
    // Resolve a keyframe's position in 1280x720 canvas space. A keyframe may
    // anchor to a live element (target:"#sel") — its center is measured and the
    // scale transform divided out, so the cursor lands true regardless of layout,
    // stage size, or re-skin. Falls back to literal x/y.
    const canvas = $("de-canvas");
    function posOf(kf){
      if(kf && kf.target){
        const el = canvas.querySelector(kf.target);
        if(el){
          const cr = canvas.getBoundingClientRect(), er = el.getBoundingClientRect(), sc = (cr.width/1280)||1;
          if(er.width||er.height) return { x:(er.left+er.width/2-cr.left)/sc, y:(er.top+er.height/2-cr.top)/sc };
        }
        return null; // named target not resolvable this frame → hold last position (no 0,0 snap)
      }
      if(kf && (kf.x!=null || kf.y!=null)) return { x:kf.x||0, y:kf.y||0 };
      return null;
    }
    // smootherstep / minimum-jerk — the canonical natural human-reach curve
    const ease5 = k => k*k*k*(k*(k*6-15)+10);
    // stable 0..1 value from a keyframe time → per-move variation that's identical on every replay
    const rand01 = s => { const v=Math.sin(s*127.1+0.137)*43758.5453; return v-Math.floor(v); };
    function paintCursor(){
      const cur=$("de-cursor"); let prev=null,next=null;
      for(let i=0;i<track.length;i++){ if(track[i].t<=t) prev=track[i]; else { next=track[i]; break; } }
      if(!prev){ cur.classList.remove("show"); return; }
      const pp = posOf(prev) || lastPos;
      if(!pp){ cur.classList.remove("show"); return; }
      let x=pp.x, y=pp.y, moving=false;
      if(next){
        const np = posOf(next);
        if(np){
          const dx=np.x-pp.x, dy=np.y-pp.y, dist=Math.hypot(dx,dy), r=rand01(next.t);
          // duration scales with distance + a per-move jitter, so the rhythm never repeats
          let moveDur=Math.min(next.t-prev.t, 0.28 + dist/2200 + r*0.20);
          moveDur=Math.max(0.22, moveDur);
          const moveStart=next.t-moveDur;
          if(t>moveStart){
            moving=true;
            const k=Math.min(1,(t-moveStart)/Math.max(.05,moveDur)), e=ease5(k);
            x=pp.x+dx*e; y=pp.y+dy*e;
            // gentle path bow (side alternates per move) so motion isn't ruler-straight
            const len=dist||1, bow=Math.min(26,dist*0.07)*Math.sin(Math.PI*k)*(r<0.5?1:-1);
            x += -dy/len*bow; y += dx/len*bow;
          }
        }
      }
      // alive at rest: tiny varied drift while dwelling, fading to zero right at a click
      if(!moving){
        const settle=Math.min(1,Math.abs(t-prev.t)/0.25), ph=prev.t*3.3;
        x += Math.sin(t*2.0+ph)*1.4*settle;
        y += Math.cos(t*1.6+ph*1.7)*1.1*settle;
      }
      lastPos={x,y};
      cur.classList.add("show"); cur.style.left=x+"px"; cur.style.top=y+"px";
      if(prev.action==="click" && Math.abs(t-prev.t)<0.18 && lastClick!==prev.t){ lastClick=prev.t; cur.classList.remove("click"); void cur.offsetWidth; cur.classList.add("click"); }
    }
    function paintMeta(){
      const pips=$("de-pips");
      if(pips.children.length!==beats.length){ pips.innerHTML=""; beats.forEach(()=>{ const s=document.createElement("span"); s.className="de-pip"; pips.appendChild(s); }); }
      const idx=beatIdx();
      [...pips.children].forEach((n,i)=>{ n.className="de-pip"+(i<idx?" done":i===idx?" on":""); });
      $("de-counter").textContent="Beat "+(idx+1)+" of "+beats.length;
      $("de-timer").textContent=fmt(t)+" / "+fmt(DUR);
    }
    function paintAll(){ paintCursor(); paintNarr(); paintScene(); if(DEMO.onTime) DEMO.onTime(t, DEMO.packs[pack], $("de-canvas")); paintMeta(); }

    // ---- transport ----
    function setUI(){ $("de-playlbl").textContent=playing?"Pause":"Play"; $("de-playicon").innerHTML=playing?PAUSE:PLAY; }
    const EMBED=Q.get("embed")==="1", LOOP=EMBED||Q.get("loop")==="1";
    function step(now){ if(!playing) return; if(!lastTick) lastTick=now; t+=(now-lastTick)/1000; lastTick=now;
      if(t>=DUR){ if(LOOP){ t=0; lastTick=now; paintAll(); raf=requestAnimationFrame(step); return; } t=DUR; playing=false; setUI(); paintAll(); return; } paintAll(); raf=requestAnimationFrame(step); }
    function play(){ if(playing) return; if(t>=DUR) t=0; playing=true; lastTick=0; setUI(); raf=requestAnimationFrame(step); }
    function pause(){ playing=false; cancelAnimationFrame(raf); lastTick=0; setUI(); }
    function restart(){ t=0; paintAll(); if(!playing) play(); }
    function rescale(){ const st=$("de-stage"); $("de-canvas").style.transform="scale("+(st.clientWidth/1280)+")"; }

    $("de-play").addEventListener("click",()=>playing?pause():play());
    $("de-restart").addEventListener("click",restart);
    window.addEventListener("resize",rescale);
    document.addEventListener("keydown",e=>{ if(e.code==="Space"){ e.preventDefault(); playing?pause():play(); }
      if(e.key==="ArrowRight"){ const i=Math.min(beats.length-1,beatIdx()+1); t=beats[i].t; paintAll(); }
      if(e.key==="ArrowLeft"){ const i=Math.max(0,beatIdx()-1); t=beats[i].t; paintAll(); } });

    if(EMBED){ root.classList.add("de-embed"); document.body.classList.add("de-embed"); }
    applyPack(); rescale(); paintAll();
    if(Q.has("t")){ t=Math.max(0,Math.min(DUR,parseFloat(Q.get("t"))||0)); paintAll(); }
    else { setTimeout(()=>play(), EMBED?150:700); }

    return { play, pause, restart, seek:(s)=>{ t=s; paintAll(); } };
  }

  /* -----------------------------------------------------------------
     Interactive mode — no autoplay/cursor. Real event handlers in the
     demo drive the sidebar via the api. The demo provides:
       meta, packs (with say), steps (count), scenes (real inputs),
       setup(pack, canvas, api)   // wire handlers + reset + first narrate
     api: narrate(sayKey), progress(stepIndex), done(sayKey), pack, auto (bool)
     ----------------------------------------------------------------- */
  function interactive(DEMO){
    const Q = new URLSearchParams(location.search);
    const packKeys = Object.keys(DEMO.packs);
    let pack = Q.get("pack") && DEMO.packs[Q.get("pack")] ? Q.get("pack") : (DEMO.defaultPack || packKeys[0]);
    const auto = Q.get("auto") === "1", ATTRACT = Q.get("attract") === "1";

    const root = document.getElementById("demo-root"); root.className = "de-wrap";
    root.innerHTML =
      '<div class="de-top"><h1><span class="tag" id="de-tag"></span><span id="de-title"></span></h1>'+
        '<div class="de-picker"><span class="lbl">Vertical</span><span id="de-packbtns"></span>'+
        (DEMO.meta&&DEMO.meta.home?'<a class="home" href="'+DEMO.meta.home+'">All demos</a>':'')+'</div></div>'+
      '<div class="de-shell"><aside class="de-side">'+
        '<div class="de-brand"><div class="mark" id="de-mark"></div><div><div class="bn" id="de-brand"></div><div class="pb" id="de-pb"></div></div></div>'+
        '<div class="de-persona" id="de-persona"><div class="avatar" id="de-av"></div><div><div class="nm" id="de-nm"></div><div class="rl" id="de-rl"></div></div></div>'+
        '<div class="de-step" id="de-step"></div><div class="de-head" id="de-head"></div><div class="de-lede" id="de-lede"></div>'+
        '<div class="de-spacer"></div><div class="de-livehint" id="de-livehint"><span class="dot"></span> Live — interact with the demo</div>'+
        '<div class="de-pips" id="de-pips"></div><div class="de-meta"><span id="de-counter"></span><span></span></div>'+
        '<div class="de-trans"><button class="de-tbtn play" id="de-reset"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 5V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg><span>Reset</span></button></div>'+
      '</aside>'+
      '<div class="de-stageframe"><div class="de-stagebar"><span class="dots"><i></i><i></i><i></i></span><span id="de-url"></span><span class="sor" id="de-sor"></span></div>'+
        '<div class="de-stage" id="de-stage"><div class="de-canvas" id="de-canvas">'+DEMO.scenes+'</div></div></div></div>'+
      (DEMO.meta&&DEMO.meta.footnote?'<div class="de-foot">'+DEMO.meta.footnote+'</div>':'');

    const $ = id => document.getElementById(id);
    $("de-tag").textContent = (DEMO.meta&&DEMO.meta.productTag)||"";
    $("de-title").textContent = " " + ((DEMO.meta&&DEMO.meta.title)||"");
    $("de-packbtns").innerHTML = packKeys.map(k=>{ const p=DEMO.packs[k];
      return '<button class="de-vbtn" data-pack="'+k+'" style="--vd:'+(p.theme["--tenant-accent"]||"#888")+'"><span class="dot"></span> '+(p.label||p.brand.name)+'</button>'; }).join("");

    const canvas = $("de-canvas");
    function rescale(){ const st=$("de-stage"); canvas.style.transform="scale("+(st.clientWidth/1280)+")"; }
    window.addEventListener("resize", rescale);

    const api = {
      get pack(){ return DEMO.packs[pack]; },
      _forceAuto:false, _timers:[],
      get auto(){ return auto || this._forceAuto; },
      // cancelable timers — attract mode aborts a running self-run on interaction
      after(ms,fn){ const id=setTimeout(()=>{ this._timers=this._timers.filter(x=>x!==id); fn(); }, ms); this._timers.push(id); return id; },
      cancelAuto(){ this._timers.forEach(clearTimeout); this._timers=[]; },
      narrate(key){ const s=DEMO.packs[pack].say[key]; if(!s)return;
        $("de-step").textContent=(s.eyebrow||"DEMO").toUpperCase(); $("de-head").textContent=s.title||""; $("de-lede").innerHTML="<p>"+(s.body||"")+"</p>"; },
      progress(i){ const tot=DEMO.steps||1, pips=$("de-pips");
        if(pips.children.length!==tot){ pips.innerHTML=""; for(let k=0;k<tot;k++){ const sp=document.createElement("span"); sp.className="de-pip"; pips.appendChild(sp); } }
        [...pips.children].forEach((n,k)=>{ n.className="de-pip"+(k<i?" done":k===i?" on":""); });
        $("de-counter").textContent="Step "+Math.min(i+1,tot)+" of "+tot; },
      done(key){ const pips=$("de-pips"); [...pips.children].forEach(n=>n.className="de-pip done"); if(key) this.narrate(key);
        $("de-counter").textContent="Complete"; }
    };

    function applyPack(){
      const p=overridePack(DEMO.packs[pack]), rs=document.documentElement;
      Object.entries(p.theme).forEach(([k,v])=>rs.style.setProperty(k,v));
      $("de-mark").textContent=p.brand.mark; $("de-brand").textContent=p.brand.name; $("de-pb").textContent=p.brand.poweredBy||"Powered by Docusign";
      $("de-persona").dataset.side=p.persona.side||"advisor"; $("de-av").textContent=initials(p.persona.name);
      $("de-nm").textContent=p.persona.name; $("de-rl").textContent=p.persona.role;
      $("de-url").textContent=p.url||""; $("de-sor").textContent=p.sorBadge||"";
      document.querySelectorAll(".de-vbtn").forEach(b=>b.classList.toggle("is-active",b.dataset.pack===pack));
      DEMO.setup(p, canvas, api);
      rescale();
    }
    document.querySelectorAll(".de-vbtn").forEach(b=>b.addEventListener("click",()=>{ api.cancelAuto(); pack=b.dataset.pack; applyPack(); }));
    $("de-reset").addEventListener("click", ()=>{ api.cancelAuto(); applyPack(); });

    if(ATTRACT){
      // Activity-driven attract loop: autoplay; on interaction hand control to the
      // user; after idle (reset on each interaction) resume; cycle when left alone.
      const IDLE=(parseInt(Q.get("idle"),10)||22)*1000, CYCLE=(parseInt(Q.get("cycle"),10)||42)*1000;
      let idleT, cycleT;
      const runAuto=()=>{ api._forceAuto=true; applyPack(); api._forceAuto=false; };
      const loop=()=>{ clearTimeout(cycleT); cycleT=setTimeout(()=>{ runAuto(); loop(); }, CYCLE); };
      const onInteract=()=>{ api.cancelAuto(); clearTimeout(cycleT); clearTimeout(idleT); idleT=setTimeout(()=>{ runAuto(); loop(); }, IDLE); };
      ["pointerdown","keydown","wheel","touchstart"].forEach(ev=>$("de-stage").addEventListener(ev,onInteract,{passive:true}));
      $("de-livehint").innerHTML='<span class="dot"></span> Auto-playing — interact to take over';
      runAuto(); loop();
    } else {
      applyPack();
    }
    return api;
  }

  global.DemoEngine = { init, interactive };
})(window);
