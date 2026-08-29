import { months } from './state.js';

let yearChartInstance = null;

export function destroyYearChart() {
  if (yearChartInstance) {
    try {
      yearChartInstance.destroy();
    } catch (e) {
      console.warn("Chart destroy error:", e);
    }
    yearChartInstance = null;
  }
}

export function renderYearBalancesChart(canvasEl, monthData, curr, sel, cfg) {
  if (!canvasEl) return;
  destroyYearChart();

  if (typeof Chart === 'undefined') {
    canvasEl.parentElement.innerHTML = '<div style="padding:20px; color:var(--amber); text-align:center;">⚠️ Chart engine blocked by browser tracking prevention. Unblock jsdelivr.net to view charts.</div>';
    return;
  }

  const ctx = canvasEl.getContext('2d');
  const datasets = [];

  if (sel.current && sel.current.length > 0) {
    datasets.push({
      label: '🏦 Current Accounts',
      data: monthData.map(d => d.current),
      borderColor: '#38bdf8',
      backgroundColor: '#38bdf8',
      borderWidth: 2,
      tension: 0.3,
      fill: false
    });
  }

  if (sel.credit && sel.credit.length > 0) {
    datasets.push({
      label: '💳 Credit Card Debt',
      data: monthData.map(d => d.credit),
      borderColor: '#f87171',
      backgroundColor: '#f87171',
      borderWidth: 2,
      borderDash: [5, 5],
      tension: 0.3,
      fill: false
    });
  }

  if (cfg.track_savings && sel.savings && sel.savings.length > 0) {
    // 1. Planned Savings Curve (Dashed line across all 12 months)
    datasets.push({
      label: '📈 Planned Savings',
      data: monthData.map(d => d.savings),
      borderColor: '#c084fc',
      backgroundColor: '#c084fc',
      borderWidth: 2,
      borderDash: [4, 4],
      tension: 0.3,
      fill: false
    });

    // 2. Actual Savings Curve (Solid line with distinct points for recorded months)
    const actualSavingsPoints = monthData.map(d => d.actualSavings);
    if (actualSavingsPoints.some(v => v !== null)) {
      datasets.push({
        label: '📈 Actual Savings Balance',
        data: actualSavingsPoints,
        borderColor: '#a855f7',
        backgroundColor: '#a855f7',
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.2,
        fill: false
      });
    }
  }

  // Net Position
  datasets.push({
    label: '💎 Net Position',
    data: monthData.map(d => d.net),
    borderColor: '#34d399',
    backgroundColor: '#34d399',
    borderWidth: 2.5,
    tension: 0.3,
    fill: false
  });

  yearChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels: months, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#cbd5e1', boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                label += curr + Number(context.parsed.y).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
        y: {
          grid: { color: '#334155' },
          ticks: {
            color: '#94a3b8',
            callback: v => curr + Number(v).toLocaleString()
          }
        }
      }
    }
  });
}
