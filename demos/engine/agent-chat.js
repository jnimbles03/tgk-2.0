/* ===================================================================
   agent-chat.js — interactive assistant: clickable canned suggestions
   + typewriter answers + reveal cards. Pairs with agent-chat.css.

   AgentChat.mount({
     chatEl, chipsEl,
     exchanges: [ { label, user, answer, card?, after?(api) } ],
     api,                 // optional DemoEngine.interactive api (narrate/progress)
     hint: "Try one",     // chips label
     speed: 16            // ms per char
   });
   Re-callable on reset/re-skin — it clears the chat and re-renders chips.
=================================================================== */
window.AgentChat = (function(){
  function bubble(chat, role, html){ const d=document.createElement("div"); d.className="agc-msg "+role; d.innerHTML=html||""; chat.appendChild(d); chat.scrollTop=chat.scrollHeight; return d; }
  function thinking(chat){ const d=document.createElement("div"); d.className="agc-typing"; d.innerHTML="<i></i><i></i><i></i>"; chat.appendChild(d); chat.scrollTop=chat.scrollHeight; return d; }
  function type(el, text, speed, done){
    el.innerHTML=""; const span=document.createElement("span"); const caret=document.createElement("span"); caret.className="agc-caret";
    el.appendChild(span); el.appendChild(caret); let i=0;
    const iv=setInterval(()=>{ i++; span.innerHTML=text.slice(0,i); el.parentNode && (el.parentNode.scrollTop=el.parentNode.scrollHeight);
      if(i>=text.length){ clearInterval(iv); caret.remove(); done&&done(); } }, speed);
    return iv;
  }
  function mount(opts){
    const chat=opts.chatEl, chipBox=opts.chipsEl, speed=opts.speed||16, api=opts.api;
    let busy=false;
    chat.innerHTML="";
    if(opts.intro) bubble(chat,"ai",opts.intro);
    opts.exchanges.forEach(e=>e.used=false);
    function renderChips(){
      chipBox.innerHTML = '<div class="hint">'+(opts.hint||"Try a suggestion")+'</div>';
      opts.exchanges.forEach(ex=>{ if(ex.used)return; const b=document.createElement("div"); b.className="agc-chip"; b.textContent=ex.label;
        b.onclick=()=>{ if(busy)return; run(ex); }; chipBox.appendChild(b); });
    }
    function run(ex){
      busy=true; ex.used=true; chipBox.innerHTML='<div class="hint">'+(opts.hint||"")+'</div>';
      bubble(chat,"user",ex.user||ex.label);
      const t=thinking(chat);
      setTimeout(()=>{ t.remove(); const ai=bubble(chat,"ai","");
        type(ai, ex.answer, speed, ()=>{
          if(ex.card){ const c=document.createElement("div"); c.className="agc-card"; c.innerHTML=ex.card; ai.appendChild(c); }
          if(ex.after) ex.after(api);
          busy=false; renderChips(); chat.scrollTop=chat.scrollHeight;
        });
      }, 650);
    }
    renderChips();
  }
  return { mount, bubble, thinking, type };
})();
