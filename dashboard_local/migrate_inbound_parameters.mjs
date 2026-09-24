import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const root = "C:/performance_geral_cjm/00 - HTML's update";
const workbookPath = `${root}/outputs/01a08633-89b4-7283-8814-f0b65f6970f7/ParametrosOperacionais.xlsx`;
const previewDir = `${root}/dashboard_local/.previews/inbound_migration`;
const mode = process.argv[2] || "inspect";
const navy = "#002664";
const amber = "#FFF2CC";
const line = "#DCE2EA";
const ink = "#172033";
const muted = "#667085";

function styleHeader(range) {
  range.format = { fill: navy, font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { insideVertical: { style: "thin", color: "#FFFFFF" } } };
  range.format.rowHeight = 36;
}

function styleBody(range) {
  range.format.font = { name: "Arial", size: 10, color: ink };
  range.format.verticalAlignment = "center";
  range.format.borders = { insideHorizontal: { style: "thin", color: line } };
  range.format.rowHeight = 23;
}

function setupSheet(sheet, title, subtitle, endColumn, tabColor = "#7A5AF8") {
  sheet.showGridLines = false;
  sheet.tabColor = tabColor;
  sheet.getRange(`A2:${endColumn}2`).merge();
  sheet.getRange("A2").values = [[title]];
  sheet.getRange("A2").format.font = { name: "Arial", size: 15, bold: true, color: navy };
  sheet.getRange(`A3:${endColumn}3`).merge();
  sheet.getRange("A3").values = [[subtitle]];
  sheet.getRange("A3").format.font = { name: "Arial", size: 10, italic: true, color: muted };
}

const sources = [
  ["ALGAR", "BRALGAR", "2026-08-03"], ["AMZNLABS", "BRAMZNLABS", "2026-08-05"], ["ASUS", "BRACBZ", "2026-06-17"],
  ["BAT", "BRBAT", "2026-06-17"], ["BT", "BRBT", "2026-06-10"], ["CLARO", "BRCLAROSPO", "2026-06-02"],
  ["COMBA", "BRCOMBA", "2026-08-05"], ["CORBION", "BRCORBION", "2026-06-22"], ["DUCATI", "BRDUCATIMO", "2026-06-18"],
  ["EDELWHITE", "BREDELWHIT", "2026-06-16"], ["FIVEHANDS", "BRFIVEHNDS", "2026-06-30"], ["GAC", "BRGACMES", "2026-06-19"],
  ["GNUTRA", "BRGNUTRA", "2026-08-19"], ["GWM", "BRGWM", "2026-05-29"], ["HANSEN", "BRHANSEN", "2026-06-19"],
  ["HARLEY", "BRHARLD", "2026-06-16"], ["JAC", "BRJAC", "2026-06-29"], ["JETOUR", "BRCJ1JET", "2026-07-02"],
  ["MART", "BRMART", "2026-07-07"], ["MWC", "BRMWC", "2026-07-02"], ["OLESEN", "BROLESEN", "2026-06-17"],
  ["OMODA", "BROMODA", "2026-06-22"], ["ROQUETTE", "BRRQTCAJ", "2026-06-24"], ["SAIC", "BRSAIC", "2026-06-19"],
  ["SCANDERRA", "BRSCANDERR", "2026-06-16"], ["XSYS", "BRCJ1XYS", "2026-06-18"],
];

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
await fs.mkdir(previewDir, { recursive: true });

if (mode === "inspect") {
  for (const [sheetName, range] of [["Orientacoes", "A1:B27"], ["RegrasGross", "A1:Q18"], ["FontesOutbound", "A1:H21"]]) {
    const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
    await fs.writeFile(`${previewDir}/before_${sheetName}.png`, new Uint8Array(await preview.arrayBuffer()));
  }
  console.log((await workbook.inspect({ kind: "sheet,table", maxChars: 9000, tableMaxRows: 5, tableMaxCols: 18 })).ndjson);
  console.log(JSON.stringify({ mode, previewDir }));
  process.exit(0);
}

