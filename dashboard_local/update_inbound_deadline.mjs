import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const root = "C:/performance_geral_cjm/00 - HTML's update";
const workbookPath = `${root}/outputs/01a08633-89b4-7283-8814-f0b65f6970f7/ParametrosOperacionais.xlsx`;
const previewPath = `${root}/dashboard_local/.previews/inbound_migration/after_RegrasInbound.png`;
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const sheet = workbook.worksheets.getItem("RegrasInbound");
const used = sheet.getUsedRange();
const rowCount = used.rowCount;

sheet.getRange("A3").values = [["Início e fim são configuráveis. O padrão inicial usa 24 horas úteis; ajuste o SLA de cada cliente quando necessário."]];
for (let row = 7; row <= rowCount; row += 1) {
  sheet.getRange(`G${row}`).values = [["Horas úteis"]];
  sheet.getRange(`H${row}:I${row}`).clear({ contents: true });
  sheet.getRange(`J${row}`).values = [[24]];
  sheet.getRange(`O${row}`).values = [["SLA inicial recomendado: 24 horas úteis; revise por cliente"]];
}

workbook.recalculate();
const preview = await workbook.render({ sheetName: "RegrasInbound", range: `A1:Q${Math.min(rowCount, 18)}`, scale: 1, format: "png" });
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
console.log((await workbook.inspect({ kind: "table", range: `RegrasInbound!A6:Q${Math.min(rowCount, 12)}`, include: "values,formulas", tableMaxRows: 8, tableMaxCols: 17 })).ndjson);
console.log((await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 300 }, summary: "formula error scan" })).ndjson);
await (await SpreadsheetFile.exportXlsx(workbook)).save(workbookPath);
console.log(JSON.stringify({ workbookPath, rowCount }));
