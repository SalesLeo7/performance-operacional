# Auditoria técnica do dashboard

Data: 16/09/2026  
Alvo: `dashboard_local/`, `Dashboard Atualizado.html` e `Dashboard Administrativo.html`

## Audit Health Score

| # | Dimensão | Nota | Principal achado |
|---|---|---:|---|
| 1 | Acessibilidade | 2/4 | O menu móvel permanece na ordem de foco quando fechado e seu botão de fechar fica coberto pelo cabeçalho quando aberto. |
| 2 | Performance | 2/4 | O dashboard carrega cerca de 8,9 MB de dados e 12.290 registros de detalhe antes de exibir qualquer página. |
| 3 | Responsividade | 1/4 | A página de Expedição mede 512 px de largura em um viewport de 390 px e cria rolagem horizontal no documento. |
| 4 | Temas | 2/4 | Há tokens centrais, mas muitos valores visuais continuam codificados diretamente e não existe tema escuro. |
| 5 | Integridade da implementação | 1/4 | O artefato do cliente contém dados de todos os clientes e pode habilitar a visão administrativa pelo parâmetro da URL. |
| **Total** |  | **8/20** | **Poor — major overhaul** |

## Veredito de integridade

**Falha.** A interface apresenta um sistema visual coerente e específico para a operação, mas o limite entre conteúdo compartilhável e administrativo não é um limite real de dados. `Dashboard Atualizado.html` incorpora o dataset completo, incluindo `quality`, detalhes e informações de todos os clientes. Em `dashboard_local/app.js:1`, `?mode=admin` tem precedência sobre `window.DASHBOARD_MODE="client"`. Portanto, ocultar a aba administrativa não protege o conteúdo.

O detector determinístico do Impeccable não pôde ser executado porque o release oficial do mecanismo 0.1.5 retornou erro durante o download. Os achados abaixo foram verificados diretamente no código, no DOM, em desktop e nos viewports de 390 × 844 e 1280 × 720.

## Resumo executivo

- Pontuação: **8/20 — Poor**.
- Problemas: **1 P0, 2 P1, 5 P2 e 1 P3**.
- O dashboard não deve ser enviado externamente no formato atual porque o arquivo compartilhável não isola clientes nem dados administrativos.
- A página de Expedição apresenta rolagem horizontal em mobile.
- O menu móvel tem falhas de sobreposição, foco e estado acessível.
- O pacote autônomo é funcional, mas carrega o detalhe completo antes da primeira visualização.

## Achados detalhados

### [P0] O arquivo do cliente não isola dados de clientes ou dados administrativos

- **Local:** `dashboard_local/app.js:1`, `dashboard_local/build_standalone.py:22`, `Dashboard Atualizado.html:59`.
- **Categoria:** Integridade da implementação.
- **Impacto:** um destinatário do arquivo compartilhável pode consultar outros clientes, inspecionar o dataset incorporado e ativar a área administrativa com `?mode=admin`. Isso contradiz a separação entre visão do cliente e visão administrativa e pode expor dados operacionais de terceiros.
- **Recomendação:** gerar um artefato separado por cliente, contendo somente os registros e parâmetros autorizados para esse cliente. Remover a alternância administrativa por query string do arquivo compartilhável e não incorporar `quality`, auditoria, origem ou detalhes de outros clientes.
- **Comando sugerido:** `$impeccable harden Dashboard Atualizado.html`.

### [P1] A página de Expedição cria rolagem horizontal no mobile

- **Local:** `dashboard_local/styles.css:8`, `dashboard_local/styles.css:11`, `dashboard_local/styles.css:14`, `dashboard_local/app.js:209`.
- **Categoria:** Responsividade.
- **Impacto:** em 390 px, o documento chegou a 512 px. Os painéis `Performance Gross x Performance NET` e `Demanda diária e capacidade` ficaram com 498 px, cortando conteúdo e exigindo rolagem lateral.
- **Padrão:** WCAG 1.4.10 Reflow.
- **Recomendação:** aplicar `min-width: 0` aos filhos do grid, limitar o gráfico de capacidade ao contêiner e oferecer uma apresentação móvel que não dependa de 35 colunas simultâneas.
- **Comando sugerido:** `$impeccable adapt dashboard_local mobile`.

### [P1] O menu de filtros móvel não controla foco nem sobreposição

