# Fluxo: KPI Outbound mensal

## Objetivo

Executar, um cliente por vez, o relatório `DSV-AMERSTANDARD: xxxxx270 KPI Outbound` no CargoWrite PRDD e solicitar seu envio em CSV para `Leonardo.sales@dsv.com`.

O fluxo é assistido. O operador autentica-se antes de iniciá-lo e mantém o desktop virtual aberto, desbloqueado e sem interação até o resumo final.

## Pré-requisitos

- Power Automate Desktop instalado no computador que acessa o AMER Global Desktop.
- WMS autenticado manualmente e visível na tela inicial.
- Zoom do navegador e resolução mantidos iguais aos usados na calibração.
- Uma cópia de `KPI_Outbound_Clientes.xlsx` preenchida na aba `Clientes`.
- A pasta `calibracao` preenchida durante a primeira execução assistida.

## Parâmetros fixos

| Variável | Valor |
| --- | --- |
| `ReportName` | `DSV-AMERSTANDARD: xxxxx270 KPI Outbound` |
| `RecipientEmail` | `Leonardo.sales@dsv.com` |
| `ExportType` | `CSV` |
| `MaxReportWaitMinutes` | `10` |
| `DefaultPeriod` | mês-calendário anterior, America/Sao_Paulo |

## Entradas e validação

1. Use **Display select file dialog** para escolher a planilha mensal.
2. Abra a planilha em modo de leitura com **Launch Excel** e leia a tabela `ClientesKpi`.
3. Ignore linhas completamente vazias. Interrompa antes de abrir o WMS quando uma linha preenchida estiver sem `client_id` ou `nome_cliente`, quando `ativo` não for `Sim` ou `Não`, ou quando houver `client_id` ativo duplicado.
4. Exiba uma escolha obrigatória: `Teste` ou `Lote completo`.
5. No modo `Teste`, peça um único `client_id` que exista na lista ativa. No modo `Lote completo`, use todos os clientes ativos na ordem da tabela.
6. Calcule `FromDate` como o primeiro dia do mês anterior e `ToDate` como o último dia desse mês. Ofereça alteração manual de competência apenas com uma segunda confirmação explícita.
7. Exiba competência, modo e quantidade de clientes. A execução só começa após confirmação.

## Calibração dos elementos de tela

Primeiro tente capturar elementos com o gravador de desktop do PAD, ancorados na janela do AMER Global Desktop. Como o WMS está dentro de uma sessão virtual, é provável que parte dos controles não exponha seletores estáveis. Para esses casos, capture imagens de referência na pasta `calibracao`:

| Arquivo sugerido | Evidência esperada |
| --- | --- |
| `reports_menu.png` | menu **Reports** na tela inicial |
| `report_selection.png` | item **Report Selection** |
| `print_to_screen.png` | opção **Print to screen** |
| `report_row.png` | linha do relatório KPI Outbound |
| `client_id.png` | campo **Client ID** |
| `run_confirmation.png` | texto “You are about to run…” |
| `output_ready.png` | grade do relatório ou “Page 1 of 1” |
| `email_button.png` | ícone de e-mail na barra de saída |
| `email_dialog.png` | janela **E-mail** |

Use **Wait for image** para cada estado esperado e limite a procura a regiões pequenas da janela. Não dependa apenas de coordenadas absolutas. Se um elemento de imagem não for encontrado, tire screenshot, grave o estado da etapa e pare o lote.

## Caminho por cliente

