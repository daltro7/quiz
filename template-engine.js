/**
 * Gerador de HTML Autônomo para o Quiz de Vendas
 * Produz um único arquivo .html totalmente independente (Zero dependências externas pesadas)
 * Pronto para rodar em qualquer hospedagem, WordPress, GitHub Pages ou abrir localmente.
 */

const QuizTemplateEngine = {
  generate(quiz, initialStep = 0) {
    const theme = quiz.theme || {};
    const tracking = quiz.tracking || {};
    const steps = quiz.steps || [];

    // Formata cores e estilos do tema
    const primaryColor = theme.primaryColor || '#6366f1';
    const primaryHover = theme.primaryHover || '#4f46e5';
    const bgColor = theme.bgColor || '#0f172a';
    const cardBg = theme.cardBg || '#1e293b';
    const textColor = theme.textColor || '#f8fafc';
    const textMuted = theme.textMuted || '#94a3b8';
    const accentColor = theme.accentColor || '#10b981';
    const borderRadius = theme.borderRadius || '16px';
    const borderWidth = theme.borderWidth || '1px';
    const borderColor = theme.borderColor || '#334155';
    const shadowIntensity = theme.shadow || 'medium';

    const shadowStyles = {
      none: 'none',
      subtle: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      medium: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
      intense: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 25px rgba(99, 102, 241, 0.2)',
      glow: `0 0 30px ${primaryColor}40, 0 10px 20px rgba(0,0,0,0.4)`
    };

    const selectedShadow = shadowStyles[shadowIntensity] || shadowStyles.medium;

    // Escapa strings JSON com segurança
    const quizDataJson = JSON.stringify(quiz).replace(/</g, '\\u003c');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${this.escapeHtml(quiz.title || 'Quiz Interativo')}</title>
  <meta name="description" content="${this.escapeHtml(quiz.description || '')}">
  
  <!-- Fontes do Google -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  ${this.generateTrackingHead(tracking)}

  <style>
    :root {
      --primary: ${primaryColor};
      --primary-hover: ${primaryHover};
      --bg: ${bgColor};
      --card-bg: ${cardBg};
      --text: ${textColor};
      --text-muted: ${textMuted};
      --accent: ${accentColor};
      --radius: ${borderRadius};
      --border-w: ${borderWidth};
      --border-c: ${borderColor};
      --shadow: ${selectedShadow};
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 16px;
      line-height: 1.5;
    }

    .quiz-container {
      width: 100%;
      max-width: ${theme.maxWidth || '560px'};
      margin: 20px auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Barra de Progresso */
    .progress-wrapper {
      width: 100%;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
      height: 8px;
      overflow: hidden;
      position: relative;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--primary), var(--accent));
      width: 0%;
      border-radius: 9999px;
      transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .progress-text {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 600;
      padding: 0 4px;
    }

    /* Cartão Principal */
    .quiz-card {
      background: var(--card-bg);
      border-radius: var(--radius);
      border: var(--border-w) solid var(--border-c);
      box-shadow: var(--shadow);
      padding: 28px 24px;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    @media (max-width: 640px) {
      .quiz-card {
        padding: 20px 16px;
      }
    }

    /* Cabeçalho da Etapa */
    .step-header {
      margin-bottom: 20px;
      text-align: center;
    }

    .step-tag {
      display: inline-block;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--primary);
      background: rgba(99, 102, 241, 0.12);
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 12px;
    }

    .step-title {
      font-size: 22px;
      font-weight: 800;
      color: var(--text);
      line-height: 1.3;
      margin-bottom: 8px;
    }

    @media (max-width: 640px) {
      .step-title {
        font-size: 19px;
      }
    }

    .step-subtitle {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    /* Vídeos Responsivos */
    .video-wrapper {
      width: 100%;
      margin: 16px 0;
      border-radius: calc(var(--radius) - 4px);
      overflow: hidden;
      background: #000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .video-wrapper.horizontal {
      position: relative;
      padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
      height: 0;
    }

    .video-wrapper.horizontal iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: 0;
    }

    .video-wrapper.vertical {
      max-width: 320px;
      margin: 16px auto;
      aspect-ratio: 9 / 16;
      height: 568px;
    }

    @media (max-width: 480px) {
      .video-wrapper.vertical {
        max-width: 100%;
        height: 480px;
      }
    }

    .video-wrapper.vertical iframe {
      width: 100%;
      height: 100%;
      border: 0;
    }

    /* Bloco HTML Customizado / Navegador de Produto */
    .custom-html-container {
      margin: 18px 0;
      padding: 14px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: calc(var(--radius) - 6px);
      border: 1px dashed rgba(255, 255, 255, 0.15);
      overflow-x: auto;
    }

    .custom-html-container iframe {
      width: 100%;
      min-height: 380px;
      border: none;
      border-radius: 8px;
      background: #fff;
    }

    /* Opções de Resposta */
    .options-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 20px;
    }

    .option-btn {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 14px;
      width: 100%;
      padding: 16px 18px;
      background: rgba(255, 255, 255, 0.04);
      border: 1.5px solid rgba(255, 255, 255, 0.08);
      border-radius: calc(var(--radius) - 4px);
      color: var(--text);
      font-size: 15px;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      user-select: none;
    }

    .option-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--primary);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .option-btn:active {
      transform: translateY(0);
    }

    .option-btn.selected {
      background: rgba(99, 102, 241, 0.15);
      border-color: var(--primary);
      box-shadow: 0 0 0 2px var(--primary);
    }

    .option-icon {
      font-size: 20px;
      line-height: 1;
      flex-shrink: 0;
    }

    .option-indicator {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.25);
      margin-left: auto;
      flex-shrink: 0;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .option-btn:hover .option-indicator {
      border-color: var(--primary);
    }

    .option-btn.selected .option-indicator {
      background: var(--primary);
      border-color: var(--primary);
    }

    .option-btn.selected .option-indicator::after {
      content: '';
      width: 6px;
      height: 6px;
      background: #fff;
      border-radius: 50%;
    }

    /* Botão com Delay Programável */
    .delayed-cta-container {
      margin-top: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }

    .cta-btn {
      width: 100%;
      padding: 16px 24px;
      background: linear-gradient(135deg, var(--primary), var(--primary-hover));
      color: #fff;
      font-size: 17px;
      font-weight: 700;
      border: none;
      border-radius: calc(var(--radius) - 2px);
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      text-decoration: none;
      transition: all 0.25s ease;
      animation: pulseAttention 2.5s infinite;
    }

    .cta-btn:hover {
      transform: translateY(-2px) scale(1.01);
      box-shadow: 0 8px 25px rgba(99, 102, 241, 0.6);
    }

    @keyframes pulseAttention {
      0%, 100% {
        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
      }
      50% {
        box-shadow: 0 4px 28px rgba(99, 102, 241, 0.7);
      }
    }

    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: scale(0.92) translateY(12px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .animate-appear {
      animation: fadeInScale 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    /* Formulário de Captura de Lead */
    .lead-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-top: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      text-align: left;
    }

    .form-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
    }

    .form-input {
      width: 100%;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1.5px solid rgba(255, 255, 255, 0.1);
      border-radius: calc(var(--radius) - 6px);
      color: var(--text);
      font-size: 15px;
      font-family: inherit;
      outline: none;
      transition: all 0.2s;
    }

    .form-input:focus {
      border-color: var(--primary);
      background: rgba(255, 255, 255, 0.08);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
    }

    /* Tela de Análise Dinâmica / Fake Loading */
    .analyzing-container {
      text-align: center;
      padding: 40px 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .analyzing-spinner {
      width: 64px;
      height: 64px;
      border: 4px solid rgba(255, 255, 255, 0.1);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .analyzing-steps {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 14px;
      color: var(--text-muted);
    }

    .analyzing-step-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Tela de Oferta / Resultado Final */
    .offer-container {
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding-top: 10px;
    }

    .badge-result {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
      margin: 0 auto;
    }

    .score-badge {
      font-size: 44px;
      font-weight: 800;
      color: var(--text);
      line-height: 1;
      margin: 10px 0;
    }

    .product-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: calc(var(--radius) - 4px);
      padding: 20px;
      margin: 10px 0;
      text-align: left;
    }

    .product-box h4 {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 6px;
      color: var(--text);
    }

    .product-box p {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    /* Botão Voltar */
    .btn-back {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 14px;
      padding: 6px 12px;
      border-radius: 6px;
      transition: color 0.2s;
    }

    .btn-back:hover {
      color: var(--text);
    }

    /* Rodapé */
    .quiz-footer {
      text-align: center;
      font-size: 11px;
      color: var(--text-muted);
      opacity: 0.6;
      margin-top: 8px;
    }
  </style>
</head>
<body>

  <div class="quiz-container">
    <!-- Barra de Progresso Superior -->
    <div id="progress-section">
      <div class="progress-text">
        <span id="step-indicator">Etapa 1 de ${steps.length}</span>
        <span id="progress-percent">0%</span>
      </div>
      <div class="progress-wrapper" style="margin-top: 6px;">
        <div id="progress-bar" class="progress-bar"></div>
      </div>
    </div>

    <!-- Cartão Dinâmico da Etapa -->
    <div id="quiz-card" class="quiz-card">
      <div id="step-content"></div>
      
      <div style="text-align: center;">
        <button id="btn-back" class="btn-back" style="display: none;" onclick="QuizApp.prevStep()">
          ← Voltar à pergunta anterior
        </button>
      </div>
    </div>

    <div class="quiz-footer">
      <span>🔒 Ambiente Seguro • Seus dados estão protegidos</span>
    </div>
  </div>

  <script>
    // ETAPA INICIAL CONFIGURADA PELO EDITOR
    window.QUIZ_INITIAL_STEP = ${initialStep || 0};

    // DADOS DO QUIZ EMBUTIDOS DE FORMA AUTÔNOMA
    const QUIZ_CONFIG = ${quizDataJson};

    const QuizApp = {
      config: QUIZ_CONFIG,
      currentStepIndex: 0,
      userAnswers: {},
      totalScore: 0,
      leadData: {},
      stepStartTime: Date.now(),

      init() {
        const startStep = (typeof window.QUIZ_INITIAL_STEP === 'number' && window.QUIZ_INITIAL_STEP < this.config.steps.length) ? window.QUIZ_INITIAL_STEP : 0;
        this.renderStep(startStep);
        this.trackFunnelEvent('Quiz_Iniciado', { step: startStep });
      },

      renderStep(index) {
        if (index < 0 || index >= this.config.steps.length) return;
        
        this.currentStepIndex = index;
        this.stepStartTime = Date.now();
        const step = this.config.steps[index];
        const container = document.getElementById('step-content');
        const totalSteps = this.config.steps.length;

        // Atualiza Progresso
        const percent = Math.round(((index) / (totalSteps)) * 100);
        document.getElementById('progress-bar').style.width = percent + '%';
        document.getElementById('progress-percent').innerText = percent + '%';
        document.getElementById('step-indicator').innerText = 'Etapa ' + (index + 1) + ' de ' + totalSteps;

        // Controle do botão Voltar
        const backBtn = document.getElementById('btn-back');
        if (backBtn) {
          backBtn.style.display = (index > 0 && step.type !== 'analyzing' && step.type !== 'offer') ? 'inline-flex' : 'none';
        }

        // Esconde progresso na tela final de oferta se configurado
        const progressSection = document.getElementById('progress-section');
        if (step.type === 'offer') {
          progressSection.style.display = 'none';
        } else {
          progressSection.style.display = 'block';
        }

        // Envia evento de retenção/abandono
        this.trackFunnelEvent('Quiz_Etapa_' + (index + 1), {
          stepIndex: index + 1,
          stepTitle: step.title || 'Sem título',
          stepType: step.type
        });

        // Renderiza de acordo com o tipo da etapa
        if (step.type === 'analyzing') {
          this.renderAnalyzingStep(container, step);
        } else if (step.type === 'offer') {
          this.renderOfferStep(container, step);
        } else {
          this.renderQuestionStep(container, step);
        }

        // Rolagem suave para o topo do quiz
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },

      renderQuestionStep(container, step) {
        let html = '';

        // Cabeçalho
        html += '<div class="step-header">';
        if (step.tag) {
          html += '<span class="step-tag">' + this.escape(step.tag) + '</span>';
        }
        html += '<h2 class="step-title">' + this.escape(step.title || '') + '</h2>';
        if (step.subtitle) {
          html += '<p class="step-subtitle">' + this.escape(step.subtitle) + '</p>';
        }
        html += '</div>';

        // Vídeo do YouTube (se houver)
        if (step.youtubeUrl) {
          const videoId = this.extractYouTubeId(step.youtubeUrl);
          const isVertical = step.videoOrientation === 'vertical';
          if (videoId) {
            html += '<div class="video-wrapper ' + (isVertical ? 'vertical' : 'horizontal') + '">';
            html += '<iframe src="https://www.youtube-nocookie.com/embed/' + videoId + '?rel=0&modestbranding=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
            html += '</div>';
          }
        }

        // Bloco HTML Personalizado (Navegador de Produto / Iframe)
        if (step.customHtml && step.customHtml.trim() !== '') {
          html += '<div class="custom-html-container">' + step.customHtml + '</div>';
        }

        // Opções de Resposta
        if (step.options && step.options.length > 0) {
          html += '<div class="options-grid">';
          step.options.forEach((opt, optIdx) => {
            const isSelected = this.userAnswers[step.id] === optIdx;
            html += '<button type="button" class="option-btn ' + (isSelected ? 'selected' : '') + '" onclick="QuizApp.handleOptionSelect(' + optIdx + ')">';
            if (opt.icon) {
              html += '<span class="option-icon">' + opt.icon + '</span>';
            }
            html += '<span style="flex:1;">' + this.escape(opt.text) + '</span>';
            html += '<span class="option-indicator"></span>';
            html += '</button>';
          });
          html += '</div>';
        }

        // Formulário de Captura de Lead (se for etapa de lead)
        if (step.isLeadStep) {
          html += '<form class="lead-form" onsubmit="QuizApp.handleLeadSubmit(event)">';
          html += '<div class="form-group">';
          html += '<label class="form-label">Seu Nome Completo:</label>';
          html += '<input type="text" id="lead-name" class="form-input" placeholder="Como podemos te chamar?" required value="' + (this.leadData.name || '') + '">';
          html += '</div>';

          html += '<div class="form-group">';
          html += '<label class="form-label">Seu WhatsApp com DDD:</label>';
          html += '<input type="tel" id="lead-whatsapp" class="form-input" placeholder="(11) 99999-9999" required value="' + (this.leadData.whatsapp || '') + '">';
          html += '</div>';

          if (step.requireEmail !== false) {
            html += '<div class="form-group">';
            html += '<label class="form-label">Seu Melhor E-mail:</label>';
            html += '<input type="email" id="lead-email" class="form-input" placeholder="seuemail@exemplo.com" required value="' + (this.leadData.email || '') + '">';
            html += '</div>';
          }

          html += '<button type="submit" class="cta-btn" style="margin-top: 10px;">' + (step.submitButtonText || 'Ver Meu Resultado Agora →') + '</button>';
          html += '</form>';
        }

        // Botão com Delay Programável (se configurado)
        if (step.hasDelayButton && !step.isLeadStep) {
          const delaySeconds = parseInt(step.delaySeconds, 10) || 5;
          const buttonText = step.delayButtonText || 'Avançar para a próxima etapa →';
          const buttonUrl = step.delayButtonUrl || '';

          html += '<div id="delayed-btn-box" class="delayed-cta-container" style="display: none;">';
          if (buttonUrl) {
            html += '<a href="' + buttonUrl + '" target="_blank" class="cta-btn animate-appear">' + this.escape(buttonText) + '</a>';
          } else {
            html += '<button type="button" class="cta-btn animate-appear" onclick="QuizApp.nextStep()">' + this.escape(buttonText) + '</button>';
          }
          html += '</div>';
        }

        container.innerHTML = html;

        // Dispara o timer do delay
        if (step.hasDelayButton && !step.isLeadStep) {
          const delayMs = (parseInt(step.delaySeconds, 10) || 5) * 1000;
          setTimeout(() => {
            const btnBox = document.getElementById('delayed-btn-box');
            if (btnBox) {
              btnBox.style.display = 'flex';
            }
          }, delayMs);
        }
      },

      renderAnalyzingStep(container, step) {
        let html = '<div class="analyzing-container">';
        html += '<div class="analyzing-spinner"></div>';
        html += '<h2 class="step-title">' + this.escape(step.title || 'Analisando suas respostas...') + '</h2>';
        html += '<p class="step-subtitle">' + this.escape(step.subtitle || 'Aguarde enquanto calculamos seu diagnóstico personalizado.') + '</p>';
        html += '<div class="analyzing-steps" id="analyzing-status-list">';
        html += '<div class="analyzing-step-item">⏳ Verificando compatibilidade...</div>';
        html += '</div>';
        html += '</div>';

        container.innerHTML = html;

        const duration = (step.durationSeconds || 3.5) * 1000;
        setTimeout(() => {
          this.nextStep();
        }, duration);
      },

      renderOfferStep(container, step) {
        let html = '<div class="offer-container">';
        html += '<div class="badge-result">✨ Diagnóstico Concluído com Sucesso</div>';
        html += '<h2 class="step-title" style="font-size: 26px;">' + this.escape(step.title || 'Seu Plano Personalizado Está Pronto!') + '</h2>';
        
        if (step.showScore) {
          html += '<div class="score-badge">' + this.totalScore + ' <span style="font-size: 20px; color: var(--text-muted); font-weight: 500;">pontos</span></div>';
        }

        if (step.subtitle) {
          html += '<p class="step-subtitle" style="font-size: 16px;">' + this.escape(step.subtitle) + '</p>';
        }

        // Vídeo de Pitch na Oferta (se houver)
        if (step.youtubeUrl) {
          const videoId = this.extractYouTubeId(step.youtubeUrl);
          const isVertical = step.videoOrientation === 'vertical';
          if (videoId) {
            html += '<div class="video-wrapper ' + (isVertical ? 'vertical' : 'horizontal') + '">';
            html += '<iframe src="https://www.youtube-nocookie.com/embed/' + videoId + '?rel=0&modestbranding=1" allowfullscreen></iframe>';
            html += '</div>';
          }
        }

        // Bloco de Produto Recomendado
        if (step.productTitle) {
          html += '<div class="product-box">';
          html += '<h4>' + this.escape(step.productTitle) + '</h4>';
          if (step.productDescription) {
            html += '<p>' + this.escape(step.productDescription) + '</p>';
          }
          if (step.productPrice) {
            html += '<div style="margin-top: 10px; font-size: 22px; font-weight: 800; color: var(--accent);">' + this.escape(step.productPrice) + '</div>';
          }
          html += '</div>';
        }

        // Botão de Compra / CTA Final
        const ctaText = step.ctaText || 'Garantir Minha Oferta Exclusiva Agora →';
        const ctaUrl = step.ctaUrl || '#';
        html += '<div style="margin-top: 10px;">';
        html += '<a href="' + ctaUrl + '" class="cta-btn" style="text-align: center; text-decoration: none;">' + this.escape(ctaText) + '</a>';
        html += '</div>';

        html += '</div>';

        container.innerHTML = html;

        // Dispara evento de conversão na oferta
        this.trackFunnelEvent('Quiz_Chegou_Oferta', {
          score: this.totalScore,
          lead: this.leadData
        });
      },

      handleOptionSelect(optIdx) {
        const step = this.config.steps[this.currentStepIndex];
        const selectedOpt = step.options[optIdx];
        this.userAnswers[step.id] = optIdx;

        // Soma pontuação
        if (selectedOpt.points) {
          this.totalScore += parseInt(selectedOpt.points, 10) || 0;
        }

        // Envia dados do clique
        this.trackFunnelEvent('Quiz_Resposta', {
          stepIndex: this.currentStepIndex + 1,
          question: step.title,
          answer: selectedOpt.text,
          points: selectedOpt.points || 0
        });

        // Lógica condicional: pular para etapa específica se configurado
        if (selectedOpt.targetStepIndex !== undefined && selectedOpt.targetStepIndex !== '') {
          const targetIndex = parseInt(selectedOpt.targetStepIndex, 10);
          setTimeout(() => this.renderStep(targetIndex), 250);
          return;
        }

        // Se não tiver botão com delay bloqueando, avança imediatamente com um micro-delay natural
        if (!step.hasDelayButton) {
          setTimeout(() => this.nextStep(), 250);
        }
      },

      handleLeadSubmit(e) {
        e.preventDefault();
        const nameInput = document.getElementById('lead-name');
        const phoneInput = document.getElementById('lead-whatsapp');
        const emailInput = document.getElementById('lead-email');

        this.leadData = {
          name: nameInput ? nameInput.value.trim() : '',
          whatsapp: phoneInput ? phoneInput.value.trim() : '',
          email: emailInput ? emailInput.value.trim() : ''
        };

        // Dispara evento de Lead capturado
        this.trackFunnelEvent('Lead', {
          name: this.leadData.name,
          whatsapp: this.leadData.whatsapp,
          email: this.leadData.email,
          score: this.totalScore
        });

        this.nextStep();
      },

      nextStep() {
        if (this.currentStepIndex + 1 < this.config.steps.length) {
          this.renderStep(this.currentStepIndex + 1);
        }
      },

      prevStep() {
        if (this.currentStepIndex > 0) {
          this.renderStep(this.currentStepIndex - 1);
        }
      },

      trackFunnelEvent(eventName, eventData) {
        const payload = {
          event: eventName,
          quizId: this.config.id || 'meu-quiz',
          quizTitle: this.config.title || 'Quiz de Vendas',
          timestamp: new Date().toISOString(),
          lead: this.leadData,
          answers: this.userAnswers,
          totalScore: this.totalScore,
          data: eventData
        };

        // 1. Meta Pixel
        if (window.fbq) {
          try {
            if (eventName === 'Lead') {
              fbq('track', 'Lead');
            } else {
              fbq('trackCustom', eventName, eventData);
            }
          } catch(err) { console.error('Pixel error:', err); }
        }

        // 2. Google Analytics 4 (GA4)
        if (window.gtag) {
          try {
            gtag('event', eventName, eventData);
          } catch(err) { console.error('GA4 error:', err); }
        }

        // 3. Webhook (Planilha Google / Apps Script)
        const webhookUrl = this.config.tracking && this.config.tracking.webhookUrl;
        if (webhookUrl && webhookUrl.trim() !== '') {
          try {
            fetch(webhookUrl, {
              method: 'POST',
              mode: 'no-cors', // Evita qualquer bloqueio de CORS com Google Apps Script
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            }).catch(e => console.log('Webhook ping sent'));
          } catch(err) {
            console.log('Webhook ping error');
          }
        }
      },

      extractYouTubeId(url) {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
      },

      escape(str) {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }
    };

    // Inicialização segura que funciona em qualquer navegador e iframe
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => { QuizApp.init(); });
    } else {
      QuizApp.init();
    }
  </script>
</body>
</html>`;
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  generateTrackingHead(tracking) {
    let tags = '';

    // Meta Pixel
    if (tracking.metaPixelId && tracking.metaPixelId.trim() !== '') {
      const pixelId = tracking.metaPixelId.trim();
      tags += `
  <!-- Meta Pixel Code -->
  <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  </script>
  <noscript><img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"
  /></noscript>
  <!-- End Meta Pixel Code -->\n`;
    }

    // Google Analytics 4 (GA4)
    if (tracking.ga4Id && tracking.ga4Id.trim() !== '') {
      const ga4Id = tracking.ga4Id.trim();
      tags += `
  <!-- Google Analytics 4 -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${ga4Id}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${ga4Id}');
  </script>
  <!-- End Google Analytics 4 -->\n`;
    }

    return tags;
  }
};

// Exporta para uso no navegador ou Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuizTemplateEngine;
}
