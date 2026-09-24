import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const root = "C:/performance_geral_cjm/00 - HTML's update";
const operationalPath = `${root}/outputs/01a08633-89b4-7283-8814-f0b65f6970f7/ParametrosOperacionais.xlsx`;
const slaPath = `${root}/MetasSLA.xlsx`;
const previewDir = `${root}/dashboard_local/.previews/jac`;
const amber = "#FFF2CC";
const line = "#DCE2EA";
const ink = "#172033";
const red = "#D71920";
const green = "#26863B";

function styleBody(range) {
  range.format.font = { name: "Arial", size: 10, color: ink };
  range.format.verticalAlignment = "center";
  range.format.borders = { insideHorizontal: { style: "thin", color: line } };
  range.format.rowHeight = 23;
}

function recreateTable(sheet, name, address) {
  sheet.tables.getItem(name).delete();
  sheet.tables.add(address, true, name).style = "TableStyleMedium2";
}

const operational = await SpreadsheetFile.importXlsx(await FileBlob.load(operationalPath));

const capacity = operational.worksheets.getItem("Capacidade");
capacity.getRange("A30:K30").values = [["JAC", "JAC", null, 9, new Date("2025-01-01T00:00:00"), null, "Não", "p95 de 3 dias com alocação", "Validar após maior histórico", "NET não calculado", "DEFAULT"]];
capacity.getRange("C30:I30").format.fill = amber;
capacity.getRange("E30:F30").format.numberFormat = "dd/mm/yyyy";
capacity.getRange("G30").dataValidation = { rule: { type: "list", values: ["Sim", "Não"] } };
capacity.getRange("J30").format = { fill: "#FDE8E8", font: { name: "Arial", size: 10, color: red } };
styleBody(capacity.getRange("A30:K30"));
recreateTable(capacity, "CapacidadeCliente", "A6:K30");

const gross = operational.worksheets.getItem("RegrasGross");
gross.getRange("A53:Q54").values = [[
  "JAC", "PADRAO", "Allocated", "Packed", null, 14 / 24, "Dia útil + hora", 0, 20 / 24, null, 30, new Date("2025-01-01T00:00:00"), null, "Sim", "Alocado até 14h: concluir no mesmo dia útil até 20h", null, "DEFAULT"
], [
  "JAC", "PADRAO", "Allocated", "Packed", 14 / 24, null, "Dia útil + hora", 2, 20 / 24, null, 30, new Date("2025-01-01T00:00:00"), null, "Sim", "Alocado após 14h: concluir em D+2 útil até 20h", null, "DEFAULT"
]];
gross.getRange("P53").formulas = [[`=IF(N53<>"Sim","Inativa",IF(OR(A53="",B53="",C53="",D53="",G53="",L53=""),"Configuração incompleta",IF(AND(G53="Dia útil + hora",OR(ISBLANK(H53),ISBLANK(I53))),"Prazo incompleto",IF(AND(G53="Horas úteis",ISBLANK(J53)),"Horas úteis ausentes","Regra ativa"))))`]];
gross.getRange("P53:P54").fillDown();
gross.getRange("C53:O54").format.fill = amber;
gross.getRange("Q53:Q54").format.fill = amber;
gross.getRange("E53:F54").format.numberFormat = "hh:mm";
gross.getRange("I53:I54").format.numberFormat = "hh:mm";
gross.getRange("H53:H54").format.numberFormat = "0";
gross.getRange("J53:J54").format.numberFormat = "0.0";
gross.getRange("K53:K54").format.numberFormat = "0";
gross.getRange("L53:M54").format.numberFormat = "dd/mm/yyyy";
gross.getRange("C53:D54").dataValidation = { rule: { type: "list", values: ["Creation", "Released", "Allocated", "In Progress", "Picked", "Packed", "Ready to Load", "Complete", "Shipped"] } };
gross.getRange("G53:G54").dataValidation = { rule: { type: "list", values: ["Dia útil + hora", "Horas úteis"] } };
gross.getRange("N53:N54").dataValidation = { rule: { type: "list", values: ["Sim", "Não"] } };
gross.getRange("P53:P54").conditionalFormats.add("containsText", { text: "Regra ativa", format: { fill: "#E6F4E9", font: { bold: true, color: green } } });
gross.getRange("P53:P54").conditionalFormats.add("containsText", { text: "incompleta", format: { fill: "#FDE8E8", font: { bold: true, color: red } } });
styleBody(gross.getRange("A53:Q54"));
recreateTable(gross, "RegrasGrossCliente", "A6:Q54");