- **Local:** `dashboard_local/index.html:18`, `dashboard_local/index.html:26`, `dashboard_local/styles.css:4`, `dashboard_local/styles.css:11`, `dashboard_local/app.js:338-339`.
- **Categoria:** Acessibilidade e Responsividade.
- **Impacto:** quando fechado, o menu apenas recebe `transform` e seus controles continuam na árvore de acessibilidade e na ordem de foco. Quando aberto, o botão de fechar ocupa a área do cabeçalho e foi coberto pelo botão `Recebimento`. Não há `aria-expanded`, fechamento por `Escape`, backdrop ou retorno explícito do foco.
- **Padrão:** WCAG 2.1.1 Keyboard, 2.4.3 Focus Order e 4.1.2 Name, Role, Value.
- **Recomendação:** implementar o painel como disclosure/dialog acessível, alternar `aria-expanded`, retirar o conteúdo oculto da navegação, gerenciar foco e corrigir a camada do cabeçalho.
- **Comando sugerido:** `$impeccable harden dashboard_local/index.html`.

### [P2] Alvos de toque são menores que 44 × 44 px

- **Local:** `dashboard_local/styles.css:4-5`, `dashboard_local/styles.css:11`.
- **Categoria:** Acessibilidade e Responsividade.
- **Impacto:** o botão do menu mede 31 × 30 px, o botão de fechar 30 × 35 px, as abas móveis têm 28–42 px de largura e outros botões têm 36–38 px de altura. Isso aumenta erros de toque, principalmente em uso operacional no celular.
- **Padrão:** WCAG 2.5.8 Target Size (Minimum) é atendido no limite de 24 px, mas a recomendação de 44 px para toque não é alcançada.
- **Recomendação:** ampliar as áreas clicáveis sem necessariamente aumentar o ícone ou o texto.
- **Comando sugerido:** `$impeccable adapt dashboard_local mobile`.

### [P2] As abas não anunciam corretamente a página ativa

- **Local:** `dashboard_local/app.js:293-296`, `dashboard_local/app.js:333-334`, `dashboard_local/styles.css:12`.
- **Categoria:** Acessibilidade.
- **Impacto:** a seleção é comunicada apenas por classe e cor; não há `aria-current` ou estado equivalente. No mobile, o pseudo-elemento com a abreviação entra no nome acessível, produzindo nomes como `RResumo` e `EXPExpedição`.
- **Padrão:** WCAG 1.3.1 Info and Relationships e 4.1.2 Name, Role, Value.
- **Recomendação:** marcar a página atual semanticamente e manter a abreviação apenas visual, fora do nome acessível.
- **Comando sugerido:** `$impeccable harden dashboard_local/app.js`.

### [P2] A troca de página não move nem anuncia o novo conteúdo

- **Local:** `dashboard_local/index.html:35`, `dashboard_local/app.js:287-297`, `dashboard_local/app.js:334`.
- **Categoria:** Acessibilidade.
- **Impacto:** o conteúdo de `<main>` é substituído por `innerHTML`, mas o foco permanece na aba acionada e nenhuma região viva anuncia o novo título. Usuários de leitor de tela podem não perceber que a página mudou.
- **Padrão:** WCAG 2.4.3 Focus Order e 4.1.3 Status Messages.
- **Recomendação:** após a navegação, focar o título principal ou o `<main>` com rótulo claro e atualizar o estado da aba.
- **Comando sugerido:** `$impeccable harden dashboard_local/app.js`.

### [P2] O carregamento inicial inclui todo o detalhe operacional

- **Local:** `dashboard_local/build_standalone.py:22`, `dashboard_local/data/dashboard_data.json`.
- **Categoria:** Performance.
- **Impacto:** `Dashboard Atualizado.html` mede 8.997.603 bytes; `dashboard_data.json` mede 8.932.041 bytes e contém 12.290 registros de detalhe. O navegador precisa ler e interpretar esse volume mesmo quando o usuário abre apenas o Resumo.
- **Recomendação:** separar resumo e detalhe, carregar detalhes sob demanda e gerar o HTML compartilhável somente com o cliente autorizado. Isso reduz simultaneamente tempo de abertura e exposição de dados.
- **Comando sugerido:** `$impeccable optimize dashboard_local`.

### [P2] Rótulos analíticos ficam pequenos e quebram em excesso

