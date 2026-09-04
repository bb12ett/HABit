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
  destroySavingsAccountChart();
}

function buildYearDatasets(monthData, curr, sel, cfg) {
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
    // 1. Planned Savings Curve (Dashed line across all months)
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

  return datasets;
}

export function updateYearBalancesChart(monthData, curr, sel, cfg) {
  if (!yearChartInstance) return false;
  try {
    yearChartInstance.data.labels = monthData.map(d => d.label || d.month);
    yearChartInstance.data.datasets = buildYearDatasets(monthData, curr, sel, cfg);
    yearChartInstance.update();
    return true;
  } catch (e) {
    console.warn("Error updating year chart in place:", e);
    return false;
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
  const labels = monthData.map(d => d.label || d.month);
  const datasets = buildYearDatasets(monthData, curr, sel, cfg);

  yearChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
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

let savingsDetailChartInstance = null;

export function destroySavingsAccountChart() {
  if (savingsDetailChartInstance) {
    try {
      savingsDetailChartInstance.destroy();
    } catch (e) {
      console.warn("Savings detail chart destroy error:", e);
    }
    savingsDetailChartInstance = null;
  }
}

function buildSavingsDetailDatasets(chartData) {
  const datasets = [];

  // 1. Planned Target Curve
  datasets.push({
    label: '🎯 Planned Target',
    data: chartData.planned,
    borderColor: '#c084fc',
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    borderWidth: 2,
    borderDash: [5, 4],
    pointRadius: 3,
    pointHoverRadius: 6,
    tension: 0.25,
    fill: false
  });

  // 2. Actual Check-Ins Curve (points up to latest actual)
  const hasActuals = (chartData.actual || []).some(v => v !== null && v !== undefined);
  if (hasActuals) {
    datasets.push({
      label: '📊 Actual Check-Ins',
      data: chartData.actual,
      borderColor: '#38bdf8',
      backgroundColor: '#38bdf8',
      borderWidth: 3,
      pointRadius: 5,
      pointHoverRadius: 8,
      tension: 0.2,
      fill: false
    });
  }

  // 3. Trend Forecast (Dotted line extrapolated forward from latest actual)
  const hasForecast = (chartData.forecast || []).some(v => v !== null && v !== undefined);
  if (hasForecast) {
    datasets.push({
      label: '🔮 Trend Forecast (Based on Actuals)',
      data: chartData.forecast,
      borderColor: '#fbbf24',
      backgroundColor: '#fbbf24',
      borderWidth: 2.5,
      borderDash: [6, 4],
      pointRadius: 4,
      pointHoverRadius: 7,
      tension: 0.2,
      fill: false
    });
  }

  return datasets;
}

export function updateSavingsAccountChart(chartData, curr) {
  if (!savingsDetailChartInstance) return false;
  try {
    savingsDetailChartInstance.data.labels = chartData.labels;
    savingsDetailChartInstance.data.datasets = buildSavingsDetailDatasets(chartData);
    savingsDetailChartInstance.update();
    return true;
  } catch (e) {
    console.warn("Error updating savings detail chart:", e);
    return false;
  }
}

export function renderSavingsAccountChart(canvasEl, chartData, curr) {
  if (!canvasEl) return;
  destroySavingsAccountChart();

  if (typeof Chart === 'undefined') {
    canvasEl.parentElement.innerHTML = '<div style="padding:20px; color:var(--amber); text-align:center;">⚠️ Chart engine blocked by browser tracking prevention.</div>';
    return;
  }

  try {
    const existing = Chart.getChart(canvasEl);
    if (existing) existing.destroy();
  } catch (e) {}

  const ctx = canvasEl.getContext('2d');
  const labels = chartData.labels;
  const datasets = buildSavingsDetailDatasets(chartData);

  savingsDetailChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#cbd5e1', boxWidth: 12, font: { size: 11.5, weight: '600' } }
        },
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
        x: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
        y: {
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            callback: v => curr + Number(v).toLocaleString()
          }
        }
      }
    }
  });
}

let categoryChartInstance = null;

export function destroyCategoryChart() {
  if (categoryChartInstance) {
    try {
      categoryChartInstance.destroy();
    } catch (e) {
      console.warn("Category chart destroy error:", e);
    }
    categoryChartInstance = null;
  }
}

export function renderCategoryDonutChart(canvasEl, categoryList, curr) {
  if (!canvasEl) return;
  destroyCategoryChart();

  if (typeof Chart === 'undefined') {
    canvasEl.parentElement.innerHTML = '<div style="padding:20px; color:var(--amber); text-align:center;">⚠️ Chart engine blocked by browser tracking prevention.</div>';
    return;
  }

  try {
    const existing = Chart.getChart(canvasEl);
    if (existing) existing.destroy();
  } catch (e) {}

  const validCategories = (categoryList || []).filter(c => c.totalAmount > 0 && c.category.id !== 'transfers');

  if (!validCategories.length) {
    const parent = canvasEl.parentElement;
    parent.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-muted); font-size:12.5px; text-align:center; padding:30px;">
        <span style="font-size:32px; margin-bottom:8px;">📊</span>
        <span>No categorized spend found for this period.</span>
      </div>
    `;
    return;
  }

  const ctx = canvasEl.getContext('2d');
  const labels = validCategories.map(c => `${c.category.icon} ${c.category.label}`);
  const data = validCategories.map(c => Number(c.totalAmount.toFixed(2)));
  const backgroundColors = validCategories.map(c => c.category.color);

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        borderWidth: 2,
        borderColor: '#0f172a',
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#cbd5e1',
            boxWidth: 12,
            font: { size: 11, family: 'Inter, -apple-system, sans-serif' },
            padding: 10
          }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: '#475569',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: function(context) {
              const val = Number(context.raw || 0);
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
              return ` ${curr}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

if (typeof window !== 'undefined') {
  window.renderCategoryDonutChart = renderCategoryDonutChart;
  window.destroyCategoryChart = destroyCategoryChart;
}
