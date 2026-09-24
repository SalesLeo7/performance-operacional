import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const root = "C:/performance_geral_cjm/00 - HTML's update";
const threadId = "01a08633-89b4-7283-8814-f0b65f6970f7";
const workbookPath = `${root}/outputs/${threadId}/ParametrosOperacionais_Inbound.xlsx`;
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));

if (!workbook.worksheets.getItemOrNullObject("ProcessosOutbound").isNullObject) {
  console.log("ProcessosOutbound já existe; nenhuma alteração necessária.");
} else {
  const sheet = workbook.worksheets.add("ProcessosOutbound");
  const navy = "#002664";
  const amber = "#FFF2CC";
  const line = "#DCE2EA";
  const ink = "#172033";
  sheet.showGridLines = false;
  sheet.tabColor = "#A15C2F";
  sheet.getRange("A1:Z100").format.font = { name: "Arial", size: 10, color: ink };
  sheet.getRange("A2:L2").merge();
  sheet.getRange("A2").values = [["Processos Outbound"]];
  sheet.getRange("A2").format.font = { name: "Arial", size: 15, bold: true, color: navy };
  sheet.getRange("A3:L3").merge();
  sheet.getRange("A3").values = [["Defina os limites de cada indicador. O tempo é medido da origem do primeiro par até o destino do segundo par."]];
  sheet.getRange("A3").format.font = { name: "Arial", size: 10, italic: true, color: "#667085" };
  sheet.getRange("A6:L6").values = [["ClientKey", "OwnerKey", "ProcessoKey", "ProcessoNome", "InicioOrigem", "InicioDestino", "FimOrigem", "FimDestino", "MetaHorasUteis", "VigenciaInicio", "VigenciaFim", "Ativo"]];
  sheet.getRange("A6:L6").format = { fill: navy, font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { insideVertical: { style: "thin", color: "#FFFFFF" } } };
  sheet.getRange("A7:L8").values = [
    ["DEFAULT", "DEFAULT", "PROCESSAMENTO", "Processamento", "Allocated", "In Progress", "In Progress", "Picked", null, new Date("2025-01-01T00:00:00"), null, "Sim"],
    ["DEFAULT", "DEFAULT", "SEPARACAO", "Separação", "In Progress", "Picked", "Packed", "Ready to Load", null, new Date("2025-01-01T00:00:00"), null, "Sim"],
  ];
  sheet.getRange("A7:L8").format = { fill: amber, verticalAlignment: "center", borders: { insideHorizontal: { style: "thin", color: line } }, rowHeight: 23 };
  sheet.getRange("E7:H8").dataValidation = { rule: { type: "list", values: ["Creation", "Released", "Allocated", "In Progress", "Picked", "Packed", "Ready to Load", "Complete", "Shipped"] } };
  sheet.getRange("L7:L8").dataValidation = { rule: { type: "list", values: ["Sim", "Não"] } };
  sheet.getRange("I7:I8").format.numberFormat = "0.0";
  sheet.getRange("J7:K8").format.numberFormat = "dd/mm/yyyy";
  sheet.tables.add("A6:L8", true, "ProcessosOutbound").style = "TableStyleMedium2";
  sheet.freezePanes.freezeRows(6);
  for (const [range, width] of [["A:B", 14], ["C:C", 18], ["D:D", 22], ["E:H", 18], ["I:I", 18], ["J:K", 16], ["L:L", 10]]) sheet.getRange(range).format.columnWidth = width;
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(workbookPath);
  console.log(workbookPath);
}
