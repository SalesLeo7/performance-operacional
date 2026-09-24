# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Gestores operacionais da CJM que acompanham desempenho, capacidade, atrasos, exceções e qualidade dos dados.
- Representantes dos clientes que consultam resultados operacionais compartilháveis e precisam entender a situação do próprio processo.
- O responsável administrativo pelo dashboard, que configura fontes, metas, regras, jornada, capacidade e aliases de clientes e Owners.

## Product Purpose

O dashboard consolida a performance operacional de Recebimento e Expedição por cliente. Ele permite acompanhar SLA, Performance Gross, Performance NET, capacidade diária, volumes, atrasos e tempos entre etapas. O produto deve apoiar reuniões operacionais, explicar variações de desempenho e indicar processos que exigem ação.

O resultado é bem-sucedido quando os usuários conseguem identificar rapidamente a situação do período, entender como regras e capacidade influenciam os indicadores e chegar aos pedidos ou pré-avisos que precisam de tratamento.

## Positioning

O produto combina dados reais das operações com regras configuráveis por cliente e Owner. A Performance Gross considera o prazo operacional aplicável; a Performance NET aplica também a capacidade diária oficial, mantendo no Gross as linhas que excedem a capacidade. Os prazos respeitam eventos configuráveis, horários de corte, dias úteis, feriados, tolerâncias e fallback de etapas sem informação.

## Operating Context

- O dashboard é atualizado a partir de arquivos locais e distribuído como HTML autônomo.
- O Inbound usa a base legada de Overview; o Outbound usa CSVs por cliente a partir de uma data de corte e preserva o histórico anterior.
- Metas e aliases vêm de `MetasSLA.xlsx`. Capacidade, jornada, feriados, fontes, Owners, etapas e regras de Gross vêm de `ParametrosOperacionais.xlsx`.
- A versão do cliente é usada em reuniões e compartilhamentos. A versão administrativa concentra origem, cobertura, fallback, divergências, exclusões e validações internas.
- A atualização deve interromper a publicação quando as fontes falham nas validações estruturais, mantendo o dashboard anterior disponível.

## Capabilities and Constraints

- Filtrar por cliente, Owner e período nas granularidades mês, semana, dia ou intervalo personalizado.
- Exibir a evolução mês a mês em janelas mensais e dia a dia nos recortes curtos, mantendo os cards consolidados pelo mesmo filtro.
- Calcular os cartões sobre todo o período selecionado, ponderando percentuais por linhas elegíveis.
- Usar as nomenclaturas `Performance Gross` e `Performance NET` nas telas compartilhadas.
- Separar clientes com divisões distintas por Owner, como ASUS ECOMM e ASUS RETAIL.
- Unificar aliases de clientes quando representam a mesma operação, como ACBZ e ASUS.
- Desconsiderar pedidos com data válida em `CANCELLED` de todos os cálculos operacionais.
- Tratar dados ausentes sem inventar valores. Quando um evento final configurado estiver vazio, usar a etapa anterior válida conforme a regra documentada; quando não houver base suficiente, exibir que o indicador não está disponível.
- Manter informações internas de base, cobertura, fallback e qualidade fora da visualização compartilhada com clientes.
- Executar localmente e sem dependência de Power BI, servidor externo ou publicação de dados na internet.
- Para compartilhamento externo em rede, autenticação e controle de acesso por cliente continuam sendo uma decisão em aberto.

## Brand Commitments

- Nome do produto: `Performance Operacional`.
- Identificação do contexto: `Operações CJM`.
- Comunicação em português do Brasil, direta, explicativa e adequada para conversas com clientes.
- Preservar a distinção conceitual entre Performance Gross, Performance NET, SLA, capacidade e qualidade dos dados.

## Evidence on Hand

- Aplicação principal em `dashboard_local/`, incluindo lógica, estilos, testes e instruções de atualização.
- Arquivos autônomos `Dashboard Atualizado.html` e `Dashboard Administrativo.html`.
- Dados agregados gerados em `dashboard_local/data/dashboard_data.json`.
- Bases operacionais locais, arquivos CSV de Outbound e planilhas de parâmetros do projeto.
- Protótipo comparativo de Gross e NET em `dashboard_local/prototype_performance_gross_net.html`.
- Não existem depoimentos, benchmarks externos ou alegações comerciais autorizadas; trabalhos futuros não devem fabricá-los.

## Product Principles

1. Explicar o resultado antes de expor a complexidade do cálculo.
2. Tornar Gross, NET, capacidade e prazos rastreáveis até os registros que os formam.
3. Distinguir claramente ausência de dados, configuração pendente e desempenho ruim.
4. Preservar a confidencialidade e mostrar ao cliente apenas informações úteis para a operação compartilhada.
5. Permitir que regras operacionais mudem por cliente e Owner sem exigir alteração manual do código do dashboard.