- **Local:** `dashboard_local/styles.css:13-14`, `dashboard_local/app.js:150`.
- **Categoria:** Acessibilidade e Responsividade.
- **Impacto:** a coluna dos rótulos do comparativo possui 40 px e usa fonte de 9 px; `Performance Gross` e `Performance NET` quebram em várias linhas. Na página de Expedição foram encontrados 172 nós de texto visíveis abaixo de 12 px, incluindo datas do gráfico com 8 px.
- **Recomendação:** aumentar a coluna e a tipografia, abreviar apenas quando o significado continuar explícito e reduzir a densidade do gráfico em telas pequenas.
- **Comando sugerido:** `$impeccable typeset dashboard_local`.

### [P3] Não existe alternativa para movimento reduzido

- **Local:** `dashboard_local/styles.css:3`, `dashboard_local/styles.css:9`, `dashboard_local/styles.css:11`.
- **Categoria:** Acessibilidade.
- **Impacto:** spinner, toast e menu lateral usam animação ou transição sem tratamento de `prefers-reduced-motion`. O movimento é leve, mas contínuo durante o carregamento.
- **Recomendação:** manter a mudança de estado e reduzir ou remover somente o movimento não essencial quando a preferência estiver ativa.
- **Comando sugerido:** `$impeccable animate dashboard_local`.

## Padrões sistêmicos

- A versão compartilhável trata ocultação visual como separação de acesso; o limite precisa existir na geração dos dados.
- A responsividade altera o número de colunas, mas não limita o tamanho mínimo dos componentes densos.
- Estados de navegação e painéis móveis são controlados por classes visuais sem estados ARIA equivalentes.
- O sistema possui tokens principais em `:root`, porém ainda mistura tokens e cores literais; não há variante escura.

## Pontos positivos

- A interface possui landmarks de `header`, `nav`, `aside` e `main`, além de labels reais para os filtros.
- O toast usa `role="status"` e `aria-live="polite"`.
- Os dados dinâmicos mais sensíveis à injeção são passados por `htmlEscape` antes de entrar no HTML.
- Os gráficos exibem também valores e textos, sem depender exclusivamente de cor.
- Os contrastes principais verificados atendem 4,5:1: `#667085` sobre branco = 4,97:1; branco sobre `#004b93` = 8,65:1; branco sobre `#002664` = 14,37:1.
- Não foram registrados erros ou avisos no console durante a navegação testada.
- Existem breakpoints para desktop, tablet e mobile, e a estrutura visual em desktop é consistente e fácil de escanear.

## Ações recomendadas

1. **[P0] `$impeccable harden Dashboard Atualizado.html`**: separar os dados por cliente e remover qualquer caminho para a visão administrativa no artefato compartilhável.
2. **[P1] `$impeccable adapt dashboard_local mobile`**: eliminar a rolagem horizontal e corrigir o painel de filtros móvel.
3. **[P1] `$impeccable harden dashboard_local`**: implementar estados ARIA, foco, fechamento por teclado e anúncio das trocas de página.
4. **[P2] `$impeccable optimize dashboard_local`**: carregar detalhes sob demanda e reduzir o pacote inicial.
5. **[P2] `$impeccable typeset dashboard_local`**: corrigir rótulos de 8–10 px e quebras excessivas no comparativo.
6. **[P3] `$impeccable animate dashboard_local`**: adicionar uma alternativa de movimento reduzido.
7. **[P3] `$impeccable polish dashboard_local`**: executar a revisão final depois das correções estruturais.

## Pós-correção — 16/09/2026

As correções prioritárias foram aplicadas e verificadas no navegador local:

- **Isolamento do cliente:** `Dashboard Atualizado.html` agora incorpora somente o cliente definido como `defaultClient` (atualmente GWM), seus indicadores, etapas, detalhes e capacidade; o bloco administrativo `quality` não é incorporado. A URL `?mode=admin` também deixou de ativar a visão administrativa. O artefato compartilhável caiu de aproximadamente 9,0 MB para 1,4 MB.
- **Responsividade:** em viewport de 390 px, o documento passou a medir 375 px de largura, sem overflow horizontal; os painéis se ajustam à coluna disponível.
- **Filtros móveis:** o painel agora usa backdrop, `aria-expanded`, `aria-hidden` e `inert`; o foco vai para fechar ao abrir e retorna ao menu ao fechar. Escape fecha o painel e o botão de fechar permanece na camada superior.
- **Navegação e acessibilidade:** abas anunciam nomes sem abreviações duplicadas, usam `aria-current="page"`, e a troca de página move o foco para o conteúdo principal. Áreas de toque foram ampliadas e `prefers-reduced-motion` foi tratado.
- **Validação:** 13 testes automatizados passaram, `node --check` e `py_compile` passaram, e a navegação desktop/mobile não gerou erros ou avisos no console.

