import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const root = "C:/performance_geral_cjm/00 - HTML's update";
const operationalPath = `${root}/outputs/01a08633-89b4-7283-8814-f0b65f6970f7/ParametrosOperacionais.xlsx`;
const slaPath = `${root}/MetasSLA.xlsx`;
const previewDir = `${root}/dashboard_local/.previews/outbound_migration`;
const navy = "#002664";
const blue = "#004B93";
const amber = "#FFF2CC";
const line = "#DCE2EA";
const ink = "#172033";
const muted = "#667085";

function styleHeader(range) {
  range.format = {
    fill: navy,
    font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { insideVertical: { style: "thin", color: "#FFFFFF" } },
  };
  range.format.rowHeight = 36;
}

function styleBody(range) {
  range.format.font = { name: "Arial", size: 10, color: ink };
  range.format.verticalAlignment = "center";
  range.format.borders = { insideHorizontal: { style: "thin", color: line } };
  range.format.rowHeight = 23;
}

const operational = await SpreadsheetFile.importXlsx(await FileBlob.load(operationalPath));

for (const spec of [
  ["Capacidade", "K6", "K7:K29"],
  ["Jornada", "K6", "K7:K17"],
  ["MetasEtapas", "J6", "J7:J15"],
  ["RegrasGross", "Q6", "Q7:Q52"],
]) {
  const [sheetName, headerCell, bodyRange] = spec;
  const sheet = operational.worksheets.getItem(sheetName);
  sheet.getRange(headerCell).values = [["OwnerKey"]];
  styleHeader(sheet.getRange(headerCell));
  const range = sheet.getRange(bodyRange);
  const rowCount = Number(bodyRange.split(":")[1].match(/\d+/)[0]) - Number(bodyRange.split(":")[0].match(/\d+/)[0]) + 1;
  range.values = Array.from({ length: rowCount }, () => ["DEFAULT"]);
  range.format.fill = amber;
  range.format.columnWidth = 16;
  styleBody(range);
}

const guide = operational.worksheets.getItem("Orientacoes");
guide.getRange("A7:B11").values = [
  [1, "Na aba FontesOutbound, mantenha um único CSV ativo por cliente e ajuste a data de corte quando a migração mudar."],
  [2, "Na aba OwnerAliases, normalize o Owner recebido na fonte. ASUS separa ECOMM e RETAIL; ALGAR separa TELECOM e VOGEL."],
  [3, "Em Capacidade, Jornada, MetasEtapas e RegrasGross, use OwnerKey específico ou DEFAULT para herdar a regra do cliente."],
  [4, "Revise Jornada e Feriados. O vencimento considera dias úteis, horários, intervalos e exceções do cliente."],
  [5, "Execute Atualizar Dashboard Atualizado.cmd. Se uma fonte falhar, a última versão válida do dashboard permanece disponível."],
];
guide.getRange("A23:B27").values = [
  ["Fonte", "Endereço"],
  ["Inbound legado", "00 - Bases OVERVIEW HTMLs.xlsx / OverviewAdvice"],
  ["Outbound legado", "00 - Bases OVERVIEW HTMLs.xlsx / OverviewOrder, somente antes do corte de cada cliente"],
  ["Outbound migrado", "Base_Clientes/base_csv_exc, um CSV ativo por cliente"],
  ["Regra de segurança", "Arquivo ausente, duplicado, vazio ou inválido bloqueia a atualização e preserva o dashboard anterior"],
];