const guide = workbook.worksheets.getItem("Orientacoes");
guide.getRange("A2").values = [["Parâmetros operacionais de Inbound e Outbound"]];
guide.getRange("A3").values = [["Edite as entradas amarelas e execute Atualizar Dashboard Atualizado.cmd para recalcular o dashboard."]];
guide.getRange("A7:B11").values = [
  [1, "Em FontesInbound e FontesOutbound, revise arquivos, cortes e fontes ativas."],
  [2, "Em RegrasInbound e RegrasGross, defina início, fim, prazo e vigência por cliente e Owner."],
  [3, "Em OwnerAliases, normalize o Owner recebido nas duas operações."],
  [4, "Revise Jornada e Feriados. Os vencimentos configurados respeitam o calendário útil."],
  [5, "Execute Atualizar Dashboard Atualizado.cmd. Se uma validação falhar, o dashboard anterior permanece disponível."],
];
guide.getRange("A24:B27").values = [
  ["Inbound migrado", "Base_Clientes/base_consolidade_inbound/inbound_consolidado.csv, a partir do corte por cliente"],
  ["Inbound legado", "00 - Bases OVERVIEW HTMLs.xlsx / OverviewAdvice, somente antes do corte de cada cliente"],
  ["Outbound legado", "00 - Bases OVERVIEW HTMLs.xlsx / OverviewOrder, somente antes do corte de cada cliente"],
  ["Outbound migrado", "Base_Clientes/base_csv_exc, um CSV ativo por cliente"],
];

const sourceSheet = workbook.worksheets.add("FontesInbound");
setupSheet(sourceSheet, "Migração da fonte Inbound", "O corte é inclusivo na base consolidada. Antes dele, o histórico permanece em OverviewAdvice.", "H");
sourceSheet.getRange("A6:H6").values = [["ClientKey", "ArquivoCSV", "DataCorte", "Ativo", "ClientAliasFonte", "OwnerObrigatorio", "Observacao", "Status"]];
styleHeader(sourceSheet.getRange("A6:H6"));
const sourceRows = sources.map(([client, alias, cutoff]) => [client, "inbound_consolidado.csv", new Date(`${cutoff}T00:00:00`), "Sim", alias, "Sim", "Fonte consolidada Inbound", "Ativa"]);
sourceSheet.getRange("A7").write(sourceRows);
const sourceEnd = 6 + sourceRows.length;
styleBody(sourceSheet.getRange(`A7:H${sourceEnd}`));
sourceSheet.getRange(`B7:G${sourceEnd}`).format.fill = amber;
sourceSheet.getRange(`C7:C${sourceEnd}`).format.numberFormat = "dd/mm/yyyy";
sourceSheet.getRange(`D7:D${sourceEnd}`).dataValidation = { rule: { type: "list", values: ["Sim", "Não"] } };
sourceSheet.getRange(`F7:F${sourceEnd}`).dataValidation = { rule: { type: "list", values: ["Sim", "Não"] } };
sourceSheet.tables.add(`A6:H${sourceEnd}`, true, "FontesInbound").style = "TableStyleMedium2";
sourceSheet.freezePanes.freezeRows(6);
for (const [range, width] of [["A:A",14],["B:B",26],["C:C",14],["D:D",10],["E:E",20],["F:F",18],["G:G",36],["H:H",14]]) sourceSheet.getRange(range).format.columnWidth = width;

