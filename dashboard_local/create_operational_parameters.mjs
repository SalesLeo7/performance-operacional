import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = "C:/performance_geral_cjm/00 - HTML's update";
const threadId = "01a08633-89b4-7283-8814-f0b65f6970f7";
const outputDir = `${root}/outputs/${threadId}`;
const previewDir = `${root}/dashboard_local/.previews`;
const defaults = JSON.parse(await fs.readFile(`${root}/dashboard_local/data/operational_defaults.json`, "utf8"));

const workbook = Workbook.create();
const guide = workbook.worksheets.add("Orientacoes");
const capacity = workbook.worksheets.add("Capacidade");
const journey = workbook.worksheets.add("Jornada");
const holidays = workbook.worksheets.add("Feriados");
const targets = workbook.worksheets.add("MetasEtapas");
const processes = workbook.worksheets.add("ProcessosOutbound");
const rules = workbook.worksheets.add("Regras");

const navy = "#002664";
const blue = "#004B93";
const pale = "#EAF5FB";
const amber = "#FFF2CC";
const light = "#F4F6F9";
const red = "#D71920";
const green = "#26863B";
const line = "#DCE2EA";
const ink = "#172033";
const muted = "#667085";
const font = "Arial";

function baseSheet(sheet, tabColor) {
  sheet.showGridLines = false;
  sheet.tabColor = tabColor;
  sheet.getRange("A1:Z200").format.font = { name: font, size: 10, color: ink };
}

function title(sheet, text, subtitle, endColumn) {
  sheet.getRange(`A2:${endColumn}2`).merge();
  sheet.getRange("A2").values = [[text]];
  sheet.getRange("A2").format.font = { name: font, size: 15, bold: true, color: navy };
  sheet.getRange(`A3:${endColumn}3`).merge();
  sheet.getRange("A3").values = [[subtitle]];
  sheet.getRange("A3").format.font = { name: font, size: 10, italic: true, color: muted };
  sheet.getRange(`A4:${endColumn}4`).format.borders = { bottom: { style: "thin", color: blue } };
}

