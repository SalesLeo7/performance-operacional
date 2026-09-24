# Dashboard local de performance

Esta versão substitui a dependência do Power BI por uma aplicação web executada no computador. O Inbound usa `Base_Clientes/base_consolidade_inbound/inbound_consolidado.csv` a partir do corte configurado por cliente e mantém o histórico anterior em `OverviewAdvice`. O Outbound usa `Base_Clientes/base_consolidade_outbound/outbound_consolidado.csv` a partir do corte configurado por cliente e mantém o histórico anterior em `OverviewOrder`. A aba Inventário usa `Base_Clientes/base_consolidada_inventário/inventario.csv` como histórico de contagens parciais. Metas e parâmetros vêm de `MetasSLA.xlsx` e `ParametrosOperacionais_Inbound.xlsx`.

## Como abrir

1. Na pasta principal do projeto, abra `Dashboard Atualizado.html` com duplo clique.
2. O arquivo é autônomo e não precisa de servidor ou terminal aberto.

`Dashboard Atualizado.html` é a versão para compartilhar com o cliente. Para consultar Performance da base, cobertura das regras, fallback, divergências e controles de qualidade, abra `Dashboard Administrativo.html` ou execute `Abrir Dashboard Administrativo.cmd`.

O HTML compartilhável inclui todos os clientes no filtro, mas omite os controles internos de qualidade. O cliente inicial continua sendo o definido como `defaultClient` no arquivo de dados.

## Como atualizar os dados

Feche as planilhas Excel e execute `Atualizar Dashboard Atualizado.cmd`, na pasta principal, quando a fonte ou os parâmetros forem alterados. A atualização valida todas as fontes antes de publicar. Se um CSV estiver ausente, duplicado, vazio, com Owner vazio, chave duplicada ou timestamp inválido, o processo para e os dashboards anteriores permanecem disponíveis.

O filtro de período oferece as granularidades `Mês`, `Semana`, `Dia` e `Intervalo`, todas baseadas em `CREATION_DATE`. Mês permite selecionar a janela de 1, 3, 6 ou 12 meses e todo o histórico; Semana e Dia usam uma data de referência; Intervalo usa calendários `De` e `Até`. Os cards, tabela e gráficos seguem o mesmo período escolhido.

Os gráficos preservam a evolução do recorte: mês a mês em janelas mensais e em intervalos que atravessam meses; dia a dia em semanas, dias e intervalos contidos em um único mês.

Nos gráficos **Demanda e capacidade**, o controle de drill alterna a hierarquia `Mês → Semana → Dia`. As setas sobem ou descem um nível, os botões permitem ir diretamente a qualquer nível e as colunas também são selecionáveis: um clique no mês abre sua última semana com movimento; um clique no dia da semana abre aquele dia. A seleção atualiza o período global, por isso cards, comparativos, situação operacional, jornada e detalhes acompanham o mesmo recorte.

Gross e NET em intervalos parciais são recalculados pela soma das métricas diárias completas por cliente e Owner. A capacidade aplicada ao NET é a soma dos limites diários dos dias úteis incluídos no intervalo.

## Gross, capacidade, jornada e metas

Edite `outputs/01a08633-89b4-7283-8814-f0b65f6970f7/ParametrosOperacionais_Inbound.xlsx`, disponível pelo botão **Baixar parâmetros** no Dashboard Administrativo. As células amarelas são entradas manuais.

