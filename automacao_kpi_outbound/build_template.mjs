import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/performance_geral_cjm/00 - HTML's update/outputs/kpi_outbound_20260915";
await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const clients = workbook.worksheets.add("Clientes");
const runs = workbook.worksheets.add("Execucoes");
const instructions = workbook.worksheets.add("Como usar");

const navy = "#002E62";
const blue = "#0C6FB6";
const paleBlue = "#EAF3F8";
const amber = "#FFF2CC";
const red = "#FCE4D6";
const green = "#E2F0D9";
const font = "Arial";

function title(sheet, range, text) {
  sheet.getRange(range).merge();
  sheet.getRange(range.split(":")[0]).values = [[text]];
  sheet.getRange(range).format = {
    font: { name: font, size: 14, bold: true, color: navy },
    verticalAlignment: "center",
  };
}

function header(range) {
  range.format = {
    fill: navy,
    font: { name: font, size: 10, bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#FFFFFF" },
  };
}

for (const sheet of [clients, runs, instructions]) {
  sheet.showGridLines = false;
  sheet.getRange("A1:K80").format.font = { name: font, size: 10, color: "#1F1F1F" };
}

title(clients, "A2:C2", "KPI Outbound - Clientes");
clients.getRange("A3:C3").values = [["Preencha uma linha por cliente. O Client ID deve ser igual ao valor usado no WMS.", null, null]];
clients.getRange("A3:C3").merge();
clients.getRange("A3:C3").format = { font: { name: font, size: 10, italic: true, color: "#555555" } };
clients.getRange("A5:C5").values = [["client_id", "nome_cliente", "ativo"]];
header(clients.getRange("A5:C5"));
clients.getRange("A6:C205").format = {
  fill: amber,
  verticalAlignment: "center",
  borders: { preset: "inside", style: "thin", color: "#E6E6E6" },
};
clients.getRange("A6:A205").setNumberFormat("@");
clients.getRange("C6:C205").dataValidation = { rule: { type: "list", values: ["Sim", "Não"] } };
clients.getRange("C6:C205").conditionalFormats.add("containsText", {
  text: "Sim",
  format: { fill: green, font: { color: "#1F5F2C", bold: true } },
});
clients.getRange("C6:C205").conditionalFormats.add("containsText", {
  text: "Não",
  format: { fill: red, font: { color: "#9C0006", bold: true } },
});
clients.tables.add("A5:C205", true, "ClientesKpi");
clients.freezePanes.freezeRows(5);
clients.getRange("A:A").format.columnWidth = 20;
clients.getRange("B:B").format.columnWidth = 34;
clients.getRange("C:C").format.columnWidth = 12;
clients.getRange("A2:C2").format.rowHeight = 26;

title(runs, "A2:K2", "KPI Outbound - Histórico de execuções");
runs.getRange("A3:K3").values = [["O Power Automate Desktop registra uma linha por cliente. Não altere linhas concluídas.", null, null, null, null, null, null, null, null, null, null]];
runs.getRange("A3:K3").merge();
runs.getRange("A3:K3").format = { font: { name: font, size: 10, italic: true, color: "#555555" } };
runs.getRange("A5:K5").values = [["run_id", "competencia", "client_id", "nome_cliente", "modo", "inicio", "fim", "status", "assunto", "detalhe", "evidencia"]];
header(runs.getRange("A5:K5"));
runs.getRange("A6:K205").format = {
  verticalAlignment: "center",
  borders: { preset: "inside", style: "thin", color: "#E6E6E6" },
};
runs.getRange("B6:B205").setNumberFormat("yyyy-mm");
runs.getRange("F6:G205").setNumberFormat("yyyy-mm-dd hh:mm");
runs.getRange("H6:H205").conditionalFormats.add("containsText", {
  text: "Exportação solicitada",
  format: { fill: green, font: { color: "#1F5F2C", bold: true } },
});
runs.getRange("H6:H205").conditionalFormats.add("containsText", {
  text: "Falha",
  format: { fill: red, font: { color: "#9C0006", bold: true } },
});
runs.getRange("H6:H205").conditionalFormats.add("containsText", {
  text: "Verificação manual necessária",
  format: { fill: amber, font: { color: "#7F6000", bold: true } },
});
runs.tables.add("A5:K205", true, "ExecucoesKpi");
runs.freezePanes.freezeRows(5);
for (const [column, width] of [["A:A", 21], ["B:B", 15], ["C:C", 17], ["D:D", 28], ["E:E", 14], ["F:G", 20], ["H:H", 30], ["I:I", 42], ["J:J", 34], ["K:K", 30]]) {
  runs.getRange(column).format.columnWidth = width;
}
runs.getRange("A2:K2").format.rowHeight = 26;

title(instructions, "A2:F2", "Como usar a planilha mensal");
instructions.getRange("A4:B9").values = [
  ["1", "Crie uma cópia mensal deste arquivo."],
  ["2", "Preencha client_id, nome_cliente e ativo na aba Clientes."],
  ["3", "Use Sim somente para clientes que devem entrar no lote."],
  ["4", "Execute o fluxo e escolha este arquivo no início."],
  ["5", "Confira o resultado na aba Execucoes."],
  ["6", "Não altere registros concluídos; crie nova cópia para a próxima competência."],
];
instructions.getRange("A4:A9").format = { fill: paleBlue, font: { name: font, bold: true, color: navy }, horizontalAlignment: "center" };
instructions.getRange("A4:B9").format = { verticalAlignment: "center", borders: { preset: "inside", style: "thin", color: "#D9E2F3" } };
instructions.getRange("B4:B9").format.wrapText = true;
instructions.getRange("A:A").format.columnWidth = 8;
instructions.getRange("B:B").format.columnWidth = 78;
instructions.getRange("A4:B9").format.rowHeight = 26;

workbook.recalculate();

const inspect = await workbook.inspect({
  kind: "table",
  range: "Clientes!A2:C8",
  include: "values,formulas",
  tableMaxRows: 8,
  tableMaxCols: 3,
});
console.log(inspect.ndjson);

const image = await workbook.render({ sheetName: "Clientes", range: "A1:C15", scale: 2, format: "png" });
await fs.writeFile(`${outputDir}/clientes-preview.png`, new Uint8Array(await image.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/KPI_Outbound_Clientes.xlsx`);
