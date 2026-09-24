import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const root = "C:/performance_geral_cjm/00 - HTML's update";
const workbookPath = `${root}/outputs/01a08633-89b4-7283-8814-f0b65f6970f7/ParametrosOperacionais.xlsx`;
const outputPath = `${root}/outputs/01a08633-89b4-7283-8814-f0b65f6970f7/ParametrosOperacionais_Inbound.xlsx`;
const previewDir = `${root}/dashboard_local/.previews/inbound_capacity`;
const mode = process.argv[2] || "inspect";
const navy = "#002664", amber = "#FFF2CC", line = "#DCE2EA", ink = "#172033", muted = "#667085";

const rows = [
  ["ALGAR", "TELECOM", 18, 26, "2026-08-03"], ["ALGAR", "VOGEL", 8, 26, "2026-08-03"],
  ["AMZNLABS", "BRAMZNLABS", 13, 1, "2026-08-05"], ["ASUS", "ECOMM", 102, 35, "2026-06-17"],
  ["ASUS", "RETAIL", 30, 60, "2026-06-17"], ["BAT", "PRINCIPAL", 128, 58, "2026-06-17"],
  ["BT", "PRINCIPAL", 12, 16, "2026-06-10"], ["CLARO", "BRCLAROSPO", 1, 1, "2026-06-02"],
  ["COMBA", "BRCOMBA", 645, 3, "2026-08-05"], ["CORBION", "PRINCIPAL", 6, 14, "2026-06-22"],
  ["DUCATI", "PRINCIPAL", 257, 29, "2026-06-18"], ["EDELWHITE", "BREDELWHIT", 28, 11, "2026-06-16"],
  ["FIVEHANDS", "BRFIVEHNDS", 132, 6, "2026-06-30"], ["GAC", "PRINCIPAL", 1344, 21, "2026-06-19"],
  ["GNUTRA", "BRGNUTRA", 1, 1, "2026-08-19"], ["GWM", "PRINCIPAL", 405, 62, "2026-05-29"],
  ["HANSEN", "BRHANSEN", 13, 10, "2026-06-19"], ["HARLEY", "PRINCIPAL", 876, 25, "2026-06-16"],
  ["JAC", "PRINCIPAL", 448, 3, "2026-06-29"], ["JETOUR", "PRINCIPAL", 403, 10, "2026-07-02"],
  ["MART", "BRMART", 2, 3, "2026-07-07"], ["MWC", "BRMWC", 8, 4, "2026-07-02"],
  ["OLESEN", "PRINCIPAL", 20, 27, "2026-06-17"], ["OMODA", "PRINCIPAL", 290, 27, "2026-06-22"],
  ["ROQUETTE", "PRINCIPAL", 16, 16, "2026-06-24"], ["SAIC", "PRINCIPAL", 504, 15, "2026-06-19"],
  ["SCANDERRA", "BRSCANDERR", 13, 15, "2026-06-16"], ["XSYS", "PRINCIPAL", 11, 12, "2026-06-18"],
];

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
await fs.mkdir(previewDir, { recursive: true });

if (mode === "inspect") {
  const preview = await workbook.render({ sheetName: "Capacidade", range: "A1:K18", scale: 1, format: "png" });
  await fs.writeFile(`${previewDir}/before_Capacidade.png`, new Uint8Array(await preview.arrayBuffer()));
  console.log((await workbook.inspect({ kind: "table", range: "Capacidade!A1:K12", include: "values,formulas", tableMaxRows: 12, tableMaxCols: 11 })).ndjson);
  process.exit(0);
}

