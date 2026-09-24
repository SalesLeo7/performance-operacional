import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const outputDir = "C:/performance_geral_cjm/00 - HTML's update/outputs/kpi_outbound_20260915";
const source = await FileBlob.load(`${outputDir}/KPI_Outbound_Clientes.xlsx`);
const workbook = await SpreadsheetFile.importXlsx(source);

const overview = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 5000,
  tableMaxRows: 8,
  tableMaxCols: 12,
});
console.log(overview.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 50 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

for (const [sheetName, range, fileName] of [
  ["Execucoes", "A1:K15", "execucoes-preview.png"],
  ["Como usar", "A1:B12", "como-usar-preview.png"],
]) {
  const preview = await workbook.render({ sheetName, range, scale: 2, format: "png" });
  await fs.writeFile(`${outputDir}/${fileName}`, new Uint8Array(await preview.arrayBuffer()));
}
