// ============================================================================
// FITOS — Terminal de Treino · implementação do design "Treino OCR"
// App inteiro em vanilla JS: estado, persistência local, timers e renderização.
// ============================================================================

const TYPES = [
  { key: 'kg',       label: 'KG',       unit: 'kg',    time: false },
  { key: 'halter',   label: 'HALTER',   unit: 'kg',    time: false },
  { key: 'maquina',  label: 'MAQUINA',  unit: 'placa', time: false },
  { key: 'corpo',    label: 'CORPO',    unit: 'livre', time: false },
  { key: 'elastico', label: 'ELASTICO', unit: 'nivel', time: false },
  { key: 'tempo',    label: 'TEMPO',    unit: 's',     time: true  },
];
const T = key => TYPES.find(t => t.key === key) || TYPES[0];

const pad = n => String(Math.max(0, Math.floor(n))).padStart(2, '0');
const clock = s => pad(Math.floor(s / 60)) + ':' + pad(s % 60);
const uid = () => 'x' + Math.random().toString(36).slice(2, 8);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const DAY = 86400000;
const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const dayKey = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const startOfDay = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };

const GREEN = '#46e08a', BRIGHT = '#a6ffca', DIM = '#2e8a54', NUM = '#6effa8', DARK = '#04120a';
const BORD = 'rgba(70,224,138,.35)';

const LS_KEY = 'fitos.v1';

// ---------------------------------------------------------------- seed / load
// Plano SEG–SEX do usuário. Reps usam o teto da faixa (ex.: 5–8 → 8);
// cargas são valores iniciais de referência — ajuste no editor/na sessão.
function seedWorkouts() {
  const ex = (name, type, sets, reps, value, rest) => ({ id: uid(), name, type, sets, reps, value, rest });
  return [
    { id: 'w-seg', name: 'SEGUNDA — Pernas A', lastDone: null, exercises: [
      ex('Agachamento Livre', 'kg', 4, 8, 40, 120),
      ex('Leg Press 45°', 'maquina', 3, 10, 8, 90),
      ex('Agachamento Búlgaro (p/ lado)', 'halter', 3, 10, 12, 90),
      ex('Cadeira Extensora', 'maquina', 3, 15, 8, 60),
      ex('Panturrilha em Pé', 'kg', 4, 15, 40, 45),
      ex('Tibial Anterior', 'corpo', 3, 20, 0, 45),
      ex('Dead Bug', 'corpo', 3, 12, 0, 30),
    ] },
    { id: 'w-ter', name: 'TERÇA — Push', lastDone: null, exercises: [
      ex('Supino Reto', 'kg', 4, 8, 40, 120),
      ex('Supino Inclinado Halteres', 'halter', 3, 10, 16, 90),
      ex('Desenvolvimento Halteres', 'halter', 3, 10, 12, 90),
      ex('Elevação Lateral', 'halter', 3, 15, 8, 45),
      ex('Crucifixo na Máquina', 'maquina', 3, 12, 7, 60),
      ex('Tríceps Corda', 'maquina', 3, 12, 8, 60),
      ex('Tríceps Francês', 'halter', 2, 12, 10, 60),
    ] },
    { id: 'w-qua', name: 'QUARTA — Pull', lastDone: null, exercises: [
      ex('Barra Fixa ou Puxada Alta', 'corpo', 4, 10, 0, 90),
      ex('Remada Curvada', 'kg', 3, 10, 40, 90),
      ex('Remada Baixa', 'maquina', 3, 12, 9, 60),
      ex('Face Pull', 'maquina', 3, 15, 6, 45),
      ex('Rosca Direta', 'kg', 3, 10, 20, 60),
      ex('Rosca Martelo', 'halter', 3, 12, 12, 60),
      ex('Prancha', 'tempo', 3, 0, 45, 30),
    ] },
    { id: 'w-qui', name: 'QUINTA — Pernas B', lastDone: null, exercises: [
      ex('Terra Romeno', 'kg', 4, 8, 50, 120),
      ex('Hip Thrust', 'kg', 4, 10, 60, 90),
      ex('Mesa Flexora', 'maquina', 3, 12, 8, 60),
      ex('Step-up com Halteres (p/ lado)', 'halter', 3, 10, 12, 60),
      ex('Cadeira Abdutora', 'maquina', 3, 15, 9, 45),
      ex('Panturrilha Sentado', 'maquina', 4, 15, 8, 45),
      ex('Pallof Press (p/ lado)', 'elastico', 3, 12, 3, 30),
    ] },
    { id: 'w-sex', name: 'SEXTA — Upper Completo', lastDone: null, exercises: [
      ex('Supino Inclinado', 'kg', 3, 10, 30, 90),
      ex('Remada Unilateral (p/ lado)', 'halter', 3, 10, 20, 60),
      ex('Desenvolvimento Arnold', 'halter', 3, 10, 10, 60),
      ex('Puxada Neutra', 'maquina', 3, 10, 9, 60),
      ex('Elevação Lateral', 'halter', 2, 15, 8, 45),
      ex('Rosca Scott', 'kg', 2, 12, 15, 45),
      ex('Tríceps Testa', 'kg', 2, 12, 15, 45),
      ex('Farmer Carry (30–40 m)', 'tempo', 3, 0, 40, 60),
    ] },
  ];
}

function loadPersisted() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* dados corrompidos → recomeça */ }
  return null;
}

