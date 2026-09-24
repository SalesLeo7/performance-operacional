import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const root = "C:/performance_geral_cjm/00 - HTML's update";
const threadId = "01a08633-89b4-7283-8814-f0b65f6970f7";
const workbookPath = `${root}/outputs/${threadId}/ParametrosOperacionais.xlsx`;
const previewDir = `${root}/dashboard_local/.previews`;
const defaults = JSON.parse(await fs.readFile(`${root}/dashboard_local/data/operational_defaults.json`, "utf8"));
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));

const navy = "#002664";
const blue = "#004B93";
const amber = "#FFF2CC";
const line = "#DCE2EA";
const ink = "#172033";
const muted = "#667085";
const red = "#D71920";
const green = "#26863B";
const font = "Arial";

function header(range) {
  range.format = {
    fill: navy,
    font: { name: font, size: 10, bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { insideVertical: { style: "thin", color: "#FFFFFF" } },
  };
  range.format.rowHeight = 36;
}

function body(range) {
  range.format.verticalAlignment = "center";
  range.format.borders = { insideHorizontal: { style: "thin", color: line } };
  range.format.rowHeight = 23;
}

const guide = workbook.worksheets.getItem("Orientacoes");
guide.getRange("A7:B10").values = [
  [1, "Na aba RegrasGross, revise por cliente o evento inicial, o evento final, as faixas de corte e os prazos. Todas as etapas estão disponíveis nas listas."],
  [2, "Na aba Capacidade, informe a capacidade oficial de linhas/dia, confirme a vigência e altere Ativo para Sim."],
  [3, "Revise Jornada e Feriados. O vencimento considera dias úteis, horários, intervalos e exceções do cliente."],
  [4, "Informe metas de horas úteis por etapa quando forem aprovadas. Sem meta, a tela mostra a distribuição sem semáforo."],
];
guide.getRange("A13:B21").values = [
  ["Gross recalculado", "Classifica cada linha pela regra ativa do cliente, usando os eventos, cortes e prazos configurados em RegrasGross."],
  ["Gross realizado", "Inclui processos concluídos e processos ainda abertos cujo prazo já venceu."],
  ["Gross de concluídos", "Inclui somente processos que possuem o evento final configurado."],
  ["Em andamento", "Processos abertos antes do vencimento ficam fora do Gross realizado e aparecem na visão operacional."],
  ["Gross da base", "Mantém a coluna Performance original para comparação com o resultado recalculado."],
  ["NET", "Aplica a capacidade oficial ao Gross recalculado. O excesso de linhas permanece no Gross e sai do NET."],
  ["Limite de corte", "O fim da faixa é inclusivo. Exemplo: exatamente 14:00 pertence à faixa até 14:00."],
  ["Horas e dias úteis", "Considera Jornada, Feriados e exceções. O prazo pode usar dia útil mais hora ou quantidade de horas úteis."],
  ["Sem informação", "Registros sem regra, início ou dados necessários ficam como Não calculado e aparecem na cobertura."],
];

const gross = workbook.worksheets.add("RegrasGross");
gross.showGridLines = false;
gross.tabColor = "#7A5AF8";
gross.getRange("A1:Z200").format.font = { name: font, size: 10, color: ink };
gross.getRange("A2:P2").merge();
gross.getRange("A2").values = [["Regras de prazo do Gross por cliente"]];
gross.getRange("A2").format.font = { name: font, size: 15, bold: true, color: navy };
gross.getRange("A3:P3").merge();
gross.getRange("A3").values = [["Cada RegraID pode ter várias faixas. O início da faixa é exclusivo e o fim é inclusivo; campos vazios representam o início ou o fim do dia."]];
gross.getRange("A3").format.font = { name: font, size: 10, italic: true, color: muted };
gross.getRange("A4:P4").format.borders = { bottom: { style: "thin", color: blue } };

const headers = ["ClientKey", "RegraID", "EtapaInicial", "EtapaFinal", "HoraInicioExclusiva", "HoraFimInclusiva", "TipoPrazo", "DiasUteis", "HoraLimite", "HorasUteis", "ToleranciaMinutos", "VigenciaInicio", "VigenciaFim", "Ativo", "Observacao", "Status"];
gross.getRange("A6:P6").values = [headers];
header(gross.getRange("A6:P6"));
const ruleRows = defaults.clients.flatMap(client => [
  [client.key, "PADRAO", "Allocated", "Complete", null, 14 / 24, "Dia útil + hora", 0, 17 / 24, null, 0, new Date("2025-01-01T00:00:00"), null, "Sim", "Alocado até 14h: concluir no mesmo dia útil até 17h", null],
  [client.key, "PADRAO", "Allocated", "Complete", 14 / 24, null, "Dia útil + hora", 1, 17 / 24, null, 0, new Date("2025-01-01T00:00:00"), null, "Sim", "Alocado após 14h: concluir no próximo dia útil até 17h", null],
]);
gross.getRange("A7").write(ruleRows);
const endRow = 6 + ruleRows.length;
gross.getRange("P7").formulas = [[`=IF(N7<>"Sim","Inativa",IF(OR(A7="",B7="",C7="",D7="",G7="",L7=""),"Configuração incompleta",IF(AND(G7="Dia útil + hora",OR(ISBLANK(H7),ISBLANK(I7))),"Prazo incompleto",IF(AND(G7="Horas úteis",ISBLANK(J7)),"Horas úteis ausentes","Regra ativa"))))`]];
gross.getRange(`P7:P${endRow}`).fillDown();
body(gross.getRange(`A7:P${endRow}`));
gross.getRange(`C7:O${endRow}`).format.fill = amber;
gross.getRange(`E7:F${endRow}`).format.numberFormat = "hh:mm";
gross.getRange(`I7:I${endRow}`).format.numberFormat = "hh:mm";
gross.getRange(`H7:H${endRow}`).format.numberFormat = "0";
gross.getRange(`J7:J${endRow}`).format.numberFormat = "0.0";
gross.getRange(`K7:K${endRow}`).format.numberFormat = "0";
gross.getRange(`L7:M${endRow}`).format.numberFormat = "dd/mm/yyyy";
const stages = ["Creation", "Released", "Allocated", "In Progress", "Picked", "Packed", "Ready to Load", "Complete", "Shipped"];
gross.getRange(`C7:D${endRow}`).dataValidation = { rule: { type: "list", values: stages } };
gross.getRange(`G7:G${endRow}`).dataValidation = { rule: { type: "list", values: ["Dia útil + hora", "Horas úteis"] } };
gross.getRange(`N7:N${endRow}`).dataValidation = { rule: { type: "list", values: ["Sim", "Não"] } };
gross.getRange(`P7:P${endRow}`).conditionalFormats.add("containsText", { text: "Regra ativa", format: { fill: "#E6F4E9", font: { bold: true, color: green } } });
gross.getRange(`P7:P${endRow}`).conditionalFormats.add("containsText", { text: "incompleta", format: { fill: "#FDE8E8", font: { bold: true, color: red } } });
gross.getRange(`P7:P${endRow}`).conditionalFormats.add("containsText", { text: "ausentes", format: { fill: "#FDE8E8", font: { bold: true, color: red } } });
gross.tables.add(`A6:P${endRow}`, true, "RegrasGrossCliente").style = "TableStyleMedium2";
gross.freezePanes.freezeRows(6);
for (const [range, width] of [["A:B",14],["C:D",18],["E:F",20],["G:G",20],["H:H",12],["I:I",14],["J:K",18],["L:M",16],["N:N",10],["O:O",54],["P:P",24]]) gross.getRange(range).format.columnWidth = width;

workbook.recalculate();
const check = await workbook.inspect({ kind: "table", range: `RegrasGross!A2:P${Math.min(endRow, 16)}`, include: "values,formulas", tableMaxRows: 16, tableMaxCols: 16 });
console.log(check.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 300 }, summary: "final formula error scan" });
console.log(errors.ndjson);
await fs.mkdir(previewDir, { recursive: true });
for (const [sheetName, range] of [["Orientacoes", "A1:H27"], ["RegrasGross", `A1:P${Math.min(endRow, 22)}`]]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(`${previewDir}/${sheetName}_gross.png`, new Uint8Array(await preview.arrayBuffer()));
}
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(workbookPath);
console.log(workbookPath);