- Preencha `CapacidadeOficial`, confirme a vigência e altere `Ativo` para `Sim` para habilitar o NET.
- Na aba `FontesOutbound`, mantenha cada cliente ativo associado a `outbound_consolidado.csv`. O arquivo é lido uma única vez e separado pelo alias de cliente; `DataCorte` continua individual e inclusiva, enquanto o dia anterior permanece no histórico legado.
- Na aba `FontesInbound`, mantenha o arquivo consolidado, o alias e o corte de cada cliente. A mesma planilha pode atender vários clientes.
- Na aba `RegrasInbound`, defina o início, o fim, o prazo e a vigência por cliente e Owner. A configuração inicial usa `Creation` → `Finish` e 24 horas úteis. Também são aceitos prazo por dia útil mais horário e o `Due Date` da fonte.
- Na aba `CapacidadeInbound`, preencha `CapacidadeOficial` e altere `Ativo` para `Sim` para habilitar o NET do Recebimento. A capacidade sugerida é o p95 das linhas recebidas por dia no evento inicial configurado em `RegrasInbound`.
- A capacidade do Inbound é independente da capacidade do Outbound e pode variar por Owner. Linhas acima do limite diário permanecem no Gross e saem do NET.
- Se a etapa final do Inbound estiver vazia, a etapa anterior preenchida é usada. Sem evento inicial ou sem os dados exigidos pelo tipo de prazo escolhido, o registro fica como não calculado e não entra no SLA.
- Na aba `OwnerAliases`, normalize o Owner recebido. ASUS usa `ECOMM` e `RETAIL`; ALGAR usa `TELECOM` e `VOGEL`; clientes de divisão única usam `PRINCIPAL`.
- `OwnerKey` em Capacidade, Jornada, MetasEtapas e RegrasGross segue a prioridade: cliente + Owner, cliente + `DEFAULT`, `DEFAULT` + `DEFAULT`.
- Na aba `RegrasGross`, cada cliente possui faixas próprias de corte e prazo. A configuração atual da GWM trata todos os pedidos como Stock: até 14h vence em D+1 às 20h; após 14h vence em D+2 às 16h.
- `EtapaInicial` e `EtapaFinal` aceitam qualquer etapa da jornada, de `Creation` a `Shipped`. O evento final precisa ser posterior ao inicial.
- O prazo pode ser definido como dia útil mais horário ou como quantidade de horas úteis. Vigência e tolerância são configuráveis.
- O Gross realizado inclui processos concluídos e atrasados em aberto. Processos ainda dentro do prazo aparecem na visão operacional e ficam fora do denominador.
- Registros sem regra ou timestamps necessários aparecem como `Não calculado`; o dashboard mostra a cobertura e mantém a `Performance` original para comparação.
- A nova fonte não possui `Performance`; por isso a comparação com a base aparece como indisponível nos períodos migrados. Como os CSVs atuais contêm apenas pedidos `Shipped`, indicadores de pedidos em aberto também aparecem como indisponíveis.
- Quando o evento final configurado estiver vazio, o cálculo usa a etapa preenchida imediatamente anterior. Se nenhuma etapa posterior ao início estiver disponível, o processo permanece aberto a partir do evento inicial. O dashboard e o CSV identificam o fallback aplicado.
- Pedidos com uma data válida na coluna `CANCELLED` são removidos antes dos cálculos e não entram em Gross, NET, capacidade, tempos ou detalhes. A quantidade excluída aparece somente no Dashboard Administrativo.
- A `CapacidadeSugerida` usa o p95 dos dias com linhas liberadas e serve como referência.
- Revise jornada, feriados e exceções operacionais antes de oficializar os resultados.
- As metas de etapa começam vazias. Sem meta oficial, o painel mostra média, mediana, p90 e cobertura sem semáforo de desempenho.
- A aba `ProcessosOutbound` define os pares de cada processo. Processamento usa `Allocated → In Progress` até `In Progress → Picked`; Separação usa `In Progress → Picked` até `Packed → Ready to Load`. Quando há regra Gross ativa, os processos herdam suas faixas de corte separadamente.

## Telas

- **Resumo:** comparação das duas operações e pontos para discussão.
- **Recebimento:** Performance Gross e NET, capacidade diária, situação dos pré-avisos e jornada `Creation → Released → In Progress → Finish` em horas úteis.
- **Expedição:** Gross recalculado, Gross de concluídos, comparação com a base, NET, situação operacional, capacidade diária e tempo entre etapas.
- **Inventário:** quantidade física observada, divergências e detalhamento da última contagem conhecida por Owner, localização, tag e SKU. O heatmap mostra a intensidade dos eventos únicos de auditoria por mês e dia da semana, acompanhado do acumulado de posições únicas. A posição é parcial e não representa o fechamento total do inventário.
- **Performance por processo:** após a situação dos pedidos, a Expedição mostra os processos configurados na aba `ProcessosOutbound`. Cada linha informa o par de início, o par de fim e o SLA em horas úteis. Por exemplo, Separação pode começar em `In Progress → Picked` e terminar em `Packed → Ready to Load`; o tempo calculado usa `In Progress` até `Ready to Load`. Sem `MetaHorasUteis` oficial, o card permanece como “Aguardando SLA”. Registros com endpoint ausente ou sequência inválida não entram no denominador desses cards; a cobertura e a qualidade ficam na área administrativa.
- **Filtro de meses:** os cards recalculam o período completo. SLA usa o total de linhas, volumes são somados e o ciclo usa média ponderada pelos registros válidos. A opção `Todos os meses` usa todo o histórico fechado disponível.
- No **Inventário**, o mesmo filtro usa a data da contagem: mês filtra os meses fechados selecionados, semana/dia usa o calendário global e intervalo usa `De`/`Até`. A posição física é recalculada até o fim do recorte e o heatmap mostra somente a atividade dentro dele.
- **Filtro de Owner:** aparece quando o cliente possui mais de uma divisão. `Todos os owners` inclui o histórico; um Owner específico mostra apenas sua divisão nas novas fontes de Inbound e Outbound.
- **Detalhes:** busca, filtros e exportação CSV das exceções.
- **Administração:** disponível somente no arquivo administrativo; reúne Performance da base, cobertura, fallback, divergências, exclusões e validações internas.
- A cobertura da fonte de Inventário, posições `NOINVENTORY`, chaves repetidas no histórico e quantidade de listas carregadas aparecem na aba Inventário para apoiar a leitura sem misturar essas linhas nos cards de estoque.

## Segurança e distribuição

O servidor aceita conexões apenas do próprio computador em `127.0.0.1`. Os dados não são publicados na internet. Para compartilhar a aplicação em rede ou com clientes externos, é necessário incluir autenticação e regras de acesso por cliente.
