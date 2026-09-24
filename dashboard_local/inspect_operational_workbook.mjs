import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const root = "C:/performance_geral_cjm/00 - HTML's update";
const path = `${root}/outputs/01a08633-89b4-7283-8814-f0b65f6970f7/ParametrosOperacionais_Inbound.xlsx`;
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
const overview = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 8000,
  tableMaxRows: 4,
  tableMaxCols: 12,
});
console.log(overview.ndjson);
await fs.mkdir(`${root}/dashboard_local/.previews/outbound_consolidated_before`, { recursive: true });
for (const [sheetName, range] of [["FontesOutbound", "A1:H40"]]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(`${root}/dashboard_local/.previews/outbound_consolidated_before/${sheetName}.png`, new Uint8Array(await preview.arrayBuffer()));
}
const slaWorkbook = await SpreadsheetFile.importXlsx(await FileBlob.load(`${root}/MetasSLA.xlsx`));
const aliases = await slaWorkbook.render({ sheetName: "ClientAliases", range: "A1:D50", scale: 1, format: "png" });
await fs.writeFile(`${root}/dashboard_local/.previews/outbound_consolidated_before/ClientAliases.png`, new Uint8Array(await aliases.arrayBuffer()));
