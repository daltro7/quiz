/**
 * APLICAÇÃO PRINCIPAL: QuizForge App
 * Gerencia o estado dos quizzes, o editor visual, o preview em tempo real e as exportações.
 */

const STORAGE_KEY = 'quizforge_quizzes_data';

const App = {
  quizzes: [],
  currentQuiz: null,
  activeTab: 'steps',
  previewDevice: 'mobile',
  lastExportedHtml: null,

  currentEditingStepIndex: 0,
  refreshTimeout: null,

  init() {
    this.loadQuizzesFromStorage();
    // Inicia diretamente no editor com o primeiro quiz carregado
    if (this.quizzes && this.quizzes.length > 0) {
      this.openEditor(this.quizzes[0].id);
    } else {
      this.renderDashboard();
    }
  },

  // ==========================================
  // ARMAZENAMENTO LOCAL (LOCALSTORAGE)
  // ==========================================
  loadQuizzesFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.quizzes = JSON.parse(stored);
      }
    } catch (err) {
      console.error('Erro ao carregar quizzes do localStorage:', err);
    }

    // Se estiver vazio pela primeira vez, cria um quiz de exemplo super completo
    if (!this.quizzes || this.quizzes.length === 0) {
      this.quizzes = [this.getSampleQuizData()];
      this.saveQuizzesToStorage();
    }
  },

  saveQuizzesToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.quizzes));
      this.showSaveBadge();
    } catch (err) {
      console.error('Erro ao salvar quizzes no localStorage:', err);
    }
  },

  showSaveBadge() {
    const badge = document.getElementById('save-status-badge');
    if (badge) {
      badge.innerHTML = '<i class="ph ph-check-circle"></i> Salvo';
      badge.className = 'text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1';
    }
  },

  // ==========================================
  // NAVEGAÇÃO DE TELAS (DASHBOARD vs EDITOR)
  // ==========================================
  renderDashboard() {
    document.getElementById('view-dashboard').classList.remove('hidden');
    document.getElementById('view-editor').classList.add('hidden');
    document.getElementById('btn-header-back-dashboard').classList.add('hidden');
    document.getElementById('btn-header-export-html').classList.add('hidden');

    const grid = document.getElementById('quiz-list-grid');
    if (!grid) return;

    if (this.quizzes.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
          <div class="text-4xl mb-3">📋</div>
          <h3 class="text-lg font-bold text-white">Nenhum quiz cadastrado ainda</h3>
          <p class="text-slate-400 text-xs mt-1 mb-6">Crie seu primeiro funil de quiz interativo para começar a vender.</p>
          <button onclick="App.createNewQuiz()" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition">
            + Criar Primeiro Quiz
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.quizzes.map((quiz, index) => {
      const stepCount = (quiz.steps || []).length;
      const lastModified = quiz.updatedAt ? new Date(quiz.updatedAt).toLocaleDateString('pt-BR') : 'Hoje';

      return `
        <div class="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-card">
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                ${stepCount} Etapas
              </span>
              <span class="text-[11px] text-slate-500">Atualizado: ${lastModified}</span>
            </div>

            <h3 class="font-extrabold text-white text-base leading-snug line-clamp-1 mb-1.5" title="${this.escape(quiz.title)}">
              ${this.escape(quiz.title || 'Quiz Sem Título')}
            </h3>
            <p class="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
              ${this.escape(quiz.description || 'Funil interativo com qualificação e oferta.')}
            </p>
          </div>

          <!-- Ações do Cartão -->
          <div class="border-t border-slate-800/80 pt-4 flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5">
              <button onclick="App.openEditor('${quiz.id}')" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1">
                <i class="ph ph-note-pencil"></i> Editar
              </button>
              <button onclick="App.duplicateQuiz('${quiz.id}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition" title="Duplicar">
                <i class="ph ph-copy text-sm"></i>
              </button>
              <button onclick="App.exportDirectHtml('${quiz.id}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs transition" title="Baixar HTML">
                <i class="ph ph-download-simple text-sm"></i>
              </button>
            </div>

            <button onclick="App.deleteQuiz('${quiz.id}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-500 hover:text-red-400 text-xs transition" title="Excluir">
              <i class="ph ph-trash text-sm"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  createNewQuiz() {
    const newQuiz = {
      id: 'quiz_' + Date.now(),
      title: 'Meu Novo Funil de Quiz',
      description: 'Quiz de qualificação rápida e apresentação de oferta.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      theme: {
        primaryColor: '#6366f1',
        primaryHover: '#4f46e5',
        bgColor: '#0f172a',
        cardBg: '#1e293b',
        textColor: '#f8fafc',
        textMuted: '#94a3b8',
        accentColor: '#10b981',
        borderRadius: '16px',
        borderWidth: '1px',
        borderColor: '#334155',
        shadow: 'medium',
        maxWidth: '560px'
      },
      tracking: {
        webhookUrl: '',
        metaPixelId: '',
        ga4Id: ''
      },
      steps: [
        {
          id: 'step_1',
          type: 'question',
          tag: 'Passo 1 de 3',
          title: 'Qual é o seu principal objetivo hoje?',
          subtitle: 'Selecione a opção que melhor descreve sua necessidade atual.',
          youtubeUrl: '',
          videoOrientation: 'horizontal',
          customHtml: '',
          hasDelayButton: false,
          delaySeconds: 5,
          delayButtonText: 'Avançar para a próxima etapa →',
          delayButtonUrl: '',
          isLeadStep: false,
          options: [
            { text: 'Aumentar minhas vendas rapidamente', icon: '🚀', points: 10, targetStepIndex: '' },
            { text: 'Organizar meus processos e economizar tempo', icon: '⚙️', points: 8, targetStepIndex: '' },
            { text: 'Aprender do zero com suporte', icon: '🎯', points: 5, targetStepIndex: '' }
          ]
        },
        {
          id: 'step_2',
          type: 'lead_capture',
          tag: 'Diagnóstico Quase Pronto',
          title: 'Onde devemos enviar o seu relatório?',
          subtitle: 'Preencha seus dados para receber o plano personalizado e a oferta exclusiva.',
          isLeadStep: true,
          requireEmail: true,
          submitButtonText: 'Ver Meu Diagnóstico e Oferta →'
        },
        {
          id: 'step_3',
          type: 'offer',
          tag: 'Oferta Exclusiva',
          title: 'Seu Plano Personalizado Está Liberado!',
          subtitle: 'Com base nas suas respostas, montamos esta oportunidade sob medida.',
          showScore: true,
          productTitle: 'Acesso VIP + Mentoria Direta',
          productDescription: 'Tudo o que você precisa para implementar o método com segurança e suporte.',
          productPrice: 'R$ 97,00 à vista ou 12x de R$ 9,70',
          ctaText: 'Quero Garantir Minha Vaga Agora →',
          ctaUrl: 'https://seusite.com.br/checkout'
        }
      ]
    };

    this.quizzes.unshift(newQuiz);
    this.saveQuizzesToStorage();
    this.openEditor(newQuiz.id);
  },

  duplicateQuiz(quizId) {
    const original = this.quizzes.find(q => q.id === quizId);
    if (!original) return;

    const copy = JSON.parse(JSON.stringify(original));
    copy.id = 'quiz_' + Date.now();
    copy.title = original.title + ' (Cópia)';
    copy.updatedAt = new Date().toISOString();

    this.quizzes.unshift(copy);
    this.saveQuizzesToStorage();
    this.renderDashboard();
  },

  deleteQuiz(quizId) {
    if (!confirm('Tem certeza que deseja excluir este funil de quiz?')) return;
    this.quizzes = this.quizzes.filter(q => q.id !== quizId);
    this.saveQuizzesToStorage();
    this.renderDashboard();
  },

  openEditor(quizId) {
    const quiz = this.quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    this.currentQuiz = quiz;

    // Atualiza interface do editor
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-editor').classList.remove('hidden');
    document.getElementById('btn-header-back-dashboard').classList.remove('hidden');
    document.getElementById('btn-header-export-html').classList.remove('hidden');

    document.getElementById('editor-quiz-title').value = quiz.title || '';

    // Renderiza abas
    this.renderSteps();
    this.renderDesign();
    this.renderTracking();

    // Atualiza preview inicial
    this.refreshPreview();
  },

  backToDashboard() {
    this.currentQuiz = null;
    this.renderDashboard();
  },

  updateCurrentQuizTitle(title) {
    if (!this.currentQuiz) return;
    this.currentQuiz.title = title.trim() || 'Quiz Sem Título';
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.refreshPreview();
  },

  // ==========================================
  // CONTROLE DE ABAS DO EDITOR
  // ==========================================
  switchEditorTab(tabName) {
    this.activeTab = tabName;

    // Atualiza botões
    ['steps', 'design', 'tracking'].forEach(t => {
      const btn = document.getElementById(`tab-btn-${t}`);
      const content = document.getElementById(`tab-content-${t}`);
      if (t === tabName) {
        btn.className = 'px-4 py-3 font-bold text-xs uppercase tracking-wider text-indigo-400 border-b-2 border-indigo-500 flex items-center gap-2';
        content.classList.remove('hidden');
      } else {
        btn.className = 'px-4 py-3 font-bold text-xs uppercase tracking-wider text-slate-400 hover:text-white border-b-2 border-transparent flex items-center gap-2';
        content.classList.add('hidden');
      }
    });
  },

  // ==========================================
  // RENDERIZAÇÃO DAS ETAPAS (ABA 1)
  // ==========================================
  renderSteps() {
    const container = document.getElementById('steps-container');
    if (!container || !this.currentQuiz) return;

    const steps = this.currentQuiz.steps || [];

    if (steps.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p class="text-xs text-slate-400 mb-3">Nenhuma etapa criada neste quiz.</p>
          <button onclick="App.addNewStep('question')" class="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl">
            Adicionar Pergunta
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = steps.map((step, idx) => {
      return this.renderStepCardHtml(step, idx, steps.length);
    }).join('');
  },

  renderStepCardHtml(step, idx, total) {
    const isOffer = step.type === 'offer';
    const isAnalyzing = step.type === 'analyzing';
    const isLead = step.type === 'lead_capture' || step.isLeadStep;
    const isVideoStep = step.type === 'video_cta';
    const isProductBrowser = step.type === 'product_browser';

    let typeBadge = '<span class="text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] font-bold">Pergunta</span>';
    if (isOffer) typeBadge = '<span class="text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded text-[10px] font-bold">Oferta Final</span>';
    if (isAnalyzing) typeBadge = '<span class="text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded text-[10px] font-bold">Análise Dinâmica</span>';
    if (isLead) typeBadge = '<span class="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold">Captura de Lead</span>';
    if (isVideoStep) typeBadge = '<span class="text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold">Vídeo + Delay</span>';
    if (isProductBrowser) typeBadge = '<span class="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">Navegador Produto</span>';

    return `
      <div class="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 transition-card" id="step-card-${idx}">
        <!-- Cabeçalho do Cartão da Etapa -->
        <div class="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-700/60">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg bg-slate-900 text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-700">
              ${idx + 1}
            </span>
            ${typeBadge}
            <span class="font-bold text-white text-xs truncate max-w-[200px] sm:max-w-[280px]">
              ${this.escape(step.title || 'Sem título')}
            </span>
          </div>

          <!-- Controles de Ordenação e Exclusão -->
          <div class="flex items-center gap-1">
            <button onclick="App.moveStep(${idx}, -1)" ${idx === 0 ? 'disabled class="opacity-30 cursor-not-allowed"' : 'class="hover:text-white"'} class="p-1 text-slate-400 transition" title="Mover para cima">
              <i class="ph ph-arrow-up text-sm"></i>
            </button>
            <button onclick="App.moveStep(${idx}, 1)" ${idx === total - 1 ? 'disabled class="opacity-30 cursor-not-allowed"' : 'class="hover:text-white"'} class="p-1 text-slate-400 transition" title="Mover para baixo">
              <i class="ph ph-arrow-down text-sm"></i>
            </button>
            <button onclick="App.duplicateStep(${idx})" class="p-1 text-slate-400 hover:text-white transition" title="Duplicar Etapa">
              <i class="ph ph-copy text-sm"></i>
            </button>
            <button onclick="App.deleteStep(${idx})" class="p-1 text-slate-500 hover:text-red-400 transition" title="Excluir Etapa">
              <i class="ph ph-trash text-sm"></i>
            </button>
          </div>
        </div>

        <!-- Campos de Configuração da Etapa -->
        <div class="space-y-4">
          
          <!-- Tag e Título -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-400 mb-1">Tag Superior</label>
              <input type="text" value="${this.escape(step.tag || '')}" oninput="App.updateStepProp(${idx}, 'tag', this.value)" placeholder="Ex: Passo 1 de 4" class="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-white">
            </div>
            <div class="sm:col-span-2">
              <label class="block text-[11px] font-bold text-slate-400 mb-1">Título Principal</label>
              <input type="text" value="${this.escape(step.title || '')}" oninput="App.updateStepProp(${idx}, 'title', this.value)" placeholder="Ex: Qual o seu maior desafio?" class="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-white font-semibold">
            </div>
          </div>

          <!-- Subtítulo -->
          <div>
            <label class="block text-[11px] font-bold text-slate-400 mb-1">Subtítulo Explicativo</label>
            <input type="text" value="${this.escape(step.subtitle || '')}" oninput="App.updateStepProp(${idx}, 'subtitle', this.value)" placeholder="Ex: Escolha a alternativa mais sincera..." class="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-white">
          </div>

          ${!isAnalyzing ? `
          <!-- BLOCO 1: VÍDEO DO YOUTUBE (VERTICAL OU HORIZONTAL) -->
          <div class="bg-slate-900/80 p-3.5 rounded-xl border border-slate-700/80 space-y-2.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-red-400 flex items-center gap-1.5">
                <i class="ph ph-youtube-logo text-base"></i> Vídeo do YouTube (Opcional)
              </label>
              <div class="flex items-center gap-2">
                <label class="text-[11px] font-semibold text-slate-400">Formato:</label>
                <select onchange="App.updateStepProp(${idx}, 'videoOrientation', this.value)" class="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-[11px] text-white">
                  <option value="horizontal" ${step.videoOrientation !== 'vertical' ? 'selected' : ''}>Horizontal (16:9 Padrão)</option>
                  <option value="vertical" ${step.videoOrientation === 'vertical' ? 'selected' : ''}>Vertical (9:16 Shorts/Reels)</option>
                </select>
              </div>
            </div>
            <input type="url" value="${this.escape(step.youtubeUrl || '')}" oninput="App.updateStepProp(${idx}, 'youtubeUrl', this.value)" placeholder="Cole o link do YouTube (ex: https://youtube.com/watch?v=... ou shorts/...)" class="w-full bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-white">
          </div>

          <!-- BLOCO 2: BLOCO HTML / NAVEGADOR DE PRODUTO -->
          <div class="bg-slate-900/80 p-3.5 rounded-xl border border-slate-700/80 space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <i class="ph ph-code text-base"></i> Bloco HTML / Navegador de Produto (Iframe)
              </label>
              <button onclick="App.insertSampleIframe(${idx})" class="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold underline">
                Inserir Exemplo Interativo
              </button>
            </div>
            <textarea oninput="App.updateStepProp(${idx}, 'customHtml', this.value)" placeholder="Cole código HTML livre ou iframe da sua loja/produto (ex: <iframe src='https://seusite.com'></iframe>)..." rows="2" class="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-lg text-xs font-mono text-slate-200">${this.escape(step.customHtml || '')}</textarea>
          </div>

          <!-- BLOCO 3: BOTÃO COM DELAY PROGRAMÁVEL -->
          ${!isOffer && !isLead ? `
          <div class="bg-slate-900/80 p-3.5 rounded-xl border border-slate-700/80 space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                <i class="ph ph-timer text-base"></i> Botão com Delay Programável
              </label>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" ${step.hasDelayButton ? 'checked' : ''} onchange="App.updateStepProp(${idx}, 'hasDelayButton', this.checked)" class="sr-only peer">
                <div class="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            ${step.hasDelayButton ? `
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 mb-1">Tempo de Espera (em Segundos):</label>
                  <input type="number" min="1" max="3600" value="${step.delaySeconds || 5}" oninput="App.updateStepProp(${idx}, 'delaySeconds', parseInt(this.value, 10))" class="w-full bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-white">
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 mb-1">Texto do Botão:</label>
                  <input type="text" value="${this.escape(step.delayButtonText || 'Avançar para a próxima etapa →')}" oninput="App.updateStepProp(${idx}, 'delayButtonText', this.value)" class="w-full bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-white">
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-[11px] font-bold text-slate-400 mb-1">Link Opcional de Redirecionamento (ou deixe vazio para avançar quiz):</label>
                  <input type="url" value="${this.escape(step.delayButtonUrl || '')}" oninput="App.updateStepProp(${idx}, 'delayButtonUrl', this.value)" placeholder="https://..." class="w-full bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-white">
                </div>
              </div>
            ` : ''}
          </div>
          ` : ''}

          ` : ''}

          <!-- BLOCO DE OPÇÕES DE RESPOSTA (SE FOR PERGUNTA) -->
          ${!isOffer && !isAnalyzing && !isLead ? `
          <div class="space-y-2 pt-1">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-slate-300">Alternativas / Opções de Escolha</label>
              <button onclick="App.addOptionToStep(${idx})" class="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                <i class="ph ph-plus-circle"></i> Adicionar Alternativa
              </button>
            </div>

            <div class="space-y-2">
              ${(step.options || []).map((opt, optIdx) => `
                <div class="flex items-center gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-700">
                  <input type="text" value="${this.escape(opt.icon || '👉')}" oninput="App.updateOptionProp(${idx}, ${optIdx}, 'icon', this.value)" title="Ícone ou Emoji" class="w-9 text-center bg-slate-800 border border-slate-700 py-1 rounded text-xs text-white">
                  <input type="text" value="${this.escape(opt.text || '')}" oninput="App.updateOptionProp(${idx}, ${optIdx}, 'text', this.value)" placeholder="Texto da alternativa..." class="flex-1 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded text-xs text-white">
                  <div class="flex items-center gap-1">
                    <span class="text-[10px] text-slate-400">Pts:</span>
                    <input type="number" value="${opt.points || 0}" oninput="App.updateOptionProp(${idx}, ${optIdx}, 'points', parseInt(this.value, 10))" title="Pontos para esta resposta" class="w-12 text-center bg-slate-800 border border-slate-700 py-1 rounded text-xs text-white">
                  </div>
                  <button onclick="App.deleteOption(${idx}, ${optIdx})" class="p-1 text-slate-500 hover:text-red-400 transition" title="Remover alternativa">
                    <i class="ph ph-x text-sm"></i>
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <!-- SE FOR ETAPA DE OFERTA -->
          ${isOffer ? `
            <div class="bg-violet-950/30 p-4 rounded-xl border border-violet-800/40 space-y-3">
              <h4 class="text-xs font-bold text-violet-300">Configurações da Oferta de Vendas</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 mb-1">Título do Produto/Serviço:</label>
                  <input type="text" value="${this.escape(step.productTitle || '')}" oninput="App.updateStepProp(${idx}, 'productTitle', this.value)" placeholder="Ex: Combo Skincare Renovador" class="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-white">
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 mb-1">Preço / Condição de Pagamento:</label>
                  <input type="text" value="${this.escape(step.productPrice || '')}" oninput="App.updateStepProp(${idx}, 'productPrice', this.value)" placeholder="Ex: 12x de R$ 19,90" class="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-white font-bold text-emerald-400">
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-[11px] font-bold text-slate-400 mb-1">Descrição Curta do Produto:</label>
                  <input type="text" value="${this.escape(step.productDescription || '')}" oninput="App.updateStepProp(${idx}, 'productDescription', this.value)" placeholder="Benefícios e o que está incluso..." class="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-white">
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-[11px] font-bold text-slate-400 mb-1">Texto do Botão de Checkout (CTA):</label>
                  <input type="text" value="${this.escape(step.ctaText || 'Garantir Minha Oferta Exclusiva Agora →')}" oninput="App.updateStepProp(${idx}, 'ctaText', this.value)" class="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-white font-bold">
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-[11px] font-bold text-slate-400 mb-1">Link do Checkout / WhatsApp:</label>
                  <input type="url" value="${this.escape(step.ctaUrl || '')}" oninput="App.updateStepProp(${idx}, 'ctaUrl', this.value)" placeholder="https://pay.hotmart.com/... ou https://wa.me/..." class="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-white">
                </div>
              </div>
            </div>
          ` : ''}

        </div>
      </div>
    `;
  },

  // ==========================================
  // MANIPULAÇÃO DE ETAPAS
  // ==========================================
  toggleAddStepMenu() {
    const menu = document.getElementById('menu-add-step');
    menu.classList.toggle('hidden');
  },

  addNewStep(type) {
    document.getElementById('menu-add-step').classList.add('hidden');
    if (!this.currentQuiz) return;

    let newStep = {
      id: 'step_' + Date.now(),
      type: type,
      tag: 'Nova Etapa',
      title: 'Título da Etapa',
      subtitle: 'Instruções para o visitante...',
      youtubeUrl: '',
      videoOrientation: 'horizontal',
      customHtml: '',
      hasDelayButton: false,
      delaySeconds: 5,
      delayButtonText: 'Avançar para a próxima etapa →',
      options: []
    };

    if (type === 'question') {
      newStep.title = 'Qual a sua preferência?';
      newStep.options = [
        { text: 'Opção 1', icon: '🔹', points: 5, targetStepIndex: '' },
        { text: 'Opção 2', icon: '🔸', points: 10, targetStepIndex: '' }
      ];
    } else if (type === 'video_cta') {
      newStep.title = 'Assista ao vídeo explicativo';
      newStep.youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      newStep.hasDelayButton = true;
      newStep.delaySeconds = 10;
      newStep.delayButtonText = 'Quero Aproveitar Esta Oportunidade →';
    } else if (type === 'product_browser') {
      newStep.title = 'Conheça o Produto por Dentro';
      newStep.subtitle = 'Você pode interagir e rolar o bloco abaixo antes de decidir.';
      newStep.customHtml = '<div style="background:#2563eb;color:#fff;padding:24px;border-radius:12px;text-align:center;"><h4>Navegador do Produto</h4><p>Demonstração interativa do produto.</p></div>';
      newStep.hasDelayButton = true;
      newStep.delaySeconds = 5;
    } else if (type === 'lead_capture') {
      newStep.title = 'Para onde devemos enviar seu diagnóstico?';
      newStep.isLeadStep = true;
      newStep.requireEmail = true;
      newStep.submitButtonText = 'Liberar Meu Diagnóstico Completo →';
    } else if (type === 'analyzing') {
      newStep.title = 'Analisando suas respostas...';
      newStep.subtitle = 'Calculando o perfil ideal para o seu objetivo.';
      newStep.durationSeconds = 3.5;
    } else if (type === 'offer') {
      newStep.title = 'Sua Solução Personalizada';
      newStep.productTitle = 'Pacote Completo de Transformação';
      newStep.productPrice = 'R$ 197,00';
      newStep.ctaText = 'Quero Comprar Agora →';
      newStep.ctaUrl = '#';
    }

    this.currentQuiz.steps.push(newStep);
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.refreshPreview();
  },

  moveStep(index, direction) {
    if (!this.currentQuiz) return;
    const steps = this.currentQuiz.steps;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const temp = steps[index];
    steps[index] = steps[targetIndex];
    steps[targetIndex] = temp;

    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.refreshPreview();
  },

  duplicateStep(index) {
    if (!this.currentQuiz) return;
    const original = this.currentQuiz.steps[index];
    const copy = JSON.parse(JSON.stringify(original));
    copy.id = 'step_' + Date.now();
    copy.title = original.title + ' (Cópia)';

    this.currentQuiz.steps.splice(index + 1, 0, copy);
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.refreshPreview();
  },

  deleteStep(index) {
    if (!this.currentQuiz) return;
    if (this.currentQuiz.steps.length <= 1) {
      alert('O quiz precisa de pelo menos 1 etapa.');
      return;
    }
    if (!confirm('Deseja remover esta etapa?')) return;

    this.currentQuiz.steps.splice(index, 1);
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.refreshPreview();
  },

  updateStepProp(stepIndex, prop, value) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIndex]) return;
    this.currentQuiz.steps[stepIndex][prop] = value;
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.refreshPreview(stepIndex);
  },

  addOptionToStep(stepIndex) {
    const step = this.currentQuiz.steps[stepIndex];
    if (!step.options) step.options = [];
    step.options.push({
      text: 'Nova Opção',
      icon: '👉',
      points: 5,
      targetStepIndex: ''
    });
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.refreshPreview(stepIndex);
  },

  updateOptionProp(stepIndex, optIndex, prop, value) {
    const step = this.currentQuiz.steps[stepIndex];
    if (!step || !step.options || !step.options[optIndex]) return;
    step.options[optIndex][prop] = value;
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.refreshPreview(stepIndex);
  },

  deleteOption(stepIndex, optIndex) {
    const step = this.currentQuiz.steps[stepIndex];
    if (!step || !step.options) return;
    step.options.splice(optIndex, 1);
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.refreshPreview(stepIndex);
  },

  insertSampleIframe(stepIndex) {
    const sampleHtml = `<iframe src="https://example.com" style="width:100%;height:350px;border-radius:10px;border:none;"></iframe>`;
    this.updateStepProp(stepIndex, 'customHtml', sampleHtml);
    this.renderSteps();
  },

  // ==========================================
  // ABA 2: VISUAL & DESIGN
  // ==========================================
  renderDesign() {
    if (!this.currentQuiz) return;
    const theme = this.currentQuiz.theme || {};

    const syncColor = (id, val) => {
      const colInput = document.getElementById(id);
      const txtInput = document.getElementById(id + '-text');
      if (colInput) colInput.value = val || '#6366f1';
      if (txtInput) txtInput.value = val || '#6366f1';
    };

    syncColor('theme-primary', theme.primaryColor || '#6366f1');
    syncColor('theme-accent', theme.accentColor || '#10b981');
    syncColor('theme-bg', theme.bgColor || '#0f172a');
    syncColor('theme-card-bg', theme.cardBg || '#1e293b');
    syncColor('theme-text', theme.textColor || '#f8fafc');

    if (document.getElementById('theme-radius')) document.getElementById('theme-radius').value = theme.borderRadius || '16px';
    if (document.getElementById('theme-shadow')) document.getElementById('theme-shadow').value = theme.shadow || 'medium';
    if (document.getElementById('theme-max-width')) document.getElementById('theme-max-width').value = theme.maxWidth || '560px';
  },

  updateThemeProp(prop, value) {
    if (!this.currentQuiz) return;
    if (!this.currentQuiz.theme) this.currentQuiz.theme = {};

    this.currentQuiz.theme[prop] = value;

    // Se for cor, atualiza o par
    if (prop === 'primaryColor') {
      const c = document.getElementById('theme-primary');
      const t = document.getElementById('theme-primary-text');
      if (c) c.value = value;
      if (t) t.value = value;
    }
    if (prop === 'bgColor') {
      const c = document.getElementById('theme-bg');
      const t = document.getElementById('theme-bg-text');
      if (c) c.value = value;
      if (t) t.value = value;
    }
    if (prop === 'cardBg') {
      const c = document.getElementById('theme-card-bg');
      const t = document.getElementById('theme-card-bg-text');
      if (c) c.value = value;
      if (t) t.value = value;
    }

    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.refreshPreview();
  },

  // ==========================================
  // ABA 3: RASTREAMENTO & RETENÇÃO
  // ==========================================
  renderTracking() {
    if (!this.currentQuiz) return;
    const tracking = this.currentQuiz.tracking || {};
    if (document.getElementById('tracking-webhook')) document.getElementById('tracking-webhook').value = tracking.webhookUrl || '';
    if (document.getElementById('tracking-pixel')) document.getElementById('tracking-pixel').value = tracking.metaPixelId || '';
    if (document.getElementById('tracking-ga4')) document.getElementById('tracking-ga4').value = tracking.ga4Id || '';
  },

  updateTrackingProp(prop, value) {
    if (!this.currentQuiz) return;
    if (!this.currentQuiz.tracking) this.currentQuiz.tracking = {};
    this.currentQuiz.tracking[prop] = value.trim();
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.refreshPreview();
  },

  // ==========================================
  // PREVIEW INTERATIVO EM TEMPO REAL
  // ==========================================
  focusStep(stepIndex) {
    this.currentEditingStepIndex = stepIndex;
    this.refreshPreview(stepIndex);
  },

  refreshPreview(stepIndex) {
    if (!this.currentQuiz) return;
    const iframe = document.getElementById('preview-iframe');
    if (!iframe) return;

    if (stepIndex !== undefined && stepIndex !== null) {
      this.currentEditingStepIndex = stepIndex;
    }

    const targetStep = this.currentEditingStepIndex || 0;

    clearTimeout(this.refreshTimeout);
    this.refreshTimeout = setTimeout(() => {
      try {
        const fullHtml = QuizTemplateEngine.generate(this.currentQuiz, targetStep);

        // Escreve com segurança no iframe
        const doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        if (doc) {
          doc.open();
          doc.write(fullHtml);
          doc.close();
        } else {
          iframe.srcdoc = fullHtml;
        }
      } catch (err) {
        console.warn('Erro ao atualizar via document.write, usando fallback:', err);
        try {
          iframe.srcdoc = QuizTemplateEngine.generate(this.currentQuiz, targetStep);
        } catch (e) {
          console.error('Falha geral no preview:', e);
        }
      }
    }, 120);
  },

  restartPreview() {
    this.currentEditingStepIndex = 0;
    this.refreshPreview(0);
  },

  setPreviewDevice(device) {
    this.previewDevice = device;
    const frame = document.getElementById('preview-mockup-frame');
    const btnMobile = document.getElementById('btn-device-mobile');
    const btnDesktop = document.getElementById('btn-device-desktop');

    if (device === 'desktop') {
      frame.classList.add('desktop-view');
      btnDesktop.className = 'px-2.5 py-1 rounded text-xs font-semibold bg-indigo-600 text-white flex items-center gap-1 transition';
      btnMobile.className = 'px-2.5 py-1 rounded text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition';
    } else {
      frame.classList.remove('desktop-view');
      btnMobile.className = 'px-2.5 py-1 rounded text-xs font-semibold bg-indigo-600 text-white flex items-center gap-1 transition';
      btnDesktop.className = 'px-2.5 py-1 rounded text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition';
    }
  },

  // ==========================================
  // EXPORTAÇÕES (HTML E JSON)
  // ==========================================
  exportCurrentQuizHtml() {
    if (!this.currentQuiz) return;
    this.exportDirectHtml(this.currentQuiz.id);
  },

  exportDirectHtml(quizId) {
    const quiz = this.quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    const htmlContent = QuizTemplateEngine.generate(quiz);
    this.lastExportedHtml = htmlContent;

    const safeTitle = (quiz.title || 'quiz')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');

    const filename = `${safeTitle}.html`;
    this.downloadFile(filename, htmlContent, 'text/html');

    // Abre o modal de sucesso
    document.getElementById('modal-export-success').classList.remove('hidden');
  },

  downloadExportedHtmlAgain() {
    if (!this.lastExportedHtml) return;
    this.downloadFile('meu-quiz-vendas.html', this.lastExportedHtml, 'text/html');
  },

  exportCurrentQuizJson() {
    if (!this.currentQuiz) return;
    const jsonStr = JSON.stringify(this.currentQuiz, null, 2);
    const safeTitle = (this.currentQuiz.title || 'quiz').toLowerCase().replace(/\s+/g, '-');
    this.downloadFile(`${safeTitle}-projeto.json`, jsonStr, 'application/json');
  },

  handleImportProject(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedQuiz = JSON.parse(e.target.result);
        if (!importedQuiz.steps || !Array.isArray(importedQuiz.steps)) {
          alert('Arquivo inválido: o formato do projeto de quiz não foi reconhecido.');
          return;
        }

        // Atribui novo ID para evitar colisões
        importedQuiz.id = 'quiz_' + Date.now();
        importedQuiz.title = (importedQuiz.title || 'Quiz Importado') + ' (Importado)';
        importedQuiz.updatedAt = new Date().toISOString();

        this.quizzes.unshift(importedQuiz);
        this.saveQuizzesToStorage();
        this.renderDashboard();
        this.openEditor(importedQuiz.id);
        alert('Projeto importado com sucesso!');
      } catch (err) {
        alert('Erro ao ler o arquivo JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Limpa o input
  },

  downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  },

  // ==========================================
  // MODAIS E UTILITÁRIOS
  // ==========================================
  openHowItWorksModal() {
    document.getElementById('modal-how-it-works').classList.remove('hidden');
  },

  toggleDashboardView() {
    const dash = document.getElementById('view-dashboard');
    const editor = document.getElementById('view-editor');
    if (dash.classList.contains('hidden')) {
      dash.classList.remove('hidden');
      editor.classList.add('hidden');
      this.renderDashboard();
    } else {
      dash.classList.add('hidden');
      editor.classList.remove('hidden');
      if (this.currentQuiz) {
        this.openEditor(this.currentQuiz.id);
      } else if (this.quizzes.length > 0) {
        this.openEditor(this.quizzes[0].id);
      }
    }
  },

  openSheetsGuideModal() {
    document.getElementById('modal-sheets-guide').classList.remove('hidden');
  },

  openGithubGuideModal() {
    document.getElementById('modal-github-guide').classList.remove('hidden');
  },

  closeModals() {
    document.querySelectorAll('[id^="modal-"]').forEach(modal => modal.classList.add('hidden'));
  },

  copySheetsScript() {
    const code = document.getElementById('sheets-script-code').innerText;
    navigator.clipboard.writeText(code).then(() => {
      alert('Código do Apps Script copiado para a área de transferência!');
    });
  },

  escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // ==========================================
  // QUIZ DE EXEMPLO PADRÃO (DEMONSTRAÇÃO)
  // ==========================================
  getSampleQuizData() {
    return {
      id: 'quiz_demo_vsl',
      title: 'Diagnóstico de Vendas Express (Exemplo)',
      description: 'Funil demonstrativo com vídeo vertical, bloco HTML e botão com delay programável.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      theme: {
        primaryColor: '#6366f1',
        primaryHover: '#4f46e5',
        bgColor: '#0f172a',
        cardBg: '#1e293b',
        textColor: '#f8fafc',
        textMuted: '#94a3b8',
        accentColor: '#10b981',
        borderRadius: '16px',
        borderWidth: '1px',
        borderColor: '#334155',
        shadow: 'medium',
        maxWidth: '560px'
      },
      tracking: {
        webhookUrl: '',
        metaPixelId: '',
        ga4Id: ''
      },
      steps: [
        {
          id: 'step_1',
          type: 'question',
          tag: 'Diagnóstico 1 de 4',
          title: 'Qual é o seu maior gargalo de vendas atualmente?',
          subtitle: 'Selecione a situação que mais se aproxima do seu dia a dia.',
          youtubeUrl: '',
          videoOrientation: 'horizontal',
          customHtml: '',
          hasDelayButton: false,
          delaySeconds: 5,
          delayButtonText: 'Avançar →',
          options: [
            { text: 'Pouco tráfego qualificado chegando no WhatsApp', icon: '📲', points: 10, targetStepIndex: '' },
            { text: 'Pessoas chegam, perguntam preço e somem', icon: '👻', points: 15, targetStepIndex: '' },
            { text: 'Não tenho uma esteira de produtos bem definida', icon: '🧱', points: 20, targetStepIndex: '' }
          ]
        },
        {
          id: 'step_2',
          type: 'video_cta',
          tag: 'Vídeo Importante',
          title: 'Veja como dobrar sua conversão com este método',
          subtitle: 'Assista a esta breve explicação de 1 minuto (o botão aparecerá em instantes).',
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          videoOrientation: 'horizontal',
          customHtml: '',
          hasDelayButton: true,
          delaySeconds: 6,
          delayButtonText: 'Entendi! Quero Continuar o Teste →'
        },
        {
          id: 'step_3',
          type: 'product_browser',
          tag: 'Degustação do Produto',
          title: 'Navegue pelo painel do método',
          subtitle: 'Teste o bloco interativo abaixo antes de receber sua oferta final.',
          customHtml: '<div style="background:linear-gradient(135deg, #1e1b4b, #312e81); border:1px solid #4338ca; padding:20px; border-radius:12px; text-align:center; color:#fff;"><h4 style="margin-bottom:8px; font-weight:bold;">🚀 Simulador de Resultados</h4><p style="font-size:13px; opacity:0.85;">Com a implementação deste funil, seus leads chegam 3x mais conscientes e prontos para comprar.</p></div>',
          hasDelayButton: true,
          delaySeconds: 4,
          delayButtonText: 'Ir para a Análise Final →'
        },
        {
          id: 'step_4',
          type: 'lead_capture',
          tag: 'Último Passo',
          title: 'Onde devemos liberar o seu acesso com desconto?',
          subtitle: 'Preencha seus dados para receber o diagnóstico completo.',
          isLeadStep: true,
          requireEmail: true,
          submitButtonText: 'Ver Meu Plano Personalizado →'
        },
        {
          id: 'step_5',
          type: 'analyzing',
          title: 'Calculando a melhor oferta para você...',
          subtitle: 'Aguarde 3 segundos enquanto processamos seu perfil.',
          durationSeconds: 3.5
        },
        {
          id: 'step_6',
          type: 'offer',
          tag: 'Oferta Especial Liberada',
          title: 'Parabéns! Sua Condição Especial Está Pronta',
          subtitle: 'Você foi aprovado para receber 50% de desconto na adesão hoje.',
          showScore: true,
          productTitle: 'Método Funil de Quiz 2.0',
          productDescription: 'Acesso vitalício ao treinamento, modelos prontos de copy e suporte individual.',
          productPrice: 'De R$ 497 por apenas R$ 197 à vista',
          ctaText: 'Garantir Minha Vaga com 50% de Desconto →',
          ctaUrl: 'https://pay.hotmart.com/exemplo'
        }
      ]
    };
  }
};

// Inicializa no carregamento do DOM
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