const source = operational.worksheets.add("FontesOutbound");
source.showGridLines = false;
source.tabColor = "#7A5AF8";
source.getRange("A2:H2").merge();
source.getRange("A2").values = [["Migração das fontes Outbound"]];
source.getRange("A2").format.font = { name: "Arial", size: 15, bold: true, color: navy };
source.getRange("A3:H3").merge();
source.getRange("A3").values = [["A data de corte é inclusiva na nova fonte. Antes dela, o histórico continua vindo de OverviewOrder."]];
source.getRange("A3").format.font = { name: "Arial", size: 10, italic: true, color: muted };
source.getRange("A6:H6").values = [["ClientKey", "ArquivoCSV", "DataCorte", "Ativo", "ClientAliasFonte", "OwnerObrigatorio", "Observacao", "Status"]];
styleHeader(source.getRange("A6:H6"));
const sourceRows = [
  ["ALGAR", "ALGAR.csv", new Date("2026-06-03T00:00:00"), "Sim", "BRALGAR", "Sim", "Owners TELECOM e VOGEL", "Ativa"],
  ["ASUS", "ASUS.csv", new Date("2026-05-11T00:00:00"), "Sim", "BRACBZ", "Sim", "Owners ECOMM e RETAIL", "Ativa"],
  ["BAT", "BAT.csv", new Date("2026-06-15T00:00:00"), "Sim", "BRBAT", "Sim", "Owner único normalizado para PRINCIPAL", "Ativa"],
  ["BT", "BT.csv", new Date("2026-06-09T00:00:00"), "Sim", "BRBT", "Sim", "Owner único normalizado para PRINCIPAL", "Ativa"],
  ["CORBION", "CORBION.csv", new Date("2026-05-28T00:00:00"), "Sim", "BRCORBION", "Sim", "Owner único normalizado para PRINCIPAL", "Ativa"],
  ["DUCATI", "DUCATI.csv", new Date("2026-06-03T00:00:00"), "Sim", "BRDUCATIMO", "Sim", "Owner único normalizado para PRINCIPAL", "Ativa"],
  ["GAC", "GAC.csv", new Date("2026-06-02T00:00:00"), "Sim", "BRGACMES", "Sim", "Owner único normalizado para PRINCIPAL", "Ativa"],
  ["GWM", "GWM.csv", new Date("2026-05-29T00:00:00"), "Sim", "BRGWM", "Sim", "Owner único normalizado para PRINCIPAL", "Ativa"],
  ["HARLEY", "HARLEY.csv", new Date("2026-06-11T00:00:00"), "Sim", "BRHARLD", "Sim", "Owner único normalizado para PRINCIPAL", "Ativa"],
  ["JETOUR", "JETOUR.csv", new Date("2026-05-15T00:00:00"), "Sim", "BRCJ1JET", "Sim", "Owner único normalizado para PRINCIPAL", "Ativa"],
  ["OLESEN", "OLESEN.csv", new Date("2026-06-15T00:00:00"), "Sim", "BROLESEN", "Sim", "Owner único normalizado para PRINCIPAL", "Ativa"],
  ["OMODA", "OMODA.csv", new Date("2026-04-01T00:00:00"), "Sim", "BROMODA", "Sim", "Owner único normalizado para PRINCIPAL", "Ativa"],
  ["ROQUETTE", "ROQUETTE.csv", new Date("2026-06-12T00:00:00"), "Sim", "BRRQTCAJ", "Sim", "Owner único normalizado para PRINCIPAL", "Ativa"],
  ["SAIC", "SAIC.csv", new Date("2026-01-27T00:00:00"), "Sim", "BRSAIC", "Sim", "Owner único normalizado para PRINCIPAL", "Ativa"],
  ["XSYS", "XYSS.csv", new Date("2026-06-08T00:00:00"), "Sim", "BRCJ1XYS", "Sim", "Owner único normalizado para PRINCIPAL", "Ativa"],
];
source.getRange("A7").write(sourceRows);
styleBody(source.getRange(`A7:H${6 + sourceRows.length}`));
source.getRange(`B7:G${6 + sourceRows.length}`).format.fill = amber;
source.getRange(`C7:C${6 + sourceRows.length}`).format.numberFormat = "dd/mm/yyyy";
source.getRange(`D7:D${6 + sourceRows.length}`).dataValidation = { rule: { type: "list", values: ["Sim", "Não"] } };
source.getRange(`F7:F${6 + sourceRows.length}`).dataValidation = { rule: { type: "list", values: ["Sim", "Não"] } };
source.tables.add(`A6:H${6 + sourceRows.length}`, true, "FontesOutbound").style = "TableStyleMedium2";
source.freezePanes.freezeRows(6);
for (const [range, width] of [["A:A",14],["B:B",20],["C:C",14],["D:D",10],["E:E",20],["F:F",18],["G:G",48],["H:H",14]]) source.getRange(range).format.columnWidth = width;

