# Dashboard de Performance de Clientes — Especificação para Power BI

> Documento de definição funcional e técnica. Fonte inicial: `00 - Bases OVERVIEW HTMLs.xlsx`. A implementação em `.pbix` deve ocorrer somente após a validação do protótipo visual.

## 1. Objetivo

Sustentar reuniões de performance com clientes e acompanhar o cumprimento de SLA nas operações de:

- **Expedição**, originada na sheet `OverviewOrder`;
- **Recebimento**, originada na sheet `OverviewAdvice`.

O relatório deve responder, em menos de dois minutos:

1. Qual foi o SLA do cliente no período?
2. O resultado atingiu a meta?
3. Como ele evoluiu nos três últimos meses fechados?
4. Quantas linhas ficaram em atraso?
5. A cobertura dos dados é suficiente para confiar no indicador?
6. Quais processos explicam o resultado?

## 2. Público, distribuição e idioma

- Público principal: clientes externos em reuniões conduzidas pelo analista de dados.
- Uso inicial: relatório interno interativo, apresentado por compartilhamento de tela.
- Exposição: cada apresentação deve estar filtrada para um único cliente, sem comparação visível com outros clientes.
- Idioma da interface: português.
- Nomes técnicos do modelo: inglês, quando isso melhorar a manutenção.
- Acesso externo futuro: requer RLS por cliente antes de qualquer distribuição direta.

## 3. Fonte e atualização

### 3.1 Arquivo principal

`00 - Bases OVERVIEW HTMLs.xlsx`

O arquivo será substituído periodicamente, preservando caminho, nome, sheets e colunas. O Power Query pode, portanto, apontar para o caminho fixo.

### 3.2 Tabelas de origem

| Sheet | Papel | Registros observados | Colunas |
|---|---|---:|---:|
| `OverviewOrder` | Expedição | 177.415 | 34 |
| `OverviewAdvice` | Recebimento | 13.731 | 14 |
| `Sheet1` | Resumo manual/pivô | — | — |

`Sheet1` não deve alimentar o modelo: não reconcilia com a quantidade de registros da base detalhada.

### 3.3 Arquivo de configuração

Criar um arquivo persistente separado chamado `MetasSLA.xlsx`, com uma tabela `MetasSLA`:

| Campo | Tipo | Exemplo |
|---|---|---|
| `ClientKey` | Texto | `GWM` |
| `Operation` | Texto | `Outbound` / `Inbound` |
| `ValidFrom` | Data | `2026-01-01` |
| `ValidTo` | Data ou nulo | nulo |
| `TargetPct` | Decimal | `0,95` |
| `WarningPct` | Decimal | `0,90` |

Regra provisória na ausência de cadastro: meta de 95% e atenção a partir de 90%.

## 4. Modelo semântico

```text
DimDate ───────────┬──────── FactOrder
                   └──────── FactAdvice

DimClient ─────────┬──────── FactOrder
                   └──────── FactAdvice

DimClientAlias ─── DimClient
DimOrderType ───── FactOrder
DimAdviceStatus ── FactAdvice
MetasSLA ───────── DimClient + Operation + validity period
```

Não relacionar `FactOrder` e `FactAdvice` diretamente. São fatos independentes e seus campos `Chaveamento` representam entidades diferentes.

### 4.1 Chaves

- `FactOrder[Chaveamento]`: chave primária do fato de expedição.
- `FactAdvice[Chaveamento]`: chave primária do fato de recebimento.
- `ORDER_ID` e `Pre-Advice ID` não são únicos isoladamente.
- `DimClient[ClientKey]`: chave corporativa normalizada.

### 4.2 Aliases confirmados

| Expedição | Recebimento | Cliente normalizado |
|---|---|---|
| `BRDUCATI` | `BRDUCATIMO` | `DUCATI` |
| `BRHARLEY` | `BRHARLD` | `HARLEY` |
| `BRGAC` | `BRGACMES` | `GAC` |
| `BRJETOUR` | `BRCJ1JET` | `JETOUR` |
| `BREDELWHITE` | `BREDELWHIT` | `EDELWHITE` |
| `BRFIVEHANDS` | `BRFIVEHNDS` | `FIVEHANDS` |
| `BRSCANDERRA` | `BRSCANDERR` | `SCANDERRA` |
| `BRCLARO` | `BRCLAROSPO` | `CLARO` |
| `BRXSYS` | `BRCJ1XYS` | `XSYS` |
| `BRROQUETTE` | `BRRQTCAJ` | `ROQUETTE` |

`BRASUS` e `BRACBZ` permanecem clientes distintos até validação contrária.

## 5. Preparação dos dados

