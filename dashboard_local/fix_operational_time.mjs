import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const path = "C:/performance_geral_cjm/00 - HTML's update/outputs/01a08633-89b4-7283-8814-f0b65f6970f7/ParametrosOperacionais.xlsx";
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
const journey = workbook.worksheets.getItem("Jornada");
journey.getRange("D7:G7").values = [[8 / 24, 12 / 24, 13 / 24, 17 / 24]];
journey.getRange("D7:G7").format.numberFormat = "hh:mm";
workbook.recalculate();
const check = await workbook.inspect({ kind: "table", range: "Jornada!A6:J8", include: "values,formulas", tableMaxRows: 3, tableMaxCols: 10 });
console.log(check.ndjson);
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(path);
