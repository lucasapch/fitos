// ============================================================================
// FITOS — app de treino. Visual inspirado no Nothing OS (preto/branco, cartões
// arredondados, numerais em matriz de pontos, um acento vermelho).
// Vanilla JS: estado, persistência local, timers e renderização por strings.
// ============================================================================

import { dotSvg } from './dot.js';

const TYPES = [
  { key: 'kg',       label: 'KG',       unit: 'kg',    time: false },
  { key: 'halter',   label: 'HALTER',   unit: 'kg',    time: false },
  { key: 'maquina',  label: 'MÁQUINA',  unit: 'placa', time: false },
  { key: 'corpo',    label: 'CORPO',    unit: 'livre', time: false },
  { key: 'elastico', label: 'ELÁSTICO', unit: 'nível', time: false },
  { key: 'tempo',    label: 'TEMPO',    unit: 's',     time: true  },
];
const T = key => TYPES.find(t => t.key === key) || TYPES[0];

// Tipos de série. 'N' é numerada (1,2,3…); as demais têm sigla própria.
// RIR = repetições em reserva (0 = falha total).
const KINDS = [
  { key: 'W',  short: 'W',  label: 'APROXIMAÇÃO',   hint: 'Série leve de preparação', tone: 'dim' },
  { key: 'N',  short: '',   label: 'NORMAL',        hint: 'Série valendo',            tone: 'ink' },
  { key: 'R3', short: 'R3', label: 'RIR 3',         hint: 'Daria pra fazer mais 3',   tone: 'ink' },
  { key: 'R2', short: 'R2', label: 'RIR 2',         hint: 'Daria pra fazer mais 2',   tone: 'ink' },
  { key: 'R1', short: 'R1', label: 'RIR 1',         hint: 'Pararia com 1 no tanque',  tone: 'ink' },
  { key: 'R0', short: 'R0', label: 'RIR 0 · FALHA', hint: 'Falha total',              tone: 'acc' },
  { key: 'D',  short: 'D',  label: 'DROP SET',      hint: 'Reduz a carga e continua', tone: 'acc' },
];
const K = key => KINDS.find(k => k.key === key) || KINDS[1];
const isWarm = kind => kind === 'W';
const TONE = { dim: 'var(--ink-3)', ink: 'var(--ink)', acc: 'var(--accent)' };
const kindColor = kind => TONE[K(kind).tone];

