(function () {
  'use strict';

  var API_URL = '/plugins/balls/data';

  var state = {
    meta: null,
    data: null,
    activeSpeed: 'mid',
    activeClub: 'driver',
    activeMetric: 'Total',
    mode: 'table',
    sortAsc: false,
    scatterXMetric: null,
    scatterYMetric: null,
  };

  function fetchData() {
    var el = document.getElementById('blls-loading');
    if (el) el.textContent = 'Loading ball data...';

    fetch(API_URL)
      .then(function (r) {
        if (!r.ok) throw new Error('Server returned ' + r.status);
        return r.json();
      })
      .then(function (data) {
        if (data.error) throw new Error(data.error);
        state.meta = { balls: data.balls, conditions: data.conditions, metrics: data.metrics };
        state.data = data.rows;
        state.activeSpeed = 'mid';
        state.activeClub = 'driver';
        state.activeMetric = state.meta.metrics.includes('Total') ? 'Total' : state.meta.metrics[0];
        state.mode = 'table';
        state.sortAsc = false;
        state.scatterXMetric = state.meta.metrics[1] || state.meta.metrics[0];
        state.scatterYMetric = state.meta.metrics[0];
        render();
      })
      .catch(function (err) {
        var container = document.getElementById('balls-content');
        if (container) {
          container.innerHTML = '<div class="blls-error">Failed to load ball data: ' +
            escapeHtml(err.message) + '</div>';
        }
      });
  }

  var SPEED_LABELS = {
    slow: { label: 'Slow', note: '86' },
    mid: { label: 'Mid', note: '102' },
    fast: { label: 'Fast', note: '116' },
    wedge: { label: 'Wedge', note: '42' },
  };

  var CLUB_LABELS = {
    driver: 'Driver',
    'mid-iron': '7-Iron',
    'full-sand-wedge': 'Wedge (full)',
    '35-percent-sand-wedge': 'Wedge (35%)',
  };

  function clubsForSpeed(speed) {
    if (speed === 'wedge') return ['full-sand-wedge', '35-percent-sand-wedge'];
    return ['driver', 'mid-iron'];
  }

  function conditionKey(speed, club) {
    return speed + '_' + club;
  }

  function conditionsForSpeed(speed) {
    if (speed === 'wedge') return ['wedge_full-sand-wedge'];
    return [speed + '_driver'];
  }

  function rowsForSpeed(speed) {
    var conds = conditionsForSpeed(speed);
    return state.data.filter(function(r) { return conds.indexOf(r.condition) !== -1; });
  }

  function rowsForCondition(cond) {
    return state.data.filter(function(r) { return r.condition === cond; });
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }



  function getMetricRange(metric, condition) {
    var vals = state.data
      .filter(function (r) { return r.condition === condition; })
      .map(function (r) { return r[metric]; });
    var min = Infinity, max = -Infinity;
    vals.forEach(function (v) {
      if (v < min) min = v;
      if (v > max) max = v;
    });
    return { min: min, max: max };
  }

  function barWidth(value, min, max) {
    if (max === min) return 50;
    return ((value - min) / (max - min)) * 100;
  }

  function fmt(v) {
    if (v === undefined || v === null) return '\u2014';
    return Number(v).toFixed(1);
  }

  function fmtDelta(v1, v2) {
    if (v1 === undefined || v2 === undefined) return '\u2014';
    var d = v2 - v1;
    var pct = v1 !== 0 ? ((d / v1) * 100).toFixed(1) : '\u2014';
    var sign = d > 0 ? '+' : '';
    return sign + d.toFixed(1) + ' (' + sign + pct + '%)';
  }

  function renderTableView() {
    var rows = rowsForSpeed(state.activeSpeed);
    var metric = state.activeMetric;

    rows.sort(function (a, b) {
      var va = a[metric] || 0;
      var vb = b[metric] || 0;
      return state.sortAsc ? va - vb : vb - va;
    });

    if (rows.length === 0) return '<div class="blls-empty">No data for this condition.</div>';

    var bestVal = rows[0][metric];
    var condition = rows[0].condition;
    var range = getMetricRange(metric, condition);

    var html = '<div class="blls-table-wrapper"><table class="blls-table">' +
      '<thead><tr>' +
      '<th class="blls-th-rank">#</th>' +
      '<th class="blls-th-ball">Ball</th>' +
      '<th class="blls-th-val">' + metric + '</th>' +
      '<th class="blls-th-bar"></th>' +
      '</tr></thead><tbody>';

    rows.forEach(function (r, i) {
      var val = r[metric];
      var isBest = i === 0;
      var pct = barWidth(val, range.min, range.max);
      var bestBadge = isBest ? '<span class="blls-badge-best">&#9650; Best</span>' : '';
      var gap = isBest ? '' : '<span class="blls-gap">\u2212' + fmt(bestVal - val) + '</span>';

      html += '<tr class="' + (isBest ? 'blls-row--best' : '') + '">' +
        '<td class="blls-rank">' + (i + 1) + '</td>' +
        '<td class="blls-ball">' + escapeHtml(r.ball) + '</td>' +
        '<td class="blls-val">' + fmt(val) + ' ' + gap + '</td>' +
        '<td class="blls-bar-cell">' + bestBadge + '<div class="blls-bar" style="width:' + pct + '%"></div></td>' +
        '</tr>';
    });

    html += '</tbody></table></div>';
    return html;
  }

  function render() {
    if (!state.meta || !state.data) return;
    var html = '<div class="blls-controls">' +
      renderLayoutButtons() +
      '<span class="blls-ctrl-sep"></span>' +
      renderSpeedButtons() +
      '<span class="blls-ctrl-sep"></span>' +
      renderMetricSelector() +
      renderClubSelector() +
      '</div>';

    html += '<div class="blls-content">';

    if (state.mode === 'table') {
      html += renderTableView();
    } else if (state.mode === 'cards') {
      html += renderCardsView();
    } else if (state.mode === 'scatter') {
      html += renderScatterView();
    }

    html += '</div>';

    document.getElementById('balls-content').innerHTML = html;
    attachEvents();
  }


  function renderCardsView() {
    var rows = rowsForSpeed(state.activeSpeed);
    var metric = state.activeMetric;

    rows.sort(function (a, b) { return (b[metric] || 0) - (a[metric] || 0); });
    if (rows.length === 0) return '<div class="blls-empty">No data for this condition.</div>';

    var bestVal = rows[0][metric];
    var condition = rows[0].condition;
    var range = getMetricRange(metric, condition);

    var html = '<div class="blls-cards-grid">';

    rows.forEach(function (r) {
      var val = r[metric];
      var pct = barWidth(val, range.min, range.max);
      var isBest = val === bestVal;
      var bestBadge = isBest ? '<span class="blls-badge-best">&#9650;</span>' : '';

      html += '<div class="blls-card' + (isBest ? ' blls-card--best' : '') + '">' +
        '<div class="blls-card-name">' + escapeHtml(r.ball) + bestBadge + '</div>' +
        '<div class="blls-card-val">' + fmt(val) + '</div>' +
        '<div class="blls-card-bar-cell"><div class="blls-bar" style="width:' + pct + '%"></div></div>' +
        '</div>';
    });

    html += '</div>';
    return html;
  }

  function renderScatterView() {
    var cond = conditionKey(state.activeSpeed, state.activeClub);
    var rows = rowsForCondition(cond);

    if (!rows.length) return '<div class="blls-empty">No data for this selection</div>';

    var metrics = state.meta.metrics;
    var xMetric = state.scatterXMetric || metrics[0];
    var yMetric = state.scatterYMetric || (metrics[1] || metrics[0]);
    var xRange = getMetricRange(xMetric, cond);
    var yRange = getMetricRange(yMetric, cond);

    var W = 600, H = 400, PAD = 40;
    var xScale = function(v) { return PAD + (v - xRange.min) / (xRange.max - xRange.min || 1) * (W - 2 * PAD); };
    var yScale = function(v) { return H - PAD - (v - yRange.min) / (yRange.max - yRange.min || 1) * (H - 2 * PAD); };

    var html = '<div class="blls-scatter-ctrl">' +
      'X: <select data-action="set-scatter-x">' +
        metrics.map(function(m) { return '<option' + (m === xMetric ? ' selected' : '') + '>' + m + '</option>'; }).join('') +
      '</select> ' +
      'Y: <select data-action="set-scatter-y">' +
        metrics.map(function(m) { return '<option' + (m === yMetric ? ' selected' : '') + '>' + m + '</option>'; }).join('') +
      '</select>' +
      '</div>';

    html += '<div class="blls-scatter-container"><svg class="blls-scatter-svg" viewBox="0 0 ' + W + ' ' + H + '">';

    html += '<line x1="' + PAD + '" y1="' + (H - PAD) + '" x2="' + (W - PAD) + '" y2="' + (H - PAD) + '" stroke="var(--ps-rule-c)" stroke-width="1"/>';
    html += '<line x1="' + PAD + '" y1="' + PAD + '" x2="' + PAD + '" y2="' + (H - PAD) + '" stroke="var(--ps-rule-c)" stroke-width="1"/>';

    rows.forEach(function(r) {
      var xv = r[xMetric], yv = r[yMetric];
      if (xv == null || yv == null) return;
      var cx = xScale(xv), cy = yScale(yv);
      html += '<circle class="blls-scatter-dot" cx="' + cx + '" cy="' + cy + '" r="4" ' +
        'data-ball="' + escapeAttr(r.ball) + '" ' +
        'data-x="' + fmt(xv) + '" data-y="' + fmt(yv) + '"/>';
    });

    html += '</svg></div>';
    html += '<div class="blls-scatter-tooltip" id="blls-scatter-tooltip"></div>';

    return html;
  }

  function renderLayoutButtons() {
    var layouts = [
      { id: 'table', label: 'Table' },
      { id: 'cards', label: 'Cards' },
      { id: 'scatter', label: 'Scatter' },
    ];
    return '<div class="blls-ctrl-group">' +
      '<span class="blls-ctrl-label">Layout</span>' +
      layouts.map(function(l) {
        var active = state.mode === l.id ? ' blls-btn--active' : '';
        return '<button class="blls-btn' + active + '" data-action="set-mode" data-mode="' + l.id + '">' + l.label + '</button>';
      }).join('') +
      '</div>';
  }

  function renderSpeedButtons() {
    var speeds = ['slow', 'mid', 'fast', 'wedge'];
    return '<div class="blls-ctrl-group">' +
      '<span class="blls-ctrl-label">Speed</span>' +
      speeds.map(function(s) {
        var info = SPEED_LABELS[s];
        var active = state.activeSpeed === s ? ' blls-btn--active' : '';
        return '<button class="blls-btn' + active + '" data-action="set-speed" data-speed="' + s + '">' +
          info.label + '<span class="blls-btn-note">' + info.note + '</span>' +
          '</button>';
      }).join('') +
      '</div>';
  }

  function renderMetricSelector() {
    return '<div class="blls-ctrl-group">' +
      '<span class="blls-ctrl-label">Metric</span>' +
      '<select class="blls-select" data-action="set-metric">' +
      state.meta.metrics.map(function(m) {
        var sel = state.activeMetric === m ? ' selected' : '';
        return '<option' + sel + '>' + m + '</option>';
      }).join('') +
      '</select>' +
      '</div>';
  }

  function renderClubSelector() {
    if (state.mode !== 'scatter') return '';
    var clubs = clubsForSpeed(state.activeSpeed);
    return '<div class="blls-ctrl-group">' +
      '<span class="blls-ctrl-label">Club</span>' +
      clubs.map(function(c) {
        var active = state.activeClub === c ? ' blls-btn--active' : '';
        return '<button class="blls-btn' + active + '" data-action="set-club" data-club="' + c + '">' +
          CLUB_LABELS[c] +
          '</button>';
      }).join('') +
      '</div>';
  }

  function attachEvents() {
    var content = document.getElementById('balls-content');
    if (!content) return;

    content.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');

      if (action === 'set-mode') {
        state.mode = btn.getAttribute('data-mode');
        var clubs = clubsForSpeed(state.activeSpeed);
        if (clubs.indexOf(state.activeClub) === -1) state.activeClub = clubs[0];
        render();
      } else if (action === 'set-speed') {
        state.activeSpeed = btn.getAttribute('data-speed');
        var clubs = clubsForSpeed(state.activeSpeed);
        if (clubs.indexOf(state.activeClub) === -1) state.activeClub = clubs[0];
        render();
      } else if (action === 'set-club') {
        state.activeClub = btn.getAttribute('data-club');
        render();
      }
    });

    content.addEventListener('change', function(e) {
      var action = e.target.getAttribute('data-action');
      if (action === 'set-metric') {
        state.activeMetric = e.target.value;
        render();
      } else if (action === 'set-scatter-x') {
        state.scatterXMetric = e.target.value;
        render();
      } else if (action === 'set-scatter-y') {
        state.scatterYMetric = e.target.value;
        render();
      }
    });

    content.addEventListener('mouseover', function(e) {
      var dot = e.target.closest('.blls-scatter-dot');
      if (!dot) return;
      var tip = document.getElementById('blls-scatter-tooltip');
      if (!tip) return;
      tip.textContent = dot.getAttribute('data-ball') +
        ' \u00B7 X: ' + dot.getAttribute('data-x') +
        ' \u00B7 Y: ' + dot.getAttribute('data-y');
      tip.style.display = 'block';
      var rect = dot.getBoundingClientRect();
      tip.style.left = (rect.left + window.scrollX + 12) + 'px';
      tip.style.top = (rect.top + window.scrollY - 28) + 'px';
    });

    content.addEventListener('mouseout', function(e) {
      if (e.target.closest('.blls-scatter-dot')) {
        var tip = document.getElementById('blls-scatter-tooltip');
        if (tip) tip.style.display = 'none';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', fetchData);
})();
