// FeedbackData.js — ES module version of feedback-data.js
// Converte snapshots do Worker no shape consumido por FeedbackPage.

// feedback-data.js — conversion utilities for Worker weekly feedback snapshots.
// Turns the payload produced by publish_weekly_feedback_snapshot.py into the
// report shape consumed by feedback.jsx.

  // ── role mapping ─────────────────────────────────────────────────────────────
  // Worker/Python uses: operator | teamleader | supervisor
  // feedback.jsx uses:  operador | team_leader | supervisor

  function mapRole(workerRole) {
    if (workerRole === 'operator' || workerRole === 'operador') return 'operador';
    if (workerRole === 'teamleader' || workerRole === 'team_leader' || workerRole === 'team leader' || workerRole === 'team_lider') return 'team_leader';
    return workerRole;  // supervisor / admin unchanged
  }

  // ── date helpers ─────────────────────────────────────────────────────────────

  function parseDate(str) {
    if (!str) return new Date();
    if (str instanceof Date) return str;
    // "2026-05-05" — treat as local midnight (no offset)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(str);
  }

  function fmtDay(d) {
    const dt = d instanceof Date ? d : parseDate(d);
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  function fmtFull(d) {
    const dt = d instanceof Date ? d : parseDate(d);
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // Extract HH:MM from an ISO datetime string, converting to São Paulo time.
  function extractHHMM(isoOrHHMM) {
    if (!isoOrHHMM) return '--:--';
    if (/^\d{2}:\d{2}/.test(isoOrHHMM)) return isoOrHHMM.slice(0, 5);
    try {
      const dt = new Date(isoOrHHMM);
      return dt.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return '--:--';
    }
  }

  // ── ISO week → Monday ────────────────────────────────────────────────────────

  function isoWeekToMonday(year, week) {
    // Jan 4 is always in ISO week 1
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = (jan4.getDay() + 6) % 7; // Mon=0
    const result = new Date(jan4);
    result.setDate(jan4.getDate() - dayOfWeek + (week - 1) * 7);
    return result;
  }

  // ── build WEEKS from index ───────────────────────────────────────────────────
  // indexEntries: array from GET /api/feedback-weekly (no week_id)
  //   { week_id, status, generated_at, people_count, ... }

  function buildWeeksFromIndex(indexEntries) {
    if (!indexEntries || !indexEntries.length) return [];
    return indexEntries.map(function (entry) {
      var parts = entry.week_id.split('-W');
      var year = parseInt(parts[0], 10);
      var weekNum = parseInt(parts[1], 10);
      var monday = isoWeekToMonday(year, weekNum);
      var sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        id: entry.week_id,
        number: weekNum,
        year: year,
        start: monday,
        end: sunday,
        label: 'Semana ' + weekNum + ' \xb7 ' + year,
        rangeLabel: fmtDay(monday) + ' a ' + fmtDay(sunday),
      };
    });
  }

  // ── build PEOPLE list from bundles map ───────────────────────────────────────
  // weekBundles: { [weekId]: { snapshots: [...] } }

  function buildPeopleFromBundles(weekBundles) {
    var seen = {};
    var people = [];
    Object.values(weekBundles).forEach(function (bundle) {
      (bundle.snapshots || []).forEach(function (snap) {
        var id = snap.identity.person_id;
        if (!seen[id]) {
          seen[id] = true;
          people.push({
            id: id,
            name: snap.identity.name,
            role: mapRole(snap.identity.role),
            roleLabel: snap.identity.role_label,
            storeId: snap.identity.store_id,
            shiftId: snap.identity.shift_id || null,
            // cpf omitido — Política de Dados Shopper
          });
        }
      });
    });
    return people;
  }

  // ── scope labels ─────────────────────────────────────────────────────────────

  function scopePenaltyLabel(role) {
    if (role === 'operador')    return 'seus eventos penalizados';
    if (role === 'team_leader') return 'eventos penalizados no seu turno';
    return 'eventos penalizados na sua loja';
  }

  function scopeRateLabel(role) {
    if (role === 'operador')    return 'Taxa individual da pessoa';
    if (role === 'team_leader') return 'Taxa do turno';
    return 'Taxa da loja';
  }

  // ── snapshotToReport ─────────────────────────────────────────────────────────
  // Converts a single Worker snapshot into the report object consumed by feedback.jsx.

  function snapshotToReport(snap) {
    var role = mapRole(snap.identity.role);

    var person = {
      id: snap.identity.person_id,
      name: snap.identity.name,
      role: role,
      roleLabel: snap.identity.role_label,
    };

    var store = {
      id: snap.identity.store_id,
      name: snap.identity.store_name || snap.identity.store_id,
      city: snap.identity.store_name || snap.identity.store_id,
    };

    var shift = snap.identity.shift_id ? {
      id: snap.identity.shift_id,
      name: snap.identity.shift_label || snap.identity.shift_id,
      // window would hold a time range (e.g. "14:00–22:00") but the publisher
      // doesn't have that data yet — leave null to avoid "tarde · tarde" duplication.
      window: null,
    } : null;

    var weekStartDate = parseDate(snap.week.start_date);
    var weekEndDate   = parseDate(snap.week.end_date);
    var week = {
      id: snap.week.id,
      number: snap.week.number,
      year: snap.week.year,
      start: weekStartDate,
      end: weekEndDate,
    };

    var ultimaAtualizacao = parseDate(snap.week.updated_at || snap.generated_at);

    // ── prerequisites ──────────────────────────────────────────────────────────

    var storeItems = snap.prerequisites.store || [];
    var storeGates = storeItems.map(function (item) {
      return {
        key: item.key,
        label: item.label,
        passed: item.status === 'ok',
        threshold: item.threshold_label || '',
        display: item.value_display || '',
        effect: item.impact || '',
      };
    });
    var storeZero = storeGates.some(function (g) { return !g.passed; });

    var indivItems = snap.prerequisites.individual || [];
    var detractorsItem = indivItems.find(function (i) { return i.key === 'detractors'; });
    var detractorDetails = (detractorsItem && detractorsItem.details) || [];

    var assiduidade = {
      falta:       detractorDetails.indexOf('Falta')       >= 0,
      atestado:    detractorDetails.indexOf('Atestado')    >= 0,
      advertencia: detractorDetails.indexOf('Advertência') >= 0,
      suspensao:   detractorDetails.indexOf('Suspensão')   >= 0,
    };

    var personalGates = indivItems.map(function (item) {
      return {
        label: item.label,
        status: (item.status === 'ok' || item.status === 'assumed_ok') ? 'ok' : 'zero',
      };
    });

    var personalZero = indivItems.some(function (i) {
      if (i.key === 'detractors') return (i.details || []).length > 0;
      if (i.key === 'supervisor_report') return i.status !== 'ok' && i.status !== 'assumed_ok';
      return false;
    });

    var componentItems = snap.prerequisites.component || [];
    var abastecimentoZero = componentItems.some(function (c) {
      return c.status === 'failed_component_zero';
    });
    var componentGates = componentItems.map(function (item) {
      return {
        label: item.label,
        status: item.status,
        display: item.value_display || '',
        threshold: item.threshold_label || '',
      };
    });

    var gates = {
      store: storeGates,
      personal: personalGates,
      component: componentGates,
      storeZero: storeZero,
      personalZero: personalZero,
      abastecimentoZero: abastecimentoZero,
    };

    // ── summary / financeiro ──────────────────────────────────────────────────

    var s = snap.summary || {};
    var financeiro = {
      tetoSemanal:                 s.max_possible_total   || 0,
      parcelaMaximaPedidos:        s.max_possible_orders  || 0,
      parcelaMaximaAbastecimento:  s.max_possible_supply  || 0,
      valorPagoPedidos:            s.orders_paid          || 0,
      valorPagoAbastecimento:      s.supply_paid          || 0,
      totalDescontos:              s.discounts_total      || 0,
      bonusFinal:                  s.bonus_final          || 0,
      valorBrutoPedidos:          (snap.orders && snap.orders.gross_amount) || 0,
      resultadoFinalPedidos:      (snap.orders && snap.orders.final_component_amount) || 0,
    };

    var splits = {
      pedidos: s.orders_weight_pct || 0,
      abast:   s.supply_weight_pct || 0,
    };

    // ── orders / pedidos ──────────────────────────────────────────────────────

    var o = snap.orders || {};
    var pedidos = {
      principalRate:    o.main_rate_numeric            || 0,
      base:             o.base_amount                  || 0,
      storeSeparation:  o.store_separation_numeric     || 0,
      storeCompletes:   o.store_completes_numeric      || 0,
      storePhotos:      (function () {
        var photoItem = storeItems.find(function (i) { return i.key === 'store_photos'; });
        return photoItem ? (photoItem.value_numeric || 0) : 0;
      })(),
      multSeparacao:    o.store_separation_multiplier  || 0,
      multCompletos:    o.store_completes_multiplier   || 0,
      fatorLoja:        o.store_factor_numeric         || 0,
      valorBruto:       o.gross_amount                 || 0,
      resultadoAposDescontos: o.final_component_amount || 0,
    };

    // ── discounts ─────────────────────────────────────────────────────────────

    var d = snap.discounts || {};
    var rup = d.ruptures || {};
    var nor = d.normal_errors || {};
    var grv = d.grave_errors  || {};
    var descontos = {
      rupturas:     { qtd: rup.count || 0, unit: rup.unit_amount || 0, total: rup.total || 0 },
      errosNormais: { qtd: nor.count || 0, unit: nor.unit_amount || 0, total: nor.total || 0 },
      errosGraves:  { qtd: grv.count || 0, unit: grv.unit_amount || 0, total: grv.total || 0 },
      totalGeral:   d.total || 0,
    };

    // ── supply / abastecimento ────────────────────────────────────────────────

    var sup = snap.supply || {};
    var participacaoPct = role === 'operador'
      ? parseFloat(((sup.turn_share_numeric || 0) * 100).toFixed(1))
      : null;

    var abastecimento = {
      uabPessoaSemana:  sup.uab_week_numeric       || 0,
      uabTurnoSemana:   0,   // not in snapshot; kept for shape compatibility
      uabLojaSemana:    0,
      participacaoPct:  participacaoPct,
      mediaPessoa:      role === 'operador' ? (sup.individual_week_score || 0) : null,
      mediaTurno:       sup.shift_week_score  || 0,
      mediaLoja:        sup.store_week_score  || 0,
      notaFinal:        sup.final_score       || 0,
      faixaPagamento:   sup.payment_band_label || '',
      percLiberado:     sup.released_percent  || 0,
      valorPago:        sup.paid_amount       || 0,
    };

    // ── daily supply rows ─────────────────────────────────────────────────────

    var diasAbastecimento = (sup.daily_rows || []).map(function (row) {
      return {
        date:           parseDate(row.date),
        turno:          row.shift || '',
        itens:          row.items_total || 0,
        skus:           row.skus_total  || 0,
        uab:            row.uab_total   || 0,
        minutos:        Math.round(row.minutes_total || 0),
        velocidade:     row.speed_uab_min || 0,
        horaFim:        extractHHMM(row.finished_at),
        notaVelocidade: row.speed_score  || 0,
        notaTermino:    row.finish_score || 0,
        notaDia:        row.day_score    || 0,
      };
    });

    // ── events ────────────────────────────────────────────────────────────────

    var seenErrorKeys = {};
    var errors = ((snap.events && snap.events.errors) || [])
      .filter(function (e) {
        // Deduplicate: looker_erros_eventos_bi can produce multiple rows for the
        // same event due to BQ joins. One row per (date, hour, order_code, error_label).
        var key = [
          e.date || '',
          typeof e.hour === 'number' ? e.hour : (e.hour || ''),
          e.order_code || '',
          e.error_label || '',
        ].join('|');
        if (seenErrorKeys[key]) return false;
        seenErrorKeys[key] = true;
        return true;
      })
      .map(function (e) {
        var hourStr = typeof e.hour === 'number'
          ? String(e.hour).padStart(2, '0') + ':00'
          : (e.hour || '--:--');
        return {
          date:             parseDate(e.date),
          hour:             hourStr,
          responsavel:      e.responsible_name || '',
          pedido:           e.order_code ? '#' + e.order_code : '',
          considerado:      e.consider   || '',
          grave:            e.grave      || '',
          responsabilidade: e.responsibility || '',
          erro:             e.error_label   || '',
          link:             e.link_drive    || e.slack_link || '—',
        };
      });

    var ruptures = ((snap.events && snap.events.ruptures) || []).map(function (r) {
      var hourStr = '--:--';
      if (typeof r.hour === 'number') {
        var minute = typeof r.minute === 'number' ? r.minute : 0;
        hourStr = String(r.hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
      } else if (r.hour) {
        hourStr = r.hour;
      }
      return {
        date:        parseDate(r.date),
        hour:        hourStr,
        responsavel: r.responsible_name || '',
        pedido:      r.order_code ? '#' + r.order_code : '',
        produto:     r.product_desc || '',
      };
    });

    return {
      person:              person,
      store:               store,
      shift:               shift,
      week:                week,
      fmtDay:              fmtDay,
      fmtFull:             fmtFull,
      ultimaAtualizacao:   ultimaAtualizacao,
      coberturaAte:        weekEndDate,
      scopePenaltyLabel:   scopePenaltyLabel(role),
      mainRateScopeLabel:  o.main_rate_scope_label || scopeRateLabel(role),
      gates:               gates,
      financeiro:          financeiro,
      splits:              splits,
      pedidos:             pedidos,
      descontos:           descontos,
      assiduidade:         assiduidade,
      abastecimento:       abastecimento,
      diasAbastecimento:   diasAbastecimento,
      contingencia:        null,
      errors:              errors,
      ruptures:            ruptures,
    };
  }

export {
  fmtDay,
  fmtFull,
  buildWeeksFromIndex,
  buildPeopleFromBundles,
  snapshotToReport,
  mapRole,
};