const owners = operational.worksheets.add("OwnerAliases");
owners.showGridLines = false;
owners.tabColor = "#7A5AF8";
owners.getRange("A2:F2").merge();
owners.getRange("A2").values = [["Normalização de Owner do Outbound"]];
owners.getRange("A2").format.font = { name: "Arial", size: 15, bold: true, color: navy };
owners.getRange("A3:F3").merge();
owners.getRange("A3").values = [["OwnerRaw preserva o valor recebido; OwnerKey e OwnerName controlam filtros e parâmetros."]];
owners.getRange("A3").format.font = { name: "Arial", size: 10, italic: true, color: muted };
owners.getRange("A6:F6").values = [["ClientKey", "OwnerAlias", "OwnerKey", "OwnerName", "Ativo", "Observacao"]];
styleHeader(owners.getRange("A6:F6"));
const ownerRows = [
  ["ALGAR", "TELECOM", "TELECOM", "Telecom", "Sim", "Divisão operacional"],
  ["ALGAR", "VOGEL", "VOGEL", "Vogel", "Sim", "Divisão operacional"],
  ["ASUS", "ACBZECOM", "ECOMM", "E-commerce", "Sim", "ASUS e-commerce"],
  ["ASUS", "ACBZRETAIL", "RETAIL", "Retail", "Sim", "ASUS varejo"],
  ["BAT", "BRBAT", "PRINCIPAL", "Principal", "Sim", "Owner único"],
  ["BT", "BRBT", "PRINCIPAL", "Principal", "Sim", "Owner único"],
  ["CORBION", "BRCORBION", "PRINCIPAL", "Principal", "Sim", "Owner único"],
  ["DUCATI", "BRDUCATIMO", "PRINCIPAL", "Principal", "Sim", "Owner único"],
  ["GAC", "BRGACMES", "PRINCIPAL", "Principal", "Sim", "Owner único"],
  ["GWM", "BRGWM", "PRINCIPAL", "Principal", "Sim", "Owner único"],
  ["HARLEY", "BRHARLD", "PRINCIPAL", "Principal", "Sim", "Owner único"],
  ["JETOUR", "BRCJ1JET", "PRINCIPAL", "Principal", "Sim", "Owner único"],
  ["OLESEN", "BROLESEN", "PRINCIPAL", "Principal", "Sim", "Owner único"],
  ["OMODA", "BROMODA", "PRINCIPAL", "Principal", "Sim", "Owner único"],
  ["ROQUETTE", "BRRQTCAJ", "PRINCIPAL", "Principal", "Sim", "Owner único"],
  ["SAIC", "BRSAIC", "PRINCIPAL", "Principal", "Sim", "Owner único"],
  ["XSYS", "BRCJ1XYS", "PRINCIPAL", "Principal", "Sim", "Owner único"],
];
owners.getRange("A7").write(ownerRows);
styleBody(owners.getRange(`A7:F${6 + ownerRows.length}`));
owners.getRange(`A7:E${6 + ownerRows.length}`).format.fill = amber;
owners.getRange(`E7:E${6 + ownerRows.length}`).dataValidation = { rule: { type: "list", values: ["Sim", "Não"] } };
owners.tables.add(`A6:F${6 + ownerRows.length}`, true, "OwnerAliases").style = "TableStyleMedium2";
owners.freezePanes.freezeRows(6);
for (const [range, width] of [["A:A",14],["B:B",20],["C:C",16],["D:D",18],["E:E",10],["F:F",34]]) owners.getRange(range).format.columnWidth = width;

operational.recalculate();
await fs.mkdir(previewDir, { recursive: true });
for (const [sheetName, range] of [["Orientacoes", "A1:B27"], ["FontesOutbound", "A1:H21"], ["OwnerAliases", "A1:F23"], ["RegrasGross", "A1:Q18"]]) {
  const preview = await operational.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(`${previewDir}/${sheetName}.png`, new Uint8Array(await preview.arrayBuffer()));
}
console.log((await operational.inspect({ kind: "sheet,table", maxChars: 12000, tableMaxRows: 6, tableMaxCols: 18 })).ndjson);
console.log((await operational.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 300 }, summary: "formula error scan" })).ndjson);
await (await SpreadsheetFile.exportXlsx(operational)).save(operationalPath);

const sla = await SpreadsheetFile.importXlsx(await FileBlob.load(slaPath));
const aliasSheet = sla.worksheets.getItem("ClientAliases");
for (const row of [4, 10, 16, 21, 23, 28, 35]) aliasSheet.getRange(`D${row}`).values = [["Both"]];
await (await SpreadsheetFile.exportXlsx(sla)).save(slaPath);
console.log(JSON.stringify({ operationalPath, slaPath, previews: previewDir }));
