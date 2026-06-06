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

  function setState(update) {
    for (var k in update) {
      if (update.hasOwnProperty(k)) state[k] = update[k];
    }
    render();
  }

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

  function deltaClass(d) {
    if (d === undefined || d === null) return 'blls-delta--zero';
    if (Math.abs(d) < 0.05) return 'blls-delta--zero';
    return d > 0 ? 'blls-delta' : 'blls-delta--neg';
  }

  function render() {
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
      // renderTableView will be added in a later task
    } else if (state.mode === 'cards') {
      // renderCardsView will be added in a later task
    } else if (state.mode === 'scatter') {
      // renderScatterView will be added in a later task
    }

    html += '</div>';

    document.getElementById('balls-content').innerHTML = html;
    attachEvents();
  }

  function conditionLabel(condition) {
    var p = parseCondition(condition);
    if (!p.shot) return condition;
    return p.shot;
  }

  function renderModeButtons() {
    var modes = [
      { id: 'single',   label: 'Single' },
      { id: 'compare',  label: 'Compare' },
      { id: 'rankings', label: 'Rankings' },
      { id: 'matrix',   label: 'Matrix' },
      { id: 'cards',    label: 'Cards' },
      { id: 'scatter',  label: 'Scatter' },
    ];
    var h = '<div class="blls-mode-buttons">';
    modes.forEach(function (m) {
      var active = state.mode === m.id ? ' blls-mode--active' : '';
      h += '<button class="blls-mode-btn' + active + '" data-mode="' + m.id + '">' + m.label + '</button>';
    });
    h += '</div>';
    return h;
  }

  function renderMetricSelector(id, stateKey, label) {
    var h = '<div class="blls-ball-selector">';
    h += '  <label>' + escapeHtml(label) + '</label>';
    h += '  <select id="' + escapeAttr(id) + '">';
    state.meta.metrics.forEach(function (m) {
      var displayName = m.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      var sel = state[stateKey] === m ? ' selected' : '';
      h += '    <option value="' + escapeAttr(m) + '"' + sel + '>' + escapeHtml(displayName) + '</option>';
    });
    h += '  </select>';
    h += '</div>';
    return h;
  }

  function renderSingleMetricSelector() {
    var h = '<div class="blls-ball-selector">';
    h += '  <label>Metric</label>';
    h += '  <select id="blls-single-metric">';
    h += '    <option value="">All Metrics</option>';
    state.meta.metrics.forEach(function (m) {
      var displayName = m.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      var sel = state.singleMetric === m ? ' selected' : '';
      h += '    <option value="' + escapeAttr(m) + '"' + sel + '>' + escapeHtml(displayName) + '</option>';
    });
    h += '  </select>';
    h += '</div>';
    return h;
  }

  function renderBallSelectors() {
    var h = '';
    h += renderModeButtons();

    if (state.mode === 'scatter') {
      h += renderMetricSelector('blls-scatter-x', 'scatterXMetric', 'X Metric');
      h += renderMetricSelector('blls-scatter-y', 'scatterYMetric', 'Y Metric');
    } else if (state.mode === 'rankings' || state.mode === 'matrix' || state.mode === 'cards') {
      h += renderMetricSelector('blls-metric', 'rankingMetric', 'Metric');
    } else {
      h += '<div class="blls-ball-selector">';
      h += '  <label>Ball</label>';
      h += '  <select id="blls-ball-1">';
      h += '    <option value="">Select a ball...</option>';
      state.meta.balls.forEach(function (b) {
        var sel = state.selectedBalls[0] === b ? ' selected' : '';
        if (state.mode === 'compare' && state.selectedBalls[1] === b) return;
        h += '    <option value="' + escapeAttr(b) + '"' + sel + '>' + escapeHtml(b) + '</option>';
      });
      h += '  </select>';
      h += '</div>';

      if (state.mode === 'compare') {
        h += '<div class="blls-ball-selector">';
        h += '  <label>vs</label>';
        h += '  <select id="blls-ball-2">';
        h += '    <option value="">Select a ball...</option>';
        state.meta.balls.forEach(function (b) {
          var sel = state.selectedBalls[1] === b ? ' selected' : '';
          if (state.selectedBalls[0] === b) return;
          h += '    <option value="' + escapeAttr(b) + '"' + sel + '>' + escapeHtml(b) + '</option>';
        });
        h += '  </select>';
        h += '</div>';
      }

      h += renderSingleMetricSelector();
    }

    return h;
  }

  function renderConditionTabs() {
    var h = '<div class="blls-condition-tabs"><div class="blls-cond-filters">';

    h += '<div class="blls-cond-group">';
    h += '<span class="blls-cond-label">Speed</span>';
    getSpeedOptions().forEach(function (s) {
      var active = s === state.activeSpeed ? ' blls-cond-btn--active' : '';
      h += '<button class="blls-cond-btn' + active + '" data-cond-speed="' + escapeAttr(s) + '">' + escapeHtml(s) + '</button>';
    });
    h += '</div>';

    h += '<div class="blls-cond-group">';
    h += '<span class="blls-cond-label">Club</span>';
    getShotOptions().forEach(function (s) {
      var active = s === state.activeShot ? ' blls-cond-btn--active' : '';
      h += '<button class="blls-cond-btn' + active + '" data-cond-shot="' + escapeAttr(s) + '">' + escapeHtml(s) + '</button>';
    });
    h += '</div>';

    h += '</div></div>';
    return h;
  }

  function renderCompareHeader() {
    var b1 = state.selectedBalls[0];
    var b2 = state.selectedBalls[1];
    return '<div class="blls-compare-header">' +
      '<span>' + escapeHtml(b1) + '</span>' +
      '<span class="blls-vs">vs</span>' +
      '<span>' + escapeHtml(b2) + '</span>' +
      '</div>';
  }

  function sortedMetrics(ballRow) {
    if (!state.sortBy) return state.meta.metrics.slice();
    var metrics = state.meta.metrics.slice();
    metrics.sort(function (a, b) {
      var va = ballRow ? (ballRow[a] || 0) : 0;
      var vb = ballRow ? (ballRow[b] || 0) : 0;
      return state.sortAsc ? va - vb : vb - va;
    });
    return metrics;
  }

  function sortArrow() {
    if (!state.sortBy) return '';
    return state.sortAsc ? ' \u25B2' : ' \u25BC';
  }

  function renderSingleTable() {
    var ball = state.selectedBalls[0];
    var ballRow = rowForBall(ball, state.activeCondition);
    if (!ballRow) return '<div class="blls-empty">No data for ' + escapeHtml(ball) + ' under this condition.</div>';

    var h = '<div class="blls-table-wrapper"><table class="blls-table">';
    h += '<thead><tr>';
    h += '<th>Metric</th>';
    h += '<th class="blls-sortable' + (state.sortBy ? ' blls-sorted' : '') + '">' + escapeHtml(ball) + sortArrow() + '</th>';
    h += '<th>Range</th>';
    h += '</tr></thead><tbody>';

    var metrics = sortedMetrics(ballRow);
    if (state.singleMetric) metrics = metrics.filter(function (m) { return m === state.singleMetric; });
    metrics.forEach(function (m) {
      var range = getMetricRange(m, state.activeCondition);
      var val = ballRow[m];
      var bw = barWidth(val, range.min, range.max);
      var displayName = m.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      h += '<tr>';
      h += '<td class="blls-metric-name">' + escapeHtml(displayName) + '</td>';
      h += '<td><span class="blls-value">' + fmt(val) + '</span></td>';
      h += '<td class="blls-bar-cell"><span class="blls-bar" style="width:' + bw.toFixed(0) + '%"></span></td>';
      h += '</tr>';
    });

    h += '</tbody></table></div>';
    return h;
  }

  function renderCompareTable() {
    var b1 = state.selectedBalls[0];
    var b2 = state.selectedBalls[1];
    var r1 = rowForBall(b1, state.activeCondition);
    var r2 = rowForBall(b2, state.activeCondition);

    if (!r1 || !r2) {
      return '<div class="blls-empty">One or both balls have no data for this condition.</div>';
    }

    var h = '<div class="blls-table-wrapper"><table class="blls-table">';
    h += '<thead><tr>';
    h += '<th>Metric</th>';
    h += '<th>' + escapeHtml(b1) + '</th>';
    h += '<th>' + escapeHtml(b2) + '</th>';
    h += '<th>\u0394</th>';
    h += '</tr></thead><tbody>';

    var compareMetrics = state.meta.metrics.slice();
    if (state.singleMetric) compareMetrics = compareMetrics.filter(function (m) { return m === state.singleMetric; });
    compareMetrics.forEach(function (m) {
      var v1 = r1[m];
      var v2 = r2[m];
      var d = (v2 !== undefined && v1 !== undefined) ? v2 - v1 : undefined;
      var displayName = m.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      h += '<tr>';
      h += '<td class="blls-metric-name">' + escapeHtml(displayName) + '</td>';
      h += '<td><span class="blls-value">' + fmt(v1) + '</span></td>';
      h += '<td><span class="blls-value">' + fmt(v2) + '</span></td>';
      h += '<td><span class="blls-value ' + deltaClass(d) + '">' + fmtDelta(v1, v2) + '</span></td>';
      h += '</tr>';
    });

    h += '</tbody></table></div>';
    return h;
  }

  function renderRankingsTable() {
    var metric = state.rankingMetric;
    if (!metric) return '<div class="blls-empty">Select a metric to rank balls.</div>';

    var condition = state.activeCondition;
    var rows = rowsForCondition(condition)
      .filter(function (r) { return r[metric] !== undefined && r[metric] !== null; })
      .slice()
      .sort(function (a, b) { return b[metric] - a[metric]; });

    if (rows.length === 0) return '<div class="blls-empty">No data for this condition.</div>';

    var range = getMetricRange(metric, condition);
    var metricLabel = metric.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });

    var h = '<div class="blls-table-wrapper"><table class="blls-table blls-rank-table">';
    h += '<thead><tr>';
    h += '<th class="blls-rank-col">#</th>';
    h += '<th>Ball</th>';
    h += '<th>' + escapeHtml(metricLabel) + '</th>';
    h += '<th>Range</th>';
    h += '<th>vs Best</th>';
    h += '</tr></thead><tbody>';

    var bestVal = rows.length > 0 ? rows[0][metric] : undefined;

    rows.forEach(function (r, i) {
      var val = r[metric];
      var bw = barWidth(val, range.min, range.max);
      var isBest = i === 0;
      var gap = i > 0 && bestVal !== undefined ? bestVal - val : 0;
      h += '<tr class="' + (isBest ? 'blls-row--best' : '') + '">';
      h += '<td class="blls-rank-col">' + (i + 1) + '</td>';
      h += '<td>' + escapeHtml(r.ball) + '</td>';
      h += '<td><span class="blls-value' + (isBest ? ' blls-value--best' : '') + '">' + fmt(val) + '</span></td>';
      h += '<td class="blls-bar-cell"><span class="blls-bar' + (isBest ? ' blls-bar--best' : '') + '" style="width:' + bw.toFixed(0) + '%"></span></td>';
      h += '<td>';
      if (isBest) {
        h += '<span class="blls-badge-best">\u25B2 best</span>';
      } else {
        h += '<span class="blls-gap">\u2212' + fmt(gap) + '</span>';
      }
      h += '</td>';
      h += '</tr>';
    });

    h += '</tbody></table></div>';
    return h;
  }

  function renderMatrixTable() {
    var metric = state.rankingMetric;
    if (!metric) return '<div class="blls-empty">Select a metric.</div>';

    var conditions = state.meta.conditions;
    var metricLabel = metric.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });

    var ballRows = {};
    var bestPerCondition = {};
    conditions.forEach(function (c) {
      bestPerCondition[c] = { val: -Infinity, ball: null };
    });

    state.data.forEach(function (r) {
      if (!ballRows[r.ball]) ballRows[r.ball] = {};
      ballRows[r.ball][r.condition] = r;
      var val = r[metric];
      if (val !== undefined && val > bestPerCondition[r.condition].val) {
        bestPerCondition[r.condition] = { val: val, ball: r.ball };
      }
    });

    var ranges = {};
    conditions.forEach(function (c) {
      ranges[c] = getMetricRange(metric, c);
    });

    var ballNames = Object.keys(ballRows).sort(function (a, b) {
      var ra = ballRows[a][conditions[0]];
      var rb = ballRows[b][conditions[0]];
      return (rb && rb[metric] || 0) - (ra && ra[metric] || 0);
    });

    var h = '<div class="blls-table-wrapper"><table class="blls-table blls-matrix-table">';
    h += '<thead><tr>';
    h += '<th>Ball</th>';
    conditions.forEach(function (c) {
      h += '<th>' + escapeHtml(conditionLabel(c)) + '</th>';
    });
    h += '</tr></thead><tbody>';

    ballNames.forEach(function (ball) {
      h += '<tr>';
      h += '<td class="blls-matrix-ball">' + escapeHtml(ball) + '</td>';
      conditions.forEach(function (c) {
        var row = ballRows[ball][c];
        var val = row ? row[metric] : undefined;
        var best = bestPerCondition[c];
        var isBest = best && best.ball === ball;

        if (val === undefined) {
          h += '<td class="blls-matrix-cell"><span class="blls-value">\u2014</span></td>';
          return;
        }

        var range = ranges[c];
        var bw = barWidth(val, range.min, range.max);
        var gap = best && !isBest ? best.val - val : 0;

        h += '<td class="blls-matrix-cell' + (isBest ? ' blls-cell--best' : '') + '">';
        h += '<div class="blls-matrix-val">';
        h += '<span class="blls-value' + (isBest ? ' blls-value--best' : '') + '">' + fmt(val) + '</span>';
        if (isBest) {
          h += '<span class="blls-badge-best">\u25B2 best</span>';
        } else if (gap > 0) {
          h += '<span class="blls-gap">\u2212' + fmt(gap) + '</span>';
        }
        h += '</div>';
        h += '<span class="blls-bar blls-matrix-bar' + (isBest ? ' blls-bar--best' : '') + '" style="width:' + bw.toFixed(0) + '%"></span>';
        h += '</td>';
      });
      h += '</tr>';
    });

    h += '</tbody></table></div>';
    return h;
  }

  function renderCardsView() {
    var metric = state.rankingMetric;
    if (!metric) return '<div class="blls-empty">Select a metric.</div>';

    var metricLabel = metric.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    var h = '<div class="blls-cards-grid">';

    state.meta.conditions.forEach(function (c) {
      var condRows = rowsForCondition(c)
        .filter(function (r) { return r[metric] !== undefined && r[metric] !== null; })
        .slice()
        .sort(function (a, b) { return b[metric] - a[metric]; });

      if (condRows.length === 0) return;

      var range = getMetricRange(metric, c);
      var bestVal = condRows[0][metric];

      h += '<div class="blls-card">';
      h += '<div class="blls-card-header">' + escapeHtml(conditionLabel(c)) + '</div>';
      h += '<div class="blls-card-body">';

      condRows.forEach(function (r, i) {
        var val = r[metric];
        var bw = barWidth(val, range.min, range.max);
        var isBest = i === 0;
        var gap = i > 0 ? bestVal - val : 0;
        h += '<div class="blls-card-row' + (isBest ? ' blls-row--best' : '') + '">';
        h += '<span class="blls-card-rank">' + (i + 1) + '</span>';
        h += '<span class="blls-card-ball">' + escapeHtml(r.ball) + '</span>';
        h += '<span class="blls-card-val"><span class="blls-value' + (isBest ? ' blls-value--best' : '') + '">' + fmt(val) + '</span></span>';
        h += '<span class="blls-card-gap">';
        if (isBest) {
          h += '<span class="blls-badge-best">\u25B2 best</span>';
        } else {
          h += '<span class="blls-gap">\u2212' + fmt(gap) + '</span>';
        }
        h += '</span>';
        h += '<span class="blls-card-bar"><span class="blls-bar' + (isBest ? ' blls-bar--best' : '') + '" style="width:' + bw.toFixed(0) + '%"></span></span>';
        h += '</div>';
      });

      h += '</div></div>';
    });

    h += '</div>';
    return h;
  }

  function renderScatterView() {
    var xMetric = state.scatterXMetric;
    var yMetric = state.scatterYMetric;
    if (!xMetric || !yMetric) return '<div class="blls-empty">Select X and Y metrics.</div>';

    var condition = state.activeCondition;
    var rows = rowsForCondition(condition);
    if (rows.length === 0) return '<div class="blls-empty">No data for this condition.</div>';

    var xRange = getMetricRange(xMetric, condition);
    var yRange = getMetricRange(yMetric, condition);

    var W = 700, H = 420;
    var PAD = { top: 16, right: 16, bottom: 40, left: 56 };
    var plotW = W - PAD.left - PAD.right;
    var plotH = H - PAD.top - PAD.bottom;

    function scaleX(v) { return PAD.left + ((v - xRange.min) / ((xRange.max - xRange.min) || 1)) * plotW; }
    function scaleY(v) { return PAD.top + plotH - ((v - yRange.min) / ((yRange.max - yRange.min) || 1)) * plotH; }

    var xLabel = xMetric.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    var yLabel = yMetric.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });

    var h = '<div class="blls-scatter-container">';
    h += '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" class="blls-scatter-svg">';

    h += '<line x1="' + PAD.left + '" y1="' + PAD.top + '" x2="' + PAD.left + '" y2="' + (PAD.top + plotH) + '" stroke="var(--ps-bord)" />';
    h += '<line x1="' + PAD.left + '" y1="' + (PAD.top + plotH) + '" x2="' + (PAD.left + plotW) + '" y2="' + (PAD.top + plotH) + '" stroke="var(--ps-bord)" />';

    h += '<text x="' + (PAD.left + plotW / 2) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="11" fill="var(--ps-ink-2)" font-family="var(--ps-font-mono, monospace)">' + escapeHtml(xLabel) + '</text>';
    h += '<text x="12" y="' + (PAD.top + plotH / 2) + '" text-anchor="middle" font-size="11" fill="var(--ps-ink-2)" font-family="var(--ps-font-mono, monospace)" transform="rotate(-90, 12, ' + (PAD.top + plotH / 2) + ')">' + escapeHtml(yLabel) + '</text>';

    rows.forEach(function (r) {
      var xv = r[xMetric], yv = r[yMetric];
      if (xv === undefined || yv === undefined) return;
      var cx = scaleX(xv), cy = scaleY(yv);
      h += '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="var(--ps-green)" opacity="0.55" class="blls-scatter-dot" data-ball="' + escapeAttr(r.ball) + '" />';
    });

    h += '</svg>';
    h += '<div class="blls-scatter-tooltip" id="blls-scatter-tooltip"></div>';
    h += '</div>';
    return h;
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
    var sel1 = document.getElementById('blls-ball-1');
    if (sel1) {
      sel1.onchange = function () {
        var val = this.value;
        if (val) setState({ selectedBalls: [val], sortBy: null });
      };
    }

    var sel2 = document.getElementById('blls-ball-2');
    if (sel2) {
      sel2.onchange = function () {
        var val = this.value;
        if (val) setState({ selectedBalls: [state.selectedBalls[0], val] });
      };
    }

    var modeBtns = document.querySelectorAll('.blls-mode-btn');
    modeBtns.forEach(function (btn) {
      btn.onclick = function () {
        var mode = this.getAttribute('data-mode');
        if (state.mode === mode) return;
        if (mode === 'rankings' || mode === 'matrix' || mode === 'cards') {
          setState({ mode: mode, selectedBalls: [], rankingMetric: state.rankingMetric || state.meta.metrics[0] });
        } else if (mode === 'scatter') {
          setState({ mode: 'scatter', selectedBalls: [] });
        } else if (mode === 'compare') {
          setState({ mode: 'compare', selectedBalls: state.selectedBalls.length > 0 ? [state.selectedBalls[0]] : [] });
        } else {
          setState({ mode: 'single', selectedBalls: state.selectedBalls.length > 0 ? [state.selectedBalls[0]] : [] });
        }
      };
    });

    var singleMetricSel = document.getElementById('blls-single-metric');
    if (singleMetricSel) {
      singleMetricSel.onchange = function () {
        setState({ singleMetric: this.value || null, sortBy: null });
      };
    }

    var metricSel = document.getElementById('blls-metric');
    if (metricSel) {
      metricSel.onchange = function () {
        setState({ rankingMetric: this.value });
      };
    }

    var scatterXSel = document.getElementById('blls-scatter-x');
    if (scatterXSel) {
      scatterXSel.onchange = function () {
        setState({ scatterXMetric: this.value });
      };
    }

    var scatterYSel = document.getElementById('blls-scatter-y');
    if (scatterYSel) {
      scatterYSel.onchange = function () {
        setState({ scatterYMetric: this.value });
      };
    }

    var condContainer = document.getElementById('balls-content').querySelector('.blls-condition-tabs');
    if (condContainer) {
      condContainer.onclick = function (e) {
        var speedBtn = e.target.closest('[data-cond-speed]');
        if (speedBtn) {
          var speed = speedBtn.getAttribute('data-cond-speed');
          var c = conditionFor(speed, state.activeShot);
          if (c) setState({ activeCondition: c, activeSpeed: speed, sortBy: null });
          return;
        }
        var shotBtn = e.target.closest('[data-cond-shot]');
        if (shotBtn) {
          var shot = shotBtn.getAttribute('data-cond-shot');
          var c = conditionFor(state.activeSpeed, shot);
          if (c) setState({ activeCondition: c, activeShot: shot, sortBy: null });
          return;
        }
      };
    }

    // Scatter tooltip
    var scatterSvg = document.querySelector('.blls-scatter-svg');
    if (scatterSvg) {
      scatterSvg.addEventListener('mousemove', function (e) {
        var target = e.target;
        if (target.tagName === 'circle' && target.getAttribute('data-ball')) {
          var tooltip = document.getElementById('blls-scatter-tooltip');
          if (tooltip) {
            tooltip.textContent = target.getAttribute('data-ball');
            tooltip.style.display = 'block';
            tooltip.style.left = (e.pageX + 12) + 'px';
            tooltip.style.top = (e.pageY - 28) + 'px';
          }
        }
      });
      scatterSvg.addEventListener('mouseleave', function () {
        var tooltip = document.getElementById('blls-scatter-tooltip');
        if (tooltip) tooltip.style.display = 'none';
      });
    }

    // Sort toggle on ball column header
    var tableWrapper = document.querySelector('.blls-table-wrapper');
    if (tableWrapper) {
      tableWrapper.onclick = function (e) {
        var th = e.target.closest('.blls-sortable');
        if (!th) return;
        if (!state.sortBy) {
          setState({ sortBy: true, sortAsc: true });
        } else {
          setState({ sortAsc: !state.sortAsc });
        }
      };
    }
  }

  document.addEventListener('DOMContentLoaded', fetchData);
})();
