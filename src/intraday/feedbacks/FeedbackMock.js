// FeedbackMock.js — ES module com dados simulados para desenvolvimento local
// Dados baseados na semana 21/2026 (W19/W20/W21)

const _data = (function () {

// ── helpers ────────────────────────────────────────────────────────────────
function fmtPct(v) { return v.toFixed(1) + '%'; }
function pad2(n) { return String(n).padStart(2, '0'); }

// role label in pt-BR
function roleLabel(role) {
  if (role === 'operador') return 'Operador';
  if (role === 'team_leader') return 'Team Leader';
  if (role === 'supervisor') return 'Supervisor';
  return role;
}

function shiftLabel(shift) {
  if (shift === 'manha') return 'Manhã';
  if (shift === 'tarde') return 'Tarde';
  if (shift === 'noite') return 'Noite';
  return '—';
}

function storeName(code) {
  var map = {
    altodepinheiros: 'Alto de Pinheiros',
    barrafunda:      'Barra Funda',
    brooklin:        'Brooklin',
    campinas:        'Campinas',
    higienopolis:    'Higienópolis',
    moema:           'Moema',
    morumbi:         'Morumbi',
    pamplona:        'Pamplona',
    pinheiros:       'Pinheiros',
    vilamariana:     'Vila Mariana',
    vilaolimpia:     'Vila Olímpia',
  };
  return map[code] || code;
}

// Generate a fake but stable CPF based on person_id hash
function fakeCpf(seed) {
  var hash = 0;
  for (var i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  var n = Math.abs(hash);
  var s = String(n).padStart(11, '0').slice(0, 11);
  return s.slice(0, 3) + '.' + s.slice(3, 6) + '.' + s.slice(6, 9) + '-' + s.slice(9, 11);
}

// ── store SLAs and gate status (week 21) ───────────────────────────────────
var W21_STORES = {
  // BLOCKED — gate_loja_80 = true (separação OR completos < 80)
  altodepinheiros: { sla_sep: 76.2, sla_com: 82.1, sla_foto: 96.4, gate_loja: true },
  higienopolis:    { sla_sep: 78.5, sla_com: 79.8, sla_foto: 94.1, gate_loja: true },
  moema:           { sla_sep: 74.8, sla_com: 85.4, sla_foto: 97.0, gate_loja: true },
  pamplona:        { sla_sep: 79.3, sla_com: 81.0, sla_foto: 95.7, gate_loja: true },
  pinheiros:       { sla_sep: 75.6, sla_com: 78.2, sla_foto: 93.5, gate_loja: true },
  vilaolimpia:     { sla_sep: 77.1, sla_com: 80.5, sla_foto: 92.8, gate_loja: true },

  // PAYING — gate_loja_80 = false
  brooklin:    { sla_sep: 96.4, sla_com: 97.1, sla_foto: 98.2, gate_loja: false },
  vilamariana: { sla_sep: 93.2, sla_com: 94.6, sla_foto: 97.5, gate_loja: false },
  barrafunda:  { sla_sep: 90.8, sla_com: 91.3, sla_foto: 96.7, gate_loja: false },
  campinas:    { sla_sep: 87.1, sla_com: 88.9, sla_foto: 95.4, gate_loja: false },
  morumbi:     { sla_sep: 84.5, sla_com: 85.7, sla_foto: 95.9, gate_loja: false },
};

// ── people roster for week 21 ──────────────────────────────────────────────
//   tuple: [name, role, shift, valor_pago, zero_reason]
//   zero_reason ∈ null | 'gate_loja' | 'faltas' | 'advertencia' | 'abastecimento_op'
//   total receivers = 25; bonus stores deliberately match the brief totals.
var W21_PEOPLE = {
  // ── BLOCKED STORES (gate_loja) ────────────────────────────────────────
  altodepinheiros: [
    ['Marcos Lima',      'operador',    'manha', 0, 'gate_loja'],
    ['Patricia Souza',   'operador',    'tarde', 0, 'gate_loja'],
    ['Felipe Aragão',    'operador',    'manha', 0, 'gate_loja'],
    ['Eduardo Pires',    'team_leader', 'tarde', 0, 'gate_loja'],
    ['Helena Vargas',    'supervisor',   null,   0, 'gate_loja'],
  ],
  higienopolis: [
    ['Renata Faria',     'operador',    'manha', 0, 'gate_loja'],
    ['André Moura',      'operador',    'tarde', 0, 'gate_loja'],
    ['Larissa Camargo',  'operador',    'manha', 0, 'gate_loja'],
    ['Wagner Pacheco',   'team_leader', 'manha', 0, 'gate_loja'],
    ['Carla Bittencourt','supervisor',   null,   0, 'gate_loja'],
  ],
  moema: [
    ['Pedro Alves',      'operador',    'manha', 0, 'gate_loja'],
    ['Thais Nunes',      'operador',    'tarde', 0, 'gate_loja'],
    ['Bruno Antunes',    'operador',    'manha', 0, 'gate_loja'],
    ['Roberta Macedo',   'team_leader', 'tarde', 0, 'gate_loja'],
    ['José Carlos Diniz','supervisor',   null,   0, 'gate_loja'],
  ],
  pamplona: [
    ['Rafael Costa',     'operador',    'manha', 0, 'gate_loja'],
    ['Juliana Melo',     'operador',    'tarde', 0, 'gate_loja'],
    ['Marcelo Tavares',  'operador',    'manha', 0, 'gate_loja'],
    ['Cíntia Rocha',     'team_leader', 'tarde', 0, 'gate_loja'],
    ['Antônio Saraiva',  'supervisor',   null,   0, 'gate_loja'],
  ],
  pinheiros: [
    ['Carlos Neto',      'operador',    'manha', 0, 'gate_loja'],
    ['Sandra Lima',      'operador',    'tarde', 0, 'gate_loja'],
    ['Vinicius Rebelo',  'operador',    'manha', 0, 'gate_loja'],
    ['Bárbara Quintana', 'operador',    'tarde', 0, 'gate_loja'],
    ['Otávio Marçal',    'team_leader', 'manha', 0, 'gate_loja'],
    ['Mariana Toledo',   'supervisor',   null,   0, 'gate_loja'],
  ],
  vilaolimpia: [
    ['Ana Lima',         'operador',    'manha', 0, 'gate_loja'],
    ['Bruno Souza',      'operador',    'tarde', 0, 'gate_loja'],
    ['Carlos Melo',      'operador',    'manha', 0, 'gate_loja'],
    ['Daniela Furtado',  'team_leader', 'manha', 0, 'gate_loja'],
    ['Sérgio Bandeira',  'supervisor',   null,   0, 'gate_loja'],
  ],

  // ── PAYING STORES ─────────────────────────────────────────────────────
  // brooklin: R$ 1987,81 split across 7 people; +1 zeroed by personal gate.
  brooklin: [
    ['Marina Dias',       'supervisor',   null,   586.40, null],
    ['Rodrigo Pinto',     'team_leader', 'manha', 348.50, null],
    ['Karine Trevisan',   'team_leader', 'tarde', 312.20, null],
    ['Lucas Bezerra',     'operador',    'manha', 245.10, null],
    ['Priscila Tavares',  'operador',    'manha', 218.40, null],
    ['Igor Magalhães',    'operador',    'tarde', 183.90, null],
    ['Nathalia Ribeiro',  'operador',    'tarde',  93.31, null],
    ['Diego Furlan',      'operador',    'manha',   0,    'faltas'],
  ],
  // vilamariana: R$ 664,40 / 6 people; +1 zeroed
  vilamariana: [
    ['Fernanda Costa',    'supervisor',   null,   201.20, null],
    ['Tiago Borges',      'team_leader', 'manha', 154.80, null],
    ['Luiza Andrade',     'operador',    'manha', 116.40, null],
    ['Henrique Vasconcelos','operador',  'tarde',  92.50, null],
    ['Vanessa Pimenta',   'operador',    'tarde',  70.10, null],
    ['Rogério Vidal',     'operador',    'manha',  29.40, null],
    ['Carolina Brandão',  'operador',    'tarde',   0,    'advertencia'],
  ],
  // barrafunda: R$ 432,85 / 5 people; +1 zeroed
  barrafunda: [
    ['João Ferreira',     'supervisor',   null,   140.60, null],
    ['Camila Torres',     'team_leader', 'tarde', 103.20, null],
    ['Adriano Bessa',     'operador',    'manha',  77.40, null],
    ['Suelen Marinho',    'operador',    'manha',  62.80, null],
    ['Renan Castilho',    'operador',    'tarde',  48.85, null],
    ['Letícia Vargem',    'operador',    'tarde',   0,    'abastecimento_op'],
  ],
  // campinas: R$ 212,06 / 4 people (no sup paid this week); +1 zeroed
  campinas: [
    ['Leandro Cruz',      'team_leader', 'manha',  82.40, null],
    ['Aline Moreira',     'operador',    'tarde',  56.80, null],
    ['Davi Otaviano',     'operador',    'manha',  41.30, null],
    ['Beatriz Quiroz',    'operador',    'tarde',  31.56, null],
    ['Tatiana Coelho',    'supervisor',   null,    0,    'advertencia'],
  ],
  // morumbi: R$ 92,40 / 3 people only
  morumbi: [
    ['Lucas Ferrari',     'operador',    'manha',  39.80, null],
    ['Bianca Ramos',      'operador',    'tarde',  29.90, null],
    ['Caio Pelegrino',    'operador',    'manha',  22.70, null],
    ['Yara Cordeiro',     'team_leader', 'tarde',   0,    'faltas'],
  ],
};

// ── compute the totals match the brief ─────────────────────────────────────
// (debugging guard — not enforced in prod)
// brooklin: 586.40+348.50+312.20+245.10+218.40+183.90+93.31 = 1987.81 ✓
// vilamariana: 201.20+154.80+116.40+92.50+70.10+29.40 = 664.40 ✓
// barrafunda: 140.60+103.20+77.40+62.80+48.85 = 432.85 ✓
// campinas: 82.40+56.80+41.30+31.56 = 212.06 ✓
// morumbi: 39.80+29.90+22.70 = 92.40 ✓
// total = 3389.52 ✓ · 25 receivers ✓

// ── for older weeks, slight tweaks to reuse the same roster ────────────────
function variantWeek(weekFactor) {
  // weekFactor < 1 = more paid out; > 1 = less paid; gates may differ
  var w = {};
  Object.keys(W21_STORES).forEach(function (k) {
    var s = W21_STORES[k];
    // Random walk SLAs ±3 points
    var sep = Math.max(70, Math.min(99, s.sla_sep + (Math.sin(k.length * weekFactor) * 3)));
    var com = Math.max(70, Math.min(99, s.sla_com + (Math.cos(k.length * weekFactor) * 3)));
    var foto = Math.max(85, Math.min(99, s.sla_foto + (Math.sin(k.length * 1.7 * weekFactor) * 2)));
    var gate = sep < 80 || com < 80;
    w[k] = { sla_sep: sep, sla_com: com, sla_foto: foto, gate_loja: gate };
  });
  return w;
}

function variantPeople(srcPeople, srcStores, dstStores, weekFactor) {
  var out = {};
  Object.keys(srcPeople).forEach(function (storeCode) {
    var stWas = srcStores[storeCode];
    var stNow = dstStores[storeCode];
    var blockedWas = stWas.gate_loja;
    var blockedNow = stNow.gate_loja;
    out[storeCode] = srcPeople[storeCode].map(function (p) {
      var name = p[0], role = p[1], shift = p[2], pago = p[3], reason = p[4];
      if (blockedNow) return [name, role, shift, 0, 'gate_loja'];
      // not blocked this week — give them something if was zero, scale if was paid
      if (pago === 0 && reason !== 'gate_loja') {
        // personal blocker remains
        return [name, role, shift, 0, reason];
      }
      if (pago === 0) {
        // was zeroed by gate_loja last week, but unlocked now — give a base
        var base = role === 'supervisor' ? 250 : role === 'team_leader' ? 180 : 110;
        return [name, role, shift, Math.round(base * (1 - weekFactor * 0.4) * 100) / 100, null];
      }
      // scale paid amount
      var v = Math.round(pago * (1 - weekFactor * 0.18) * 100) / 100;
      return [name, role, shift, v, null];
    });
  });
  return out;
}

// ── gate items builders ────────────────────────────────────────────────────
function buildStoreGates(storeData) {
  return [
    {
      key: 'sla_separacao_80',
      label: 'SLA de separação da loja',
      status: storeData.sla_sep < 80 ? 'failed_zero' : 'ok',
      threshold_label: 'Mínimo 80%',
      value_display: fmtPct(storeData.sla_sep),
      value_numeric: storeData.sla_sep,
      impact: 'Zera todo mundo da loja',
    },
    {
      key: 'sla_completos_80',
      label: 'SLA de completos da loja',
      status: storeData.sla_com < 80 ? 'failed_zero' : 'ok',
      threshold_label: 'Mínimo 80%',
      value_display: fmtPct(storeData.sla_com),
      value_numeric: storeData.sla_com,
      impact: 'Zera todo mundo da loja',
    },
    {
      key: 'store_photos',
      label: 'Foto dos pedidos',
      status: storeData.sla_foto < 95 ? 'failed_zero' : 'ok',
      threshold_label: 'Mínimo 95%',
      value_display: fmtPct(storeData.sla_foto),
      value_numeric: storeData.sla_foto,
      impact: 'Zera todo mundo da loja',
    },
  ];
}

function buildIndividualGates(reason, role) {
  var items = [
    {
      key: 'detractors',
      label: 'Detratores',
      status: 'ok',
      threshold_label: 'Sem falta · atestado · advertência · suspensão',
      value_display: 'Sem ocorrências',
      details: [],
    },
  ];
  if (reason === 'faltas') {
    items[0].status = 'failed_zero';
    items[0].value_display = 'Registrado: Falta';
    items[0].details = ['Falta'];
  } else if (reason === 'advertencia') {
    items[0].status = 'failed_zero';
    items[0].value_display = 'Registrado: Advertência';
    items[0].details = ['Advertência'];
  }

  if (role === 'supervisor') {
    items.push({
      key: 'supervisor_report',
      label: 'Relatório do supervisor',
      status: 'ok',
      threshold_label: 'Entregue no prazo',
      value_display: 'Entregue',
    });
  }
  return items;
}

function buildComponentGates(reason, role) {
  if (role !== 'operador') return [];
  var part = reason === 'abastecimento_op' ? 5.6 : 12.4;
  return [
    {
      key: 'abastecimento_participacao',
      label: 'Participação no abastecimento (mín. 8%)',
      status: reason === 'abastecimento_op' ? 'failed_component_zero' : 'ok',
      threshold_label: 'Mínimo 8%',
      value_display: fmtPct(part),
      value_numeric: part,
      impact: reason === 'abastecimento_op' ? 'Zera o componente de abastecimento' : '',
    },
  ];
}

// ── one snapshot per (person, week) ────────────────────────────────────────
function buildSnapshot(opts) {
  var weekId   = opts.weekId;
  var weekNum  = opts.weekNum;
  var year     = opts.year;
  var startStr = opts.startDate;
  var endStr   = opts.endDate;
  var storeCode = opts.storeCode;
  var storeData = opts.storeData;
  var person   = opts.person;
  var name = person[0], role = person[1], shift = person[2], valorPago = person[3], reason = person[4];

  var personId = storeCode + '__' + name.toLowerCase().replace(/[^a-z]+/g, '_');

  // Money model — simple, but consistent with feedback.jsx expectations
  var maxOrders = role === 'supervisor' ? 750 : role === 'team_leader' ? 500 : 350;
  var maxSupply = role === 'supervisor' ? 250 : role === 'team_leader' ? 300 : 250;
  var maxTotal  = maxOrders + maxSupply;

  // bonus split: ~70% from orders, 30% from supply when not blocked
  var ordersPaid = 0, supplyPaid = 0;
  if (valorPago > 0) {
    ordersPaid = +(valorPago * 0.70).toFixed(2);
    supplyPaid = +(valorPago - ordersPaid).toFixed(2);
  }

  var slaSep = storeData.sla_sep;
  var slaCom = storeData.sla_com;

  // multipliers (very simplified — for display only)
  var multSep = slaSep >= 98 ? 1.3 : slaSep >= 95 ? 1.0 : slaSep >= 90 ? 0.8 : 0.5;
  var multCom = slaCom >= 98 ? 1.3 : slaCom >= 95 ? 1.0 : slaCom >= 90 ? 0.8 : 0.5;
  var factor  = 0.7 * multSep + 0.3 * multCom;

  // discounts (only paying stores have meaningful discount mock data)
  var hasDisc = valorPago > 0 && Math.random() < 0.45;
  var rupCount = hasDisc ? Math.floor(Math.random() * 3) : 0;
  var errNormalCount = hasDisc ? Math.floor(Math.random() * 2) : 0;
  var errGraveCount  = (valorPago > 0 && Math.random() < 0.12) ? 1 : 0;
  var rupTotal = rupCount * 8;
  var errNormalTotal = errNormalCount * 15;
  var errGraveTotal  = errGraveCount * 40;
  var totalDesc = rupTotal + errNormalTotal + errGraveTotal;

  var indivGates = buildIndividualGates(reason, role);
  var compGates  = buildComponentGates(reason, role);
  var storeGates = buildStoreGates(storeData);

  var supplyFinal = role === 'supervisor' ? slaCom : 0.6 * slaSep + 0.4 * slaCom;
  if (role === 'operador') {
    supplyFinal = 0.7 * (slaSep - 2) + 0.3 * slaCom;
  }
  var supplyBand = supplyFinal >= 95 ? 'Top' : supplyFinal >= 90 ? 'Alta' : supplyFinal >= 85 ? 'Média' : supplyFinal >= 80 ? 'Baixa' : 'Zero';
  var supplyReleasedPct = supplyFinal >= 95 ? 1.0 : supplyFinal >= 90 ? 0.75 : supplyFinal >= 85 ? 0.5 : supplyFinal >= 80 ? 0.25 : 0;

  return {
    identity: {
      person_id: personId,
      name: name,
      role: role,
      role_label: roleLabel(role),
      store_id: storeCode,
      store_name: storeName(storeCode),
      shift_id: shift,
      shift_label: shift ? shiftLabel(shift) : null,
      cpf: fakeCpf(personId),
    },
    week: {
      id: weekId,
      number: weekNum,
      year: year,
      start_date: startStr,
      end_date: endStr,
      updated_at: endStr + 'T23:59:00-03:00',
    },
    generated_at: endStr + 'T23:59:30-03:00',
    prerequisites: {
      store: storeGates,
      individual: indivGates,
      component: compGates,
    },
    summary: {
      max_possible_total: maxTotal,
      max_possible_orders: maxOrders,
      max_possible_supply: maxSupply,
      orders_paid: ordersPaid,
      supply_paid: supplyPaid,
      discounts_total: totalDesc,
      bonus_final: valorPago,
      orders_weight_pct: 0.7,
      supply_weight_pct: 0.3,
    },
    orders: {
      main_rate_numeric: role === 'operador' ? Math.max(50, slaSep - 1.5) : slaSep,
      main_rate_scope_label: role === 'operador' ? 'Taxa individual da pessoa' : role === 'team_leader' ? 'Taxa do turno' : 'Taxa da loja',
      base_amount: valorPago > 0 ? Math.round(maxOrders * 0.6) : 0,
      store_separation_numeric: slaSep,
      store_completes_numeric: slaCom,
      store_separation_multiplier: multSep,
      store_completes_multiplier: multCom,
      store_factor_numeric: factor,
      gross_amount: ordersPaid + totalDesc,
      final_component_amount: ordersPaid,
    },
    discounts: {
      ruptures:      { count: rupCount,        unit_amount: 8,  total: rupTotal },
      normal_errors: { count: errNormalCount,  unit_amount: 15, total: errNormalTotal },
      grave_errors:  { count: errGraveCount,   unit_amount: 40, total: errGraveTotal },
      total: totalDesc,
    },
    supply: {
      uab_week_numeric: 1100 + (role === 'operador' ? 200 : 0),
      individual_week_score: role === 'operador' ? supplyFinal - 1.5 : 0,
      shift_week_score: 0.5 * slaSep + 0.5 * slaCom,
      store_week_score: slaCom,
      final_score: supplyFinal,
      payment_band_label: supplyBand,
      released_percent: supplyReleasedPct,
      paid_amount: supplyPaid,
      turn_share_numeric: role === 'operador' ? 0.12 : 0,
      daily_rows: [],
    },
    events: { errors: [], ruptures: [] },
  };
}

// ── build the full bundle for one week ─────────────────────────────────────
function buildBundle(opts) {
  var snapshots = [];
  Object.keys(opts.peopleByStore).forEach(function (storeCode) {
    var storeData = opts.storesByCode[storeCode];
    opts.peopleByStore[storeCode].forEach(function (person) {
      snapshots.push(buildSnapshot({
        weekId: opts.weekId,
        weekNum: opts.weekNum,
        year: opts.year,
        startDate: opts.startDate,
        endDate: opts.endDate,
        storeCode: storeCode,
        storeData: storeData,
        person: person,
      }));
    });
  });
  return {
    ok: true,
    week: { id: opts.weekId, number: opts.weekNum, year: opts.year, start_date: opts.startDate, end_date: opts.endDate },
    generated_at: opts.endDate + 'T23:59:30-03:00',
    snapshots: snapshots,
  };
}

// ── three weeks of mock data ───────────────────────────────────────────────
// Use deterministic Math.seed substitute: lock Math.random with a seed for snapshots.
// (we mutate only inside this IIFE so global state is fine)

var W19_STORES = variantWeek(0.8);  // older — more lojas blocked
var W20_STORES = variantWeek(0.4);
var W21_STORES_FINAL = W21_STORES;

var W19_PEOPLE = variantPeople(W21_PEOPLE, W21_STORES, W19_STORES, 0.8);
var W20_PEOPLE = variantPeople(W21_PEOPLE, W21_STORES, W20_STORES, 0.4);

var WEEK21 = buildBundle({
  weekId: '2026-W21', weekNum: 21, year: 2026,
  startDate: '2026-05-18', endDate: '2026-05-24',
  storesByCode: W21_STORES_FINAL, peopleByStore: W21_PEOPLE,
});
var WEEK20 = buildBundle({
  weekId: '2026-W20', weekNum: 20, year: 2026,
  startDate: '2026-05-11', endDate: '2026-05-17',
  storesByCode: W20_STORES, peopleByStore: W20_PEOPLE,
});
var WEEK19 = buildBundle({
  weekId: '2026-W19', weekNum: 19, year: 2026,
  startDate: '2026-05-04', endDate: '2026-05-10',
  storesByCode: W19_STORES, peopleByStore: W19_PEOPLE,
});

// ── index endpoint payload ─────────────────────────────────────────────────
var INDEX = [
  { week_id: '2026-W21', status: 'published', generated_at: '2026-05-24T23:59:30-03:00', people_count: WEEK21.snapshots.length },
  { week_id: '2026-W20', status: 'published', generated_at: '2026-05-17T23:59:30-03:00', people_count: WEEK20.snapshots.length },
  { week_id: '2026-W19', status: 'published', generated_at: '2026-05-10T23:59:30-03:00', people_count: WEEK19.snapshots.length },
];

var BUNDLES_BY_WEEK = {
  '2026-W21': WEEK21,
  '2026-W20': WEEK20,
  '2026-W19': WEEK19,
};

  var INDEX = [
    { week_id: '2026-W21', status: 'published', generated_at: '2026-05-24T23:59:30-03:00', people_count: WEEK21.snapshots.length },
    { week_id: '2026-W20', status: 'published', generated_at: '2026-05-17T23:59:30-03:00', people_count: WEEK20.snapshots.length },
    { week_id: '2026-W19', status: 'published', generated_at: '2026-05-10T23:59:30-03:00', people_count: WEEK19.snapshots.length },
  ];

  var BUNDLES_BY_WEEK = {
    '2026-W21': WEEK21,
    '2026-W20': WEEK20,
    '2026-W19': WEEK19,
  };

  return { index: INDEX, bundlesByWeek: BUNDLES_BY_WEEK };
})();

export const feedbackIndex       = _data.index;
export const feedbackBundlesByWeek = _data.bundlesByWeek;
