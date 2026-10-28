/**
 * Gerador de HTML Autônomo para o Quiz de Vendas
 * Arquitetura Moderna por BLOCOS MODULARES por etapa.
 * Produz um único arquivo .html totalmente independente e responsivo.
 */

const QuizTemplateEngine = {
  // Converte etapa antiga para a nova estrutura de blocos se necessário
  normalizeStep(step) {
    if (!step) return { id: 'step_' + Date.now(), title: 'Nova Etapa', blocks: [] };
    if (Array.isArray(step.blocks)) {
      // Garante que cada bloco tenha propriedades consistentes
      step.blocks.forEach(b => {
        if (b.delaySeconds === undefined) b.delaySeconds = 0;
        if (b.type === 'fake_loader') {
          if (!b.duration) b.duration = 4;
          if (!b.messages) b.messages = 'Analisando suas respostas...\nCruzando com nosso banco de dados...\nCalculando seu perfil ideal...\nDiagnóstico pronto!';
          if (b.autoAdvance === undefined) b.autoAdvance = true;
          if (!b.buttonText) b.buttonText = 'Ver Meu Diagnóstico →';
        }
      });
      return step;
    }

    const blocks = [];

    // 1. Bloco de Título / Cabeçalho
    if (step.title || step.subtitle || step.tag) {
      blocks.push({
        id: 'block_' + Date.now() + '_head',
        type: 'heading',
        tag: step.tag || '',
        title: step.title || '',
        subtitle: step.subtitle || '',
        delaySeconds: 0
      });
    }

    // 2. Bloco de Vídeo
    if (step.youtubeUrl) {
      blocks.push({
        id: 'block_' + Date.now() + '_vid',
        type: 'video',
        youtubeUrl: step.youtubeUrl,
        orientation: step.videoOrientation || 'horizontal',
        delaySeconds: 0
      });
    }

    // 3. Bloco HTML Livre / Navegador de Produto
    if (step.customHtml) {
      blocks.push({
        id: 'block_' + Date.now() + '_html',
        type: 'html',
        customHtml: step.customHtml,
        delaySeconds: 0
      });
    }

    // 4. Bloco de Perguntas / Alternativas
    if (step.options && step.options.length > 0) {
      blocks.push({
        id: 'block_' + Date.now() + '_opt',
        type: 'question',
        options: step.options,
        delaySeconds: 0
      });
    }

    // 5. Bloco de Captura de Lead
    if (step.isLeadStep || step.type === 'lead_capture') {
      blocks.push({
        id: 'block_' + Date.now() + '_lead',
        type: 'lead_form',
        requireEmail: step.requireEmail !== false,
        submitButtonText: step.submitButtonText || 'Ver Meu Resultado Agora →',
        delaySeconds: 0
      });
    }

    // 6. Bloco de Botão com Delay Programável
    if (step.hasDelayButton) {
      blocks.push({
        id: 'block_' + Date.now() + '_delay',
        type: 'delay_button',
        delaySeconds: step.delaySeconds || 5,
        text: step.delayButtonText || 'Avançar para a próxima etapa →',
        url: step.delayButtonUrl || ''
      });
    }

    // 7. Bloco de Oferta / Checkout
    if (step.type === 'offer') {
      blocks.push({
        id: 'block_' + Date.now() + '_offer',
        type: 'offer',
        productTitle: step.productTitle || '',
        productPrice: step.productPrice || '',
        productDescription: step.productDescription || '',
        ctaText: step.ctaText || 'Garantir Minha Oferta Exclusiva Agora →',
        ctaUrl: step.ctaUrl || '#',
        delaySeconds: 0
      });
    }

    step.blocks = blocks;
    return step;
  },

  // Cálculo psicológico de progresso da barra
  calculateProgressPercent(stepIndex, totalSteps, theme = {}) {
    if (totalSteps <= 0) return 0;
    const startPercent = Math.max(0, Math.min(95, parseInt(theme.startPercent, 10) || 0));
    if (startPercent <= 0) {
      return Math.min(100, Math.round(((stepIndex + 1) / totalSteps) * 100));
    }
    // Aceleração psicológica: começa em startPercent na primeira pergunta e vai até 100%
    const progressFactor = totalSteps > 1 ? (stepIndex / (totalSteps - 1)) : 1;
    const pct = Math.round(startPercent + ((100 - startPercent) * progressFactor));
    return Math.min(100, Math.max(startPercent, pct));
  },

  // Texto customizado para o indicador de etapas
  getProgressText(stepIndex, totalSteps, theme = {}, currentPercent = 0) {
    const format = theme.progressTextFormat || 'full';
    switch (format) {
      case 'simple':
        return `Etapa ${stepIndex + 1}`;
      case 'percent_only':
        return `${currentPercent}%`;
      case 'none':
        return '';
      case 'full':
      default:
        return `Etapa ${stepIndex + 1} de ${totalSteps}`;
    }
  },

  // Retorna os estilos CSS do tema (global ou com escopo para o preview)
  generateThemeCss(theme = {}, scope = '') {
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
    const rootTarget = scope || ':root';

    return `
    ${rootTarget} {
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

    ${scope ? scope + ' *' : '*'} {
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }

    ${scope ? scope : 'body'} {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }

    ${scope} .quiz-container {
      width: 100%;
      max-width: ${theme.maxWidth || '560px'};
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Barra de Progresso */
    ${scope} .progress-wrapper {
      width: 100%;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
      height: 8px;
      overflow: hidden;
      position: relative;
    }

    ${scope} .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--primary), var(--accent));
      width: 0%;
      border-radius: 9999px;
      transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    ${scope} .progress-text {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 600;
      padding: 0 4px;
    }

    /* Cartão Principal */
    ${scope} .quiz-card {
      background: var(--card-bg);
      border-radius: var(--radius);
      border: var(--border-w) solid var(--border-c);
      box-shadow: var(--shadow);
      padding: 24px 20px;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    /* Cabeçalho da Etapa */
    ${scope} .step-header {
      margin-bottom: 18px;
      text-align: center;
    }

    ${scope} .step-tag {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--primary);
      background: rgba(99, 102, 241, 0.12);
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 10px;
    }

    ${scope} .step-title {
      font-size: 20px;
      font-weight: 800;
      color: var(--text);
      line-height: 1.3;
      margin-bottom: 8px;
    }

    ${scope} .step-subtitle {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    /* Vídeos Responsivos */
    ${scope} .video-wrapper {
      width: 100%;
      margin: 16px 0;
      border-radius: calc(var(--radius) - 4px);
      overflow: hidden;
      background: #000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    ${scope} .video-wrapper.horizontal {
      position: relative;
      padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
      height: 0;
    }

    ${scope} .video-wrapper.horizontal iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: 0;
    }

    ${scope} .video-wrapper.vertical {
      max-width: 280px;
      margin: 16px auto;
      aspect-ratio: 9 / 16;
      height: 480px;
    }

    ${scope} .video-wrapper.vertical iframe {
      width: 100%;
      height: 100%;
      border: 0;
    }

    /* Bloco HTML Customizado */
    ${scope} .custom-html-container {
      margin: 16px 0;
      padding: 12px;
      background: rgba(0, 0, 0, 0.25);
      border-radius: calc(var(--radius) - 6px);
      border: 1px dashed rgba(255, 255, 255, 0.15);
      overflow-x: auto;
    }

    /* Opções de Resposta */
    ${scope} .options-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 16px;
      margin-bottom: 16px;
    }

    ${scope} .option-btn {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 12px;
      width: 100%;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.04);
      border: 1.5px solid rgba(255, 255, 255, 0.08);
      border-radius: calc(var(--radius) - 4px);
      color: var(--text);
      font-size: 14px;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      user-select: none;
    }

    ${scope} .option-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--primary);
      transform: translateY(-1px);
    }

    ${scope} .option-btn.selected {
      background: rgba(99, 102, 241, 0.15);
      border-color: var(--primary);
      box-shadow: 0 0 0 2px var(--primary);
    }

    ${scope} .option-icon {
      font-size: 18px;
      line-height: 1;
      flex-shrink: 0;
    }

    ${scope} .option-indicator {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.25);
      margin-left: auto;
      flex-shrink: 0;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    ${scope} .option-btn.selected .option-indicator {
      background: var(--primary);
      border-color: var(--primary);
    }

    ${scope} .option-btn.selected .option-indicator::after {
      content: '';
      width: 6px;
      height: 6px;
      background: #fff;
      border-radius: 50%;
    }

    /* Botão CTA com Delay / Botão Principal */
    ${scope} .delayed-cta-container {
      margin-top: 16px;
      margin-bottom: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }

    ${scope} .cta-btn {
      width: 100%;
      padding: 15px 20px;
      background: linear-gradient(135deg, var(--primary), var(--primary-hover));
      color: #fff;
      font-size: 15px;
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
    }

    ${scope} .cta-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
    }

    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(8px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    ${scope} .animate-appear {
      animation: fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    /* Bloco de Diagnóstico e Barra de Carregamento Falsa (fake_loader) */
    ${scope} .fake-loader-card {
      text-align: center;
      padding: 32px 18px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius);
      margin: 16px 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    ${scope} .loader-spinner {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      border: 4px solid rgba(255, 255, 255, 0.1);
      border-top-color: var(--primary);
      border-right-color: var(--accent);
      animation: loaderSpin 0.9s linear infinite;
      box-shadow: 0 0 16px rgba(99, 102, 241, 0.25);
    }

    @keyframes loaderSpin {
      to { transform: rotate(360deg); }
    }

    ${scope} .loader-percent {
      font-size: 38px;
      font-weight: 800;
      color: var(--text);
      font-variant-numeric: tabular-nums;
      line-height: 1;
      letter-spacing: -0.02em;
    }

    ${scope} .loader-bar-wrapper {
      width: 100%;
      max-width: 340px;
      height: 10px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
      overflow: hidden;
      position: relative;
    }

    ${scope} .loader-bar-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, var(--primary), var(--accent));
      border-radius: 9999px;
      transition: width 0.08s linear;
    }

    ${scope} .loader-msg {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-muted);
      min-height: 22px;
      transition: opacity 0.2s ease;
    }

    /* Formulário de Lead */
    ${scope} .lead-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 16px;
      margin-bottom: 8px;
    }

    ${scope} .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
      text-align: left;
    }

    ${scope} .form-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
    }

    ${scope} .form-input {
      width: 100%;
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.05);
      border: 1.5px solid rgba(255, 255, 255, 0.1);
      border-radius: calc(var(--radius) - 6px);
      color: var(--text);
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: all 0.2s;
    }

    ${scope} .form-input:focus {
      border-color: var(--primary);
      background: rgba(255, 255, 255, 0.08);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
    }

    /* Tela de Oferta */
    ${scope} .offer-container {
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 6px;
    }

    ${scope} .badge-result {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent);
      padding: 5px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      margin: 0 auto;
    }

    ${scope} .score-badge {
      font-size: 38px;
      font-weight: 800;
      color: var(--text);
      line-height: 1;
      margin: 8px 0;
    }

    ${scope} .product-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: calc(var(--radius) - 4px);
      padding: 16px;
      margin: 8px 0;
      text-align: left;
    }

    ${scope} .product-box h4 {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 4px;
      color: var(--text);
    }

    ${scope} .product-box p {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.4;
    }

    /* Botão Voltar */
    ${scope} .btn-back {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 12px;
      padding: 5px 10px;
      border-radius: 6px;
      transition: color 0.2s;
    }

    ${scope} .btn-back:hover {
      color: var(--text);
    }

    /* Rodapé */
    ${scope} .quiz-footer {
      text-align: center;
      font-size: 11px;
      color: var(--text-muted);
      opacity: 0.6;
      margin-top: 16px;
      padding-bottom: 12px;
    }
    `;
  },

  // Renderiza o HTML da etapa combinando todos os seus BLOCOS
  renderStepContentHtml(step, state = {}, isPreview = false) {
    if (!step) return '';
    step = this.normalizeStep(step);

    const blocks = step.blocks || [];
    if (blocks.length === 0) {
      return `
        <div style="text-align: center; padding: 36px 12px; color: var(--text-muted);">
          <div style="font-size: 36px; margin-bottom: 8px;">🧩</div>
          <h4 style="font-weight: bold; color: var(--text); font-size: 15px; margin-bottom: 4px;">Etapa em branco</h4>
          <p style="font-size: 12px;">Adicione componentes no painel esquerdo para montar esta etapa.</p>
        </div>
      `;
    }

    const clickPrefix = isPreview ? 'App.previewSelectOption' : 'QuizApp.handleOptionSelect';
    const formPrefix = isPreview ? 'App.previewSubmitLead(event)' : 'QuizApp.handleLeadSubmit(event)';
    const nextPrefix = isPreview ? 'App.previewNextStep()' : 'QuizApp.nextStep()';

    let html = '';

    blocks.forEach((block, bIdx) => {
      let blockHtml = '';

      // 1. Bloco de Título / Texto
      if (block.type === 'heading') {
        blockHtml += '<div class="step-header">';
        if (block.tag) {
          blockHtml += '<span class="step-tag">' + this.escapeHtml(block.tag) + '</span>';
        }
        if (block.title) {
          blockHtml += '<h2 class="step-title">' + this.escapeHtml(block.title) + '</h2>';
        }
        if (block.subtitle) {
          blockHtml += '<p class="step-subtitle">' + this.escapeHtml(block.subtitle) + '</p>';
        }
        blockHtml += '</div>';
      }

      // 2. Bloco de Vídeo do YouTube
      else if (block.type === 'video') {
        if (block.youtubeUrl) {
          const videoId = this.extractYouTubeId(block.youtubeUrl);
          const isVertical = block.orientation === 'vertical' || block.videoOrientation === 'vertical';
          if (videoId) {
            blockHtml += '<div class="video-wrapper ' + (isVertical ? 'vertical' : 'horizontal') + '">';
            blockHtml += '<iframe src="https://www.youtube-nocookie.com/embed/' + videoId + '?rel=0&modestbranding=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
            blockHtml += '</div>';
          }
        }
      }

      // 3. Bloco HTML Livre / Navegador de Produto (Iframe)
      else if (block.type === 'html') {
        if (block.customHtml && block.customHtml.trim() !== '') {
          blockHtml += '<div class="custom-html-container">' + block.customHtml + '</div>';
        }
      }

      // 4. Bloco de Perguntas com Alternativas
      else if (block.type === 'question') {
        if (block.options && block.options.length > 0) {
          blockHtml += '<div class="options-grid">';
          block.options.forEach((opt, optIdx) => {
            const isSelected = state.userAnswers && state.userAnswers[step.id] === optIdx;
            blockHtml += '<button type="button" class="option-btn ' + (isSelected ? 'selected' : '') + '" onclick="' + clickPrefix + '(' + optIdx + ')">';
            if (opt.icon) {
              blockHtml += '<span class="option-icon">' + opt.icon + '</span>';
            }
            blockHtml += '<span style="flex:1;">' + this.escapeHtml(opt.text || '') + '</span>';
            blockHtml += '<span class="option-indicator"></span>';
            blockHtml += '</button>';
          });
          blockHtml += '</div>';
        }
      }

      // 5. Bloco de Botão com Ação / Próxima Etapa
      else if (block.type === 'delay_button') {
        const buttonText = block.text || block.delayButtonText || 'Avançar para a próxima etapa →';
        const buttonUrl = block.url || block.delayButtonUrl || '';

        blockHtml += '<div id="delayed-btn-box" class="delayed-cta-container">';
        if (buttonUrl) {
          blockHtml += '<a href="' + buttonUrl + '" target="_blank" class="cta-btn animate-appear link-trackable">' + this.escapeHtml(buttonText) + '</a>';
        } else {
          blockHtml += '<button type="button" class="cta-btn animate-appear" onclick="' + nextPrefix + '">' + this.escapeHtml(buttonText) + '</button>';
        }
        blockHtml += '</div>';
      }

      // 6. Bloco de Captura de Lead
      else if (block.type === 'lead_form') {
        const lead = state.leadData || {};
        blockHtml += '<form class="lead-form" onsubmit="' + formPrefix + '">';
        blockHtml += '<div class="form-group">';
        blockHtml += '<label class="form-label">Seu Nome Completo:</label>';
        blockHtml += '<input type="text" id="lead-name" class="form-input" placeholder="Como podemos te chamar?" required value="' + (lead.name || '') + '">';
        blockHtml += '</div>';

        blockHtml += '<div class="form-group">';
        blockHtml += '<label class="form-label">Seu WhatsApp com DDD:</label>';
        blockHtml += '<input type="tel" id="lead-whatsapp" class="form-input" placeholder="(11) 99999-9999" required value="' + (lead.whatsapp || '') + '">';
        blockHtml += '</div>';

        if (block.requireEmail !== false) {
          blockHtml += '<div class="form-group">';
          blockHtml += '<label class="form-label">Seu Melhor E-mail:</label>';
          blockHtml += '<input type="email" id="lead-email" class="form-input" placeholder="seuemail@exemplo.com" required value="' + (lead.email || '') + '">';
          blockHtml += '</div>';
        }

        blockHtml += '<button type="submit" class="cta-btn" style="margin-top: 8px;">' + this.escapeHtml(block.submitButtonText || 'Ver Meu Resultado Agora →') + '</button>';
        blockHtml += '</form>';
      }

      // 7. Bloco de Oferta / Checkout Final
      else if (block.type === 'offer') {
        blockHtml += '<div class="offer-container">';
        blockHtml += '<div class="badge-result">✨ Diagnóstico Concluído com Sucesso</div>';

        if (block.productTitle) {
          blockHtml += '<div class="product-box">';
          blockHtml += '<h4>' + this.escapeHtml(block.productTitle) + '</h4>';
          if (block.productDescription) {
            blockHtml += '<p>' + this.escapeHtml(block.productDescription) + '</p>';
          }
          if (block.productPrice) {
            blockHtml += '<div style="margin-top: 8px; font-size: 18px; font-weight: 800; color: var(--accent);">' + this.escapeHtml(block.productPrice) + '</div>';
          }
          html += '</div>';
        }

        const ctaText = block.ctaText || 'Garantir Minha Oferta Exclusiva Agora →';
        const ctaUrl = block.ctaUrl || '#';
        blockHtml += '<div style="margin-top: 6px;">';
        blockHtml += '<a href="' + ctaUrl + '" target="_blank" class="cta-btn link-trackable" style="text-align: center; text-decoration: none;">' + this.escapeHtml(ctaText) + '</a>';
        blockHtml += '</div>';
        blockHtml += '</div>';
      }

      // 8. NOVO BLOCO: Barra de Carregamento e Diagnóstico Falso (fake_loader)
      else if (block.type === 'fake_loader') {
        const btnText = block.buttonText || 'Ver Meu Diagnóstico →';
        blockHtml += '<div class="fake-loader-card">';
        blockHtml += '<div class="loader-spinner"></div>';
        blockHtml += '<div id="loader-percent" class="loader-percent">0%</div>';
        blockHtml += '<div class="loader-bar-wrapper">';
        blockHtml += '<div id="loader-bar" class="loader-bar-fill"></div>';
        blockHtml += '</div>';
        blockHtml += '<div id="loader-msg" class="loader-msg">Iniciando análise...</div>';
        blockHtml += '<div id="loader-cta" style="display: none; opacity: 0; width: 100%; margin-top: 8px;">';
        blockHtml += '<button type="button" class="cta-btn animate-appear" onclick="' + nextPrefix + '">' + this.escapeHtml(btnText) + '</button>';
        blockHtml += '</div>';
        blockHtml += '</div>';
      }

      // Aplica suporte universal a Delay Programável
      const delay = parseInt(block.delaySeconds, 10) || 0;
      if (delay > 0) {
        html += '<div id="block-wrap-' + bIdx + '" class="quiz-delayed-block" data-delay="' + delay + '" style="display: none; opacity: 0;">' + blockHtml + '</div>';
      } else {
        html += blockHtml;
      }
    });

    return html;
  },

  // Gera o arquivo .html independente para exportação
  generate(quiz, initialStep = 0) {
    const theme = quiz.theme || {};
    const tracking = quiz.tracking || {};
    const steps = (quiz.steps || []).map(s => this.normalizeStep(s));
    const normalizedQuiz = Object.assign({}, quiz, { steps });
    const quizDataJson = JSON.stringify(normalizedQuiz).replace(/</g, '\\u003c');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${this.escapeHtml(quiz.title || 'Quiz Interativo')}</title>
  <meta name="description" content="${this.escapeHtml(quiz.description || '')}">
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  ${this.generateTrackingHead(tracking)}
  ${tracking.customHeadScripts || ''}

  <style>
    ${this.generateThemeCss(theme, '')}
  </style>
</head>
<body>
  ${tracking.customBodyTopScripts || ''}

  <div class="quiz-container">
    <div id="progress-section" style="${theme.showProgressBar === false ? 'display: none;' : ''}">
      <div class="progress-text">
        <span id="step-indicator"></span>
        <span id="progress-percent">0%</span>
      </div>
      <div class="progress-wrapper" style="margin-top: 6px;">
        <div id="progress-bar" class="progress-bar"></div>
      </div>
    </div>

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
    window.QUIZ_INITIAL_STEP = ${initialStep || 0};
    const QUIZ_CONFIG = ${quizDataJson};

    const QuizApp = {
      config: QUIZ_CONFIG,
      currentStepIndex: 0,
      userAnswers: {},
      totalScore: 0,
      leadData: {},
      stepTimers: [],
      utmParams: {},
      sessionId: null,

      init() {
        this.sessionId = this.getOrCreateSessionId();
        this.utmParams = this.captureUtms();
        const startStep = (typeof window.QUIZ_INITIAL_STEP === 'number' && window.QUIZ_INITIAL_STEP < this.config.steps.length) ? window.QUIZ_INITIAL_STEP : 0;
        this.renderStep(startStep);
      },

      getOrCreateSessionId() {
        try {
          let sid = sessionStorage.getItem('q_session_id');
          if (!sid) {
            sid = 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
            sessionStorage.setItem('q_session_id', sid);
          }
          return sid;
        } catch (e) {
          return 's_' + Date.now().toString(36);
        }
      },

      captureUtms() {
        const utms = {};
        try {
          const params = new URLSearchParams(window.location.search);
          for (const [key, value] of params.entries()) {
            utms[key] = value;
          }
        } catch (e) {}
        return utms;
      },

      appendUtmsToUrl(url) {
        if (!url || url === '#' || url.startsWith('javascript:')) return url;
        if (!this.utmParams || Object.keys(this.utmParams).length === 0) return url;
        try {
          const isFull = url.startsWith('http://') || url.startsWith('https://');
          const base = isFull ? url : window.location.origin + (url.startsWith('/') ? url : '/' + url);
          const u = new URL(base);
          for (const [k, v] of Object.entries(this.utmParams)) {
            if (!u.searchParams.has(k)) {
              u.searchParams.set(k, v);
            }
          }
          return isFull ? u.toString() : (u.pathname + u.search + u.hash);
        } catch (e) {
          const sep = url.includes('?') ? '&' : '?';
          const qs = new URLSearchParams(this.utmParams).toString();
          return qs ? (url + sep + qs) : url;
        }
      },

      applyUtmsToLinks() {
        if (!this.utmParams || Object.keys(this.utmParams).length === 0) return;
        const links = document.querySelectorAll('.link-trackable, .cta-btn[href], .offer-container a[href]');
        links.forEach(link => {
          const href = link.getAttribute('href');
          if (href && href !== '#' && !href.startsWith('javascript:')) {
            link.setAttribute('href', this.appendUtmsToUrl(href));
          }
        });
      },

      calculateProgress(index, totalSteps) {
        if (totalSteps <= 0) return 0;
        const theme = this.config.theme || {};
        const startPercent = Math.max(0, Math.min(95, parseInt(theme.startPercent, 10) || 0));
        if (startPercent <= 0) {
          return Math.min(100, Math.round(((index + 1) / totalSteps) * 100));
        }
        const factor = totalSteps > 1 ? (index / (totalSteps - 1)) : 1;
        const pct = Math.round(startPercent + ((100 - startPercent) * factor));
        return Math.min(100, Math.max(startPercent, pct));
      },

      getProgressText(index, totalSteps, pct) {
        const theme = this.config.theme || {};
        const format = theme.progressTextFormat || 'full';
        switch (format) {
          case 'simple': return 'Etapa ' + (index + 1);
          case 'percent_only': return pct + '%';
          case 'none': return '';
          case 'full':
          default: return 'Etapa ' + (index + 1) + ' de ' + totalSteps;
        }
      },

      renderStep(index) {
        if (index < 0 || index >= this.config.steps.length) return;
        
        // Limpa timers anteriores
        this.clearAllTimers();
        this.currentStepIndex = index;
        const step = this.config.steps[index];
        const container = document.getElementById('step-content');
        const totalSteps = this.config.steps.length;

        // Atualiza Progresso Psicológico
        const percent = this.calculateProgress(index, totalSteps);
        const progressBar = document.getElementById('progress-bar');
        const progressPercent = document.getElementById('progress-percent');
        const stepIndicator = document.getElementById('step-indicator');

        if (progressBar) progressBar.style.width = percent + '%';
        if (progressPercent) progressPercent.innerText = percent + '%';
        if (stepIndicator) stepIndicator.innerText = this.getProgressText(index, totalSteps, percent);

        // Botão voltar visível se não for o primeiro
        const backBtn = document.getElementById('btn-back');
        if (backBtn) {
          backBtn.style.display = index > 0 ? 'inline-flex' : 'none';
        }

        this.trackFunnelEvent('Quiz_Etapa_' + (index + 1), {
          stepIndex: index + 1,
          stepTitle: step.title || 'Sem título'
        });

        // Renderiza conteúdo
        container.innerHTML = this.renderStepHtml(step);

        // Preserva e repassa UTMs para links gerados
        this.applyUtmsToLinks();

        // Inicializa Universal Delays e Fake Loaders
        this.initStepTimers(step);

        window.scrollTo({ top: 0, behavior: 'smooth' });
      },

      clearAllTimers() {
        (this.stepTimers || []).forEach(t => clearTimeout(t));
        this.stepTimers = [];
      },

      initStepTimers(step) {
        const blocks = step.blocks || [];

        // 1. Universal Delay em blocos
        blocks.forEach((b, bIdx) => {
          const delay = parseInt(b.delaySeconds, 10) || 0;
          if (delay > 0) {
            const el = document.getElementById('block-wrap-' + bIdx);
            if (el) {
              const timer = setTimeout(() => {
                el.style.display = 'block';
                setTimeout(() => {
                  el.style.opacity = '1';
                  el.style.transition = 'opacity 0.4s ease';
                }, 20);
              }, delay * 1000);
              this.stepTimers.push(timer);
            }
          }
        });

        // 2. Fake Loader se houver
        const loaderBlock = blocks.find(b => b.type === 'fake_loader');
        if (loaderBlock) {
          this.runFakeLoader(loaderBlock);
        }
      },

      runFakeLoader(block) {
        const durationSec = Math.max(1, parseInt(block.duration, 10) || 4);
        const totalMs = durationSec * 1000;
        const rawMsgs = block.messages || 'Analisando suas respostas...\\nCruzando com nosso banco de dados...\\nCalculando seu perfil ideal...\\nDiagnóstico pronto!';
        const messages = Array.isArray(rawMsgs) ? rawMsgs : rawMsgs.split('\\n').map(m => m.trim()).filter(Boolean);

        const barEl = document.getElementById('loader-bar');
        const pctEl = document.getElementById('loader-percent');
        const msgEl = document.getElementById('loader-msg');
        const ctaEl = document.getElementById('loader-cta');
        const autoAdvance = block.autoAdvance !== false;

        const startTime = performance.now();
        if (msgEl && messages.length > 0) msgEl.innerText = messages[0];

        const tick = () => {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(1, elapsed / totalMs);

          // Curva orgânica com aceleração
          const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
          const currentPct = Math.min(100, Math.round(eased * 100));

          if (barEl) barEl.style.width = currentPct + '%';
          if (pctEl) pctEl.innerText = currentPct + '%';

          if (msgEl && messages.length > 0) {
            const msgIdx = Math.min(messages.length - 1, Math.floor(progress * messages.length));
            if (msgEl.innerText !== messages[msgIdx]) {
              msgEl.style.opacity = '0.3';
              setTimeout(() => {
                msgEl.innerText = messages[msgIdx];
                msgEl.style.opacity = '1';
              }, 100);
            }
          }

          if (progress < 1) {
            const timer = setTimeout(tick, 40);
            this.stepTimers.push(timer);
          } else {
            if (barEl) barEl.style.width = '100%';
            if (pctEl) pctEl.innerText = '100%';
            if (msgEl && messages.length > 0) msgEl.innerText = messages[messages.length - 1];

            if (autoAdvance) {
              const timer = setTimeout(() => { this.nextStep(); }, 400);
              this.stepTimers.push(timer);
            } else if (ctaEl) {
              ctaEl.style.display = 'block';
              setTimeout(() => {
                ctaEl.style.opacity = '1';
                ctaEl.style.transition = 'opacity 0.4s ease';
              }, 20);
            }
          }
        };

        const initialTimer = setTimeout(tick, 50);
        this.stepTimers.push(initialTimer);
      },

      renderStepHtml(step) {
        if (!step) return '';
        const blocks = step.blocks || [];
        if (blocks.length === 0) {
          return '<div style=\"text-align: center; padding: 36px 12px; color: var(--text-muted);\"><div style=\"font-size: 36px; margin-bottom: 8px;\">🧩</div><h4 style=\"font-weight: bold; color: var(--text); font-size: 15px;\">Etapa em branco</h4></div>';
        }

        let html = '';
        blocks.forEach((block, bIdx) => {
          let bHtml = '';

          if (block.type === 'heading') {
            bHtml += '<div class=\"step-header\">';
            if (block.tag) bHtml += '<span class=\"step-tag\">' + this.escapeHtml(block.tag) + '</span>';
            if (block.title) bHtml += '<h2 class=\"step-title\">' + this.escapeHtml(block.title) + '</h2>';
            if (block.subtitle) bHtml += '<p class=\"step-subtitle\">' + this.escapeHtml(block.subtitle) + '</p>';
            bHtml += '</div>';
          }
          else if (block.type === 'video') {
            if (block.youtubeUrl) {
              const videoId = this.extractYouTubeId(block.youtubeUrl);
              const isVertical = block.orientation === 'vertical' || block.videoOrientation === 'vertical';
              if (videoId) {
                bHtml += '<div class=\"video-wrapper ' + (isVertical ? 'vertical' : 'horizontal') + '\">';
                bHtml += '<iframe src=\"https://www.youtube-nocookie.com/embed/' + videoId + '?rel=0&modestbranding=1\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture\" allowfullscreen></iframe>';
                bHtml += '</div>';
              }
            }
          }
          else if (block.type === 'html') {
            if (block.customHtml && block.customHtml.trim() !== '') {
              bHtml += '<div class=\"custom-html-container\">' + block.customHtml + '</div>';
            }
          }
          else if (block.type === 'question') {
            if (block.options && block.options.length > 0) {
              bHtml += '<div class=\"options-grid\">';
              block.options.forEach((opt, optIdx) => {
                const isSelected = this.userAnswers && this.userAnswers[step.id] === optIdx;
                bHtml += '<button type=\"button\" class=\"option-btn ' + (isSelected ? 'selected' : '') + '\" onclick=\"QuizApp.handleOptionSelect(' + optIdx + ')\">';
                if (opt.icon) bHtml += '<span class=\"option-icon\">' + opt.icon + '</span>';
                bHtml += '<span style=\"flex:1;\">' + this.escapeHtml(opt.text || '') + '</span>';
                bHtml += '<span class=\"option-indicator\"></span>';
                bHtml += '</button>';
              });
              bHtml += '</div>';
            }
          }
          else if (block.type === 'delay_button') {
            const btnText = block.text || block.delayButtonText || 'Avançar para a próxima etapa →';
            const btnUrl = block.url || block.delayButtonUrl || '';
            bHtml += '<div id=\"delayed-btn-box\" class=\"delayed-cta-container\">';
            if (btnUrl) {
              bHtml += '<a href=\"' + btnUrl + '\" target=\"_blank\" class=\"cta-btn animate-appear link-trackable\">' + this.escapeHtml(btnText) + '</a>';
            } else {
              bHtml += '<button type=\"button\" class=\"cta-btn animate-appear\" onclick=\"QuizApp.nextStep()\">' + this.escapeHtml(btnText) + '</button>';
            }
            bHtml += '</div>';
          }
          else if (block.type === 'lead_form') {
            const lead = this.leadData || {};
            bHtml += '<form class=\"lead-form\" onsubmit=\"QuizApp.handleLeadSubmit(event)\">';
            bHtml += '<div class=\"form-group\"><label class=\"form-label\">Seu Nome Completo:</label><input type=\"text\" id=\"lead-name\" class=\"form-input\" placeholder=\"Como podemos te chamar?\" required value=\"' + (lead.name || '') + '\"></div>';
            bHtml += '<div class=\"form-group\"><label class=\"form-label\">Seu WhatsApp com DDD:</label><input type=\"tel\" id=\"lead-whatsapp\" class=\"form-input\" placeholder=\"(11) 99999-9999\" required value=\"' + (lead.whatsapp || '') + '\"></div>';
            if (block.requireEmail !== false) {
              bHtml += '<div class=\"form-group\"><label class=\"form-label\">Seu Melhor E-mail:</label><input type=\"email\" id=\"lead-email\" class=\"form-input\" placeholder=\"seuemail@exemplo.com\" required value=\"' + (lead.email || '') + '\"></div>';
            }
            bHtml += '<button type=\"submit\" class=\"cta-btn\" style=\"margin-top: 8px;\">' + this.escapeHtml(block.submitButtonText || 'Ver Meu Resultado Agora →') + '</button>';
            bHtml += '</form>';
          }
          else if (block.type === 'offer') {
            bHtml += '<div class=\"offer-container\"><div class=\"badge-result\">✨ Diagnóstico Concluído com Sucesso</div>';
            if (block.productTitle) {
              bHtml += '<div class=\"product-box\"><h4>' + this.escapeHtml(block.productTitle) + '</h4>';
              if (block.productDescription) bHtml += '<p>' + this.escapeHtml(block.productDescription) + '</p>';
              if (block.productPrice) bHtml += '<div style=\"margin-top: 8px; font-size: 18px; font-weight: 800; color: var(--accent);\">' + this.escapeHtml(block.productPrice) + '</div>';
              bHtml += '</div>';
            }
            const ctaText = block.ctaText || 'Garantir Minha Oferta Exclusiva Agora →';
            const ctaUrl = block.ctaUrl || '#';
            bHtml += '<div style=\"margin-top: 6px;\"><a href=\"' + ctaUrl + '\" target=\"_blank\" class=\"cta-btn link-trackable\" style=\"text-align: center; text-decoration: none;\">' + this.escapeHtml(ctaText) + '</a></div></div>';
          }
          else if (block.type === 'fake_loader') {
            const btnText = block.buttonText || 'Ver Meu Diagnóstico →';
            bHtml += '<div class=\"fake-loader-card\">';
            bHtml += '<div class=\"loader-spinner\"></div>';
            bHtml += '<div id=\"loader-percent\" class=\"loader-percent\">0%</div>';
            bHtml += '<div class=\"loader-bar-wrapper\"><div id=\"loader-bar\" class=\"loader-bar-fill\"></div></div>';
            bHtml += '<div id=\"loader-msg\" class=\"loader-msg\">Iniciando análise...</div>';
            bHtml += '<div id=\"loader-cta\" style=\"display: none; opacity: 0; width: 100%; margin-top: 8px;\">';
            bHtml += '<button type=\"button\" class=\"cta-btn animate-appear\" onclick=\"QuizApp.nextStep()\">' + this.escapeHtml(btnText) + '</button>';
            bHtml += '</div></div>';
          }

          const delay = parseInt(block.delaySeconds, 10) || 0;
          if (delay > 0) {
            html += '<div id=\"block-wrap-' + bIdx + '\" class=\"quiz-delayed-block\" data-delay=\"' + delay + '\" style=\"display: none; opacity: 0;\">' + bHtml + '</div>';
          } else {
            html += bHtml;
          }
        });

        return html;
      },

      extractYouTubeId(url) {
        if (!url) return null;
        const regExp = /^.*(youtu.be\\/|v\\/|u\\/\\w\\/|embed\\/|watch\\?v=|shorts\\/)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
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

      handleOptionSelect(optIdx) {
        const step = this.config.steps[this.currentStepIndex];
        const qBlock = (step.blocks || []).find(b => b.type === 'question');
        if (!qBlock || !qBlock.options || !qBlock.options[optIdx]) return;

        const selectedOpt = qBlock.options[optIdx];
        this.userAnswers[step.id] = optIdx;

        if (selectedOpt.points) {
          this.totalScore += parseInt(selectedOpt.points, 10) || 0;
        }

        this.trackFunnelEvent('Quiz_Resposta', {
          stepIndex: this.currentStepIndex + 1,
          answer: selectedOpt.text,
          points: selectedOpt.points || 0
        });

        const container = document.getElementById('step-content');
        if (container) container.innerHTML = this.renderStepHtml(step);
        this.applyUtmsToLinks();

        if (selectedOpt.targetStepIndex !== undefined && selectedOpt.targetStepIndex !== '') {
          const targetIndex = parseInt(selectedOpt.targetStepIndex, 10);
          setTimeout(() => this.renderStep(targetIndex), 250);
          return;
        }

        const hasDelay = (step.blocks || []).some(b => (parseInt(b.delaySeconds, 10) || 0) > 0);
        if (!hasDelay) {
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
        const utms = this.utmParams || {};
        const srcVal = utms.src || utms.sck || utms.SRC || utms.SCK || '';
        const payload = {
          sessionId: this.sessionId,
          event: eventName,
          quizId: this.config.id || 'meu-quiz',
          quizTitle: this.config.title || 'Quiz de Vendas',
          timestamp: new Date().toISOString(),
          src: srcVal,
          utm_source: utms.utm_source || utms.source || '',
          utm_campaign: utms.utm_campaign || utms.campaign || '',
          utm_medium: utms.utm_medium || utms.medium || '',
          utm_content: utms.utm_content || utms.content || '',
          utm_term: utms.utm_term || utms.term || '',
          utms: utms,
          lead: this.leadData,
          answers: this.userAnswers,
          totalScore: this.totalScore,
          data: eventData
        };

        if (window.fbq) {
          try {
            if (eventName === 'Lead') fbq('track', 'Lead');
            else fbq('trackCustom', eventName, eventData);
          } catch(err) {}
        }

        if (window.gtag) {
          try { gtag('event', eventName, eventData); } catch(err) {}
        }

        const targetUrl = (this.config.tracking && this.config.tracking.sheetUrl) || (this.config.tracking && this.config.tracking.webhookUrl);
        if (targetUrl && targetUrl.trim() !== '') {
          try {
            fetch(targetUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            }).catch(() => {});
          } catch(err) {}
        }
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => { QuizApp.init(); });
    } else {
      QuizApp.init();
    }
  </script>
  ${tracking.customBodyBottomScripts || ''}
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

  extractYouTubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  },

  generateTrackingHead(tracking) {
    let tags = '';

    if (tracking.metaPixelId && tracking.metaPixelId.trim() !== '') {
      const pixelId = tracking.metaPixelId.trim();
      tags += `
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
  /></noscript>\n`;
    }

    if (tracking.ga4Id && tracking.ga4Id.trim() !== '') {
      const ga4Id = tracking.ga4Id.trim();
      tags += `
  <script async src="https://www.googletagmanager.com/gtag/js?id=${ga4Id}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${ga4Id}');
  </script>\n`;
    }

    return tags;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuizTemplateEngine;
}
