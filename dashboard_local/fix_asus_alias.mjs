import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const root = "C:/performance_geral_cjm/00 - HTML's update";
const path = `${root}/MetasSLA.xlsx`;
const input = await FileBlob.load(path);
const workbook = await SpreadsheetFile.importXlsx(input);
const aliases = workbook.worksheets.getItem("ClientAliases");

aliases.getRange("B4:C4").values = [["ASUS", "ASUS"]];
workbook.recalculate();

const check = await workbook.inspect({
  kind: "table",
  range: "ClientAliases!A1:D5",
  include: "values,formulas",
  tableMaxRows: 5,
  tableMaxCols: 4,
});
console.log(check.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

const preview = await workbook.render({ sheetName: "ClientAliases", range: "A1:D8", scale: 1, format: "png" });
await fs.mkdir(`${root}/dashboard_local/.previews`, { recursive: true });
await fs.writeFile(`${root}/dashboard_local/.previews/ClientAliases.png`, new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(path);
console.log(path);