const sheet = workbook.worksheets.add("CapacidadeInbound");
sheet.showGridLines = false;
sheet.tabColor = "#1B7F5C";
sheet.getRange("A2:K2").merge();
sheet.getRange("A2").values = [["Capacidade diária do Recebimento por cliente e Owner"]];
sheet.getRange("A2").format.font = { name: "Arial", size: 15, bold: true, color: navy };
sheet.getRange("A3:K3").merge();
sheet.getRange("A3").values = [["A capacidade sugerida é o p95 das linhas recebidas por dia no evento inicial da regra. O NET exige capacidade oficial preenchida e ativa."]];
sheet.getRange("A3").format.font = { name: "Arial", size: 10, italic: true, color: muted };
const headers = ["ClientKey", "Cliente", "CapacidadeOficial", "CapacidadeSugerida", "VigenciaInicio", "VigenciaFim", "Ativo", "Metodo", "Observacao", "StatusNET", "OwnerKey"];
sheet.getRange("A6:K6").values = [headers];
sheet.getRange("A6:K6").format = { fill: navy, font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { insideVertical: { style: "thin", color: "#FFFFFF" } } };
sheet.getRange("A6:K6").format.rowHeight = 36;
const values = rows.map(([client, owner, suggested, days, cutoff]) => [client, client, null, suggested, new Date(`${cutoff}T00:00:00`), null, "Não", `p95 de ${days} dias com recebimento`, null, null, owner]);
sheet.getRange("A7").write(values);
const endRow = 6 + values.length;
sheet.getRange("J7").formulas = [[`=IF(OR(C7="",G7<>"Sim"),"NET não calculado","NET habilitado")`]];
sheet.getRange(`J7:J${endRow}`).fillDown();
sheet.getRange(`A7:K${endRow}`).format.font = { name: "Arial", size: 10, color: ink };
sheet.getRange(`A7:K${endRow}`).format.verticalAlignment = "center";
sheet.getRange(`A7:K${endRow}`).format.borders = { insideHorizontal: { style: "thin", color: line } };
sheet.getRange(`A7:K${endRow}`).format.rowHeight = 23;
sheet.getRange(`C7:I${endRow}`).format.fill = amber;
sheet.getRange(`K7:K${endRow}`).format.fill = amber;
sheet.getRange(`E7:F${endRow}`).format.numberFormat = "dd/mm/yyyy";
sheet.getRange(`G7:G${endRow}`).dataValidation = { rule: { type: "list", values: ["Sim", "Não"] } };
sheet.tables.add(`A6:K${endRow}`, true, "CapacidadeInbound").style = "TableStyleMedium2";
sheet.freezePanes.freezeRows(6);
for (const [range, width] of [["A:B",15],["C:D",20],["E:F",16],["G:G",10],["H:H",32],["I:I",28],["J:J",20],["K:K",18]]) sheet.getRange(range).format.columnWidth = width;

const guide = workbook.worksheets.getItem("Orientacoes");
guide.getRange("B7").values = [["Em FontesInbound e FontesOutbound, revise arquivos, cortes e fontes ativas."]];
guide.getRange("B8").values = [["Em RegrasInbound e RegrasGross, defina início, fim, prazo e vigência por cliente e Owner."]];
guide.getRange("B9").values = [["Em CapacidadeInbound e Capacidade, valide o limite diário oficial por cliente e Owner."]];
guide.getRange("B10").values = [["Em OwnerAliases, normalize o Owner recebido nas duas operações."]];
guide.getRange("B11").values = [["Revise Jornada e Feriados e execute Atualizar Dashboard Atualizado.cmd."]];

workbook.recalculate();
const preview = await workbook.render({ sheetName: "CapacidadeInbound", range: `A1:K${Math.min(endRow, 18)}`, scale: 1, format: "png" });
await fs.writeFile(`${previewDir}/after_CapacidadeInbound.png`, new Uint8Array(await preview.arrayBuffer()));
console.log((await workbook.inspect({ kind: "table", range: `CapacidadeInbound!A6:K${Math.min(endRow, 14)}`, include: "values,formulas", tableMaxRows: 10, tableMaxCols: 11 })).ndjson);
console.log((await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 300 }, summary: "formula error scan" })).ndjson);
await (await SpreadsheetFile.exportXlsx(workbook)).save(outputPath);
console.log(JSON.stringify({ workbookPath: outputPath, rows: values.length, previewDir }));