### 5.1 FactOrder — Expedição

- Converter explicitamente datas usando cultura adequada; `ORDER_DATE` contém datas e textos misturados.
- Combinar cada coluna de data com sua coluna de horário `*2` quando métricas de duração forem implementadas.
- Usar `CREATION_DATE` como data oficial da coorte mensal.
- Converter `NUM_LINES` para número inteiro e renomear para `LineCount`.
- Preservar `Performance` com três estados analíticos: `On Time`, `Delay`, `Unclassified`.
- Normalizar `Client ID` por `DimClientAlias`.
- Manter `ORDER_TYPE2` como dimensão auxiliar, sem preencher nulos por inferência.
- Não usar geografia nesta versão: endereço, cidade e CEP possuem baixa completude e valores inválidos.

### 5.2 FactAdvice — Recebimento

- Combinar `Creation` + `Creation2`, `Released` + `Released2`, `Start` + `Start2` e `Finish` + `Finish2` quando necessário.
- Usar `Creation` como data oficial da coorte mensal.
- Converter `Lines` para número inteiro e renomear para `LineCount`.
- Preservar `Status` como dimensão auxiliar.
- Normalizar `Client` por `DimClientAlias`.
- Excluir BRBMW completamente da análise de Recebimento na primeira versão, registrando o filtro como regra de qualidade visível ao analista.

### 5.3 Validações obrigatórias

- Chave de fato única e não nula.
- Data de criação válida.
- `LineCount > 0` para participação no SLA por linhas.
- Performance limitada a `On Time`, `Delay` ou nulo.
- Data/hora de etapa posterior não pode anteceder etapa anterior sem gerar uma flag de qualidade.
- Exibir data/hora da última atualização no título do relatório.

## 6. Regras de negócio e medidas

### 6.1 Período

- Visão padrão: três últimos meses fechados.
- Mês atual no visual: azul-escuro e posicionado à direita.
- Mês anterior: azul-claro.
- Mês anterior −1: cinza-claro.
- Comparação principal: mês atual versus mês anterior.

### 6.2 SLA principal por linhas

O campo `Performance` classifica o processo, mas o peso do indicador será o total de linhas desse processo.

```DAX
Valid Lines :=
CALCULATE(
    SUM(Fact[LineCount]),
    Fact[Performance] IN { "On Time", "Delay" },
    NOT ISBLANK(Fact[LineCount])
)

On Time Lines :=
CALCULATE(
    SUM(Fact[LineCount]),
    Fact[Performance] = "On Time",
    NOT ISBLANK(Fact[LineCount])
)

Delayed Lines :=
CALCULATE(
    SUM(Fact[LineCount]),
    Fact[Performance] = "Delay",
    NOT ISBLANK(Fact[LineCount])
)

SLA Lines % := DIVIDE([On Time Lines], [Valid Lines])
```

Criar medidas equivalentes para `FactOrder` e `FactAdvice`, ou usar calculation groups se a equipe já dominar essa abordagem.

### 6.3 Cobertura

```DAX
Eligible Records :=
CALCULATE(
    COUNTROWS(Fact),
    Fact[Performance] IN { "On Time", "Delay" },
    NOT ISBLANK(Fact[LineCount])
)

Data Coverage % := DIVIDE([Eligible Records], COUNTROWS(Fact))
```

Registros sem performance ou sem linhas ficam fora do SLA e aparecem na cobertura.

### 6.4 Semáforo

- Verde: `SLA Lines % >= TargetPct`.
- Âmbar: `WarningPct <= SLA Lines % < TargetPct`.
- Vermelho: `SLA Lines % < WarningPct`.
- Sem dados: cinza, nunca zero.

## 7. Estrutura do relatório

### 7.1 Resumo executivo

Objetivo: conduzir a abertura da reunião e sintetizar as duas operações.

KPIs — máximo de seis:

1. SLA por linhas;
2. Meta SLA;
3. Total de linhas;
4. Linhas em atraso;
5. Variação contra período anterior;
6. Cobertura dos dados.

Visuais:

- comparação Expedição × Recebimento;
- tendência de três meses;
- mensagem executiva gerada por regras, sem alegar causalidade;
- chamada para abrir detalhes dos atrasos.

### 7.2 Recebimento

- KPIs específicos de `FactAdvice`;
- SLA por linhas ao longo dos três meses;
- linhas On Time × Delay;
- composição por `Status`;
- BRBMW excluída e documentada internamente;
- botão de drill-through para processos atrasados.

### 7.3 Expedição

- KPIs específicos de `FactOrder`;
- SLA por linhas ao longo dos três meses;
- linhas On Time × Delay;
- composição por `ORDER_TYPE2`, quando preenchido;
- botão de drill-through para processos atrasados.

