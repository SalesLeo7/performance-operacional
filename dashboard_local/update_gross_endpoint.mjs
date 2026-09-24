import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const root = "C:/performance_geral_cjm/00 - HTML's update";
const path = `${root}/outputs/01a08633-89b4-7283-8814-f0b65f6970f7/ParametrosOperacionais_Inbound.xlsx`;
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
const sheet = workbook.worksheets.getItem("RegrasGross");
const used = sheet.getUsedRange(true);
const rows = used.values;
let changed = 0;
for (let i = 6; i < rows.length; i += 1) {
  const initial = rows[i][2];
  const final = rows[i][3];
  if (initial === "Allocated" && final === "Packed") {
    sheet.getCell(i, 3).values = [["Ready to Load"]];
    changed += 1;
  }
}
workbook.recalculate();
const check = await workbook.inspect({ kind: "table", range: "RegrasGross!A6:Q16", include: "values,formulas", tableMaxRows: 11, tableMaxCols: 17 });
console.log(`Regras Gross atualizadas: ${changed}`);
console.log(check.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 300 }, summary: "final formula error scan" });
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: "RegrasGross", range: "A1:Q18", scale: 1, format: "png" });
await fs.mkdir(`${root}/dashboard_local/.previews`, { recursive: true });
await fs.writeFile(`${root}/dashboard_local/.previews/RegrasGross_ready_to_load.png`, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(path);
