# ⚡ QuizForge • Construtor de Funis de Quiz de Alta Conversão

Um sistema visual, leve e 100% autônomo para criar **quizzes focados em vendas e qualificação de leads**, com exportação direta para um único arquivo `.html` pronto para rodar em qualquer lugar.

---

## 🚀 Como usar agora no seu computador

Você **não precisa instalar nada nem saber programar**:
1. Abra esta pasta (`projeto quiz`).
2. Dê **dois cliques no arquivo `index.html`**.
3. A ferramenta abrirá imediatamente no seu navegador padrão (Google Chrome, Edge, etc.).

---

## 🎯 Principais Recursos Criados

* **Exportação para HTML Único:** O quiz gerado é um arquivo `.html` autônomo. Você pode dar dois cliques para testar, subir na sua hospedagem, no WordPress ou no GitHub Pages.
* **Vídeos do YouTube Adaptáveis:**
  * **Horizontal (16:9):** Formato tradicional de VSL ou apresentação.
  * **Vertical (9:16 Shorts/Reels):** Adaptação perfeita para vídeos gravados no celular no estilo TikTok/Reels/Shorts, sem cortes e sem bordas pretas.
* **Bloco de HTML / Navegador de Produto:** Permite colar código HTML ou embutir um *iFrame* do seu site/loja para que o visitante navegue pelo produto antes de decidir.
* **Botão com Delay Programável:** Defina o tempo em segundos (ex: `10`, `60`, `180` segundos). O botão de compra ou avanço fica oculto e surge com uma animação elegante no momento exato do vídeo.
* **Captura de Leads Integrada:** Coleta Nome, WhatsApp (com DDD) e E-mail antes da apresentação da oferta.
* **Tela de Análise Dinâmica (Fake Loading):** Cria percepção de diagnóstico real ("Analisando suas respostas...").
* **Personalização Total de Design:** Altere cores primárias, fundo, arredondamento de bordas, sombras e larguras sem encostar em código.
* **Gerenciador de Múltiplos Quizzes:** Todos os seus quizzes ficam salvos no seu navegador (`localStorage`). Você pode criar novos, duplicar, editar ou baixar um arquivo de backup (`.json`).

---

## 📊 Como Acompanhar a Retenção de Dados (Métricas)

### Opção 1: Planilha Google (Gratuito e sem complicação)
1. Crie uma nova planilha no [Google Sheets](https://sheets.google.com).
2. Na linha 1, crie as colunas:  
   `Data/Hora | Evento | Quiz | Etapa | Pergunta | Resposta | Pontos | Nome | WhatsApp | Email`
3. No menu da planilha, clique em **Extensões > Apps Script**.
4. Apague o código que estiver lá e cole o código do arquivo `google-sheets-script.js`.
5. Clique no botão azul **Implantar > Nova implantação**.
6. Escolha **App da Web**, e em **"Quem pode acessar"** marque **"Qualquer pessoa"**.
7. Copie a URL gerada e cole no campo **Planilha Google (Apps Script Webhook)** dentro da aba *Métricas & Retenção* do quiz.  
   *Pronto! Cada clique, avanço de etapa e lead capturado cairá instantaneamente na planilha.*

### Opção 2: Meta Pixel (Facebook & Instagram Ads)
* Basta colar o seu **Meta Pixel ID** na aba *Métricas & Retenção*.
* O quiz disparará automaticamente os eventos `Quiz_Iniciado`, `Quiz_Etapa_X`, `Lead` e `Quiz_Chegou_Oferta` para otimização de anúncios e públicos de remarketing.

---

## 🌐 Como colocar a ferramenta no GitHub (GitHub Pages)

Se quiser acessar seu Construtor de qualquer computador ou celular pela internet:
1. Acesse [GitHub.com](https://github.com) e crie um novo repositório (ex: `meu-quiz-builder`).
2. Faça o upload dos 4 arquivos desta pasta:
   * `index.html`
   * `app.js`
   * `template-engine.js`
   * `styles.css`
3. No seu repositório no GitHub, clique em **Settings > Pages**.
4. Em **Branch**, selecione `main` (ou `master`) e clique em **Save**.
5. Em cerca de 1 minuto, o GitHub liberará o link público gratuito (ex: `https://seu-usuario.github.io/meu-quiz-builder`).

---

## 📁 Estrutura dos Arquivos Desta Pasta

* **`index.html`**: A interface visual do Construtor de Quiz.
* **`app.js`**: A inteligência da ferramenta (gerenciamento de múltiplos quizzes, preview interativo e importação/exportação).
* **`template-engine.js`**: O motor que compila e gera o arquivo `.html` final ultrarrápido.
* **`styles.css`**: Estilos visuais do construtor e moldura de celular.
* **`google-sheets-script.js`**: O código pronto para colar no Apps Script da sua Planilha Google.
