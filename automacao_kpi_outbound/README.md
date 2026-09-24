# Automação KPI Outbound

Esta pasta contém o pacote de implementação da automação assistida no Power Automate Desktop para o relatório `DSV-AMERSTANDARD: xxxxx270 KPI Outbound` do CargoWrite PRDD.

## Arquivos

- `KPI_Outbound_Clientes.xlsx`: planilha mensal selecionada no início do fluxo. Preencha somente a aba `Clientes`.
- `GUIA_POWER_AUTOMATE_DESKTOP.md`: construção do fluxo, variáveis, critérios de espera e tratamento de exceções.
- `calibracao/`: guarde aqui as imagens e os elementos de tela capturados na primeira calibração do WMS. Não reutilize imagens de outra resolução ou zoom.

## Uso mensal

1. Crie uma cópia da planilha para a competência que será extraída.
2. Na aba `Clientes`, informe o `client_id` exatamente como aparece no campo **Client ID** do WMS, o `nome_cliente` e marque `ativo` como `Sim`.
3. Abra o AMER Global Desktop, autentique-se manualmente no WMS e deixe a tela inicial disponível.
4. Execute o fluxo no Power Automate Desktop e escolha a planilha. Selecione `Teste` para um cliente ou `Lote completo` para todos os clientes ativos.
5. Não use a sessão virtual até o fluxo exibir o resumo final.

O fluxo calcula o mês-calendário anterior por padrão e permite competência manual somente após confirmação reforçada. O histórico é gravado na aba `Execucoes`.

## Regra de segurança

Depois que o WMS recebe o clique em **Export**, o status será registrado como `Exportação solicitada`. O fluxo nunca repete essa etapa automaticamente, pois o e-mail pode já ter sido enviado.
