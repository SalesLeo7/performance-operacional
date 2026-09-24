const IS_ADMIN = window.DASHBOARD_MODE === "admin";
const PAGE_CONFIG = [
  { id: "Resumo", short: "R", subtitle: "Leitura executiva de Recebimento, Expedição e Inventário" },
  { id: "Recebimento", short: "REC", subtitle: "Performance Gross e NET, capacidade e tempos do Inbound" },
  { id: "Expedição", short: "EXP", subtitle: IS_ADMIN ? "Gross, NET, capacidade e tempos do Outbound" : "Performance Gross e NET, capacidade e tempos do Outbound" },
  { id: "Inventário", short: "INV", subtitle: "Última quantidade física observada e divergências" },
  { id: "Detalhes", short: "DET", subtitle: "Exceções e processos para ação" },
  ...(IS_ADMIN ? [{ id: "Administração", short: "ADM", subtitle: "Base, cobertura, divergências e controles internos" }] : []),
];

const state = { page: "Resumo", client: "", owner: "ALL", monthCount: 3, periodMode: "month", periodMonth: "", periodDate: "", periodStart: "", periodEnd: "", detailOperation: "Todos", detailPerformance: "Todos", search: "", selectedProcess: "" };
let dataset;

const fmt = new Intl.NumberFormat("pt-BR");
const fmt1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const fmtCompact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const pct = value => value == null || !Number.isFinite(value) ? "—" : value.toLocaleString("pt-BR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pp = value => value == null || !Number.isFinite(value) ? "—" : `${value >= 0 ? "+" : ""}${(value * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} p.p.`;
const hours = value => value == null || !Number.isFinite(value) ? "—" : `${fmt1.format(value)} h`;
const monthLabel = month => new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`)).replace(" de ", "/");
const dateLabel = value => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
const htmlEscape = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function clientInfo() { return dataset.clients.find(item => item.key === state.client); }
function ownerMatches(item) { return state.owner === "ALL" || item.ownerKey === state.owner; }
function clientMetrics(operation) { return dataset.metrics.filter(item => item.clientKey === state.client && (!operation || item.operation === operation) && ownerMatches(item)); }
function selectedOwnerLabel() { return state.owner === "ALL" ? "Todos os owners" : clientInfo()?.owners?.find(item => item.key === state.owner)?.name || state.owner; }
function selectedCapacity(operation = "Outbound") {
  const profiles = (dataset.capacityProfiles || []).filter(item => item.clientKey === state.client && (item.operation || "Outbound") === operation);
  if (state.owner !== "ALL") return profiles.find(item => item.appliedToOwner === state.owner) || {};
  if (operation === "Outbound") return clientInfo()?.capacity || {};
  const relevant = profiles.filter(item => item.appliedToOwner !== "HISTORICO" && (item.officialCapacity != null || item.suggestedCapacity != null));
  if (!relevant.length) return clientInfo()?.inboundCapacity || {};
  const active = relevant.every(item => item.active && item.officialCapacity != null);
  return { active, officialCapacity: active ? relevant.reduce((sum, item) => sum + (item.officialCapacity || 0), 0) : null, suggestedCapacity: relevant.reduce((sum, item) => sum + (item.suggestedCapacity || 0), 0) };
}
function availableMonths() {
  const sourceMonth = dataset.meta.sourceUpdatedAt.slice(0, 7);
  const operationMonths = clientMetrics().map(item => item.month);
  const inventoryMonths = (dataset.inventory?.historyRows || []).filter(item => item.clientKey === state.client && ownerMatches(item)).map(item => item.countMonth);
  return [...new Set([...operationMonths, ...inventoryMonths])].filter(month => month && month < sourceMonth).sort();
}
function availableDates() { const cutoff = dataset.meta.sourceUpdatedAt.slice(0, 10); const metricDates = (dataset.dailyMetrics || []).filter(item => item.clientKey === state.client && ownerMatches(item)).map(item => item.month); const detailDates = (dataset.details?.[state.client] || []).map(item => item.creationDate); const inventoryDates = (dataset.inventory?.historyRows || []).filter(item => item.clientKey === state.client && ownerMatches(item)).map(item => item.countDay); return [...new Set([...metricDates, ...detailDates, ...inventoryDates].filter(date => date && date < cutoff))].sort(); }
function calendarDatesBetween(start, end) { if (!start || !end || start > end) return []; const cursor = new Date(`${start}T00:00:00Z`), limit = new Date(`${end}T00:00:00Z`), dates = []; while (cursor <= limit) { dates.push(cursor.toISOString().slice(0, 10)); cursor.setUTCDate(cursor.getUTCDate() + 1); } return dates; }
function periodDates() {
  if (state.periodMode === "month") return null;
  const dates = availableDates(), anchor = state.periodDate || dates.at(-1);
  if (!anchor) return [];
  if (state.periodMode === "day") return [anchor];
  if (state.periodMode === "range") {
    const start = state.periodStart || dates[0], end = state.periodEnd || dates.at(-1);
    return calendarDatesBetween(start, end);
  }
  const date = new Date(`${anchor}T00:00:00Z`), day = date.getUTCDay(), monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, index) => { const d = new Date(monday); d.setUTCDate(monday.getUTCDate() + index); return d.toISOString().slice(0, 10); });
}
function selectedMonths() {
  const months = availableMonths();
  if (state.periodMode !== "month") return [...new Set((periodDates() || []).map(date => date.slice(0, 7)).filter(month => months.includes(month)))];
  if (!state.periodMonth || !months.includes(state.periodMonth)) return state.monthCount === 0 ? months : months.slice(-state.monthCount);
  const end = months.indexOf(state.periodMonth) + 1;
  return state.monthCount === 0 ? months.slice(0, end) : months.slice(Math.max(0, end - state.monthCount), end);
}
function periodShortLabel() { const dates = periodDates(); if (state.periodMode === "day") return dates?.[0] ? dateLabel(dates[0]) : "Sem dia"; if (state.periodMode === "week") return dates?.length ? `${dateLabel(dates[0])} a ${dateLabel(dates.at(-1))}` : "Sem semana"; if (state.periodMode === "range") return state.periodStart && state.periodEnd ? `${dateLabel(state.periodStart)} a ${dateLabel(state.periodEnd)}` : "Intervalo inválido"; return analysisPeriodLabel(); }
function analysisPeriodLabel() { if (state.periodMode !== "month") return periodShortLabel(); const months = selectedMonths(); return !months.length ? "Sem período" : months.length === 1 ? monthLabel(months[0]) : `${monthLabel(months[0])} a ${monthLabel(months.at(-1))}`; }
const METRIC_FIELDS = ["records", "eligibleRecords", "validLines", "onTimeLines", "delayedLines", "unclassifiedRecords", "missingLinesRecords", "calcGrossEligibleRecords", "calcGrossEligibleLines", "calcGrossOnTimeLines", "calcGrossDelayedLines", "calcCompletedRecords", "calcCompletedEligibleLines", "calcCompletedOnTimeLines", "calcCompletedDelayedLines", "calcOpenWithinRecords", "calcOpenWithinLines", "calcOpenOverdueRecords", "calcOpenOverdueLines", "calcFallbackRecords", "calcFallbackLines", "calcNotCalculatedRecords", "calcNotCalculatedLines", "comparisonEligibleLines", "comparisonBothOnTimeLines", "comparisonBothDelayLines", "comparisonSourceOnTimeCalcDelayLines", "comparisonSourceDelayCalcOnTimeLines", "netEligibleLines", "netOnTimeLines", "netDelayedLines", "capacityExcludedLines", "netUnavailableLines", "openMetricsAvailableRecords", "newSourceRecords"];
function aggregateMetricRows(rows, operation, months) {
  if (!rows.length) return null;
  const result = { operation, month: months.at(-1), months: [...months] };
  METRIC_FIELDS.forEach(field => result[field] = rows.reduce((sum, row) => sum + (row[field] || 0), 0));
  return result;
}
function metric(operation, month) { return aggregateMetricRows(clientMetrics(operation).filter(item => item.month === month), operation, [month]); }
function latestMetric(operation) { const months = selectedMonths(); return months.length ? metric(operation, months.at(-1)) : null; }
function aggregateMetrics(operation, months) {
  const monthSet = new Set(months);
  return aggregateMetricRows(clientMetrics(operation).filter(item => monthSet.has(item.month)), operation, months);
}
function dailyMetric(operation, dates) {
  const selected = new Set(dates);
  const rows = (dataset.dailyMetrics || []).filter(item => item.clientKey === state.client && item.operation === operation && selected.has(item.month) && ownerMatches(item));
  return aggregateMetricRows(rows, operation, dates);
}
function periodSeries(operation) {
  if (state.periodMode === "month") return selectedMonths().map(month => ({ key: month, label: monthLabel(month), ...(metric(operation, month) || { operation }) }));
  const dates = periodDates() || [];
  if (!dates.length) return [];
  const months = [...new Set(dates.map(date => date.slice(0, 7)))];
  if (state.periodMode === "range" && months.length > 1) return months.map(month => { const monthDates = dates.filter(date => date.startsWith(month)); return { key: month, label: monthLabel(month), ...(dailyMetric(operation, monthDates) || { operation }) }; });
  return dates.map(date => ({ key: date, label: dateLabel(date), ...(dailyMetric(operation, [date]) || { operation }) }));
}
function aggregateDetailMetric(operation, dates) {
  const rows = (dataset.details?.[state.client] || []).filter(item => item.operation === operation && dates.includes(item.creationDate) && ownerMatches(item));
  if (!rows.length) return null;
  const result = { operation, records: rows.length, eligibleRecords: 0, validLines: 0, onTimeLines: 0, delayedLines: 0, calcGrossEligibleRecords: 0, calcGrossEligibleLines: 0, calcGrossOnTimeLines: 0, calcGrossDelayedLines: 0, calcCompletedRecords: 0, calcCompletedEligibleLines: 0, calcCompletedOnTimeLines: 0, calcCompletedDelayedLines: 0, calcOpenWithinRecords: 0, calcOpenWithinLines: 0, calcOpenOverdueRecords: 0, calcOpenOverdueLines: 0, netEligibleLines: 0, netOnTimeLines: 0, capacityExcludedLines: 0 };
  rows.forEach(item => { const lines = Number(item.lineCount) || 0, onTime = item.performance === "On Time", delay = item.performance === "Delay"; if (item.sourcePerformanceAvailable !== false && lines > 0) { result.eligibleRecords++; result.validLines += lines; if (onTime) result.onTimeLines += lines; if (delay) result.delayedLines += lines; } if (operation === "Outbound" && item.grossStatus && item.grossStatus !== "Not Calculated" && lines > 0) { result.calcGrossEligibleRecords++; result.calcGrossEligibleLines += lines; if (["Completed On Time", "Open On Track"].includes(item.grossStatus)) result.calcGrossOnTimeLines += lines; if (["Completed Delay", "Open Delay"].includes(item.grossStatus)) result.calcGrossDelayedLines += lines; if (item.grossStatus.startsWith("Completed")) { result.calcCompletedRecords++; result.calcCompletedEligibleLines += lines; if (item.grossStatus === "Completed On Time") result.calcCompletedOnTimeLines += lines; if (item.grossStatus === "Completed Delay") result.calcCompletedDelayedLines += lines; } if (item.grossStatus.startsWith("Open")) { if (item.grossStatus === "Open On Track") { result.calcOpenWithinRecords++; result.calcOpenWithinLines += lines; } else { result.calcOpenOverdueRecords++; result.calcOpenOverdueLines += lines; } } } });
  return result;
}
function periodMetric(operation) { return state.periodMode === "month" ? aggregateMetrics(operation, selectedMonths()) : dailyMetric(operation, periodDates() || []); }
function previousPeriodMetric(operation) {
  if (state.periodMode !== "month") return null;
  const all = availableMonths(), selected = selectedMonths();
  if (!selected.length || state.monthCount === 0) return null;
  const start = all.indexOf(selected[0]);
  if (start < selected.length) return null;
  return aggregateMetrics(operation, all.slice(start - selected.length, start));
}
function sla(item) { return item?.validLines ? item.onTimeLines / item.validLines : null; }
function calculatedGross(item) { return item?.calcGrossEligibleLines ? item.calcGrossOnTimeLines / item.calcGrossEligibleLines : null; }
function completedGross(item) { return item?.calcCompletedEligibleLines ? item.calcCompletedOnTimeLines / item.calcCompletedEligibleLines : null; }
function grossCoverage(item) { return item?.records ? (item.records - item.calcNotCalculatedRecords) / item.records : null; }
function operationSla(operation, item) { return calculatedGross(item); }
function netSla(item) { return item?.netEligibleLines ? item.netOnTimeLines / item.netEligibleLines : null; }
function coverage(item) { return item?.records ? item.eligibleRecords / item.records : null; }
function target(operation) { return clientInfo()?.targets?.[operation] || { target: .95, warning: .90 }; }
function status(value, operation) { const t = target(operation); if (value == null) return { key: "neutral", label: "Sem dados" }; if (value >= t.target) return { key: "good", label: "Dentro da meta" }; if (value >= t.warning) return { key: "warn", label: "Atenção" }; return { key: "danger", label: "Crítico" }; }
function stageOwnerMatches(item) { return state.owner === "ALL" || item.ownerKey === state.owner; }
function aggregateStageRows(items) {
  const groups = new Map();
  items.forEach(item => {
    const key = stageKey(item), row = groups.get(key) || { stageFrom: item.stageFrom, stageTo: item.stageTo, totalRecords: 0, validCount: 0, missingCount: 0, openCount: 0, incompleteCount: 0, invalidSequenceCount: 0, zeroCount: 0, performanceSourceRecords: 0, performanceTotalRecords: 0, performanceTotalLines: 0, performanceEligibleRecords: 0, performanceEligibleLines: 0, performanceOnTimeLines: 0, performanceDelayedLines: 0, performanceOpenWithinLines: 0, performanceNotCalculatedLines: 0, performanceNoSlaRecords: 0, meanWeighted: 0, medianWeighted: 0, p90Weighted: 0, openAgeWeighted: 0, targetWeighted: 0, targetWeight: 0, trust: "Confiável" };
    ["totalRecords", "validCount", "missingCount", "openCount", "incompleteCount", "invalidSequenceCount", "zeroCount"].forEach(field => row[field] += item[field] || 0);
    ["performanceSourceRecords", "performanceTotalRecords", "performanceTotalLines", "performanceEligibleRecords", "performanceEligibleLines", "performanceOnTimeLines", "performanceDelayedLines", "performanceOpenWithinLines", "performanceNotCalculatedLines", "performanceNoSlaRecords"].forEach(field => row[field] += item[field] || 0);
    row.meanWeighted += (item.meanBusinessHours || 0) * (item.validCount || 0);
    row.medianWeighted += (item.medianBusinessHours || 0) * (item.validCount || 0);
    row.p90Weighted += (item.p90BusinessHours || 0) * (item.validCount || 0);
    row.openAgeWeighted += (item.medianOpenBusinessHours || 0) * (item.openCount || 0);
    if (item.targetBusinessHours != null) { row.targetWeighted += item.targetBusinessHours * (item.validCount || 1); row.targetWeight += item.validCount || 1; }
    if (trustClass(item) === "danger") row.trust = item.trust; else if (trustClass(item) === "warn" && row.trust === "Confiável") row.trust = item.trust;
    groups.set(key, row);
  });
  return [...groups.values()].map(row => ({ ...row, coverage: row.totalRecords ? row.validCount / row.totalRecords : null, meanBusinessHours: row.validCount ? row.meanWeighted / row.validCount : null, medianBusinessHours: row.validCount ? row.medianWeighted / row.validCount : null, p90BusinessHours: row.validCount ? row.p90Weighted / row.validCount : null, medianOpenBusinessHours: row.openCount ? row.openAgeWeighted / row.openCount : null, targetBusinessHours: row.targetWeight ? row.targetWeighted / row.targetWeight : null, performanceCoverage: row.performanceTotalLines ? row.performanceEligibleLines / row.performanceTotalLines : null, performanceValue: row.performanceEligibleLines ? row.performanceOnTimeLines / row.performanceEligibleLines : null }));
}
function stageRows(operation = "Outbound") {
  if (state.periodMode === "month") { const months = new Set(selectedMonths()); return aggregateStageRows((dataset.stageMetrics || []).filter(item => (item.operation || "Outbound") === operation && item.clientKey === state.client && months.has(item.month) && stageOwnerMatches(item))); }
  const dates = new Set(periodDates() || []);
  return aggregateStageRows((dataset.dailyStageMetrics || []).filter(item => (item.operation || "Outbound") === operation && item.clientKey === state.client && dates.has(item.month) && stageOwnerMatches(item)));
}
function periodStageRows(operation = "Outbound") { return stageRows(operation); }
function periodStageMetric(operation, stageFrom, stageTo) {
  return periodStageRows(operation).find(item => item.stageFrom === stageFrom && item.stageTo === stageTo) || null;
}
function stageKey(item) { return `${item.stageFrom} → ${item.stageTo}`; }
function trustClass(item) { return item.trust === "Confiável" ? "good" : item.trust === "Atenção" ? "warn" : "danger"; }
function processRule(key) {
  const rules = (dataset.processRules || []).filter(item => item.processKey === key && (item.clientKey === state.client || item.clientKey === "DEFAULT") && (state.owner === "ALL" || item.ownerKey === state.owner || item.ownerKey === "DEFAULT"));
  return rules.sort((a, b) => (a.clientKey === state.client ? 0 : 1) - (b.clientKey === state.client ? 0 : 1) || (a.ownerKey === state.owner ? 0 : 1) - (b.ownerKey === state.owner ? 0 : 1) || String(b.from || "").localeCompare(String(a.from || "")))[0] || {
    processKey: key, processName: key === "PROCESSAMENTO" ? "Processamento" : "Separação",
    startFrom: key === "PROCESSAMENTO" ? "Allocated" : "In Progress", startTo: key === "PROCESSAMENTO" ? "In Progress" : "Picked",
    endFrom: key === "PROCESSAMENTO" ? "In Progress" : "Packed", endTo: key === "PROCESSAMENTO" ? "Picked" : "Ready to Load", targetHours: null,
  };
}
function aggregateProcessRows(items) {
  if (!items.length) return null;
  const first = items[0], result = { ...first };
  ["totalRecords", "totalLines", "eligibleRecords", "eligibleLines", "onTimeLines", "delayedLines", "openWithinLines", "notCalculatedLines", "noSlaRecords"].forEach(field => result[field] = items.reduce((sum, item) => sum + (item[field] || 0), 0));
  result.performanceValue = result.eligibleLines ? result.onTimeLines / result.eligibleLines : null;
  result.performanceCoverage = result.totalLines ? result.eligibleLines / result.totalLines : null;
  return result;
}
function processRows(key) {
  const source = state.periodMode === "month" ? (dataset.processMetrics || []) : (dataset.dailyProcessMetrics || []);
  const periods = state.periodMode === "month" ? new Set(selectedMonths()) : new Set(periodDates() || []);
  return aggregateProcessRows(source.filter(item => (item.operation || "Outbound") === "Outbound" && item.clientKey === state.client && item.processKey === key && periods.has(item.month) && stageOwnerMatches(item)));
}
function combinedProcessRows() {
  const source = state.periodMode === "month" ? (dataset.combinedProcessMetrics || []) : (dataset.dailyCombinedProcessMetrics || []);
  const periods = state.periodMode === "month" ? new Set(selectedMonths()) : new Set(periodDates() || []);
  return aggregateProcessRows(source.filter(item => (item.operation || "Outbound") === "Outbound" && item.clientKey === state.client && periods.has(item.month) && stageOwnerMatches(item)));
}
function processStatus(value) { const result = status(value, "Outbound"); return { key: result.key, label: result.label }; }
function processPerformanceCard(key, title, icon, rule, metric) {
  const value = metric?.performanceValue ?? null;
  const slaHours = metric?.targetHours ?? rule.targetHours ?? null;
  const usesGrossDeadline = metric?.deadlineSource === "Gross";
  const stateValue = processStatus(value);
  const selected = state.selectedProcess === key;
  const eligible = metric?.eligibleLines || 0;
  const total = metric?.totalLines || 0;
  const coverageValue = total ? eligible / total : null;
  const stateLabel = value == null ? (slaHours == null ? "Aguardando SLA" : "Sem dados") : stateValue.label;
  const subtitle = key === "combined" ? (eligible ? `${fmt.format(eligible)} linhas elegíveis · interseção das etapas` : "Sem linhas elegíveis nas duas etapas") : usesGrossDeadline ? (eligible ? `${fmt.format(eligible)} linhas elegíveis · corte Gross aplicado separadamente` : "Sem linhas elegíveis no período") : slaHours == null ? "Preencha MetaHorasUteis em ProcessosOutbound" : eligible ? `${fmt.format(eligible)} linhas elegíveis · cobertura ${pct(coverageValue)}` : "Sem linhas elegíveis no período";
  const width = value == null ? 0 : Math.max(0, Math.min(100, value * 100));
  const processExplanation = key === "combined" ? "Considera no prazo somente as linhas que cumpriram Processamento e Separação." : key === "processing" ? "Mede o tempo entre o início e o fim do Processamento dentro da regra configurada." : "Mede o tempo entre o início e o fim da Separação dentro da regra configurada.";
  return `<button type="button" class="process-performance-card ${stateValue.key} ${selected ? "selected" : ""}" data-process-stage="${key}" aria-pressed="${selected}" title="${htmlEscape(processExplanation)}">
    <div class="process-card-top"><div class="process-card-title"><span class="process-icon">${icon}</span><div><h3>${title}</h3><span>Eficiência dentro do SLA configurado</span></div></div><span class="status-pill ${stateValue.key}">${stateLabel}</span></div>
    <div class="process-card-score"><strong>${pct(value)}</strong><span>meta ${pct(target("Outbound").target)}</span></div>
    <div class="process-card-track"><i style="width:${width}%"></i><b style="left:${target("Outbound").target * 100}%" title="Meta ${pct(target("Outbound").target)}"></b></div>
    <div class="process-card-stats"><div><small>${usesGrossDeadline ? "Regra de prazo" : "SLA do processo"}</small><b>${usesGrossDeadline ? "Corte Gross" : slaHours == null ? "—" : hours(slaHours) + " úteis"}</b></div><div><small>No prazo</small><b>${metric ? fmt.format(metric.onTimeLines || 0) : "—"}</b></div><div><small>Em atraso</small><b>${metric ? fmt.format(metric.delayedLines || 0) : "—"}</b></div></div>
    <div class="process-card-foot"><span class="stage-chip"><span>${rule.startFrom} → ${rule.startTo}</span><b>até</b><span>${rule.endFrom} → ${rule.endTo}</span></span><span class="process-card-sub">${subtitle}</span></div>
  </button>`;
}
function outboundProcessPerformance() {
  const processingRule = processRule("PROCESSAMENTO"), pickingRule = processRule("SEPARACAO");
  const processing = processRows("PROCESSAMENTO"), picking = processRows("SEPARACAO");
  const combined = combinedProcessRows();
  const combinedRule = { startFrom: "Allocated", startTo: "In Progress", endFrom: "Packed", endTo: "Ready to Load", targetHours: null };
  const selectedLabel = state.selectedProcess === "processing" ? "Processamento" : state.selectedProcess === "picking" ? "Separação" : "Selecione um processo para destacar sua etapa na jornada";
  return `<div class="section-label process-section-label"><b>Performance por processo</b><span>Onde o fluxo perde o SLA</span></div>
    <section class="process-performance-grid" aria-label="Performance por processo">
      ${processPerformanceCard("processing", processingRule.processName || "Processamento", "P", processingRule, processing)}
      ${processPerformanceCard("picking", pickingRule.processName || "Separação", "S", pickingRule, picking)}
    </section>
    <div class="section-label process-section-label combined-process-label"><b>Performance operacional combinada</b><span>Interseção das duas etapas, na mesma linha</span></div>
    <section class="process-performance-grid combined-process-grid" aria-label="Performance operacional combinada">
      ${processPerformanceCard("combined", "Operacional combinada", "✓", combinedRule, combined)}
    </section>
    <p class="process-comparison-note">A combinação considera no prazo somente linhas que cumpriram Processamento e Separação. O Gross continua sendo o indicador oficial do pedido completo.</p>
    <div class="process-selection-note"><span aria-hidden="true">i</span>${selectedLabel}.${state.selectedProcess ? " Os detalhes e a jornada estão destacados para este processo." : ""}</div>`;
}

function pageHeader(title, subtitle, actions = "") {
  const name = clientInfo()?.name || state.client, logo = window.CLIENT_LOGOS?.[state.client];
  return `<div class="page-head"><div><div class="client-identity">${logo ? `<img class="client-logo" src="${htmlEscape(logo)}" alt="Logo ${htmlEscape(name)}">` : ""}<span class="client-name">${htmlEscape(name)}${state.owner !== "ALL" ? ` · ${htmlEscape(selectedOwnerLabel())}` : ""}</span></div><h1 id="pageTitle">${title}</h1><p>${subtitle}</p></div><div class="head-actions">${actions}</div></div>`;
}
function pill(value, operation) { const s = status(value, operation); return `<span class="status-pill ${s.key}"><i class="${s.key}"></i>${s.label}</span>`; }
const KPI_EXPLANATIONS = {
  "SLA por linhas": "Percentual de linhas elegíveis que terminaram dentro do SLA no período selecionado.", "Meta SLA": "Meta percentual usada para classificar o resultado como dentro da meta, atenção ou crítico.", "Linhas válidas": "Linhas com dados suficientes para entrar no cálculo do SLA.", "Linhas em atraso": "Linhas elegíveis que terminaram depois do prazo configurado.", "Variação da janela": "Diferença do SLA em relação à janela anterior equivalente.", "Cobertura dos dados": "Percentual de registros que possuem dados válidos para o cálculo.",
  "Performance Gross": "Performance oficial do processo completo, considerando a regra Gross do cliente e Owner.", "Gross recalculado": "Performance calculada pela regra operacional vigente, usando etapas, cortes e dias úteis configurados.", "Performance Gross dos concluídos": "Performance Gross considerando somente processos que chegaram ao evento final.", "Gross de concluídos": "Performance Gross considerando somente processos que chegaram ao evento final.", "Performance NET": "Performance após a aplicação da capacidade diária; no Recebimento, somente atrasos que excedem a capacidade saem do NET.", "SLA NET": "Performance após a aplicação da capacidade diária; no Recebimento, somente atrasos que excedem a capacidade saem do NET.", "Diferença NET x Gross": "Variação causada pela capacidade diária entre o resultado Gross e o resultado NET.", "Atrasados em aberto": "Processos ainda abertos cujo prazo já venceu. Pode ficar indisponível quando a fonte contém somente pedidos expedidos.", "Capacidade oficial": "Limite diário oficial de linhas usado para determinar quais atrasos saem do NET.", "Capacidade de referência": "Capacidade sugerida ou histórica enquanto a capacidade oficial ainda não está ativa.",
  "Performance da base": "Performance informada originalmente na fonte, usada somente para comparação administrativa.", "Cobertura da regra": "Percentual de registros para os quais a regra Gross conseguiu calcular um resultado.", "Fallback de etapa": "Quantidade de registros em que uma etapa anterior preenchida foi usada porque o evento final estava vazio.", "Divergência com a base": "Linhas em que a classificação original da fonte é diferente do cálculo operacional.", "Sem cálculo": "Registros que ficaram fora do cálculo por falta de etapa, regra, linha válida ou sequência consistente.",
  "Quantidade física observada": "Soma da quantidade final nas linhas únicas da última contagem conhecida. É uma posição parcial, não o estoque total.", "Posições únicas auditadas": "Quantidade de posições físicas diferentes auditadas no período selecionado, sem contar várias linhas de SKU como novas posições.", "Reauditorias": "Quantidade de posições que foram auditadas novamente no período selecionado.", "Divergência líquida": "Quantidade física observada menos a quantidade original registrada no sistema.", "Divergência absoluta": "Soma das diferenças em módulo, sem compensar perdas e sobras entre posições.", "Linhas com divergência": "Linhas de SKU cuja quantidade final é diferente da quantidade original.",
};
function kpi(label, value, sub, statusKey = "neutral") { const explanation = KPI_EXPLANATIONS[label] || "Indicador calculado para o período, cliente e Owner selecionados."; return `<article class="kpi status-${statusKey}" tabindex="0" title="${htmlEscape(explanation)}" data-tooltip="${htmlEscape(explanation)}"><span class="label">${label}</span><div class="value">${value}</div><span class="sub">${sub}</span></article>`; }

function operationKpis(operation) {
  const current = periodMetric(operation), months = selectedMonths(), previous = previousPeriodMetric(operation);
  const currentSla = operationSla(operation, current), previousSla = operationSla(operation, previous), delta = currentSla != null && previousSla != null ? currentSla - previousSla : null;
  const s = status(currentSla, operation), t = target(operation);
  return `<section class="kpi-grid">
    ${kpi("SLA por linhas", pct(currentSla), pill(currentSla, operation), s.key)}
    ${kpi("Meta SLA", pct(t.target), `Atenção a partir de ${pct(t.warning)}`)}
    ${kpi("Linhas válidas", current ? fmt.format(current.validLines) : "—", `Volume elegível em ${analysisPeriodLabel()}`)}
    ${kpi("Linhas em atraso", current ? fmt.format(current.delayedLines) : "—", current?.validLines ? `${pct(current.delayedLines / current.validLines)} do volume` : "Sem base válida", current?.delayedLines ? "danger" : "neutral")}
    ${kpi("Variação da janela", pp(delta), previous ? "Comparação com a janela anterior equivalente" : "Sem janela anterior comparável", delta == null ? "neutral" : delta >= 0 ? "good" : "danger")}
    ${kpi("Cobertura dos dados", pct(coverage(current)), current ? `${fmt.format(current.eligibleRecords)} de ${fmt.format(current.records)} registros` : "Sem registros", coverage(current) >= .98 ? "good" : coverage(current) >= .90 ? "warn" : "danger")}
  </section>`;
}

function trendPanel(operation) {
  const items = periodSeries(operation), t = target(operation), unit = state.periodMode === "month" || (state.periodMode === "range" && new Set((periodDates() || []).map(date => date.slice(0, 7))).size > 1) ? "mês" : "dia";
  const bars = items.map(item => { const value = operationSla(operation, item); return `<div class="trend-item"><span class="trend-value">${pct(value)}</span><div class="trend-bar" style="height:${value == null ? 3 : Math.max(4, value * 185)}px"></div><span class="trend-month">${item.label}</span></div>`; }).join("");
  const maxLines = Math.max(1, ...items.map(item => item.calcGrossEligibleLines || 0));
  const volumes = items.map(item => `<div class="volume-row"><span>${item.label}</span><div class="mini-track"><div class="mini-fill" style="width:${(item.calcGrossEligibleLines || 0) / maxLines * 100}%"></div></div><b>${fmtCompact.format(item.calcGrossEligibleLines || 0)}</b></div>`).join("");
  return `<section class="grid-2"><article class="panel"><div class="panel-head"><h2>SLA por ${unit}</h2><span>Meta ${pct(t.target)}</span></div><div class="trend" aria-label="Evolução do SLA no período selecionado">${bars || '<div class="empty">Sem histórico</div>'}</div></article><article class="panel"><div class="panel-head"><h2>Volume de linhas válidas</h2><span>${analysisPeriodLabel()}</span></div><div class="volume-list">${volumes || '<div class="empty">Sem volume</div>'}</div></article></section>`;
}

function inventoryDates() {
  return [...new Set((dataset.inventory?.historyRows || []).filter(item => item.clientKey === state.client && ownerMatches(item) && item.countDay).map(item => item.countDay))].sort();
}
function inventoryAsOfDate() {
  const dates = inventoryDates();
  if (!dates.length) return "";
  if (state.periodMode === "month") {
    const months = selectedMonths();
    return dates.filter(date => months.includes(date.slice(0, 7))).at(-1) || "";
  }
  const selected = periodDates() || [];
  return dates.filter(date => selected.includes(date)).at(-1) || "";
}
function inventoryPeriodIncludes(item) {
  if (!item.countDay) return false;
  if (state.periodMode === "month") return selectedMonths().includes(item.countMonth);
  return (periodDates() || []).includes(item.countDay);
}
function inventoryPositionRows() {
  const asOf = inventoryAsOfDate();
  const rows = (dataset.inventory?.historyRows || []).filter(item => item.clientKey === state.client && ownerMatches(item) && item.countDay && item.countDay <= asOf);
  const latest = new Map();
  rows.forEach(item => {
    const key = [item.clientKey, item.ownerKey, item.location, item.tagId, item.sku].join("|");
    const current = latest.get(key);
    if (!current || `${item.countDate}|${item.listId}` >= `${current.countDate}|${current.listId}`) latest.set(key, item);
  });
  return [...latest.values()];
}
function inventoryAuditStats() {
  const asOf = inventoryAsOfDate();
  const monthly = state.periodMode === "month", selected = new Set(monthly ? selectedMonths() : periodDates() || []);
  const source = (dataset.inventory?.historyRows || []).filter(item => item.clientKey === state.client && ownerMatches(item) && item.countDay && item.countDay <= asOf && selected.has(monthly ? item.countMonth : item.countDay));
  const eventMap = new Map();
  source.forEach(item => {
    const eventKey = [item.clientKey, item.ownerKey, item.location, item.listId, item.countDay].join("|");
    if (!eventMap.has(eventKey)) eventMap.set(eventKey, { ...item, positionKey: [item.clientKey, item.ownerKey, item.location].join("|") });
  });
  const events = [...eventMap.values()].sort((a, b) => `${a.countDate}|${a.listId}`.localeCompare(`${b.countDate}|${b.listId}`));
  const seenPositions = new Set(), positionEvents = new Map(), byMonth = new Map(), byCell = new Map();
  events.forEach(event => {
    const month = event.countMonth, weekday = new Date(`${event.countDay}T00:00:00Z`).getUTCDay();
    const repeated = seenPositions.has(event.positionKey);
    seenPositions.add(event.positionKey);
    positionEvents.set(event.positionKey, (positionEvents.get(event.positionKey) || 0) + 1);
    const monthRow = byMonth.get(month) || { month, events: 0, newPositions: 0, repeatedEvents: 0, cumulative: 0 };
    monthRow.events += 1; monthRow[repeated ? "repeatedEvents" : "newPositions"] += 1; byMonth.set(month, monthRow);
    const cellKey = `${month}|${weekday}`;
    byCell.set(cellKey, (byCell.get(cellKey) || 0) + 1);
  });
  let cumulative = 0;
  const months = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)).map(row => ({ ...row, cumulative: cumulative += row.newPositions }));
  return { events, uniquePositions: seenPositions.size, revisitedPositions: [...positionEvents.values()].filter(value => value > 1).length, repeatedEvents: events.length - seenPositions.size + [...positionEvents.values()].filter(value => value > 1).length, months, byCell };
}
function inventoryPage() {
  const asOf = inventoryAsOfDate(), rows = inventoryPositionRows(), audit = inventoryAuditStats();
  const quantity = rows.reduce((sum, item) => sum + (item.finalQty || 0), 0);
  const original = rows.reduce((sum, item) => sum + (item.originalQty || 0), 0);
  const difference = rows.reduce((sum, item) => sum + (item.difference || 0), 0);
  const absoluteDifference = rows.reduce((sum, item) => sum + Math.abs(item.difference || 0), 0);
  const linesWithDifference = rows.filter(item => (item.difference || 0) !== 0).length;
  const found = rows.filter(item => item.type === "Found").length, lost = rows.filter(item => item.type === "Lost").length;
  const topRows = [...rows].sort((a, b) => Math.abs(b.difference || 0) - Math.abs(a.difference || 0)).slice(0, 12);
  const maxAbs = Math.max(1, ...topRows.map(item => Math.abs(item.difference || 0)));
  const tableRows = [...rows].sort((a, b) => Math.abs(b.difference || 0) - Math.abs(a.difference || 0)).slice(0, 80).map(item => `<tr><td><b>${htmlEscape(item.ownerName)}</b><small>${htmlEscape(item.listId)}</small></td><td>${htmlEscape(item.location)}</td><td>${htmlEscape(item.sku)}<small>${htmlEscape(item.description || "")}</small></td><td>${fmt.format(item.originalQty || 0)}</td><td>${fmt.format(item.finalQty || 0)}</td><td class="${item.difference ? "inventory-difference" : ""}">${fmt.format(item.difference || 0)}</td><td><span class="status-pill ${item.type === "OK" ? "good" : "warn"}">${htmlEscape(item.type)}</span></td><td>${item.countDay ? dateLabel(item.countDay) : "—"}</td></tr>`).join("");
  const chartRows = topRows.map(item => `<div class="inventory-bar-row"><span title="${htmlEscape(item.sku)}">${htmlEscape(item.location || item.sku)}</span><div class="mini-track"><i class="${(item.difference || 0) < 0 ? "inventory-loss" : "inventory-found"}" style="width:${Math.min(100, Math.abs(item.difference || 0) / maxAbs * 100)}%"></i></div><b>${fmt.format(item.difference || 0)}</b></div>`).join("");
  const q = dataset.inventory?.quality || {}, coverage = q.rows ? q.identifiedRows / q.rows : null;
  const sidePanel = IS_ADMIN ? `<article class="panel"><div class="panel-head"><h2>Cobertura da fonte</h2><span>Controle administrativo resumido</span></div><div class="inventory-coverage"><div><b>${pct(coverage)}</b><span>linhas com cliente identificado</span></div><div><b>${fmt.format(q.noInventoryRows || 0)}</b><span>posições sem estoque identificado</span></div><div><b>${fmt.format(q.repeatedLineKeys || 0)}</b><span>chaves repetidas no histórico</span></div><div><b>${fmt.format(q.lists || 0)}</b><span>listas de contagem carregadas</span></div></div></article>` : `<article class="panel"><div class="panel-head"><h2>Como ler a divergência</h2><span>Regra aplicada</span></div><div class="insight-list"><div class="insight warn"><b>Found</b><p>Item encontrado sem correspondência esperada ou acima da quantidade original.</p></div><div class="insight"><b>Lost</b><p>Quantidade física menor que a quantidade original.</p></div><div class="insight good"><b>OK</b><p>Quantidade final igual à quantidade original.</p></div></div></article>`;
  const days = [[1, "Seg"], [2, "Ter"], [3, "Qua"], [4, "Qui"], [5, "Sex"], [6, "Sáb"], [0, "Dom"]], maxCell = Math.max(1, ...audit.byCell.values()), heatmap = audit.months.map(month => `<span class="inventory-month-label">${monthLabel(month.month)}</span>${days.map(([day, label]) => { const value = audit.byCell.get(`${month.month}|${day}`) || 0, level = value ? Math.max(1, Math.ceil(value / maxCell * 4)) : 0; return `<span class="inventory-heat-cell level-${level}" title="${label}: ${fmt.format(value)} auditorias">${fmt.format(value)}</span>`; }).join("")}`).join("");
  const cumulativeChart = audit.months.map(month => `<div><i style="height:${audit.uniquePositions ? Math.max(4, month.cumulative / audit.uniquePositions * 155) : 0}px"></i><b>${fmt.format(month.cumulative)}</b><small>${monthLabel(month.month)}</small></div>`).join("");
  return `${pageHeader("Inventário", "Quantidade física observada e atividade das contagens cíclicas", `<span class="period-badge">${analysisPeriodLabel()}</span>`)}
    <div class="notice inventory-notice"><b>Contagem parcial</b><span>Mostrando a última quantidade conhecida por Owner, localização, tag e SKU até ${asOf ? dateLabel(asOf) : "a última data disponível"}. Isso não representa o fechamento total do inventário.</span></div>
    <section class="kpi-grid inventory-kpis">
      ${kpi("Quantidade física observada", fmt.format(quantity), `${fmt.format(rows.length)} linhas únicas na posição`, "neutral")}
      ${kpi("Posições únicas auditadas", fmt.format(audit.uniquePositions), `${fmt.format(audit.events.length)} eventos de posição`, "blue")}
      ${kpi("Reauditorias", fmt.format(audit.revisitedPositions), `${fmt.format(audit.repeatedEvents)} eventos repetidos`, audit.revisitedPositions ? "warn" : "good")}
      ${kpi("Divergência líquida", fmt.format(difference), "Quantidade física menos quantidade original", difference === 0 ? "good" : "warn")}
      ${kpi("Divergência absoluta", fmt.format(absoluteDifference), original ? `${pct(absoluteDifference / original)} da quantidade original` : "Sem denominador válido", absoluteDifference ? "warn" : "good")}
      ${kpi("Linhas com divergência", fmt.format(linesWithDifference), `${fmt.format(rows.length)} linhas observadas`, linesWithDifference ? "warn" : "good")}
    </section>
    <section class="grid-equal inventory-grid"><article class="panel"><div class="panel-head"><h2>Heatmap de atividades de auditoria</h2><span>Células = eventos únicos de posição por lista e dia</span></div><div class="inventory-heatmap"><span></span>${days.map(([, label]) => `<span class="inventory-day-label">${label}</span>`).join("")}${heatmap || '<span class="empty">Sem auditorias no período.</span>'}</div><div class="inventory-heat-legend"><span>Menor volume</span><i class="level-1"></i><i class="level-2"></i><i class="level-3"></i><i class="level-4"></i><span>Maior volume</span></div></article><article class="panel"><div class="panel-head"><h2>Posições únicas acumuladas</h2><span>Novas posições por mês</span></div><div class="inventory-cumulative">${cumulativeChart || '<div class="empty">Sem dados.</div>'}</div><div class="inventory-activity-summary">${audit.months.map(month => `<div><b>${fmt.format(month.newPositions)}</b><span>novas em ${monthLabel(month.month)}</span><small>${fmt.format(month.repeatedEvents)} reauditorias</small></div>`).join("")}</div></article></section>
    <section class="grid-equal inventory-grid"><article class="panel"><div class="panel-head"><h2>Maiores divergências por localização</h2><span>${topRows.length} maiores desvios</span></div><div class="inventory-bars">${chartRows || '<div class="empty">Sem linhas contadas para o filtro selecionado.</div>'}</div></article>${sidePanel}</section>
    <section class="panel"><div class="panel-head"><h2>Detalhamento da posição observada</h2><span>${fmt.format(rows.length)} linhas · até ${asOf ? dateLabel(asOf) : "—"}</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Owner / lista</th><th>Localização</th><th>SKU</th><th>Original</th><th>Final</th><th>Diferença</th><th>Tipo</th><th>Contagem</th></tr></thead><tbody>${tableRows || '<tr><td colspan="8" class="empty">Sem dados para o filtro selecionado.</td></tr>'}</tbody></table></div></section>`;
}

function operationPage(operation) {
  const title = operation === "Outbound" ? "Expedição" : "Recebimento";
  const subtitle = operation === "Outbound" ? "SLA ponderado pelas linhas dos pedidos" : "SLA ponderado pelas linhas dos pré-avisos";
  return `${pageHeader(title, subtitle)}${operationKpis(operation)}${trendPanel(operation)}`;
}

function outboundKpis() {
  const item = periodMetric("Outbound"), gross = calculatedGross(item), completed = completedGross(item), net = netSla(item), delta = gross != null && net != null ? net - gross : null;
  const rule = clientInfo()?.grossRule, ruleText = rule ? `${rule.stageFrom} → ${rule.stageTo}` : "Sem regra ativa", capacity = selectedCapacity("Outbound"), capacityValue = capacity.active ? capacity.officialCapacity : capacity.suggestedCapacity, openUnavailable = (item?.newSourceRecords || 0) > 0, slaTarget = target("Outbound");
  return `<section class="kpi-grid outbound-kpis">
    ${kpi(IS_ADMIN ? "Gross recalculado" : "Performance Gross", pct(gross), IS_ADMIN ? `Realizado · ${ruleText}` : "Pedidos concluídos ou vencidos no período", status(gross, "Outbound").key)}
    ${kpi("Meta SLA", pct(slaTarget.target), `Atenção a partir de ${pct(slaTarget.warning)}`)}
    ${kpi(IS_ADMIN ? "Gross de concluídos" : "Performance Gross dos concluídos", pct(completed), item ? `${fmt.format(item.calcCompletedEligibleLines)} linhas finalizadas` : "Sem dados", status(completed, "Outbound").key)}
    ${kpi(IS_ADMIN ? "SLA NET" : "Performance NET", pct(net), net == null ? "Aguardando capacidade oficial ativa" : `${fmt.format(item.netEligibleLines)} linhas dentro da capacidade`, net == null ? "neutral" : status(net, "Outbound").key)}
    ${kpi("Diferença NET x Gross", pp(delta), net == null ? "NET ainda não calculado" : "Efeito da capacidade sobre o cálculo", delta == null ? "neutral" : delta >= 0 ? "good" : "danger")}
    ${kpi("Atrasados em aberto", openUnavailable ? "N/D" : item ? fmt.format(item.calcOpenOverdueLines) : "—", openUnavailable ? "Não disponível na nova fonte, que contém somente pedidos expedidos" : item ? `${fmt.format(item.calcOpenOverdueRecords)} processos com prazo vencido` : "Sem dados", openUnavailable ? "neutral" : item?.calcOpenOverdueLines ? "danger" : "good")}
    ${kpi(capacity.active ? "Capacidade oficial" : "Capacidade de referência", capacityValue == null ? "—" : fmt.format(capacityValue), capacity.active ? "linhas por dia" : "aguardando validação", capacity.active ? "good" : "neutral")}
  </section>${performanceMetricGuide("Outbound")}`;
}

function inboundKpis() {
  const item = periodMetric("Inbound"), gross = calculatedGross(item), completed = completedGross(item), net = netSla(item), delta = gross != null && net != null ? net - gross : null;
  const rule = clientInfo()?.inboundRule, ruleText = rule ? `${rule.stageFrom} → ${rule.stageTo}` : "Sem regra ativa", capacity = selectedCapacity("Inbound"), capacityValue = capacity.active ? capacity.officialCapacity : capacity.suggestedCapacity, slaTarget = target("Inbound");
  return `<section class="kpi-grid outbound-kpis">
    ${kpi(IS_ADMIN ? "Gross recalculado" : "Performance Gross", pct(gross), IS_ADMIN ? `Realizado · ${ruleText}` : "Pré-avisos concluídos ou vencidos no período", status(gross, "Inbound").key)}
    ${kpi("Meta SLA", pct(slaTarget.target), `Atenção a partir de ${pct(slaTarget.warning)}`)}
    ${kpi(IS_ADMIN ? "Gross de concluídos" : "Performance Gross dos concluídos", pct(completed), item ? `${fmt.format(item.calcCompletedEligibleLines)} linhas finalizadas` : "Sem dados", status(completed, "Inbound").key)}
    ${kpi(IS_ADMIN ? "SLA NET" : "Performance NET", pct(net), net == null ? "Aguardando capacidade oficial ativa" : `${fmt.format(item.netEligibleLines)} linhas dentro da capacidade`, net == null ? "neutral" : status(net, "Inbound").key)}
    ${kpi("Diferença NET x Gross", pp(delta), net == null ? "NET ainda não calculado" : "Efeito da capacidade sobre o cálculo", delta == null ? "neutral" : delta >= 0 ? "good" : "danger")}
    ${kpi("Atrasados em aberto", item ? fmt.format(item.calcOpenOverdueLines) : "—", item ? `${fmt.format(item.calcOpenOverdueRecords)} processos com prazo vencido` : "Sem dados", item?.calcOpenOverdueLines ? "danger" : "good")}
    ${kpi(capacity.active ? "Capacidade oficial" : "Capacidade de referência", capacityValue == null ? "—" : fmt.format(capacityValue), capacity.active ? "linhas por dia" : "aguardando validação", capacity.active ? "good" : "neutral")}
  </section>${performanceMetricGuide("Inbound")}`;
}

function performanceMetricGuide(operation) {
  const process = operation === "Inbound" ? "pré-avisos" : "pedidos";
  const netRule = operation === "Inbound" ? "Somente as linhas atrasadas que excedem a capacidade diária oficial saem do NET; linhas no prazo continuam elegíveis." : "As linhas acima da capacidade diária oficial saem do NET e permanecem no Gross.";
  return `<details class="metric-guide"><summary>Como interpretar Gross, NET, capacidade e cobertura</summary><dl><div><dt>Performance Gross</dt><dd>Resultado considerando os ${process} elegíveis pela regra de prazo do cliente.</dd></div><div><dt>Performance NET</dt><dd>${netRule} Sem capacidade oficial, o NET fica como “—”.</dd></div><div><dt>Capacidade</dt><dd>Limite oficial de linhas por dia usado para tratar o excesso de volume.</dd></div><div><dt>Cobertura</dt><dd>Percentual de registros com dados suficientes para o cálculo. Registros sem informação não entram no denominador.</dd></div></dl></details>`;
}

function grossNetPanel(operation = "Outbound") {
  const rows = periodSeries(operation);
  const body = rows.map(item => {
    const gross = calculatedGross(item), net = netSla(item);
    return `<div class="compare-row"><b>${item.label}</b><div class="compare-bars"><div><span>${IS_ADMIN ? "Gross" : "Performance Gross"}</span><div class="mini-track"><i class="gross-fill" style="width:${(gross || 0) * 100}%"></i></div><strong>${pct(gross)}</strong></div><div><span>${IS_ADMIN ? "NET" : "Performance NET"}</span><div class="mini-track"><i class="net-fill" style="width:${(net || 0) * 100}%"></i></div><strong>${pct(net)}</strong></div></div></div>`;
  }).join("");
  return `<article class="panel"><div class="panel-head"><h2>${IS_ADMIN ? "Gross x NET" : "Performance Gross x Performance NET"}</h2><span>${state.periodMode === "month" ? "Comparação mês a mês" : "Evolução no período selecionado"}</span></div><div class="compare-list">${body || '<div class="empty">Sem histórico</div>'}</div></article>`;
}

function grossOperationalPanel(operation = "Outbound") {
  const item = periodMetric(operation), openUnavailable = operation === "Outbound" && (item?.newSourceRecords || 0) > 0, openValue = value => openUnavailable ? "N/D" : fmt.format(value || 0), processLabel = operation === "Inbound" ? "pré-avisos" : "pedidos";
  const openCards = openUnavailable ? "" : `<article class="quality-card"><small>Em andamento no prazo</small><b>${openValue(item?.calcOpenWithinLines)}</b><span>${fmt.format(item?.calcOpenWithinRecords || 0)} processos fora do denominador realizado.</span></article>
    <article class="quality-card"><small>Atrasados em aberto</small><b>${openValue(item?.calcOpenOverdueLines)}</b><span>Entram como atraso no Gross realizado.</span></article>`;
  return `<section class="panel gross-operational"><div class="panel-head"><h2>${IS_ADMIN ? "Situação operacional do Gross" : `Situação dos ${processLabel}`}</h2><span>${analysisPeriodLabel()}</span></div><div class="quality-grid gross-status-grid">
    <article class="quality-card"><small>Concluídos no prazo</small><b>${fmt.format(item?.calcCompletedOnTimeLines || 0)}</b><span>${fmt.format(item?.calcCompletedRecords || 0)} processos concluídos no total.</span></article>
    <article class="quality-card"><small>Concluídos em atraso</small><b>${fmt.format(item?.calcCompletedDelayedLines || 0)}</b><span>Linhas que terminaram após o vencimento.</span></article>
    ${openCards}
  </div></section>`;
}

function capacityPanel(operation = "Outbound") {
  const months = new Set(selectedMonths());
  const dates = periodDates();
  const selectedDates = new Set(dates || []);
  const groupByMonth = state.periodMode === "month" || (state.periodMode === "range" && new Set((dates || []).map(date => date.slice(0, 7))).size > 1);
  const groups = new Map();
  const expectedKeys = groupByMonth ? (state.periodMode === "month" ? selectedMonths() : [...new Set((dates || []).map(date => date.slice(0, 7)))]) : (dates || []);
  expectedKeys.forEach(key => groups.set(key, { key, releasedLines: 0, officialCapacity: 0, suggestedCapacity: 0 }));
  (dataset.dailyCapacity || []).filter(item => (item.operation || "Outbound") === operation && item.clientKey === state.client && (dates ? selectedDates.has(item.date) : months.has(item.date.slice(0, 7))) && (state.owner === "ALL" || item.ownerKey === state.owner)).forEach(item => {
    const key = groupByMonth ? item.date.slice(0, 7) : item.date;
    const row = groups.get(key) || { key, releasedLines: 0, officialCapacity: 0, suggestedCapacity: 0 };
    row.releasedLines += item.releasedLines || 0; row.officialCapacity += item.officialCapacity || 0; row.suggestedCapacity += item.suggestedCapacity || 0;
    groups.set(key, row);
  });
  const rows = [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
  const max = Math.max(1, ...rows.map(item => Math.max(item.releasedLines || 0, item.officialCapacity || item.suggestedCapacity || 0)));
  const chart = rows.length ? rows.map(item => {
    const capacity = item.officialCapacity || item.suggestedCapacity || 0;
    const label = groupByMonth ? monthLabel(item.key) : item.key.slice(8) + "/" + item.key.slice(5, 7);
    const nextLevel = groupByMonth ? "week" : state.periodMode === "day" ? "" : "day";
    const content = `<div class="capacity-column"><i class="capacity-limit" style="bottom:${capacity / max * 100}%"></i><span style="height:${item.releasedLines / max * 100}%" class="${item.officialCapacity ? "official" : "suggested"}"></span></div><small>${label}</small>`;
    const description = `${label} · ${fmt.format(item.releasedLines)} linhas · capacidade ${fmt.format(capacity)}`;
    return nextLevel
      ? `<button type="button" class="capacity-day capacity-drill-point ${groupByMonth ? "capacity-month" : ""}" data-capacity-period="${item.key}" data-capacity-next="${nextLevel}" data-capacity-operation="${operation}" title="${description} · abrir ${nextLevel === "week" ? "semana" : "dia"}" aria-label="${description}. Abrir ${nextLevel === "week" ? "semana" : "dia"}.">${content}</button>`
      : `<div class="capacity-day ${groupByMonth ? "capacity-month" : ""}" title="${description}">${content}</div>`;
  }).join("") : '<div class="empty">Sem liberações na janela selecionada</div>';
  const capacity = selectedCapacity(operation);
  const unit = groupByMonth ? "mensal" : "diária";
  const movement = operation === "Inbound" ? "recebimento" : "liberação";
  const demandLabel = operation === "Inbound" ? "Linhas recebidas" : "Linhas liberadas";
  const sheetName = operation === "Inbound" ? "CapacidadeInbound" : "Capacidade";
  const visualLevel = groupByMonth ? "month" : state.periodMode === "day" ? "day" : "week";
  return `<article class="panel"><div class="panel-head capacity-panel-head"><div><h2>Demanda ${unit} e capacidade</h2><span>${rows.length} ${groupByMonth ? "meses" : "dias"} com ${movement}</span></div>${capacityDrillControls(visualLevel, operation)}</div><div class="capacity-chart" role="region" tabindex="0" aria-label="Demanda e capacidade no período selecionado; use o drill para alternar entre mês, semana e dia">${chart}</div><div class="chart-legend"><span><i class="legend-demand"></i>${demandLabel}</span><span><i class="legend-limit"></i>${capacity.active ? "Capacidade oficial acumulada" : "Capacidade sugerida acumulada"}</span><span class="legend-drill">Clique em uma coluna para detalhar</span></div>${capacity.active ? "" : `<div class="notice warn"><b>NET não calculado</b><span>Preencha CapacidadeOficial e altere Ativo para Sim na aba ${sheetName}.</span></div>`}</article>`;
}

function capacityDrillControls(level, operation) {
  const levels = [{ key: "month", label: "Mês" }, { key: "week", label: "Semana" }, { key: "day", label: "Dia" }];
  const index = levels.findIndex(item => item.key === level);
  return `<div class="capacity-head-actions"><span>Nível do gráfico</span><div class="drill-toolbar" role="group" aria-label="Hierarquia do gráfico de demanda"><button type="button" class="drill-icon" data-capacity-drill="up" data-capacity-current="${level}" data-capacity-operation="${operation}" ${index <= 0 ? "disabled" : ""} title="Subir um nível" aria-label="Subir um nível">↑</button><div class="drill-levels">${levels.map(item => `<button type="button" class="drill-level ${item.key === level ? "active" : ""}" data-capacity-level="${item.key}" data-capacity-operation="${operation}" ${item.key === level ? 'aria-current="true"' : ""}>${item.label}</button>`).join("")}</div><button type="button" class="drill-icon" data-capacity-drill="down" data-capacity-current="${level}" data-capacity-operation="${operation}" ${index >= levels.length - 1 ? "disabled" : ""} title="Descer um nível" aria-label="Descer um nível">↓</button></div></div>`;
}

function capacityDrillAnchor(month = "", operation = "") {
  const operationDates = (dataset.dailyCapacity || []).filter(item => item.clientKey === state.client && (!operation || (item.operation || "Outbound") === operation) && (state.owner === "ALL" || item.ownerKey === state.owner)).map(item => item.date);
  const dates = operationDates.length ? [...new Set(operationDates)].sort() : availableDates();
  const monthDates = month ? dates.filter(date => date.startsWith(month)) : [];
  if (monthDates.length) return monthDates.at(-1);
  if (state.periodDate && dates.includes(state.periodDate)) return state.periodDate;
  if (state.periodMonth) {
    const anchoredDates = dates.filter(date => date.startsWith(state.periodMonth));
    if (anchoredDates.length) return anchoredDates.at(-1);
  }
  return dates.at(-1) || "";
}

function setCapacityDrillLevel(level, periodKey = "", operation = "") {
  if (level === "month") {
    state.periodMonth = (periodKey.length === 7 ? periodKey : state.periodDate.slice(0, 7)) || availableMonths().at(-1) || "";
    state.monthCount = 1;
    state.periodMode = "month";
  } else {
    const month = periodKey.length === 7 ? periodKey : "";
    const date = periodKey.length === 10 ? periodKey : capacityDrillAnchor(month, operation);
    if (date) { state.periodDate = date; state.periodMonth = date.slice(0, 7); }
    state.periodMode = level;
  }
  syncPeriodControls();
  render();
}

function stagePanel(operation = "Outbound") {
  const rows = stageRows(operation);
  const max = Math.max(1, ...rows.filter(item => item.stageTo !== "Shipped" || item.stageFrom !== "Creation").map(item => item.p90BusinessHours || 0));
  const chartRows = rows.filter(item => !(item.stageFrom === "Creation" && item.stageTo === "Shipped")).map(item => `<div class="stage-bar-row ${state.selectedProcess === "processing" && item.stageFrom === "Allocated" && item.stageTo === "In Progress" || state.selectedProcess === "picking" && item.stageFrom === "In Progress" && item.stageTo === "Picked" ? "selected" : ""}"><div><b>${stageKey(item)}</b><small>${item.trust} · cobertura ${pct(item.coverage)}</small></div><div class="stage-track"><i class="median" style="width:${Math.min(100, (item.medianBusinessHours || 0) / max * 100)}%"></i><i class="p90" style="left:${Math.min(100, (item.p90BusinessHours || 0) / max * 100)}%"></i></div><strong>${hours(item.medianBusinessHours)}<small>p90 ${hours(item.p90BusinessHours)}</small></strong></div>`).join("");
  const table = rows.map(item => `<tr><td><b>${stageKey(item)}</b>${item.targetBusinessHours == null ? '<small>Sem meta oficial</small>' : `<small>Meta ${hours(item.targetBusinessHours)}</small>`}</td><td>${hours(item.meanBusinessHours)}</td><td>${hours(item.medianBusinessHours)}</td><td>${hours(item.p90BusinessHours)}</td><td>${fmt.format(item.validCount)} de ${fmt.format(item.totalRecords)}</td><td><span class="status-pill ${trustClass(item)}">${item.trust}</span></td></tr>`).join("");
  return `<section class="panel stage-section"><div class="panel-head"><h2>Tempo entre etapas</h2><span>Horas úteis · média ponderada</span></div><p class="executive-note">Mediana e P90 abaixo são médias ponderadas dos resumos de origem; são referências aproximadas, não percentis exatos de todo o período.</p><div class="stage-bars">${chartRows}</div><div class="table-wrap stage-table"><table class="data-table"><thead><tr><th>Intervalo</th><th>Média</th><th>Mediana</th><th>P90</th><th>Registros usados</th><th>Confiabilidade</th></tr></thead><tbody>${table}</tbody></table></div></section>`;
}

function operationQualityPanel(operation = "Outbound") {
  const rows = periodStageRows(operation);
  const totals = rows.reduce((acc, item) => { acc.invalid += item.invalidSequenceCount; acc.incomplete += item.incompleteCount; acc.missing += item.missingCount; acc.open += item.openCount; acc.zero += item.zeroCount; return acc; }, { invalid: 0, incomplete: 0, missing: 0, open: 0, zero: 0 });
  const worst = [...rows].sort((a, b) => (a.coverage ?? 0) - (b.coverage ?? 0))[0];
  return `<section class="quality-grid outbound-quality">
    <article class="quality-card"><small>Sequência inválida</small><b>${fmt.format(totals.invalid)}</b><span>Fim anterior ao início; fora das estatísticas.</span></article>
    <article class="quality-card"><small>Dado incompleto</small><b>${fmt.format(totals.incomplete)}</b><span>Etapa intermediária ausente com etapa posterior preenchida.</span></article>
    <article class="quality-card"><small>Sem informação</small><b>${fmt.format(totals.missing)}</b><span>Pares sem dados suficientes; não utilizados.</span></article>
    <article class="quality-card"><small>Duração zero</small><b>${fmt.format(totals.zero)}</b><span>Válida, mas monitorada no controle de qualidade.</span></article>
    <article class="quality-card"><small>Em andamento</small><b>${fmt.format(totals.open)}</b><span>${hours(rows.find(item => item.stageFrom === "Creation" && item.stageTo === (operation === "Inbound" ? "Finish" : "Shipped"))?.medianOpenBusinessHours)} úteis de idade mediana.</span></article>
    <article class="quality-card"><small>Menor cobertura</small><b>${worst ? pct(worst.coverage) : "—"}</b><span>${worst ? stageKey(worst) : "Sem intervalos"}</span></article>
  </section>`;
}

function outboundPage() {
  return `${pageHeader("Expedição", "Performance Gross e NET, capacidade diária e jornada completa do pedido")}
    <div class="section-label"><b>Performance e capacidade</b><span>${analysisPeriodLabel()}</span></div>
    ${outboundKpis()}
    <section class="grid-equal outbound-grid">${grossNetPanel("Outbound")}${capacityPanel("Outbound")}</section>
    ${grossOperationalPanel("Outbound")}
    ${outboundProcessPerformance()}
    <div class="section-label"><b>Jornada do pedido</b><span>Distribuições do período selecionado; calendário útil aplicado</span></div>
    ${journeyNavigator("Outbound")}
    ${stagePanel("Outbound")}
    ${IS_ADMIN ? `<div class="section-label"><b>Qualidade dos tempos</b><span>Registros não usados permanecem explicados</span></div>${operationQualityPanel("Outbound")}` : ""}`;
}

function inboundPage() {
  return `${pageHeader("Recebimento", "Performance Gross e NET, capacidade diária e jornada completa do pré-aviso")}
    <div class="section-label"><b>Performance e capacidade</b><span>${analysisPeriodLabel()}</span></div>
    ${inboundKpis()}
    <section class="grid-equal outbound-grid">${grossNetPanel("Inbound")}${capacityPanel("Inbound")}</section>
    ${grossOperationalPanel("Inbound")}
    <div class="section-label"><b>Jornada do recebimento</b><span>Distribuições do período selecionado; calendário útil aplicado</span></div>
    ${journeyNavigator("Inbound")}
    ${stagePanel("Inbound")}
    ${IS_ADMIN ? `<div class="section-label"><b>Qualidade dos tempos</b><span>Registros não usados permanecem explicados</span></div>${operationQualityPanel("Inbound")}` : ""}`;
}

function operationRow(operation, label) {
  const item = periodMetric(operation), value = operationSla(operation, item), validLines = item?.calcGrossEligibleLines, onTimeLines = item?.calcGrossOnTimeLines, delayedLines = item?.calcGrossDelayedLines, onPct = validLines ? onTimeLines / validLines : 0, targetValue = target(operation).target;
  return `<div class="operation-row"><div class="operation-name"><b>${label}</b><small>${item ? fmt.format(validLines || 0) : 0} linhas válidas</small></div><div class="operation-value">${pct(value)}</div><div class="bar-cell"><div class="stack"><div class="stack-on" style="width:${onPct * 100}%"></div><div class="stack-late" style="width:${(1 - onPct) * 100}%"></div><i class="stack-target" style="left:${targetValue * 100}%" title="Meta SLA ${pct(targetValue)}" aria-hidden="true"></i></div><div class="stack-label">${item ? fmt.format(onTimeLines || 0) : 0} no prazo · ${item ? fmt.format(delayedLines || 0) : 0} em atraso</div></div>${pill(value, operation)}</div>`;
}

function inventorySummaryPanel() {
  const audit = inventoryAuditStats(), rows = inventoryPositionRows(), asOf = inventoryAsOfDate();
  const linesWithDifference = rows.filter(item => (item.difference || 0) !== 0).length;
  const absoluteDifference = rows.reduce((sum, item) => sum + Math.abs(item.difference || 0), 0);
  return `<section class="panel inventory-summary" aria-labelledby="inventorySummaryTitle">
    <div class="panel-head"><div><h2 id="inventorySummaryTitle">Inventário · contagem cíclica</h2><p class="inventory-summary-period">Atividade em ${analysisPeriodLabel()}</p></div><button class="action-button" data-go="Inventário">Ver inventário</button></div>
    ${audit.events.length ? `<div class="inventory-summary-metrics">
      ${kpi("Posições únicas auditadas", fmt.format(audit.uniquePositions), `${fmt.format(audit.events.length)} auditorias no período`)}
      ${kpi("Reauditorias", fmt.format(audit.revisitedPositions), "Posições contadas mais de uma vez no período")}
      ${kpi("Linhas com divergência", fmt.format(linesWithDifference), `${fmt.format(rows.length)} linhas na posição observada`, linesWithDifference ? "warn" : "neutral")}
      ${kpi("Divergência absoluta", fmt.format(absoluteDifference), "Unidades de diferença, sem compensar faltas e sobras", absoluteDifference ? "warn" : "neutral")}
    </div><p class="inventory-summary-note">Contagem parcial. Auditorias consideram o período selecionado; divergências usam a última contagem conhecida por Owner, localização, tag e SKU até ${dateLabel(asOf)}. Não representa o estoque total nem uma medida de SLA.</p>` : '<p class="inventory-summary-note">Sem contagens de inventário para o cliente, Owner e período selecionados.</p>'}
  </section>`;
}


function insights() {
  return ["Inbound", "Outbound"].map(operation => {
    const label = operation === "Inbound" ? "Recebimento" : "Expedição", now = periodMetric(operation), before = previousPeriodMetric(operation);
    const value = operationSla(operation, now), beforeValue = operationSla(operation, before), delta = value != null && beforeValue != null ? value - beforeValue : null, s = status(value, operation);
    const movement = delta == null ? "não possui janela anterior comparável" : `${delta >= 0 ? "avançou" : "recuou"} ${Math.abs(delta * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p. contra a janela anterior`;
    const delayed = now?.calcGrossDelayedLines;
    return `<div class="insight ${s.key}"><b>${label} · ${s.label}</b><p>O SLA ${movement} e encerrou em ${pct(value)}. ${now ? fmt.format(delayed || 0) : 0} linhas ficaram em atraso.</p></div>`;
  }).join("");
}

function filteredDetails() {
  const months = new Set(selectedMonths()), dates = periodDates();
  return (dataset.details[state.client] || []).filter(item => dates ? dates.includes(item.creationDate) : months.has(item.creationDate.slice(0, 7))).filter(ownerMatches).filter(item => state.detailOperation === "Todos" || item.operation === state.detailOperation).filter(item => state.detailPerformance === "Todos" || item.performance === state.detailPerformance).filter(item => !state.search || `${item.processId} ${item.technicalKey || ""} ${item.typeStatus} ${item.ownerName || ""}`.toLowerCase().includes(state.search.toLowerCase()));
}

function detailsPage() {
  const rows = filteredDetails();
  const grossLabel = item => ({ "Completed On Time": "Concluído no prazo", "Completed Delay": "Concluído em atraso", "Open On Track": "Em andamento no prazo", "Open Delay": "Atrasado em aberto", "Not Calculated": "Não calculado" }[item.grossStatus] || "Não aplicável");
  const body = rows.length ? rows.map(item => {
    const sourceCell = IS_ADMIN ? `<td>${item.sourcePerformanceAvailable === false ? '<span class="status-pill neutral">Não disponível</span>' : item.performance === "On Time" ? '<span class="status-pill good">No prazo</span>' : item.performance === "Delay" ? '<span class="status-pill danger">Atraso</span>' : '<span class="status-pill neutral">Não classificado</span>'}</td>` : "";
    const internalReason = IS_ADMIN ? item.grossReason || item.grossFallbackReason : item.grossReason;
    const calculatedCell = item.grossStatus && item.grossStatus !== "Legacy" ? `<span class="status-pill ${item.grossStatus === "Completed On Time" || item.grossStatus === "Open On Track" ? "good" : item.grossStatus === "Not Calculated" ? "warn" : "danger"}">${grossLabel(item)}</span><small>${htmlEscape(internalReason || (item.grossDueAt ? `Vence em ${new Date(item.grossDueAt).toLocaleString("pt-BR")}` : ""))}</small>` : "Histórico da base";
    return `<tr><td>${item.operation === "Outbound" ? "Expedição" : "Recebimento"}</td><td>${htmlEscape(item.ownerName || item.ownerKey || "—")}</td><td><b>${htmlEscape(item.processId)}</b><small>${htmlEscape(item.technicalKey || "")}</small></td><td>${dateLabel(item.creationDate)}</td><td>${item.lineCount == null ? "—" : fmt.format(item.lineCount)}</td><td>${htmlEscape(item.typeStatus)}</td>${sourceCell}<td>${calculatedCell}</td><td>${htmlEscape(item.netStatus || "Não aplicável")}${item.netIncludedLines != null ? `<small>${fmt.format(item.netIncludedLines)} no NET · ${fmt.format(item.capacityExcludedLines || 0)} excluídas</small>` : ""}</td></tr>`;
  }).join("") : `<tr><td colspan="${IS_ADMIN ? 9 : 8}" class="empty">Nenhum processo encontrado com os filtros atuais.</td></tr>`;
  const sourceFilter = IS_ADMIN ? `<label class="field"><span>Performance da base</span><select id="detailPerformance"><option>Todos</option><option value="On Time" ${state.detailPerformance === "On Time" ? "selected" : ""}>On Time</option><option ${state.detailPerformance === "Delay" ? "selected" : ""}>Delay</option><option ${state.detailPerformance === "Unclassified" ? "selected" : ""}>Unclassified</option></select></label>` : "";
  const sourceHeader = IS_ADMIN ? "<th>Performance da base</th>" : "";
  return `${pageHeader("Detalhes", "Processos fora do prazo ou sem classificação", '<button class="action-button" id="exportCsv">Exportar CSV</button>')}<section class="panel"><div class="table-tools"><label class="field search"><span>Pesquisar processo</span><input id="detailSearch" value="${htmlEscape(state.search)}" placeholder="ID, chave, Owner ou tipo/status"></label><label class="field"><span>Operação</span><select id="detailOperation"><option>Todos</option><option value="Inbound" ${state.detailOperation === "Inbound" ? "selected" : ""}>Recebimento</option><option value="Outbound" ${state.detailOperation === "Outbound" ? "selected" : ""}>Expedição</option></select></label>${sourceFilter}</div><div class="table-wrap"><table class="data-table"><thead><tr><th>Operação</th><th>Owner</th><th>Processo / chave</th><th>Criação</th><th>Linhas</th><th>Tipo ou status</th>${sourceHeader}<th>Performance calculada</th><th>Status NET</th></tr></thead><tbody>${body}</tbody></table></div></section>`;
}

function administrativeComparisonPanel() {
  const rows = selectedMonths().map(month => metric("Outbound", month) || { month, validLines: 0 });
  const body = rows.map(item => {
    const sourceAvailable = !(item.newSourceRecords > 0), source = sourceAvailable ? sla(item) : null, gross = calculatedGross(item);
    return `<div class="compare-row"><b>${monthLabel(item.month)}</b><div class="compare-bars"><div><span>Base</span><div class="mini-track"><i class="source-fill" style="width:${(source || 0) * 100}%"></i></div><strong>${sourceAvailable ? pct(source) : "N/D"}</strong></div><div><span>Regra</span><div class="mini-track"><i class="gross-fill" style="width:${(gross || 0) * 100}%"></i></div><strong>${pct(gross)}</strong></div></div></div>`;
  }).join("");
  return `<article class="panel"><div class="panel-head"><h2>Performance da base x Gross recalculado</h2><span>Uso administrativo</span></div><div class="compare-list">${body || '<div class="empty">Sem histórico</div>'}</div></article>`;
}

function administrationPage() {
  const q = dataset.quality;
  const item = periodMetric("Outbound"), sourceAvailable = !(item?.newSourceRecords > 0), source = sourceAvailable ? sla(item) : null, gross = calculatedGross(item), disagreements = (item?.comparisonSourceOnTimeCalcDelayLines || 0) + (item?.comparisonSourceDelayCalcOnTimeLines || 0);
  const timeWithoutDate = Object.values(q.timestampWithoutDate || {}).reduce((sum, value) => sum + value, 0);
  const auditRows = (q.outboundFiles || []).filter(file => file.clientKey === state.client || state.client === "").map(file => `<tr><td><b>${htmlEscape(file.clientKey)}</b></td><td>${htmlEscape(file.file)}</td><td>${fmt.format(file.rows)}</td><td>${file.minCreation ? dateLabel(file.minCreation) : "—"}</td><td>${file.maxCreation ? dateLabel(file.maxCreation) : "—"}</td><td>${fmt.format(file.duplicates || 0)}</td><td><span class="status-pill ${file.status === "Válido" ? "good" : "danger"}">${htmlEscape(file.status)}</span><small>${htmlEscape(file.validation || "")}</small></td></tr>`).join("");
  return `${pageHeader("Administração", "Indicadores internos de origem, cobertura, divergências e qualidade", '<a class="action-button" href="../outputs/01a08633-89b4-7283-8814-f0b65f6970f7/ParametrosOperacionais_Inbound.xlsx" download>Baixar parâmetros</a>')}
    <section class="kpi-grid outbound-kpis">
      ${kpi("Performance da base", sourceAvailable ? pct(source) : "N/D", sourceAvailable ? (item ? `${fmt.format(item.validLines)} linhas classificadas na origem` : "Sem dados") : "Não existe Performance na nova fonte", sourceAvailable ? status(source, "Outbound").key : "neutral")}
      ${kpi("Gross recalculado", pct(gross), item ? `${fmt.format(item.calcGrossEligibleLines)} linhas no realizado` : "Sem dados", status(gross, "Outbound").key)}
      ${kpi("Cobertura da regra", pct(grossCoverage(item)), item ? `${fmt.format(item.calcNotCalculatedRecords)} registros não calculados` : "Sem dados", grossCoverage(item) >= .98 ? "good" : grossCoverage(item) >= .90 ? "warn" : "danger")}
      ${kpi("Fallback de etapa", item ? fmt.format(item.calcFallbackRecords) : "—", item ? `${fmt.format(item.calcFallbackLines)} linhas com etapa anterior` : "Sem dados", item?.calcFallbackRecords ? "warn" : "good")}
      ${kpi("Divergência com a base", item ? fmt.format(disagreements) : "—", "Linhas com classificações diferentes", disagreements ? "warn" : "good")}
      ${kpi("Sem cálculo", item ? fmt.format(item.calcNotCalculatedLines) : "—", item ? `${fmt.format(item.calcNotCalculatedRecords)} processos` : "Sem dados", item?.calcNotCalculatedLines ? "danger" : "good")}
    </section>
    <section class="grid-equal outbound-grid">${administrativeComparisonPanel()}<article class="panel"><div class="panel-head"><h2>Volume e integridade da fonte</h2><span>Uso administrativo</span></div><div class="quality-grid admin-quality-grid"><article class="quality-card"><small>Registros Outbound</small><b>${fmt.format(q.sourceRows.Outbound)}</b><span>Pedidos lidos na fonte</span></article><article class="quality-card"><small>Cancelados excluídos</small><b>${fmt.format(q.cancelledOutbound || 0)}</b><span>CANCELLED com data; fora de todos os indicadores</span></article><article class="quality-card"><small>Registros Inbound</small><b>${fmt.format(q.sourceRows.Inbound)}</b><span>Pré-avisos lidos na fonte</span></article><article class="quality-card"><small>Criação inválida</small><b>${fmt.format((q.invalidCreationDates.Outbound || 0) + (q.invalidCreationDates.Inbound || 0))}</b><span>Não entra no período analisado</span></article><article class="quality-card"><small>Hora sem data</small><b>${fmt.format(timeWithoutDate)}</b><span>Não entra no timestamp combinado</span></article><article class="quality-card"><small>BMW excluído do Inbound</small><b>${fmt.format(q.excludedInboundBMW)}</b><span>Regra provisória da análise</span></article></div></article></section>
    <section class="panel"><div class="panel-head"><h2>Auditoria da base consolidada Outbound</h2><span>Recorte do cliente selecionado</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Cliente</th><th>Arquivo</th><th>Linhas</th><th>Primeira criação</th><th>Última criação</th><th>Duplicadas</th><th>Validação</th></tr></thead><tbody>${auditRows || '<tr><td colspan="7" class="empty">Cliente ainda utiliza somente a fonte legada.</td></tr>'}</tbody></table></div></section>
    <section class="panel"><div class="panel-head"><h2>Regras de validação</h2><span>Aplicadas na geração local</span></div><div class="check-list"><div class="check"><b>Fonte migrada</b><span class="status-pill good">Validada</span><span>Um CSV ativo por cliente, chave Site + Client + Order Id única, Owner obrigatório e corte sem sobreposição.</span></div><div class="check"><b>Cancelamento na nova fonte</b><span class="status-pill neutral">${q.newSourceCancellationField ? "Disponível" : "Campo ausente"}</span><span>${q.newSourceCancellationField ? "Datas válidas são excluídas." : "Os CSVs atuais não possuem CANCELLED; nenhuma exclusão é inferida."}</span></div><div class="check"><b>Gross recalculado</b><span class="status-pill good">Ativo</span><span>Usa a regra vigente do cliente e Owner, eventos configurados, faixas de corte e quantidade de linhas maior que zero.</span></div><div class="check"><b>Timestamps</b><span class="status-pill good">Formato validado</span><span>A nova fonte exige MM-DD-AAAA HH:MM:SS; valores preenchidos e inválidos bloqueiam a publicação.</span></div><div class="check"><b>Calendário útil</b><span class="status-pill good">Ativo</span><span>Segunda a sexta, 08h–12h e 13h–17h, com feriados e exceções da planilha operacional.</span></div><div class="check"><b>Capacidade NET</b><span class="status-pill ${q.operationalConfigFound ? "good" : "danger"}">${q.operationalConfigFound ? "Configurada" : "Ausente"}</span><span>Prioridade de parâmetros: Cliente + Owner, Cliente + DEFAULT, DEFAULT + DEFAULT.</span></div></div></section>`;
}

function render(announce = false) {
  document.querySelectorAll(".page-tabs button").forEach(button => { const active = button.dataset.page === state.page; button.classList.toggle("active", active); if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current"); });
  const config = PAGE_CONFIG.find(item => item.id === state.page);
  let html = "";
  if (state.page === "Resumo") html = summaryPage();
  if (state.page === "Recebimento") html = inboundPage();
  if (state.page === "Expedição") html = outboundPage();
  if (state.page === "Inventário") html = inventoryPage();
  if (state.page === "Detalhes") html = detailsPage();
  if (state.page === "Administração" && IS_ADMIN) html = administrationPage();
  const content = document.getElementById("content");
  if (state.page === "Administração" && IS_ADMIN) html += pendingAnalyticsPanel();
  content.innerHTML = html;
  content.setAttribute("aria-labelledby", "pageTitle");
  document.title = `${config.id} · Performance Operacional`;
  updatePeriodLabel();
  bindPageEvents();
  if (announce) window.requestAnimationFrame(() => { content.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: "instant" }); });
}

function setSidebarOpen(open, moveFocus = true) {
  const sidebar = document.getElementById("sidebar"), menu = document.getElementById("mobileMenu"), backdrop = document.getElementById("sidebarBackdrop"), mobile = window.matchMedia("(max-width: 850px)").matches;
  const visible = mobile ? open : true;
  sidebar.classList.toggle("open", visible);
  sidebar.setAttribute("aria-hidden", mobile ? String(!open) : "false");
  sidebar.inert = mobile && !open;
  menu.setAttribute("aria-expanded", String(mobile && open));
  backdrop.hidden = !mobile || !open;
  if (moveFocus && mobile) (open ? document.getElementById("closeSidebar") : menu).focus();
}

function bindPageEvents() {
  document.querySelectorAll(".client-logo").forEach(image => image.addEventListener("error", () => { image.hidden = true; }));
  document.querySelectorAll("[data-journey]").forEach(button => button.addEventListener("click", () => {
    state.selectedJourney = button.dataset.journey;
    render();
    [...document.querySelectorAll("[data-journey]")].find(item => item.dataset.journey === state.selectedJourney)?.focus({ preventScroll: true });
  }));
  document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => { state.page = button.dataset.go; if (state.page === "Detalhes" && button.dataset.operation) { state.detailOperation = button.dataset.operation; state.detailPerformance = "Delay"; state.search = ""; } render(true); }));
  document.querySelectorAll("[data-process-stage]").forEach(button => button.addEventListener("click", () => { state.selectedProcess = state.selectedProcess === button.dataset.processStage ? "" : button.dataset.processStage; const rule = processRule(state.selectedProcess === "picking" ? "SEPARACAO" : "PROCESSAMENTO"); state.selectedJourney = state.selectedProcess ? `${rule.startFrom} → ${rule.startTo}` : ""; render(); [...document.querySelectorAll("[data-process-stage]")].find(item => item.dataset.processStage === button.dataset.processStage)?.focus({ preventScroll: true }); }));
  document.querySelectorAll("[data-capacity-level]").forEach(button => button.addEventListener("click", () => setCapacityDrillLevel(button.dataset.capacityLevel, "", button.dataset.capacityOperation)));
  document.querySelectorAll("[data-capacity-drill]").forEach(button => button.addEventListener("click", () => {
    const levels = ["month", "week", "day"];
    const visualLevel = button.dataset.capacityCurrent;
    const current = levels.indexOf(visualLevel), offset = button.dataset.capacityDrill === "up" ? -1 : 1;
    setCapacityDrillLevel(levels[Math.max(0, Math.min(levels.length - 1, current + offset))], "", button.dataset.capacityOperation);
  }));
  document.querySelectorAll("[data-capacity-period]").forEach(button => button.addEventListener("click", () => setCapacityDrillLevel(button.dataset.capacityNext, button.dataset.capacityPeriod, button.dataset.capacityOperation)));
  document.getElementById("detailSearch")?.addEventListener("input", event => { state.search = event.target.value; window.clearTimeout(window.searchTimer); window.searchTimer = window.setTimeout(render, 180); });
  document.getElementById("detailOperation")?.addEventListener("change", event => { state.detailOperation = event.target.value; render(); });
  document.getElementById("detailPerformance")?.addEventListener("change", event => { state.detailPerformance = event.target.value; render(); });
  document.getElementById("exportCsv")?.addEventListener("click", exportCsv);
}
function updatePeriodLabel() { document.getElementById("periodLabel").textContent = analysisPeriodLabel(); }
function syncPeriodControls() {
  const mode = document.getElementById("periodMode"), windowField = document.getElementById("periodWindowField"), windowFilter = document.getElementById("periodFilter"), dateField = document.getElementById("periodDateField"), date = document.getElementById("periodDate"), fields = document.getElementById("periodDateFields"), start = document.getElementById("periodStart"), end = document.getElementById("periodEnd");
  if (!mode || !fields) return;
  mode.value = state.periodMode;
  if (windowFilter) windowFilter.value = String(state.monthCount);
  if (windowField) windowField.hidden = state.periodMode !== "month";
  if (dateField) dateField.hidden = !["week", "day"].includes(state.periodMode);
  fields.hidden = state.periodMode !== "range";
  const dates = availableDates(), first = dates[0] || "", last = dates.at(-1) || "";
  if (date) { date.min = first; date.max = last; if (!state.periodDate || state.periodDate < first || state.periodDate > last) state.periodDate = last; date.value = state.periodDate; }
  if (start && end) { start.min = first; start.max = last; end.min = first; end.max = last; if (!state.periodStart || state.periodStart < first || state.periodStart > last) state.periodStart = first; if (!state.periodEnd || state.periodEnd < first || state.periodEnd > last) state.periodEnd = last; start.value = state.periodStart; end.value = state.periodEnd; }
}
function exportCsv() { const clientHeader = ["Operação", "Owner", "Processo", "Chaveamento", "Criação", "Linhas", "Tipo ou status", "Performance Gross", "Início", "Vencimento", "Conclusão", "Status NET", "Linhas no NET", "Linhas excluídas"]; const adminHeader = ["Operação", "Owner", "Owner original", "Fonte", "Processo", "Chaveamento", "Criação", "Linhas", "Tipo ou status", "Performance da base", "Gross recalculado", "Motivo Gross", "Motivo fallback", "Regra Gross", "Evento inicial", "Evento final configurado", "Evento final usado", "Início", "Vencimento", "Conclusão", "Status NET", "Linhas no NET", "Linhas excluídas"]; const rows = filteredDetails().map(item => IS_ADMIN ? [item.operation, item.ownerName || "", item.ownerRaw || "", item.sourceKind || "", item.processId, item.technicalKey || "", item.creationDate, item.lineCount ?? "", item.typeStatus, item.sourcePerformanceAvailable === false ? "Não disponível" : item.performance, item.grossStatus || "", item.grossReason || "", item.grossFallbackReason || "", item.grossRuleId || "", item.grossStageFrom || "", item.grossStageTo || "", item.grossStageToUsed || "", item.grossStartAt || "", item.grossDueAt || "", item.grossEndAt || "", item.netStatus || "", item.netIncludedLines ?? "", item.capacityExcludedLines ?? ""] : [item.operation, item.ownerName || "", item.processId, item.technicalKey || "", item.creationDate, item.lineCount ?? "", item.typeStatus, item.grossStatus || "", item.grossStartAt || "", item.grossDueAt || "", item.grossEndAt || "", item.netStatus || "", item.netIncludedLines ?? "", item.capacityExcludedLines ?? ""]); const csv = [IS_ADMIN ? adminHeader : clientHeader, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(";")).join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" })); link.download = `${IS_ADMIN ? "excecoes_administrativas" : "excecoes"}_${state.client}_${state.owner}.csv`; link.click(); URL.revokeObjectURL(link.href); showToast("Arquivo CSV preparado."); }
function showToast(message) { const toast = document.getElementById("toast"); toast.textContent = message; toast.classList.add("show"); window.setTimeout(() => toast.classList.remove("show"), 2400); }

function refreshOwnerFilter() {
  const owners = clientInfo()?.owners || [], field = document.getElementById("ownerField"), filter = document.getElementById("ownerFilter");
  if (!owners.some(item => item.key === state.owner)) state.owner = "ALL";
  filter.innerHTML = `<option value="ALL">Todos os owners</option>${owners.map(item => `<option value="${htmlEscape(item.key)}" ${item.key === state.owner ? "selected" : ""}>${htmlEscape(item.name)}</option>`).join("")}`;
  field.hidden = owners.length <= 1;
}

async function init() {
  try {
    if (window.EMBEDDED_DASHBOARD_DATA) {
      dataset = window.EMBEDDED_DASHBOARD_DATA;
    } else {
      if (window.location.protocol === "file:") throw new Error("Abra Dashboard Atualizado.html na pasta principal do projeto.");
      const response = await fetch("data/dashboard_data.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      dataset = await response.json();
    }
    state.client = dataset.meta.defaultClient;
    document.getElementById("dataStatusLabel").textContent = IS_ADMIN ? "Base local" : "Dados atualizados";
    document.getElementById("clientFilter").innerHTML = dataset.clients.map(item => `<option value="${item.key}" ${item.key === state.client ? "selected" : ""}>${htmlEscape(item.name)} · ${item.key}</option>`).join("");
    refreshOwnerFilter();
    document.getElementById("updatedAt").textContent = `Fonte atualizada em ${new Date(dataset.meta.sourceUpdatedAt).toLocaleString("pt-BR")}`;
    document.getElementById("pageTabs").innerHTML = PAGE_CONFIG.map(item => `<button data-page="${item.id}" data-short="${item.short}" aria-label="${item.id}" ${item.id === state.page ? 'aria-current="page"' : ""} title="${item.subtitle}" class="${item.id === state.page ? "active" : ""}">${item.id}</button>`).join("");
  document.getElementById("pageTabs").addEventListener("click", event => { const button = event.target.closest("button[data-page]"); if (!button) return; state.page = button.dataset.page; render(true); });
    document.getElementById("clientFilter").addEventListener("change", event => { state.client = event.target.value; state.owner = "ALL"; state.periodMonth = ""; state.periodDate = ""; state.search = ""; state.selectedProcess = ""; refreshOwnerFilter(); syncPeriodControls(); render(); });
    document.getElementById("ownerFilter").addEventListener("change", event => { state.owner = event.target.value; state.periodMonth = ""; state.periodDate = ""; state.search = ""; state.selectedProcess = ""; syncPeriodControls(); render(); });
    document.getElementById("periodFilter")?.addEventListener("change", event => { state.monthCount = Number(event.target.value); state.periodMonth = ""; state.selectedProcess = ""; render(); });
    document.getElementById("periodMode")?.addEventListener("change", event => { state.periodMode = event.target.value; state.selectedProcess = ""; if (state.periodMode === "month") state.periodMonth = ""; syncPeriodControls(); render(); });
    document.getElementById("periodDate")?.addEventListener("change", event => { state.periodDate = event.target.value; state.periodMonth = state.periodDate.slice(0, 7); state.selectedProcess = ""; render(); });
    document.getElementById("periodStart").addEventListener("change", event => { state.periodStart = event.target.value; state.selectedProcess = ""; if (state.periodEnd && state.periodStart > state.periodEnd) state.periodEnd = state.periodStart; syncPeriodControls(); render(); });
    document.getElementById("periodEnd").addEventListener("change", event => { state.periodEnd = event.target.value; state.selectedProcess = ""; if (state.periodStart && state.periodEnd < state.periodStart) state.periodStart = state.periodEnd; syncPeriodControls(); render(); });
    document.getElementById("mobileMenu").addEventListener("click", () => setSidebarOpen(!document.getElementById("sidebar").classList.contains("open")));
    // Keep older cached shells from failing before the dashboard can show a recovery message.
    document.getElementById("closeSidebar")?.addEventListener("click", () => setSidebarOpen(false));
    document.getElementById("sidebarBackdrop")?.addEventListener("click", () => setSidebarOpen(false));
    document.addEventListener("keydown", event => { if (event.key === "Escape" && document.getElementById("sidebar").classList.contains("open") && window.matchMedia("(max-width: 850px)").matches) setSidebarOpen(false); });
    window.addEventListener("resize", () => setSidebarOpen(false, false));
    setSidebarOpen(false, false);
    document.getElementById("refreshData").addEventListener("click", () => showToast("Feche as planilhas e execute 'Atualizar Dashboard Atualizado.cmd' na pasta principal para regenerar o dashboard."));
    syncPeriodControls(); document.getElementById("loading").hidden = true; document.getElementById("app").hidden = false; render();
  } catch (error) {
    document.getElementById("loading").innerHTML = `<strong>Não foi possível carregar os dados</strong><span>Feche as planilhas e execute 'Atualizar Dashboard Atualizado.cmd' na pasta principal.<br>${htmlEscape(error.message)}</span>`;
  }
}

// Capacity is assessed per Owner and day; spare capacity never offsets another day.
function capacityPressure(operation) {
  const dates = periodDates(), selected = new Set(dates || selectedMonths());
  const source = (dataset.dailyCapacity || []).filter(row => row.clientKey === state.client && ownerMatches(row) && (row.operation || "Outbound") === operation && selected.has(dates ? row.date : row.date.slice(0, 7)));
  const groups = new Map();
  source.forEach(row => {
    const key = `${row.ownerKey}|${row.date}`;
    const group = groups.get(key) || { ...row, releasedLines: 0 };
    group.releasedLines += row.releasedLines || 0;
    groups.set(key, group);
  });
  const rows = [...groups.values()], activeDays = new Set(rows.map(row => row.date));
  const official = rows.filter(row => row.officialCapacity != null && Number.isFinite(row.officialCapacity));
  const allOfficial = rows.length > 0 && official.length === rows.length;
  const evaluated = rows.filter(row => row.officialCapacity != null || row.suggestedCapacity != null);
  const excessDays = new Set(); let excess = 0;
  evaluated.forEach(row => { const limit = row.officialCapacity ?? row.suggestedCapacity; const over = Math.max(0, row.releasedLines - limit); excess += over; if (over > 0) excessDays.add(row.date); });
  return { days: activeDays.size, evaluated: evaluated.length, missing: rows.length - evaluated.length, excessDays: excessDays.size, excess, allOfficial };
}

function capacityPressurePanel(operation) {
  const data = capacityPressure(operation), metric = periodMetric(operation), label = operation === "Inbound" ? "Recebimento" : "Expedição";
  const netAvailable = (metric?.netEligibleLines || 0) > 0;
  return `<article class="panel pressure-panel"><div class="panel-head"><h2>${label} · pressão de capacidade</h2><button class="action-button" data-go="${label}">Ver operação</button></div>
    <dl class="executive-metrics"><div><dt>Dias acima da capacidade</dt><dd>${data.evaluated ? fmt.format(data.excessDays) : "—"}</dd><small>${data.allOfficial ? "Capacidade oficial" : "Referência; inclui capacidade sugerida"}</small></div><div><dt>Excesso de demanda</dt><dd>${data.evaluated ? fmt.format(data.excess) : "—"}</dd><small>Linhas acima do limite diário</small></div><div><dt>Linhas excluídas do NET</dt><dd>${netAvailable ? fmt.format(metric.capacityExcludedLines || 0) : "—"}</dd><small>${netAvailable ? "Exclusões efetivas no recorte Gross" : "NET sem base elegível"}</small></div></dl>
    <p class="executive-note">${data.days} dias com dados. ${data.missing ? `${data.missing} combinações de Owner e dia sem capacidade; não entram na comparação. ` : ""}Demanda pela data de recebimento/liberação; Gross pela criação. Excesso de demanda e exclusão do NET podem diferir.</p></article>`;
}

function executiveOperationRow(operation) {
  const item = periodMetric(operation), gross = calculatedGross(item), net = netSla(item), label = operation === "Inbound" ? "Recebimento" : "Expedição";
  return `<div class="executive-operation"><div><button class="operation-link" data-go="${label}">${label}</button><small>${fmt.format(item?.calcGrossEligibleLines || 0)} linhas elegíveis</small></div><div><span>Performance Gross</span><strong>${pct(gross)}</strong></div><div><span>Performance NET</span><strong>${pct(net)}</strong></div><div><span>Meta SLA</span><strong>${pct(target(operation).target)}</strong></div>${pill(gross, operation)}<div class="executive-track"><div class="stack"><i class="stack-on" style="width:${Math.max(0, Math.min(100, (gross || 0) * 100))}%"></i><i class="stack-target" style="left:${target(operation).target * 100}%" title="Meta SLA ${pct(target(operation).target)}"></i></div><small>${fmt.format(item?.calcGrossOnTimeLines || 0)} no prazo · ${fmt.format(item?.calcGrossDelayedLines || 0)} em atraso${net == null ? " · NET indisponível para este recorte" : ""}</small></div></div>`;
}

function executiveInsights() {
  const operations = ["Inbound", "Outbound"].map(operation => ({ operation, item: periodMetric(operation) }));
  const audit = inventoryAuditStats();
  const actions = operations.map(({operation, item}) => {
    const label = operation === "Inbound" ? "Recebimento" : "Expedição", gross = calculatedGross(item);
    return `<button class="executive-action" data-go="${label}"><b>${label} · ${status(gross, operation).label}</b><span>${gross == null ? "Sem linhas elegíveis no período" : `${fmt.format(item.calcGrossDelayedLines || 0)} linhas atrasadas · Gross ${pct(gross)} · meta ${pct(target(operation).target)}`}</span><small>Examinar capacidade, processos e jornada</small></button>`;
  }).join("");
  return `${actions}<button class="executive-action" data-go="Inventário"><b>Inventário · alcance da contagem</b><span>${audit.events.length ? `${fmt.format(audit.uniquePositions)} posições auditadas · ${fmt.format(audit.revisitedPositions)} revisitadas` : "Sem contagens no período selecionado"}</span><small>Examinar atividade e divergências</small></button>`;
}

function summaryPage() {
  const operations = ["Inbound", "Outbound"].map(operation => ({ operation, value: calculatedGross(periodMetric(operation)) })).filter(row => row.value != null);
  operations.sort((a, b) => (a.value - target(a.operation).target) - (b.value - target(b.operation).target));
  const focus = operations[0], label = focus?.operation === "Inbound" ? "Recebimento" : "Expedição";
  const headline = !focus ? "Sem performance elegível no período" : focus.value < target(focus.operation).target ? `${label} exige atenção ao prazo` : "Operações com dados estão dentro da meta";
  return `${pageHeader("Visão geral", "Resultado, capacidade e inventário no período selecionado", `<span class="period-badge">${analysisPeriodLabel()}</span>`)}
    <section class="executive-lead"><h2>${headline}</h2><p>Compare o compromisso com o cliente, identifique a pressão diária de demanda e aprofunde a análise por processo.</p></section>
    <section class="grid-2 executive-grid"><article class="panel"><div class="panel-head"><h2>Resultado por operação</h2><span>Percentuais ponderados pelas linhas</span></div>${executiveOperationRow("Inbound")}${executiveOperationRow("Outbound")}</article><article class="panel"><div class="panel-head"><h2>O que investigar</h2><span>Acesso ao diagnóstico</span></div>${executiveInsights()}</article></section>
    <section class="grid-equal executive-capacity">${capacityPressurePanel("Inbound")}${capacityPressurePanel("Outbound")}</section>
    <section class="grid-equal executive-capacity"><div class="summary-capacity"><h2>Recebimento</h2>${capacityPanel("Inbound")}</div><div class="summary-capacity"><h2>Expedição</h2>${capacityPanel("Outbound")}</div></section>
    ${inventorySummaryPanel()}`;
}

function journeyNavigator(operation) {
  const rows = stageRows(operation).filter(row => !(row.stageFrom === "Creation" && ["Shipped", "Finish"].includes(row.stageTo)));
  const selected = rows.find(row => stageKey(row) === state.selectedJourney) || rows.find(row => row.coverage >= .9) || rows[0];
  if (!selected) return '<p class="empty">Sem tempos de etapas para os filtros selecionados.</p>';
  return `<section class="journey-navigator" aria-label="Explorar jornada"><div class="journey-stops">${rows.map(row => `<button class="journey-stop ${row === selected ? "selected" : ""}" data-journey="${htmlEscape(stageKey(row))}" aria-pressed="${row === selected}"><b>${htmlEscape(stageKey(row))}</b><strong>${hours(row.meanBusinessHours)}</strong><small>Média em horas úteis · ${fmt.format(row.validCount)} registros</small></button>`).join("")}</div><div class="journey-detail"><h3>${htmlEscape(stageKey(selected))}</h3><p>${fmt.format(selected.validCount)} de ${fmt.format(selected.totalRecords)} registros com duração válida · cobertura ${pct(selected.coverage)}.</p><p>Dados ausentes ou sequências inválidas não entram na média. A média é ponderada pelos registros válidos; o maior tempo observado numa etapa, sozinho, não comprova a causa do atraso.</p></div></section>`;
}

function pendingAnalyticsPanel() {
  return `<section class="panel pending-analytics"><h2>Próximos indicadores · bases necessárias</h2><dl><dt>Backlog e envelhecimento</dt><dd>Fonte de pedidos abertos com início, prazo e situação atual. Não inferir zero de uma base somente de expedidos.</dd><dt>Intensidade do atraso em horas úteis</dt><dd>Apurar por pedido a diferença entre vencimento e conclusão usando o calendário operacional, antes de consolidar mediana e P90.</dd><dt>Acuracidade da primeira contagem e reincidência</dt><dd>Validar a identificação da contagem original e das recontagens anteriores aos ajustes.</dd><dt>Cobertura do plano e resolução de divergências</dt><dd>Plano de posições previstas e histórico de investigação com abertura e encerramento.</dd></dl></section>`;
}

init();