function header(range) {
  range.format = {
    fill: navy,
    font: { name: font, size: 10, bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { insideVertical: { style: "thin", color: "#FFFFFF" } },
  };
  range.format.rowHeight = 32;
}

function body(range) {
  range.format.verticalAlignment = "center";
  range.format.borders = { insideHorizontal: { style: "thin", color: line } };
  range.format.rowHeight = 22;
}

baseSheet(guide, navy);
title(guide, "Parâmetros operacionais do Outbound", "Edite as entradas amarelas e execute Atualizar Dashboard Atualizado.cmd para recalcular o dashboard.", "H");
guide.getRange("A6:B6").values = [["Ordem de atualização", "Ação"]];
header(guide.getRange("A6:B6"));
guide.getRange("A7:B10").values = [
  [1, "Na aba Capacidade, informe a capacidade oficial de linhas/dia, confirme a vigência e altere Ativo para Sim."],
  [2, "Revise a jornada padrão e crie linhas específicas por cliente apenas quando houver exceção."],
  [3, "Revise os feriados. Use as linhas de exceção manual para paralisações ou dias trabalhados extraordinários."],
  [4, "Informe metas de horas úteis por etapa em MetasEtapas e por processo em ProcessosOutbound. Sem SLA oficial, os cards mostram Aguardando SLA."],
];
body(guide.getRange("A7:B10"));
guide.getRange("A12:B12").values = [["Conceito", "Regra aplicada"]];
header(guide.getRange("A12:B12"));
guide.getRange("A13:B21").values = [
  ["Gross", "Usa todas as linhas válidas classificadas como On Time ou Delay."],
  ["NET", "Usa somente as linhas que cabem na capacidade oficial ativa do cliente no dia operacional da liberação."],
  ["Excesso de capacidade", "Permanece no Gross e sai do numerador e do denominador do NET. Motivo: Excluído do NET por capacidade."],
  ["Rateio", "A capacidade é consumida por linha. Um pedido pode ficar integralmente, parcialmente ou totalmente fora do NET."],
  ["FIFO", "RELEASED_DATETIME, depois CREATION_DATETIME e Chaveamento."],
  ["Dia operacional", "Liberações após 17h ou em dia não útil passam ao próximo dia útil às 08h. Antes das 08h passam para 08h."],
  ["Horas úteis", "Segunda a sexta, 08:00–12:00 e 13:00–17:00, descontando feriados e exceções cadastradas."],
  ["Intervalos", "Somente pares completos, em ordem cronológica e com início e fim válidos entram em média, mediana e p90."],
  ["Sem informação", "Registros sem os dados necessários não entram no indicador e aparecem na cobertura e na qualidade."],
];
body(guide.getRange("A13:B21"));
guide.getRange("A23:B23").values = [["Fonte", "Endereço"]];
header(guide.getRange("A23:B23"));
guide.getRange("A24:B26").values = [
  ["Base operacional", "00 - Bases OVERVIEW HTMLs.xlsx"],
  ["Feriados de Cajamar 2025", "https://cajamar.sp.gov.br/decretos/decretos-municipais/decreto-7365-de-2024/"],
  ["Feriados de Cajamar 2026", "https://cajamar.sp.gov.br/cidade/feriados/"],
];
body(guide.getRange("A24:B26"));
guide.getRange("A:A").format.columnWidth = 25;
guide.getRange("B:B").format.columnWidth = 92;
guide.getRange("B7:B26").format.wrapText = true;
guide.getRange("A7:B26").format.autofitRows();

baseSheet(capacity, blue);
title(capacity, "Capacidade diária por cliente", "A capacidade sugerida é o p95 do volume diário liberado. O NET exige capacidade oficial preenchida e ativa.", "J");
const capacityHeaders = ["ClientKey", "Cliente", "CapacidadeOficial", "CapacidadeSugerida", "VigenciaInicio", "VigenciaFim", "Ativo", "Metodo", "Observacao", "StatusNET"];
capacity.getRange("A6:J6").values = [capacityHeaders];
header(capacity.getRange("A6:J6"));
const capacityRows = defaults.clients.map((client, index) => [
  client.key, client.name, null, client.suggestedCapacity, new Date("2025-01-01T00:00:00"), null, "Não",
  `p95 de ${client.observedDays} dias com liberação`, "", null,
]);
capacity.getRange("A7").write(capacityRows);
const capacityEnd = 6 + capacityRows.length;
capacity.getRange(`J7`).formulas = [[`=IF(OR(C7="",G7<>"Sim"),"NET não calculado","NET habilitado")`]];
capacity.getRange(`J7:J${capacityEnd}`).fillDown();
body(capacity.getRange(`A7:J${capacityEnd}`));
capacity.getRange(`C7:C${capacityEnd}`).format.fill = amber;
capacity.getRange(`E7:G${capacityEnd}`).format.fill = amber;
capacity.getRange(`I7:I${capacityEnd}`).format.fill = amber;
capacity.getRange(`C7:D${capacityEnd}`).format.numberFormat = "#,##0";
capacity.getRange(`E7:F${capacityEnd}`).format.numberFormat = "dd/mm/yyyy";
capacity.getRange(`G7:G${capacityEnd}`).dataValidation = { rule: { type: "list", values: ["Sim", "Não"] } };
capacity.getRange(`J7:J${capacityEnd}`).conditionalFormats.add("containsText", { text: "habilitado", format: { fill: "#E6F4E9", font: { bold: true, color: green } } });
capacity.getRange(`J7:J${capacityEnd}`).conditionalFormats.add("containsText", { text: "não calculado", format: { fill: "#FDE8E8", font: { bold: true, color: red } } });
capacity.tables.add(`A6:J${capacityEnd}`, true, "CapacidadeCliente").style = "TableStyleMedium2";
capacity.freezePanes.freezeRows(6);
for (const [range, width] of [["A:A",14],["B:B",20],["C:D",20],["E:F",16],["G:G",10],["H:H",29],["I:I",34],["J:J",22]]) capacity.getRange(range).format.columnWidth = width;

baseSheet(journey, "#3E7CB1");
title(journey, "Jornada operacional", "A linha DEFAULT vale para todos os clientes. Cadastre uma linha específica somente para substituir a jornada padrão.", "J");
journey.getRange("A6:J6").values = [["ClientKey", "VigenciaInicio", "VigenciaFim", "InicioManha", "FimManha", "InicioTarde", "FimTarde", "FusoHorario", "Ativo", "Observacao"]];
header(journey.getRange("A6:J6"));
journey.getRange("A7:J7").values = [["DEFAULT", new Date("2025-01-01T00:00:00"), null, 8 / 24, 12 / 24, 13 / 24, 17 / 24, "America/Sao_Paulo", "Sim", "Jornada padrão aprovada"]];
for (let row = 8; row <= 17; row++) journey.getRange(`A${row}:J${row}`).values = [[null,null,null,null,null,null,null,"America/Sao_Paulo","Não",null]];
body(journey.getRange("A7:J17"));
journey.getRange("A8:G17").format.fill = amber;
journey.getRange("I8:J17").format.fill = amber;
journey.getRange("B7:C17").format.numberFormat = "dd/mm/yyyy";
journey.getRange("D7:G17").format.numberFormat = "hh:mm";
journey.getRange("I7:I17").dataValidation = { rule: { type: "list", values: ["Sim", "Não"] } };
journey.tables.add("A6:J17", true, "JornadaCliente").style = "TableStyleMedium2";
journey.freezePanes.freezeRows(6);
for (const [range, width] of [["A:A",15],["B:C",16],["D:G",14],["H:H",22],["I:I",10],["J:J",35]]) journey.getRange(range).format.columnWidth = width;

baseSheet(holidays, "#6B8E23");
title(holidays, "Feriados e exceções operacionais", "Feriados ativos não contam como dia útil. Uma exceção com DiaUtil=Sim transforma a data em dia trabalhado.", "G");
holidays.getRange("A6:G6").values = [["Data", "Nome", "Abrangencia", "ClientKey", "DiaUtil", "Ativo", "Fonte ou observacao"]];
header(holidays.getRange("A6:G6"));
const holidayRows = [
  ["2025-01-01","Confraternização Universal","Nacional"],["2025-01-20","São Sebastião, padroeiro de Cajamar","Municipal"],["2025-02-18","Aniversário de Cajamar","Municipal"],["2025-04-18","Paixão de Cristo","Municipal"],["2025-04-21","Tiradentes","Nacional"],["2025-05-01","Dia do Trabalho","Nacional"],["2025-06-19","Corpus Christi","Municipal"],["2025-07-09","Revolução Constitucionalista de 1932","Estadual"],["2025-09-07","Independência do Brasil","Nacional"],["2025-10-12","Nossa Senhora Aparecida","Nacional"],["2025-11-02","Finados","Nacional"],["2025-11-15","Proclamação da República","Nacional"],["2025-11-20","Dia Nacional de Zumbi e da Consciência Negra","Nacional"],["2025-12-25","Natal","Nacional"],
  ["2026-01-01","Confraternização Universal","Nacional"],["2026-01-20","São Sebastião, padroeiro de Cajamar","Municipal"],["2026-02-18","Aniversário de Cajamar","Municipal"],["2026-04-03","Paixão de Cristo","Municipal"],["2026-04-21","Tiradentes","Nacional"],["2026-05-01","Dia do Trabalho","Nacional"],["2026-06-04","Corpus Christi","Municipal"],["2026-07-09","Revolução Constitucionalista de 1932","Estadual"],["2026-09-07","Independência do Brasil","Nacional"],["2026-10-12","Nossa Senhora Aparecida","Nacional"],["2026-11-02","Finados","Nacional"],["2026-11-15","Proclamação da República","Nacional"],["2026-11-20","Dia Nacional de Zumbi e da Consciência Negra","Nacional"],["2026-12-25","Natal","Nacional"],
].map(([day,name,scope]) => [new Date(`${day}T00:00:00`),name,scope,"DEFAULT","Não","Sim",scope === "Municipal" ? "Prefeitura de Cajamar" : scope === "Estadual" ? "Estado de São Paulo" : "Calendário nacional"]);
for (let index = 0; index < 12; index++) holidayRows.push([null,"Exceção manual", "Operacional", "DEFAULT", "Não", "Não", "Preencher data, regra e ativar"]);
holidays.getRange("A7").write(holidayRows);
const holidayEnd = 6 + holidayRows.length;
body(holidays.getRange(`A7:G${holidayEnd}`));
holidays.getRange(`A${holidayEnd-11}:G${holidayEnd}`).format.fill = amber;
holidays.getRange(`A7:A${holidayEnd}`).format.numberFormat = "dd/mm/yyyy";
holidays.getRange(`E7:F${holidayEnd}`).dataValidation = { rule: { type: "list", values: ["Sim", "Não"] } };
holidays.tables.add(`A6:G${holidayEnd}`, true, "CalendarioOperacional").style = "TableStyleMedium4";
holidays.freezePanes.freezeRows(6);
for (const [range, width] of [["A:A",15],["B:B",42],["C:C",16],["D:D",15],["E:F",11],["G:G",34]]) holidays.getRange(range).format.columnWidth = width;

baseSheet(targets, "#8A6D3B");
title(targets, "Metas por etapa", "As metas começam vazias. Até a aprovação, o dashboard mostra as distribuições sem classificar a etapa.", "I");
targets.getRange("A6:I6").values = [["ClientKey", "EtapaOrigem", "EtapaDestino", "MetaHorasUteis", "VigenciaInicio", "VigenciaFim", "Ativo", "Observacao", "Status"]];
header(targets.getRange("A6:I6"));
const transitions = [["Creation","Released"],["Released","Allocated"],["Allocated","In Progress"],["In Progress","Picked"],["Picked","Packed"],["Packed","Ready to Load"],["Ready to Load","Complete"],["Complete","Shipped"],["Creation","Shipped"]];
const targetRows = transitions.map(([from,to]) => ["DEFAULT",from,to,null,new Date("2025-01-01T00:00:00"),null,"Não","",null]);
targets.getRange("A7").write(targetRows);
const targetEnd = 6 + targetRows.length;
targets.getRange("I7").formulas = [[`=IF(OR(D7="",G7<>"Sim"),"Sem meta oficial","Meta ativa")`]];
targets.getRange(`I7:I${targetEnd}`).fillDown();
body(targets.getRange(`A7:I${targetEnd}`));
targets.getRange(`D7:H${targetEnd}`).format.fill = amber;
targets.getRange(`D7:D${targetEnd}`).format.numberFormat = "0.0";
targets.getRange(`E7:F${targetEnd}`).format.numberFormat = "dd/mm/yyyy";
targets.getRange(`G7:G${targetEnd}`).dataValidation = { rule: { type: "list", values: ["Sim", "Não"] } };
targets.tables.add(`A6:I${targetEnd}`, true, "MetasEtapas").style = "TableStyleMedium2";
targets.freezePanes.freezeRows(6);
for (const [range, width] of [["A:A",15],["B:C",19],["D:D",18],["E:F",16],["G:G",10],["H:H",35],["I:I",19]]) targets.getRange(range).format.columnWidth = width;

baseSheet(processes, "#A15C2F");
title(processes, "Processos Outbound", "Defina os limites de cada indicador. O tempo é medido da origem do primeiro par até o destino do segundo par.", "L");
processes.getRange("A6:L6").values = [["ClientKey", "OwnerKey", "ProcessoKey", "ProcessoNome", "InicioOrigem", "InicioDestino", "FimOrigem", "FimDestino", "MetaHorasUteis", "VigenciaInicio", "VigenciaFim", "Ativo"]];
header(processes.getRange("A6:L6"));
const processRows = [
  ["DEFAULT", "DEFAULT", "PROCESSAMENTO", "Processamento", "Allocated", "In Progress", "In Progress", "Picked", null, new Date("2025-01-01T00:00:00"), null, "Sim"],
  ["DEFAULT", "DEFAULT", "SEPARACAO", "Separação", "In Progress", "Picked", "Packed", "Ready to Load", null, new Date("2025-01-01T00:00:00"), null, "Sim"],
];
processes.getRange("A7").write(processRows);
const processEnd = 6 + processRows.length;
processes.getRange("A7:L" + processEnd).format.fill = amber;
processes.getRange("I7:I" + processEnd).format.numberFormat = "0.0";
processes.getRange("J7:K" + processEnd).format.numberFormat = "dd/mm/yyyy";
processes.getRange("E7:H" + processEnd).dataValidation = { rule: { type: "list", values: ["Creation", "Released", "Allocated", "In Progress", "Picked", "Packed", "Ready to Load", "Complete", "Shipped"] } };
processes.getRange("L7:L" + processEnd).dataValidation = { rule: { type: "list", values: ["Sim", "Não"] } };
body(processes.getRange("A7:L" + processEnd));
processes.tables.add("A6:L" + processEnd, true, "ProcessosOutbound").style = "TableStyleMedium2";
processes.freezePanes.freezeRows(6);
for (const [range, width] of [["A:B",14],["C:C",18],["D:D",22],["E:H",18],["I:I",18],["J:K",16],["L:L",10]]) processes.getRange(range).format.columnWidth = width;

baseSheet(rules, "#98A2B3");
title(rules, "Regras de qualidade", "Limites usados para explicar a confiabilidade dos tempos. Edite somente os valores amarelos.", "D");
rules.getRange("A6:D6").values = [["Parametro", "Valor", "Unidade", "Aplicacao"]];
header(rules.getRange("A6:D6"));
rules.getRange("A7:D10").values = [
  ["CoberturaConfiavel", .90, "%", "Cobertura igual ou superior: confiável"],
  ["CoberturaAtencao", .70, "%", "Cobertura entre este valor e o confiável: atenção"],
  ["AlertaDuracaoZero", .20, "%", "Alerta quando a proporção de durações zero ultrapassa o valor"],
  ["HorasDiaUtil", 8, "horas", "Conversão de horas úteis para dias úteis equivalentes"],
];
body(rules.getRange("A7:D10"));
rules.getRange("B7:B10").format.fill = amber;
rules.getRange("B7:B9").format.numberFormat = "0.0%";
rules.getRange("B10").format.numberFormat = "0.0";
rules.getRange("B7:B9").dataValidation = { rule: { type: "decimal", operator: "between", formula1: 0, formula2: 1 } };
rules.tables.add("A6:D10", true, "RegrasQualidade").style = "TableStyleMedium2";
for (const [range, width] of [["A:A",25],["B:B",14],["C:C",13],["D:D",64]]) rules.getRange(range).format.columnWidth = width;

workbook.recalculate();
const inspect = await workbook.inspect({ kind: "table", range: `Capacidade!A6:J${Math.min(capacityEnd, 14)}`, include: "values,formulas", tableMaxRows: 12, tableMaxCols: 10 });
console.log(inspect.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan" });
console.log(errors.ndjson);

await fs.mkdir(previewDir, { recursive: true });
for (const [sheetName, range] of [["Orientacoes","A1:H27"],["Capacidade",`A1:J${capacityEnd}`],["Jornada","A1:J17"],["Feriados",`A1:G${holidayEnd}`],["MetasEtapas",`A1:I${targetEnd}`],["ProcessosOutbound",`A1:L${processEnd}`],["Regras","A1:D11"]]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(`${previewDir}/${sheetName}.png`, new Uint8Array(await preview.arrayBuffer()));
}

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/ParametrosOperacionais.xlsx`);
console.log(`${outputDir}/ParametrosOperacionais.xlsx`);
