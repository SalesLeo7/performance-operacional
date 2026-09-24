# Performance Operacional

Dashboard local de performance de Inbound e Outbound.

## Onde encontrar cada coisa

- `Dashboard Atualizado.html`: visão para compartilhamento.
- `Dashboard Administrativo.html`: visão gerencial e controles internos.
- `dashboard_local/`: código do dashboard, gerador de dados, testes e parâmetros de execução.
- `Base_Clientes/`: bases consolidadas e fontes históricas por cliente.
- `MetasSLA.xlsx`: metas percentuais e aliases de clientes.
- `Base_Clientes/base_consolidada_inventário/inventario.csv`: histórico de contagens parciais de inventário.
- `outputs/01a08633-89b4-7283-8814-f0b65f6970f7/ParametrosOperacionais_Inbound.xlsx`: jornada, feriados, capacidade, regras Gross e regras de processos.
- `docs/`: documentação funcional e auditorias.
- `prototypes/`: protótipos de interface que não são usados na publicação atual.
- `archive/`: Power BI legado e cópias históricas de parâmetros.

## Atualização

1. Feche as planilhas de parâmetros.
2. Atualize as bases em `Base_Clientes/`.
3. Execute `Atualizar Dashboard Atualizado.cmd`.
4. Abra `Dashboard Atualizado.html`.

O gerador valida as fontes, recalcula os indicadores e publica os dois HTMLs na raiz.