// ============================================================================
class App {
  constructor(root) {
    this.root = root;
    const p = loadPersisted() || {};
    this.state = {
      screen: 'home',
      workouts: p.workouts || seedWorkouts(),
      draft: null,
      session: null,
      hiit: p.hiit || { prepare: 10, work: 20, rest: 10, cycles: 3, exercises: [
        { name: 'Burpee', work: 20 }, { name: 'Agachamento com Salto', work: 30 }, { name: 'Prancha Dinâmica', work: 40 },
      ] },
      hiitRun: null,
      settings: p.settings || { theme: 'ambar', scanlines: false, sound: true },
      profile: p.profile || { name: 'ATLETA' },
      history: p.history || [],
      log: p.log || [],
      evoSel: null,
    };
    this._t = null;

    root.addEventListener('click', e => {
      const el = e.target.closest('[data-act]');
      if (el && root.contains(el)) this.dispatch(el.dataset, el);
    });
    root.addEventListener('change', e => {
      const el = e.target.closest('[data-chg]');
      if (el) this.onChange(el.dataset.chg, el);
    });
    document.addEventListener('pointerdown', () => { this._audio(); }, { once: true });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && (this.state.session || this.state.hiitRun)) this._wake(true);
    });

    this.render();
  }

  setState(patch) {
    Object.assign(this.state, patch);
    this.persist();
    this.render();
  }
  persist() {
    const { workouts, hiit, settings, profile, history, log } = this.state;
    try { localStorage.setItem(LS_KEY, JSON.stringify({ workouts, hiit, settings, profile, history, log })); } catch (e) { /* sem espaço */ }
  }

  // ---------------------------------------------------------------- ticker
  // Conta segundos pelo relógio de parede: sobrevive ao throttling de
  // setInterval quando o app fica em segundo plano.
  _startTicker(fn) {
    this._clear();
    this._t0 = Date.now();
    this._n = 0;
    this._tickFn = fn;
    this._t = setInterval(() => this._pump(), 250);
  }
  _pump() {
    const due = Math.floor((Date.now() - this._t0) / 1000);
    while (this._n < due && this._tickFn) { this._n++; this._tickFn(); }
  }
  _clear() { if (this._t) { clearInterval(this._t); this._t = null; } this._tickFn = null; }

  // ---------------------------------------------------------------- áudio
  _audio() {
    if (!this.state.settings.sound) return null;
    try {
      if (!this._ac) { const AC = window.AudioContext || window.webkitAudioContext; this._ac = new AC(); }
      if (this._ac.state === 'suspended') this._ac.resume();
      return this._ac;
    } catch (e) { return null; }
  }
  beep(freq = 740, dur = 0.12, vol = 0.18) {
    const ac = this._audio(); if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + dur);
  }
  countBeep(rem) { if (rem === 3 || rem === 2 || rem === 1) { this.beep(720, 0.11); navigator.vibrate?.(40); } }
  endBeep() { this.beep(1046, 0.4, 0.22); navigator.vibrate?.([120, 80, 120]); }
  // Pulsos por tick: só vibração — o som vem dos bipes pré-agendados
  // (_schedFor), que tocam na hora certa mesmo com o JS congelado em 2º plano.
  _pulse(rem) { if (rem <= 3) navigator.vibrate?.(40); }
  _pulseEnd() { navigator.vibrate?.([120, 80, 120]); }
  _schedFor(secs) {
    this._schedCancel();
    const ac = this._audio(); if (!ac || secs <= 0) return;
    const t0 = ac.currentTime;
    this._sched = [];
    const mk = (when, freq, dur, vol) => {
      if (when < 0.05) return;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t0 + when);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + when + dur);
      o.connect(g); g.connect(ac.destination);
      o.start(t0 + when); o.stop(t0 + when + dur);
      this._sched.push(o);
    };
    [3, 2, 1].forEach(k => { if (secs > k) mk(secs - k, 720, 0.11, 0.18); });
    mk(secs, 1046, 0.4, 0.22);
  }
  _schedCancel() { (this._sched || []).forEach(o => { try { o.stop(); } catch (e) { /* já parou */ } }); this._sched = []; }
  // Reagenda os bipes conforme a fase atual da sessão (descanso ou cronômetro)
  _resched() {
    this._schedCancel();
    const s = this.state.session;
    if (!s || s.done) return;
    if (s.resting) { if (s.remaining > 0) this._schedFor(s.remaining); return; }
    const ex = this._curEx(), t = T(ex.type);
    if (t.time && s.workRun && (s.workLeft ?? ex.value) > 0) this._schedFor(s.workLeft ?? ex.value);
  }
  // Tom contínuo inaudível (45 Hz, −54 dB): impede o Chrome de marcar a aba
  // como silenciosa e congelar os timers quando a tela apaga.
  _keepAliveStart() {
    const ac = this._audio(); if (!ac || this._ka) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = 45;
    g.gain.value = 0.002;
    o.connect(g); g.connect(ac.destination);
    o.start();
    this._ka = o;
  }
  _keepAliveStop() { try { this._ka?.stop(); } catch (e) { /* já parou */ } this._ka = null; }

  async _wake(on) {
    try {
      if (on) { this._wl = await navigator.wakeLock?.request('screen'); }
      else { await this._wl?.release(); this._wl = null; }
    } catch (e) { /* sem suporte */ }
  }

  // ---------------------------------------------------------------- navegação
  go(s) { this._clear(); this.setState({ screen: s }); }

  // ---------------------------------------------------------------- editor
  newWorkout() {
    this.setState({ screen: 'editor', draft: { id: null, name: 'Novo Treino', exercises: [
      { id: uid(), name: 'Exercício 1', type: 'kg', sets: 3, reps: 12, value: 20, rest: 60, _open: true },
    ] } });
  }
  editWorkout(id) {
    const w = this.state.workouts.find(x => x.id === id); if (!w) return;
    this.setState({ screen: 'editor', draft: JSON.parse(JSON.stringify({ id: w.id, name: w.name, exercises: w.exercises })) });
  }
  _mutDraft(fn) {
    const d = { ...this.state.draft, exercises: this.state.draft.exercises.map(e => ({ ...e })) };
    fn(d);
    this.setState({ draft: d });
  }
  saveWorkout() {
    const d = this.state.draft; if (!d) return;
    const prev = d.id ? this.state.workouts.find(w => w.id === d.id) : null;
    const clean = { id: d.id || ('w' + uid()), name: d.name || 'Treino', lastDone: prev ? prev.lastDone : null,
      exercises: d.exercises.map(({ _open, ...e }) => e) };
    const ws = this.state.workouts.slice();
    const i = ws.findIndex(w => w.id === clean.id);
    if (i >= 0) ws[i] = clean; else ws.unshift(clean);
    this.setState({ workouts: ws, screen: 'list', draft: null });
  }
  addExercise() {
    this._mutDraft(d => {
      d.exercises.forEach(e => e._open = false);
      d.exercises.push({ id: uid(), name: 'Exercício ' + (d.exercises.length + 1), type: 'kg', sets: 3, reps: 12, value: 20, rest: 60, _open: true });
    });
  }
  toggleEx(i) { this._mutDraft(d => { const was = d.exercises[i]._open; d.exercises.forEach(e => e._open = false); d.exercises[i]._open = !was; }); }
  removeEx(i) { this._mutDraft(d => { d.exercises.splice(i, 1); }); }
  patchEx(i, p) { this._mutDraft(d => { Object.assign(d.exercises[i], p); }); }
  clampInt(v, min, max) { v = parseInt(v, 10); if (isNaN(v)) v = min; return Math.max(min, Math.min(max, v)); }

  // ---------------------------------------------------------------- HIIT config
  _mutHiit(fn) { const h = { ...this.state.hiit, exercises: this.state.hiit.exercises.slice() }; fn(h); this.setState({ hiit: h }); }
  stepH(k, d, min, max) { this._mutHiit(h => { h[k] = Math.max(min, Math.min(max, h[k] + d)); }); }
  _hxName(e) { return typeof e === 'string' ? e : e.name; }
  _hxWork(e) { return typeof e === 'string' ? this.state.hiit.work : (e.work ?? this.state.hiit.work); }
  addHiitEx() { this._mutHiit(h => { h.exercises.push({ name: 'Exercício ' + (h.exercises.length + 1), work: h.work }); }); }
  removeHiitEx(i) { this._mutHiit(h => { h.exercises.splice(i, 1); }); }
  renameHiitEx(i, v) { this._mutHiit(h => { const e = h.exercises[i]; h.exercises[i] = typeof e === 'string' ? { name: v, work: h.work } : { ...e, name: v }; }); }
  stepHiitExWork(i, d) {
    this._mutHiit(h => {
      const e = h.exercises[i];
      const cur = typeof e === 'string' ? h.work : (e.work ?? h.work);
      const nv = Math.max(5, Math.min(600, cur + d));
      h.exercises[i] = typeof e === 'string' ? { name: e, work: nv } : { ...e, work: nv };
    });
  }
  _hiitSeq() {
    const h = this.state.hiit;
    const seq = [{ phase: 'prepare', dur: h.prepare, label: 'PREPARAR' }];
    for (let c = 1; c <= h.cycles; c++) {
      h.exercises.forEach((e, i) => {
        seq.push({ phase: 'work', dur: this._hxWork(e), label: this._hxName(e), ex: i + 1, cycle: c });
        seq.push({ phase: 'rest', dur: h.rest, label: 'DESCANSO', cycle: c });
      });
    }
    if (seq.length > 1) seq.pop();
    seq.push({ phase: 'done', dur: 0, label: 'CONCLUIDO' });
    return seq;
  }
  startHiit() {
    if (!this.state.hiit.exercises.length) return;
    const seq = this._hiitSeq();
    this.beep(880, 0.18);
    this._wake(true);
    this._msStart('hiit');
    this.setState({ hiitRun: { seq, idx: 0, remaining: seq[0].dur, running: true } });
    this._schedFor(seq[0].dur);
    this._startTicker(() => this._hiitTick());
  }
  _hiitTick() {
    const r = this.state.hiitRun; if (!r || !r.running) return;
    const rem = r.remaining - 1;
    if (rem > 0) { this._pulse(rem); this.setState({ hiitRun: { ...r, remaining: rem } }); return; }
    this._pulseEnd();
    const idx = r.idx + 1;
    if (idx >= r.seq.length || r.seq[idx].phase === 'done') {
      this._clear(); this._wake(false); this._msStop();
      this.setState({ hiitRun: { ...r, idx: r.seq.length - 1, remaining: 0, running: false } });
      return;
    }
    this.setState({ hiitRun: { ...r, idx, remaining: r.seq[idx].dur } });
    this._schedFor(r.seq[idx].dur);
  }
  toggleHiit() {
    const r = this.state.hiitRun; if (!r) return;
    if (r.seq[r.idx].phase === 'done') { this._msStop(); this.setState({ hiitRun: null }); return; }
    const running = !r.running;
    this.setState({ hiitRun: { ...r, running } });
    if (running) this._schedFor(r.remaining); else this._schedCancel();
  }
  skipHiit() {
    const r = this.state.hiitRun; if (!r) return;
    const idx = r.idx + 1;
    if (idx >= r.seq.length || r.seq[idx].phase === 'done') {
      this._clear(); this._wake(false); this._msStop();
      this.setState({ hiitRun: { ...r, idx: r.seq.length - 1, remaining: 0, running: false } });
    } else {
      this.beep(880, 0.14);
      this.setState({ hiitRun: { ...r, idx, remaining: r.seq[idx].dur } });
      this._schedFor(r.seq[idx].dur);
    }
  }
  stopHiit() { this._clear(); this._wake(false); this._msStop(); this.setState({ hiitRun: null }); }

  // ---------------------------------------------------------------- sessão
  startSession(id) {
    const w = this.state.workouts.find(x => x.id === id);
    if (!w || !w.exercises.length) return;
    this._wake(true);
    this._msStart('session');
    this.setState({ screen: 'session', session: {
      wId: id, exIdx: 0, setIdx: 0, resting: false, remaining: 0, elapsed: 0, done: false,
      ...this._workInit(w.exercises[0]),
    } });
    this._startTicker(() => this._sessTick());
  }
  _sessTick() {
    const s = this.state.session; if (!s || s.done) return;
    const elapsed = s.elapsed + 1;
    if (s.resting) {
      const rem = s.remaining - 1;
      if (rem > 0) { this._pulse(rem); this.setState({ session: { ...s, elapsed, remaining: rem } }); return; }
      this._pulseEnd();
      this.setState({ session: { ...s, elapsed, resting: false, remaining: 0 } });
      return;
    }
    const ex = this._curEx(), t = T(ex.type);
    if (t.time && s.workRun) {
      const rem = (s.workLeft ?? ex.value) - 1;
      if (rem > 0) { this._pulse(rem); this.setState({ session: { ...s, elapsed, workLeft: rem } }); return; }
      this._pulseEnd();
      this._applyNext({ ...this._nextAfterSet({ ...s, workLeft: 0 }), elapsed });
      return;
    }
    this.setState({ session: { ...s, elapsed } });
  }
  _workInit(ex) { const t = T(ex.type); return t.time ? { workLeft: ex.value, workRun: false } : { workLeft: 0, workRun: false }; }
  _nextAfterSet(s) {
    const w = this.state.workouts.find(x => x.id === s.wId);
    const ex = w.exercises[s.exIdx];
    const lastSet = s.setIdx + 1 >= ex.sets, lastEx = s.exIdx + 1 >= w.exercises.length;
    if (lastSet) {
      if (lastEx) { this._clear(); this.beep(1046, 0.5, 0.24); return { ...s, done: true }; }
      return { ...s, exIdx: s.exIdx + 1, setIdx: 0, resting: true, remaining: ex.rest, ...this._workInit(w.exercises[s.exIdx + 1]) };
    }
    return { ...s, setIdx: s.setIdx + 1, resting: true, remaining: ex.rest, ...this._workInit(ex) };
  }
  // Aplica o resultado de _nextAfterSet; ao concluir registra histórico/streak.
  _applyNext(ns) {
    const patch = { session: ns };
    if (ns.done) {
      this._wake(false);
      this._msStop();
      const w = this.state.workouts.find(x => x.id === ns.wId);
      const ws = this.state.workouts.map(x => x.id === ns.wId ? { ...x, lastDone: Date.now() } : x);
      const key = dayKey();
      const history = this.state.history.includes(key) ? this.state.history : [...this.state.history, key];
      patch.workouts = ws;
      patch.history = history;
      patch.log = [...this.state.log, {
        ts: Date.now(), wId: ns.wId, name: w.name, elapsed: ns.elapsed,
        exercises: w.exercises.map(e => ({ name: e.name, type: e.type, sets: e.sets, reps: e.reps, value: e.value })),
      }];
      if (this.state.screen === 'lock') patch.screen = 'session';
    }
    this.setState(patch);
    this._resched();
  }
  toggleWork() {
    const s = this.state.session; if (!s || s.resting) return;
    const ex = this._curEx(); if (!T(ex.type).time) return;
    const run = !s.workRun;
    this.setState({ session: { ...s, workRun: run } });
    this._resched();
    if (run) this.beep(680, 0.08);
  }
  _curEx() { const s = this.state.session; const w = this.state.workouts.find(x => x.id === s.wId); return w.exercises[s.exIdx]; }
  sessPrimary() {
    const s = this.state.session; if (!s) return;
    if (s.resting) { this.setState({ session: { ...s, resting: false, remaining: 0 } }); this._resched(); return; }
    this._applyNext(this._nextAfterSet(s));
  }
  sessSecondary() {
    const s = this.state.session; if (!s) return;
    if (s.resting) { this.setState({ session: { ...s, resting: false, remaining: 0 } }); this._resched(); return; }
    const w = this.state.workouts.find(x => x.id === s.wId);
    if (s.exIdx + 1 >= w.exercises.length) { this._clear(); this._applyNext({ ...s, done: true }); return; }
    this.setState({ session: { ...s, exIdx: s.exIdx + 1, setIdx: 0, resting: false, remaining: 0, ...this._workInit(w.exercises[s.exIdx + 1]) } });
    this._resched();
  }
  sessPrev() {
    const s = this.state.session; if (!s || s.exIdx <= 0) return;
    const w = this.state.workouts.find(x => x.id === s.wId);
    const pi = s.exIdx - 1;
    this.setState({ session: { ...s, exIdx: pi, setIdx: 0, resting: false, remaining: 0, ...this._workInit(w.exercises[pi]) } });
    this._resched();
  }
  sessNextEx() {
    const s = this.state.session; if (!s) return;
    const w = this.state.workouts.find(x => x.id === s.wId);
    if (s.exIdx + 1 >= w.exercises.length) return;
    const ni = s.exIdx + 1;
    this.setState({ session: { ...s, exIdx: ni, setIdx: 0, resting: false, remaining: 0, ...this._workInit(w.exercises[ni]) } });
    this._resched();
  }
  restAdj(d) {
    const s = this.state.session; if (!s || !s.resting) return;
    this.setState({ session: { ...s, remaining: Math.max(1, s.remaining + d) } });
    this._resched();
  }
  quitSession() { this._clear(); this._wake(false); this._msStop(); this.setState({ screen: 'home', session: null }); }

  // ------------------------------------------------- Media Session (lock screen)
  // Um áudio silencioso em loop mantém uma "faixa" ativa; o timer aparece na
  // tela de bloqueio / central de mídia como metadados atualizados a cada tick.
  _msEnsureAudio() {
    if (this._msAudio) return this._msAudio;
    const rate = 8000, secs = 10, n = rate * secs;   // Chrome só mostra mídia com >5s
    const buf = new Uint8Array(44 + n);
    const dv = new DataView(buf.buffer);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) buf[o + i] = s.charCodeAt(i); };
    w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVEfmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, rate, true); dv.setUint32(28, rate, true);
    dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
    w(36, 'data'); dv.setUint32(40, n, true); buf.fill(128, 44);   // 8-bit: 128 = silêncio
    const a = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
    a.loop = true; a.volume = 0.02;
    this._msAudio = a;
    return a;
  }
  _msStart(kind) {
    if (!('mediaSession' in navigator)) return;
    this._msEnsureAudio().play().catch(() => {});
    this._keepAliveStart();
    const ms = navigator.mediaSession;
    const set = (act, fn) => { try { ms.setActionHandler(act, fn); } catch (e) { /* ação não suportada */ } };
    if (kind === 'hiit') {
      set('play', () => this.toggleHiit()); set('pause', () => this.toggleHiit());
      set('nexttrack', () => this.skipHiit()); set('previoustrack', null);
    } else {
      set('play', () => this.toggleWork()); set('pause', () => this.toggleWork());
      set('nexttrack', () => this.sessPrimary()); set('previoustrack', () => this.sessPrev());
    }
  }
  _msUpdate(title, artist, dur, pos, playing = true) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title, artist: artist || 'FITOS', album: 'FITOS//TERMINAL DE TREINO',
        artwork: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      });
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
      if (dur != null && dur > 0) navigator.mediaSession.setPositionState({ duration: dur, position: Math.max(0, Math.min(pos, dur)), playbackRate: 1 });
      else navigator.mediaSession.setPositionState();
    } catch (e) { /* sem suporte */ }
  }
  _msSync() {
    if (!('mediaSession' in navigator)) return;
    const S = this.state;
    if (S.session && !S.session.done) {
      const s = S.session;
      const w = S.workouts.find(x => x.id === s.wId);
      const ex = w.exercises[s.exIdx], t = T(ex.type);
      if (s.resting) this._msUpdate('DESCANSO ' + clock(s.remaining), ex.name.toUpperCase(), ex.rest, ex.rest - s.remaining);
      else if (t.time) { const wl = s.workLeft ?? ex.value; this._msUpdate(clock(wl) + (s.workRun ? '' : ' — PRONTO?'), ex.name.toUpperCase(), ex.value, ex.value - wl, s.workRun); }
      else this._msUpdate('SÉRIE ' + (s.setIdx + 1) + '/' + ex.sets, ex.name.toUpperCase(), null, null);
    } else if (S.hiitRun) {
      const r = S.hiitRun, step = r.seq[r.idx];
      if (step.phase !== 'done') {
        const lbl = { prepare: 'PREPARAR', work: 'TREINO', rest: 'DESCANSO' }[step.phase];
        this._msUpdate(lbl + ' ' + clock(r.remaining), step.phase === 'work' ? step.label : 'HIIT', step.dur, step.dur - r.remaining, r.running);
      }
    }
  }
  _msStop() {
    this._keepAliveStop();
    this._schedCancel();
    try {
      this._msAudio?.pause();
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    } catch (e) { /* sem suporte */ }
  }

  // ---------------------------------------------------------------- evolução
  _evoUnit(type) { return { kg: 'KG', halter: 'KG', maquina: 'PLACAS', elastico: 'NÍVEL', tempo: 'SEG', corpo: 'REPS' }[type] || ''; }
  _evoData() {
    const map = new Map();   // nome → {name, type, points:[{ts,v}]}
    this.state.log.forEach(en => {
      en.exercises.forEach(e => {
        const v = e.type === 'corpo' ? e.reps : e.value;
        if (v == null) return;
        if (!map.has(e.name)) map.set(e.name, { name: e.name, type: e.type, points: [] });
        map.get(e.name).points.push({ ts: en.ts, v });
      });
    });
    return [...map.values()];
  }
  _evoChart(points) {
    const pts = points.slice(-12);
    const W = 336, H = 116, P = 10;
    const vs = pts.map(p => p.v);
    let min = Math.min(...vs), max = Math.max(...vs);
    if (min === max) { min -= 1; max += 1; }
    const x = i => P + (W - 2 * P) * (pts.length === 1 ? 0.5 : i / (pts.length - 1));
    const y = v => H - P - (H - 2 * P) * ((v - min) / (max - min));
    const line = pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');
    const dots = pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="2.6" fill="${NUM}" style="filter:drop-shadow(0 0 3px rgba(70,224,138,.9))"/>`).join('');
    const grid = [0.25, 0.5, 0.75].map(f => `<line x1="${P}" x2="${W - P}" y1="${(P + (H - 2 * P) * f).toFixed(1)}" y2="${(P + (H - 2 * P) * f).toFixed(1)}" stroke="rgba(70,224,138,.15)" stroke-dasharray="3 4"/>`).join('');
    return `
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block">
        ${grid}
        <path d="${line}" fill="none" stroke="${GREEN}" stroke-width="2" style="filter:drop-shadow(0 0 4px rgba(70,224,138,.7))"/>
        ${dots}
      </svg>
      <div style="display:flex;justify-content:space-between;font-size:9px;color:${DIM};letter-spacing:1px;padding:0 2px"><span>MIN ${min}</span><span>MAX ${max}</span></div>`;
  }

  // ---------------------------------------------------------------- backup
  exportData() {
    const blob = new Blob([localStorage.getItem(LS_KEY) || '{}'], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'fitos-backup-' + dayKey() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  importData() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.onchange = () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      f.text().then(txt => {
        let d;
        try { d = JSON.parse(txt); } catch (e) { alert('ARQUIVO INVÁLIDO: não é JSON.'); return; }
        if (!d || !Array.isArray(d.workouts)) { alert('ARQUIVO INVÁLIDO: backup FITOS não reconhecido.'); return; }
        if (!confirm('IMPORTAR BACKUP? Os dados atuais deste aparelho serão substituídos.')) return;
        localStorage.setItem(LS_KEY, JSON.stringify(d));
        location.reload();
      });
    };
    inp.click();
  }

  // ---------------------------------------------------------------- perfil
  wipeData() {
    if (!confirm('APAGAR TODOS OS DADOS? Treinos, histórico e ajustes serão perdidos.')) return;
    localStorage.removeItem(LS_KEY);
    location.reload();
  }

  // ---------------------------------------------------------------- eventos
  dispatch(d) {
    const i = d.i !== undefined ? parseInt(d.i, 10) : undefined;
    const act = d.act;
    const map = {
      goHome: () => this.go('home'),
      goList: () => this.go('list'),
      goHiit: () => { this._clear(); this.setState({ screen: 'hiit', hiitRun: null }); },
      goPerfil: () => this.go('perfil'),
      enterLock: () => this.setState({ screen: 'lock' }),
      exitLock: () => this.setState({ screen: 'session' }),
      openW: () => this.startSession(d.id),
      editW: () => this.editWorkout(d.id),
      newWorkout: () => this.newWorkout(),
      cancelEdit: () => this.go('list'),
      saveWorkout: () => this.saveWorkout(),
      addExercise: () => this.addExercise(),
      exToggle: () => this.toggleEx(i),
      exRemove: () => this.removeEx(i),
      exType: () => this.patchEx(i, T(d.key).time ? { type: d.key } : { type: d.key }),
      setsUp: () => { const e = this.state.draft.exercises[i]; this.patchEx(i, { sets: Math.min(20, e.sets + 1) }); },
      setsDown: () => { const e = this.state.draft.exercises[i]; this.patchEx(i, { sets: Math.max(1, e.sets - 1) }); },
      repUp: () => { const e = this.state.draft.exercises[i]; this.patchEx(i, T(e.type).time ? { value: e.value + 5 } : { reps: Math.min(100, e.reps + 1) }); },
      repDown: () => { const e = this.state.draft.exercises[i]; this.patchEx(i, T(e.type).time ? { value: Math.max(1, e.value - 5) } : { reps: Math.max(1, e.reps - 1) }); },
      valUp: () => { const e = this.state.draft.exercises[i]; const st = (e.type === 'maquina' || e.type === 'elastico') ? 1 : 2.5; this.patchEx(i, { value: +(e.value + st).toFixed(1) }); },
      valDown: () => { const e = this.state.draft.exercises[i]; const st = (e.type === 'maquina' || e.type === 'elastico') ? 1 : 2.5; this.patchEx(i, { value: Math.max(0, +(e.value - st).toFixed(1)) }); },
      restUp: () => { const e = this.state.draft.exercises[i]; this.patchEx(i, { rest: Math.min(600, e.rest + 15) }); },
      restDown: () => { const e = this.state.draft.exercises[i]; this.patchEx(i, { rest: Math.max(0, e.rest - 15) }); },
      quitSession: () => this.quitSession(),
      sessPrev: () => this.sessPrev(),
      sessNextEx: () => this.sessNextEx(),
      sessPrimary: () => this.sessPrimary(),
      sessSecondary: () => this.sessSecondary(),
      toggleWork: () => this.toggleWork(),
      restPlus: () => this.restAdj(15),
      restMinus: () => this.restAdj(-15),
      prepUp: () => this.stepH('prepare', 5, 0, 120),  prepDown: () => this.stepH('prepare', -5, 0, 120),
      workUp: () => this.stepH('work', 5, 5, 600),     workDown: () => this.stepH('work', -5, 5, 600),
      hrestUp: () => this.stepH('rest', 5, 0, 300),    hrestDown: () => this.stepH('rest', -5, 0, 300),
      cyclesUp: () => this.stepH('cycles', 1, 1, 20),  cyclesDown: () => this.stepH('cycles', -1, 1, 20),
      addHiitEx: () => this.addHiitEx(),
      hxRemove: () => this.removeHiitEx(i),
      hxUp: () => this.stepHiitExWork(i, 5),
      hxDown: () => this.stepHiitExWork(i, -5),
      startHiit: () => this.startHiit(),
      stopHiit: () => this.stopHiit(),
      toggleHiit: () => this.toggleHiit(),
      skipHiit: () => this.skipHiit(),
      goEvo: () => this.setState({ screen: 'evo' }),
      evoPick: () => this.setState({ evoSel: d.key }),
      exportData: () => this.exportData(),
      importData: () => this.importData(),
      setTheme: () => this.setState({ settings: { ...this.state.settings, theme: d.key } }),
      togScan: () => this.setState({ settings: { ...this.state.settings, scanlines: !this.state.settings.scanlines } }),
      togSound: () => this.setState({ settings: { ...this.state.settings, sound: !this.state.settings.sound } }),
      wipeData: () => this.wipeData(),
    };
    map[act]?.();
  }
  onChange(chg, el) {
    const i = el.dataset.i !== undefined ? parseInt(el.dataset.i, 10) : undefined;
    const v = el.value;
    if (chg === 'draftName') this._mutDraft(dd => { dd.name = v; });
    else if (chg === 'exName') this.patchEx(i, { name: v });
    else if (chg === 'exSets') this.patchEx(i, { sets: this.clampInt(v, 1, 20) });
    else if (chg === 'exRep') { const e = this.state.draft.exercises[i]; this.patchEx(i, T(e.type).time ? { value: this.clampInt(v, 1, 3600) } : { reps: this.clampInt(v, 1, 100) }); }
    else if (chg === 'exVal') { let n = parseFloat(String(v).replace(',', '.')); if (isNaN(n)) n = 0; this.patchEx(i, { value: Math.max(0, n) }); }
    else if (chg === 'hiitName') this.renameHiitEx(i, v);
    else if (chg === 'profileName') this.setState({ profile: { ...this.state.profile, name: v.trim().toUpperCase() || 'ATLETA' } });
  }

  // ================================================================ render
  render() {
    const S = this.state, scr = S.screen;
    // preserva rolagem dos painéis entre re-renderizações
    const scrolls = {};
    this.root.querySelectorAll('[data-scroll]').forEach(el => { scrolls[el.dataset.scroll] = el.scrollTop; });

    const showNav = scr === 'home' || scr === 'list' || scr === 'perfil' || (scr === 'hiit' && !S.hiitRun);
    let screenHtml = '';
    if (scr === 'home') screenHtml = this.rHome();
    else if (scr === 'list') screenHtml = this.rList();
    else if (scr === 'editor') screenHtml = this.rEditor();
    else if (scr === 'session' || scr === 'lock') screenHtml = this.rSession();
    else if (scr === 'hiit') screenHtml = this.rHiit();
    else if (scr === 'perfil') screenHtml = this.rPerfil();
    else if (scr === 'evo') screenHtml = this.rEvo();

    this.root.innerHTML = `
      <div style="flex:1;min-height:0;position:relative">${screenHtml}</div>
      ${showNav ? this.rNav() : ''}
      <div style="flex:none;display:flex;justify-content:center;padding:6px 0 max(9px, env(safe-area-inset-bottom))"><div style="width:120px;height:4px;border-radius:2px;background:${GREEN};opacity:.4"></div></div>
      ${scr === 'lock' ? this.rLock() : ''}
    `;
    this.root.className = S.settings.theme === 'ambar' ? 'theme-ambar' : '';
    const sl = document.getElementById('fx-scanlines');
    if (sl) sl.hidden = !S.settings.scanlines;

    this.root.querySelectorAll('[data-scroll]').forEach(el => {
      if (scrolls[el.dataset.scroll] !== undefined) el.scrollTop = scrolls[el.dataset.scroll];
    });

    this._msSync();
  }

  // ---------------------------------------------------------------- home
  _relLabel(ts) {
    if (!ts) return 'NOVO';
    const days = Math.round((startOfDay(Date.now()) - startOfDay(ts)) / DAY);
    if (days <= 0) return 'HOJE';
    if (days === 1) return 'ONTEM';
    return 'HÁ ' + days + ' DIAS';
  }
  _streak() {
    const set = new Set(this.state.history);
    let d = new Date(); d.setHours(0, 0, 0, 0);
    if (!set.has(dayKey(d))) d = new Date(d.getTime() - DAY);   // hoje ainda não conta contra a sequência
    let n = 0;
    while (set.has(dayKey(d))) { n++; d = new Date(d.getTime() - DAY); }
    return n;
  }
  _wMeta(w) { return w.exercises.length + ' EXERC · ' + this._relLabel(w.lastDone); }

  rHome() {
    const S = this.state, now = new Date();
    const weeks = Math.ceil(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() / 7);
    // Treino do dia: casa o nome com o dia da semana (ex. "QUARTA — Pull");
    // sem correspondência, cai no primeiro da lista.
    const norm = s => s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const prefixo = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'][now.getDay()];
    const today = S.workouts.find(w => norm(w.name).startsWith(prefixo)) || S.workouts[0];
    const rows = S.workouts.map((w, i) => `
      <div data-act="openW" data-id="${w.id}" class="cbtn" style="display:flex;align-items:center;gap:11px;padding:10px 0;border-top:1px dashed rgba(70,224,138,.22)">
        <span style="font-family:'DSEG7',monospace;font-size:14px;color:${GREEN};text-shadow:0 0 5px rgba(70,224,138,.5)">${pad(i + 1)}</span>
        <div style="flex:1;min-width:0"><div style="font-size:15px;color:${BRIGHT}">${esc(w.name)}</div><div style="font-size:10px;color:${DIM}">${this._wMeta(w)}</div></div>
        <span style="color:${DIM};font-size:16px">›</span>
      </div>`).join('');
    return `
      <div data-scroll="home" style="height:100%;overflow-y:auto;padding:6px 18px 18px;display:flex;flex-direction:column;gap:14px">
        <div style="border-bottom:1px dashed rgba(70,224,138,.3);padding-bottom:11px">
          <div style="font-size:10px;letter-spacing:1px;color:${DIM}">FITOS//TERMINAL DE TREINO v2.4</div>
          <div style="font-size:22px;color:${BRIGHT};text-shadow:0 0 7px rgba(120,255,170,.55);margin-top:4px">&gt; ${esc(S.profile.name)}<span class="blink">▮</span></div>
          <div style="font-size:11px;color:${DIM};margin-top:6px;display:flex;justify-content:space-between"><span>SEQ: ${this._streak()} DIAS</span><span>SEMANA: ${pad(Math.ceil(now.getDate() / 7))}/${pad(weeks)}</span></div>
        </div>
        ${today ? `
        <div style="border:1px solid rgba(70,224,138,.4)">
          <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(70,224,138,.12);border-bottom:1px solid rgba(70,224,138,.3);padding:7px 13px;font-size:10px;letter-spacing:1px;color:${BRIGHT}">[ TREINO DE HOJE ]<span style="color:${DIM}">${DIAS[now.getDay()]}</span></div>
          <div style="padding:14px">
            <div style="font-size:19px;color:${BRIGHT};text-shadow:0 0 6px rgba(120,255,170,.5)">${esc(today.name)}</div>
            <div style="font-size:11px;color:${DIM};margin-top:5px">${today.exercises.length} exercícios · ~${Math.max(20, today.exercises.length * 8)} min</div>
            <div data-act="openW" data-id="${today.id}" class="cbtn" style="margin-top:14px;background:${GREEN};color:${DARK};padding:12px;text-align:center;font-size:14px;letter-spacing:2px;box-shadow:0 0 16px rgba(70,224,138,.5)">► INICIAR TREINO</div>
          </div>
        </div>` : ''}
        <div data-act="goHiit" class="cbtn" style="border:1px solid rgba(70,224,138,.4);padding:13px 14px;display:flex;align-items:center;gap:12px">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${GREEN}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>
          <div style="flex:1"><div style="font-size:15px;color:${BRIGHT}">TIMER HIIT / TABATA</div><div style="font-size:10px;color:${DIM}">INTERVALADO CONFIGURÁVEL</div></div>
          <span style="color:${DIM};font-size:16px">›</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:2px"><span style="color:${GREEN}">&gt; MEUS TREINOS</span><span data-act="goList" class="cbtn" style="color:${DIM}">[VER TODOS]</span></div>
        ${rows}
      </div>`;
  }

  // ---------------------------------------------------------------- lista
  rList() {
    const rows = this.state.workouts.map((w, i) => `
      <div style="border:1px solid rgba(70,224,138,.32)">
        <div style="display:flex;align-items:center;gap:11px;padding:11px 13px">
          <span style="font-family:'DSEG7',monospace;font-size:15px;color:${GREEN};text-shadow:0 0 5px rgba(70,224,138,.5)">${pad(i + 1)}</span>
          <div style="flex:1;min-width:0"><div style="font-size:15px;color:${BRIGHT}">${esc(w.name)}</div><div style="font-size:10px;color:${DIM}">${this._wMeta(w)}</div></div>
        </div>
        <div style="display:flex;border-top:1px solid rgba(70,224,138,.22)">
          <div data-act="editW" data-id="${w.id}" class="cbtn" style="flex:1;text-align:center;padding:9px;font-size:11px;letter-spacing:1px;color:${GREEN};border-right:1px solid rgba(70,224,138,.22)">EDITAR</div>
          <div data-act="openW" data-id="${w.id}" class="cbtn" style="flex:1;text-align:center;padding:9px;font-size:11px;letter-spacing:1px;color:${BRIGHT}">► INICIAR</div>
        </div>
      </div>`).join('');
    return `
      <div data-scroll="list" style="height:100%;overflow-y:auto;padding:6px 18px 18px;display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;border-bottom:1px solid ${BORD}">
          <span style="font-size:13px;letter-spacing:2px;color:${BRIGHT}">&gt; MEUS TREINOS</span>
          <span data-act="newWorkout" class="cbtn" style="color:${DARK};background:${GREEN};padding:4px 10px;font-size:11px;letter-spacing:1px;box-shadow:0 0 10px rgba(70,224,138,.5)">+ NOVO</span>
        </div>
        ${rows || `<div style="font-size:11px;color:${DIM};text-align:center;padding:30px 0">NENHUM TREINO. TOQUE EM [+ NOVO].</div>`}
      </div>`;
  }

  // ---------------------------------------------------------------- editor
  rEditor() {
    const d = this.state.draft; if (!d) return '';
    const exSummary = ex => {
      const t = T(ex.type);
      if (t.time) return ex.sets + 'x ' + ex.value + 's';
      if (ex.type === 'corpo') return ex.sets + 'x' + ex.reps + ' · livre';
      return ex.sets + 'x' + ex.reps + ' · ' + ex.value + ' ' + t.unit;
    };
    const cards = d.exercises.map((ex, i) => {
      const t = T(ex.type), open = !!ex._open;
      const chips = TYPES.map(tp => {
        const on = tp.key === ex.type;
        return `<span data-act="exType" data-i="${i}" data-key="${tp.key}" class="cbtn" style="padding:4px 8px;font-size:9px;letter-spacing:.5px;color:${on ? DARK : GREEN};background:${on ? GREEN : 'transparent'};border:1px solid ${on ? GREEN : BORD};box-shadow:${on ? '0 0 10px rgba(70,224,138,.5)' : 'none'}">${tp.label}</span>`;
      }).join('');
      const body = !open ? '' : `
        <div style="padding:12px;display:flex;flex-direction:column;gap:12px;border-top:1px solid rgba(70,224,138,.25)">
          <input type="text" class="ti" value="${esc(ex.name)}" data-chg="exName" data-i="${i}" style="border:1px solid rgba(70,224,138,.3);padding:8px 10px;font-size:14px">
          <div>
            <div style="font-size:9px;letter-spacing:1px;color:${DIM};margin-bottom:6px">TIPO DE CARGA</div>
            <div style="display:flex;flex-wrap:wrap;gap:5px">${chips}</div>
          </div>
          <div style="display:flex;gap:9px">
            <div style="flex:1">
              <div style="font-size:9px;letter-spacing:1px;color:${DIM};margin-bottom:5px">SERIES</div>
              <div style="display:flex;align-items:stretch;border:1px solid ${BORD}">
                <div data-act="setsDown" data-i="${i}" class="cbtn" style="width:30px;display:flex;align-items:center;justify-content:center;font-size:16px;color:${GREEN};border-right:1px solid rgba(70,224,138,.3)">–</div>
                <input inputmode="numeric" value="${ex.sets}" data-chg="exSets" data-i="${i}" style="flex:1;font-size:18px;padding:6px 0">
                <div data-act="setsUp" data-i="${i}" class="cbtn" style="width:30px;display:flex;align-items:center;justify-content:center;font-size:16px;color:${GREEN};border-left:1px solid rgba(70,224,138,.3)">+</div>
              </div>
            </div>
            <div style="flex:1">
              <div style="font-size:9px;letter-spacing:1px;color:${DIM};margin-bottom:5px">${t.time ? 'DURACAO (S)' : 'REPETICOES'}</div>
              <div style="display:flex;align-items:stretch;border:1px solid ${BORD}">
                <div data-act="repDown" data-i="${i}" class="cbtn" style="width:30px;display:flex;align-items:center;justify-content:center;font-size:16px;color:${GREEN};border-right:1px solid rgba(70,224,138,.3)">–</div>
                <input inputmode="numeric" value="${t.time ? ex.value : ex.reps}" data-chg="exRep" data-i="${i}" style="flex:1;font-size:18px;padding:6px 0">
                <div data-act="repUp" data-i="${i}" class="cbtn" style="width:30px;display:flex;align-items:center;justify-content:center;font-size:16px;color:${GREEN};border-left:1px solid rgba(70,224,138,.3)">+</div>
              </div>
            </div>
          </div>
          ${(!t.time && ex.type !== 'corpo') ? `
          <div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px"><span style="font-size:9px;letter-spacing:1px;color:${DIM}">CARGA — ${t.unit.toUpperCase()}</span><span style="font-size:9px;color:${BRIGHT}">TOQUE P/ DIGITAR</span></div>
            <div style="display:flex;align-items:stretch;border:1px solid rgba(70,224,138,.4)">
              <div data-act="valDown" data-i="${i}" class="cbtn" style="width:44px;display:flex;align-items:center;justify-content:center;font-size:20px;color:${GREEN};border-right:1px solid rgba(70,224,138,.3)">–</div>
              <input inputmode="decimal" value="${ex.value}" data-chg="exVal" data-i="${i}" style="flex:1;font-size:28px;padding:9px 0">
              <div data-act="valUp" data-i="${i}" class="cbtn" style="width:44px;display:flex;align-items:center;justify-content:center;font-size:20px;color:${GREEN};border-left:1px solid rgba(70,224,138,.3)">+</div>
            </div>
          </div>` : ''}
          <div>
            <div style="font-size:9px;letter-spacing:1px;color:${DIM};margin-bottom:5px">DESCANSO ENTRE SERIES</div>
            <div style="display:flex;align-items:stretch;border:1px solid rgba(70,224,138,.4)">
              <div style="width:34px;display:flex;align-items:center;justify-content:center;color:${GREEN};border-right:1px solid rgba(70,224,138,.3)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg></div>
              <div data-act="restDown" data-i="${i}" class="cbtn" style="width:30px;display:flex;align-items:center;justify-content:center;font-size:16px;color:${GREEN}">–</div>
              <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:7px 0;font-family:'DSEG7',monospace;font-size:20px;color:${NUM};text-shadow:0 0 10px rgba(70,224,138,.6)">${clock(ex.rest)}</div>
              <div data-act="restUp" data-i="${i}" class="cbtn" style="width:30px;display:flex;align-items:center;justify-content:center;font-size:16px;color:${GREEN}">+</div>
            </div>
          </div>
          <div data-act="exRemove" data-i="${i}" class="cbtn" style="text-align:center;font-size:10px;letter-spacing:1px;color:#e06a6a;border:1px solid rgba(224,106,106,.4);padding:8px">✕ REMOVER EXERCICIO</div>
        </div>`;
      return `
        <div style="border:1px solid ${open ? GREEN : 'rgba(70,224,138,.3)'}">
          <div data-act="exToggle" data-i="${i}" class="cbtn" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${open ? 'rgba(70,224,138,.14)' : 'transparent'}">
            <span style="font-family:'DSEG7',monospace;font-size:13px;color:${GREEN};text-shadow:0 0 5px rgba(70,224,138,.5)">${pad(i + 1)}</span>
            <div style="flex:1;min-width:0"><div style="font-size:14px;color:${BRIGHT}">${esc(ex.name)}</div><div style="font-size:10px;color:${DIM}">${exSummary(ex)}</div></div>
            <span style="color:${DIM};font-size:13px">${open ? '▾' : '▸'}</span>
          </div>
          ${body}
        </div>`;
    }).join('');
    return `
      <div style="height:100%;display:flex;flex-direction:column">
        <div style="flex:none;display:flex;align-items:center;justify-content:space-between;padding:6px 16px 9px;border-bottom:1px solid ${BORD};font-size:12px">
          <span data-act="cancelEdit" class="cbtn" style="color:${GREEN}">‹ VOLTAR</span>
          <span style="color:${BRIGHT};letter-spacing:2px;text-shadow:0 0 6px rgba(120,255,170,.5)">&gt; ${d.id ? 'EDITAR_TREINO' : 'NOVO_TREINO'}</span>
          <span data-act="saveWorkout" class="cbtn" style="color:${DARK};background:${GREEN};padding:3px 9px;font-size:10px;letter-spacing:1px;box-shadow:0 0 10px rgba(70,224,138,.5)">SALVAR</span>
        </div>
        <div data-scroll="editor" style="flex:1;overflow-y:auto;padding:12px 16px 16px;display:flex;flex-direction:column;gap:13px">
          <div>
            <div style="font-size:10px;letter-spacing:1.5px;color:${DIM};margin-bottom:5px">NOME DO TREINO:</div>
            <input type="text" class="ti" value="${esc(d.name)}" data-chg="draftName" style="border:1px solid rgba(70,224,138,.4);padding:10px 12px;font-size:17px;text-shadow:0 0 6px rgba(120,255,170,.5)">
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px"><span style="color:${GREEN}">&gt; EXERCICIOS</span><span style="font-family:'DSEG7',monospace;font-size:13px;color:${GREEN};text-shadow:0 0 5px rgba(70,224,138,.5)">${pad(d.exercises.length)}</span></div>
          ${cards}
          <div data-act="addExercise" class="cbtn" style="border:1px dashed rgba(70,224,138,.45);padding:12px;text-align:center;font-size:11px;letter-spacing:1.5px;color:${GREEN}">+ ADICIONAR EXERCICIO</div>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- sessão
  _sessVals() {
    const S = this.state, s = S.session;
    if (!s) return null;
    const w = S.workouts.find(x => x.id === s.wId);
    const V = {
      w, s,
      name: w.name,
      progress: pad(s.exIdx + 1) + '/' + pad(w.exercises.length),
      prevColor: s.exIdx > 0 ? GREEN : 'rgba(70,224,138,.22)',
      nextColor: (s.exIdx + 1 < w.exercises.length) ? GREEN : 'rgba(70,224,138,.22)',
      totalClock: clock(s.elapsed),
      doneMeta: w.exercises.length + ' EXERCICIOS · ' + w.exercises.reduce((a, e) => a + e.sets, 0) + ' SERIES',
    };
    if (!s.done) {
      const ex = w.exercises[s.exIdx], t = T(ex.type);
      const wl = s.workLeft ?? ex.value;
      V.exNum = pad(s.exIdx + 1) + ' / ' + pad(w.exercises.length);
      V.exName = ex.name.toUpperCase();
      V.target = t.time ? ('ALVO: ' + ex.value + 's' + (ex.rest ? (' · DESC ' + ex.rest + 's') : '')) :
        (ex.type === 'corpo' ? ('ALVO: ' + ex.reps + ' REPS · PESO LIVRE') : ('ALVO: ' + ex.reps + ' REPS · ' + ex.value + ' ' + t.unit.toUpperCase()));
      V.setNum = pad(s.setIdx + 1); V.setTotal = pad(ex.sets);
      V.sets = Array.from({ length: ex.sets }).map((_, i) => ({
        bg: i < s.setIdx ? GREEN : (i === s.setIdx ? 'rgba(70,224,138,.5)' : 'rgba(70,224,138,.15)'),
        glow: i < s.setIdx ? '0 0 6px rgba(70,224,138,.6)' : 'none',
      }));
      V.resting = s.resting;
      V.timed = t.time && !s.resting;
      V.reps = !t.time && !s.resting;
      V.phaseLabel = s.resting ? 'DESCANSO' : (t.time ? (s.workRun ? 'CRONÔMETRO' : 'PRONTO?') : 'EM SÉRIE');
      V.phaseColor = s.resting ? GREEN : BRIGHT;
      if (s.resting) { V.ghost = '88:88'; V.clock = clock(s.remaining); V.bigUnit = ''; }
      else if (t.time) { V.ghost = '88:88'; V.clock = clock(wl); V.bigUnit = s.workRun ? 'CRONOMETRANDO...' : ('ALVO ' + ex.value + 'S'); }
      else { V.ghost = '88'; V.clock = pad(ex.reps); V.bigUnit = ex.type === 'corpo' ? 'REPETICOES · LIVRE' : ('REPETICOES · ' + ex.value + ' ' + t.unit.toUpperCase()); }
      V.workBtnLabel = s.workRun ? '❚❚ PAUSAR CRONÔMETRO' : (wl < ex.value ? '► RETOMAR' : '► INICIAR CRONÔMETRO');
      const nextEx = w.exercises[s.exIdx + 1];
      V.nextName = nextEx ? nextEx.name.toUpperCase() : '— ÚLTIMO EXERCÍCIO —';
      V.primaryLabel = s.resting ? 'PULAR DESCANSO' : 'SÉRIE OK ►';
      V.secondaryLabel = s.resting ? 'RETOMAR' : 'PULAR EXERC.';
    }
    return V;
  }

  rSession() {
    const V = this._sessVals(); if (!V) return '';
    const s = V.s;
    const header = `
      <div style="flex:none;display:flex;align-items:center;justify-content:space-between;padding:6px 16px 9px;border-bottom:1px solid ${BORD};font-size:12px">
        <span data-act="quitSession" class="cbtn" style="color:${GREEN}">‹ SAIR</span>
        <span style="color:${BRIGHT};letter-spacing:1px">${esc(V.name)}</span>
        <div style="display:flex;align-items:center;gap:9px">
          <span data-act="sessPrev" class="cbtn" style="color:${V.prevColor};font-size:17px;line-height:1" title="Exercício anterior">‹</span>
          <span style="color:${DIM};font-family:'DSEG7',monospace;font-size:12px">${V.progress}</span>
          <span data-act="sessNextEx" class="cbtn" style="color:${V.nextColor};font-size:17px;line-height:1" title="Próximo exercício">›</span>
          <span data-act="enterLock" class="cbtn" style="color:${GREEN};display:flex;margin-left:2px" title="Tela de bloqueio"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></span>
        </div>
      </div>`;
    if (s.done) {
      return `
        <div style="height:100%;display:flex;flex-direction:column">
          ${header}
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px;text-align:center">
            <div style="font-size:15px;letter-spacing:3px;color:${BRIGHT};text-shadow:0 0 10px rgba(120,255,170,.6)">TREINO CONCLUIDO</div>
            <div style="font-family:'DSEG7',monospace;font-size:52px;color:${NUM};text-shadow:0 0 16px rgba(70,224,138,.7)">${V.totalClock}</div>
            <div style="font-size:11px;color:${DIM};letter-spacing:1px">${V.doneMeta}</div>
            <div data-act="quitSession" class="cbtn" style="background:${GREEN};color:${DARK};padding:12px 26px;font-size:13px;letter-spacing:2px;box-shadow:0 0 16px rgba(70,224,138,.5)">CONCLUIR</div>
          </div>
        </div>`;
    }
    const setsBar = V.sets.map(x => `<div style="flex:1;height:8px;background:${x.bg};box-shadow:${x.glow}"></div>`).join('');
    return `
      <div style="height:100%;display:flex;flex-direction:column">
        ${header}
        <div style="flex:1;display:flex;flex-direction:column;padding:14px 18px;min-height:0">
          <div style="font-size:10px;letter-spacing:2px;color:${DIM}">EXERCICIO ${V.exNum}</div>
          <div style="font-size:24px;color:${BRIGHT};text-shadow:0 0 8px rgba(120,255,170,.5);margin-top:3px">${esc(V.exName)}</div>
          <div style="font-size:12px;color:${GREEN};margin-top:6px">${V.target}</div>
          <div style="display:flex;gap:6px;margin-top:14px">${setsBar}</div>
          <div style="font-size:10px;color:${DIM};margin-top:6px">SERIE ${V.setNum} DE ${V.setTotal}</div>
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px">
            <div style="font-size:11px;letter-spacing:4px;color:${V.phaseColor};text-shadow:0 0 8px rgba(70,224,138,.5)">${V.phaseLabel}</div>
            <div style="position:relative;line-height:1">
              <span style="font-family:'DSEG7',monospace;font-size:74px;color:rgba(70,224,138,.13)">${V.ghost}</span>
              <span style="position:absolute;left:0;top:0;font-family:'DSEG7',monospace;font-size:74px;color:${NUM};text-shadow:0 0 18px rgba(70,224,138,.7)">${V.clock}</span>
            </div>
            <div style="font-size:10px;color:${DIM};letter-spacing:1px;min-height:12px">${V.bigUnit}</div>
            ${V.resting ? `
            <div style="display:flex;gap:10px;margin-top:2px">
              <span data-act="restMinus" class="cbtn" style="border:1px solid rgba(70,224,138,.4);padding:6px 12px;font-size:11px;color:${GREEN}">−15s</span>
              <span data-act="restPlus" class="cbtn" style="border:1px solid rgba(70,224,138,.4);padding:6px 12px;font-size:11px;color:${GREEN}">+15s</span>
            </div>` : ''}
            ${V.timed ? `
            <div data-act="toggleWork" class="cbtn" style="margin-top:2px;border:1px solid rgba(70,224,138,.5);padding:8px 18px;font-size:12px;letter-spacing:1px;color:${BRIGHT};box-shadow:0 0 12px rgba(70,224,138,.25)">${V.workBtnLabel}</div>` : ''}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-top:1px dashed rgba(70,224,138,.25);font-size:10px;letter-spacing:1px;color:${DIM}">
            <span>PRÓXIMO ›</span><span style="color:${GREEN};text-align:right;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-left:10px">${esc(V.nextName)}</span>
          </div>
          <div style="display:flex;gap:10px">
            <div data-act="sessSecondary" class="cbtn" style="flex:1;border:1px solid rgba(70,224,138,.4);padding:14px;text-align:center;font-size:13px;letter-spacing:1px;color:${GREEN}">${V.secondaryLabel}</div>
            <div data-act="sessPrimary" class="cbtn" style="flex:2;background:${GREEN};color:${DARK};padding:14px;text-align:center;font-size:14px;letter-spacing:2px;box-shadow:0 0 16px rgba(70,224,138,.5)">${V.primaryLabel}</div>
          </div>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- bloqueio
  rLock() {
    const V = this._sessVals(); if (!V || V.s.done) return '';
    const now = new Date();
    return `
      <div style="position:absolute;inset:0;z-index:20;background:radial-gradient(120% 90% at 50% 18%,#0a2416 0%,#061a0f 55%,#020c07 100%);display:flex;flex-direction:column;padding:0 22px;color:${GREEN}">
        <div style="flex:none;padding-top:max(46px, env(safe-area-inset-top));text-align:center">
          <div style="display:flex;align-items:center;justify-content:center;gap:6px;font-size:9px;letter-spacing:3px;color:${DIM}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
            <span>BLOQUEADO</span>
          </div>
          <div style="font-family:'DSEG7',monospace;font-size:62px;color:${NUM};text-shadow:0 0 20px rgba(70,224,138,.6);margin-top:12px;line-height:1">${pad(now.getHours())}:${pad(now.getMinutes())}</div>
          <div style="font-size:12px;letter-spacing:3px;color:${BRIGHT};margin-top:8px">${DIAS[now.getDay()]} · ${now.getDate()} ${MESES[now.getMonth()]}</div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center">
          <div style="border:1px solid rgba(70,224,138,.4);background:rgba(70,224,138,.05);box-shadow:0 0 26px rgba(70,224,138,.18)">
            <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(70,224,138,.12);border-bottom:1px solid rgba(70,224,138,.3);padding:8px 13px;font-size:10px;letter-spacing:1px;color:${BRIGHT}">
              <span style="display:flex;align-items:center;gap:6px"><span style="width:6px;height:6px;background:${GREEN};box-shadow:0 0 6px ${GREEN};border-radius:50%"></span>FITOS · ${esc(V.name)}</span>
              <span style="display:flex;align-items:center;gap:9px;color:${DIM};font-family:'DSEG7',monospace">
                <span data-act="sessPrev" class="cbtn" style="color:${V.prevColor};font-size:15px" title="Anterior">‹</span>
                ${V.progress}
                <span data-act="sessNextEx" class="cbtn" style="color:${V.nextColor};font-size:15px" title="Próximo">›</span>
              </span>
            </div>
            <div style="padding:15px;display:flex;flex-direction:column;gap:13px">
              <div>
                <div style="font-size:10px;letter-spacing:3px;color:${V.phaseColor}">${V.phaseLabel}</div>
                <div style="font-size:21px;color:${BRIGHT};text-shadow:0 0 8px rgba(120,255,170,.5);margin-top:4px">${esc(V.exName)}</div>
                <div style="font-size:10px;color:${DIM};margin-top:5px">SERIE ${V.setNum} DE ${V.setTotal}</div>
              </div>
              <div style="display:flex;align-items:center;gap:16px">
                <div style="position:relative;line-height:1">
                  <span style="font-family:'DSEG7',monospace;font-size:48px;color:rgba(70,224,138,.13)">${V.ghost}</span>
                  <span style="position:absolute;left:0;top:0;font-family:'DSEG7',monospace;font-size:48px;color:${NUM};text-shadow:0 0 14px rgba(70,224,138,.7)">${V.clock}</span>
                </div>
                <div style="flex:1;font-size:10px;letter-spacing:1px;color:${DIM}">${V.bigUnit}</div>
              </div>
              ${V.resting ? `
              <div style="display:flex;gap:8px">
                <div data-act="restMinus" class="cbtn" style="flex:1;text-align:center;border:1px solid rgba(70,224,138,.4);padding:11px 0;font-size:12px;color:${GREEN}">−15s</div>
                <div data-act="restPlus" class="cbtn" style="flex:1;text-align:center;border:1px solid rgba(70,224,138,.4);padding:11px 0;font-size:12px;color:${GREEN}">+15s</div>
                <div data-act="sessPrimary" class="cbtn" style="flex:1.4;text-align:center;background:${GREEN};color:${DARK};padding:11px 0;font-size:12px;letter-spacing:1px;box-shadow:0 0 14px rgba(70,224,138,.5)">PULAR ►</div>
              </div>` : ''}
              ${V.timed ? `
              <div style="display:flex;gap:8px">
                <div data-act="toggleWork" class="cbtn" style="flex:1.6;text-align:center;border:1px solid rgba(70,224,138,.5);padding:11px 0;font-size:12px;letter-spacing:1px;color:${BRIGHT}">${V.workBtnLabel}</div>
                <div data-act="sessPrimary" class="cbtn" style="flex:1;text-align:center;background:${GREEN};color:${DARK};padding:11px 0;font-size:12px;letter-spacing:1px;box-shadow:0 0 14px rgba(70,224,138,.5)">OK ►</div>
              </div>` : ''}
              ${V.reps ? `
              <div style="display:flex;gap:8px">
                <div data-act="sessSecondary" class="cbtn" style="flex:1;text-align:center;border:1px solid rgba(70,224,138,.4);padding:11px 0;font-size:11px;letter-spacing:.5px;color:${GREEN}">PULAR EXERC.</div>
                <div data-act="sessPrimary" class="cbtn" style="flex:1;text-align:center;background:${GREEN};color:${DARK};padding:11px 0;font-size:12px;letter-spacing:1px;box-shadow:0 0 14px rgba(70,224,138,.5)">SÉRIE OK ►</div>
              </div>` : ''}
              <div style="border-top:1px dashed rgba(70,224,138,.22);padding-top:9px;display:flex;justify-content:space-between;font-size:10px;letter-spacing:1px;color:${DIM}">
                <span>PRÓXIMO ›</span><span style="color:${GREEN};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-left:10px">${esc(V.nextName)}</span>
              </div>
            </div>
          </div>
        </div>
        <div data-act="exitLock" class="cbtn" style="flex:none;padding:0 0 max(26px, env(safe-area-inset-bottom));text-align:center">
          <div style="font-size:11px;letter-spacing:3px;color:${BRIGHT};animation:blink 2s step-end infinite">↑ DESLIZE P/ ABRIR</div>
          <div style="width:120px;height:4px;border-radius:2px;background:${GREEN};opacity:.45;margin:12px auto 0"></div>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- HIIT
  _cfgCell(label, actDown, actUp, display) {
    return `
      <div style="flex:1"><div style="font-size:9px;letter-spacing:1px;color:${DIM};margin-bottom:5px">${label}</div>
        <div style="display:flex;align-items:stretch;border:1px solid ${BORD}">
          <div data-act="${actDown}" class="cbtn" style="width:28px;display:flex;align-items:center;justify-content:center;color:${GREEN};font-size:16px">–</div>
          <div style="flex:1;text-align:center;padding:6px 0;font-family:'DSEG7',monospace;font-size:17px;color:${NUM};text-shadow:0 0 8px rgba(70,224,138,.5)">${display}</div>
          <div data-act="${actUp}" class="cbtn" style="width:28px;display:flex;align-items:center;justify-content:center;color:${GREEN};font-size:16px">+</div>
        </div>
      </div>`;
  }

  rHiit() {
    const S = this.state, H = S.hiit, r = S.hiitRun;
    if (r) {
      const step = r.seq[r.idx];
      const done = step.phase === 'done';
      const phCol = step.phase === 'work' ? BRIGHT : (step.phase === 'rest' ? GREEN : (step.phase === 'prepare' ? '#ffd479' : BRIGHT));
      const phBg = step.phase === 'rest' ? 'radial-gradient(120% 100% at 50% 40%,#07160d,#03100a)' : 'transparent';
      const playIcon = done
        ? '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
        : (r.running
          ? '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>'
          : '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>');
      return `
        <div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:18px;background:${phBg}">
          <div style="display:flex;justify-content:space-between;width:100%;font-size:11px;color:${DIM};letter-spacing:1px"><span>EXERC ${step.ex ? (step.ex + '/' + H.exercises.length) : '—'}</span><span>CICLO ${step.cycle ? (step.cycle + '/' + H.cycles) : '—'}</span></div>
          <div style="font-size:14px;letter-spacing:4px;color:${phCol};text-shadow:0 0 12px rgba(70,224,138,.6)">${done ? 'CONCLUIDO' : ({ prepare: 'PREPARAR', work: 'TREINO', rest: 'DESCANSO' }[step.phase])}</div>
          <div style="font-size:22px;color:${BRIGHT};text-shadow:0 0 8px rgba(120,255,170,.5);text-align:center;min-height:26px">${step.phase === 'work' ? esc(step.label) : (done ? 'BOM TREINO!' : '')}</div>
          <div style="position:relative;line-height:1">
            <span style="font-family:'DSEG7',monospace;font-size:92px;color:rgba(70,224,138,.12)">88</span>
            <span style="position:absolute;left:0;top:0;font-family:'DSEG7',monospace;font-size:92px;color:${step.phase === 'rest' ? GREEN : NUM};text-shadow:0 0 22px rgba(70,224,138,.8)">${done ? '00' : pad(r.remaining)}</span>
          </div>
          <div style="display:flex;gap:14px;margin-top:4px">
            <div data-act="stopHiit" class="cbtn" style="width:54px;height:54px;border:1px solid rgba(70,224,138,.5);display:flex;align-items:center;justify-content:center;color:${GREEN}"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="1"/></svg></div>
            <div data-act="toggleHiit" class="cbtn" style="width:76px;height:76px;background:${GREEN};display:flex;align-items:center;justify-content:center;color:${DARK};box-shadow:0 0 22px rgba(70,224,138,.6)">${playIcon}</div>
            <div data-act="skipHiit" class="cbtn" style="width:54px;height:54px;border:1px solid rgba(70,224,138,.5);display:flex;align-items:center;justify-content:center;color:${GREEN}"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5v14l9-7z"/><rect x="16" y="5" width="3" height="14"/></svg></div>
          </div>
          <div style="font-size:10px;color:${DIM};letter-spacing:1px;text-align:center">ON VARIÁVEL · ${H.rest}s OFF · ${H.exercises.length} EXERC · ${H.cycles} CICLOS</div>
        </div>`;
    }
    const rows = H.exercises.map((e, i) => `
      <div style="display:flex;align-items:center;gap:8px;border:1px solid rgba(70,224,138,.28);padding:8px 10px">
        <span style="font-family:'DSEG7',monospace;font-size:13px;color:${GREEN}">${pad(i + 1)}</span>
        <input type="text" class="ti" value="${esc(this._hxName(e))}" data-chg="hiitName" data-i="${i}" style="flex:1;min-width:0;font-size:13px">
        <div style="display:flex;align-items:stretch;border:1px solid ${BORD};flex:none" title="Tempo ON deste exercício">
          <div data-act="hxDown" data-i="${i}" class="cbtn" style="width:24px;display:flex;align-items:center;justify-content:center;color:${GREEN};font-size:14px">–</div>
          <div style="width:50px;text-align:center;padding:5px 0;font-family:'DSEG7',monospace;font-size:13px;color:${NUM};text-shadow:0 0 6px rgba(70,224,138,.5)">${clock(this._hxWork(e))}</div>
          <div data-act="hxUp" data-i="${i}" class="cbtn" style="width:24px;display:flex;align-items:center;justify-content:center;color:${GREEN};font-size:14px">+</div>
        </div>
        <span data-act="hxRemove" data-i="${i}" class="cbtn" style="color:#e06a6a;font-size:14px">✕</span>
      </div>`).join('');
    const sumWork = H.exercises.reduce((a, e) => a + this._hxWork(e), 0);
    const totalRest = (H.exercises.length * H.cycles - 1) * H.rest;
    return `
      <div style="height:100%;display:flex;flex-direction:column">
        <div style="flex:none;display:flex;align-items:center;justify-content:space-between;padding:6px 16px 9px;border-bottom:1px solid ${BORD};font-size:12px">
          <span data-act="goHome" class="cbtn" style="color:${GREEN}">‹</span>
          <span style="color:${BRIGHT};letter-spacing:2px;text-shadow:0 0 6px rgba(120,255,170,.5)">&gt; TIMER HIIT</span>
          <span style="width:12px"></span>
        </div>
        <div data-scroll="hiit" style="flex:1;overflow-y:auto;padding:14px 16px 16px;display:flex;flex-direction:column;gap:13px">
          <div style="display:flex;gap:9px">
            ${this._cfgCell('PREPARAR', 'prepDown', 'prepUp', clock(H.prepare))}
            ${this._cfgCell('CICLOS', 'cyclesDown', 'cyclesUp', pad(H.cycles))}
          </div>
          <div style="display:flex;gap:9px">
            ${this._cfgCell('ON PADRÃO', 'workDown', 'workUp', clock(H.work))}
            ${this._cfgCell('DESCANSO (OFF)', 'hrestDown', 'hrestUp', clock(H.rest))}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;margin-top:2px"><span style="color:${GREEN}">&gt; EXERCICIOS DO CIRCUITO</span><span style="font-family:'DSEG7',monospace;font-size:13px;color:${GREEN};text-shadow:0 0 5px rgba(70,224,138,.5)">${pad(H.exercises.length)}</span></div>
          ${rows}
          <div data-act="addHiitEx" class="cbtn" style="border:1px dashed rgba(70,224,138,.45);padding:11px;text-align:center;font-size:11px;letter-spacing:1.5px;color:${GREEN}">+ ADICIONAR EXERCICIO</div>
          <div style="border-top:1px dashed rgba(70,224,138,.25);padding-top:11px;text-align:center;font-size:10px;color:${DIM};letter-spacing:1px">DURAÇÃO TOTAL ESTIMADA: ${clock(H.prepare + sumWork * H.cycles + Math.max(0, totalRest))}</div>
          <div data-act="startHiit" class="cbtn" style="background:${GREEN};color:${DARK};padding:14px;text-align:center;font-size:15px;letter-spacing:3px;box-shadow:0 0 18px rgba(70,224,138,.55)">► INICIAR CIRCUITO</div>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- perfil
  _chip(label, on, act, key) {
    return `<span data-act="${act}"${key ? ` data-key="${key}"` : ''} class="cbtn" style="padding:6px 12px;font-size:10px;letter-spacing:1px;color:${on ? DARK : GREEN};background:${on ? GREEN : 'transparent'};border:1px solid ${on ? GREEN : BORD};box-shadow:${on ? '0 0 10px rgba(70,224,138,.5)' : 'none'}">${label}</span>`;
  }
  rPerfil() {
    const S = this.state, st = S.settings;
    const totalDone = S.history.length;
    return `
      <div data-scroll="perfil" style="height:100%;overflow-y:auto;padding:6px 18px 18px;display:flex;flex-direction:column;gap:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;border-bottom:1px solid ${BORD}">
          <span style="font-size:13px;letter-spacing:2px;color:${BRIGHT}">&gt; PERFIL</span>
        </div>
        <div>
          <div style="font-size:10px;letter-spacing:1.5px;color:${DIM};margin-bottom:5px">NOME DO ATLETA:</div>
          <input type="text" class="ti" value="${esc(S.profile.name)}" data-chg="profileName" style="border:1px solid rgba(70,224,138,.4);padding:10px 12px;font-size:17px;text-shadow:0 0 6px rgba(120,255,170,.5)">
        </div>
        <div style="font-size:11px;color:${GREEN}">&gt; APARÊNCIA</div>
        <div style="border:1px solid rgba(70,224,138,.32);padding:12px;display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:11px;color:${BRIGHT}">TEMA DO TERMINAL</span>
            <div style="display:flex;gap:6px">
              ${this._chip('VERDE', st.theme !== 'ambar', 'setTheme', 'verde')}
              ${this._chip('ÂMBAR', st.theme === 'ambar', 'setTheme', 'ambar')}
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:11px;color:${BRIGHT}">SCANLINES (CRT)</span>
            <div style="display:flex;gap:6px">${this._chip(st.scanlines ? 'ON' : 'OFF', st.scanlines, 'togScan')}</div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:11px;color:${BRIGHT}">SOM (BIPES)</span>
            <div style="display:flex;gap:6px">${this._chip(st.sound ? 'ON' : 'OFF', st.sound, 'togSound')}</div>
          </div>
        </div>
        <div style="font-size:11px;color:${GREEN}">&gt; DADOS</div>
        <div style="border:1px solid rgba(70,224,138,.32);padding:12px;display:flex;flex-direction:column;gap:9px;font-size:11px;color:${DIM}">
          <div style="display:flex;justify-content:space-between"><span>DIAS TREINADOS</span><span style="font-family:'DSEG7',monospace;color:${GREEN}">${pad(totalDone)}</span></div>
          <div style="display:flex;justify-content:space-between"><span>SEQUÊNCIA ATUAL</span><span><span style="font-family:'DSEG7',monospace;color:${GREEN}">${pad(this._streak())}</span> DIAS</span></div>
          <div style="display:flex;justify-content:space-between"><span>TREINOS SALVOS</span><span style="font-family:'DSEG7',monospace;color:${GREEN}">${pad(S.workouts.length)}</span></div>
        </div>
        <div data-act="goEvo" class="cbtn" style="border:1px solid rgba(70,224,138,.4);padding:12px 14px;display:flex;align-items:center;gap:12px">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${GREEN}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16M6 16l4-5 3 3 5-7"/></svg>
          <div style="flex:1"><div style="font-size:14px;color:${BRIGHT}">HISTÓRICO & EVOLUÇÃO</div><div style="font-size:10px;color:${DIM}">CARGAS E SESSÕES REGISTRADAS</div></div>
          <span style="color:${DIM};font-size:16px">›</span>
        </div>
        <div style="display:flex;gap:8px">
          <div data-act="exportData" class="cbtn" style="flex:1;text-align:center;border:1px solid rgba(70,224,138,.4);padding:10px;font-size:10px;letter-spacing:1px;color:${GREEN}">⇩ EXPORTAR BACKUP</div>
          <div data-act="importData" class="cbtn" style="flex:1;text-align:center;border:1px solid rgba(70,224,138,.4);padding:10px;font-size:10px;letter-spacing:1px;color:${GREEN}">⇪ IMPORTAR BACKUP</div>
        </div>
        <div data-act="wipeData" class="cbtn" style="text-align:center;font-size:10px;letter-spacing:1px;color:#e06a6a;border:1px solid rgba(224,106,106,.4);padding:10px">✕ APAGAR TODOS OS DADOS</div>
        <div style="text-align:center;font-size:9px;letter-spacing:1px;color:${DIM};margin-top:4px">FITOS//TERMINAL DE TREINO v2.4 — DADOS SALVOS NESTE APARELHO</div>
      </div>`;
  }

  // ---------------------------------------------------------------- evolução (tela)
  rEvo() {
    const S = this.state;
    const data = this._evoData();
    const fmtDay = ts => { const d = new Date(ts); return d.getDate() + ' ' + MESES[d.getMonth()]; };
    let body;
    if (!data.length) {
      body = `<div style="font-size:11px;color:${DIM};text-align:center;padding:40px 10px;line-height:1.8">SEM DADOS AINDA.<br>COMPLETE UM TREINO PARA<br>REGISTRAR SUA EVOLUÇÃO.</div>`;
    } else {
      const sel = data.find(x => x.name === S.evoSel) || data[0];
      const chips = data.map(x => {
        const on = x.name === sel.name;
        return `<span data-act="evoPick" data-key="${esc(x.name)}" class="cbtn" style="padding:4px 8px;font-size:9px;letter-spacing:.5px;white-space:nowrap;color:${on ? DARK : GREEN};background:${on ? GREEN : 'transparent'};border:1px solid ${on ? GREEN : BORD};box-shadow:${on ? '0 0 10px rgba(70,224,138,.5)' : 'none'}">${esc(x.name.toUpperCase())}</span>`;
      }).join('');
      const pr = sel.points.reduce((a, p) => p.v >= a.v ? p : a, sel.points[0]);
      const unit = this._evoUnit(sel.type);
      const sessions = S.log.slice(-8).reverse().map(en => `
        <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px dashed rgba(70,224,138,.22);font-size:11px">
          <span style="color:${DIM};flex:none">${fmtDay(en.ts)}</span>
          <span style="color:${BRIGHT};flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(en.name)}</span>
          <span style="font-family:'DSEG7',monospace;color:${GREEN};flex:none">${clock(en.elapsed)}</span>
          <span style="color:${DIM};flex:none">${en.exercises.reduce((a, e) => a + e.sets, 0)} SER</span>
        </div>`).join('');
      body = `
        <div style="display:flex;gap:5px;overflow-x:auto;padding-bottom:2px">${chips}</div>
        <div style="border:1px solid rgba(70,224,138,.32)">
          <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(70,224,138,.12);border-bottom:1px solid rgba(70,224,138,.3);padding:7px 13px;font-size:10px;letter-spacing:1px;color:${BRIGHT}">[ CARGA — ${unit} ]<span style="color:${DIM}">${sel.points.length} REGISTROS</span></div>
          <div style="padding:10px 8px 6px">${this._evoChart(sel.points)}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;border:1px solid rgba(70,224,138,.32);padding:10px 13px;font-size:11px">
          <span style="color:${DIM};letter-spacing:1px">RECORDE (PR)</span>
          <span style="color:${BRIGHT}"><span style="font-family:'DSEG7',monospace;color:${NUM};text-shadow:0 0 8px rgba(70,224,138,.5);font-size:16px">${pr.v}</span> ${unit} · ${fmtDay(pr.ts)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:2px"><span style="color:${GREEN}">&gt; SESSÕES RECENTES</span><span style="font-family:'DSEG7',monospace;font-size:13px;color:${GREEN}">${pad(S.log.length)}</span></div>
        ${sessions}`;
    }
    return `
      <div style="height:100%;display:flex;flex-direction:column">
        <div style="flex:none;display:flex;align-items:center;justify-content:space-between;padding:6px 16px 9px;border-bottom:1px solid ${BORD};font-size:12px">
          <span data-act="goPerfil" class="cbtn" style="color:${GREEN}">‹ VOLTAR</span>
          <span style="color:${BRIGHT};letter-spacing:2px;text-shadow:0 0 6px rgba(120,255,170,.5)">&gt; EVOLUCAO</span>
          <span style="width:12px"></span>
        </div>
        <div data-scroll="evo" style="flex:1;overflow-y:auto;padding:12px 16px 16px;display:flex;flex-direction:column;gap:12px">
          ${body}
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- nav
  rNav() {
    const scr = this.state.screen;
    const tab = (act, on, icon, label) => `
      <div data-act="${act}" class="cbtn" style="flex:1;display:flex;flex-direction:column;align-items:center">
        <div style="height:2px;width:100%;background:${on ? GREEN : 'transparent'};${on ? 'box-shadow:0 0 8px rgba(70,224,138,.7)' : ''}"></div>
        <div style="padding:8px 0;display:flex;flex-direction:column;align-items:center;gap:3px;color:${on ? BRIGHT : DIM}">${icon}<span style="font-size:9px;letter-spacing:.5px">${label}</span></div>
      </div>`;
    return `
      <div style="flex:none;border-top:1px solid ${BORD};display:flex">
        ${tab('goHome', scr === 'home', '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>', 'INICIO')}
        ${tab('goList', scr === 'list', '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.5 6.5v11M17.5 6.5v11M4 9v6M20 9v6M6.5 12h11"/></svg>', 'TREINOS')}
        ${tab('goHiit', scr === 'hiit', '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>', 'TIMER')}
        ${tab('goPerfil', scr === 'perfil', '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>', 'PERFIL')}
      </div>`;
  }
}

// ============================================================================
new App(document.getElementById('content'));

// SW só em produção — em localhost o cache atrapalha o desenvolvimento
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  if (isLocal) {
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
  } else {
    addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
}
