(function () {
  'use strict';

  var API_URL = '/plugins/balls/data';

  var state = {
    meta: null,
    data: null,
    selectedBalls: [],
    activeCondition: 'slow_driver',
    sortBy: null,
    sortAsc: true,
    mode: 'rankings',
    rankingMetric: null,
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
        state.activeCondition = data.conditions[0] || 'slow_driver';
        state.rankingMetric = data.metrics[0] || null;
        state.mode = 'rankings';
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

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function rowsForCondition(condition) {
    return state.data.filter(function (r) { return r.condition === condition; });
  }

  function rowForBall(ball, condition) {
    return state.data.filter(function (r) {
      return r.ball === ball && r.condition === condition;
    })[0] || null;
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
    if (!state.meta) return;
    var container = document.getElementById('balls-content');
    if (!container) return;

    var html = '';
    html += '<div class="blls-controls">';
    html += renderBallSelectors();
    html += '</div>';
    html += renderConditionTabs();

    if (state.mode === 'compare' && state.selectedBalls.length === 2) {
      html += renderCompareHeader();
    }

    if (state.mode === 'rankings') {
      html += renderRankingsTable();
    } else if (state.selectedBalls.length === 0) {
      html += '<div class="blls-empty">Select a ball to view performance data.</div>';
    } else if (state.mode === 'compare' && state.selectedBalls.length === 2) {
      html += renderCompareTable();
    } else {
      html += renderSingleTable();
    }

    container.innerHTML = html;
    attachEvents();
  }

  function renderModeButtons() {
    var modes = [
      { id: 'single',   label: 'Single' },
      { id: 'compare',  label: 'Compare' },
      { id: 'rankings', label: 'Rankings' },
    ];
    var h = '<div class="blls-mode-buttons">';
    modes.forEach(function (m) {
      var active = state.mode === m.id ? ' blls-mode--active' : '';
      h += '<button class="blls-mode-btn' + active + '" data-mode="' + m.id + '">' + m.label + '</button>';
    });
    h += '</div>';
    return h;
  }

  function renderMetricSelector() {
    var h = '<div class="blls-ball-selector">';
    h += '  <label>Metric</label>';
    h += '  <select id="blls-metric">';
    state.meta.metrics.forEach(function (m) {
      var displayName = m.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      var sel = state.rankingMetric === m ? ' selected' : '';
      h += '    <option value="' + escapeAttr(m) + '"' + sel + '>' + escapeHtml(displayName) + '</option>';
    });
    h += '  </select>';
    h += '</div>';
    return h;
  }

  function renderBallSelectors() {
    var h = '';
    h += renderModeButtons();

    if (state.mode === 'rankings') {
      h += renderMetricSelector();
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
    }

    return h;
  }

  function renderConditionTabs() {
    var labels = {
      'slow_driver': 'Driver (Slow)',
      'slow_mid-iron': '7-Iron (Slow)',
      'wedge-35-percent_sand-wedge': '35% Wedge',
      'wedge-full_sand-wedge': 'Full Wedge',
    };
    var h = '<div class="blls-condition-tabs">';
    state.meta.conditions.forEach(function (c) {
      var active = c === state.activeCondition ? ' blls-tab--active' : '';
      var label = labels[c] || c;
      h += '<button class="blls-tab' + active + '" data-condition="' + escapeAttr(c) + '">' + escapeHtml(label) + '</button>';
    });
    h += '</div>';
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

    state.meta.metrics.forEach(function (m) {
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
    h += '</tr></thead><tbody>';

    rows.forEach(function (r, i) {
      var val = r[metric];
      var bw = barWidth(val, range.min, range.max);
      var isBest = i === 0;
      h += '<tr class="' + (isBest ? 'blls-row--best' : '') + '">';
      h += '<td class="blls-rank-col">' + (i + 1) + '</td>';
      h += '<td>' + escapeHtml(r.ball) + '</td>';
      h += '<td><span class="blls-value' + (isBest ? ' blls-value--best' : '') + '">' + fmt(val) + '</span></td>';
      h += '<td class="blls-bar-cell"><span class="blls-bar' + (isBest ? ' blls-bar--best' : '') + '" style="width:' + bw.toFixed(0) + '%"></span></td>';
      h += '</tr>';
    });

    h += '</tbody></table></div>';
    return h;
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
        if (mode === 'rankings') {
          setState({ mode: 'rankings', selectedBalls: [], rankingMetric: state.rankingMetric || state.meta.metrics[0] });
        } else if (mode === 'compare') {
          setState({ mode: 'compare', selectedBalls: state.selectedBalls.length > 0 ? [state.selectedBalls[0]] : [] });
        } else {
          setState({ mode: 'single', selectedBalls: state.selectedBalls.length > 0 ? [state.selectedBalls[0]] : [] });
        }
      };
    });

    var metricSel = document.getElementById('blls-metric');
    if (metricSel) {
      metricSel.onchange = function () {
        setState({ rankingMetric: this.value });
      };
    }

    var condContainer = document.getElementById('balls-content').querySelector('.blls-condition-tabs');
    if (condContainer) {
      condContainer.onclick = function (e) {
        var tab = e.target.closest('.blls-tab');
        if (tab && tab.getAttribute('data-condition')) {
          setState({ activeCondition: tab.getAttribute('data-condition'), sortBy: null });
        }
      };
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
