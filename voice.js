// Handsfree kookstand: stappen voorlezen en luisteren naar korte commando's
// ("volgende", "terug", "herhaal", "stop"). Gebruikt de spraakfuncties van de browser zelf.
const Voice = (() => {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const can = { speak: 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window, listen: !!Rec };
  let rec = null, on = false, speaking = false, handlers = {}, restartTimer = null, voice = null;

  const COMMANDS = [
    ['next', /\b(volgende|verder|door|doorgaan|next|klaar)\b/],
    ['prev', /\b(terug|vorige|ga terug)\b/],
    ['repeat', /\b(herhaal|nog een keer|nog eens|opnieuw|wat zei je|wat moet ik doen)\b/],
    ['stop', /\b(stop|stoppen|niet meer luisteren|hou op)\b/],
  ];
  const match = text => (COMMANDS.find(([, re]) => re.test(text)) || [])[0] || null;

  // Een Nederlandse stem kiezen (als die er is)
  const pickVoice = () => {
    if (!can.speak) return null;
    const list = speechSynthesis.getVoices();
    return list.find(v => /^nl[-_]NL/i.test(v.lang) && /local|siri|premium|enhanced/i.test(v.name + (v.localService ? ' local' : '')))
      || list.find(v => /^nl[-_]NL/i.test(v.lang)) || list.find(v => /^nl/i.test(v.lang)) || null;
  };
  if (can.speak) { voice = pickVoice(); speechSynthesis.addEventListener?.('voiceschanged', () => { voice = pickVoice(); }); }

  function startRec() {
    if (!can.listen || !on || speaking) return;
    try {
      rec = new Rec();
      rec.lang = 'nl-NL'; rec.continuous = true; rec.interimResults = false; rec.maxAlternatives = 3;
      rec.onresult = e => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (!e.results[i].isFinal) continue;
          const alts = [...e.results[i]].map(a => a.transcript.toLowerCase().trim());
          const cmd = alts.map(match).find(Boolean);
          handlers.heard && handlers.heard(alts[0], cmd);
          if (cmd && handlers[cmd]) handlers[cmd]();
        }
      };
      rec.onerror = e => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { handlers.denied && handlers.denied(); stop(); }
      };
      // Na een stilte stopt de herkenning vaak vanzelf: zolang de handsfree stand aan staat, opnieuw beginnen
      rec.onend = () => { rec = null; if (on && !speaking) { clearTimeout(restartTimer); restartTimer = setTimeout(startRec, 250); } };
      rec.start();
    } catch { /* al bezig of niet toegestaan */ }
  }
  function stopRec() { clearTimeout(restartTimer); if (rec) { try { rec.onend = null; rec.abort(); } catch { /* */ } rec = null; } }

  // Voorlezen; tijdens het voorlezen niet luisteren (anders hoort de app zichzelf)
  function speak(text) {
    if (!can.speak || !text) return Promise.resolve();
    return new Promise(done => {
      stopRec(); speaking = true;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'nl-NL'; if (voice) u.voice = voice; u.rate = 1;
      const end = () => { speaking = false; if (on) startRec(); done(); };
      u.onend = end; u.onerror = end;
      speechSynthesis.speak(u);
    });
  }

  function start(h) {
    handlers = h || {}; on = true;
    startRec();
  }
  function stop() {
    on = false; stopRec();
    if (can.speak) { speechSynthesis.cancel(); speaking = false; }
    handlers.stopped && handlers.stopped();
  }
  return { can, start, stop, speak, isOn: () => on, match };
})();
