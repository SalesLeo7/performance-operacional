import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const root = "C:/performance_geral_cjm/00 - HTML's update";
const path = `${root}/outputs/01a08633-89b4-7283-8814-f0b65f6970f7/ParametrosOperacionais.xlsx`;
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
const sheet = workbook.worksheets.getItem("RegrasGross");
const endRow = sheet.getUsedRange(true).rowCount;
sheet.getRange("P7").formulas = [[`=IF(N7<>"Sim","Inativa",IF(OR(A7="",B7="",C7="",D7="",G7="",L7=""),"Configuração incompleta",IF(AND(G7="Dia útil + hora",OR(ISBLANK(H7),ISBLANK(I7))),"Prazo incompleto",IF(AND(G7="Horas úteis",ISBLANK(J7)),"Horas úteis ausentes","Regra ativa"))))`]];
sheet.getRange(`P7:P${endRow}`).fillDown();
workbook.recalculate();
const check = await workbook.inspect({ kind: "table", range: "RegrasGross!A6:P10", include: "values,formulas", tableMaxRows: 5, tableMaxCols: 16 });
console.log(check.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 300 }, summary: "final formula error scan" });
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: "RegrasGross", range: "A1:P22", scale: 1, format: "png" });
await fs.writeFile(`${root}/dashboard_local/.previews/RegrasGross_gross.png`, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(path);