const pad = n => String(Math.max(0, Math.floor(n))).padStart(2, '0');
const clock = s => pad(Math.floor(s / 60)) + ':' + pad(s % 60);
const uid = () => 'x' + Math.random().toString(36).slice(2, 8);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const DAY = 86400000;
const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const dayKey = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const startOfDay = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const noAcc = s => String(s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const LS_KEY = 'fitos.v1';

// ícones (traço fino, estilo Nothing)
const I = {
  back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  fwd: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  play: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  stop: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>',
  skip: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5v14l9-7z"/><rect x="16" y="5" width="3" height="14" rx="1"/></svg>',
  undo: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h11a5 5 0 0 1 0 10H8"/><path d="M6 4L2 8l4 4"/></svg>',
  list: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
  lock: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  timer: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
  home: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
  dumbbell: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.5 6.5v11M17.5 6.5v11M4 9v6M20 9v6M6.5 12h11"/></svg>',
  user: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  chart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16M6 16l4-5 3 3 5-7"/></svg>',
  up: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  down: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  check: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  copy: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  x: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  plus: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
};

// ---------------------------------------------------------------- modelo
function migrateEx(ex) {
  if (Array.isArray(ex.sets)) return { ...ex, notes: ex.notes || '' };
  const mk = kind => ({ id: uid(), kind, value: ex.value, reps: ex.reps });
  const sets = [
    ...Array(ex.warmup || 0).fill(0).map(() => mk('W')),
    ...Array(Math.max(1, ex.sets || 1)).fill(0).map(() => mk('N')),
    ...Array(ex.drop || 0).fill(0).map(() => mk('D')),
  ];
  const { warmup, drop, value, reps, ...rest } = ex;
  return { ...rest, notes: ex.notes || '', sets };
}
const migrateWorkouts = ws => (ws || []).map(w => ({ ...w, exercises: (w.exercises || []).map(migrateEx) }));

// Ajustes antigos (tema CRT) → tema Nothing
function migrateSettings(s) {
  if (!s) return { theme: 'dark', dots: true, sound: true };
  const theme = (s.theme === 'light' || s.theme === 'dark') ? s.theme : 'dark';
  return { theme, dots: s.dots !== false, sound: s.sound !== false };
}

const newExercise = (name, open = false) => ({
  id: uid(), name, type: 'kg', rest: 60, notes: '', _open: open,
  sets: Array(3).fill(0).map(() => ({ id: uid(), kind: 'N', value: 20, reps: 12 })),
});

// ---------------------------------------------------------------- seed
function seedWorkouts() {
  const ex = (name, type, sets, reps, value, rest) => ({
    id: uid(), name, type, rest, notes: '',
    sets: Array(sets).fill(0).map(() => ({ id: uid(), kind: 'N', value, reps })),
  });
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
      workouts: p.workouts ? migrateWorkouts(p.workouts) : seedWorkouts(),
      draft: null,
      session: null,
      sheet: null,
      hiit: p.hiit || { prepare: 10, work: 20, rest: 10, cycles: 3, exercises: [
        { name: 'Burpee', work: 20 }, { name: 'Agachamento com Salto', work: 30 }, { name: 'Prancha Dinâmica', work: 40 },
      ] },
      hiitRun: null,
      settings: migrateSettings(p.settings),
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
    // Com um campo focado a re-renderização fica suspensa (senão o tick do
    // timer destruiria o input no meio da digitação); retoma ao desfocar.
    root.addEventListener('focusout', () => {
      setTimeout(() => {
        if (this._renderPending && !this._inputFocused()) { this._renderPending = false; this.render(); }
      }, 0);
    });
    if (p.workouts || p.settings) this.persist();   // grava o formato migrado
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
  _pulse(rem) { if (rem <= 3) navigator.vibrate?.(40); }
  _pulseEnd() { navigator.vibrate?.([120, 80, 120]); }
  // Bipes pré-agendados na linha do tempo do áudio: tocam na hora certa mesmo
  // com o JS congelado em segundo plano.
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
  _resched() {
    this._schedCancel();
    const s = this.state.session;
    if (!s || s.done || !s.started || s.paused) return;
    if (s.resting) { if (s.remaining > 0) this._schedFor(s.remaining); return; }
    const ex = this._curEx(), t = T(ex.type);
    const dur = s.workLeft ?? this._setAt(ex, s.setIdx).value;
    if (t.time && s.workRun && dur > 0) this._schedFor(dur);
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
  go(s) { this._clear(); this.setState({ screen: s, sheet: null }); }

  // ---------------------------------------------------------------- editor
  newWorkout() {
    this.setState({ screen: 'editor', draft: { id: null, name: 'Novo Treino', exercises: [newExercise('Exercício 1', true)] } });
  }
  editWorkout(id) {
    const w = this.state.workouts.find(x => x.id === id); if (!w) return;
    this.setState({ screen: 'editor', sheet: null, draft: JSON.parse(JSON.stringify({ id: w.id, name: w.name, exercises: w.exercises })) });
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
      exercises: d.exercises.map(({ _open, ...e }) => ({ ...e, sets: (e.sets || []).map(({ _pick, ...st }) => st) })) };
    const ws = this.state.workouts.slice();
    const i = ws.findIndex(w => w.id === clean.id);
    if (i >= 0) ws[i] = clean; else ws.unshift(clean);
    this.setState({ workouts: ws, screen: 'list', draft: null });
  }
  deleteWorkout(id) {
    const w = this.state.workouts.find(x => x.id === id); if (!w) return;
    if (!confirm('Excluir "' + w.name + '"?\n\nO treino será removido deste aparelho. O histórico de sessões já concluídas é mantido.')) return;
    const patch = { workouts: this.state.workouts.filter(x => x.id !== id) };
    if (this.state.draft && this.state.draft.id === id) { patch.draft = null; patch.screen = 'list'; }
    if (this.state.session && this.state.session.wId === id) {
      this._clear(); this._wake(false); this._msStop();
      patch.session = null; patch.screen = 'list'; patch.sheet = null;
    }
    this.setState(patch);
  }
  addExercise() {
    this._mutDraft(d => {
      d.exercises.forEach(e => e._open = false);
      d.exercises.push(newExercise('Exercício ' + (d.exercises.length + 1), true));
    });
  }
  toggleEx(i) { this._mutDraft(d => { const was = d.exercises[i]._open; d.exercises.forEach(e => e._open = false); d.exercises[i]._open = !was; }); }
  dupExercise(i) {
    this._mutDraft(d => {
      const src = d.exercises[i];
      const copy = JSON.parse(JSON.stringify({ ...src, _open: false }));
      copy.id = uid();
      copy.name = src.name + ' (cópia)';
      copy.sets = (copy.sets || []).map(s => ({ ...s, id: uid(), _pick: false }));
      d.exercises.forEach(e => e._open = false);
      copy._open = true;
      d.exercises.splice(i + 1, 0, copy);
    });
  }
  moveDraftEx(i, dir) {
    const j = i + dir;
    this._mutDraft(d => {
      if (j < 0 || j >= d.exercises.length) return;
      const [it] = d.exercises.splice(i, 1);
      d.exercises.splice(j, 0, it);
    });
  }
  // ---- séries independentes ----
  _mutSets(i, fn) { this._mutDraft(d => { const e = d.exercises[i]; e.sets = fn((e.sets || []).map(s => ({ ...s }))); }); }
  addSet(i) {
    this._mutSets(i, sets => {
      const last = sets[sets.length - 1];
      return [...sets, { id: uid(), kind: last ? last.kind : 'N', value: last ? last.value : 20, reps: last ? last.reps : 12 }];
    });
  }
  delSet(i, j) { this._mutSets(i, sets => sets.filter((_, k) => k !== j)); }
  pickSet(i, j) { this._mutSets(i, sets => sets.map((s, k) => ({ ...s, _pick: k === j ? !s._pick : false }))); }
  setKind(i, j, kind) { this._mutSets(i, sets => sets.map((s, k) => k === j ? { ...s, kind, _pick: false } : s)); }
  patchSet(i, j, p) { this._mutSets(i, sets => sets.map((s, k) => k === j ? { ...s, ...p } : s)); }
  // Aceita "90", "1:30" ou "1min30"
  parseSecs(v) {
    const s = String(v).trim().replace(',', ':');
    const m = s.match(/^(\d+)\s*[:m]\s*(\d{1,2})/i);
    if (m) return Math.max(0, Math.min(3600, parseInt(m[1], 10) * 60 + parseInt(m[2], 10)));
    const n = parseInt(s.replace(/\D/g, ''), 10);
    return isNaN(n) ? 0 : Math.max(0, Math.min(3600, n));
  }
  removeEx(i) { this._mutDraft(d => { d.exercises.splice(i, 1); }); }
  patchEx(i, p) { this._mutDraft(d => { Object.assign(d.exercises[i], p); }); }
  clampInt(v, min, max) { v = parseInt(v, 10); if (isNaN(v)) v = min; return Math.max(min, Math.min(max, v)); }

  // ---------------------------------------------------------------- HIIT
  _mutHiit(fn) { const h = { ...this.state.hiit, exercises: this.state.hiit.exercises.slice() }; fn(h); this.setState({ hiit: h }); }
  stepH(k, d, min, max) { this._mutHiit(h => { h[k] = Math.max(min, Math.min(max, h[k] + d)); }); }
  _hxName(e) { return typeof e === 'string' ? e : e.name; }
  _hxWork(e) { return typeof e === 'string' ? this.state.hiit.work : (e.work ?? this.state.hiit.work); }
  addHiitEx() { this._mutHiit(h => { h.exercises.push({ name: 'Exercício ' + (h.exercises.length + 1), work: h.work }); }); }
  removeHiitEx(i) { this._mutHiit(h => { h.exercises.splice(i, 1); }); }
  renameHiitEx(i, v) { this._mutHiit(h => { const e = h.exercises[i]; h.exercises[i] = typeof e === 'string' ? { name: v, work: h.work } : { ...e, name: v }; }); }
  setHiitExWork(i, secs) {
    const nv = Math.max(5, Math.min(600, secs));
    this._mutHiit(h => { const e = h.exercises[i]; h.exercises[i] = typeof e === 'string' ? { name: e, work: nv } : { ...e, work: nv }; });
  }
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
    seq.push({ phase: 'done', dur: 0, label: 'CONCLUÍDO' });
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

  // ================================================================ sessão
  // Progresso por exercício (prog[exId] = séries concluídas) permite pular um
  // exercício, fazer outro antes e voltar depois exatamente onde parou.
  _sets(ex) { return (ex && Array.isArray(ex.sets)) ? ex.sets : []; }
  _setAt(ex, i) { return this._sets(ex)[i] || { kind: 'N', value: 0, reps: 0 }; }
  _setBadge(ex, i) {
    const st = this._setAt(ex, i), k = K(st.kind);
    if (k.short) return k.short;
    return String(this._sets(ex).slice(0, i + 1).filter(x => !K(x.kind).short).length);
  }
  _setLabel(ex, i) { const k = K(this._setAt(ex, i).kind); return k.key === 'N' ? '' : k.label; }
  _workInit(ex, setIdx = 0) {
    const t = T(ex.type);
    return t.time ? { workLeft: this._setAt(ex, setIdx).value, workRun: false } : { workLeft: 0, workRun: false };
  }
  _exSummary(ex) {
    const t = T(ex.type), sets = this._sets(ex);
    if (!sets.length) return 'sem séries';
    const work = sets.filter(s => !isWarm(s.kind));
    const vals = [...new Set(work.map(s => s.value))];
    const reps = [...new Set(work.map(s => s.reps))];
    const nW = sets.length - work.length;
    const rng = a => a.length === 1 ? a[0] : Math.min(...a) + '–' + Math.max(...a);
    const base = t.time ? work.length + '× ' + rng(vals) + 's'
      : (ex.type === 'corpo' ? work.length + '×' + rng(reps) + ' · livre'
        : work.length + '×' + rng(reps) + ' · ' + rng(vals) + ' ' + t.unit);
    const extras = [];
    if (nW) extras.push(nW + ' aprox');
    const rir = work.filter(s => K(s.kind).key.startsWith('R'));
    if (rir.length) extras.push(rir.length + ' RIR');
    const drop = work.filter(s => s.kind === 'D');
    if (drop.length) extras.push(drop.length + ' drop');
    return base + (extras.length ? ' · ' + extras.join(' · ') : '');
  }

  _prog(s, ex) { return (s.prog && s.prog[ex.id]) || 0; }
  _exDone(s, ex) { return this._prog(s, ex) >= this._sets(ex).length; }
  _allDone(s, w) { return w.exercises.every(e => this._exDone(s, e)); }
  _curW() { const s = this.state.session; return this.state.workouts.find(x => x.id === s.wId); }
  _curEx() { const s = this.state.session; return this._curW().exercises[s.exIdx]; }
  _curSet() { const s = this.state.session; return this._setAt(this._curEx(), s.setIdx); }
  // Estado ao entrar num exercício: retoma na série em que parou
  _enter(s, w, idx) {
    const ex = w.exercises[idx];
    const n = this._sets(ex).length;
    const setIdx = Math.min(this._prog(s, ex), Math.max(0, n - 1));
    return { ...s, exIdx: idx, setIdx, resting: false, remaining: 0, ...this._workInit(ex, setIdx) };
  }
  // Próximo exercício ainda incompleto, começando depois de `from` e dando a volta
  _nextPending(s, w, from) {
    const n = w.exercises.length;
    for (let k = 1; k <= n; k++) {
      const idx = (from + k) % n;
      if (!this._exDone(s, w.exercises[idx])) return idx;
    }
    return -1;
  }

  // ---- desfazer -------------------------------------------------------
  _snap() {
    const s = this.state.session; if (!s) return;
    const { undo, ...rest } = s;
    const stack = (undo || []).concat([{ ...rest, prog: { ...(s.prog || {}) } }]);
    this.state.session = { ...s, undo: stack.slice(-30) };
  }
  canUndo() { const s = this.state.session; return !!(s && s.undo && s.undo.length); }
  undo() {
    const s = this.state.session;
    if (!s || !s.undo || !s.undo.length) return;
    const stack = s.undo.slice();
    const prev = stack.pop();
    const patch = { session: { ...prev, undo: stack } };
    // Desfazer a conclusão do treino também desfaz o registro no histórico
    if (s.done && this._finishTs) {
      patch.log = this.state.log.filter(l => l.ts !== this._finishTs);
      patch.workouts = this.state.workouts.map(w => w.id === s.wId ? { ...w, lastDone: this._prevLastDone ?? null } : w);
      if (this._addedDay) patch.history = this.state.history.filter(d => d !== this._addedDay);
      this._finishTs = null; this._addedDay = null;
      this._wake(true); this._msStart('session');
      this._startTicker(() => this._sessTick());
    }
    navigator.vibrate?.(25);
    this.setState(patch);
    this._resched();
  }

  startSession(id) {
    const w = this.state.workouts.find(x => x.id === id);
    if (!w || !w.exercises.length) return;
    this._clear();
    this.setState({ screen: 'session', sheet: null, session: {
      wId: id, exIdx: 0, setIdx: 0, resting: false, remaining: 0, elapsed: 0, done: false,
      started: false, paused: false, prog: {}, undo: [],
      ...this._workInit(w.exercises[0]),
    } });
  }
  sessBegin() {
    const s = this.state.session; if (!s || s.started) return;
    this._wake(true);
    this._msStart('session');
    this.beep(880, 0.18);
    this.setState({ session: { ...s, started: true, elapsed: 0 } });
    this._startTicker(() => this._sessTick());
  }
  sessEdit() {
    const s = this.state.session; if (!s || s.started) return;
    const id = s.wId;
    this.setState({ session: null });
    this.editWorkout(id);
  }
  _sessPause(on) {
    const s = this.state.session;
    if (!s || s.done || !s.started || !!s.paused === on) return;
    this.setState({ session: { ...s, paused: on } });
    this._resched();
  }
  _sessTick() {
    const s = this.state.session; if (!s || s.done || !s.started || s.paused) return;
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
      const rem = (s.workLeft ?? this._setAt(ex, s.setIdx).value) - 1;
      if (rem > 0) { this._pulse(rem); this.setState({ session: { ...s, elapsed, workLeft: rem } }); return; }
      this._pulseEnd();
      this._completeSet();
      return;
    }
    this.setState({ session: { ...s, elapsed } });
  }
  // Marca a série atual como feita e decide o que vem depois
  _completeSet() {
    const s = this.state.session; if (!s) return;
    this._snap();
    const st = this.state.session;
    const w = this._curW();
    const ex = w.exercises[st.exIdx];
    const prog = { ...(st.prog || {}) };
    prog[ex.id] = Math.max(prog[ex.id] || 0, st.setIdx + 1);
    let ns = { ...st, prog };

    if (this._allDone(ns, w)) { this._finish(ns); return; }

    const sets = this._sets(ex);
    if (prog[ex.id] < sets.length) {
      // ainda há séries neste exercício → descanso e avança a série
      ns = { ...ns, setIdx: prog[ex.id], resting: true, remaining: ex.rest, ...this._workInit(ex, prog[ex.id]) };
    } else {
      // exercício concluído → descansa e vai para o próximo pendente
      const nx = this._nextPending(ns, w, st.exIdx);
      const nex = w.exercises[nx];
      const nSet = Math.min(this._prog(ns, nex), Math.max(0, this._sets(nex).length - 1));
      ns = { ...ns, exIdx: nx, setIdx: nSet, resting: true, remaining: ex.rest, ...this._workInit(nex, nSet) };
    }
    this.setState({ session: ns });
    this._resched();
  }
  _finish(ns) {
    this._clear(); this._wake(false); this._msStop();
    this.beep(1046, 0.5, 0.24);
    const w = this.state.workouts.find(x => x.id === ns.wId);
    const ts = Date.now();
    const key = dayKey();
    this._finishTs = ts;
    this._prevLastDone = w.lastDone ?? null;
    this._addedDay = this.state.history.includes(key) ? null : key;
    this.setState({
      session: { ...ns, done: true },
      screen: this.state.screen === 'lock' ? 'session' : this.state.screen,
      sheet: null,
      workouts: this.state.workouts.map(x => x.id === ns.wId ? { ...x, lastDone: ts } : x),
      history: this._addedDay ? [...this.state.history, key] : this.state.history,
      log: [...this.state.log, {
        ts, wId: ns.wId, name: w.name, elapsed: ns.elapsed,
        exercises: w.exercises.map(e => {
          // registra a série valendo mais pesada (ignora aproximações)
          const work = this._sets(e).filter(x => !isWarm(x.kind));
          const top = work.reduce((a, x) => (a && a.value >= x.value) ? a : x, work[0]) || { value: 0, reps: 0 };
          return { name: e.name, type: e.type, sets: work.length, reps: top.reps, value: top.value };
        }),
      }],
    });
  }
  toggleWork() {
    const s = this.state.session; if (!s || s.resting) return;
    const ex = this._curEx(); if (!T(ex.type).time) return;
    const run = !s.workRun;
    this.setState({ session: { ...s, workRun: run } });
    this._resched();
    if (run) this.beep(680, 0.08);
  }
  sessPrimary() {
    const s = this.state.session; if (!s || s.done) return;
    if (s.resting) {
      this._snap();
      this.setState({ session: { ...this.state.session, resting: false, remaining: 0 } });
      this._resched();
      return;
    }
    this._completeSet();
  }
  // Pula o exercício atual sem marcá-lo como feito
  sessSkipEx() {
    const s = this.state.session; if (!s || s.done) return;
    const w = this._curW();
    const nx = this._nextPending(s, w, s.exIdx);
    if (nx < 0 || nx === s.exIdx) return;
    this._snap();
    this.setState({ session: this._enter(this.state.session, w, nx) });
    this._resched();
  }
  jumpTo(idx) {
    const s = this.state.session; if (!s || s.done) return;
    const w = this._curW();
    if (idx < 0 || idx >= w.exercises.length || idx === s.exIdx) { this.setState({ sheet: null }); return; }
    this._snap();
    this.setState({ session: this._enter(this.state.session, w, idx), sheet: null });
    this._resched();
  }
  sessPrev() {
    const s = this.state.session; if (!s || s.done || s.exIdx <= 0) return;
    this._snap();
    this.setState({ session: this._enter(this.state.session, this._curW(), s.exIdx - 1) });
    this._resched();
  }
  sessNextEx() {
    const s = this.state.session; if (!s || s.done) return;
    const w = this._curW();
    if (s.exIdx + 1 >= w.exercises.length) return;
    this._snap();
    this.setState({ session: this._enter(this.state.session, w, s.exIdx + 1) });
    this._resched();
  }
  // Reordena o exercício no treino (vale para as próximas sessões também)
  moveEx(idx, dir) {
    const s = this.state.session;
    const w = s ? this._curW() : null; if (!w) return;
    const j = idx + dir;
    if (j < 0 || j >= w.exercises.length) return;
    const list = w.exercises.slice();
    const [it] = list.splice(idx, 1);
    list.splice(j, 0, it);
    const patch = { workouts: this.state.workouts.map(x => x.id === w.id ? { ...x, exercises: list } : x) };
    // mantém o ponteiro no mesmo exercício depois da troca
    if (s.exIdx === idx) patch.session = { ...s, exIdx: j };
    else if (s.exIdx === j) patch.session = { ...s, exIdx: idx };
    this.setState(patch);
  }
  restAdj(d) {
    const s = this.state.session; if (!s || !s.resting) return;
    this.setState({ session: { ...s, remaining: Math.max(1, s.remaining + d) } });
    this._resched();
  }
  // Ajustes ao vivo: gravam na série em execução (valem para as próximas vezes)
  _liveEdit(fn) {
    const s = this.state.session; if (!s) return;
    const ws = this.state.workouts.map(w => w.id !== s.wId ? w : {
      ...w,
      exercises: w.exercises.map((e, i) => i !== s.exIdx ? e : {
        ...e, sets: this._sets(e).map((st, j) => j === s.setIdx ? fn({ ...st }) : st),
      }),
    });
    this.setState({ workouts: ws });
  }
  liveVal(d) {
    const ex = this._curEx();
    const step = (ex.type === 'maquina' || ex.type === 'elastico') ? 1 : 2.5;
    this._liveEdit(st => ({ ...st, value: Math.max(0, +(st.value + d * step).toFixed(1)) }));
  }
  liveRep(d) {
    const ex = this._curEx(), t = T(ex.type);
    if (t.time) {
      this._liveEdit(st => ({ ...st, value: Math.max(5, st.value + d * 5) }));
      const s = this.state.session;
      if (!s.workRun) this.setState({ session: { ...s, workLeft: this._curSet().value } });
    } else {
      this._liveEdit(st => ({ ...st, reps: Math.max(1, Math.min(100, st.reps + d)) }));
    }
  }
  quitSession() { this._clear(); this._wake(false); this._msStop(); this.setState({ screen: 'home', session: null, sheet: null }); }

  // ------------------------------------------------- Media Session (bloqueio)
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
      set('play', () => this._sessPause(false)); set('pause', () => this._sessPause(true));
      set('nexttrack', () => this.sessPrimary()); set('previoustrack', () => this.undo());
    }
  }
  _msUpdate(title, artist, dur, pos, playing = true, album) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title, artist: artist || 'FITOS', album: album || 'FITOS',
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
    if (S.session && !S.session.done && S.session.started) {
      const s = S.session;
      const w = S.workouts.find(x => x.id === s.wId);
      const ex = w.exercises[s.exIdx], t = T(ex.type);
      const total = this._sets(ex).length;
      const cur = this._setAt(ex, s.setIdx);
      const tipo = this._setLabel(ex, s.setIdx);
      const serie = 'SÉRIE ' + (s.setIdx + 1) + '/' + total + (tipo ? ' · ' + tipo : '');
      const carga = t.time ? cur.value + 'S' : (ex.type === 'corpo' ? 'LIVRE' : cur.value + ' ' + t.unit.toUpperCase());
      const feitos = w.exercises.filter(e => this._exDone(s, e)).length;
      const album = w.name + ' · EX ' + (s.exIdx + 1) + '/' + w.exercises.length
        + ' · ' + feitos + ' OK · DESC ' + ex.rest + 'S';
      const pausa = s.paused ? '⏸ PAUSADO · ' : '';
      if (s.resting) {
        this._msUpdate(pausa + 'DESCANSO ' + clock(s.remaining), ex.name.toUpperCase() + ' · ' + serie + ' A SEGUIR', ex.rest, ex.rest - s.remaining, !s.paused, album);
      } else if (t.time) {
        const wl = s.workLeft ?? cur.value;
        this._msUpdate(pausa + clock(wl) + ' · ' + serie, ex.name.toUpperCase() + ' · ' + carga, cur.value, cur.value - wl, s.workRun && !s.paused, album);
      } else {
        this._msUpdate(pausa + serie, ex.name.toUpperCase() + ' · ' + cur.reps + ' REPS · ' + carga, null, null, !s.paused, album);
      }
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
    const map = new Map();
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
    const W = 320, H = 110, P = 12;
    const vs = pts.map(p => p.v);
    let min = Math.min(...vs), max = Math.max(...vs);
    if (min === max) { min -= 1; max += 1; }
    const x = i => P + (W - 2 * P) * (pts.length === 1 ? 0.5 : i / (pts.length - 1));
    const y = v => H - P - (H - 2 * P) * ((v - min) / (max - min));
    const line = pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');
    const dots = pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="3" fill="var(--ink)"/>`).join('');
    const last = pts[pts.length - 1];
    const grid = [0, .5, 1].map(f => `<line x1="${P}" x2="${W - P}" y1="${(P + (H - 2 * P) * f).toFixed(1)}" y2="${(P + (H - 2 * P) * f).toFixed(1)}" stroke="var(--line)" stroke-dasharray="2 4"/>`).join('');
    return `
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block;overflow:visible">
        ${grid}
        <path d="${line}" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        ${dots}
        <circle cx="${x(pts.length - 1).toFixed(1)}" cy="${y(last.v).toFixed(1)}" r="5" fill="var(--accent)"/>
      </svg>
      <div class="row-between tiny" style="padding:6px 2px 0"><span>MÍN ${min}</span><span>MÁX ${max}</span></div>`;
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
        try { d = JSON.parse(txt); } catch (e) { alert('Arquivo inválido: não é JSON.'); return; }
        if (!d || !Array.isArray(d.workouts)) { alert('Arquivo inválido: backup FITOS não reconhecido.'); return; }
        if (!confirm('Importar backup? Os dados atuais deste aparelho serão substituídos.')) return;
        localStorage.setItem(LS_KEY, JSON.stringify(d));
        location.reload();
      });
    };
    inp.click();
  }
  wipeData() {
    if (!confirm('Apagar todos os dados? Treinos, histórico e ajustes serão perdidos.')) return;
    localStorage.removeItem(LS_KEY);
    location.reload();
  }

  // ---------------------------------------------------------------- eventos
  dispatch(d) {
    const i = d.i !== undefined ? parseInt(d.i, 10) : undefined;
    const j = d.j !== undefined ? parseInt(d.j, 10) : undefined;
    const map = {
      goHome: () => this.go('home'),
      goList: () => this.go('list'),
      goHiit: () => { this._clear(); this.setState({ screen: 'hiit', hiitRun: null, sheet: null }); },
      goPerfil: () => this.go('perfil'),
      goEvo: () => this.setState({ screen: 'evo' }),
      enterLock: () => this.setState({ screen: 'lock', sheet: null }),
      exitLock: () => this.setState({ screen: 'session' }),
      openW: () => this.startSession(d.id),
      editW: () => this.editWorkout(d.id),
      newWorkout: () => this.newWorkout(),
      cancelEdit: () => this.go('list'),
      saveWorkout: () => this.saveWorkout(),
      delW: () => this.deleteWorkout(d.id),
      addExercise: () => this.addExercise(),
      exToggle: () => this.toggleEx(i),
      exRemove: () => this.removeEx(i),
      exType: () => this.patchEx(i, { type: d.key }),
      exDup: () => this.dupExercise(i),
      exUp: () => this.moveDraftEx(i, -1),
      exDown: () => this.moveDraftEx(i, 1),
      setAdd: () => this.addSet(i),
      setDel: () => this.delSet(i, j),
      setPick: () => this.pickSet(i, j),
      setKind: () => this.setKind(i, j, d.key),
      restUp: () => { const e = this.state.draft.exercises[i]; this.patchEx(i, { rest: Math.min(600, e.rest + 15) }); },
      restDown: () => { const e = this.state.draft.exercises[i]; this.patchEx(i, { rest: Math.max(0, e.rest - 15) }); },
      quitSession: () => this.quitSession(),
      sessBegin: () => this.sessBegin(),
      sessEdit: () => this.sessEdit(),
      sessPauseToggle: () => this._sessPause(!this.state.session?.paused),
      sessUndo: () => this.undo(),
      sessMap: () => this.setState({ sheet: this.state.sheet === 'map' ? null : 'map' }),
      sheetClose: () => this.setState({ sheet: null }),
      noop: () => {},   // absorve cliques no fundo da folha (não fecha)
      jumpTo: () => this.jumpTo(i),
      mvUp: () => this.moveEx(i, -1),
      mvDown: () => this.moveEx(i, 1),
      liveValUp: () => this.liveVal(1),   liveValDown: () => this.liveVal(-1),
      liveRepUp: () => this.liveRep(1),   liveRepDown: () => this.liveRep(-1),
      sessPrev: () => this.sessPrev(),
      sessNextEx: () => this.sessNextEx(),
      sessPrimary: () => this.sessPrimary(),
      sessSkip: () => this.sessSkipEx(),
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
      evoPick: () => this.setState({ evoSel: d.key }),
      exportData: () => this.exportData(),
      importData: () => this.importData(),
      setTheme: () => this.setState({ settings: { ...this.state.settings, theme: d.key } }),
      togDots: () => this.setState({ settings: { ...this.state.settings, dots: !this.state.settings.dots } }),
      togSound: () => this.setState({ settings: { ...this.state.settings, sound: !this.state.settings.sound } }),
      wipeData: () => this.wipeData(),
    };
    map[d.act]?.();
  }
  onChange(chg, el) {
    const i = el.dataset.i !== undefined ? parseInt(el.dataset.i, 10) : undefined;
    const j = el.dataset.j !== undefined ? parseInt(el.dataset.j, 10) : undefined;
    const v = el.value;
    if (chg === 'draftName') this._mutDraft(dd => { dd.name = v; });
    else if (chg === 'exName') this.patchEx(i, { name: v });
    else if (chg === 'exNotes') this.patchEx(i, { notes: v });
    else if (chg === 'exRest') this.patchEx(i, { rest: this.parseSecs(v) });
    else if (chg === 'setVal') { let n = parseFloat(String(v).replace(',', '.')); if (isNaN(n)) n = 0; this.patchSet(i, j, { value: Math.max(0, n) }); }
    else if (chg === 'setReps') this.patchSet(i, j, { reps: this.clampInt(v, 1, 100) });
    else if (chg === 'setDur') this.patchSet(i, j, { value: this.clampInt(v, 1, 3600) });
    else if (chg === 'liveVal') { let n = parseFloat(String(v).replace(',', '.')); if (isNaN(n)) n = 0; this._liveEdit(e => ({ ...e, value: Math.max(0, n) })); }
    else if (chg === 'liveRep') {
      const ex = this._curEx(), t = T(ex.type);
      if (t.time) {
        const n = this.clampInt(v, 5, 3600);
        this._liveEdit(e => ({ ...e, value: n }));
        const s = this.state.session;
        if (!s.workRun) this.setState({ session: { ...s, workLeft: n } });
      } else {
        this._liveEdit(e => ({ ...e, reps: this.clampInt(v, 1, 100) }));
      }
    }
    else if (chg === 'hPrep') this._mutHiit(h => { h.prepare = Math.min(120, this.parseSecs(v)); });
    else if (chg === 'hWork') this._mutHiit(h => { h.work = Math.max(5, Math.min(600, this.parseSecs(v))); });
    else if (chg === 'hRest') this._mutHiit(h => { h.rest = Math.min(300, this.parseSecs(v)); });
    else if (chg === 'hCycles') this._mutHiit(h => { h.cycles = this.clampInt(v, 1, 20); });
    else if (chg === 'hxWork') this.setHiitExWork(i, this.parseSecs(v));
    else if (chg === 'hiitName') this.renameHiitEx(i, v);
    else if (chg === 'profileName') this.setState({ profile: { ...this.state.profile, name: v.trim().toUpperCase() || 'ATLETA' } });
  }

  // ================================================================ render
  _inputFocused() {
    const ae = document.activeElement;
    return !!(ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA') && this.root.contains(ae));
  }
  // matriz de pontos (respeita o ajuste do perfil)
  dm(text, h, opts = {}) {
    if (this.state.settings.dots === false) {
      return `<span style="font-size:${Math.round(h * .92)}px;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums">${esc(text)}</span>`;
    }
    return dotSvg(text, { h, ...opts });
  }
  render() {
    if (this._inputFocused()) { this._renderPending = true; return; }
    const S = this.state, scr = S.screen;
    const scrolls = {};
    this.root.querySelectorAll('[data-scroll]').forEach(el => { scrolls[el.dataset.scroll] = el.scrollTop; });

    const showNav = scr === 'home' || scr === 'list' || scr === 'perfil' || (scr === 'hiit' && !S.hiitRun);
    let html = '';
    if (scr === 'home') html = this.rHome();
    else if (scr === 'list') html = this.rList();
    else if (scr === 'editor') html = this.rEditor();
    else if (scr === 'session' || scr === 'lock') html = this.rSession();
    else if (scr === 'hiit') html = this.rHiit();
    else if (scr === 'perfil') html = this.rPerfil();
    else if (scr === 'evo') html = this.rEvo();

    this.root.innerHTML = `
      <div style="flex:1;min-height:0;position:relative">${html}</div>
      ${showNav ? this.rNav() : ''}
      <div class="homebar"><i></i></div>
      ${scr === 'lock' ? this.rLock() : ''}
      ${S.sheet === 'map' && S.session ? this.rMapSheet() : ''}
    `;
    const theme = S.settings.theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('frame')?.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', S.settings.theme === 'light' ? '#ececec' : '#000000');

    this.root.querySelectorAll('[data-scroll]').forEach(el => {
      if (scrolls[el.dataset.scroll] !== undefined) el.scrollTop = scrolls[el.dataset.scroll];
    });
    this._msSync();
  }

  // ---------------------------------------------------------------- comuns
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
    if (!set.has(dayKey(d))) d = new Date(d.getTime() - DAY);
    let n = 0;
    while (set.has(dayKey(d))) { n++; d = new Date(d.getTime() - DAY); }
    return n;
  }
  _wStats(w) {
    const sets = w.exercises.reduce((a, e) => a + this._sets(e).length, 0);
    return { ex: w.exercises.length, sets, min: Math.max(15, Math.round(sets * 2.4)) };
  }
  _topbar({ back, title, sub, right = '' }) {
    return `
      <div class="topbar">
        ${back ? `<div data-act="${back}" class="icon-btn">${I.back}</div>` : ''}
        <div class="grow">
          ${sub ? `<div class="label">${esc(sub)}</div>` : ''}
          <div class="h2 ellip">${esc(title)}</div>
        </div>
        ${right}
      </div>`;
  }

  // ---------------------------------------------------------------- home
  rHome() {
    const S = this.state, now = new Date();
    const prefixo = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'][now.getDay()];
    const today = S.workouts.find(w => noAcc(w.name).startsWith(prefixo)) || S.workouts[0];
    const st = today ? this._wStats(today) : null;
    const rows = S.workouts.map((w, i) => `
      <div data-act="openW" data-id="${w.id}" class="item">
        <span class="label" style="width:22px">${pad(i + 1)}</span>
        <div class="grow">
          <div class="h3 ellip">${esc(w.name)}</div>
          <div class="tiny">${w.exercises.length} exercícios · ${this._relLabel(w.lastDone)}</div>
        </div>
        <span class="muted">${I.fwd}</span>
      </div>`).join('');
    return `
      <div class="scr">
        <div class="topbar">
          <div class="grow">
            ${this.dm('FITOS', 13)}
            <div class="h1" style="margin-top:8px">${esc(S.profile.name)}</div>
          </div>
          <div data-act="goPerfil" class="icon-btn">${I.user}</div>
        </div>
        <div data-scroll="home" class="scr-body">
          ${today ? `
          <div class="card">
            <div class="row-between">
              <span class="row gap-s"><span class="dot-red"></span><span class="label label-ink">Treino de hoje</span></span>
              <span class="label">${DIAS[now.getDay()]} ${pad(now.getDate())}</span>
            </div>
            <div class="h1" style="margin:14px 0 6px">${esc(today.name)}</div>
            <div class="small">${st.ex} exercícios · ${st.sets} séries · ~${st.min} min</div>
            <div data-act="openW" data-id="${today.id}" class="btn btn-primary btn-lg btn-block" style="margin-top:16px">Iniciar treino</div>
          </div>` : `
          <div class="card center col" style="gap:12px;padding:30px 16px">
            <div class="small">Nenhum treino cadastrado.</div>
            <div data-act="newWorkout" class="btn btn-primary">Criar treino</div>
          </div>`}

          <div class="row gap-m">
            <div class="tile grow">
              <div class="label">Sequência</div>
              <div style="margin-top:10px">${this.dm(pad(this._streak()), 30, { ghost: true })}</div>
              <div class="tiny" style="margin-top:6px">DIAS SEGUIDOS</div>
            </div>
            <div class="tile grow">
              <div class="label">Concluídos</div>
              <div style="margin-top:10px">${this.dm(pad(S.history.length), 30, { ghost: true })}</div>
              <div class="tiny" style="margin-top:6px">DIAS TREINADOS</div>
            </div>
          </div>

          <div data-act="goHiit" class="tile row gap-m">
            <div class="icon-btn">${I.timer}</div>
            <div class="grow">
              <div class="h3">Timer HIIT / Tabata</div>
              <div class="tiny">Intervalado configurável</div>
            </div>
            <span class="muted">${I.fwd}</span>
          </div>

          <div class="row-between" style="margin-top:4px">
            <span class="label">Meus treinos</span>
            <span data-act="goList" class="label" style="text-decoration:underline">Ver todos</span>
          </div>
          <div>${rows}</div>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- lista
  rList() {
    const rows = this.state.workouts.map((w, i) => {
      const st = this._wStats(w);
      return `
      <div class="card card-tight">
        <div class="row gap-m">
          <span class="label" style="width:22px">${pad(i + 1)}</span>
          <div class="grow">
            <div class="h3 ellip">${esc(w.name)}</div>
            <div class="tiny">${st.ex} exercícios · ${st.sets} séries · ${this._relLabel(w.lastDone)}</div>
          </div>
          <div data-act="delW" data-id="${w.id}" class="icon-btn sm" style="color:var(--accent)">${I.x}</div>
        </div>
        <div class="row gap-s" style="margin-top:12px">
          <div data-act="editW" data-id="${w.id}" class="btn btn-ghost btn-sm grow">Editar</div>
          <div data-act="openW" data-id="${w.id}" class="btn btn-primary btn-sm grow">Iniciar</div>
        </div>
      </div>`;
    }).join('');
    return `
      <div class="scr">
        ${this._topbar({ title: 'Meus treinos', sub: 'FITOS',
          right: `<div data-act="newWorkout" class="icon-btn on">${I.plus}</div>` })}
        <div data-scroll="list" class="scr-body">
          ${rows || '<div class="small center" style="padding:40px 0">Nenhum treino. Toque em + para criar.</div>'}
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- editor
  _setsTable(ex, i, t) {
    const hasLoad = !t.time && ex.type !== 'corpo';
    const rows = this._sets(ex).map((st, j) => {
      const k = K(st.kind);
      const picker = !st._pick ? '' : `
        <div class="row" style="flex-wrap:wrap;gap:5px;padding:2px 0 10px">
          ${KINDS.map(kk => `<span data-act="setKind" data-i="${i}" data-j="${j}" data-key="${kk.key}" class="chip ${kk.key === st.kind ? 'on' : 'chip-outline'}" title="${kk.hint}">${kk.short || '1'} · ${kk.label}</span>`).join('')}
        </div>`;
      return `
        <div style="border-top:1px solid var(--line)">
          <div class="row gap-s" style="padding:7px 0">
            <span data-act="setPick" data-i="${i}" data-j="${j}" class="icon-btn sm" style="color:${kindColor(st.kind)};${st._pick ? 'outline:1px solid ' + kindColor(st.kind) + ';outline-offset:-1px' : ''}" title="${k.label}">
              <b style="font-size:12px">${this._setBadge(ex, j)}</b>
            </span>
            ${hasLoad ? `<div class="field grow" style="padding:6px 8px"><input inputmode="decimal" value="${st.value}" data-chg="setVal" data-i="${i}" data-j="${j}" style="text-align:center"></div>` : ''}
            <div class="field grow" style="padding:6px 8px"><input inputmode="numeric" value="${t.time ? st.value : st.reps}" data-chg="${t.time ? 'setDur' : 'setReps'}" data-i="${i}" data-j="${j}" style="text-align:center"></div>
            <span data-act="setDel" data-i="${i}" data-j="${j}" class="icon-btn sm" style="background:transparent;color:var(--ink-3)">${I.x}</span>
          </div>
          ${picker}
        </div>`;
    }).join('');
    return `
      <div>
        <div class="row-between" style="margin-bottom:6px">
          <span class="label">Séries</span>
          <span class="tiny">toque na sigla p/ mudar o tipo</span>
        </div>
        <div class="row gap-s tiny" style="padding:0 2px 2px">
          <span style="width:30px;text-align:center">#</span>
          ${hasLoad ? `<span class="grow" style="text-align:center">${t.unit.toUpperCase()}</span>` : ''}
          <span class="grow" style="text-align:center">${t.time ? 'SEG' : 'REPS'}</span>
          <span style="width:30px"></span>
        </div>
        ${rows}
        <div data-act="setAdd" data-i="${i}" class="btn btn-ghost btn-sm btn-block" style="margin-top:10px">${I.plus} Adicionar série</div>
      </div>`;
  }

  rEditor() {
    const d = this.state.draft; if (!d) return '';
    const cards = d.exercises.map((ex, i) => {
      const t = T(ex.type), open = !!ex._open;
      const chips = TYPES.map(tp => `<span data-act="exType" data-i="${i}" data-key="${tp.key}" class="chip ${tp.key === ex.type ? 'on' : 'chip-outline'}">${tp.label}</span>`).join('');
      const body = !open ? '' : `
        <div class="col gap-m" style="margin-top:14px">
          <div class="field"><input type="text" value="${esc(ex.name)}" data-chg="exName" data-i="${i}"></div>
          <div>
            <div class="label" style="margin-bottom:6px">Notas (aparecem no treino)</div>
            <div class="field"><textarea rows="2" data-chg="exNotes" data-i="${i}" placeholder="Ex.: pegada fechada, 3s na descida…">${esc(ex.notes || '')}</textarea></div>
          </div>
          <div>
            <div class="label" style="margin-bottom:7px">Tipo de carga</div>
            <div class="row" style="flex-wrap:wrap;gap:5px">${chips}</div>
          </div>
          <div>
            <div class="label" style="margin-bottom:7px">Descanso entre séries</div>
            <div class="stepper">
              <span data-act="restDown" data-i="${i}" class="sbtn">–</span>
              <input inputmode="numeric" value="${clock(ex.rest)}" data-chg="exRest" data-i="${i}">
              <span data-act="restUp" data-i="${i}" class="sbtn">+</span>
            </div>
          </div>
          ${this._setsTable(ex, i, t)}
          <div class="row gap-s">
            <div data-act="exDup" data-i="${i}" class="btn btn-ghost btn-sm grow">${I.copy} Duplicar</div>
            <div data-act="exRemove" data-i="${i}" class="btn btn-danger btn-sm grow">${I.x} Remover</div>
          </div>
        </div>`;
      return `
        <div class="card ${open ? '' : 'card-tight'}">
          <div class="row gap-m">
            <div data-act="exToggle" data-i="${i}" class="row gap-m grow" style="cursor:pointer">
              <span class="label" style="width:22px">${pad(i + 1)}</span>
              <div class="grow">
                <div class="h3 ellip">${esc(ex.name)}</div>
                <div class="tiny">${this._exSummary(ex)}</div>
              </div>
            </div>
            <div class="col" style="gap:3px">
              <span data-act="exUp" data-i="${i}" class="icon-btn sm ${i === 0 ? 'off' : ''}">${I.up}</span>
              <span data-act="exDown" data-i="${i}" class="icon-btn sm ${i === d.exercises.length - 1 ? 'off' : ''}">${I.down}</span>
            </div>
          </div>
          ${body}
        </div>`;
    }).join('');
    return `
      <div class="scr">
        ${this._topbar({ back: 'cancelEdit', title: d.id ? 'Editar treino' : 'Novo treino', sub: 'FITOS',
          right: `<div data-act="saveWorkout" class="btn btn-primary btn-sm">Salvar</div>` })}
        <div data-scroll="editor" class="scr-body">
          <div>
            <div class="label" style="margin-bottom:6px">Nome do treino</div>
            <div class="field"><input type="text" value="${esc(d.name)}" data-chg="draftName" style="font-size:17px;font-weight:500"></div>
          </div>
          <div class="row-between"><span class="label">Exercícios</span><span class="label">${pad(d.exercises.length)}</span></div>
          ${cards}
          <div data-act="addExercise" class="btn btn-ghost btn-block">${I.plus} Adicionar exercício</div>
          ${d.id ? `<div data-act="delW" data-id="${d.id}" class="btn btn-danger btn-block">Excluir treino</div>` : ''}
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- sessão
  _sessVals() {
    const S = this.state, s = S.session;
    if (!s) return null;
    const w = S.workouts.find(x => x.id === s.wId);
    const feitos = w.exercises.filter(e => this._exDone(s, e)).length;
    const V = {
      w, s, name: w.name,
      exTotal: w.exercises.length,
      feitos,
      totalClock: clock(s.elapsed),
      doneMeta: w.exercises.length + ' exercícios · ' + w.exercises.reduce((a, e) => a + this._sets(e).length, 0) + ' séries',
      canUndo: this.canUndo(),
    };
    if (!s.done) {
      const ex = w.exercises[s.exIdx], t = T(ex.type);
      const sets = this._sets(ex), total = sets.length;
      const cur = this._setAt(ex, s.setIdx);
      const prog = this._prog(s, ex);
      const wl = s.workLeft ?? cur.value;
      V.ex = ex; V.t = t; V.cur = cur;
      V.notes = (ex.notes || '').trim();
      V.exNum = pad(s.exIdx + 1) + '/' + pad(w.exercises.length);
      V.exName = ex.name;
      V.setNum = pad(s.setIdx + 1); V.setTotal = pad(total);
      V.setType = this._setLabel(ex, s.setIdx);
      V.setColor = kindColor(cur.kind);
      V.restS = ex.rest;
      V.paused = !!s.paused;
      V.target = t.time ? cur.value + 's'
        : (ex.type === 'corpo' ? cur.reps + ' reps · peso livre' : cur.reps + ' reps · ' + cur.value + ' ' + t.unit);
      V.sets = sets.map((st, k) => ({
        color: kindColor(st.kind),
        state: k < prog ? 'done' : (k === s.setIdx ? 'now' : 'todo'),
      }));
      V.resting = s.resting;
      V.timed = t.time && !s.resting;
      V.phase = s.paused ? 'PAUSADO' : (s.resting ? 'DESCANSO' : (t.time ? (s.workRun ? 'CRONÔMETRO' : 'PRONTO?') : 'EM SÉRIE'));
      if (s.resting) { V.big = clock(s.remaining); V.ghost = '88:88'; V.unit = 'DESCANSO'; }
      else if (t.time) { V.big = clock(wl); V.ghost = '88:88'; V.unit = s.workRun ? 'CRONOMETRANDO' : 'ALVO ' + cur.value + 'S'; }
      else { V.big = pad(cur.reps); V.ghost = '88'; V.unit = ex.type === 'corpo' ? 'REPETIÇÕES · LIVRE' : 'REPETIÇÕES · ' + cur.value + ' ' + t.unit.toUpperCase(); }
      V.workBtn = s.workRun ? 'Pausar cronômetro' : (wl < cur.value ? 'Retomar' : 'Iniciar cronômetro');
      V.primary = s.resting ? 'Pular descanso' : 'Série OK';
      V.pending = w.exercises
        .map((e, k) => ({ e, k }))
        .filter(({ e, k }) => k !== s.exIdx && !this._exDone(s, e))
        .map(({ e, k }) => ({ num: pad(k + 1), name: e.name, summary: this._exSummary(e), idx: k }));
    }
    return V;
  }

  _miniAdjRow(V) {
    const ex = V.ex, t = V.t;
    const cell = (label, down, up, chg, val, mode) => `
      <div class="col grow" style="gap:6px">
        <span class="tiny" style="text-align:center">${label}</span>
        <div class="stepper">
          <span data-act="${down}" class="sbtn">–</span>
          <input inputmode="${mode}" value="${val}" data-chg="${chg}">
          <span data-act="${up}" class="sbtn">+</span>
        </div>
      </div>`;
    const cells = [];
    if (!t.time && ex.type !== 'corpo') cells.push(cell(t.unit.toUpperCase(), 'liveValDown', 'liveValUp', 'liveVal', V.cur.value, 'decimal'));
    if (t.time) { if (!V.s.workRun) cells.push(cell('SEGUNDOS', 'liveRepDown', 'liveRepUp', 'liveRep', V.cur.value, 'numeric')); }
    else cells.push(cell('REPS', 'liveRepDown', 'liveRepUp', 'liveRep', V.cur.reps, 'numeric'));
    return cells.length ? `<div class="row gap-m">${cells.join('')}</div>` : '';
  }

  rSession() {
    const V = this._sessVals(); if (!V) return '';
    const s = V.s;

    // --- antes de começar ---
    if (!s.started) {
      const st = this._wStats(V.w);
      const rows = V.w.exercises.map((e, i) => `
        <div class="item">
          <span class="label" style="width:22px">${pad(i + 1)}</span>
          <div class="grow"><div class="h3 ellip">${esc(e.name)}</div><div class="tiny">${this._exSummary(e)}</div></div>
        </div>`).join('');
      return `
        <div class="scr">
          ${this._topbar({ back: 'quitSession', title: V.name, sub: 'Pronto para começar' })}
          <div data-scroll="prestart" class="scr-body">
            <div class="card">
              <div class="row gap-m">
                <div class="grow">
                  <div class="label">Resumo</div>
                  <div class="h2" style="margin-top:6px">${st.ex} exercícios</div>
                  <div class="small">${st.sets} séries · ~${st.min} min</div>
                </div>
                ${this.dm(pad(st.ex), 40, { ghost: true })}
              </div>
              <div data-act="sessBegin" class="btn btn-primary btn-lg btn-block" style="margin-top:16px">Iniciar treino</div>
              <div data-act="sessEdit" class="btn btn-ghost btn-block" style="margin-top:8px">Editar treino</div>
            </div>
            <div class="label">Exercícios</div>
            <div>${rows}</div>
          </div>
        </div>`;
    }

    // --- concluído ---
    if (s.done) {
      return `
        <div class="scr">
          ${this._topbar({ title: V.name, sub: 'Treino concluído',
            right: V.canUndo ? `<div data-act="sessUndo" class="icon-btn" title="Desfazer">${I.undo}</div>` : '' })}
          <div class="scr-body center" style="justify-content:center;text-align:center">
            <div class="icon-btn lg on" style="margin:0 auto">${I.check}</div>
            <div style="margin:6px auto 0">${this.dm(V.totalClock, 52, { ghost: true })}</div>
            <div class="small">${V.doneMeta}</div>
            <div data-act="quitSession" class="btn btn-primary btn-lg btn-block" style="margin-top:20px">Concluir</div>
            ${V.canUndo ? '<div data-act="sessUndo" class="btn btn-ghost btn-block" style="margin-top:8px">Desfazer última ação</div>' : ''}
          </div>
        </div>`;
    }

    // --- em execução ---
    const bar = V.sets.map(x => `<i style="background:${x.state === 'todo' ? 'var(--line)' : x.color};${x.state === 'now' ? 'opacity:.45' : ''}"></i>`).join('');
    const pending = V.pending.length ? `
      <div>
        <div class="row-between" style="margin-bottom:4px">
          <span class="label">A seguir · ${V.pending.length}</span>
          <span data-act="sessMap" class="label" style="text-decoration:underline">Reordenar</span>
        </div>
        <div data-scroll="upcoming" style="max-height:86px;overflow-y:auto">
          ${V.pending.map(u => `
            <div data-act="jumpTo" data-i="${u.idx}" class="row gap-s tiny" style="padding:4px 0">
              <span style="width:20px">${u.num}</span>
              <span class="grow ellip strong">${esc(u.name)}</span>
              <span>${u.summary}</span>
            </div>`).join('')}
        </div>
      </div>` : '<div class="label center" style="padding:6px 0">Último exercício pendente</div>';

    return `
      <div class="scr">
        <div class="topbar">
          <div data-act="quitSession" class="icon-btn">${I.back}</div>
          <div class="grow">
            <div class="label ellip">${esc(V.name)}</div>
            <div class="small">Exerc ${V.exNum} · ${V.feitos}/${V.exTotal} feitos</div>
          </div>
          <div data-act="sessUndo" class="icon-btn ${V.canUndo ? '' : 'off'}" title="Desfazer">${I.undo}</div>
          <div data-act="sessMap" class="icon-btn" title="Exercícios">${I.list}</div>
          <div data-act="enterLock" class="icon-btn" title="Tela de bloqueio">${I.lock}</div>
        </div>

        <div class="scr-body" style="gap:11px">
          <div class="row-between" style="align-items:flex-start;gap:8px">
            <div class="h1 grow" style="line-height:1.15">${esc(V.exName)}</div>
            <span class="row gap-s" style="flex:none;padding-top:3px">
              <span data-act="sessPrev" class="icon-btn sm ${s.exIdx === 0 ? 'off' : ''}">${I.back}</span>
              <span data-act="sessPauseToggle" class="icon-btn sm ${V.paused ? 'acc' : ''}">${V.paused ? I.play : I.pause}</span>
              <span data-act="sessNextEx" class="icon-btn sm ${s.exIdx + 1 >= V.exTotal ? 'off' : ''}">${I.fwd}</span>
            </span>
          </div>

          <div class="bar">${bar}</div>
          <div class="row-between">
            <span class="chip chip-outline" style="color:${V.setColor};border-color:${V.setColor}">Série ${V.setNum}/${V.setTotal}${V.setType ? ' · ' + V.setType : ''}</span>
            <span class="tiny">Alvo ${V.target} · desc ${clock(V.restS)}</span>
          </div>
          ${V.notes ? `<div class="tile small" style="border-left:3px solid var(--accent)">${esc(V.notes)}</div>` : ''}

          <div class="col center" style="flex:1;justify-content:center;gap:12px;min-height:0">
            <span class="label" style="color:${V.paused ? 'var(--accent)' : 'var(--ink-2)'}">${V.phase}</span>
            ${this.dm(V.big, 76, { ghost: true })}
            <span class="tiny">${V.unit}</span>
            ${V.resting ? `
              <div class="row gap-s center" style="margin-top:2px">
                <span data-act="restMinus" class="btn btn-ghost btn-sm">−15s</span>
                <span data-act="restPlus" class="btn btn-ghost btn-sm">+15s</span>
              </div>` : `<div style="width:100%;max-width:300px">${this._miniAdjRow(V)}</div>`}
            ${V.timed ? `<div data-act="toggleWork" class="btn btn-ghost btn-sm">${V.workBtn}</div>` : ''}
          </div>

          ${pending}
          <div class="row gap-s">
            <div data-act="sessSkip" class="btn btn-ghost grow">Pular</div>
            <div data-act="sessPrimary" class="btn btn-primary" style="flex:2">${V.primary}</div>
          </div>
        </div>
      </div>`;
  }

  // ------------------------------------------------- folha: mapa do treino
  rMapSheet() {
    const s = this.state.session; if (!s) return '';
    const w = this._curW();
    const rows = w.exercises.map((e, i) => {
      const done = this._exDone(s, e);
      const now = i === s.exIdx;
      const prog = this._prog(s, e), total = this._sets(e).length;
      return `
        <div class="row gap-s ${done ? 'ex-done' : ''} ${now ? 'ex-now' : ''}" style="padding:10px 8px;border-bottom:1px solid var(--line)">
          <div data-act="jumpTo" data-i="${i}" class="row gap-s grow" style="cursor:pointer">
            <span class="icon-btn sm ${now ? 'on' : ''}" style="${done && !now ? 'color:var(--accent)' : ''}">
              ${done ? I.check : `<b style="font-size:11px">${pad(i + 1)}</b>`}
            </span>
            <div class="grow">
              <div class="h3 ellip">${esc(e.name)}</div>
              <div class="tiny">${prog}/${total} séries · ${this._exSummary(e)}</div>
            </div>
          </div>
          <span data-act="mvUp" data-i="${i}" class="icon-btn sm ${i === 0 ? 'off' : ''}">${I.up}</span>
          <span data-act="mvDown" data-i="${i}" class="icon-btn sm ${i === w.exercises.length - 1 ? 'off' : ''}">${I.down}</span>
        </div>`;
    }).join('');
    return `
      <div class="sheet-wrap" data-act="sheetClose">
        <div class="sheet" data-act="noop">
          <div class="sheet-grip"></div>
          <div class="row-between" style="padding:6px 18px 10px">
            <div>
              <div class="label">Ordem do treino</div>
              <div class="h2">${esc(w.name)}</div>
            </div>
            <div data-act="sheetClose" class="icon-btn">${I.x}</div>
          </div>
          <div class="sheet-body">
            <div class="tiny" style="padding:0 8px 10px">Toque para ir direto ao exercício · use as setas para mudar a ordem</div>
            ${rows}
          </div>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- bloqueio
  rLock() {
    const V = this._sessVals(); if (!V || V.s.done) return '';
    const now = new Date();
    const bar = V.sets.map(x => `<i style="background:${x.state === 'todo' ? 'var(--line)' : x.color};${x.state === 'now' ? 'opacity:.45' : ''}"></i>`).join('');
    return `
      <div class="lockscreen">
        <div class="col center" style="flex:none;padding-top:max(46px, env(safe-area-inset-top));gap:10px">
          <div class="row gap-s label">${I.lock}<span>Bloqueado</span></div>
          ${this.dm(pad(now.getHours()) + ':' + pad(now.getMinutes()), 62, { ghost: true })}
          <div class="label">${DIAS[now.getDay()]} · ${now.getDate()} ${MESES[now.getMonth()]}</div>
        </div>

        <div style="flex:1;display:flex;flex-direction:column;justify-content:center">
          <div class="card">
            <div class="row-between">
              <span class="row gap-s"><span class="dot-red"></span><span class="label label-ink">FITOS · ${esc(V.name)}</span></span>
              <span class="label">${V.feitos}/${V.exTotal} OK</span>
            </div>
            <div class="h2" style="margin:12px 0 8px">${esc(V.exName)}</div>
            <div class="bar">${bar}</div>
            <div class="tiny" style="margin-top:7px">SÉRIE ${V.setNum}/${V.setTotal}${V.setType ? ' · ' + V.setType : ''} · DESC ${clock(V.restS)}</div>
            ${V.notes ? `<div class="tiny" style="margin-top:8px;border-left:2px solid var(--accent);padding-left:8px">${esc(V.notes)}</div>` : ''}
            <div class="row gap-m" style="margin:14px 0 4px;align-items:flex-end">
              ${this.dm(V.big, 44, { ghost: true })}
              <span class="tiny grow">${V.unit}</span>
            </div>
            ${V.resting ? `
              <div class="row gap-s" style="margin-top:12px">
                <span data-act="restMinus" class="btn btn-ghost btn-sm grow">−15s</span>
                <span data-act="restPlus" class="btn btn-ghost btn-sm grow">+15s</span>
                <span data-act="sessPrimary" class="btn btn-primary btn-sm" style="flex:1.4">Pular</span>
              </div>` : `
              <div class="row gap-s" style="margin-top:12px">
                ${V.timed ? `<span data-act="toggleWork" class="btn btn-ghost btn-sm grow">${V.workBtn}</span>` : `<span data-act="sessSkip" class="btn btn-ghost btn-sm grow">Pular exerc.</span>`}
                <span data-act="sessPrimary" class="btn btn-primary btn-sm grow">Série OK</span>
              </div>`}
            <div class="row gap-s" style="margin-top:8px">
              <span data-act="sessUndo" class="btn btn-ghost btn-sm grow ${V.canUndo ? '' : 'off'}" style="${V.canUndo ? '' : 'opacity:.35;pointer-events:none'}">${I.undo} Voltar</span>
              <span data-act="sessPauseToggle" class="btn btn-ghost btn-sm grow">${V.paused ? 'Retomar' : 'Pausar'}</span>
            </div>
          </div>
        </div>

        <div data-act="exitLock" class="col center" style="flex:none;padding:0 0 max(26px, env(safe-area-inset-bottom));gap:12px;cursor:pointer">
          <span class="label">↑ Deslize para abrir</span>
          <i style="width:120px;height:4px;border-radius:2px;background:var(--ink-3);display:block"></i>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- HIIT
  _cfgCell(label, down, up, display, chg) {
    return `
      <div class="col grow" style="gap:6px">
        <span class="label">${label}</span>
        <div class="stepper">
          <span data-act="${down}" class="sbtn">–</span>
          <input inputmode="numeric" value="${display}" data-chg="${chg}">
          <span data-act="${up}" class="sbtn">+</span>
        </div>
      </div>`;
  }
  rHiit() {
    const S = this.state, H = S.hiit, r = S.hiitRun;
    if (r) {
      const step = r.seq[r.idx];
      const done = step.phase === 'done';
      const label = done ? 'CONCLUÍDO' : ({ prepare: 'PREPARAR', work: 'TREINO', rest: 'DESCANSO' }[step.phase]);
      const isRest = step.phase === 'rest';
      return `
        <div class="scr center" style="justify-content:center;gap:18px;padding:20px">
          <div class="row-between label" style="width:100%">
            <span>Exerc ${step.ex ? (step.ex + '/' + H.exercises.length) : '—'}</span>
            <span>Ciclo ${step.cycle ? (step.cycle + '/' + H.cycles) : '—'}</span>
          </div>
          <div class="label" style="color:${isRest ? 'var(--ink-2)' : 'var(--ink)'};letter-spacing:.3em">${label}</div>
          <div class="h1" style="text-align:center;min-height:30px">${step.phase === 'work' ? esc(step.label) : (done ? 'Bom treino!' : '')}</div>
          <div style="${isRest ? 'opacity:.7' : ''}">${this.dm(done ? '00' : pad(r.remaining), 96, { ghost: true })}</div>
          <div class="row gap-m center">
            <div data-act="stopHiit" class="icon-btn ghost">${I.stop}</div>
            <div data-act="toggleHiit" class="icon-btn lg on">${done ? I.check : (r.running ? I.pause : I.play)}</div>
            <div data-act="skipHiit" class="icon-btn ghost">${I.skip}</div>
          </div>
          <div class="tiny" style="text-align:center">${H.rest}s off · ${H.exercises.length} exerc · ${H.cycles} ciclos</div>
        </div>`;
    }
    const rows = H.exercises.map((e, i) => `
      <div class="tile row gap-s">
        <span class="label" style="width:20px">${pad(i + 1)}</span>
        <div class="field grow" style="padding:6px 10px"><input type="text" value="${esc(this._hxName(e))}" data-chg="hiitName" data-i="${i}"></div>
        <div class="stepper inline" style="flex:none">
          <span data-act="hxDown" data-i="${i}" class="sbtn">–</span>
          <input inputmode="numeric" value="${clock(this._hxWork(e))}" data-chg="hxWork" data-i="${i}" style="width:52px">
          <span data-act="hxUp" data-i="${i}" class="sbtn">+</span>
        </div>
        <span data-act="hxRemove" data-i="${i}" class="icon-btn sm" style="background:transparent;color:var(--ink-3)">${I.x}</span>
      </div>`).join('');
    const sumWork = H.exercises.reduce((a, e) => a + this._hxWork(e), 0);
    const totalRest = (H.exercises.length * H.cycles - 1) * H.rest;
    return `
      <div class="scr">
        ${this._topbar({ back: 'goHome', title: 'Timer HIIT', sub: 'Intervalado' })}
        <div data-scroll="hiit" class="scr-body">
          <div class="row gap-m">
            ${this._cfgCell('Preparar', 'prepDown', 'prepUp', clock(H.prepare), 'hPrep')}
            ${this._cfgCell('Ciclos', 'cyclesDown', 'cyclesUp', pad(H.cycles), 'hCycles')}
          </div>
          <div class="row gap-m">
            ${this._cfgCell('On padrão', 'workDown', 'workUp', clock(H.work), 'hWork')}
            ${this._cfgCell('Descanso', 'hrestDown', 'hrestUp', clock(H.rest), 'hRest')}
          </div>
          <div class="row-between"><span class="label">Exercícios do circuito</span><span class="label">${pad(H.exercises.length)}</span></div>
          ${rows}
          <div data-act="addHiitEx" class="btn btn-ghost btn-block">${I.plus} Adicionar exercício</div>
          <div class="card center col" style="gap:8px">
            <span class="label">Duração estimada</span>
            ${this.dm(clock(H.prepare + sumWork * H.cycles + Math.max(0, totalRest)), 34, { ghost: true })}
          </div>
          <div data-act="startHiit" class="btn btn-primary btn-lg btn-block">Iniciar circuito</div>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- evolução
  rEvo() {
    const S = this.state;
    const data = this._evoData();
    const fmtDay = ts => { const d = new Date(ts); return d.getDate() + ' ' + MESES[d.getMonth()]; };
    let body;
    if (!data.length) {
      body = '<div class="small center" style="padding:50px 20px;text-align:center;line-height:1.9">Sem dados ainda.<br>Conclua um treino para registrar sua evolução.</div>';
    } else {
      const sel = data.find(x => x.name === S.evoSel) || data[0];
      const chips = data.map(x => `<span data-act="evoPick" data-key="${esc(x.name)}" class="chip ${x.name === sel.name ? 'on' : 'chip-outline'}" style="white-space:nowrap">${esc(x.name)}</span>`).join('');
      const pr = sel.points.reduce((a, p) => p.v >= a.v ? p : a, sel.points[0]);
      const unit = this._evoUnit(sel.type);
      const sessions = S.log.slice(-8).reverse().map(en => `
        <div class="item">
          <span class="label" style="width:52px">${fmtDay(en.ts)}</span>
          <span class="grow ellip h3">${esc(en.name)}</span>
          <span class="small">${clock(en.elapsed)}</span>
        </div>`).join('');
      body = `
        <div class="row" style="gap:5px;overflow-x:auto;padding-bottom:2px">${chips}</div>
        <div class="card">
          <div class="row-between">
            <span class="label label-ink">Carga · ${unit}</span>
            <span class="label">${sel.points.length} registros</span>
          </div>
          <div style="margin-top:14px">${this._evoChart(sel.points)}</div>
        </div>
        <div class="card card-tight row-between">
          <span class="label">Recorde</span>
          <span class="row gap-s">${this.dm(String(pr.v), 22)}<span class="small">${unit} · ${fmtDay(pr.ts)}</span></span>
        </div>
        <div class="label" style="margin-top:4px">Sessões recentes</div>
        <div>${sessions}</div>`;
    }
    return `
      <div class="scr">
        ${this._topbar({ back: 'goPerfil', title: 'Evolução', sub: 'Histórico' })}
        <div data-scroll="evo" class="scr-body">${body}</div>
      </div>`;
  }

  // ---------------------------------------------------------------- perfil
  rPerfil() {
    const S = this.state, st = S.settings;
    return `
      <div class="scr">
        ${this._topbar({ title: 'Perfil', sub: 'FITOS' })}
        <div data-scroll="perfil" class="scr-body">
          <div>
            <div class="label" style="margin-bottom:6px">Nome</div>
            <div class="field"><input type="text" value="${esc(S.profile.name)}" data-chg="profileName" style="font-size:17px;font-weight:500"></div>
          </div>

          <div class="label">Aparência</div>
          <div class="card col gap-m">
            <div class="row-between">
              <span class="h3">Tema</span>
              <span class="row gap-s">
                <span data-act="setTheme" data-key="dark" class="chip ${st.theme !== 'light' ? 'on' : 'chip-outline'}">Escuro</span>
                <span data-act="setTheme" data-key="light" class="chip ${st.theme === 'light' ? 'on' : 'chip-outline'}">Claro</span>
              </span>
            </div>
            <div class="row-between">
              <span class="h3">Números em pontos</span>
              <span data-act="togDots" class="chip ${st.dots !== false ? 'on' : 'chip-outline'}">${st.dots !== false ? 'On' : 'Off'}</span>
            </div>
            <div class="row-between">
              <span class="h3">Som (bipes)</span>
              <span data-act="togSound" class="chip ${st.sound ? 'on' : 'chip-outline'}">${st.sound ? 'On' : 'Off'}</span>
            </div>
          </div>

          <div class="label">Dados</div>
          <div class="card col gap-m">
            <div class="row-between"><span class="small">Dias treinados</span>${this.dm(pad(S.history.length), 18)}</div>
            <div class="row-between"><span class="small">Sequência atual</span>${this.dm(pad(this._streak()), 18)}</div>
            <div class="row-between"><span class="small">Treinos salvos</span>${this.dm(pad(S.workouts.length), 18)}</div>
          </div>

          <div data-act="goEvo" class="tile row gap-m">
            <div class="icon-btn">${I.chart}</div>
            <div class="grow"><div class="h3">Histórico & evolução</div><div class="tiny">Cargas e sessões registradas</div></div>
            <span class="muted">${I.fwd}</span>
          </div>

          <div class="row gap-s">
            <div data-act="exportData" class="btn btn-ghost btn-sm grow">Exportar</div>
            <div data-act="importData" class="btn btn-ghost btn-sm grow">Importar</div>
          </div>
          <div data-act="wipeData" class="btn btn-danger btn-block">Apagar todos os dados</div>
          <div class="tiny center" style="text-align:center;margin-top:4px">FITOS · dados salvos neste aparelho</div>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- nav
  rNav() {
    const scr = this.state.screen;
    const tab = (act, on, icon, label) => `<div data-act="${act}" class="tab ${on ? 'on' : ''}">${icon}<span>${label}</span></div>`;
    return `
      <div class="tabbar">
        ${tab('goHome', scr === 'home', I.home, 'Início')}
        ${tab('goList', scr === 'list', I.dumbbell, 'Treinos')}
        ${tab('goHiit', scr === 'hiit', I.timer, 'Timer')}
        ${tab('goPerfil', scr === 'perfil', I.user, 'Perfil')}
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
