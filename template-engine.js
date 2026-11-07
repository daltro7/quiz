/**
 * Gerador de HTML Autônomo para o Quiz de Vendas
 * Arquitetura Moderna por BLOCOS MODULARES por etapa.
 * Produz um único arquivo .html totalmente independente e responsivo.
 */

const QuizTemplateEngine = {
  // Retorna o HTML customizado sem alterações
  sanitizeCustomHtml(rawHtml) {
    return rawHtml;
  },

  // Converte etapa antiga para a nova estrutura de blocos se necessário
  normalizeStep(step) {
    if (!step) return { id: 'step_' + Date.now(), title: 'Nova Etapa', blocks: [] };
    if (Array.isArray(step.blocks)) {
      // Garante que cada bloco tenha propriedades consistentes
      step.blocks.forEach(b => {
        if (b.delaySeconds === undefined) b.delaySeconds = 0;
        if (b.type === 'image') {
          if (!b.titleSize) b.titleSize = 'md';
        }
        if (b.type === 'offer' || b.type === 'pricing_table') {
          b.type = 'offer';
          if (!b.plans && !b.productTitle) {
            b.plans = this.getDefaultPricingPlans();
          }
        }
        if (b.type === 'guarantee') {
          if (!b.tag) b.tag = 'RISCO ZERO';
          if (!b.title) b.title = 'GARANTIA de 30 DIAS.';
          if (!b.description) {
            b.description = 'Você tem **30 dias de garantia incondicional**.\nSe por qualquer motivo você não gostar ou achar que não é para você, basta solicitar o reembolso e **devolveremos 100% do seu dinheiro**, sem burocracia e sem ressentimentos.';
          }
        }
        if (b.type === 'fake_loader') {
          if (!b.duration) b.duration = 4;
          if (!b.messages) b.messages = 'Analisando suas respostas...\nCruzando com nosso banco de dados...\nCalculando seu perfil ideal...\nDiagnóstico pronto!';
          if (b.autoAdvance === undefined) b.autoAdvance = true;
          if (!b.buttonText) b.buttonText = 'Ver Meu Diagnóstico →';
        }
        if (b.type === 'reviews') {
          if (!b.headerTitle && b.headerTitle !== '') b.headerTitle = 'O que nossos clientes dizem';
          if (b.showRatingSummary === undefined) b.showRatingSummary = true;
          if (!b.ratingSummary) b.ratingSummary = '4.9 de 5 baseado em 1.480 avaliações';
          if (!Array.isArray(b.items) || b.items.length === 0) {
            b.items = this.getDefaultReviewItems();
          }
        }
        if (b.type === 'faq') {
          if (!b.title && b.title !== '') b.title = 'Perguntas Frequentes';
          if (!b.subtitle && b.subtitle !== '') b.subtitle = 'Tire suas dúvidas antes de garantir seu acesso';
          if (!Array.isArray(b.items) || b.items.length === 0) {
            b.items = this.getDefaultFaqItems();
          }
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

  getDefaultPricingPlans() {
    return [
      {
        id: 'plan_1',
        title: 'MENSAL',
        anchorPrice: 'De R$ 59,90',
        currency: 'R$',
        priceMain: '39',
        priceCents: ',90',
        periodSub: '1 mês de acesso',
        features: [
          'Todos os canais liberados',
          'Qualidade Full HD e 4K',
          'Suporte prioritário via WhatsApp'
        ],
        bonus: null,
        ctaText: 'Quero Este Plano',
        ctaUrl: '#',
        featured: false,
        featuredBadge: ''
      },
      {
        id: 'plan_2',
        title: '3 MESES',
        anchorPrice: 'De R$ 119,90',
        currency: 'R$',
        priceMain: '67',
        priceCents: ',90',
        periodSub: '3 meses de acesso (R$ 22,63/mês)',
        features: [
          'Todos os canais liberados',
          'Qualidade Full HD e 4K',
          'Suporte prioritário via WhatsApp',
          'Acesso simultâneo em 2 telas'
        ],
        bonus: {
          title: '🎬 App CineFree',
          tag: 'Grátis',
          desc: 'Acesso liberado a filmes e séries de streaming'
        },
        ctaText: 'Quero Este Plano',
        ctaUrl: '#',
        featured: true,
        featuredBadge: '⭐ MELHOR CUSTO-BENEFÍCIO'
      },
      {
        id: 'plan_3',
        title: 'ANUAL',
        anchorPrice: 'De R$ 299,90',
        currency: 'R$',
        priceMain: '147',
        priceCents: ',90',
        periodSub: '1 ano de acesso (R$ 12,25/mês)',
        features: [
          'Todos os canais liberados',
          'Qualidade Full HD e 4K',
          'Suporte VIP 24h via WhatsApp',
          'Acesso simultâneo em 4 telas'
        ],
        bonus: {
          title: '🎬 App CineFree VIP',
          tag: 'Grátis',
          desc: 'Acesso vitalício a filmes, séries e lançamentos'
        },
        ctaText: 'Quero Este Plano',
        ctaUrl: '#',
        featured: false,
        featuredBadge: ''
      }
    ];
  },

  getGuaranteeSealSvg() {
    return `<svg class="guarantee-seal-img" viewBox="0 0 160 160" width="140" height="140" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="qfGoldRing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="30%" stop-color="#f59e0b"/>
      <stop offset="70%" stop-color="#b45309"/>
      <stop offset="100%" stop-color="#fef08a"/>
    </linearGradient>
    <linearGradient id="qfRibbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#dc2626"/>
      <stop offset="50%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#b91c1c"/>
    </linearGradient>
    <filter id="qfSealShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#f59e0b" flood-opacity="0.35"/>
    </filter>
  </defs>
  <g filter="url(#qfSealShadow)">
    <circle cx="80" cy="74" r="66" fill="url(#qfGoldRing)"/>
    <circle cx="80" cy="74" r="60" fill="#0b1120" stroke="url(#qfGoldRing)" stroke-width="2"/>
    <circle cx="80" cy="74" r="54" fill="none" stroke="url(#qfGoldRing)" stroke-width="1.5" stroke-dasharray="3,2"/>
    <g fill="#fef08a" transform="translate(48, 32) scale(0.65)">
      <polygon points="10,1 12,7 18,7 13,11 15,17 10,13 5,17 7,11 2,7 8,7"/>
      <polygon points="28,1 30,7 36,7 31,11 33,17 28,13 23,17 25,11 20,7 26,7"/>
      <polygon points="46,1 48,7 54,7 49,11 51,17 46,13 41,17 43,11 38,7 44,7"/>
      <polygon points="64,1 66,7 72,7 67,11 69,17 64,13 59,17 61,11 56,7 62,7"/>
      <polygon points="82,1 84,7 90,7 85,11 87,17 82,13 77,17 79,11 74,7 80,7"/>
    </g>
    <text x="80" y="66" font-family="Plus Jakarta Sans, sans-serif" font-weight="900" font-size="20" fill="url(#qfGoldRing)" text-anchor="middle" letter-spacing="1">100%</text>
    <text x="80" y="80" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="9" fill="#f8fafc" text-anchor="middle" letter-spacing="2">GARANTIA</text>
    <text x="80" y="91" font-family="Plus Jakarta Sans, sans-serif" font-weight="700" font-size="7.5" fill="#fef08a" text-anchor="middle" letter-spacing="1.5">DE SATISFAÇÃO</text>
  </g>
  <g>
    <path d="M 22 124 L 38 108 L 38 128 Z" fill="#991b1b"/>
    <path d="M 138 124 L 122 108 L 122 128 Z" fill="#991b1b"/>
    <path d="M 28 112 L 18 120 L 28 132 L 38 126 L 38 114 Z" fill="#b91c1c"/>
    <path d="M 132 112 L 142 120 L 132 132 L 122 126 L 122 114 Z" fill="#b91c1c"/>
    <rect x="30" y="104" width="100" height="24" rx="4" fill="url(#qfRibbonGrad)" stroke="#fef08a" stroke-width="1"/>
    <text x="80" y="120" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="9.5" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">RISCO ZERO</text>
  </g>
</svg>`;
  },

  formatMarkdown(str) {
    if (!str || typeof str !== 'string') return '';
    let out = this.escapeHtml(str);
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    return out;
  },

  // Interpolação Dinâmica de Respostas e Dados (Forma 1: Tags/Variáveis em tempo real)
  interpolateDynamicText(text, state = {}, steps = [], isPreview = false) {
    if (!text || typeof text !== 'string') return text || '';
    if (!steps || steps.length === 0) {
      if (state && Array.isArray(state.steps)) steps = state.steps;
      else if (typeof window !== 'undefined' && window.App && window.App.currentQuiz && Array.isArray(window.App.currentQuiz.steps)) {
        steps = window.App.currentQuiz.steps;
      }
    }
    steps = steps || [];

    return text.replace(/\{([a-zA-Z0-9_]+)(?:\|([^}]+))?\}/g, (match, rawTag, fallback) => {
      const tag = rawTag.toLowerCase();
      const defaultVal = fallback !== undefined ? fallback : '';
      const lead = (state && state.leadData) || {};

      // 1. Tags de Lead
      if (tag === 'nome' || tag === 'name') {
        return lead.name || defaultVal || (isPreview ? '[Nome do Cliente]' : '');
      }
      if (tag === 'primeiro_nome' || tag === 'first_name') {
        const pName = lead.name ? lead.name.trim().split(' ')[0] : '';
        return pName || defaultVal || (isPreview ? '[Nome]' : '');
      }
      if (tag === 'whatsapp' || tag === 'telefone' || tag === 'phone') {
        return lead.whatsapp || defaultVal || (isPreview ? '[WhatsApp]' : '');
      }
      if (tag === 'email' || tag === 'e-mail') {
        return lead.email || defaultVal || (isPreview ? '[E-mail]' : '');
      }

      // 2. Tags de Pontuação / Score
      if (tag === 'score' || tag === 'pontos') {
        return (state && state.totalScore !== undefined && state.totalScore !== null) ? state.totalScore : (defaultVal || 0);
      }

      // 3. Tags de Resposta e Pergunta: {resposta_1}, {resposta_etapa_1}, {pergunta_1}, etc.
      const respMatch = tag.match(/^(resposta|resp|pergunta|perg)(?:_etapa)?_(\d+)$/);
      if (respMatch) {
        const type = respMatch[1];
        const num = parseInt(respMatch[2], 10);
        if (isNaN(num) || num <= 0) return match;

        let targetStep = steps[num - 1];
        const questionSteps = steps.filter(s => (s.blocks || []).some(b => b.type === 'question'));

        if (!targetStep || !(targetStep.blocks || []).some(b => b.type === 'question')) {
          if (questionSteps[num - 1]) {
            targetStep = questionSteps[num - 1];
          }
        }

        if (!targetStep) {
          return defaultVal || (isPreview ? `[Etapa ${num}]` : '');
        }

        const qBlock = (targetStep.blocks || []).find(b => b.type === 'question');
        const hBlock = (targetStep.blocks || []).find(b => b.type === 'heading');

        if (type.startsWith('perg')) {
          return (hBlock && (hBlock.title || hBlock.tag)) || targetStep.title || (`Pergunta ${num}`);
        }

        const userAnswers = (state && state.userAnswers) || {};
        const customAnswers = (state && state.customAnswers) || {};
        const optIdx = userAnswers[targetStep.id];
        const customVal = customAnswers[targetStep.id];

        if (optIdx !== undefined && qBlock && qBlock.options && qBlock.options[optIdx]) {
          const opt = qBlock.options[optIdx];
          if (customVal && opt.allowCustomText) {
            return customVal;
          }
          return opt.text || '';
        }

        if (defaultVal) return defaultVal;
        if (isPreview) {
          return `[Resposta da Etapa ${num}]`;
        }
        return '';
      }

      return match;
    });
  },

  renderOfferBlockHtml(block, isPreview = false, state = {}, steps = []) {
    if (block.plans && Array.isArray(block.plans) && block.plans.length > 0) {
      let gridHtml = '<div class="pricing-plans-grid">';
      block.plans.forEach(plan => {
        const isFeatured = plan.featured === true;
        const featuredClass = isFeatured ? 'featured' : '';
        const badgeText = this.interpolateDynamicText(plan.featuredBadge || (isFeatured ? '⭐ MELHOR CUSTO-BENEFÍCIO' : ''), state, steps, isPreview);
        const anchorPrice = this.interpolateDynamicText(plan.anchorPrice || '', state, steps, isPreview);
        const currency = plan.currency || 'R$';
        const priceMain = this.interpolateDynamicText(plan.priceMain || '', state, steps, isPreview);
        const priceCents = this.interpolateDynamicText(plan.priceCents || '', state, steps, isPreview);
        const periodSub = this.interpolateDynamicText(plan.periodSub || '', state, steps, isPreview);
        const ctaText = this.interpolateDynamicText(plan.ctaText || 'Quero Este Plano', state, steps, isPreview);
        const ctaUrl = plan.ctaUrl || '#';
        const rawFeatures = Array.isArray(plan.features) ? plan.features : (plan.features ? String(plan.features).split('\n') : []);
        const features = rawFeatures.map(f => f.trim()).filter(Boolean);

        gridHtml += `<div class="pricing-plan-card ${featuredClass}">`;
        
        if (isFeatured && badgeText) {
          gridHtml += `<div class="plan-badge-ribbon">${this.escapeHtml(badgeText)}</div>`;
        }

        gridHtml += `<div class="plan-title">${this.escapeHtml(this.interpolateDynamicText(plan.title || 'PLANO', state, steps, isPreview))}</div>`;

        if (anchorPrice) {
          gridHtml += `<div class="plan-anchor-price">${this.escapeHtml(anchorPrice)}</div>`;
        }

        if (priceMain || priceCents) {
          gridHtml += `<div class="plan-price-wrapper">`;
          if (currency) gridHtml += `<span class="plan-currency">${this.escapeHtml(currency)}</span>`;
          gridHtml += `<span class="plan-val-main">${this.escapeHtml(priceMain)}</span>`;
          if (priceCents) gridHtml += `<span class="plan-cents">${this.escapeHtml(priceCents)}</span>`;
          gridHtml += `</div>`;
        }

        if (periodSub) {
          gridHtml += `<div class="plan-period-sub">${this.escapeHtml(periodSub)}</div>`;
        }

        gridHtml += `<div class="plan-divider"></div>`;

        if (features.length > 0) {
          gridHtml += `<ul class="plan-features-list">`;
          features.forEach(feat => {
            const interpFeat = this.interpolateDynamicText(feat, state, steps, isPreview);
            gridHtml += `<li class="plan-feature-item">`;
            gridHtml += `<svg class="plan-check-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`;
            gridHtml += `<span>${this.formatMarkdown(interpFeat)}</span>`;
            gridHtml += `</li>`;
          });
          gridHtml += `</ul>`;
        }

        if (plan.bonus && (plan.bonus.title || plan.bonus.desc)) {
          const bTitle = this.interpolateDynamicText(plan.bonus.title || '', state, steps, isPreview);
          const bDesc = this.interpolateDynamicText(plan.bonus.desc || '', state, steps, isPreview);
          const bTag = this.interpolateDynamicText(plan.bonus.tag || '', state, steps, isPreview);
          gridHtml += `<div class="plan-bonus-box">`;
          gridHtml += `<div class="plan-bonus-header">`;
          gridHtml += `<span class="plan-bonus-title">${this.escapeHtml(bTitle)}</span>`;
          if (bTag) {
            gridHtml += `<span class="plan-bonus-tag">${this.escapeHtml(bTag)}</span>`;
          }
          gridHtml += `</div>`;
          if (bDesc) {
            gridHtml += `<div class="plan-bonus-desc">${this.escapeHtml(bDesc)}</div>`;
          }
          gridHtml += `</div>`;
        }

        gridHtml += `<a href="${this.escapeHtml(ctaUrl)}" target="_blank" class="plan-cta-btn cta-btn link-trackable">${this.escapeHtml(ctaText)}</a>`;

        gridHtml += `</div>`;
      });
      gridHtml += '</div>';
      return gridHtml;
    }

    // Fallback: Oferta Simples clássica
    const btnSize = block.buttonSize || 'featured';
    const customColor = block.buttonColor ? `style="background: ${block.buttonColor}; border-color: ${block.buttonColor};"` : '';
    const sizeClass = `btn-size-${btnSize}`;

    let blockHtml = '<div class="offer-container">';
    blockHtml += '<div class="badge-result">✨ Diagnóstico Concluído com Sucesso</div>';

    if (block.imageUrl) {
      blockHtml += `<div class="quiz-image-card align-center quiz-image-medium"><img src="${this.escapeHtml(block.imageUrl)}" alt="${this.escapeHtml(block.productTitle || '')}"></div>`;
    }

    if (block.productTitle) {
      const pTitle = this.interpolateDynamicText(block.productTitle, state, steps, isPreview);
      const pDesc = this.interpolateDynamicText(block.productDescription || '', state, steps, isPreview);
      const pPrice = this.interpolateDynamicText(block.productPrice || '', state, steps, isPreview);
      blockHtml += '<div class="product-box">';
      blockHtml += '<h4>' + this.formatMarkdown(pTitle) + '</h4>';
      if (pDesc) {
        blockHtml += '<p>' + this.formatMarkdown(pDesc) + '</p>';
      }
      if (pPrice) {
        blockHtml += '<div style="margin-top: 8px; font-size: 18px; font-weight: 800; color: var(--accent);">' + this.escapeHtml(pPrice) + '</div>';
      }
      blockHtml += '</div>';
    }

    const ctaText = this.interpolateDynamicText(block.ctaText || 'Garantir Minha Oferta Exclusiva Agora →', state, steps, isPreview);
    const ctaUrl = block.ctaUrl || '#';
    blockHtml += '<div style="margin-top: 6px;">';
    blockHtml += '<a href="' + this.escapeHtml(ctaUrl) + '" target="_blank" class="cta-btn link-trackable ' + sizeClass + '" ' + customColor + ' style="text-align: center; text-decoration: none;">' + this.escapeHtml(ctaText) + '</a>';
    blockHtml += '</div>';
    blockHtml += '</div>';
    return blockHtml;
  },

  renderGuaranteeBlockHtml(block, state = {}, steps = [], isPreview = false) {
    const tag = this.interpolateDynamicText(block.tag || 'RISCO ZERO', state, steps, isPreview);
    const title = this.interpolateDynamicText(block.title || 'GARANTIA de 30 DIAS.', state, steps, isPreview);
    const desc = this.interpolateDynamicText(block.description || '', state, steps, isPreview);
    const sealHtml = block.customSealUrl
      ? `<img src="${this.escapeHtml(block.customSealUrl)}" alt="Selo de Garantia" class="guarantee-seal-img" loading="lazy">`
      : this.getGuaranteeSealSvg();

    let blockHtml = `<div class="guarantee-card">`;
    if (tag) {
      blockHtml += `<div class="guarantee-tag">${this.escapeHtml(tag)}</div>`;
    }
    blockHtml += `<div class="guarantee-seal-wrap">${sealHtml}</div>`;
    if (title) {
      blockHtml += `<h3 class="guarantee-title">${this.escapeHtml(title)}</h3>`;
    }
    if (desc) {
      blockHtml += `<div class="guarantee-desc">${this.formatMarkdown(desc)}</div>`;
    }
    blockHtml += `</div>`;
    return blockHtml;
  },

  getDefaultReviewItems() {
    return [
      {
        id: 'rev_1',
        name: 'Carlos Mendes',
        role: 'Engenheiro Civil',
        avatarUrl: '',
        stars: 5,
        comment: 'Superou todas as minhas expectativas! Consegui montar o orçamento em menos de 15 minutos e economizei horas de trabalho.',
        timeAgo: 'Postado há 2 dias',
        verified: true
      },
      {
        id: 'rev_2',
        name: 'Mariana Silveira',
        role: 'Arquiteta',
        avatarUrl: '',
        stars: 5,
        comment: 'Didático, direto ao ponto e muito prático. Mudou a forma como apresento orçamentos e propostas para meus clientes.',
        timeAgo: 'Postado há 4 dias',
        verified: true
      },
      {
        id: 'rev_3',
        name: 'Roberto Fontes',
        role: 'Empreiteiro',
        avatarUrl: '',
        stars: 5,
        comment: 'O suporte me atendeu na hora no WhatsApp e o material é completíssimo. Vale cada centavo investido.',
        timeAgo: 'Postado há 1 semana',
        verified: true
      }
    ];
  },

  getDefaultFaqItems() {
    return [
      {
        id: 'faq_1',
        question: 'Como e quando recebo o meu acesso?',
        answer: 'O envio é imediato! Assim que seu pagamento for aprovado, você receberá seus dados de acesso diretamente no seu e-mail e no WhatsApp.'
      },
      {
        id: 'faq_2',
        question: 'Funciona no celular e no computador?',
        answer: 'Sim! Você pode acessar de qualquer celular (Android ou iPhone), tablet ou computador, sem precisar instalar nada pesado.'
      },
      {
        id: 'faq_3',
        question: 'E se eu tiver dúvidas ou precisar de ajuda?',
        answer: 'Você terá acesso ao nosso suporte exclusivo via WhatsApp para tirar qualquer dúvida sempre que precisar.'
      },
      {
        id: 'faq_4',
        question: 'Tenho garantia se eu não gostar?',
        answer: 'Com certeza! Você tem garantia incondicional de 30 dias. Se por qualquer motivo não ficar satisfeito, devolvemos 100% do seu dinheiro sem burocracia.'
      }
    ];
  },

  getInitials(name) {
    if (!name || !name.trim()) return 'CL';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  },

  getAvatarBg(name) {
    const gradients = [
      'linear-gradient(135deg, #6366f1, #8b5cf6)',
      'linear-gradient(135deg, #ec4899, #f43f5e)',
      'linear-gradient(135deg, #10b981, #059669)',
      'linear-gradient(135deg, #f59e0b, #d97706)',
      'linear-gradient(135deg, #06b6d4, #0284c7)',
      'linear-gradient(135deg, #8b5cf6, #d946ef)'
    ];
    let hash = 0;
    const str = name || 'Cliente';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  },

  renderStarsHtml(starsCount = 5) {
    const count = Math.max(1, Math.min(5, parseInt(starsCount, 10) || 5));
    let starsSvg = '';
    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= count;
      starsSvg += `<span class="review-star ${isFilled ? 'star-filled' : 'star-empty'}">★</span>`;
    }
    return `<span class="review-stars-wrap">${starsSvg} <strong class="review-stars-num">${count}.0</strong></span>`;
  },

  renderReviewsBlockHtml(block) {
    const badge = block.headerBadge || '';
    const title = block.headerTitle || '';
    const showSummary = block.showRatingSummary !== false;
    const summary = block.ratingSummary || '4.9 de 5 baseado em clientes satisfeitos';
    const items = (Array.isArray(block.items) && block.items.length > 0)
      ? block.items
      : this.getDefaultReviewItems();

    let blockHtml = '<div class="reviews-block-container">';

    if (badge || title || showSummary) {
      blockHtml += '<div class="reviews-header-summary">';
      if (badge) {
        blockHtml += `<span class="reviews-header-badge">${this.escapeHtml(badge)}</span>`;
      }
      if (title) {
        blockHtml += `<div class="reviews-header-title">${this.escapeHtml(title)}</div>`;
      }
      if (showSummary) {
        blockHtml += `<div class="reviews-header-rating"><span style="color:#f59e0b;">★★★★★</span> <span>${this.escapeHtml(summary)}</span></div>`;
      }
      blockHtml += '</div>';
    }

    blockHtml += '<div class="reviews-list">';
    items.forEach(item => {
      const name = item.name || 'Cliente Verificado';
      const role = item.role || '';
      const stars = parseInt(item.stars, 10) || 5;
      const comment = item.comment || '';
      const timeAgo = item.timeAgo || '';
      const isVerified = item.verified !== false;
      const avatarUrl = item.avatarUrl || '';
      const initials = this.getInitials(name);
      const avatarBg = this.getAvatarBg(name);

      blockHtml += '<div class="review-card">';
      blockHtml += '<div class="review-top-row">';
      blockHtml += '<div class="review-author-wrap">';
      if (avatarUrl && avatarUrl.trim()) {
        blockHtml += `<div class="review-avatar"><img src="${this.escapeHtml(avatarUrl.trim())}" alt="${this.escapeHtml(name)}" loading="lazy"></div>`;
      } else {
        blockHtml += `<div class="review-avatar" style="background:${avatarBg};">${initials}</div>`;
      }
      blockHtml += '<div class="review-author-info">';
      blockHtml += `<div class="review-author-name"><span>${this.escapeHtml(name)}</span> ${isVerified ? '<span class="review-verified-badge" title="Compra Verificada">✓ Verificado</span>' : ''}</div>`;
      if (role) {
        blockHtml += `<div class="review-author-role">${this.escapeHtml(role)}</div>`;
      }
      blockHtml += '</div>';
      blockHtml += '</div>';

      blockHtml += this.renderStarsHtml(stars);
      blockHtml += '</div>';

      if (comment) {
        blockHtml += `<div class="review-text">${this.formatMarkdown(comment)}</div>`;
      }

      if (timeAgo) {
        blockHtml += `<div class="review-footer-row"><span>${this.escapeHtml(timeAgo)}</span> <span style="color:#10b981; font-weight:600;">Avaliação confirmada</span></div>`;
      }

      blockHtml += '</div>';
    });
    blockHtml += '</div>';
    blockHtml += '</div>';

    return blockHtml;
  },

  // 12. SUPER-BLOCO: PÁGINA DE VENDAS COMPLETA (TEMPLATE NETFREE)
  renderSalesPageHtml(block) {
    const teal = block.themeColor || '#00d4aa';
    const brandName = block.brandName || 'NetFree';
    const logoUrl = block.brandLogo || 'https://planetaideias.com.br/wp-content/uploads/2026/03/compacta-logo.png';
    const heroBadge = block.heroBadge || 'Nova tecnologia de conectividade';
    const heroH1 = (block.heroHeadline || 'INTERNET MÓVEL ILIMITADA\\nPor Um Preço Justo!').replace(/\\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<em>$1</em>');
    const heroSub = (block.heroSub || '').replace(/\\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    const vslUrl = block.vslVideoUrl || 'https://player.vimeo.com/video/1173821519';
    const heroCta = block.heroCtaText || 'VER OS PLANOS DE ACESSO';
    const plans = block.plans || [];

    // Helper para gerar o iframe de vídeo compatível com Vimeo, YouTube e MP4
    const buildVideoEmbed = (url, title = 'Vídeo') => {
      if (!url) return '';
      const clean = url.trim();
      if (clean.includes('vimeo.com')) {
        let vId = clean;
        if (!clean.includes('/video/')) {
          const match = clean.match(/vimeo\.com\/(\d+)/);
          if (match && match[1]) vId = 'https://player.vimeo.com/video/' + match[1];
        }
        const sep = vId.includes('?') ? '&' : '?';
        return `<iframe src="${vId}${sep}badge=0&autopause=0&player_id=0&app_id=58479&title=0&byline=0&portrait=0&dnt=1" frameborder="0" allow="autoplay;fullscreen;picture-in-picture;clipboard-write;encrypted-media" allowfullscreen title="${this.escapeHtml(title)}" style="position:absolute;inset:0;width:100%;height:100%;border:none" loading="lazy"></iframe>`;
      } else if (clean.includes('youtube.com') || clean.includes('youtu.be')) {
        let yId = '';
        if (clean.includes('youtu.be/')) yId = clean.split('youtu.be/')[1].split(/[?&#]/)[0];
        else if (clean.includes('v=')) yId = clean.split('v=')[1].split(/[?&#]/)[0];
        else if (clean.includes('/embed/')) yId = clean.split('/embed/')[1].split(/[?&#]/)[0];
        return `<iframe src="https://www.youtube.com/embed/${yId}?autoplay=0&rel=0&playsinline=1" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen title="${this.escapeHtml(title)}" style="position:absolute;inset:0;width:100%;height:100%;border:none" loading="lazy"></iframe>`;
      } else if (clean.endsWith('.mp4') || clean.includes('.mp4?')) {
        return `<video src="${clean}" controls playsinline preload="metadata" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border:none"></video>`;
      } else {
        return `<iframe src="${clean}" frameborder="0" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:none"></iframe>`;
      }
    };

    return `
      <div class="qf-sales-page-wrapper" style="--teal: ${teal}; --teal2: #00b890; --bg1: #07090f; --bg2: #0c0f1a; --bg3: #111827; background: #07090f; color: #e8edf7; margin: -16px -16px; font-family: 'Exo 2', system-ui, sans-serif;">
        <style>
          .qf-sp-w { max-width: 960px; margin: 0 auto; padding: 0 20px; }
          .qf-sp-s { padding: 56px 0; position: relative; }
          .qf-sp-lbl { font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--teal); margin-bottom: 12px; text-align: center; }
          .qf-sp-ttl { font-size: clamp(22px, 5vw, 38px); font-weight: 900; color: #fff; line-height: 1.2; text-align: center; max-width: 700px; margin: 0 auto 36px; }
          .qf-sp-ttl span, .qf-sp-ttl strong { color: var(--teal); }
          .qf-sp-cta { display: inline-flex; align-items: center; justify-content: center; gap: 9px; background: linear-gradient(135deg, var(--teal), var(--teal2)); color: #002a20; font-weight: 900; font-size: 15px; padding: 16px 36px; border-radius: 50px; text-decoration: none; cursor: pointer; border: none; box-shadow: 0 6px 28px rgba(0,212,170,.35); transition: transform .2s; }
          .qf-sp-cta:hover { transform: scale(1.02); }
          .qf-sp-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(0,212,170,.25), transparent); }
        </style>

        <!-- 1. HERO -->
        <section class="qf-sp-s" style="padding-top: 40px; text-align: center; background: radial-gradient(ellipse 90% 50% at 50% -5%, rgba(0,212,170,.1), transparent 70%);">
          <div class="qf-sp-w">
            <div style="display: inline-flex; align-items: center; gap: 7px; background: rgba(0,212,170,.08); border: 1px solid rgba(0,212,170,.25); border-radius: 40px; padding: 5px 16px; font-size: 11px; font-weight: 700; color: var(--teal); letter-spacing: .1em; text-transform: uppercase; margin-bottom: 18px;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--teal); display: inline-block;"></span>
              ${this.escapeHtml(heroBadge)}
            </div>

            <h1 class="qf-sp-ttl" style="margin-bottom: 18px;">${heroH1}</h1>
            <p style="font-size: 16px; color: #8a9bb8; max-width: 540px; margin: 0 auto 32px; line-height: 1.7;">${heroSub}</p>

            <!-- VSL -->
            <div style="position: relative; width: 100%; max-width: 720px; margin: 0 auto 36px; aspect-ratio: 16/9; border-radius: 16px; overflow: hidden; box-shadow: 0 32px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(0,212,170,.15); background: #000;">
              ${buildVideoEmbed(vslUrl, 'Vídeo de Vendas')}
            </div>

            <a href="#qf-planos-section" class="qf-sp-cta" onclick="document.getElementById('qf-planos-section')?.scrollIntoView({behavior: 'smooth'}); return false;">
              ${this.escapeHtml(heroCta)}
            </a>

            <!-- Selos de Confiança -->
            <div style="display: flex; align-items: center; justify-content: center; gap: 20px; flex-wrap: wrap; margin-top: 28px;">
              ${(block.trustPills || ['Sem contrato', 'Acesso imediato', '30 dias de garantia', 'Suporte dedicado']).map(pill => `
                <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #4a5568; font-weight: 600;">
                  <span style="color: var(--teal); font-weight: 900;">✓</span> ${this.escapeHtml(pill)}
                </div>
              `).join('')}
            </div>
          </div>
        </section>

        <div class="qf-sp-divider"></div>

        <!-- 2. SEÇÃO DA DOR -->
        ${block.showPainSection !== false ? `
          <section class="qf-sp-s" style="background: #0c0f1a;">
            <div class="qf-sp-w">
              <div class="qf-sp-lbl" style="color: #ff3b5c;">${this.escapeHtml(block.painTag || 'O problema que ninguém resolve')}</div>
              <h2 class="qf-sp-ttl">${(block.painHeadline || 'Você Já Ficou Sem Internet em um **Momento Importante?**').replace(/\*\*(.*?)\*\*/g, '<span style="color:#ff3b5c;">$1</span>')}</h2>
              
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-bottom: 32px;">
                ${(block.painCards || []).map(card => `
                  <div style="background: rgba(255,59,92,.04); border: 1px solid rgba(255,59,92,.15); border-radius: 12px; padding: 20px; display: flex; gap: 14px;">
                    <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(255,59,92,.1); display: flex; align-items: center; justify-content: center; color: #ff3b5c; font-size: 16px; shrink-0;">⚠️</div>
                    <div>
                      <h4 style="font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 4px;">${this.escapeHtml(card.title)}</h4>
                      <p style="font-size: 13px; color: #8a9bb8; line-height: 1.6;">${this.escapeHtml(card.desc)}</p>
                    </div>
                  </div>
                `).join('')}
              </div>

              <div style="text-align: center;">
                <a href="#qf-planos-section" class="qf-sp-cta" style="font-size: 14px; padding: 13px 30px;" onclick="document.getElementById('qf-planos-section')?.scrollIntoView({behavior: 'smooth'}); return false;">
                  ${this.escapeHtml(heroCta)}
                </a>
              </div>
            </div>
          </section>
          <div class="qf-sp-divider"></div>
        ` : ''}

        <!-- 3. SEÇÃO PRODUTO / MOCKUP -->
        ${block.showProductSection !== false ? `
          <section class="qf-sp-s" style="background: #07090f;">
            <div class="qf-sp-w">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 40px; align-items: center;">
                <div>
                  <img src="${this.escapeHtml(block.mockupImageUrl || 'https://planetaideias.com.br/wp-content/uploads/2026/03/Gemini_Generated_Image_4ohvaj4ohvaj4ohv.png')}" alt="App Mockup" style="border-radius: 20px; width: 100%; box-shadow: 0 40px 100px rgba(0,0,0,.6); object-fit: contain;">
                </div>
                <div>
                  <div class="qf-sp-lbl" style="text-align: left;">${this.escapeHtml(block.prodTag || 'Como funciona')}</div>
                  <h2 class="qf-sp-ttl" style="text-align: left; font-size: clamp(20px, 4vw, 32px); margin: 0 0 16px;">
                    ${(block.prodHeadline || 'Um App. Todas as Redes.\\n**Em Qualquer Lugar.**').replace(/\\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<span>$1</span>')}
                  </h2>
                  <p style="font-size: 15px; color: #8a9bb8; line-height: 1.8; margin-bottom: 24px;">
                    ${this.escapeHtml(block.prodDesc || 'Nosso app não é uma operadora. É uma plataforma global de conectividade que sempre encontra a rede mais rápida disponível.')}
                  </p>

                  <div style="background: rgba(0,212,170,.05); border: 1px solid rgba(0,212,170,.25); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                    <h4 style="font-size: 14px; font-weight: 700; color: var(--teal); margin-bottom: 8px;">🛰️ Cobertura Multi-Operadora + Satélite</h4>
                    <p style="font-size: 13px; color: #8a9bb8; line-height: 1.6; margin-bottom: 12px;">Conecta automaticamente à rede mais forte da sua região.</p>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                      ${(block.operators || ['Vivo', 'Claro', 'Tim', 'Oi', 'Starlink']).map(op => `
                        <span style="padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); color: #a0b0c8;">${this.escapeHtml(op)}</span>
                      `).join('')}
                    </div>
                  </div>

                  <a href="#qf-planos-section" class="qf-sp-cta" style="font-size: 14px; padding: 13px 30px;" onclick="document.getElementById('qf-planos-section')?.scrollIntoView({behavior: 'smooth'}); return false;">
                    ${this.escapeHtml(heroCta)}
                  </a>
                </div>
              </div>
            </div>
          </section>
          <div class="qf-sp-divider"></div>
        ` : ''}

        <!-- 4. BENEFÍCIOS -->
        ${block.showBenefits !== false ? `
          <section class="qf-sp-s" style="background: #111827;">
            <div class="qf-sp-w">
              <div class="qf-sp-lbl">O que você recebe</div>
              <h2 class="qf-sp-ttl">${(block.benefitsHeadline || 'Tudo o Que Você Merecia **Desde Sempre**').replace(/\*\*(.*?)\*\*/g, '<span>$1</span>')}</h2>
              
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 32px;">
                <div style="background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 22px;">
                  <div style="font-size: 24px; margin-bottom: 10px;">⚡</div>
                  <h3 style="font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 6px;">Internet Ilimitada</h3>
                  <p style="font-size: 13px; color: #8a9bb8; line-height: 1.6;">Sem franquia, sem bloqueio. Use quanto precisar.</p>
                </div>
                <div style="background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 22px;">
                  <div style="font-size: 24px; margin-bottom: 10px;">🔓</div>
                  <h3 style="font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 6px;">Zero Burocracia</h3>
                  <p style="font-size: 13px; color: #8a9bb8; line-height: 1.6;">Sem consulta ao SPC/Serasa, sem contrato e sem fidelidade.</p>
                </div>
                <div style="background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 22px;">
                  <div style="font-size: 24px; margin-bottom: 10px;">📍</div>
                  <h3 style="font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 6px;">Cobertura Nacional</h3>
                  <p style="font-size: 13px; color: #8a9bb8; line-height: 1.6;">Interior, estrada, praia — onde estiver, estará conectado.</p>
                </div>
                <div style="background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 22px;">
                  <div style="font-size: 24px; margin-bottom: 10px;">🚀</div>
                  <h3 style="font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 6px;">200 Mbps</h3>
                  <p style="font-size: 13px; color: #8a9bb8; line-height: 1.6;">Alta velocidade para reuniões, streaming e jogos sem travar.</p>
                </div>
              </div>

              <div style="text-align: center;">
                <a href="#qf-planos-section" class="qf-sp-cta" style="font-size: 14px; padding: 13px 30px;" onclick="document.getElementById('qf-planos-section')?.scrollIntoView({behavior: 'smooth'}); return false;">
                  ${this.escapeHtml(heroCta)}
                </a>
              </div>
            </div>
          </section>
          <div class="qf-sp-divider"></div>
        ` : ''}

        <!-- 5. OS 3 PLANOS -->
        <section class="qf-sp-s" id="qf-planos-section" style="background: #07090f;">
          <div class="qf-sp-w">
            <div class="qf-sp-lbl">Escolha seu acesso</div>
            <h2 class="qf-sp-ttl">${(block.plansHeadline || 'Planos de Acesso **NetFree**').replace(/\*\*(.*?)\*\*/g, '<span>$1</span>')}</h2>
            <p style="text-align: center; font-size: 14px; color: #4a5568; max-width: 480px; margin: -24px auto 36px;">${this.escapeHtml(block.plansSub || 'Internet ilimitada em todos os planos. Sem contrato.')}</p>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; align-items: center; margin-bottom: 36px;">
              ${plans.map(pl => {
                const isFt = pl.featured;
                const bg = isFt ? 'rgba(0,212,170,.05)' : 'rgba(255,255,255,.03)';
                const bdr = isFt ? '2px solid rgba(0,212,170,.5)' : '1px solid rgba(255,255,255,.08)';
                const shd = isFt ? '0 0 50px rgba(0,212,170,.12)' : 'none';
                const btnClass = isFt ? 'background: linear-gradient(135deg, var(--teal), var(--teal2)); color: #002a20; font-weight: 900;' : 'background: rgba(255,255,255,.08); color: #fff; font-weight: 700;';

                return `
                  <div style="background: ${bg}; border: ${bdr}; box-shadow: ${shd}; border-radius: 20px; padding: 32px 24px; text-align: center; position: relative; overflow: hidden;">
                    ${isFt && pl.ribbon ? `
                      <div style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, var(--teal), var(--teal2)); color: #002a20; font-size: 10px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; padding: 4px 18px; border-radius: 0 0 10px 10px;">
                        ${this.escapeHtml(pl.ribbon)}
                      </div>
                    ` : ''}

                    <div style="font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: ${isFt ? 'var(--teal)' : '#4a5568'}; margin-top: ${isFt ? '16px' : '0'}; margin-bottom: 12px;">
                      ${this.escapeHtml(pl.name)}
                    </div>

                    <div style="display: flex; align-items: flex-start; justify-content: center; gap: 2px; margin-bottom: 4px;">
                      <span style="font-size: 16px; font-weight: 600; color: #fff; margin-top: 8px;">R$</span>
                      <span style="font-size: 48px; font-weight: 900; color: ${isFt ? 'var(--teal)' : '#fff'}; line-height: 1;">${this.escapeHtml(pl.priceVal || '0')}</span>
                      <span style="font-size: 20px; font-weight: 700; color: ${isFt ? 'var(--teal)' : '#fff'}; align-self: flex-end; margin-bottom: 6px;">${this.escapeHtml(pl.priceCts || ',00')}</span>
                    </div>

                    <div style="font-size: 12px; color: ${isFt ? '#00ff88' : '#4a5568'}; font-weight: 600; margin-bottom: 18px;">
                      ${this.escapeHtml(pl.sub || '')}
                    </div>

                    <hr style="border: none; border-top: 1px solid rgba(255,255,255,.06); margin-bottom: 18px;">

                    <ul style="list-style: none; text-align: left; display: flex; flex-direction: column; gap: 9px; margin-bottom: 24px;">
                      ${(pl.features || ['Internet Ilimitada', '200 Mbps velocidade', 'Sem contrato', 'Acesso imediato']).map(feat => `
                        <li style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #a0b0c8;">
                          <span style="color: var(--teal); font-weight: 900;">✓</span> ${this.escapeHtml(feat)}
                        </li>
                      `).join('')}
                    </ul>

                    <a href="${this.escapeHtml(pl.checkoutUrl || '#')}" target="_blank" rel="noopener noreferrer" style="display: block; width: 100%; padding: 13px; border-radius: 50px; font-size: 14px; text-decoration: none; cursor: pointer; border: none; ${btnClass}">
                      ${this.escapeHtml(pl.ctaText || 'Quero Este Plano')}
                    </a>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </section>

        <div class="qf-sp-divider"></div>

        <!-- 6. GARANTIA 30 DIAS -->
        ${block.showGuarantee !== false ? `
          <section class="qf-sp-s" style="background: #0c0f1a; text-align: center;">
            <div class="qf-sp-w" style="max-width: 600px;">
              <div class="qf-sp-lbl">Risco zero</div>
              <img src="${this.escapeHtml(block.guaranteeSealUrl || 'https://planetaideias.com.br/wp-content/uploads/2026/01/selo-garantia-699x1024-1.png')}" alt="Selo Garantia" style="width: 140px; height: 140px; object-fit: contain; margin: 0 auto 20px; filter: drop-shadow(0 0 20px rgba(245,208,0,.2));">
              <h2 style="font-size: clamp(20px, 4vw, 32px); font-weight: 900; color: #fff; margin-bottom: 14px;">GARANTIA DE ${this.escapeHtml(block.guaranteeDays || '30')} DIAS.</h2>
              <p style="font-size: 15px; color: #8a9bb8; line-height: 1.8; margin-bottom: 28px;">
                ${(block.guaranteeText || 'Experimente sem riscos. Se não gostar, devolvemos todo o seu dinheiro.').replace(/\\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff">$1</strong>')}
              </p>
              <a href="#qf-planos-section" class="qf-sp-cta" onclick="document.getElementById('qf-planos-section')?.scrollIntoView({behavior: 'smooth'}); return false;">
                GARANTIR MEU ACESSO AGORA
              </a>
            </div>
          </section>
          <div class="qf-sp-divider"></div>
        ` : ''}

        <!-- 7. PASSOS + TUTORIAL VÍDEO -->
        ${block.showStepsTutorial !== false ? `
          <section class="qf-sp-s" style="background: #07090f; text-align: center;">
            <div class="qf-sp-w">
              <div class="qf-sp-lbl">Simples assim</div>
              <h2 class="qf-sp-ttl">3 Passos Para Estar <span>Conectado</span></h2>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; max-width: 760px; margin: 0 auto 36px;">
                <div>
                  <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(0,212,170,.1); border: 1px solid rgba(0,212,170,.35); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 20px; font-weight: 900; color: var(--teal);">1</div>
                  <h3 style="font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 4px;">Escolha e Pague</h3>
                  <p style="font-size: 12px; color: #8a9bb8;">Escolha o plano e pague com segurança via Pix.</p>
                </div>
                <div>
                  <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(0,212,170,.1); border: 1px solid rgba(0,212,170,.35); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 20px; font-weight: 900; color: var(--teal);">2</div>
                  <h3 style="font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 4px;">Baixe o App</h3>
                  <p style="font-size: 12px; color: #8a9bb8;">Receba o login por e-mail e baixe o aplicativo.</p>
                </div>
                <div>
                  <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(0,212,170,.1); border: 1px solid rgba(0,212,170,.35); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 20px; font-weight: 900; color: var(--teal);">3</div>
                  <h3 style="font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 4px;">Conecte e Use</h3>
                  <p style="font-size: 12px; color: #8a9bb8;">Aperte Conectar e aproveite sinal em todo o Brasil.</p>
                </div>
              </div>

              ${block.tutorialVideoUrl ? `
                <div style="position: relative; max-width: 340px; aspect-ratio: 9/16; margin: 0 auto 36px; border-radius: 14px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,.6); background: #000;">
                  ${buildVideoEmbed(block.tutorialVideoUrl, 'Tutorial NetFree')}
                </div>
              ` : ''}

              <a href="#qf-planos-section" class="qf-sp-cta" style="font-size: 14px; padding: 13px 30px;" onclick="document.getElementById('qf-planos-section')?.scrollIntoView({behavior: 'smooth'}); return false;">
                ${this.escapeHtml(heroCta)}
              </a>
            </div>
          </section>
          <div class="qf-sp-divider"></div>
        ` : ''}

        <!-- 8. DEPOIMENTOS DE CLIENTES -->
        ${block.showReviews !== false ? `
          <section class="qf-sp-s" style="background: #0c0f1a; text-align: center;">
            <div class="qf-sp-w">
              <div class="qf-sp-lbl">Prova social</div>
              <h2 class="qf-sp-ttl">Veja Quem Já Se Libertou das <span>Operadoras Tradicionais</span></h2>

              ${block.reviewsVideoUrl ? `
                <div style="position: relative; max-width: 340px; aspect-ratio: 9/16; margin: 0 auto 36px; border-radius: 14px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,.6); background: #000;">
                  ${buildVideoEmbed(block.reviewsVideoUrl, 'Depoimentos de Clientes')}
                </div>
              ` : ''}

              <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 32px;">
                <span style="color: #f5d000; font-size: 18px;">★★★★★</span>
                <span style="font-size: 13px; font-weight: 700; color: #8a9bb8;">${this.escapeHtml(block.reviewsRating || '4.9 de 5 — mais de 2.400 avaliações')}</span>
              </div>

              <!-- Grid de Depoimentos Rápidos -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; text-align: left; margin-bottom: 32px;">
                <div style="background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 18px;">
                  <div style="font-weight: 700; font-size: 13px; color: #fff;">Carlos Mendonça — <span style="font-size: 11px; color: #4a5568;">São Paulo</span></div>
                  <div style="color: #f5d000; font-size: 12px; margin: 4px 0 8px;">★★★★★</div>
                  <p style="font-size: 12px; color: #8a9bb8; line-height: 1.6;">"Viajei pelo interior de SP e MG e nunca fiquei sem sinal. App incrível!"</p>
                  <span style="display: inline-block; font-size: 10px; font-weight: 700; color: var(--teal); margin-top: 8px;">✓ Compra verificada</span>
                </div>
                <div style="background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 18px;">
                  <div style="font-weight: 700; font-size: 13px; color: #fff;">Amanda Ferreira — <span style="font-size: 11px; color: #4a5568;">Goiânia</span></div>
                  <div style="color: #f5d000; font-size: 12px; margin: 4px 0 8px;">★★★★★</div>
                  <p style="font-size: 12px; color: #8a9bb8; line-height: 1.6;">"Economizei mais de R$ 80 por mês cancelando meu plano antigo. Funciona perfeitamente."</p>
                  <span style="display: inline-block; font-size: 10px; font-weight: 700; color: var(--teal); margin-top: 8px;">✓ Compra verificada</span>
                </div>
                <div style="background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 18px;">
                  <div style="font-weight: 700; font-size: 13px; color: #fff;">Roberto Alves — <span style="font-size: 11px; color: #4a5568;">Curitiba</span></div>
                  <div style="color: #f5d000; font-size: 12px; margin: 4px 0 8px;">★★★★★</div>
                  <p style="font-size: 12px; color: #8a9bb8; line-height: 1.6;">"Motorista de app. Conecta rápido e nunca caiu durante uma corrida. Melhor investimento."</p>
                  <span style="display: inline-block; font-size: 10px; font-weight: 700; color: var(--teal); margin-top: 8px;">✓ Compra verificada</span>
                </div>
              </div>

              <a href="#qf-planos-section" class="qf-sp-cta" style="font-size: 14px; padding: 13px 30px;" onclick="document.getElementById('qf-planos-section')?.scrollIntoView({behavior: 'smooth'}); return false;">
                ${this.escapeHtml(heroCta)}
              </a>
            </div>
          </section>
          <div class="qf-sp-divider"></div>
        ` : ''}

        <!-- 9. FAQ SANFONADO -->
        ${block.showFaq !== false ? `
          <section class="qf-sp-s" style="background: #07090f;">
            <div class="qf-sp-w" style="max-width: 720px;">
              <div class="qf-sp-lbl">Tire suas dúvidas</div>
              <h2 class="qf-sp-ttl">Perguntas <span>Frequentes</span></h2>

              <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 32px;">
                <details style="background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 10px; padding: 14px 18px; cursor: pointer;">
                  <summary style="font-weight: 700; font-size: 13px; color: #fff; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                    O NetFree é uma operadora de telefonia? <span style="color: var(--teal); font-weight: 900;">+</span>
                  </summary>
                  <p style="font-size: 12px; color: #8a9bb8; line-height: 1.7; margin-top: 10px; border-top: 1px solid rgba(255,255,255,.05); padding-top: 10px;">
                    Não. O NetFree é uma plataforma global de conectividade. Nosso app conecta você automaticamente à rede mais forte disponível na sua região, usando acordos com multioperadoras e satélite.
                  </p>
                </details>

                <details style="background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 10px; padding: 14px 18px; cursor: pointer;">
                  <summary style="font-weight: 700; font-size: 13px; color: #fff; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                    Funciona em qualquer lugar do Brasil? <span style="color: var(--teal); font-weight: 900;">+</span>
                  </summary>
                  <p style="font-size: 12px; color: #8a9bb8; line-height: 1.7; margin-top: 10px; border-top: 1px solid rgba(255,255,255,.05); padding-top: 10px;">
                    Sim! Onde não há sinal de uma operadora, há de outra. Em áreas remotas priorizamos satélite.
                  </p>
                </details>

                <details style="background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 10px; padding: 14px 18px; cursor: pointer;">
                  <summary style="font-weight: 700; font-size: 13px; color: #fff; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                    Preciso assinar contrato de fidelidade? <span style="color: var(--teal); font-weight: 900;">+</span>
                  </summary>
                  <p style="font-size: 12px; color: #8a9bb8; line-height: 1.7; margin-top: 10px; border-top: 1px solid rgba(255,255,255,.05); padding-top: 10px;">
                    Não. Funciona como pré-pago. Você usa quando quiser, sem análise de crédito e sem multas.
                  </p>
                </details>

                <details style="background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 10px; padding: 14px 18px; cursor: pointer;">
                  <summary style="font-weight: 700; font-size: 13px; color: #fff; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                    Como recebo o acesso após o pagamento? <span style="color: var(--teal); font-weight: 900;">+</span>
                  </summary>
                  <p style="font-size: 12px; color: #8a9bb8; line-height: 1.7; margin-top: 10px; border-top: 1px solid rgba(255,255,255,.05); padding-top: 10px;">
                    Após confirmação do pagamento você recebe no e-mail e WhatsApp os dados de login em minutos.
                  </p>
                </details>
              </div>

              <div style="text-align: center;">
                <a href="#qf-planos-section" class="qf-sp-cta" onclick="document.getElementById('qf-planos-section')?.scrollIntoView({behavior: 'smooth'}); return false;">
                  GARANTIR MEU ACESSO AGORA
                </a>
              </div>
            </div>
          </section>
        ` : ''}

        <!-- 10. RODAPÉ INSTITUCIONAL -->
        <footer style="background: #04060c; border-top: 1px solid rgba(255,255,255,.05); padding: 36px 20px 24px; text-align: center; font-size: 11px; color: #4a5568;">
          <div style="display: inline-flex; align-items: center; gap: 8px; font-weight: 900; color: var(--teal); font-size: 15px; margin-bottom: 14px;">
            <img src="${this.escapeHtml(logoUrl)}" alt="Logo" style="width: 28px; height: 28px; object-fit: contain; border-radius: 50%;">
            ${this.escapeHtml(brandName)}
          </div>
          <p style="max-width: 600px; margin: 0 auto; line-height: 1.8;">
            © ${new Date().getFullYear()} ${this.escapeHtml(brandName)}. Todos os direitos reservados.<br>
            Este produto é uma plataforma de conectividade digital. A garantia de 30 dias é incondicional.
          </p>
        </footer>
      </div>
    `;
  },

  renderFaqBlockHtml(block) {
    const title = block.title || 'Perguntas Frequentes';
    const subtitle = block.subtitle || '';
    const items = (Array.isArray(block.items) && block.items.length > 0)
      ? block.items
      : this.getDefaultFaqItems();

    let blockHtml = '<div class="faq-block-container">';

    if (title || subtitle) {
      blockHtml += '<div class="faq-header">';
      if (title) {
        blockHtml += `<div class="faq-header-title"><span>❓</span> ${this.escapeHtml(title)}</div>`;
      }
      if (subtitle) {
        blockHtml += `<div class="faq-header-subtitle">${this.escapeHtml(subtitle)}</div>`;
      }
      blockHtml += '</div>';
    }

    blockHtml += '<div class="faq-accordion">';
    items.forEach(item => {
      const q = item.question || 'Dúvida';
      const a = item.answer || '';
      blockHtml += `
        <div class="faq-item" onclick="this.classList.toggle('active')">
          <div class="faq-question">
            <span class="faq-q-text">${this.escapeHtml(q)}</span>
            <span class="faq-toggle-icon">▾</span>
          </div>
          <div class="faq-answer">
            <div class="faq-answer-inner">${this.formatMarkdown(a)}</div>
          </div>
        </div>
      `;
    });
    blockHtml += '</div>';
    blockHtml += '</div>';

    return blockHtml;
  },

  // Cálculo psicológico de progresso da barra
  calculateProgressPercent(stepIndex, totalSteps, theme = {}) {
    if (totalSteps <= 0) return 0;
    const rawStart = theme.startPercent !== undefined ? theme.startPercent : 60;
    const startPercent = Math.max(0, Math.min(95, parseInt(rawStart, 10) || 0));
    if (startPercent <= 0) {
      return Math.min(100, Math.round(((stepIndex + 1) / totalSteps) * 100));
    }
    // Se a barra de progresso fica oculta até o primeiro clique (hideUntilFirstClick !== false):
    // Na 1ª etapa após o primeiro clique (stepIndex 1), a barra surge exatamente no startPercent (ex: 60%).
    // Se a barra for exibida desde o início (hideUntilFirstClick === false), começa no startPercent na etapa 0.
    const hideUntilClick = theme.hideUntilFirstClick !== false;
    const firstVisibleStep = hideUntilClick ? 1 : 0;

    if (totalSteps <= 1 || stepIndex >= totalSteps - 1) return 100;
    if (stepIndex <= firstVisibleStep) {
      return startPercent;
    }

    const remainingSteps = (totalSteps - 1) - firstVisibleStep;
    if (remainingSteps <= 0) return 100;

    const factor = (stepIndex - firstVisibleStep) / remainingSteps;
    const pct = Math.round(startPercent + ((100 - startPercent) * factor));
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

    const hexToRgb = (hex) => {
      const clean = (hex || '#000000').replace('#', '');
      const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
      const num = parseInt(full, 16) || 0;
      return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    };

    const cardRgb = hexToRgb(cardBg);
    const isLightCard = (0.299 * cardRgb.r + 0.587 * cardRgb.g + 0.114 * cardRgb.b) > 150;
    const primRgb = hexToRgb(primaryColor);
    const textMuted = theme.textMuted || (isLightCard ? '#475569' : '#94a3b8');

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
      --opt-bg: ${isLightCard ? '#f8fafc' : 'rgba(255, 255, 255, 0.04)'};
      --opt-border: ${isLightCard ? '#cbd5e1' : 'rgba(255, 255, 255, 0.08)'};
      --opt-hover-bg: ${isLightCard ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)'};
      --opt-hover-border: ${primaryColor};
      --opt-shadow: ${isLightCard ? '0 2px 4px rgba(0, 0, 0, 0.05)' : 'none'};
      --opt-indicator-border: ${isLightCard ? '#94a3b8' : 'rgba(255, 255, 255, 0.25)'};
      --opt-selected-bg: ${isLightCard ? 'rgba(' + primRgb.r + ',' + primRgb.g + ',' + primRgb.b + ', 0.1)' : 'rgba(' + primRgb.r + ',' + primRgb.g + ',' + primRgb.b + ', 0.18)'};
      --progress-bg: ${isLightCard ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'};
      --step-tag-bg: ${isLightCard ? 'rgba(' + primRgb.r + ',' + primRgb.g + ',' + primRgb.b + ', 0.12)' : 'rgba(99, 102, 241, 0.12)'};
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

    /* Alinhamentos e Utilitários de Texto */
    ${scope} .text-left { text-align: left !important; }
    ${scope} .text-center { text-align: center !important; }
    ${scope} .text-right { text-align: right !important; }

    /* Escala de Tamanho de Títulos e Subtítulos */
    ${scope} .title-sm { font-size: 16px !important; line-height: 1.35 !important; }
    ${scope} .title-md { font-size: 20px !important; line-height: 1.35 !important; }
    ${scope} .title-lg { font-size: 24px !important; line-height: 1.3 !important; }
    ${scope} .title-xl { font-size: 28px !important; line-height: 1.25 !important; }

    ${scope} .sub-xs { font-size: 11px !important; line-height: 1.4 !important; }
    ${scope} .sub-sm { font-size: 13px !important; line-height: 1.5 !important; }
    ${scope} .sub-base { font-size: 15px !important; line-height: 1.55 !important; }

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
      white-space: pre-line;
      word-break: break-word;
    }

    ${scope} .step-title {
      font-size: 20px;
      font-weight: 800;
      color: var(--text);
      line-height: 1.3;
      margin-bottom: 8px;
      white-space: pre-line;
      word-break: break-word;
    }

    ${scope} .step-subtitle {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
      white-space: pre-line;
      word-break: break-word;
    }

    /* Bloco de Imagem e Banner */
    ${scope} .quiz-image-card {
      width: 100%;
      margin: 12px 0 16px 0;
      display: flex;
      flex-direction: column;
    }

    ${scope} .quiz-image-card.align-left { align-items: flex-start; text-align: left; }
    ${scope} .quiz-image-card.align-center { align-items: center; text-align: center; }
    ${scope} .quiz-image-card.align-right { align-items: flex-end; text-align: right; }

    ${scope} .quiz-image-card img {
      max-width: 100%;
      height: auto;
      display: block;
      border-radius: calc(var(--radius) - 4px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      object-fit: cover;
    }

    ${scope} .quiz-image-small img { max-width: 180px; }
    ${scope} .quiz-image-medium img { max-width: 360px; }
    ${scope} .quiz-image-full img { width: 100%; }

    ${scope} .quiz-image-title {
      margin-bottom: 8px;
      font-weight: 700;
      line-height: 1.3;
      width: 100%;
      word-break: break-word;
    }

    ${scope} .quiz-image-caption {
      margin-top: 6px;
      font-size: 12px;
      color: var(--text-muted);
      white-space: pre-line;
      word-break: break-word;
    }

    /* Vídeos Responsivos */
    ${scope} .video-wrapper {
      position: relative;
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

    /* Máscara Superior Anti-Distração: esconde cabeçalho de título e canal do YouTube */
    ${scope} .video-wrapper.clean-mask.horizontal iframe {
      top: -48px;
      height: calc(100% + 48px);
    }

    ${scope} .video-wrapper.vertical {
      position: relative;
      max-width: 280px;
      margin: 16px auto;
      aspect-ratio: 9 / 16;
      height: 480px;
      overflow: hidden;
    }

    ${scope} .video-wrapper.vertical iframe {
      width: 100%;
      height: 100%;
      border: 0;
    }

    ${scope} .video-wrapper.clean-mask.vertical iframe {
      margin-top: -46px;
      height: calc(100% + 46px);
    }

    /* Poster Instantâneo Anti-Tela Preta do YouTube */
    ${scope} .video-poster-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      transition: opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.45s ease;
      pointer-events: none;
    }

    ${scope} .video-poster-layer.poster-fade-out {
      opacity: 0;
      visibility: hidden;
    }

    ${scope} .video-poster-img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: brightness(0.72);
      transform: scale(1.03);
    }

    ${scope} .video-poster-spinner-wrap {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 7px;
      background: rgba(15, 23, 42, 0.78);
      padding: 9px 16px;
      border-radius: 9999px;
      backdrop-filter: blur(5px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45);
    }

    ${scope} .video-poster-spinner {
      width: 22px;
      height: 22px;
      border: 2.5px solid rgba(255, 255, 255, 0.2);
      border-top-color: #ef4444;
      border-radius: 50%;
      animation: qfVideoSpin 0.75s linear infinite;
    }

    ${scope} .video-poster-loading-text {
      font-size: 10px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    @keyframes qfVideoSpin {
      to { transform: rotate(360deg); }
    }

    /* Botão Flutuante de Ativar Som (Estilo VSL / TikTok) */
    ${scope} .video-unmute-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.28);
      backdrop-filter: blur(1.5px);
      cursor: pointer;
      transition: opacity 0.3s ease, visibility 0.3s ease;
      padding: 16px;
      box-sizing: border-box;
    }

    ${scope} .video-unmute-btn {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: #ffffff;
      border: 2px solid rgba(255, 255, 255, 0.4);
      box-shadow: 0 10px 25px rgba(220, 38, 38, 0.65);
      border-radius: 9999px;
      padding: 12px 20px;
      font-size: 13px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      animation: qfPulseUnmute 1.8s infinite;
      text-align: center;
      max-width: 92%;
      pointer-events: auto;
      transition: transform 0.2s ease, background 0.2s ease;
    }

    ${scope} .video-unmute-btn:hover {
      transform: scale(1.05);
      background: linear-gradient(135deg, #f87171, #ef4444);
    }

    @keyframes qfPulseUnmute {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
      70% { transform: scale(1.04); box-shadow: 0 0 0 14px rgba(239, 68, 68, 0); }
      100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }

    /* Bloco HTML Customizado / Full Mobile Width */
    ${scope} .custom-html-container {
      width: 100%;
      margin: 12px 0;
      padding: 0;
      background: transparent;
      border: none;
      box-sizing: border-box;
      position: relative;
    }

    ${scope} .custom-html-container.full-bleed {
      margin-left: -20px;
      margin-right: -20px;
      width: calc(100% + 40px);
      max-width: none;
    }

    ${scope} .custom-html-container iframe,
    ${scope} .custom-html-container embed,
    ${scope} .custom-html-container object {
      width: 100% !important;
      max-width: 100% !important;
      border: 0;
      display: block;
      margin: 0 auto;
      transition: height 0.2s ease;
    }

    ${scope} .custom-html-container img {
      max-width: 100% !important;
      height: auto;
      display: block;
    }

    ${scope} .quiz-card.card-borderless {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
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
      background: var(--opt-bg);
      border: 1.5px solid var(--opt-border);
      border-radius: calc(var(--radius) - 4px);
      box-shadow: var(--opt-shadow);
      color: var(--text);
      font-size: 14px;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      user-select: none;
      white-space: pre-line;
      word-break: break-word;
    }

    ${scope} .option-btn:hover {
      background: var(--opt-hover-bg);
      border-color: var(--opt-hover-border);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    ${scope} .option-btn.selected {
      background: var(--opt-selected-bg);
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
      border: 2px solid var(--opt-indicator-border);
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

    ${scope} .option-item-wrap {
      width: 100%;
      display: flex;
      flex-direction: column;
    }

    ${scope} .custom-answer-box {
      margin-top: 8px;
      display: flex;
      gap: 8px;
      width: 100%;
    }

    ${scope} .custom-answer-input {
      flex: 1;
      min-width: 0;
      padding: 12px 14px;
      border-radius: calc(var(--radius) - 4px);
      border: 1.5px solid var(--primary);
      background: var(--bg);
      color: var(--text);
      font-size: 13px;
      outline: none;
      font-family: inherit;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    ${scope} .custom-answer-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
    }

    ${scope} .custom-answer-submit-btn {
      padding: 0 16px;
      border-radius: calc(var(--radius) - 4px);
      background: var(--primary);
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      white-space: nowrap;
      transition: opacity 0.2s, transform 0.1s;
    }

    ${scope} .custom-answer-submit-btn:hover {
      opacity: 0.92;
      transform: translateY(-1px);
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
      white-space: pre-line;
      word-break: break-word;
    }

    /* Variações de Tamanho do Botão */
    ${scope} .btn-size-normal {
      padding: 12px 18px !important;
      font-size: 14px !important;
      min-height: 44px;
    }

    ${scope} .btn-size-large {
      padding: 16px 24px !important;
      font-size: 16px !important;
      font-weight: 800 !important;
      min-height: 52px;
    }

    ${scope} .btn-size-featured {
      padding: 20px 28px !important;
      font-size: 18px !important;
      font-weight: 900 !important;
      letter-spacing: 0.02em !important;
      box-shadow: 0 8px 25px -4px rgba(99, 102, 241, 0.5) !important;
      min-height: 60px;
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

    /* Bloco de Gráfico de Potencial & Projeção */
    ${scope} .potential-chart-card {
      width: 100%;
      background: var(--opt-bg);
      border: 1.5px solid var(--opt-border);
      border-radius: var(--radius);
      box-shadow: var(--opt-shadow);
      padding: 20px 16px;
      margin: 16px 0;
      position: relative;
      box-sizing: border-box;
    }

    ${scope} .potential-chart-title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text);
      text-align: center;
      margin-bottom: 14px;
    }

    /* Gráfico em Curva */
    ${scope} .curve-chart-wrapper {
      position: relative;
      width: 100%;
    }

    ${scope} .curve-svg {
      width: 100%;
      height: 145px;
      display: block;
      overflow: visible;
    }

    @keyframes drawCurveLine {
      from { stroke-dashoffset: 450; }
      to { stroke-dashoffset: 0; }
    }

    ${scope} .chart-curve-path {
      stroke-dasharray: 450;
      stroke-dashoffset: 450;
      animation: drawCurveLine var(--anim-dur, 2.5s) cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    }

    @keyframes fadeInArea {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    ${scope} .chart-area-fade {
      animation: fadeInArea 1.8s ease-out 0.4s forwards;
    }

    ${scope} .chart-badges-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 10px;
      gap: 12px;
    }

    ${scope} .chart-badge {
      display: flex;
      flex-direction: column;
      gap: 3px;
      background: rgba(0, 0, 0, 0.08);
      padding: 8px 12px;
      border-radius: 8px;
      max-width: 48%;
      box-sizing: border-box;
    }

    ${scope} .chart-badge.start-badge {
      border-left: 3.5px solid #ef4444;
      text-align: left;
    }

    ${scope} .chart-badge.end-badge {
      border-right: 3.5px solid #10b981;
      text-align: right;
    }

    ${scope} .chart-badge .badge-title {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.3;
      white-space: pre-line;
      word-break: break-word;
    }

    ${scope} .chart-badge .badge-number {
      font-size: 17px;
      font-weight: 900;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }

    /* Gráfico em Barras */
    ${scope} .bars-chart-container {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 24px;
      height: 160px;
      padding: 10px 0;
    }

    ${scope} .bar-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      width: 110px;
    }

    ${scope} .bar-value {
      font-size: 15px;
      font-weight: 900;
      line-height: 1;
    }

    ${scope} .bar-track {
      width: 44px;
      height: 100px;
      background: rgba(0, 0, 0, 0.06);
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      align-items: flex-end;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    @keyframes growBar {
      from { height: 0%; }
      to { height: var(--target-height, 50%); }
    }

    ${scope} .bar-fill {
      width: 100%;
      height: 0%;
      background: var(--bar-color, #10b981);
      border-radius: 6px 6px 0 0;
      animation: growBar 2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    ${scope} .bar-arrow {
      font-size: 22px;
      color: var(--text-muted);
      margin-bottom: 45px;
      opacity: 0.5;
    }

    ${scope} .bar-label {
      font-size: 11px;
      color: var(--text-muted);
      text-align: center;
      line-height: 1.3;
      white-space: pre-line;
      word-break: break-word;
    }

    /* ========================================================
       BLOCO DE AVALIAÇÕES / DEPOIMENTOS (PROVA SOCIAL)
       ======================================================== */
    ${scope} .reviews-block-container {
      width: 100%;
      margin: 18px 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-sizing: border-box;
    }

    ${scope} .reviews-header-summary {
      text-align: center;
      padding: 12px 14px;
      background: var(--opt-bg);
      border: 1px solid var(--opt-border);
      border-radius: var(--radius);
      box-shadow: var(--opt-shadow);
      margin-bottom: 4px;
    }

    ${scope} .reviews-header-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #eab308;
      background: rgba(234, 179, 8, 0.12);
      border: 1px solid rgba(234, 179, 8, 0.25);
      padding: 2px 8px;
      border-radius: 9999px;
      margin-bottom: 6px;
    }

    ${scope} .reviews-header-title {
      font-size: 15px;
      font-weight: 800;
      color: var(--text);
      margin-bottom: 4px;
    }

    ${scope} .reviews-header-rating {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    ${scope} .reviews-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    ${scope} .review-card {
      background: var(--opt-bg);
      border: 1.5px solid var(--opt-border);
      border-radius: var(--radius);
      box-shadow: var(--opt-shadow);
      padding: 16px 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      text-align: left;
      transition: transform 0.2s, border-color 0.2s;
      box-sizing: border-box;
    }

    ${scope} .review-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    ${scope} .review-author-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    ${scope} .review-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      flex-shrink: 0;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 13px;
      color: #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }

    ${scope} .review-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    ${scope} .review-author-info {
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    ${scope} .review-author-name {
      font-size: 13px;
      font-weight: 800;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    ${scope} .review-verified-badge {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 10px;
      font-weight: 700;
      color: #10b981;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 1px 5px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    ${scope} .review-author-role {
      font-size: 11px;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    ${scope} .review-stars-wrap {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
    }

    ${scope} .review-star {
      font-size: 14px;
      line-height: 1;
    }

    ${scope} .review-star.star-filled {
      color: #f59e0b;
      filter: drop-shadow(0 1px 2px rgba(245, 158, 11, 0.4));
    }

    ${scope} .review-star.star-empty {
      color: rgba(128, 128, 128, 0.3);
    }

    ${scope} .review-stars-num {
      font-size: 11px;
      font-weight: 800;
      color: #f59e0b;
      margin-left: 3px;
      font-family: monospace;
    }

    ${scope} .review-text {
      font-size: 12.5px;
      line-height: 1.5;
      color: var(--text);
      opacity: 0.92;
      font-style: normal;
    }

    ${scope} .review-footer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 10.5px;
      color: var(--text-muted);
      opacity: 0.8;
      border-top: 1px dashed var(--opt-border);
      padding-top: 6px;
      margin-top: 2px;
    }

    /* ========================================================
       BLOCO DE DÚVIDAS FREQUENTES (FAQ ACCORDION)
       ======================================================== */
    ${scope} .faq-block-container {
      width: 100%;
      margin: 18px 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-sizing: border-box;
    }

    ${scope} .faq-header {
      text-align: center;
      margin-bottom: 6px;
    }

    ${scope} .faq-header-title {
      font-size: 16px;
      font-weight: 800;
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    ${scope} .faq-header-subtitle {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    ${scope} .faq-accordion {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    ${scope} .faq-item {
      background: var(--opt-bg);
      border: 1.5px solid var(--opt-border);
      border-radius: var(--radius);
      box-shadow: var(--opt-shadow);
      overflow: hidden;
      transition: all 0.25s ease;
      cursor: pointer;
      user-select: none;
    }

    ${scope} .faq-item:hover {
      border-color: rgba(99, 102, 241, 0.45);
    }

    ${scope} .faq-item.active {
      border-color: #6366f1;
      box-shadow: 0 4px 14px -2px rgba(99, 102, 241, 0.2);
    }

    ${scope} .faq-question {
      padding: 13px 14px;
      font-size: 13px;
      font-weight: 700;
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    ${scope} .faq-q-text {
      flex: 1;
      text-align: left;
    }

    ${scope} .faq-toggle-icon {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      color: var(--text-muted);
      transition: transform 0.25s ease, color 0.2s ease;
      flex-shrink: 0;
    }

    ${scope} .faq-item.active .faq-toggle-icon {
      transform: rotate(180deg);
      color: #6366f1;
    }

    ${scope} .faq-answer {
      max-height: 0;
      opacity: 0;
      overflow: hidden;
      transition: max-height 0.3s cubic-bezier(0, 1, 0, 1), opacity 0.25s ease;
    }

    ${scope} .faq-item.active .faq-answer {
      max-height: 1000px;
      opacity: 1;
      transition: max-height 0.35s ease-in, opacity 0.3s ease;
    }

    ${scope} .faq-answer-inner {
      padding: 0 14px 14px 14px;
      font-size: 12px;
      line-height: 1.55;
      color: var(--text);
      opacity: 0.9;
      text-align: left;
      border-top: 1px dashed var(--opt-border);
      padding-top: 10px;
      margin-top: 2px;
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
      background: ${isLightCard ? 'var(--opt-bg, #f8fafc)' : 'rgba(255, 255, 255, 0.03)'};
      border: 1px solid ${isLightCard ? 'var(--opt-border, #cbd5e1)' : 'rgba(255, 255, 255, 0.08)'};
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
      white-space: pre-line;
      word-break: break-word;
    }

    ${scope} .product-box p {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.4;
      white-space: pre-line;
      word-break: break-word;
    }

    /* Tabela de Planos e Ofertas de Alta Conversão (3 Blocos / Multi-Plan) */
    ${scope} .pricing-plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin: 16px 0;
      width: 100%;
      align-items: stretch;
      box-sizing: border-box;
    }

    ${scope} .pricing-plan-card {
      background: ${isLightCard ? 'var(--opt-bg, #f8fafc)' : 'rgba(255, 255, 255, 0.03)'};
      border: 1.5px solid ${isLightCard ? 'var(--opt-border, #cbd5e1)' : 'rgba(255, 255, 255, 0.08)'};
      border-radius: calc(var(--radius) + 2px);
      padding: 24px 18px;
      text-align: center;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.3s ease;
      box-sizing: border-box;
      box-shadow: ${isLightCard ? '0 2px 6px rgba(0, 0, 0, 0.04)' : 'none'};
    }

    ${scope} .pricing-plan-card:hover {
      border-color: ${isLightCard ? 'var(--primary)' : 'rgba(255, 255, 255, 0.18)'};
      transform: translateY(-2px);
    }

    /* Cartão Destacado / Destaque de Alta Conversão */
    ${scope} .pricing-plan-card.featured {
      background: ${isLightCard ? 'rgba(5, 150, 105, 0.05)' : 'rgba(0, 212, 170, 0.04)'};
      border: 2px solid ${isLightCard ? 'var(--accent, #059669)' : 'var(--accent, #00d4aa)'};
      box-shadow: ${isLightCard ? '0 8px 25px -4px rgba(5, 150, 105, 0.2), 0 2px 8px rgba(0, 0, 0, 0.06)' : '0 0 35px rgba(0, 212, 170, 0.16), 0 8px 30px rgba(0, 0, 0, 0.35)'};
      position: relative;
      z-index: 2;
    }

    @media (min-width: 640px) {
      ${scope} .pricing-plan-card.featured {
        transform: scale(1.03);
      }
      ${scope} .pricing-plan-card.featured:hover {
        transform: scale(1.05) translateY(-2px);
      }
    }

    /* Badge Superior do Cartão Destacado */
    ${scope} .plan-badge-ribbon {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, ${isLightCard ? '#059669, #047857' : 'var(--accent, #00d4aa), #00b890'});
      color: #ffffff;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 4px 14px;
      border-radius: 9999px;
      white-space: nowrap;
      box-shadow: 0 4px 12px ${isLightCard ? 'rgba(5, 150, 105, 0.35)' : 'rgba(0, 212, 170, 0.35)'};
      z-index: 3;
    }

    /* Título do Plano */
    ${scope} .plan-title {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-top: 4px;
      margin-bottom: 8px;
    }

    ${scope} .pricing-plan-card.featured .plan-title {
      color: ${isLightCard ? '#059669' : 'var(--accent, #00d4aa)'};
    }

    /* Preço Rasurado de Ancoragem */
    ${scope} .plan-anchor-price {
      font-size: 12px;
      color: var(--text-muted);
      text-decoration: line-through;
      opacity: 0.65;
      font-weight: 600;
      margin-bottom: 2px;
    }

    /* Preço Principal */
    ${scope} .plan-price-wrapper {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      gap: 2px;
      margin-bottom: 4px;
      line-height: 1;
    }

    ${scope} .plan-currency {
      font-size: 16px;
      font-weight: 700;
      color: var(--text);
      margin-top: 8px;
    }

    ${scope} .plan-val-main {
      font-size: 46px;
      font-weight: 900;
      color: var(--text);
      letter-spacing: -0.02em;
    }

    ${scope} .pricing-plan-card.featured .plan-val-main {
      color: var(--accent, #00d4aa);
    }

    ${scope} .plan-cents {
      font-size: 18px;
      font-weight: 700;
      color: var(--text);
      margin-top: 8px;
    }

    ${scope} .pricing-plan-card.featured .plan-cents {
      color: var(--accent, #00d4aa);
    }

    /* Subtítulo / Nota do Período */
    ${scope} .plan-period-sub {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 14px;
    }

    ${scope} .pricing-plan-card.featured .plan-period-sub {
      color: var(--accent, #00d4aa);
    }

    /* Divisor */
    ${scope} .plan-divider {
      height: 1px;
      background: ${isLightCard ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'};
      margin: 12px 0 16px 0;
    }

    ${scope} .pricing-plan-card.featured .plan-divider {
      background: linear-gradient(90deg, transparent, rgba(0, 212, 170, 0.35), transparent);
    }

    /* Lista de Benefícios */
    ${scope} .plan-features-list {
      list-style: none;
      padding: 0;
      margin: 0 0 16px 0;
      text-align: left;
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
    }

    ${scope} .plan-feature-item {
      display: flex;
      align-items: flex-start;
      gap: 9px;
      font-size: 13px;
      color: var(--text);
      line-height: 1.4;
    }

    ${scope} .plan-check-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      color: var(--accent, #00d4aa);
      margin-top: 1px;
    }

    /* Box de Bônus dentro do Cartão */
    ${scope} .plan-bonus-box {
      background: ${isLightCard ? 'rgba(5, 150, 105, 0.08)' : 'rgba(0, 212, 170, 0.06)'};
      border: 1.5px solid ${isLightCard ? 'rgba(5, 150, 105, 0.3)' : 'rgba(0, 212, 170, 0.22)'};
      border-radius: 10px;
      padding: 10px 12px;
      margin: 8px 0 14px 0;
      text-align: left;
    }

    ${scope} .plan-bonus-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      margin-bottom: 4px;
    }

    ${scope} .plan-bonus-title {
      font-size: 12px;
      font-weight: 800;
      color: var(--text, #ffffff);
    }

    ${scope} .plan-bonus-tag {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      background: ${isLightCard ? 'rgba(5, 150, 105, 0.16)' : 'rgba(0, 212, 170, 0.2)'};
      color: ${isLightCard ? '#047857' : 'var(--accent, #00d4aa)'};
      padding: 2px 6px;
      border-radius: 4px;
    }

    ${scope} .plan-bonus-desc {
      font-size: 11px;
      color: var(--text);
      opacity: 0.85;
      line-height: 1.35;
    }

    /* Botão CTA do Plano */
    ${scope} .plan-cta-btn {
      width: 100%;
      display: block;
      padding: 14px 18px;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 800;
      text-align: center;
      text-decoration: none;
      cursor: pointer;
      border: 1px solid ${isLightCard ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)'};
      background: ${isLightCard ? '#0f172a' : '#192030'};
      color: #ffffff;
      transition: all 0.25s ease;
      box-sizing: border-box;
      margin-top: 10px;
    }

    ${scope} .plan-cta-btn:hover {
      background: #242e44;
      transform: scale(1.02);
    }

    ${scope} .pricing-plan-card.featured .plan-cta-btn {
      background: linear-gradient(135deg, var(--accent, #00d4aa), #00b890);
      color: #002a20;
      border: none;
      box-shadow: 0 4px 20px rgba(0, 212, 170, 0.4);
      animation: qfPlanPulse 2.2s infinite;
    }

    ${scope} .pricing-plan-card.featured .plan-cta-btn:hover {
      transform: scale(1.03);
      box-shadow: 0 6px 24px rgba(0, 212, 170, 0.55);
    }

    @keyframes qfPlanPulse {
      0%, 100% { box-shadow: 0 4px 20px rgba(0, 212, 170, 0.35); }
      50% { box-shadow: 0 4px 25px rgba(0, 212, 170, 0.65), 0 0 0 4px rgba(0, 212, 170, 0.15); }
    }

    /* Bloco de Garantia Incondicional (Imagem 2) */
    ${scope} .guarantee-card {
      background: ${isLightCard ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)'};
      border: 1.5px solid ${isLightCard ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.07)'};
      border-radius: var(--radius);
      padding: 32px 20px;
      text-align: center;
      margin: 18px 0;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    ${scope} .guarantee-tag {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--accent, #00d4aa);
    }

    ${scope} .guarantee-seal-wrap {
      margin: 4px auto 8px auto;
      display: inline-block;
      transition: transform 0.3s ease;
    }

    ${scope} .guarantee-seal-wrap:hover {
      transform: scale(1.05);
    }

    ${scope} .guarantee-seal-img {
      max-width: 140px;
      height: auto;
      display: block;
      margin: 0 auto;
      filter: drop-shadow(0 8px 24px rgba(245, 158, 11, 0.3));
    }

    ${scope} .guarantee-title {
      font-size: 26px;
      font-weight: 900;
      color: var(--text, #ffffff);
      letter-spacing: -0.01em;
      line-height: 1.25;
      margin: 4px 0;
      text-transform: uppercase;
    }

    ${scope} .guarantee-desc {
      font-size: 14px;
      color: var(--text);
      opacity: 0.88;
      line-height: 1.65;
      max-width: 620px;
      margin: 0 auto;
      white-space: pre-line;
      word-break: break-word;
    }

    ${scope} .guarantee-desc strong,
    ${scope} .guarantee-desc b {
      color: var(--text, #ffffff);
      font-weight: 800;
      opacity: 1;
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
  renderStepContentHtml(step, state = {}, isPreview = false, steps = []) {
    if (!step) return '';
    step = this.normalizeStep(step);

    if (!steps || steps.length === 0) {
      if (state && Array.isArray(state.steps)) steps = state.steps;
      else if (typeof window !== 'undefined' && window.App && window.App.currentQuiz && Array.isArray(window.App.currentQuiz.steps)) {
        steps = window.App.currentQuiz.steps;
      }
    }
    steps = steps || [];

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

      // 1. Bloco de Título / Texto (com Interpolação Dinâmica de Variáveis)
      if (block.type === 'heading') {
        const align = block.align || 'center';
        const titleSize = block.titleSize || 'md';
        const subtitleSize = block.subtitleSize || 'sm';
        const titleStyle = block.textColor ? `style="color: ${block.textColor};"` : '';

        const interpTag = this.interpolateDynamicText(block.tag || '', state, steps, isPreview);
        const interpTitle = this.interpolateDynamicText(block.title || '', state, steps, isPreview);
        const interpSub = this.interpolateDynamicText(block.subtitle || '', state, steps, isPreview);

        blockHtml += `<div class="step-header text-${align}">`;
        if (block.imageUrl) {
          blockHtml += `<div class="quiz-image-card align-${align} quiz-image-${block.imageSize || 'medium'}"><img src="${this.escapeHtml(block.imageUrl)}" alt="${this.escapeHtml(interpTitle)}" loading="lazy"></div>`;
        }
        if (interpTag) {
          blockHtml += '<span class="step-tag">' + this.formatMarkdown(interpTag) + '</span>';
        }
        if (interpTitle) {
          blockHtml += `<h2 class="step-title title-${titleSize}" ${titleStyle}>` + this.formatMarkdown(interpTitle) + '</h2>';
        }
        if (interpSub) {
          blockHtml += `<p class="step-subtitle sub-${subtitleSize}">` + this.formatMarkdown(interpSub) + '</p>';
        }
        blockHtml += '</div>';
      }

      // 1.1 Bloco de Imagem / Banner Independente
      else if (block.type === 'image') {
        const align = block.align || 'center';
        const size = block.imageSize || 'medium';
        const titleSize = block.titleSize || 'md';
        const titleColor = block.titleColor || block.textColor || '';
        const titleStyle = titleColor ? `style="color: ${titleColor};"` : '';
        const iTitle = this.interpolateDynamicText(block.title || '', state, steps, isPreview);
        const iCap = this.interpolateDynamicText(block.caption || '', state, steps, isPreview);
        blockHtml += `<div class="quiz-image-card align-${align} quiz-image-${size}">`;
        if (iTitle) {
          blockHtml += `<h3 class="quiz-image-title title-${titleSize}" ${titleStyle}>${this.formatMarkdown(iTitle)}</h3>`;
        }
        if (block.imageUrl) {
          blockHtml += `<img src="${this.escapeHtml(block.imageUrl)}" alt="${this.escapeHtml(block.altText || iTitle || '')}" loading="lazy">`;
        }
        if (iCap) {
          blockHtml += `<p class="quiz-image-caption">${this.formatMarkdown(iCap)}</p>`;
        }
        blockHtml += '</div>';
      }

      // 2. Bloco de Vídeo (YouTube OU Vídeo Direto .mp4 Hospedado)
      else if (block.type === 'video') {
        const videoUrl = (block.youtubeUrl || block.videoUrl || '').trim();
        if (videoUrl) {
          const videoId = this.extractYouTubeId(videoUrl);
          const isVertical = block.orientation === 'vertical' || block.videoOrientation === 'vertical';
          const cleanMask = block.cleanTopMask !== false;
          const autoplayMode = block.autoplayMode || 'none';
          const frameId = (isPreview ? 'preview-video-frame-' : 'quiz-video-frame-') + bIdx;
          const overlayId = (isPreview ? 'preview-unmute-overlay-' : 'quiz-unmute-overlay-') + bIdx;
          const posterId = (isPreview ? 'preview-video-poster-' : 'quiz-video-poster-') + bIdx;
          const unmuteCall = isPreview
            ? `App.unmuteVideo('${frameId}', '${overlayId}')`
            : `QuizApp.unmuteVideo('${frameId}', '${overlayId}')`;
          const onloadCall = isPreview
            ? `App.onVideoIframeLoad('${posterId}', '${frameId}')`
            : `QuizApp.onVideoIframeLoad('${posterId}', '${frameId}')`;

          // CASO A: VÍDEO DO YOUTUBE
          if (videoId) {
            const embedUrl = this.buildYouTubeEmbedUrl(block);
            const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

            blockHtml += `<div class="video-wrapper ${isVertical ? 'vertical' : 'horizontal'} ${cleanMask ? 'clean-mask' : ''}">`;

            // Poster Instantâneo Anti-Tela Preta com Capa e Spinner
            blockHtml += `
              <div class="video-poster-layer" id="${posterId}">
                <img src="${thumbUrl}" alt="Capa do Vídeo" class="video-poster-img" loading="eager">
                <div class="video-poster-spinner-wrap">
                  <div class="video-poster-spinner"></div>
                  <span class="video-poster-loading-text">Carregando vídeo...</span>
                </div>
              </div>
            `;

            blockHtml += `<iframe id="${frameId}" src="${embedUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen onload="${onloadCall}"></iframe>`;

            if (autoplayMode === 'muted_button') {
              const buttonText = block.unmuteButtonText || '🔊 Toque para Ativar o Áudio';
              blockHtml += `
                <div class="video-unmute-overlay" id="${overlayId}" onclick="${unmuteCall}">
                  <button type="button" class="video-unmute-btn">
                    <span>${this.escapeHtml(buttonText)}</span>
                  </button>
                </div>
              `;
            }

            blockHtml += '</div>';
          }
          // CASO B: VÍDEO DIRETO .MP4 / HOSPEDAGEM PRÓPRIA (HostGator, Cloudflare, etc.)
          else {
            const isMuted = autoplayMode !== 'none';
            const isAutoplay = autoplayMode !== 'none';
            const showControls = block.hideControls === false;
            const posterAttr = block.posterUrl ? `poster="${this.escapeHtml(block.posterUrl)}"` : '';

            blockHtml += `<div class="video-wrapper ${isVertical ? 'vertical' : 'horizontal'}" style="position:relative; background:#000; border-radius:12px; overflow:hidden;">`;

            blockHtml += `
              <video id="${frameId}" 
                src="${this.escapeHtml(videoUrl)}" 
                ${isAutoplay ? 'autoplay' : ''} 
                ${isMuted ? 'muted' : ''} 
                ${showControls ? 'controls' : ''} 
                playsinline 
                preload="auto" 
                loop 
                ${posterAttr} 
                style="width:100%; height:100%; object-fit:contain; display:block; background:#000;">
              </video>
            `;

            if (autoplayMode === 'muted_button') {
              const buttonText = block.unmuteButtonText || '🔊 Toque para Ativar o Áudio';
              blockHtml += `
                <div class="video-unmute-overlay" id="${overlayId}" onclick="${unmuteCall}">
                  <button type="button" class="video-unmute-btn">
                    <span>${this.escapeHtml(buttonText)}</span>
                  </button>
                </div>
              `;
            }

            blockHtml += '</div>';
          }
        }
      }

      // 3. Bloco HTML Livre / Aplicação Interativa (Iframe Sandbox ou Snippet)
      else if (block.type === 'html') {
        const isFullWidth = block.fullWidth !== false;
        const fullClass = isFullWidth ? 'full-bleed' : '';
        const height = block.iframeHeight || '650px';
        const isIframe = block.iframeUrl || block.htmlMode === 'iframe' || (block.htmlMode !== 'inline' && this.isFullHtmlDoc(block.customHtml));
        const customHtml = this.interpolateDynamicText(block.customHtml || '', state, steps, isPreview);

        if (block.iframeUrl && block.iframeUrl.trim() !== '') {
          blockHtml += `<div class="custom-html-container ${fullClass}">`;
          blockHtml += `<iframe src="${this.escapeHtml(block.iframeUrl)}" style="width:100%; min-height:${height}; border:none; border-radius:12px; display:block; background:transparent;" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals" loading="lazy"></iframe>`;
          blockHtml += '</div>';
        } else if (customHtml && customHtml.trim() !== '') {
          if (isIframe) {
            const frameId = (isPreview ? 'preview-html-frame-' : 'quiz-html-frame-') + bIdx;
            blockHtml += `<div class="custom-html-container ${fullClass}">`;
            blockHtml += `<iframe id="${frameId}" srcdoc="${this.escapeSrcdoc(customHtml)}" style="width:100%; min-height:${height}; border:none; border-radius:12px; display:block; background:transparent;" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals" loading="lazy"></iframe>`;
            blockHtml += '</div>';
          } else {
            blockHtml += `<div class="custom-html-container ${fullClass}">${customHtml}</div>`;
          }
        }
      }

      // 4. Bloco de Perguntas com Alternativas
      else if (block.type === 'question') {
        const align = block.align || 'left';
        if (block.options && block.options.length > 0) {
          blockHtml += `<div class="options-grid text-${align}">`;
          block.options.forEach((opt, optIdx) => {
            const isSelected = state.userAnswers && state.userAnswers[step.id] === optIdx;
            const isCustom = !!opt.allowCustomText;
            const customVal = (state.customAnswers && state.customAnswers[step.id]) || '';
            const inputId = isPreview ? `preview-custom-answer-${optIdx}` : `custom-answer-input-${optIdx}`;
            const submitCall = isPreview ? `App.previewSubmitCustomOption(${optIdx})` : `QuizApp.submitCustomOption(${optIdx})`;

            blockHtml += '<div class="option-item-wrap">';
            blockHtml += '<button type="button" class="option-btn ' + (isSelected ? 'selected' : '') + '" onclick="' + clickPrefix + '(' + optIdx + ')">';
            if (opt.icon) {
              blockHtml += '<span class="option-icon">' + opt.icon + '</span>';
            }
            blockHtml += '<span style="flex:1; text-align: ' + align + ';">' + this.escapeHtml(opt.text || '') + '</span>';
            if (isCustom) {
              blockHtml += '<span class="option-indicator" style="display:flex;align-items:center;justify-content:center;font-size:11px;" title="Permite digitar">✏️</span>';
            } else {
              blockHtml += '<span class="option-indicator"></span>';
            }
            blockHtml += '</button>';

            if (isCustom && isSelected) {
              blockHtml += `
                <div class="custom-answer-box animate-appear">
                  <input type="text" id="${inputId}" class="custom-answer-input" placeholder="${this.escapeHtml(opt.customPlaceholder || 'Digite sua resposta aqui...')}" value="${this.escapeHtml(customVal)}" onkeydown="if(event.key==='Enter'){event.preventDefault(); ${submitCall};}">
                  <button type="button" onclick="${submitCall}" class="custom-answer-submit-btn">
                    Continuar →
                  </button>
                </div>
              `;
            }
            blockHtml += '</div>';
          });
          blockHtml += '</div>';
        }
      }

      // 5. Bloco de Botão com Ação / Próxima Etapa
      else if (block.type === 'delay_button') {
        const rawBtnText = block.text || block.delayButtonText || 'Avançar para a próxima etapa →';
        const buttonText = this.interpolateDynamicText(rawBtnText, state, steps, isPreview);
        const buttonUrl = block.url || block.delayButtonUrl || '';
        const btnSize = block.buttonSize || 'large';
        const customColor = block.buttonColor ? `style="background: ${block.buttonColor}; border-color: ${block.buttonColor};"` : '';
        const sizeClass = `btn-size-${btnSize}`;

        blockHtml += '<div id="delayed-btn-box" class="delayed-cta-container">';
        if (buttonUrl) {
          blockHtml += '<a href="' + buttonUrl + '" target="_blank" class="cta-btn animate-appear link-trackable ' + sizeClass + '" ' + customColor + '>' + this.escapeHtml(buttonText) + '</a>';
        } else {
          blockHtml += '<button type="button" class="cta-btn animate-appear ' + sizeClass + '" ' + customColor + ' onclick="' + nextPrefix + '">' + this.escapeHtml(buttonText) + '</button>';
        }
        blockHtml += '</div>';
      }

      // 6. Bloco de Captura de Lead
      else if (block.type === 'lead_form') {
        const lead = state.leadData || {};
        const submitBtnText = this.interpolateDynamicText(block.submitButtonText || 'Ver Meu Resultado Agora →', state, steps, isPreview);
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

        blockHtml += '<button type="submit" class="cta-btn" style="margin-top: 8px;">' + this.escapeHtml(submitBtnText) + '</button>';
        blockHtml += '</form>';
      }

      // 7. Bloco de Oferta / Checkout Final (Multi-Planos ou Oferta Simples)
      else if (block.type === 'offer' || block.type === 'pricing_table') {
        blockHtml += this.renderOfferBlockHtml(block, isPreview, state, steps);
      }

      // 7.1 Bloco de Garantia Incondicional / Risco Zero
      else if (block.type === 'guarantee') {
        blockHtml += this.renderGuaranteeBlockHtml(block, state, steps, isPreview);
      }

      // 8. NOVO BLOCO: Barra de Carregamento e Análise (fake_loader)
      else if (block.type === 'fake_loader') {
        const rawMsgs = block.messages || 'Analisando suas respostas...\nCruzando com nosso banco de dados...\nCalculando seu perfil ideal...\nDiagnóstico pronto!';
        const messages = (Array.isArray(rawMsgs) ? rawMsgs : rawMsgs.split('\n')).map(m => this.interpolateDynamicText(m.trim(), state, steps, isPreview)).filter(Boolean);
        const firstMsg = messages.length > 0 ? messages[0] : 'Iniciando análise...';
        blockHtml += '<div class="fake-loader-card">';
        blockHtml += '<div class="loader-spinner"></div>';
        blockHtml += '<div id="loader-percent" class="loader-percent">0%</div>';
        blockHtml += '<div class="loader-bar-wrapper">';
        blockHtml += '<div id="loader-bar" class="loader-bar-fill"></div>';
        blockHtml += '</div>';
        blockHtml += '<div id="loader-msg" class="loader-msg">' + this.escapeHtml(firstMsg) + '</div>';
        blockHtml += '</div>';
      }

      // 9. NOVO BLOCO: Gráfico de Potencial e Projeção (potential_chart)
      else if (block.type === 'potential_chart') {
        const title = this.interpolateDynamicText(block.chartTitle || 'Projeção de Evolução', state, steps, isPreview);
        const style = block.chartStyle || 'curve';
        const startLabel = this.interpolateDynamicText(block.startLabel || 'Seu estágio hoje', state, steps, isPreview);
        const endLabel = this.interpolateDynamicText(block.endLabel || 'Seu potencial com o método', state, steps, isPreview);
        const showValues = block.showValues !== false;
        const startVal = this.interpolateDynamicText(block.startValue || '24%', state, steps, isPreview);
        const endVal = this.interpolateDynamicText(block.endValue || '92%', state, steps, isPreview);
        const startColor = block.startColor || '#ef4444';
        const endColor = block.endColor || '#10b981';
        const duration = parseFloat(block.animationDuration) || 2.5;
        const chartId = 'chart_' + Math.random().toString(36).substr(2, 6);

        blockHtml += '<div class="potential-chart-card">';
        if (title.trim()) {
          blockHtml += '<div class="potential-chart-title">' + this.escapeHtml(title) + '</div>';
        }

        if (style === 'bars') {
          let sHeight = parseInt(startVal, 10);
          if (isNaN(sHeight)) sHeight = 28;
          sHeight = Math.max(15, Math.min(100, sHeight));
          let eHeight = parseInt(endVal, 10);
          if (isNaN(eHeight)) eHeight = 92;
          eHeight = Math.max(15, Math.min(100, eHeight));

          blockHtml += '<div class="bars-chart-container">';
          blockHtml += '<div class="bar-col">';
          if (showValues) {
            blockHtml += '<div class="bar-value" style="color: ' + startColor + ';">' + this.escapeHtml(startVal) + '</div>';
          }
          blockHtml += '<div class="bar-track"><div class="bar-fill" style="--bar-color: ' + startColor + '; --target-height: ' + sHeight + '%;"></div></div>';
          blockHtml += '<div class="bar-label">' + this.escapeHtml(startLabel) + '</div>';
          blockHtml += '</div>';

          blockHtml += '<div class="bar-arrow">➔</div>';

          blockHtml += '<div class="bar-col">';
          if (showValues) {
            blockHtml += '<div class="bar-value" style="color: ' + endColor + ';">' + this.escapeHtml(endVal) + '</div>';
          }
          blockHtml += '<div class="bar-track"><div class="bar-fill" style="--bar-color: ' + endColor + '; --target-height: ' + eHeight + '%;"></div></div>';
          blockHtml += '<div class="bar-label">' + this.escapeHtml(endLabel) + '</div>';
          blockHtml += '</div>';
          blockHtml += '</div>';
        } else {
          blockHtml += '<div class="curve-chart-wrapper" style="--anim-dur: ' + duration + 's;">';
          blockHtml += '<svg class="curve-svg" viewBox="0 0 320 130" preserveAspectRatio="none">';
          blockHtml += '<defs>';
          blockHtml += '<linearGradient id="curveGrad_' + chartId + '" x1="0%" y1="0%" x2="100%" y2="0%">';
          blockHtml += '<stop offset="0%" stop-color="' + startColor + '" />';
          blockHtml += '<stop offset="100%" stop-color="' + endColor + '" />';
          blockHtml += '</linearGradient>';
          blockHtml += '<linearGradient id="areaGrad_' + chartId + '" x1="0%" y1="0%" x2="0%" y2="100%">';
          blockHtml += '<stop offset="0%" stop-color="' + endColor + '" stop-opacity="0.22" />';
          blockHtml += '<stop offset="100%" stop-color="' + endColor + '" stop-opacity="0.0" />';
          blockHtml += '</linearGradient>';
          blockHtml += '</defs>';

          blockHtml += '<path class="chart-area-fade" d="M 20 105 C 100 105, 180 80, 300 25 L 300 120 L 20 120 Z" fill="url(#areaGrad_' + chartId + ')" />';
          blockHtml += '<line x1="20" y1="120" x2="300" y2="120" stroke="rgba(128,128,128,0.2)" stroke-dasharray="3,3" stroke-width="1" />';
          blockHtml += '<path class="chart-curve-path" d="M 20 105 C 100 105, 180 80, 300 25" fill="none" stroke="url(#curveGrad_' + chartId + ')" stroke-width="4" stroke-linecap="round" />';

          blockHtml += '<circle cx="20" cy="105" r="5" fill="' + startColor + '" />';
          blockHtml += '<circle cx="20" cy="105" r="8" fill="' + startColor + '" opacity="0.3" />';
          blockHtml += '<circle cx="300" cy="25" r="6" fill="' + endColor + '" />';
          blockHtml += '<circle cx="300" cy="25" r="10" fill="' + endColor + '" opacity="0.4" />';
          blockHtml += '</svg>';

          blockHtml += '<div class="chart-badges-container">';
          blockHtml += '<div class="chart-badge start-badge" style="border-left-color: ' + startColor + ';">';
          blockHtml += '<div class="badge-title">' + this.escapeHtml(startLabel) + '</div>';
          if (showValues) {
            blockHtml += '<div class="badge-number" style="color: ' + startColor + ';">' + this.escapeHtml(startVal) + '</div>';
          }
          blockHtml += '</div>';

          blockHtml += '<div class="chart-badge end-badge" style="border-right-color: ' + endColor + ';">';
          blockHtml += '<div class="badge-title">' + this.escapeHtml(endLabel) + '</div>';
          if (showValues) {
            blockHtml += '<div class="badge-number" style="color: ' + endColor + ';">' + this.escapeHtml(endVal) + '</div>';
          }
          blockHtml += '</div>';
          blockHtml += '</div>';
          blockHtml += '</div>';
        }

        blockHtml += '</div>';
      }

      // 10. NOVO BLOCO: Avaliações & Depoimentos (reviews)
      else if (block.type === 'reviews') {
        blockHtml += this.renderReviewsBlockHtml(block);
      }

      // 11. NOVO BLOCO: Dúvidas Frequentes / FAQ (faq)
      else if (block.type === 'faq') {
        blockHtml += this.renderFaqBlockHtml(block);
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

  <!-- Otimização de Performance e Pré-carregamento do YouTube -->
  <link rel="preconnect" href="https://www.youtube-nocookie.com">
  <link rel="preconnect" href="https://www.youtube.com">
  <link rel="preconnect" href="https://i.ytimg.com">
  <link rel="preconnect" href="https://img.youtube.com">
  <link rel="preconnect" href="https://googlevideo.com">
  <link rel="dns-prefetch" href="https://googlevideo.com">
  <link rel="dns-prefetch" href="https://www.youtube-nocookie.com">
  <link rel="dns-prefetch" href="https://i.ytimg.com">
  <link rel="dns-prefetch" href="https://img.youtube.com">

  ${this.generateTrackingHead(tracking)}
  ${tracking.customHeadScripts || ''}

  <style>
    ${this.generateThemeCss(theme, '')}
  </style>
</head>
<body>
  ${tracking.customBodyTopScripts || ''}

  <div class="quiz-container">
    <div id="progress-section" style="${(theme.showProgressBar === false || (theme.hideUntilFirstClick !== false && (!initialStep || initialStep === 0))) ? 'display: none;' : ''}">
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
      customAnswers: {},
      hasAnswered: false,
      totalScore: 0,
      leadData: {},
      stepTimers: [],
      utmParams: {},
      sessionId: null,

      init() {
        try {
          this.sessionId = this.getOrCreateSessionId();
          this.utmParams = this.captureUtms();
          try { this.preloadVideos(this.config.steps); } catch(e) { console.warn('Preload warning:', e); }
          const startStep = (typeof window.QUIZ_INITIAL_STEP === 'number' && window.QUIZ_INITIAL_STEP < this.config.steps.length) ? window.QUIZ_INITIAL_STEP : 0;
          this.renderStep(startStep);
        } catch(err) {
          console.error('QuizApp init error:', err);
          const c = document.getElementById('step-content');
          if (c) c.innerHTML = '<div style="padding:24px;color:#ef4444;text-align:center;font-weight:600;">Ocorreu um erro ao carregar o quiz.<br><span style="font-size:12px;opacity:0.8;">' + (err && err.message ? err.message : err) + '</span></div>';
        }
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

      interpolateDynamicText(text) {
        if (!text && text !== 0) return '';
        if (typeof text !== 'string') text = String(text);
        const steps = this.config.steps || [];
        const state = {
          userAnswers: this.userAnswers || {},
          customAnswers: this.customAnswers || {},
          leadData: this.leadData || {},
          totalScore: this.totalScore || 0
        };

        return text.replace(/\\{([a-zA-Z0-9_]+)(?:\\|([^}]+))?\\}/g, (match, rawTag, fallback) => {
          const tag = rawTag.toLowerCase();
          const defaultVal = fallback !== undefined ? fallback : '';
          const lead = state.leadData || {};

          // 1. Lead
          if (tag === 'nome' || tag === 'name') {
            return lead.name || defaultVal || '';
          }
          if (tag === 'primeiro_nome' || tag === 'first_name') {
            const pName = lead.name ? lead.name.trim().split(' ')[0] : '';
            return pName || defaultVal || '';
          }
          if (tag === 'whatsapp' || tag === 'telefone' || tag === 'phone') {
            return lead.whatsapp || defaultVal || '';
          }
          if (tag === 'email' || tag === 'e-mail') {
            return lead.email || defaultVal || '';
          }

          // 2. Pontuação
          if (tag === 'score' || tag === 'pontos') {
            return (state.totalScore !== undefined && state.totalScore !== null) ? state.totalScore : (defaultVal || 0);
          }

          // 3. Respostas das Perguntas / Etapas
          const respMatch = tag.match(/^(resposta|resp|pergunta|perg)(?:_etapa)?_(\\d+)$/);
          if (respMatch) {
            const type = respMatch[1];
            const num = parseInt(respMatch[2], 10);
            if (isNaN(num) || num <= 0) return match;

            let targetStep = steps[num - 1];
            const questionSteps = steps.filter(s => (s.blocks || []).some(b => b.type === 'question'));

            if (!targetStep || !(targetStep.blocks || []).some(b => b.type === 'question')) {
              if (questionSteps[num - 1]) {
                targetStep = questionSteps[num - 1];
              }
            }

            if (!targetStep) return defaultVal || '';

            const qBlock = (targetStep.blocks || []).find(b => b.type === 'question');
            const hBlock = (targetStep.blocks || []).find(b => b.type === 'heading');

            if (type.startsWith('perg')) {
              return (hBlock && (hBlock.title || hBlock.tag)) || targetStep.title || ('Pergunta ' + num);
            }

            const userAnswers = state.userAnswers || {};
            const customAnswers = state.customAnswers || {};
            const optIdx = userAnswers[targetStep.id];
            const customVal = customAnswers[targetStep.id];

            if (optIdx !== undefined && qBlock && qBlock.options && qBlock.options[optIdx]) {
              const opt = qBlock.options[optIdx];
              if (customVal && opt.allowCustomText) {
                return customVal;
              }
              return opt.text || '';
            }

            return defaultVal || '';
          }

          return match;
        });
      },

      getCookie(name) {
        try {
          const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
          return match ? decodeURIComponent(match[1]) : '';
        } catch(e) { return ''; }
      },

      refreshMetaCookies() {
        try {
          if (!this.utmParams) this.utmParams = {};
          const fbpCookie = this.getCookie('_fbp');
          if (fbpCookie && !this.utmParams.fbp) this.utmParams.fbp = fbpCookie;

          let fbcCookie = this.getCookie('_fbc');
          if (!fbcCookie && this.utmParams.fbclid) {
            fbcCookie = 'fb.1.' + Date.now() + '.' + this.utmParams.fbclid;
          }
          if (fbcCookie && !this.utmParams.fbc) this.utmParams.fbc = fbcCookie;
          if (this.sessionId && !this.utmParams.external_id) this.utmParams.external_id = this.sessionId;
        } catch(e) {}
      },

      captureUtms() {
        const utms = {};
        try {
          const params = new URLSearchParams(window.location.search);
          for (const [key, value] of params.entries()) {
            utms[key] = value;
          }
        } catch (e) {}

        // Identificadores Avançados de Correspondência da Meta (fbc, fbp, external_id)
        try {
          const fbpCookie = this.getCookie('_fbp');
          if (fbpCookie) utms.fbp = fbpCookie;

          let fbcCookie = this.getCookie('_fbc');
          if (!fbcCookie && utms.fbclid) {
            fbcCookie = 'fb.1.' + Date.now() + '.' + utms.fbclid;
          }
          if (fbcCookie) utms.fbc = fbcCookie;
        } catch(e) {}

        if (this.sessionId) {
          utms.external_id = this.sessionId;
        }

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

      injectUtmsIntoHtmlString(rawHtml) {
        return rawHtml;
      },

      applyUtmsToLinks() {
        const selectors = [
          '.link-trackable',
          '.cta-btn[href]',
          '.plan-cta-btn[href]',
          '.pricing-plans-grid a[href]',
          '.offer-container a[href]',
          'a[href*="kirvano.com"]',
          'a[href*="perfectpay.com.br"]',
          'a[href*="kiwify.com.br"]',
          'a[href*="hotmart.com"]',
          'a[href*="eduzz.com"]',
          'a[href*="monetizze.com.br"]',
          'a[href*="checkout"]',
          'a[href*="pay."]'
        ];
        const links = document.querySelectorAll(selectors.join(', '));
        links.forEach(link => {
          this.bindTrackableLink(link);
        });

        // Inspeciona e ajusta iframes na página (apenas auto-resize de altura, sem alterar links nem capturar cliques internos)
        const iframes = document.querySelectorAll('.custom-html-container iframe');
        iframes.forEach(iframe => {
          this.setupIframeAutoResize(iframe);
        });
      },

      setupIframeAutoResize(iframe) {
        if (!iframe) return;

        const updateHeight = () => {
          try {
            const doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
            if (!doc) return;
            const body = doc.body;
            const html = doc.documentElement;
            if (!body && !html) return;

            if (body) {
              body.style.margin = '0';
            }

            const measured = [
              body ? body.scrollHeight : 0,
              body ? body.offsetHeight : 0,
              html ? html.scrollHeight : 0,
              html ? html.offsetHeight : 0
            ];

            if (body && body.children) {
              for (let i = 0; i < body.children.length; i++) {
                const el = body.children[i];
                if (el && el.offsetHeight) {
                  measured.push(el.offsetTop + el.offsetHeight);
                }
              }
            }

            const maxH = Math.max(...measured);
            if (maxH > 40) {
              iframe.style.height = (maxH + 25) + 'px';
            }
          } catch (err) {}
        };

        const attach = () => {
          try {
            const doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
            if (!doc) return;

            updateHeight();

            if (window.ResizeObserver) {
              const ro = new ResizeObserver(() => updateHeight());
              if (doc.body) ro.observe(doc.body);
              if (doc.documentElement) ro.observe(doc.documentElement);
            }

            if (window.MutationObserver && doc.body) {
              const mo = new MutationObserver(() => updateHeight());
              mo.observe(doc.body, { childList: true, subtree: true, attributes: true });
            }

            const imgs = doc.querySelectorAll('img');
            imgs.forEach(img => {
              if (!img.complete) {
                img.addEventListener('load', updateHeight);
                img.addEventListener('error', updateHeight);
              }
            });
          } catch(e) {}
        };

        try {
          iframe.addEventListener('load', () => {
            attach();
            setTimeout(updateHeight, 50);
            setTimeout(updateHeight, 200);
            setTimeout(updateHeight, 500);
            setTimeout(updateHeight, 1000);
            setTimeout(updateHeight, 2000);
            setTimeout(updateHeight, 3500);
          });
        } catch(e) {}

        attach();
        setTimeout(updateHeight, 50);
        setTimeout(updateHeight, 200);
        setTimeout(updateHeight, 600);
        setTimeout(updateHeight, 1500);
      },

      bindTrackableLink(link, isInsideIframe = false) {
        if (!link) return;
        const href = link.getAttribute('href');
        if (href && href !== '#' && !href.startsWith('javascript:')) {
          this.refreshMetaCookies();
          if (this.utmParams && Object.keys(this.utmParams).length > 0) {
            link.setAttribute('href', this.appendUtmsToUrl(href));
          }
          if (!link.dataset.checkoutBound) {
            link.dataset.checkoutBound = 'true';
            link.addEventListener('click', () => {
              try {
                this.refreshMetaCookies();
                link.setAttribute('href', this.appendUtmsToUrl(link.getAttribute('href') || href));
                this.trackFunnelEvent('Checkout_Iniciado', {
                  checkoutUrl: link.getAttribute('href') || href,
                  stepIndex: this.currentStepIndex,
                  fromIframe: isInsideIframe
                });
              } catch(e) {}
            });
          }
        }
      },

      calculateProgress(index, totalSteps) {
        if (totalSteps <= 0) return 0;
        const theme = this.config.theme || {};
        const rawStart = theme.startPercent !== undefined ? theme.startPercent : 60;
        const startPercent = Math.max(0, Math.min(95, parseInt(rawStart, 10) || 0));
        if (startPercent <= 0) {
          return Math.min(100, Math.round(((index + 1) / totalSteps) * 100));
        }
        const hideUntilClick = theme.hideUntilFirstClick !== false;
        const firstVisibleStep = hideUntilClick ? 1 : 0;

        if (totalSteps <= 1 || index >= totalSteps - 1) return 100;
        if (index <= firstVisibleStep) {
          return startPercent;
        }

        const remainingSteps = (totalSteps - 1) - firstVisibleStep;
        if (remainingSteps <= 0) return 100;

        const factor = (index - firstVisibleStep) / remainingSteps;
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
        try {
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
          const progressSection = document.getElementById('progress-section');

          const theme = this.config.theme || {};
          const showProgress = (theme.showProgressBar !== false);
          const hideUntilClick = (theme.hideUntilFirstClick !== false);
          // Se "Ocultar até 1º clique" estiver ativo, a barra NUNCA aparece na primeira etapa (index === 0), surgindo apenas a partir da 2ª etapa!
          const shouldShowProgress = showProgress && (!hideUntilClick || index > 0);

          if (progressSection) {
            progressSection.style.display = shouldShowProgress ? 'block' : 'none';
          }

          const format = theme.progressTextFormat || 'full';
          const progressTextWrapper = progressSection ? progressSection.querySelector('.progress-text') : null;
          if (progressTextWrapper) {
            progressTextWrapper.style.display = format === 'none' ? 'none' : 'flex';
          }

          if (progressBar) progressBar.style.width = percent + '%';
          if (progressPercent) {
            if (format === 'none' || format === 'simple') {
              progressPercent.style.display = 'none';
            } else {
              progressPercent.style.display = 'inline';
              progressPercent.innerText = percent + '%';
            }
          }
          if (stepIndicator) {
            stepIndicator.innerText = this.getProgressText(index, totalSteps, percent);
            stepIndicator.style.display = (format === 'none' || format === 'percent_only') ? 'none' : 'inline';
          }

          // Botão voltar visível se não for o primeiro
          const backBtn = document.getElementById('btn-back');
          if (backBtn) {
            backBtn.style.display = index > 0 ? 'inline-flex' : 'none';
          }

          // Suporte a etapa com fundo transparente / sem moldura (bloco HTML borderless)
          const cardEl = document.getElementById('quiz-card');
          const hasBorderless = (step.blocks || []).some(b => b.type === 'html' && b.borderless);
          if (cardEl) {
            if (hasBorderless) cardEl.classList.add('card-borderless');
            else cardEl.classList.remove('card-borderless');
          }

          try {
            this.trackFunnelEvent('Quiz_Etapa_' + (index + 1), {
              stepIndex: index + 1,
              stepTitle: step.title || 'Sem título'
            });
          } catch(tErr) { console.warn('Track error:', tErr); }

          // Renderiza conteúdo
          const renderedContent = this.renderStepHtml(step);
          if (container) {
            container.innerHTML = renderedContent || '<div style="text-align: center; padding: 24px; color: var(--text-muted);">Etapa sem conteúdo visível.</div>';
          }

          // Ajusta a altura dos iframes na etapa
          if (container) {
            const htmlFrames = container.querySelectorAll('.custom-html-container iframe');
            htmlFrames.forEach(frame => {
              this.setupIframeAutoResize(frame);
            });
          }

          // Preserva e repassa UTMs para links gerados
          this.applyUtmsToLinks();

          // Inicializa Universal Delays e Fake Loaders
          this.initStepTimers(step);

          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch(renderErr) {
          console.error('QuizApp.renderStep error:', renderErr);
          const container = document.getElementById('step-content');
          if (container) {
            container.innerHTML = '<div style="padding: 24px; text-align: center; color: #ef4444; font-weight: 600;">Ocorreu um erro ao carregar esta etapa.<br><span style="font-size: 12px; opacity: 0.8; font-weight: normal;">' + (renderErr && renderErr.message ? renderErr.message : renderErr) + '</span></div>';
          }
        }
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
                const f = el.querySelector('iframe');
                if (f) this.setupIframeAutoResize(f);
                setTimeout(() => {
                  el.style.opacity = '1';
                  el.style.transition = 'opacity 0.4s ease';
                  if (f) this.setupIframeAutoResize(f);
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
        const messages = (Array.isArray(rawMsgs) ? rawMsgs : rawMsgs.split('\\n'))
          .map(m => this.interpolateDynamicText(m.trim()))
          .filter(Boolean);

        const barEl = document.getElementById('loader-bar');
        const pctEl = document.getElementById('loader-percent');
        const msgEl = document.getElementById('loader-msg');
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
            const align = block.align || 'center';
            const titleSize = block.titleSize || 'md';
            const subtitleSize = block.subtitleSize || 'sm';
            const titleStyle = block.textColor ? 'style=\"color: ' + block.textColor + ';\"' : '';

            const iTag = this.interpolateDynamicText(block.tag || '');
            const iTitle = this.interpolateDynamicText(block.title || '');
            const iSub = this.interpolateDynamicText(block.subtitle || '');

            bHtml += '<div class=\"step-header text-' + align + '\">';
            if (block.imageUrl) {
              bHtml += '<div class=\"quiz-image-card align-' + align + ' quiz-image-' + (block.imageSize || 'medium') + '\"><img src=\"' + this.escapeHtml(block.imageUrl) + '\" alt=\"' + this.escapeHtml(iTitle) + '\" loading=\"lazy\"></div>';
            }
            if (iTag) bHtml += '<span class=\"step-tag\">' + this.formatMarkdown(iTag) + '</span>';
            if (iTitle) bHtml += '<h2 class=\"step-title title-' + titleSize + '\" ' + titleStyle + '>' + this.formatMarkdown(iTitle) + '</h2>';
            if (iSub) bHtml += '<p class=\"step-subtitle sub-' + subtitleSize + '\">' + this.formatMarkdown(iSub) + '</p>';
            bHtml += '</div>';
          }
          else if (block.type === 'image') {
            const align = block.align || 'center';
            const size = block.imageSize || 'medium';
            const titleSize = block.titleSize || 'md';
            const titleColor = block.titleColor || block.textColor || '';
            const titleStyle = titleColor ? 'style=\"color: ' + titleColor + ';\"' : '';
            const iTitle = this.interpolateDynamicText(block.title || '');
            const iCap = this.interpolateDynamicText(block.caption || '');
            bHtml += '<div class=\"quiz-image-card align-' + align + ' quiz-image-' + size + '\">';
            if (iTitle) {
              bHtml += '<h3 class=\"quiz-image-title title-' + titleSize + '\" ' + titleStyle + '>' + this.formatMarkdown(iTitle) + '</h3>';
            }
            if (block.imageUrl) {
              bHtml += '<img src=\"' + this.escapeHtml(block.imageUrl) + '\" alt=\"' + this.escapeHtml(block.altText || iTitle) + '\" loading=\"lazy\">';
            }
            if (iCap) {
              bHtml += '<p class=\"quiz-image-caption\">' + this.formatMarkdown(iCap) + '</p>';
            }
            bHtml += '</div>';
          }
          else if (block.type === 'video') {
            const videoUrl = (block.youtubeUrl || block.videoUrl || '').trim();
            if (videoUrl) {
              const videoId = this.extractYouTubeId(videoUrl);
              const isVertical = block.orientation === 'vertical' || block.videoOrientation === 'vertical';
              const cleanMask = block.cleanTopMask !== false;
              const autoplayMode = block.autoplayMode || 'none';
              const frameId = 'quiz-video-frame-' + bIdx;
              const overlayId = 'quiz-unmute-overlay-' + bIdx;
              const posterId = 'quiz-video-poster-' + bIdx;

              // CASO A: VÍDEO DO YOUTUBE
              if (videoId) {
                const embedUrl = this.buildYouTubeEmbedUrl(block);
                const thumbUrl = 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg';

                bHtml += '<div class=\"video-wrapper ' + (isVertical ? 'vertical' : 'horizontal') + ' ' + (cleanMask ? 'clean-mask' : '') + '\">';

                bHtml += '<div class=\"video-poster-layer\" id=\"' + posterId + '\">';
                bHtml += '<img src=\"' + thumbUrl + '\" alt=\"Capa do Vídeo\" class=\"video-poster-img\" loading=\"eager\">';
                bHtml += '<div class=\"video-poster-spinner-wrap\"><div class=\"video-poster-spinner\"></div><span class=\"video-poster-loading-text\">Carregando vídeo...</span></div>';
                bHtml += '</div>';

                bHtml += '<iframe id=\"' + frameId + '\" src=\"' + embedUrl + '\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture\" allowfullscreen onload=\"QuizApp.onVideoIframeLoad(\\\'' + posterId + '\\\', \\\'' + frameId + '\\\')\"></iframe>';

                if (autoplayMode === 'muted_button') {
                  const buttonText = block.unmuteButtonText || '🔊 Toque para Ativar o Áudio';
                  bHtml += '<div class=\"video-unmute-overlay\" id=\"' + overlayId + '\" onclick=\"QuizApp.unmuteVideo(\\\'' + frameId + '\\\', \\\'' + overlayId + '\\\')\">';
                  bHtml += '<button type=\"button\" class=\"video-unmute-btn\"><span>' + this.escapeHtml(buttonText) + '</span></button>';
                  bHtml += '</div>';
                }

                bHtml += '</div>';
              }
              // CASO B: VÍDEO DIRETO .MP4 / HOSPEDAGEM PRÓPRIA (HostGator, Cloudflare, etc.)
              else {
                const isMuted = autoplayMode !== 'none';
                const isAutoplay = autoplayMode !== 'none';
                const showControls = block.hideControls === false;
                const posterAttr = block.posterUrl ? ' poster=\"' + this.escapeHtml(block.posterUrl) + '\"' : '';

                bHtml += '<div class=\"video-wrapper ' + (isVertical ? 'vertical' : 'horizontal') + '\" style=\"position:relative; background:#000; border-radius:12px; overflow:hidden;\">';
                bHtml += '<video id=\"' + frameId + '\" src=\"' + this.escapeHtml(videoUrl) + '\" ' + (isAutoplay ? 'autoplay' : '') + ' ' + (isMuted ? 'muted' : '') + ' ' + (showControls ? 'controls' : '') + ' playsinline preload=\"auto\" loop ' + posterAttr + ' style=\"width:100%; height:100%; object-fit:contain; display:block; background:#000;\"></video>';

                if (autoplayMode === 'muted_button') {
                  const buttonText = block.unmuteButtonText || '🔊 Toque para Ativar o Áudio';
                  bHtml += '<div class=\"video-unmute-overlay\" id=\"' + overlayId + '\" onclick=\"QuizApp.unmuteVideo(\\\'' + frameId + '\\\', \\\'' + overlayId + '\\\')\">';
                  bHtml += '<button type=\"button\" class=\"video-unmute-btn\"><span>' + this.escapeHtml(buttonText) + '</span></button>';
                  bHtml += '</div>';
                }

                bHtml += '</div>';
              }
            }
          }
          else if (block.type === 'html') {
            const isFullWidth = block.fullWidth !== false;
            const fullClass = isFullWidth ? 'full-bleed' : '';
            const height = block.iframeHeight || '650px';
            const isIframe = block.iframeUrl || block.htmlMode === 'iframe' || (block.htmlMode !== 'inline' && this.isFullHtmlDoc(block.customHtml));
            const customHtml = this.interpolateDynamicText(block.customHtml || '');

            if (block.iframeUrl && block.iframeUrl.trim() !== '') {
              bHtml += '<div class=\"custom-html-container ' + fullClass + '\">';
              bHtml += '<iframe src=\"' + this.escapeHtml(block.iframeUrl.trim()) + '\" style=\"width:100%; min-height:' + height + '; border:none; border-radius:12px; display:block; background:transparent;\" sandbox=\"allow-scripts allow-same-origin allow-forms allow-popups allow-modals\" loading=\"lazy\"></iframe>';
              bHtml += '</div>';
            } else if (customHtml && customHtml.trim() !== '') {
              if (isIframe) {
                bHtml += '<div class=\"custom-html-container ' + fullClass + '\">';
                bHtml += '<iframe id=\"quiz-html-frame-' + bIdx + '\" srcdoc=\"' + this.escapeSrcdoc(customHtml) + '\" style=\"width:100%; min-height:' + height + '; border:none; border-radius:12px; display:block; background:transparent;\" sandbox=\"allow-scripts allow-same-origin allow-forms allow-popups allow-modals\" loading=\"lazy\"></iframe>';
                bHtml += '</div>';
              } else {
                bHtml += '<div class=\"custom-html-container ' + fullClass + '\">' + customHtml + '</div>';
              }
            }
          }
          else if (block.type === 'question') {
            const align = block.align || 'left';
            if (block.options && block.options.length > 0) {
              bHtml += '<div class=\"options-grid text-' + align + '\">';
              block.options.forEach((opt, optIdx) => {
                const isSelected = this.userAnswers && this.userAnswers[step.id] === optIdx;
                const isCustom = !!opt.allowCustomText;
                const customVal = (this.customAnswers && this.customAnswers[step.id]) || '';

                bHtml += '<div class=\"option-item-wrap\">';
                bHtml += '<button type=\"button\" class=\"option-btn ' + (isSelected ? 'selected' : '') + '\" onclick=\"QuizApp.handleOptionSelect(' + optIdx + ')\">';
                if (opt.icon) bHtml += '<span class=\"option-icon\">' + opt.icon + '</span>';
                bHtml += '<span style=\"flex:1; text-align: ' + align + ';\">' + this.escapeHtml(opt.text || '') + '</span>';
                if (isCustom) {
                  bHtml += '<span class=\"option-indicator\" style=\"display:flex;align-items:center;justify-content:center;font-size:11px;\" title=\"Permite digitar\">✏️</span>';
                } else {
                  bHtml += '<span class=\"option-indicator\"></span>';
                }
                bHtml += '</button>';

                if (isCustom && isSelected) {
                  bHtml += '<div class=\"custom-answer-box animate-appear\">';
                  bHtml += '<input type=\"text\" id=\"custom-answer-input-' + optIdx + '\" class=\"custom-answer-input\" placeholder=\"' + this.escapeHtml(opt.customPlaceholder || 'Digite sua resposta aqui...') + '\" value=\"' + this.escapeHtml(customVal) + '\" onkeydown=\"if(event.key===\\\'Enter\\\'){event.preventDefault(); QuizApp.submitCustomOption(' + optIdx + ');}\">';
                  bHtml += '<button type=\"button\" onclick=\"QuizApp.submitCustomOption(' + optIdx + ')\" class=\"custom-answer-submit-btn\">Continuar →</button>';
                  bHtml += '</div>';
                }
                bHtml += '</div>';
              });
              bHtml += '</div>';
            }
          }
          else if (block.type === 'delay_button') {
            const rawBtn = block.text || block.delayButtonText || 'Avançar para a próxima etapa →';
            const btnText = this.interpolateDynamicText(rawBtn);
            const btnUrl = block.url || block.delayButtonUrl || '';
            const btnSize = block.buttonSize || 'large';
            const customColor = block.buttonColor ? 'style=\"background: ' + block.buttonColor + '; border-color: ' + block.buttonColor + ';\"' : '';
            const sizeClass = 'btn-size-' + btnSize;

            bHtml += '<div id=\"delayed-btn-box\" class=\"delayed-cta-container\">';
            if (btnUrl) {
              bHtml += '<a href=\"' + btnUrl + '\" target=\"_blank\" class=\"cta-btn animate-appear link-trackable ' + sizeClass + '\" ' + customColor + '>' + this.escapeHtml(btnText) + '</a>';
            } else {
              bHtml += '<button type=\"button\" class=\"cta-btn animate-appear ' + sizeClass + '" ' + customColor + ' onclick=\"QuizApp.nextStep()\">' + this.escapeHtml(btnText) + '</button>';
            }
            bHtml += '</div>';
          }
          else if (block.type === 'lead_form') {
            const lead = this.leadData || {};
            const submitBtnText = this.interpolateDynamicText(block.submitButtonText || 'Ver Meu Resultado Agora →');
            bHtml += '<form class=\"lead-form\" onsubmit=\"QuizApp.handleLeadSubmit(event)\">';
            bHtml += '<div class=\"form-group\"><label class=\"form-label\">Seu Nome Completo:</label><input type=\"text\" id=\"lead-name\" class=\"form-input\" placeholder=\"Como podemos te chamar?\" required value=\"' + (lead.name || '') + '\"></div>';
            bHtml += '<div class=\"form-group\"><label class=\"form-label\">Seu WhatsApp com DDD:</label><input type=\"tel\" id=\"lead-whatsapp\" class=\"form-input\" placeholder=\"(11) 99999-9999\" required value=\"' + (lead.whatsapp || '') + '\"></div>';
            if (block.requireEmail !== false) {
              bHtml += '<div class=\"form-group\"><label class=\"form-label\">Seu Melhor E-mail:</label><input type=\"email\" id=\"lead-email\" class=\"form-input\" placeholder=\"seuemail@exemplo.com\" required value=\"' + (lead.email || '') + '\"></div>';
            }
            bHtml += '<button type=\"submit\" class=\"cta-btn\" style=\"margin-top: 8px;\">' + this.escapeHtml(submitBtnText) + '</button>';
            bHtml += '</form>';
          }
          else if (block.type === 'offer' || block.type === 'pricing_table') {
            bHtml += this.renderOfferHtml(block);
          }
          else if (block.type === 'guarantee') {
            bHtml += this.renderGuaranteeHtml(block);
          }
          else if (block.type === 'fake_loader') {
            bHtml += '<div class=\"fake-loader-card\">';
            bHtml += '<div class=\"loader-spinner\"></div>';
            bHtml += '<div id=\"loader-percent\" class=\"loader-percent\">0%</div>';
            bHtml += '<div class=\"loader-bar-wrapper\"><div id=\"loader-bar\" class=\"loader-bar-fill\"></div></div>';
            bHtml += '<div id=\"loader-msg\" class=\"loader-msg\">Iniciando análise...</div>';
            bHtml += '</div>';
          }
          else if (block.type === 'potential_chart') {
            const title = this.interpolateDynamicText(block.chartTitle || 'Projeção de Evolução');
            const style = block.chartStyle || 'curve';
            const startLabel = this.interpolateDynamicText(block.startLabel || 'Seu estágio hoje');
            const endLabel = this.interpolateDynamicText(block.endLabel || 'Seu potencial com o método');
            const showValues = block.showValues !== false;
            const startVal = this.interpolateDynamicText(block.startValue || '24%');
            const endVal = this.interpolateDynamicText(block.endValue || '92%');
            const startColor = block.startColor || '#ef4444';
            const endColor = block.endColor || '#10b981';
            const duration = parseFloat(block.animationDuration) || 2.5;
            const chartId = 'c_' + Math.random().toString(36).substr(2, 6);

            bHtml += '<div class=\"potential-chart-card\">';
            if (title.trim()) {
              bHtml += '<div class=\"potential-chart-title\">' + this.escapeHtml(title) + '</div>';
            }

            if (style === 'bars') {
              let sHeight = parseInt(startVal, 10);
              if (isNaN(sHeight)) sHeight = 28;
              sHeight = Math.max(15, Math.min(100, sHeight));
              let eHeight = parseInt(endVal, 10);
              if (isNaN(eHeight)) eHeight = 92;
              eHeight = Math.max(15, Math.min(100, eHeight));

              bHtml += '<div class=\"bars-chart-container\">';
              bHtml += '<div class=\"bar-col\">';
              if (showValues) {
                bHtml += '<div class=\"bar-value\" style=\"color: ' + startColor + ';\">' + this.escapeHtml(startVal) + '</div>';
              }
              bHtml += '<div class=\"bar-track\"><div class=\"bar-fill\" style=\"--bar-color: ' + startColor + '; --target-height: ' + sHeight + '%;\"></div></div>';
              bHtml += '<div class=\"bar-label\">' + this.escapeHtml(startLabel) + '</div>';
              bHtml += '</div>';

              bHtml += '<div class=\"bar-arrow\">➔</div>';

              bHtml += '<div class=\"bar-col\">';
              if (showValues) {
                bHtml += '<div class=\"bar-value\" style=\"color: ' + endColor + ';\">' + this.escapeHtml(endVal) + '</div>';
              }
              bHtml += '<div class=\"bar-track\"><div class=\"bar-fill\" style=\"--bar-color: ' + endColor + '; --target-height: ' + eHeight + '%;\"></div></div>';
              bHtml += '<div class=\"bar-label\">' + this.escapeHtml(endLabel) + '</div>';
              bHtml += '</div>';
              bHtml += '</div>';
            } else {
              bHtml += '<div class=\"curve-chart-wrapper\" style=\"--anim-dur: ' + duration + 's;\">';
              bHtml += '<svg class=\"curve-svg\" viewBox=\"0 0 320 130\" preserveAspectRatio=\"none\">';
              bHtml += '<defs>';
              bHtml += '<linearGradient id=\"curveGrad_' + chartId + '\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"0%\">';
              bHtml += '<stop offset=\"0%\" stop-color=\"' + startColor + '\" />';
              bHtml += '<stop offset=\"100%\" stop-color=\"' + endColor + '\" />';
              bHtml += '</linearGradient>';
              bHtml += '<linearGradient id=\"areaGrad_' + chartId + '\" x1=\"0%\" y1=\"0%\" x2=\"0%\" y2=\"100%\">';
              bHtml += '<stop offset=\"0%\" stop-color=\"' + endColor + '\" stop-opacity=\"0.22\" />';
              bHtml += '<stop offset=\"100%\" stop-color=\"' + endColor + '\" stop-opacity=\"0.0\" />';
              bHtml += '</linearGradient>';
              bHtml += '</defs>';

              bHtml += '<path class=\"chart-area-fade\" d=\"M 20 105 C 100 105, 180 80, 300 25 L 300 120 L 20 120 Z\" fill=\"url(#areaGrad_' + chartId + ')\" />';
              bHtml += '<line x1=\"20\" y1=\"120\" x2=\"300\" y2=\"120\" stroke=\"rgba(128,128,128,0.2)\" stroke-dasharray=\"3,3\" stroke-width=\"1\" />';
              bHtml += '<path class=\"chart-curve-path\" d=\"M 20 105 C 100 105, 180 80, 300 25\" fill=\"none\" stroke=\"url(#curveGrad_' + chartId + ')\" stroke-width=\"4\" stroke-linecap=\"round\" />';
              bHtml += '<circle cx=\"20\" cy=\"105\" r=\"5\" fill=\"' + startColor + '\" />';
              bHtml += '<circle cx=\"20\" cy=\"105\" r=\"8\" fill=\"' + startColor + '\" opacity=\"0.3\" />';
              bHtml += '<circle cx=\"300\" cy=\"25\" r=\"6\" fill=\"' + endColor + '\" />';
              bHtml += '<circle cx=\"300\" cy=\"25\" r=\"10\" fill=\"' + endColor + '\" opacity=\"0.4\" />';
              bHtml += '</svg>';

              bHtml += '<div class=\"chart-badges-container\">';
              bHtml += '<div class=\"chart-badge start-badge\" style=\"border-left-color: ' + startColor + ';\">';
              bHtml += '<div class=\"badge-title\">' + this.escapeHtml(startLabel) + '</div>';
              if (showValues) {
                bHtml += '<div class=\"badge-number\" style=\"color: ' + startColor + ';\">' + this.escapeHtml(startVal) + '</div>';
              }
              bHtml += '</div>';

              bHtml += '<div class=\"chart-badge end-badge\" style=\"border-right-color: ' + endColor + ';\">';
              bHtml += '<div class=\"badge-title\">' + this.escapeHtml(endLabel) + '</div>';
              if (showValues) {
                bHtml += '<div class=\"badge-number\" style=\"color: ' + endColor + ';\">' + this.escapeHtml(endVal) + '</div>';
              }
              bHtml += '</div>';
              bHtml += '</div>';
              bHtml += '</div>';
            }

            bHtml += '</div>';
          }
          else if (block.type === 'reviews') {
            bHtml += this.renderReviewsHtml(block);
          }
          else if (block.type === 'faq') {
            bHtml += this.renderFaqHtml(block);
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

      formatMarkdown(str) {
        if (!str || typeof str !== 'string') return '';
        let out = this.escapeHtml(str);
        out = out.replace(/\\*\\*([^\\*]+)\\*\\*/g, '<strong>$1</strong>');
        return out;
      },

      getGuaranteeSealSvg() {
        return '<svg class="guarantee-seal-img" viewBox="0 0 160 160" width="140" height="140" fill="none" xmlns="http://www.w3.org/2000/svg">' +
  '<defs>' +
    '<linearGradient id="qfGoldRingApp" x1="0%" y1="0%" x2="100%" y2="100%">' +
      '<stop offset="0%" stop-color="#fef08a"/>' +
      '<stop offset="30%" stop-color="#f59e0b"/>' +
      '<stop offset="70%" stop-color="#b45309"/>' +
      '<stop offset="100%" stop-color="#fef08a"/>' +
    '</linearGradient>' +
    '<linearGradient id="qfRibbonGradApp" x1="0%" y1="0%" x2="100%" y2="0%">' +
      '<stop offset="0%" stop-color="#dc2626"/>' +
      '<stop offset="50%" stop-color="#ef4444"/>' +
      '<stop offset="100%" stop-color="#b91c1c"/>' +
    '</linearGradient>' +
    '<filter id="qfSealShadowApp" x="-10%" y="-10%" width="130%" height="130%">' +
      '<feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#f59e0b" flood-opacity="0.35"/>' +
    '</filter>' +
  '</defs>' +
  '<g filter="url(#qfSealShadowApp)">' +
    '<circle cx="80" cy="74" r="66" fill="url(#qfGoldRingApp)"/>' +
    '<circle cx="80" cy="74" r="60" fill="#0b1120" stroke="url(#qfGoldRingApp)" stroke-width="2"/>' +
    '<circle cx="80" cy="74" r="54" fill="none" stroke="url(#qfGoldRingApp)" stroke-width="1.5" stroke-dasharray="3,2"/>' +
    '<g fill="#fef08a" transform="translate(48, 32) scale(0.65)">' +
      '<polygon points="10,1 12,7 18,7 13,11 15,17 10,13 5,17 7,11 2,7 8,7"/>' +
      '<polygon points="28,1 30,7 36,7 31,11 33,17 28,13 23,17 25,11 20,7 26,7"/>' +
      '<polygon points="46,1 48,7 54,7 49,11 51,17 46,13 41,17 43,11 38,7 44,7"/>' +
      '<polygon points="64,1 66,7 72,7 67,11 69,17 64,13 59,17 61,11 56,7 62,7"/>' +
      '<polygon points="82,1 84,7 90,7 85,11 87,17 82,13 77,17 79,11 74,7 80,7"/>' +
    '</g>' +
    '<text x="80" y="66" font-family="Plus Jakarta Sans, sans-serif" font-weight="900" font-size="20" fill="url(#qfGoldRingApp)" text-anchor="middle" letter-spacing="1">100%</text>' +
    '<text x="80" y="80" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="9" fill="#f8fafc" text-anchor="middle" letter-spacing="2">GARANTIA</text>' +
    '<text x="80" y="91" font-family="Plus Jakarta Sans, sans-serif" font-weight="700" font-size="7.5" fill="#fef08a" text-anchor="middle" letter-spacing="1.5">DE SATISFAÇÃO</text>' +
  '</g>' +
  '<g>' +
    '<path d="M 22 124 L 38 108 L 38 128 Z" fill="#991b1b"/>' +
    '<path d="M 138 124 L 122 108 L 122 128 Z" fill="#991b1b"/>' +
    '<path d="M 28 112 L 18 120 L 28 132 L 38 126 L 38 114 Z" fill="#b91c1c"/>' +
    '<path d="M 132 112 L 142 120 L 132 132 L 122 126 L 122 114 Z" fill="#b91c1c"/>' +
    '<rect x="30" y="104" width="100" height="24" rx="4" fill="url(#qfRibbonGradApp)" stroke="#fef08a" stroke-width="1"/>' +
    '<text x="80" y="120" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="9.5" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">RISCO ZERO</text>' +
  '</g>' +
'</svg>';
      },

      renderOfferHtml(block) {
        if (block.plans && Array.isArray(block.plans) && block.plans.length > 0) {
          let gridHtml = '<div class=\"pricing-plans-grid\">';
          block.plans.forEach(plan => {
            const isFeatured = plan.featured === true;
            const featuredClass = isFeatured ? 'featured' : '';
            const badgeText = this.interpolateDynamicText(plan.featuredBadge || (isFeatured ? '⭐ MELHOR CUSTO-BENEFÍCIO' : ''));
            const anchorPrice = this.interpolateDynamicText(plan.anchorPrice || '');
            const currency = plan.currency || 'R$';
            const priceMain = this.interpolateDynamicText(plan.priceMain || '');
            const priceCents = this.interpolateDynamicText(plan.priceCents || '');
            const periodSub = this.interpolateDynamicText(plan.periodSub || '');
            const ctaText = this.interpolateDynamicText(plan.ctaText || 'Quero Este Plano');
            const ctaUrl = plan.ctaUrl || '#';
            const rawFeatures = Array.isArray(plan.features) ? plan.features : (plan.features ? String(plan.features).split('\\n') : []);
            const features = rawFeatures.map(f => f.trim()).filter(Boolean);

            gridHtml += '<div class=\"pricing-plan-card ' + featuredClass + '\">';
            if (isFeatured && badgeText) {
              gridHtml += '<div class=\"plan-badge-ribbon\">' + this.escapeHtml(badgeText) + '</div>';
            }
            gridHtml += '<div class=\"plan-title\">' + this.escapeHtml(this.interpolateDynamicText(plan.title || 'PLANO')) + '</div>';
            if (anchorPrice) {
              gridHtml += '<div class=\"plan-anchor-price\">' + this.escapeHtml(anchorPrice) + '</div>';
            }
            if (priceMain || priceCents) {
              gridHtml += '<div class=\"plan-price-wrapper\">';
              if (currency) gridHtml += '<span class=\"plan-currency\">' + this.escapeHtml(currency) + '</span>';
              gridHtml += '<span class=\"plan-val-main\">' + this.escapeHtml(priceMain) + '</span>';
              if (priceCents) gridHtml += '<span class=\"plan-cents\">' + this.escapeHtml(priceCents) + '</span>';
              gridHtml += '</div>';
            }
            if (periodSub) {
              gridHtml += '<div class=\"plan-period-sub\">' + this.escapeHtml(periodSub) + '</div>';
            }
            gridHtml += '<div class=\"plan-divider\"></div>';

            if (features.length > 0) {
              gridHtml += '<ul class=\"plan-features-list\">';
              features.forEach(feat => {
                const interpFeat = this.interpolateDynamicText(feat);
                gridHtml += '<li class=\"plan-feature-item\"><svg class=\"plan-check-icon\" viewBox=\"0 0 20 20\" fill=\"currentColor\"><path fill-rule=\"evenodd\" d=\"M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z\" clip-rule=\"evenodd\"/></svg><span>' + this.formatMarkdown(interpFeat) + '</span></li>';
              });
              gridHtml += '</ul>';
            }

            if (plan.bonus && (plan.bonus.title || plan.bonus.desc)) {
              const bTitle = this.interpolateDynamicText(plan.bonus.title || '');
              const bDesc = this.interpolateDynamicText(plan.bonus.desc || '');
              const bTag = this.interpolateDynamicText(plan.bonus.tag || '');
              gridHtml += '<div class=\"plan-bonus-box\">';
              gridHtml += '<div class=\"plan-bonus-header\"><span class=\"plan-bonus-title\">' + this.escapeHtml(bTitle) + '</span>';
              if (bTag) {
                gridHtml += '<span class=\"plan-bonus-tag\">' + this.escapeHtml(bTag) + '</span>';
              }
              gridHtml += '</div>';
              if (bDesc) {
                gridHtml += '<div class=\"plan-bonus-desc\">' + this.escapeHtml(bDesc) + '</div>';
              }
              gridHtml += '</div>';
            }

            gridHtml += '<a href=\"' + this.escapeHtml(ctaUrl) + '\" target=\"_blank\" class=\"plan-cta-btn cta-btn link-trackable\">' + this.escapeHtml(ctaText) + '</a>';
            gridHtml += '</div>';
          });
          gridHtml += '</div>';
          return gridHtml;
        }

        const btnSize = block.buttonSize || 'featured';
        const customColor = block.buttonColor ? 'style=\"background: ' + block.buttonColor + '; border-color: ' + block.buttonColor + ';\"' : '';
        const sizeClass = 'btn-size-' + btnSize;

        let bHtml = '<div class=\"offer-container\"><div class=\"badge-result\">✨ Diagnóstico Concluído com Sucesso</div>';
        if (block.imageUrl) {
          bHtml += '<div class=\"quiz-image-card align-center quiz-image-medium\"><img src=\"' + this.escapeHtml(block.imageUrl) + '\" alt=\"' + this.escapeHtml(block.productTitle || '') + '\"></div>';
        }
        if (block.productTitle) {
          const pTitle = this.interpolateDynamicText(block.productTitle);
          const pDesc = this.interpolateDynamicText(block.productDescription || '');
          const pPrice = this.interpolateDynamicText(block.productPrice || '');
          bHtml += '<div class=\"product-box\"><h4>' + this.formatMarkdown(pTitle) + '</h4>';
          if (pDesc) bHtml += '<p>' + this.formatMarkdown(pDesc) + '</p>';
          if (pPrice) bHtml += '<div style=\"margin-top: 8px; font-size: 18px; font-weight: 800; color: var(--accent);\">' + this.escapeHtml(pPrice) + '</div>';
          bHtml += '</div>';
        }
        const ctaText = this.interpolateDynamicText(block.ctaText || 'Garantir Minha Oferta Exclusiva Agora →');
        const ctaUrl = block.ctaUrl || '#';
        bHtml += '<div style=\"margin-top: 6px;\"><a href=\"' + this.escapeHtml(ctaUrl) + '\" target=\"_blank\" class=\"cta-btn link-trackable ' + sizeClass + '\" ' + customColor + ' style=\"text-align: center; text-decoration: none;\">' + this.escapeHtml(ctaText) + '</a></div></div>';
        return bHtml;
      },

      renderGuaranteeHtml(block) {
        const tag = this.interpolateDynamicText(block.tag || 'RISCO ZERO');
        const title = this.interpolateDynamicText(block.title || 'GARANTIA de 30 DIAS.');
        const desc = this.interpolateDynamicText(block.description || '');
        const sealHtml = block.customSealUrl
          ? '<img src=\"' + this.escapeHtml(block.customSealUrl) + '\" alt=\"Selo de Garantia\" class=\"guarantee-seal-img\" loading=\"lazy\">'
          : this.getGuaranteeSealSvg();

        let bHtml = '<div class=\"guarantee-card\">';
        if (tag) bHtml += '<div class=\"guarantee-tag\">' + this.escapeHtml(tag) + '</div>';
        bHtml += '<div class=\"guarantee-seal-wrap\">' + sealHtml + '</div>';
        if (title) bHtml += '<h3 class=\"guarantee-title\">' + this.escapeHtml(title) + '</h3>';
        if (desc) bHtml += '<div class=\"guarantee-desc\">' + this.formatMarkdown(desc) + '</div>';
        bHtml += '</div>';
        return bHtml;
      },

      getDefaultReviewItems() {
        return [
          {
            id: 'rev_1',
            name: 'Carlos Mendes',
            role: 'Engenheiro Civil',
            avatarUrl: '',
            stars: 5,
            comment: 'Superou todas as minhas expectativas! Consegui montar o orçamento em menos de 15 minutos e economizei horas de trabalho.',
            timeAgo: 'Postado há 2 dias',
            verified: true
          },
          {
            id: 'rev_2',
            name: 'Mariana Silveira',
            role: 'Arquiteta',
            avatarUrl: '',
            stars: 5,
            comment: 'Didático, direto ao ponto e muito prático. Mudou a forma como apresento orçamentos e propostas para meus clientes.',
            timeAgo: 'Postado há 4 dias',
            verified: true
          },
          {
            id: 'rev_3',
            name: 'Roberto Fontes',
            role: 'Empreiteiro',
            avatarUrl: '',
            stars: 5,
            comment: 'O suporte me atendeu na hora no WhatsApp e o material é completíssimo. Vale cada centavo investido.',
            timeAgo: 'Postado há 1 semana',
            verified: true
          }
        ];
      },

      getDefaultFaqItems() {
        return [
          {
            id: 'faq_1',
            question: 'Como e quando recebo o meu acesso?',
            answer: 'O envio é imediato! Assim que seu pagamento for aprovado, você receberá seus dados de acesso diretamente no seu e-mail e no WhatsApp.'
          },
          {
            id: 'faq_2',
            question: 'Funciona no celular e no computador?',
            answer: 'Sim! Você pode acessar de qualquer celular (Android ou iPhone), tablet ou computador, sem precisar instalar nada pesado.'
          },
          {
            id: 'faq_3',
            question: 'E se eu tiver dúvidas ou precisar de ajuda?',
            answer: 'Você terá acesso ao nosso suporte exclusivo via WhatsApp para tirar qualquer dúvida sempre que precisar.'
          },
          {
            id: 'faq_4',
            question: 'Tenho garantia se eu não gostar?',
            answer: 'Com certeza! Você tem garantia incondicional de 30 dias. Se por qualquer motivo não ficar satisfeito, devolvemos 100% do seu dinheiro sem burocracia.'
          }
        ];
      },

      getInitials(name) {
        if (!name || !name.trim()) return 'CL';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      },

      getAvatarBg(name) {
        const gradients = [
          'linear-gradient(135deg, #6366f1, #8b5cf6)',
          'linear-gradient(135deg, #ec4899, #f43f5e)',
          'linear-gradient(135deg, #10b981, #059669)',
          'linear-gradient(135deg, #f59e0b, #d97706)',
          'linear-gradient(135deg, #06b6d4, #0284c7)',
          'linear-gradient(135deg, #8b5cf6, #d946ef)'
        ];
        let hash = 0;
        const str = name || 'Cliente';
        for (let i = 0; i < str.length; i++) {
          hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return gradients[Math.abs(hash) % gradients.length];
      },

      renderStarsHtml(starsCount = 5) {
        const count = Math.max(1, Math.min(5, parseInt(starsCount, 10) || 5));
        let starsSvg = '';
        for (let i = 1; i <= 5; i++) {
          const isFilled = i <= count;
          starsSvg += '<span class=\"review-star ' + (isFilled ? 'star-filled' : 'star-empty') + '\">★</span>';
        }
        return '<span class=\"review-stars-wrap\">' + starsSvg + ' <strong class=\"review-stars-num\">' + count + '.0</strong></span>';
      },

      renderReviewsHtml(block) {
        const badge = block.headerBadge || '';
        const title = block.headerTitle || '';
        const showSummary = block.showRatingSummary !== false;
        const summary = block.ratingSummary || '4.9 de 5 baseado em clientes satisfeitos';
        const items = (Array.isArray(block.items) && block.items.length > 0)
          ? block.items
          : this.getDefaultReviewItems();

        let bHtml = '<div class=\"reviews-block-container\">';

        if (badge || title || showSummary) {
          bHtml += '<div class=\"reviews-header-summary\">';
          if (badge) {
            bHtml += '<span class=\"reviews-header-badge\">' + this.escapeHtml(badge) + '</span>';
          }
          if (title) {
            bHtml += '<div class=\"reviews-header-title\">' + this.escapeHtml(title) + '</div>';
          }
          if (showSummary) {
            bHtml += '<div class=\"reviews-header-rating\"><span style=\"color:#f59e0b;\">★★★★★</span> <span>' + this.escapeHtml(summary) + '</span></div>';
          }
          bHtml += '</div>';
        }

        bHtml += '<div class=\"reviews-list\">';
        items.forEach(item => {
          const name = item.name || 'Cliente Verificado';
          const role = item.role || '';
          const stars = parseInt(item.stars, 10) || 5;
          const comment = item.comment || '';
          const timeAgo = item.timeAgo || '';
          const isVerified = item.verified !== false;
          const avatarUrl = item.avatarUrl || '';
          const initials = this.getInitials(name);
          const avatarBg = this.getAvatarBg(name);

          bHtml += '<div class=\"review-card\">';
          bHtml += '<div class=\"review-top-row\">';
          bHtml += '<div class=\"review-author-wrap\">';
          if (avatarUrl && avatarUrl.trim()) {
            bHtml += '<div class=\"review-avatar\"><img src=\"' + this.escapeHtml(avatarUrl.trim()) + '\" alt=\"' + this.escapeHtml(name) + '\" loading=\"lazy\"></div>';
          } else {
            bHtml += '<div class=\"review-avatar\" style=\"background:' + avatarBg + ';\">' + initials + '</div>';
          }
          bHtml += '<div class=\"review-author-info\">';
          bHtml += '<div class=\"review-author-name\"><span>' + this.escapeHtml(name) + '</span> ' + (isVerified ? '<span class=\"review-verified-badge\" title=\"Compra Verificada\">✓ Verificado</span>' : '') + '</div>';
          if (role) {
            bHtml += '<div class=\"review-author-role\">' + this.escapeHtml(role) + '</div>';
          }
          bHtml += '</div>';
          bHtml += '</div>';

          bHtml += this.renderStarsHtml(stars);
          bHtml += '</div>';

          if (comment) {
            bHtml += '<div class=\"review-text\">' + this.formatMarkdown(comment) + '</div>';
          }

          if (timeAgo) {
            bHtml += '<div class=\"review-footer-row\"><span>' + this.escapeHtml(timeAgo) + '</span> <span style=\"color:#10b981; font-weight:600;\">Avaliação confirmada</span></div>';
          }

          bHtml += '</div>';
        });
        bHtml += '</div>';
        bHtml += '</div>';

        return bHtml;
      },

      renderFaqHtml(block) {
        const title = block.title || 'Perguntas Frequentes';
        const subtitle = block.subtitle || '';
        const items = (Array.isArray(block.items) && block.items.length > 0)
          ? block.items
          : this.getDefaultFaqItems();

        let bHtml = '<div class=\"faq-block-container\">';

        if (title || subtitle) {
          bHtml += '<div class=\"faq-header\">';
          if (title) {
            bHtml += '<div class=\"faq-header-title\"><span>❓</span> ' + this.escapeHtml(title) + '</div>';
          }
          if (subtitle) {
            bHtml += '<div class=\"faq-header-subtitle\">' + this.escapeHtml(subtitle) + '</div>';
          }
          bHtml += '</div>';
        }

        bHtml += '<div class=\"faq-accordion\">';
        items.forEach(item => {
          const q = item.question || 'Dúvida';
          const a = item.answer || '';
          bHtml += '<div class=\"faq-item\" onclick=\"this.classList.toggle(\\\'active\\\')\">';
          bHtml += '<div class=\"faq-question\"><span class=\"faq-q-text\">' + this.escapeHtml(q) + '</span><span class=\"faq-toggle-icon\">▾</span></div>';
          bHtml += '<div class=\"faq-answer\"><div class=\"faq-answer-inner\">' + this.formatMarkdown(a) + '</div></div>';
          bHtml += '</div>';
        });
        bHtml += '</div>';
        bHtml += '</div>';

        return bHtml;
      },

      extractYouTubeId(url) {
        if (!url) return null;
        const regExp = /^.*(youtu.be\\/|v\\/|u\\/\\w\\/|embed\\/|watch\\?v=|shorts\\/)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
      },

      buildYouTubeEmbedUrl(block) {
        if (!block || !block.youtubeUrl) return '';
        const videoId = this.extractYouTubeId(block.youtubeUrl);
        if (!videoId) return '';

        const autoplayMode = block.autoplayMode || 'none';
        const hideControls = block.hideControls !== false;
        const hideRecs = block.hideRecommendations !== false;

        const params = new URLSearchParams();
        params.set('rel', hideRecs ? '0' : '1');
        params.set('modestbranding', '1');
        params.set('playsinline', '1');
        params.set('iv_load_policy', '3');
        params.set('enablejsapi', '1');

        if (hideControls) {
          params.set('controls', '0');
          params.set('disablekb', '1');
        } else {
          params.set('controls', '1');
        }

        if (autoplayMode === 'direct') {
          params.set('autoplay', '1');
          params.set('mute', '0');
        } else if (autoplayMode === 'muted_button') {
          params.set('autoplay', '1');
          params.set('mute', '1');
        } else {
          params.set('autoplay', '0');
        }

        return 'https://www.youtube-nocookie.com/embed/' + videoId + '?' + params.toString();
      },

      onVideoIframeLoad(posterId, frameId) {
        setTimeout(() => {
          const poster = document.getElementById(posterId);
          if (poster) {
            poster.classList.add('poster-fade-out');
            setTimeout(() => {
              if (poster && poster.parentNode) poster.style.display = 'none';
            }, 450);
          }
        }, 700);
      },

      unmuteVideo(frameId, overlayId) {
        const el = document.getElementById(frameId);
        if (el) {
          if (el.tagName && el.tagName.toLowerCase() === 'video') {
            el.muted = false;
            el.volume = 1.0;
            el.play().catch(e => console.log('Video play error:', e));
          } else if (el.contentWindow) {
            el.contentWindow.postMessage(JSON.stringify({
              event: 'command',
              func: 'unMute',
              args: ''
            }), '*');
            el.contentWindow.postMessage(JSON.stringify({
              event: 'command',
              func: 'setVolume',
              args: [100]
            }), '*');
            el.contentWindow.postMessage(JSON.stringify({
              event: 'command',
              func: 'playVideo',
              args: ''
            }), '*');
          }
        }
        const overlay = document.getElementById(overlayId);
        if (overlay) {
          overlay.style.opacity = '0';
          overlay.style.pointerEvents = 'none';
          setTimeout(() => { overlay.style.display = 'none'; }, 300);
          if (overlay.parentNode) {
            const poster = overlay.parentNode.querySelector('.video-poster-layer');
            if (poster) {
              poster.classList.add('poster-fade-out');
              setTimeout(() => { poster.style.display = 'none'; }, 300);
            }
          }
        }
      },

      isFullHtmlDoc(html) {
        if (!html || typeof html !== 'string') return false;
        const trimmed = html.trim().toLowerCase();
        return trimmed.startsWith('<!doctype') ||
               trimmed.startsWith('<html') ||
               trimmed.includes('<head') ||
               trimmed.includes('<body') ||
               (trimmed.includes('<script') && (trimmed.includes('tailwind') || trimmed.includes('<style')));
      },

      escapeSrcdoc(str) {
        if (!str) return '';
        return str
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;');
      },

      preloadVideos(steps) {
        if (!steps || !Array.isArray(steps)) return;
        let cacheContainer = document.getElementById('qf-video-preload-cache');
        if (!cacheContainer) {
          cacheContainer = document.createElement('div');
          cacheContainer.id = 'qf-video-preload-cache';
          cacheContainer.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;opacity:0.01;pointer-events:none;left:-9999px;top:-9999px;';
          document.body.appendChild(cacheContainer);
        }
        const preloaded = new Set();
        steps.forEach(step => {
          (step.blocks || []).forEach(b => {
            if (b.type === 'video' && b.youtubeUrl && b.preload !== false) {
              const vid = this.extractYouTubeId(b.youtubeUrl);
              if (vid && !preloaded.has(vid)) {
                preloaded.add(vid);
                const img = new Image();
                img.src = 'https://img.youtube.com/vi/' + vid + '/hqdefault.jpg';
                const frame = document.createElement('iframe');
                frame.src = 'https://www.youtube-nocookie.com/embed/' + vid + '?preload=auto&controls=0&mute=1';
                frame.setAttribute('loading', 'eager');
                frame.setAttribute('tabindex', '-1');
                frame.setAttribute('aria-hidden', 'true');
                cacheContainer.appendChild(frame);
              }
            }
          });
        });
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
        this.hasAnswered = true;
        this.preloadVideos(this.config.steps);

        const progressSec = document.getElementById('progress-section');
        if (progressSec && this.config.theme && this.config.theme.showProgressBar !== false) {
          progressSec.style.display = 'block';
        }

        // Se a opção permite digitação pelo lead, abre o campo de resposta sem avançar de imediato
        if (selectedOpt.allowCustomText) {
          const container = document.getElementById('step-content');
          if (container) container.innerHTML = this.renderStepHtml(step);
          this.applyUtmsToLinks();
          setTimeout(() => {
            const input = document.getElementById('custom-answer-input-' + optIdx);
            if (input) {
              input.focus();
              input.select();
            }
          }, 50);
          return;
        }

        const useScoring = qBlock.useScoring === true && selectedOpt.points !== undefined && selectedOpt.points !== null && selectedOpt.points !== '' && parseInt(selectedOpt.points, 10) > 0;

        if (useScoring) {
          this.totalScore += parseInt(selectedOpt.points, 10) || 0;
        }

        const headingBlock = (step.blocks || []).find(b => b.type === 'heading');
        const questionTitle = (headingBlock && (headingBlock.title || headingBlock.tag)) || step.title || ('Etapa ' + (this.currentStepIndex + 1));

        this.trackFunnelEvent('Quiz_Resposta', {
          stepIndex: this.currentStepIndex + 1,
          question: questionTitle,
          answer: selectedOpt.text || '',
          points: useScoring ? (parseInt(selectedOpt.points, 10) || 0) : ''
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

      submitCustomOption(optIdx) {
        const step = this.config.steps[this.currentStepIndex];
        const qBlock = (step.blocks || []).find(b => b.type === 'question');
        if (!qBlock || !qBlock.options || !qBlock.options[optIdx]) return;

        const selectedOpt = qBlock.options[optIdx];
        const input = document.getElementById('custom-answer-input-' + optIdx);
        const typedText = input ? input.value.trim() : '';

        if (!this.customAnswers) this.customAnswers = {};
        this.customAnswers[step.id] = typedText;
        this.hasAnswered = true;

        const useScoring = qBlock.useScoring === true && selectedOpt.points !== undefined && selectedOpt.points !== null && selectedOpt.points !== '' && parseInt(selectedOpt.points, 10) > 0;

        if (useScoring) {
          this.totalScore += parseInt(selectedOpt.points, 10) || 0;
        }

        const headingBlock = (step.blocks || []).find(b => b.type === 'heading');
        const questionTitle = (headingBlock && (headingBlock.title || headingBlock.tag)) || step.title || ('Etapa ' + (this.currentStepIndex + 1));
        const finalAnswer = typedText ? (selectedOpt.text ? (selectedOpt.text + ': ' + typedText) : typedText) : (selectedOpt.text || '');

        this.trackFunnelEvent('Quiz_Resposta', {
          stepIndex: this.currentStepIndex + 1,
          question: questionTitle,
          answer: finalAnswer,
          customText: typedText,
          points: useScoring ? (parseInt(selectedOpt.points, 10) || 0) : ''
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
        this.refreshMetaCookies();
        const utms = this.utmParams || {};
        const srcVal = utms.src || utms.sck || utms.SRC || utms.SCK || '';
        const payload = {
          sessionId: this.sessionId,
          event: eventName,
          quizId: this.config.id || 'meu-quiz',
          quizTitle: this.config.title || 'Quiz de Vendas',
          timestamp: new Date().toISOString(),
          src: srcVal,
          fbc: utms.fbc || this.getCookie('_fbc') || '',
          fbp: utms.fbp || this.getCookie('_fbp') || '',
          external_id: this.sessionId,
          client_user_agent: (typeof navigator !== 'undefined' && navigator.userAgent) || '',
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

        // Rastreamento Meta Pixel & GA4
        const isCheckoutEvent = (eventName === 'Checkout_Iniciado' || eventName === 'InitiateCheckout');
        const trackingConf = this.config.tracking || {};

        if (window.fbq) {
          try {
            if (this.sessionId) {
              try { fbq('setUserProperties', { external_id: this.sessionId }); } catch(upErr) {}
            }
            if (eventName === 'Lead') {
              fbq('track', 'Lead');
            } else if (isCheckoutEvent) {
              if (trackingConf.sendInitiateCheckout !== false) {
                fbq('track', 'InitiateCheckout', {
                  content_name: this.config.title || 'Oferta',
                  value: (eventData && eventData.value) ? Number(eventData.value) : 0,
                  currency: 'BRL'
                });
              } else {
                fbq('trackCustom', 'Checkout_Iniciado', eventData);
              }
            } else {
              fbq('trackCustom', eventName, eventData);
            }
          } catch(err) {}
        }

        if (window.gtag) {
          try {
            if (isCheckoutEvent) {
              if (trackingConf.sendInitiateCheckout !== false) {
                gtag('event', 'begin_checkout', {
                  items: [{ item_name: this.config.title || 'Oferta' }]
                });
              } else {
                gtag('event', eventName, eventData);
              }
            } else {
              gtag('event', eventName, eventData);
            }
          } catch(err) {}
        }

        const targetUrl = (this.config.tracking && this.config.tracking.sheetUrl) || (this.config.tracking && this.config.tracking.webhookUrl);
        if (targetUrl && targetUrl.trim() !== '') {
          try {
            const bodyStr = JSON.stringify(payload);
            // Garante que o disparo não seja cancelado se o navegador navegar para o checkout
            let sent = false;
            if (navigator.sendBeacon) {
              try {
                const blob = new Blob([bodyStr], { type: 'text/plain' });
                sent = navigator.sendBeacon(targetUrl, blob);
              } catch(bErr) {}
            }
            if (!sent) {
              fetch(targetUrl, {
                method: 'POST',
                mode: 'no-cors',
                keepalive: true,
                headers: { 'Content-Type': 'text/plain' },
                body: bodyStr
              }).catch(() => {});
            }
          } catch(err) {}
        }
      }
    };
    window.QuizApp = QuizApp;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => { 
        QuizApp.init(); 
        initSalesPageEnhancements();
      });
    } else {
      QuizApp.init();
      initSalesPageEnhancements();
    }

    function initSalesPageEnhancements() {
      // 1. Propaga automaticamente UTMs, SRC, fbc, fbp e external_id para links de checkout (Kirvano e PerfectPay)
      try {
        const p = new URLSearchParams(window.location.search);

        // Captura e repassa cookies da Meta para o checkout
        try {
          const matchFbp = document.cookie.match(/(?:^|;\s*)_fbp=([^;]+)/);
          if (matchFbp && !p.has('fbp')) p.set('fbp', decodeURIComponent(matchFbp[1]));

          let matchFbc = document.cookie.match(/(?:^|;\s*)_fbc=([^;]+)/);
          if (!matchFbc && p.has('fbclid')) {
            p.set('fbc', 'fb.1.' + Date.now() + '.' + p.get('fbclid'));
          } else if (matchFbc && !p.has('fbc')) {
            p.set('fbc', decodeURIComponent(matchFbc[1]));
          }

          if (window.QuizApp && window.QuizApp.sessionId && !p.has('external_id')) {
            p.set('external_id', window.QuizApp.sessionId);
          }
        } catch(metaCookieErr) {}

        const searchStr = p.toString();
        if (searchStr) {
          document.querySelectorAll('a[href*="kirvano.com"], a[href*="perfectpay.com.br"], a[href*="checkout.perfectpay"]').forEach(link => {
            const cur = link.getAttribute('href');
            if (cur && !cur.startsWith('#')) {
              link.setAttribute('href', cur + (cur.indexOf('?') > 0 ? '&' : '?') + searchStr);
            }
          });
        }
      } catch(e) {}

      // 2. Notificações Flutuantes de Compradores Recentes
      const hasSalesPage = document.querySelector('.qf-sales-page-wrapper');
      if (hasSalesPage && !document.getElementById('nf-notif')) {
        const notifContainer = document.createElement('div');
        notifContainer.id = 'nf-notif';
        notifContainer.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:9998;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
        document.body.appendChild(notifContainer);

        const buyers = [
          {n:'Carlos M.',c:'SP',p:'Plano 3 Meses',t:'agora mesmo'},
          {n:'Amanda F.',c:'GO',p:'Plano 1 Mês',t:'há 2 minutos'},
          {n:'Roberto A.',c:'PR',p:'Plano 6 Meses',t:'há 3 minutos'},
          {n:'Juliana C.',c:'RJ',p:'Plano 3 Meses',t:'há 5 minutos'},
          {n:'Marcos S.',c:'MG',p:'Plano 1 Mês',t:'há 6 minutos'},
          {n:'Patricia L.',c:'DF',p:'Plano 6 Meses',t:'há 8 minutos'},
          {n:'Felipe R.',c:'PE',p:'Plano 3 Meses',t:'há 10 minutos'},
          {n:'Luciana B.',c:'RS',p:'Plano 1 Mês',t:'há 12 minutos'}
        ];

        let bIdx = 0;
        let activeToast = null;
        function showNextToast() {
          const b = buyers[bIdx % buyers.length];
          bIdx++;
          const toast = document.createElement('div');
          toast.style.cssText = 'background:#0c0f1a;border:1px solid rgba(0,212,170,.3);border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,.6);max-width:300px;opacity:0;transform:translateX(-100%);transition:all .4s cubic-bezier(.34,1.56,.64,1);';
          toast.innerHTML = '<div style="width:36px;height:36px;border-radius:50%;background:rgba(0,212,170,.15);border:1px solid rgba(0,212,170,.3);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#00d4aa;shrink-0;">' + b.n.charAt(0) + '</div>' +
            '<div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:700;color:#fff;">' + b.n + ' — ' + b.c + '</div><div style="font-size:11px;color:#7a8ba8;line-height:1.3;">comprou <strong style="color:#00d4aa;">' + b.p + '</strong></div><div style="font-size:10px;color:#4a5568;">' + b.t + '</div></div>';
          notifContainer.appendChild(toast);

          requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
          });

          if (activeToast && activeToast.parentNode) {
            activeToast.style.opacity = '0';
            setTimeout(() => { if (activeToast && activeToast.parentNode) activeToast.remove(); }, 300);
          }
          activeToast = toast;

          setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-100%)';
            setTimeout(() => { if (toast.parentNode) toast.remove(); }, 400);
          }, 5000);
        }

        setTimeout(() => {
          showNextToast();
          setInterval(showNextToast, 18000 + Math.random() * 10000);
        }, 4000);
      }
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

  buildYouTubeEmbedUrl(block) {
    if (!block || !block.youtubeUrl) return '';
    const videoId = this.extractYouTubeId(block.youtubeUrl);
    if (!videoId) return '';

    const autoplayMode = block.autoplayMode || 'none';
    const hideControls = block.hideControls !== false;
    const hideRecs = block.hideRecommendations !== false;

    const params = new URLSearchParams();
    params.set('rel', hideRecs ? '0' : '1');
    params.set('modestbranding', '1');
    params.set('playsinline', '1');
    params.set('iv_load_policy', '3');
    params.set('enablejsapi', '1');

    if (hideControls) {
      params.set('controls', '0');
      params.set('disablekb', '1');
    } else {
      params.set('controls', '1');
    }

    if (autoplayMode === 'direct') {
      params.set('autoplay', '1');
      params.set('mute', '0');
    } else if (autoplayMode === 'muted_button') {
      params.set('autoplay', '1');
      params.set('mute', '1');
    } else {
      params.set('autoplay', '0');
    }

    return 'https://www.youtube-nocookie.com/embed/' + videoId + '?' + params.toString();
  },

  isFullHtmlDoc(html) {
    if (!html || typeof html !== 'string') return false;
    const trimmed = html.trim().toLowerCase();
    return trimmed.startsWith('<!doctype') ||
           trimmed.startsWith('<html') ||
           trimmed.includes('<head') ||
           trimmed.includes('<body') ||
           (trimmed.includes('<script') && (trimmed.includes('tailwind') || trimmed.includes('<style')));
  },

  escapeSrcdoc(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;');
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