const ruleSheet = workbook.worksheets.add("RegrasInbound");
setupSheet(ruleSheet, "Regras de prazo do Inbound por cliente", "Início e fim são configuráveis. O padrão inicial usa 24 horas úteis; ajuste o SLA de cada cliente quando necessário.", "Q", "#8A6D3B");
const headers = ["ClientKey", "RegraID", "EtapaInicial", "EtapaFinal", "HoraInicioExclusiva", "HoraFimInclusiva", "TipoPrazo", "DiasUteis", "HoraLimite", "HorasUteis", "ToleranciaMinutos", "VigenciaInicio", "VigenciaFim", "Ativo", "Observacao", "Status", "OwnerKey"];
ruleSheet.getRange("A6:Q6").values = [headers];
styleHeader(ruleSheet.getRange("A6:Q6"));
const ruleRows = sources.map(([client,,cutoff]) => [client, "PADRAO", "Creation", "Finish", null, null, "Horas úteis", null, null, 24, 0, new Date(`${cutoff}T00:00:00`), null, "Sim", "SLA inicial recomendado: 24 horas úteis; revise por cliente", null, "DEFAULT"]);
ruleSheet.getRange("A7").write(ruleRows);
const ruleEnd = 6 + ruleRows.length;
ruleSheet.getRange("P7").formulas = [[`=IF(N7<>"Sim","Inativa",IF(OR(A7="",B7="",C7="",D7="",G7="",L7=""),"Configuração incompleta",IF(AND(G7="Dia útil + hora",OR(H7="",I7="")),"Prazo incompleto",IF(AND(G7="Horas úteis",J7=""),"Horas úteis ausentes","Regra ativa"))))`]];
ruleSheet.getRange(`P7:P${ruleEnd}`).fillDown();
styleBody(ruleSheet.getRange(`A7:Q${ruleEnd}`));
ruleSheet.getRange(`C7:O${ruleEnd}`).format.fill = amber;
ruleSheet.getRange(`Q7:Q${ruleEnd}`).format.fill = amber;
ruleSheet.getRange(`E7:F${ruleEnd}`).format.numberFormat = "hh:mm";
ruleSheet.getRange(`I7:I${ruleEnd}`).format.numberFormat = "hh:mm";
ruleSheet.getRange(`L7:M${ruleEnd}`).format.numberFormat = "dd/mm/yyyy";
ruleSheet.getRange(`C7:D${ruleEnd}`).dataValidation = { rule: { type: "list", values: ["Creation", "Released", "In Progress", "Finish", "UDF 1", "UDF 2", "UDF 3", "UDF 4"] } };
ruleSheet.getRange(`G7:G${ruleEnd}`).dataValidation = { rule: { type: "list", values: ["Data de vencimento da fonte", "Dia útil + hora", "Horas úteis"] } };
ruleSheet.getRange(`N7:N${ruleEnd}`).dataValidation = { rule: { type: "list", values: ["Sim", "Não"] } };
ruleSheet.tables.add(`A6:Q${ruleEnd}`, true, "RegrasInbound").style = "TableStyleMedium2";
ruleSheet.freezePanes.freezeRows(6);
for (const [range, width] of [["A:B",14],["C:D",18],["E:F",18],["G:G",28],["H:J",14],["K:K",20],["L:M",16],["N:N",10],["O:O",48],["P:P",22],["Q:Q",16]]) ruleSheet.getRange(range).format.columnWidth = width;

workbook.recalculate();
for (const [sheetName, range] of [["Orientacoes", "A1:B27"], ["FontesInbound", `A1:H${sourceEnd}`], ["RegrasInbound", `A1:Q${Math.min(ruleEnd, 18)}`]]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(`${previewDir}/after_${sheetName}.png`, new Uint8Array(await preview.arrayBuffer()));
}
console.log((await workbook.inspect({ kind: "table", range: `RegrasInbound!A6:Q${Math.min(ruleEnd, 12)}`, include: "values,formulas", tableMaxRows: 8, tableMaxCols: 17 })).ndjson);
console.log((await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 300 }, summary: "formula error scan" })).ndjson);
await (await SpreadsheetFile.exportXlsx(workbook)).save(workbookPath);
console.log(JSON.stringify({ mode, workbookPath, previewDir, sourceRows: sourceRows.length, ruleRows: ruleRows.length }));