const sources = operational.worksheets.getItem("FontesOutbound");
sources.getRange("A22:H22").values = [["JAC", "JAC.csv", new Date("2026-08-19T00:00:00"), "Sim", "BRJAC", "Sim", "Owner único normalizado para PRINCIPAL", "Ativa"]];
sources.getRange("B22:G22").format.fill = amber;
sources.getRange("C22").format.numberFormat = "dd/mm/yyyy";
sources.getRange("D22").dataValidation = { rule: { type: "list", values: ["Sim", "Não"] } };
sources.getRange("F22").dataValidation = { rule: { type: "list", values: ["Sim", "Não"] } };
styleBody(sources.getRange("A22:H22"));
recreateTable(sources, "FontesOutbound", "A6:H22");

const owners = operational.worksheets.getItem("OwnerAliases");
owners.getRange("A24:F24").values = [["JAC", "BRJAC", "PRINCIPAL", "Principal", "Sim", "Owner único"]];
owners.getRange("A24:E24").format.fill = amber;
owners.getRange("E24").dataValidation = { rule: { type: "list", values: ["Sim", "Não"] } };
styleBody(owners.getRange("A24:F24"));
recreateTable(owners, "OwnerAliases", "A6:F24");

operational.recalculate();
console.log((await operational.inspect({ kind: "table", range: "FontesOutbound!A18:H22", include: "values,formulas", tableMaxRows: 8, tableMaxCols: 8 })).ndjson);
console.log((await operational.inspect({ kind: "table", range: "OwnerAliases!A20:F24", include: "values,formulas", tableMaxRows: 8, tableMaxCols: 6 })).ndjson);
console.log((await operational.inspect({ kind: "table", range: "RegrasGross!A51:Q54", include: "values,formulas", tableMaxRows: 8, tableMaxCols: 17 })).ndjson);
console.log((await operational.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 300 }, summary: "formula error scan" })).ndjson);
await fs.mkdir(previewDir, { recursive: true });
for (const [sheetName, range] of [["FontesOutbound", "A1:H22"], ["OwnerAliases", "A1:F24"], ["Capacidade", "A25:K30"], ["RegrasGross", "A49:Q54"]]) {
  const preview = await operational.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(`${previewDir}/${sheetName}.png`, new Uint8Array(await preview.arrayBuffer()));
}
await (await SpreadsheetFile.exportXlsx(operational)).save(operationalPath);

const sla = await SpreadsheetFile.importXlsx(await FileBlob.load(slaPath));
const targets = sla.worksheets.getItem("MetasSLA");
targets.getRange("A49:F49").values = [["JAC", "Outbound", new Date("2025-01-01T00:00:00"), null, 0.95, 0.90]];
targets.getRange("C49:D49").format.numberFormat = "dd/mm/yyyy";
targets.getRange("E49:F49").format.numberFormat = "0.0%";
recreateTable(targets, "MetasSLA", "A1:F49");
const clientAliases = sla.worksheets.getItem("ClientAliases");
clientAliases.getRange("A36:D36").values = [["BRJAC", "JAC", "JAC", "Outbound"]];
recreateTable(clientAliases, "ClientAliases", "A1:D36");
await (await SpreadsheetFile.exportXlsx(sla)).save(slaPath);

console.log(JSON.stringify({ operationalPath, slaPath, previewDir }));