### 7.4 Detalhes

Tabela com:

- cliente;
- operação;
- identificador do processo;
- data de criação;
- linhas;
- tipo/status;
- performance.

Ordenação padrão: atrasos mais recentes e, depois, maior quantidade de linhas.

### 7.5 Qualidade dos dados — oculta/interna

- cobertura por operação e cliente;
- performance nula;
- linhas nulas;
- datas inválidas;
- sequências temporais invertidas;
- filtros de exclusão ativos;
- data da atualização e contagem de registros carregados.

### 7.6 Mais filtros — oculta

Filtros adicionais em página cinza-clara com retorno por toda a área de fundo.

### 7.7 Drill-through — oculta

Duplicata oculta da página Detalhes para evitar que filtros de drill-through fiquem presos na versão visível.

## 8. Filtros

Área fixa à esquerda e sincronizada entre as páginas:

- Cliente — obrigatório, seleção única;
- Período;
- Operação, apenas no Resumo;
- Performance.

Filtros adicionais:

- tipo de pedido;
- status de recebimento;
- faixa de volume de linhas;
- processo/identificador.

Filtros pré-definidos devem permanecer visíveis e bloqueados no painel de filtros, acompanhados do aviso corporativo.

## 9. Identidade visual

Aplicar o template e o tema JSON oficiais da DSV na implementação final.

- Canvas customizado: 1920 × 1080, proporção 16:9.
- Título no topo à esquerda, tamanho 18, com última atualização.
- KPIs no topo, título 14–16 e valor 22–26.
- Fundo dos KPIs branco e texto preto.
- Máximo de seis KPIs por página.
- Não usar o logotipo em todas as páginas; reservá-lo à abertura.
- Títulos simples e precisos nos gráficos.
- Evitar redundância entre rótulos de dados e eixos.
- Filtros de texto com busca; filtros sincronizados.
- Drill-through em cinza-claro, texto cinza e navegação na parte inferior central.

## 10. Referência real usada no protótipo

O protótipo usa BRGWM e meses de maio a julho de 2026, agregados diretamente do arquivo:

| Operação | Mês | Linhas válidas | On Time | Delay | SLA por linhas |
|---|---|---:|---:|---:|---:|
| Expedição | mai/2026 | 12.263 | 11.173 | 1.090 | 91,11% |
| Expedição | jun/2026 | 10.170 | 6.646 | 3.524 | 65,35% |
| Expedição | jul/2026 | 13.654 | 12.930 | 724 | 94,70% |
| Recebimento | mai/2026 | 1.406 | 719 | 687 | 51,14% |
| Recebimento | jun/2026 | 2.199 | 928 | 1.271 | 42,20% |
| Recebimento | jul/2026 | 2.002 | 617 | 1.385 | 30,82% |

Os números servem para validar narrativa e layout; o Power BI deverá recalculá-los a cada atualização.

## 11. Critérios de aceite

- Selecionar um cliente atualiza todas as páginas e não revela outros clientes.
- O SLA é ponderado por linhas e reconcilia com uma amostra manual.
- Registros sem performance/linhas não entram no SLA.
- A cobertura é exibida junto do indicador.
- A meta é lida de configuração externa com fallback explícito de 95%.
- Os três meses fechados aparecem em ordem cronológica e com cores corporativas de período.
- BRBMW não aparece em Recebimento.
- Drill-through abre apenas registros atrasados do contexto selecionado.
- O relatório permanece legível em tela 16:9 sem rolagem.
- Todas as exclusões e falhas de qualidade são auditáveis na página interna.

## 12. Fora do escopo inicial

- Inferência de causas de atraso sem campo causal confiável.
- Geografia de entrega.
- Lead time da BRBMW em Recebimento.
- Atualização automática por gateway e RLS para clientes externos.
- Previsão de SLA futuro.

## 13. Decisão visual validada

Decisão tomada após comparar três protótipos:

- usar no **Resumo** a comparação lado a lado originalmente explorada na variação C;
- manter no Resumo a **barra lateral de filtros** da variação A;
- usar a estrutura da variação A em todas as demais páginas;
- ordenar a navegação como `Resumo → Recebimento → Expedição → Detalhes → Qualidade`;
- conduzir o storytelling pela operação crítica primeiro: Recebimento, depois recuperação de Expedição e, por fim, processos para ação.

O arquivo `dashboard_powerbi_prototipo_variantes.html` preserva as alternativas que originaram essa decisão. O arquivo `dashboard_powerbi_prototipo.html` contém a proposta consolidada para validação final.