1. Registre `Em execução` na aba `Execucoes`.
2. Em caso de necessidade, navegue de volta à tela inicial do WMS. Clique **Reports**, depois **Report Selection** e espere o título da tela.
3. Na guia inicial, confirme **Print to screen** e clique **Next**.
4. Aguarde a tela de resultados. Localize e selecione exatamente `DSV-AMERSTANDARD: xxxxx270 KPI Outbound`; depois clique **Next**.
5. Aguarde a tela de parâmetros. Selecione o `client_id` atual, preencha `From date` e `To Date` no formato validado na calibração e clique **Next**.
6. Espere o texto de confirmação “You are about to run…”. Compare o nome do relatório antes de clicar **Done**.
7. Aguarde a conclusão por até 10 minutos. Considere pronto apenas quando a aba **Output** mostrar a grade ou a indicação de página. Se houver tela de erro, timeout ou estado diferente, grave `Falha cliente`, capture a tela e siga para o próximo cliente.
8. Quando a saída estiver pronta, clique no ícone de e-mail e espere a janela **E-mail**.
9. Preencha somente:
   - **Export Type**: `CSV`
   - **E-mail Address**: `Leonardo.sales@dsv.com`
   - **Attachment Name**: `<nome_cliente>_KPI Outbound_<AAAA-MM>.csv`
   - **Subject**: `<nome_cliente> - KPI Outbound - <AAAA-MM>`
   - **Message**: deixe em branco
10. Antes de clicar **Export**, substitua no `nome_cliente` os caracteres inválidos para arquivo (`\\`, `/`, `:`, `*`, `?`, `"`, `<`, `>` e `|`) por `_`. Confirme que o diálogo continua mostrando o cliente e a competência atuais. Clique **Export**, registre `Exportação solicitada` e não repita a exportação automaticamente.
11. Clique **Done** para retornar ao fluxo de seleção de relatório antes de iniciar o próximo cliente.

## Sem dados e falhas

- Se o WMS permitir abrir a saída sem linhas, exporte o CSV e registre `Sem dados`.
- Falha antes de **Export**: uma tentativa adicional é permitida apenas quando o fluxo confirmar que o botão **Export** ainda não foi clicado.
- Falha após **Export**: registre `Verificação manual necessária`; não tente novamente.
- Queda da sessão, logout, tela inesperada ou perda da janela do WMS: registre `Falha lote`, capture a tela e interrompa os clientes restantes.
- Ao terminar, apresente um resumo com quantidade de `Exportação solicitada`, `Sem dados`, `Falha cliente` e `Verificação manual necessária`.

## Registro no histórico

Use **Launch Excel** em segundo plano depois de cada cliente, localize a primeira linha livre da tabela `ExecucoesKpi`, grave os campos abaixo e salve o arquivo. Feche o Excel antes de voltar à sessão virtual.

| Campo | Valor registrado |
| --- | --- |
| `run_id` | identificador único do lote |
| `competencia` | competência no formato `AAAA-MM` |
| `client_id` e `nome_cliente` | valores da linha processada |
| `modo` | `Teste` ou `Lote completo` |
| `inicio` e `fim` | data e hora locais |
| `status` | status final da etapa |
| `assunto` | assunto preenchido na janela de e-mail |
| `detalhe` | mensagem de erro ou observação relevante |
| `evidencia` | caminho do screenshot de falha, quando houver |

## Estrutura recomendada no PAD

Crie um fluxo chamado `KPI Outbound mensal` e separe-o em estes subfluxos:

1. `Ler e validar planilha`
2. `Definir competência e modo`
3. `Validar sessão WMS`
4. `Executar relatório para cliente`
5. `Solicitar exportação por e-mail`
6. `Registrar execução`
7. `Capturar falha e finalizar lote`

Passe o objeto do cliente e a competência aos subfluxos. Mantenha a etapa que clica **Export** em um único subfluxo para que o bloqueio contra reenvio seja auditável.

## Primeiro teste

1. Preencha somente um cliente ativo.
2. Execute em modo `Teste` para o mês anterior.
3. Confirme que o CSV chegou ao e-mail corporativo e que o conteúdo, o nome do anexo e o assunto estão corretos.
4. Confira a linha gravada em `Execucoes`.
5. Somente depois habilite os demais clientes e use `Lote completo`.
