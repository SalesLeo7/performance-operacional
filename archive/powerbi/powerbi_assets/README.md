# Ativos para implementação no Power BI

1. Mantenha `00 - Bases OVERVIEW HTMLs.xlsx` no caminho acordado.
2. Mantenha `MetasSLA.xlsx` na mesma pasta; ele contém metas e aliases persistentes.
3. Importe `dsv_customer_theme.json` em **Exibição → Temas → Procurar temas**.
4. Crie os parâmetros `pBaseFile` e `pConfigFile` e as consultas do arquivo `PowerQuery_M.txt`.
5. Crie os relacionamentos:
   - `DimDate[Date]` 1:* `FactOrder[CreationDate]`;
   - `DimDate[Date]` 1:* `FactAdvice[CreationDate]`;
   - `DimClient[ClientKey]` 1:* para os dois fatos;
   - `DimClient`/operação para `MetasSLA`, conforme a vigência adotada.
6. Marque `DimDate` como tabela de datas e classifique `YearMonthLabel` por `MonthIndex`.
7. Adicione as medidas de `Measures_DAX.txt`.
8. Construa as páginas na ordem: Resumo, Recebimento, Expedição, Detalhes, Qualidade.

O tema deste diretório reproduz os padrões levantados da página corporativa. Antes da publicação externa, substitua-o pelo JSON oficial da biblioteca DSV se houver divergência de versão.