Permanece como melhoria futura o carregamento sob demanda da base de detalhes no artefato administrativo e a revisão de alguns textos analíticos pequenos. O detector oficial do Impeccable continuou indisponível porque o download do engine retornou HTTP 403; a validação acima foi manual e automatizada no app local.

### Correção adicional — publicação/cache

Após a crítica, a inicialização foi endurecida para tolerar shells antigos que ainda não possuem o backdrop do menu, e os assets foram promovidos para `v=6`. O processo de geração foi executado novamente; uma aba nova na raiz `http://127.0.0.1:8766/` carregou o Resumo sem erro, com dados, filtros e navegação disponíveis. A validação automatizada continua com 13 testes passando.

### Correção adicional — gráfico mobile

O gráfico de demanda/capacidade passou a permitir rolagem horizontal interna, recebeu uma descrição acessível e deixou de cortar as 35 colunas em telas estreitas. Em viewport de 390 px, o documento permaneceu com 375 px de largura, enquanto o gráfico expôs `scrollWidth` interno de 458 px e rótulo explicando como consultar todos os dias. O desktop continua sem overflow externo.

### Correção adicional — explicação dos indicadores

A página de Expedição passou a oferecer o disclosure “Como interpretar Gross, NET, capacidade e cobertura” imediatamente após os KPIs. O conteúdo explica o denominador do Gross, a exclusão por capacidade no NET, o papel do limite diário e o tratamento de registros sem informação. Em mobile, o disclosure reorganiza os quatro conceitos em uma coluna sem overflow.

### Correção adicional — resumo acionável

O botão do Resumo agora mostra a quantidade de linhas em atraso da operação crítica e abre a página de Detalhes já filtrada para essa operação e para `Delay`. No cenário validado, o botão exibiu “Ver 2.656 linhas em atraso” e abriu Detalhes com Operação = Recebimento e os processos correspondentes prontos para análise.

### Correção adicional — atualização de dados

O botão lateral foi renomeado para “Como atualizar os dados”, ganhou tooltip explicativo e passou a informar o nome correto do comando (`Atualizar Dashboard Atualizado.cmd`). A mensagem de erro de carregamento também foi corrigida para apontar o mesmo comando. A ação foi validada no navegador e o toast exibiu a instrução completa.

### Alteração de escopo — filtro de clientes

Por decisão do usuário, o artefato compartilhável voltou a incluir todos os clientes no filtro, mantendo a visão administrativa separada e sem o bloco interno `quality`. O `defaultClient` continua definindo apenas o cliente inicial exibido.

### Correção adicional — meta de Outbound

A aba Expedição passou a exibir o KPI `Meta SLA` junto de Performance Gross, Performance NET, capacidade e demais indicadores. O valor validado para GWM foi 95,0%, com alerta a partir de 90,0%; o layout responsivo mantém duas colunas no mobile.

### Evolução de período — mês, semana e dia

O filtro lateral agora permite selecionar `Mês`, `Semana` ou `Dia`, usando `CREATION_DATE` como referência. Semana usa segunda a domingo; cards, tabela de detalhes e capacidade seguem o intervalo. Para granularidades menores, etapas sem base diária aparecem como sem dados, evitando reutilizar silenciosamente o último mês.

### Evolução de período — intervalo com calendário e meta visual

O filtro foi simplificado para um único intervalo, com calendários independentes de início e fim. Todos os cards, tabela e gráficos usam esse mesmo intervalo. A visão geral também marca a meta SLA diretamente na barra de cada operação, facilitando a leitura do resultado contra o objetivo configurado.

### Evolução de período — granularidade restaurada

As granularidades `Mês`, `Semana`, `Dia` e `Intervalo` foram restauradas. Mês oferece janelas de 1, 3, 6 e 12 meses ou todo o histórico; Semana e Dia usam uma data de referência; Intervalo usa calendários `De` e `Até`. Os cards permanecem consolidados pelo filtro, enquanto os gráficos preservam a série: mês a mês para janelas mensais e intervalos entre meses, e dia a dia para recortes curtos. Demanda, capacidade e tempos entre etapas também seguem o mesmo período. Em validação, “Todos os meses” exibiu dez pontos mensais e o intervalo de junho a agosto exibiu três pontos, sem overflow externo em viewport mobile.
