/**
 * APLICAÇÃO PRINCIPAL: QuizForge App
 * Gerencia o estado dos quizzes, o editor visual baseado em BLOCOS MODULARES por etapa,
 * o preview em tempo real nativo e as exportações autônomas.
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

  // Estado interativo do celular de preview
  preview: {
    currentStepIndex: 0,
    userAnswers: {},
    totalScore: 0,
    leadData: {},
    delayTimeout: null
  },

  init() {
    this.loadQuizzesFromStorage();
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

    // Se estiver vazio, inicia com o quiz de demonstração montado em blocos
    if (!this.quizzes || this.quizzes.length === 0) {
      this.quizzes = [this.getSampleQuizData()];
      this.saveQuizzesToStorage();
    } else {
      // Garante que todos os quizzes estejam normalizados para a estrutura de blocos
      this.quizzes.forEach(q => {
        if (q.steps) {
          q.steps = q.steps.map(s => QuizTemplateEngine.normalizeStep(s));
        }
      });
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
    const dash = document.getElementById('view-dashboard');
    const editor = document.getElementById('view-editor');
    const btnBack = document.getElementById('btn-header-back-dashboard');
    const btnExport = document.getElementById('btn-header-export-html');

    if (dash) dash.classList.remove('hidden');
    if (editor) editor.classList.add('hidden');
    if (btnBack) btnBack.classList.add('hidden');
    if (btnExport) btnExport.classList.add('hidden');

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
      description: 'Quiz interativo montado por blocos modulares.',
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
          title: 'Etapa 1',
          blocks: [
            {
              id: 'b_head_1',
              type: 'heading',
              tag: 'Pergunta 1 de 2',
              title: 'Qual é o seu objetivo principal?',
              subtitle: 'Escolha a opção que melhor te representa:'
            },
            {
              id: 'b_opt_1',
              type: 'question',
              options: [
                { icon: '🚀', text: 'Quero aumentar minhas vendas', points: 10, targetStepIndex: '' },
                { icon: '⚙️', text: 'Quero organizar meu processo', points: 5, targetStepIndex: '' }
              ]
            }
          ]
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

    // Normaliza passos se necessário
    if (quiz.steps) {
      quiz.steps = quiz.steps.map(s => QuizTemplateEngine.normalizeStep(s));
    }

    this.currentQuiz = quiz;

    const dash = document.getElementById('view-dashboard');
    if (dash) dash.classList.add('hidden');
    const editor = document.getElementById('view-editor');
    if (editor) editor.classList.remove('hidden');
    const btnBack = document.getElementById('btn-header-back-dashboard');
    if (btnBack) btnBack.classList.remove('hidden');
    const btnExport = document.getElementById('btn-header-export-html');
    if (btnExport) btnExport.classList.remove('hidden');

    const titleInput = document.getElementById('editor-quiz-title');
    if (titleInput) titleInput.value = quiz.title || '';

    this.renderSteps();
    this.renderDesign();
    this.renderTracking();

    this.restartPreview();
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
    ['steps', 'design', 'tracking', 'analytics'].forEach(t => {
      const btn = document.getElementById(`tab-btn-${t}`);
      const content = document.getElementById(`tab-content-${t}`);
      if (btn && content) {
        if (t === tabName) {
          btn.className = 'px-4 py-3 font-bold text-xs uppercase tracking-wider text-indigo-400 border-b-2 border-indigo-500 flex items-center gap-2 whitespace-nowrap';
          content.classList.remove('hidden');
        } else {
          btn.className = 'px-4 py-3 font-bold text-xs uppercase tracking-wider text-slate-400 hover:text-white border-b-2 border-transparent flex items-center gap-2 whitespace-nowrap';
          content.classList.add('hidden');
        }
      }
    });

    if (tabName === 'analytics') {
      this.renderFunnelDashboard();
    }
  },

  // ==========================================
  // ABA 1: RENDERIZAÇÃO DAS ETAPAS E BLOCOS
  // ==========================================
  renderSteps() {
    const container = document.getElementById('steps-container');
    if (!container || !this.currentQuiz) return;

    const steps = this.currentQuiz.steps || [];

    if (steps.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p class="text-xs text-slate-400 mb-3">Nenhuma etapa criada neste quiz.</p>
          <button onclick="App.addNewStep()" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition">
            + Adicionar Primeira Etapa
          </button>
        </div>
      `;
      return;
    }

    const cardsHtml = steps.map((step, idx) => {
      return this.renderStepCardHtml(step, idx, steps.length);
    }).join('');

    // Demanda 3: Botão "+ Nova Etapa em Branco" fixado logo abaixo do card da última etapa criada!
    const addStepBottomButton = `
      <div class="pt-2 pb-8 flex flex-col items-center justify-center">
        <button onclick="App.addNewStep()" class="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-sm shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 transition transform hover:-translate-y-0.5 border border-indigo-400/30">
          <i class="ph ph-plus-circle text-xl"></i>
          + Nova Etapa em Branco (Etapa ${steps.length + 1})
        </button>
        <p class="text-[11px] text-slate-400 mt-2 font-medium">Clique para adicionar uma nova etapa sequencial ao final do funil</p>
      </div>
    `;

    container.innerHTML = cardsHtml + addStepBottomButton;
  },

  renderStepCardHtml(step, stepIdx, totalSteps) {
    step = QuizTemplateEngine.normalizeStep(step);
    const blocks = step.blocks || [];
    const isActive = this.preview.currentStepIndex === stepIdx;

    return `
      <div class="bg-slate-900/90 border ${isActive ? 'border-indigo-500/80 shadow-lg shadow-indigo-500/10' : 'border-slate-800'} rounded-2xl p-4 transition-card" id="step-card-${stepIdx}">
        
        <!-- Cabeçalho da Etapa -->
        <div class="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
          <div class="flex items-center gap-2.5">
            <span class="w-7 h-7 rounded-lg bg-slate-800 text-indigo-400 font-extrabold text-xs flex items-center justify-center border border-slate-700">
              ${stepIdx + 1}
            </span>
            <input type="text" value="${this.escape(step.title || 'Etapa ' + (stepIdx + 1))}" onchange="App.updateStepTitle(${stepIdx}, this.value)" placeholder="Nome da Etapa..." class="bg-transparent text-white font-extrabold text-sm border-b border-transparent hover:border-slate-700 focus:border-indigo-500 px-1 py-0.5 outline-none transition max-w-[200px] sm:max-w-[280px]">
            <span class="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700">
              ${blocks.length} ${blocks.length === 1 ? 'componente' : 'componentes'}
            </span>
          </div>

          <!-- Ações da Etapa: Ver no celular, Mover, Duplicar, Excluir -->
          <div class="flex items-center gap-1">
            <button onclick="App.focusStep(${stepIdx})" class="px-2 py-1 rounded-lg text-xs font-semibold ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'} transition flex items-center gap-1" title="Ver esta etapa no celular">
              <i class="ph ph-eye"></i> <span class="hidden sm:inline">Ver</span>
            </button>
            <button onclick="App.moveStep(${stepIdx}, -1)" ${stepIdx === 0 ? 'disabled class="opacity-30 cursor-not-allowed p-1 text-slate-500"' : 'class="p-1 text-slate-400 hover:text-white"'} title="Mover para cima">
              <i class="ph ph-arrow-up text-sm"></i>
            </button>
            <button onclick="App.moveStep(${stepIdx}, 1)" ${stepIdx === totalSteps - 1 ? 'disabled class="opacity-30 cursor-not-allowed p-1 text-slate-500"' : 'class="p-1 text-slate-400 hover:text-white"'} title="Mover para baixo">
              <i class="ph ph-arrow-down text-sm"></i>
            </button>
            <button onclick="App.duplicateStep(${stepIdx})" class="p-1 text-slate-400 hover:text-white transition" title="Duplicar Etapa">
              <i class="ph ph-copy text-sm"></i>
            </button>
            <button onclick="App.deleteStep(${stepIdx})" class="p-1 text-slate-500 hover:text-red-400 transition" title="Excluir Etapa">
              <i class="ph ph-trash text-sm"></i>
            </button>
          </div>
        </div>

        <!-- LISTA DE BLOCOS DENTRO DA ETAPA -->
        <div class="space-y-3">
          ${blocks.length === 0 ? `
            <div class="py-6 px-4 text-center bg-slate-950/60 border border-dashed border-slate-800 rounded-xl">
              <div class="text-2xl mb-1">🧩</div>
              <p class="text-xs font-bold text-slate-300">Esta etapa está em branco</p>
              <p class="text-[11px] text-slate-400 mb-3">Escolha abaixo quais componentes você quer combinar aqui dentro:</p>
              ${this.renderBlockPickerToolbar(stepIdx)}
            </div>
          ` : `
            <div class="space-y-3">
              ${blocks.map((block, bIdx) => this.renderBlockCardHtml(stepIdx, block, bIdx, blocks.length)).join('')}
            </div>

            <!-- Botão para adicionar mais blocos à etapa -->
            <div class="pt-2 border-t border-slate-800/80">
              <p class="text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                <i class="ph ph-plus-circle text-indigo-400"></i> Adicionar mais um componente nesta etapa:
              </p>
              ${this.renderBlockPickerToolbar(stepIdx)}
            </div>
          `}
        </div>

      </div>
    `;
  },

  // Barra de Botões Rápidos para Adicionar Componentes em uma Etapa
  renderBlockPickerToolbar(stepIdx) {
    return `
      <div class="flex flex-wrap items-center gap-1.5">
        <button onclick="App.addBlockToStep(${stepIdx}, 'heading')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1">
          <span>📝</span> Título / Texto
        </button>
        <button onclick="App.addBlockToStep(${stepIdx}, 'video')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-red-400 text-xs font-semibold border border-slate-700 transition flex items-center gap-1">
          <span>🎬</span> Vídeo YouTube
        </button>
        <button onclick="App.addBlockToStep(${stepIdx}, 'question')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 text-xs font-semibold border border-slate-700 transition flex items-center gap-1">
          <span>❓</span> Pergunta / Opções
        </button>
        <button onclick="App.addBlockToStep(${stepIdx}, 'fake_loader')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold border border-teal-500/30 transition flex items-center gap-1 shadow-sm">
          <span>⏳</span> Diagnóstico Falso (0% a 100%)
        </button>
        <button onclick="App.addBlockToStep(${stepIdx}, 'delay_button')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold border border-slate-700 transition flex items-center gap-1">
          <span>⏱️</span> Botão de Ação / Avanço
        </button>
        <button onclick="App.addBlockToStep(${stepIdx}, 'html')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold border border-slate-700 transition flex items-center gap-1">
          <span>🌐</span> Bloco HTML / Loja
        </button>
        <button onclick="App.addBlockToStep(${stepIdx}, 'lead_form')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold border border-slate-700 transition flex items-center gap-1">
          <span>📱</span> Captura de Lead
        </button>
        <button onclick="App.addBlockToStep(${stepIdx}, 'offer')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-violet-400 text-xs font-semibold border border-slate-700 transition flex items-center gap-1">
          <span>🎁</span> Oferta / Checkout
        </button>
      </div>
    `;
  },

  // Renderiza o Cartão de um Bloco Individual
  renderBlockCardHtml(stepIdx, block, bIdx, totalBlocks) {
    let blockBadge = '';
    let blockBody = '';

    // 1. BLOCO DE TÍTULO / TEXTO
    if (block.type === 'heading') {
      blockBadge = '<span class="text-slate-300 font-bold text-xs flex items-center gap-1.5"><span>📝</span> Título & Subtítulo</span>';
      blockBody = `
        <div class="space-y-2.5 pt-1">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Tag Superior (Opcional)</label>
              <input type="text" value="${this.escape(block.tag || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'tag', this.value)" placeholder="Ex: Passo 1 de 3" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
            </div>
            <div class="sm:col-span-2">
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Título Principal</label>
              <input type="text" value="${this.escape(block.title || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'title', this.value)" placeholder="Ex: Qual o seu maior desafio hoje?" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-semibold">
            </div>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1">Subtítulo Explicativo</label>
            <input type="text" value="${this.escape(block.subtitle || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'subtitle', this.value)" placeholder="Ex: Selecione uma das opções abaixo para prosseguir..." class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
          </div>
        </div>
      `;
    }

    // 2. BLOCO DE VÍDEO DO YOUTUBE
    else if (block.type === 'video') {
      blockBadge = '<span class="text-red-400 font-bold text-xs flex items-center gap-1.5"><span>🎬</span> Vídeo do YouTube</span>';
      blockBody = `
        <div class="space-y-2.5 pt-1">
          <div class="flex items-center justify-between gap-3">
            <div class="flex-1">
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Link do Vídeo no YouTube</label>
              <input type="url" value="${this.escape(block.youtubeUrl || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'youtubeUrl', this.value)" placeholder="Ex: https://youtube.com/watch?v=... ou shorts/..." class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
            </div>
            <div class="w-36">
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Formato</label>
              <select onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'orientation', this.value)" class="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded-lg text-xs text-white">
                <option value="horizontal" ${block.orientation !== 'vertical' ? 'selected' : ''}>Horizontal (16:9)</option>
                <option value="vertical" ${block.orientation === 'vertical' ? 'selected' : ''}>Vertical (Shorts)</option>
              </select>
            </div>
          </div>
        </div>
      `;
    }

    // 3. BLOCO DE PERGUNTA COM OPÇÕES
    else if (block.type === 'question') {
      blockBadge = '<span class="text-indigo-400 font-bold text-xs flex items-center gap-1.5"><span>❓</span> Pergunta com Alternativas</span>';
      const options = block.options || [];
      blockBody = `
        <div class="space-y-2.5 pt-1">
          <div class="flex items-center justify-between">
            <label class="text-[11px] font-bold text-slate-400">Alternativas de Escolha:</label>
            <button onclick="App.addOptionToQuestionBlock(${stepIdx}, ${bIdx})" class="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              <i class="ph ph-plus-circle"></i> + Adicionar Alternativa
            </button>
          </div>

          <div class="space-y-2">
            ${options.map((opt, optIdx) => `
              <div class="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-700">
                <input type="text" value="${this.escape(opt.icon || '👉')}" oninput="App.updateOptionProp(${stepIdx}, ${bIdx}, ${optIdx}, 'icon', this.value)" title="Ícone ou Emoji" class="w-9 text-center bg-slate-800 border border-slate-700 py-1 rounded text-xs text-white">
                <input type="text" value="${this.escape(opt.text || '')}" oninput="App.updateOptionProp(${stepIdx}, ${bIdx}, ${optIdx}, 'text', this.value)" placeholder="Texto da alternativa..." class="flex-1 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded text-xs text-white">
                <div class="flex items-center gap-1">
                  <span class="text-[10px] text-slate-400">Pts:</span>
                  <input type="number" value="${opt.points || 0}" oninput="App.updateOptionProp(${stepIdx}, ${bIdx}, ${optIdx}, 'points', parseInt(this.value, 10))" title="Pontos" class="w-12 text-center bg-slate-800 border border-slate-700 py-1 rounded text-xs text-white">
                </div>
                <button onclick="App.deleteOptionFromQuestionBlock(${stepIdx}, ${bIdx}, ${optIdx})" class="p-1 text-slate-500 hover:text-red-400 transition" title="Excluir">
                  <i class="ph ph-x text-sm"></i>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // 4. BLOCO DE BOTÃO COM DELAY
    else if (block.type === 'delay_button') {
      blockBadge = '<span class="text-amber-400 font-bold text-xs flex items-center gap-1.5"><span>⏱️</span> Botão com Delay Programável</span>';
      blockBody = `
        <div class="space-y-2.5 pt-1">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Tempo de Espera (Segundos)</label>
              <input type="number" min="1" max="3600" value="${block.delaySeconds || 5}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'delaySeconds', parseInt(this.value, 10))" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-bold text-amber-400">
            </div>
            <div class="sm:col-span-2">
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Texto do Botão</label>
              <input type="text" value="${this.escape(block.text || block.delayButtonText || 'Avançar para a próxima etapa →')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'text', this.value)" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-semibold">
            </div>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1">Link de Destino Opcional (deixe vazio para avançar o quiz)</label>
            <input type="url" value="${this.escape(block.url || block.delayButtonUrl || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'url', this.value)" placeholder="https://..." class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
          </div>
        </div>
      `;
    }

    // 5. BLOCO HTML / NAVEGADOR DE PRODUTO
    else if (block.type === 'html') {
      blockBadge = '<span class="text-emerald-400 font-bold text-xs flex items-center gap-1.5"><span>🌐</span> Bloco HTML / Navegador de Produto</span>';
      blockBody = `
        <div class="space-y-2 pt-1">
          <div class="flex items-center justify-between">
            <label class="text-[10px] font-bold text-slate-400">Código HTML / Iframe:</label>
            <button onclick="App.insertSampleIframeToBlock(${stepIdx}, ${bIdx})" class="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold underline">
              Inserir Modelo Interativo
            </button>
          </div>
          <textarea oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'customHtml', this.value)" placeholder="Cole código HTML ou <iframe src='...'></iframe>" rows="2" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-2 rounded-lg text-xs font-mono text-slate-200">${this.escape(block.customHtml || '')}</textarea>
        </div>
      `;
    }

    // 6. BLOCO DE CAPTURA DE LEAD
    else if (block.type === 'lead_form') {
      blockBadge = '<span class="text-cyan-400 font-bold text-xs flex items-center gap-1.5"><span>📱</span> Captura de Lead (WhatsApp / E-mail)</span>';
      blockBody = `
        <div class="space-y-2.5 pt-1">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Texto do Botão de Envio</label>
              <input type="text" value="${this.escape(block.submitButtonText || 'Ver Meu Resultado Agora →')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'submitButtonText', this.value)" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-semibold">
            </div>
            <div class="flex items-center pt-5">
              <label class="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input type="checkbox" ${block.requireEmail !== false ? 'checked' : ''} onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'requireEmail', this.checked)" class="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0">
                <span>Solicitar E-mail além do WhatsApp</span>
              </label>
            </div>
          </div>
        </div>
      `;
    }

    // 7. BLOCO DE OFERTA / CHECKOUT
    else if (block.type === 'offer') {
      blockBadge = '<span class="text-violet-400 font-bold text-xs flex items-center gap-1.5"><span>🎁</span> Oferta Final & Checkout</span>';
      blockBody = `
        <div class="space-y-2.5 pt-1">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Nome do Produto / Serviço</label>
              <input type="text" value="${this.escape(block.productTitle || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'productTitle', this.value)" placeholder="Ex: Método Vendas Rápidas" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Preço em Destaque</label>
              <input type="text" value="${this.escape(block.productPrice || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'productPrice', this.value)" placeholder="Ex: 12x de R$ 19,90" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-emerald-400 font-bold">
            </div>
            <div class="sm:col-span-2">
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Descrição Curta / Benefícios</label>
              <input type="text" value="${this.escape(block.productDescription || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'productDescription', this.value)" placeholder="Ex: Acesso imediato + bônus exclusivos..." class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Texto do Botão de Compra</label>
              <input type="text" value="${this.escape(block.ctaText || 'Garantir Minha Oferta Exclusiva Agora →')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'ctaText', this.value)" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-bold">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Link de Pagamento / WhatsApp</label>
              <input type="url" value="${this.escape(block.ctaUrl || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'ctaUrl', this.value)" placeholder="https://pay.hotmart.com/..." class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
            </div>
          </div>
        </div>
      `;
    }

    // 8. BLOCO DE DIAGNÓSTICO FALSO / CARREGAMENTO (fake_loader - Demanda 5)
    else if (block.type === 'fake_loader') {
      blockBadge = '<span class="text-teal-400 font-bold text-xs flex items-center gap-1.5"><span>⏳</span> Barra de Diagnóstico Falso (0% a 100%)</span>';
      blockBody = `
        <div class="space-y-3 pt-1">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Duração Total (segundos)</label>
              <input type="number" min="1" max="60" value="${block.duration || 4}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'duration', parseInt(this.value, 10) || 4)" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-mono text-white font-bold">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Ao atingir 100%:</label>
              <select onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'autoAdvance', this.value === 'true')" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
                <option value="true" ${block.autoAdvance !== false ? 'selected' : ''}>Avançar automaticamente para a próxima etapa</option>
                <option value="false" ${block.autoAdvance === false ? 'selected' : ''}>Exibir botão de continuar</option>
              </select>
            </div>
          </div>
          ${block.autoAdvance === false ? `
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Texto do Botão de Conclusão</label>
              <input type="text" value="${this.escape(block.buttonText || 'Ver Meu Diagnóstico →')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'buttonText', this.value)" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-semibold">
            </div>
          ` : ''}
          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1">Mensagens Dinâmicas de Status (uma por linha):</label>
            <textarea rows="4" onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'messages', this.value)" class="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-xs text-slate-200 font-mono">${this.escape(typeof block.messages === 'string' ? block.messages : (block.messages || []).join('\n'))}</textarea>
            <span class="text-[10px] text-slate-500">As frases se alternam automaticamente e suavemente enquanto a barra sobe de 0% até 100%.</span>
          </div>
        </div>
      `;
    }

    // Demanda 4: Delay Universal Programável em TODOS os componentes
    const universalDelayControl = `
      <div class="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <span class="text-slate-400 font-semibold flex items-center gap-1.5">
          <i class="ph ph-clock text-indigo-400"></i> Delay de Aparição na Tela:
        </span>
        <div class="flex items-center gap-2">
          <input type="number" min="0" max="300" step="1" 
            value="${block.delaySeconds || 0}" 
            onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'delaySeconds', parseInt(this.value, 10) || 0)" 
            class="w-16 bg-slate-900 border border-slate-700 px-2 py-1 rounded text-center font-mono text-white text-xs font-bold">
          <span class="text-[11px] text-slate-500 font-medium">segundos (0 = imediato)</span>
        </div>
      </div>
    `;

    return `
      <div class="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800/60">
          ${blockBadge}
          <div class="flex items-center gap-1">
            <button onclick="App.moveBlockInStep(${stepIdx}, ${bIdx}, -1)" ${bIdx === 0 ? 'disabled class="opacity-20 cursor-not-allowed p-1 text-slate-500"' : 'class="p-1 text-slate-400 hover:text-white"'} title="Mover bloco para cima">
              <i class="ph ph-arrow-up text-xs"></i>
            </button>
            <button onclick="App.moveBlockInStep(${stepIdx}, ${bIdx}, 1)" ${bIdx === totalBlocks - 1 ? 'disabled class="opacity-20 cursor-not-allowed p-1 text-slate-500"' : 'class="p-1 text-slate-400 hover:text-white"'} title="Mover bloco para baixo">
              <i class="ph ph-arrow-down text-xs"></i>
            </button>
            <button onclick="App.deleteBlockFromStep(${stepIdx}, ${bIdx})" class="p-1 text-slate-500 hover:text-red-400 transition" title="Excluir este bloco">
              <i class="ph ph-trash text-xs"></i>
            </button>
          </div>
        </div>
        ${blockBody}
        ${universalDelayControl}
      </div>
    `;
  },

  // ==========================================
  // MANIPULAÇÃO DE ETAPAS E BLOCOS
  // ==========================================
  addNewStep() {
    if (!this.currentQuiz) return;
    if (!this.currentQuiz.steps) this.currentQuiz.steps = [];

    const newIdx = this.currentQuiz.steps.length + 1;
    const newStep = {
      id: 'step_' + Date.now(),
      title: 'Etapa ' + newIdx,
      blocks: [] // Começa totalmente em branco como o usuário pediu!
    };

    this.currentQuiz.steps.push(newStep);
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();

    this.renderSteps();
    const lastIdx = this.currentQuiz.steps.length - 1;
    this.focusStep(lastIdx);

    // Rola automaticamente a tela até a nova etapa em branco criada
    setTimeout(() => {
      const newCard = document.getElementById(`step-card-${lastIdx}`);
      if (newCard) {
        newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
  },

  scrollEditor(direction) {
    if (direction === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const container = document.getElementById('steps-container');
      if (container && container.lastElementChild) {
        container.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    }
  },

  updateStepTitle(stepIdx, title) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    this.currentQuiz.steps[stepIdx].title = title.trim() || 'Etapa ' + (stepIdx + 1);
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.refreshPreview(stepIdx);
  },

  moveStep(stepIdx, direction) {
    if (!this.currentQuiz) return;
    const steps = this.currentQuiz.steps;
    const targetIdx = stepIdx + direction;
    if (targetIdx < 0 || targetIdx >= steps.length) return;

    const temp = steps[stepIdx];
    steps[stepIdx] = steps[targetIdx];
    steps[targetIdx] = temp;

    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.focusStep(targetIdx);
  },

  duplicateStep(stepIdx) {
    if (!this.currentQuiz) return;
    const original = this.currentQuiz.steps[stepIdx];
    const copy = JSON.parse(JSON.stringify(original));
    copy.id = 'step_' + Date.now();
    copy.title = (original.title || 'Etapa') + ' (Cópia)';

    this.currentQuiz.steps.splice(stepIdx + 1, 0, copy);
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.focusStep(stepIdx + 1);
  },

  deleteStep(stepIdx) {
    if (!this.currentQuiz) return;
    if (this.currentQuiz.steps.length <= 1) {
      alert('O quiz precisa de pelo menos 1 etapa.');
      return;
    }
    if (!confirm('Deseja excluir esta etapa inteira?')) return;

    this.currentQuiz.steps.splice(stepIdx, 1);
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.focusStep(Math.max(0, stepIdx - 1));
  },

  // ADICIONAR BLOCO ESPECÍFICO À ETAPA
  addBlockToStep(stepIdx, blockType) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const step = this.currentQuiz.steps[stepIdx];
    if (!step.blocks) step.blocks = [];

    let newBlock = { id: 'b_' + Date.now(), type: blockType, delaySeconds: 0 };

    if (blockType === 'heading') {
      newBlock.tag = 'Etapa ' + (stepIdx + 1);
      newBlock.title = 'Qual o seu principal objetivo?';
      newBlock.subtitle = 'Escolha a opção que melhor te descreve:';
    } else if (blockType === 'video') {
      newBlock.youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      newBlock.orientation = 'horizontal';
    } else if (blockType === 'question') {
      newBlock.options = [
        { icon: '🚀', text: 'Quero aumentar minhas vendas', points: 10, targetStepIndex: '' },
        { icon: '⚙️', text: 'Quero economizar tempo', points: 5, targetStepIndex: '' }
      ];
    } else if (blockType === 'fake_loader') {
      newBlock.duration = 4;
      newBlock.autoAdvance = true;
      newBlock.buttonText = 'Ver Meu Diagnóstico →';
      newBlock.messages = 'Analisando suas respostas...\nCruzando com nosso banco de dados...\nCalculando seu perfil ideal...\nDiagnóstico pronto!';
    } else if (blockType === 'delay_button') {
      newBlock.delaySeconds = 5;
      newBlock.text = 'Avançar para a próxima etapa →';
      newBlock.url = '';
    } else if (blockType === 'html') {
      newBlock.customHtml = '<div style="background:linear-gradient(135deg, #1e1b4b, #312e81); border:1px solid #4338ca; padding:18px; border-radius:12px; text-align:center; color:#fff;"><h4 style="font-weight:bold; margin-bottom:6px;">🚀 Demonstração do Produto</h4><p style="font-size:13px; opacity:0.85;">Você pode interagir e testar o produto aqui dentro.</p></div>';
    } else if (blockType === 'lead_form') {
      newBlock.requireEmail = true;
      newBlock.submitButtonText = 'Liberar Meu Diagnóstico Completo →';
    } else if (blockType === 'offer') {
      newBlock.productTitle = 'Acesso Completo ao Método';
      newBlock.productPrice = 'R$ 97,00 à vista';
      newBlock.productDescription = 'Tudo o que você precisa para implementar e ter resultados rápidos.';
      newBlock.ctaText = 'Quero Garantir Minha Vaga Agora →';
      newBlock.ctaUrl = '#';
    }

    step.blocks.push(newBlock);
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.refreshPreview(stepIdx);
  },

  deleteBlockFromStep(stepIdx, bIdx) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const step = this.currentQuiz.steps[stepIdx];
    if (!step.blocks) return;

    step.blocks.splice(bIdx, 1);
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.refreshPreview(stepIdx);
  },

  moveBlockInStep(stepIdx, bIdx, direction) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const blocks = this.currentQuiz.steps[stepIdx].blocks;
    const targetIdx = bIdx + direction;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;

    const temp = blocks[bIdx];
    blocks[bIdx] = blocks[targetIdx];
    blocks[targetIdx] = temp;

    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.refreshPreview(stepIdx);
  },

  updateBlockProp(stepIdx, bIdx, prop, value) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const step = this.currentQuiz.steps[stepIdx];
    if (!step.blocks || !step.blocks[bIdx]) return;

    step.blocks[bIdx][prop] = value;
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.refreshPreview(stepIdx);
  },

  addOptionToQuestionBlock(stepIdx, bIdx) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const block = this.currentQuiz.steps[stepIdx].blocks[bIdx];
    if (!block.options) block.options = [];

    block.options.push({
      icon: '👉',
      text: 'Nova Opção',
      points: 5,
      targetStepIndex: ''
    });

    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.refreshPreview(stepIdx);
  },

  deleteOptionFromQuestionBlock(stepIdx, bIdx, optIdx) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const block = this.currentQuiz.steps[stepIdx].blocks[bIdx];
    if (!block.options) return;

    block.options.splice(optIdx, 1);
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.refreshPreview(stepIdx);
  },

  updateOptionProp(stepIdx, bIdx, optIdx, prop, value) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const block = this.currentQuiz.steps[stepIdx].blocks[bIdx];
    if (!block.options || !block.options[optIdx]) return;

    block.options[optIdx][prop] = value;
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.refreshPreview(stepIdx);
  },

  insertSampleIframeToBlock(stepIdx, bIdx) {
    const sampleHtml = `<iframe src="https://example.com" style="width:100%;height:320px;border-radius:10px;border:none;"></iframe>`;
    this.updateBlockProp(stepIdx, bIdx, 'customHtml', sampleHtml);
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

    // Demanda 2: Barra de Progresso e Psicologia
    if (document.getElementById('theme-show-progress')) {
      document.getElementById('theme-show-progress').value = theme.showProgressBar !== false ? 'true' : 'false';
    }
    if (document.getElementById('theme-progress-format')) {
      document.getElementById('theme-progress-format').value = theme.progressTextFormat || 'full';
    }
    if (document.getElementById('theme-start-percent')) {
      document.getElementById('theme-start-percent').value = theme.startPercent || 0;
    }
  },

  updateThemeProp(prop, value) {
    if (!this.currentQuiz) return;
    if (!this.currentQuiz.theme) this.currentQuiz.theme = {};

    this.currentQuiz.theme[prop] = value;

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
  // ABA 3: RASTREAMENTO, UTMS & INJEÇÃO DE SCRIPTS
  // ==========================================
  renderTracking() {
    if (!this.currentQuiz) return;
    const tracking = this.currentQuiz.tracking || {};
    if (document.getElementById('tracking-webhook')) document.getElementById('tracking-webhook').value = tracking.webhookUrl || '';
    if (document.getElementById('tracking-pixel')) document.getElementById('tracking-pixel').value = tracking.metaPixelId || '';
    if (document.getElementById('tracking-ga4')) document.getElementById('tracking-ga4').value = tracking.ga4Id || '';

    // Demanda 6: Injeção de Scripts em 3 posições
    if (document.getElementById('tracking-head-scripts')) document.getElementById('tracking-head-scripts').value = tracking.customHeadScripts || '';
    if (document.getElementById('tracking-body-top-scripts')) document.getElementById('tracking-body-top-scripts').value = tracking.customBodyTopScripts || '';
    if (document.getElementById('tracking-body-bottom-scripts')) document.getElementById('tracking-body-bottom-scripts').value = tracking.customBodyBottomScripts || '';
  },

  updateTrackingProp(prop, value) {
    if (!this.currentQuiz) return;
    if (!this.currentQuiz.tracking) this.currentQuiz.tracking = {};
    this.currentQuiz.tracking[prop] = value;
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.refreshPreview();
  },

  setMobileScreen(screen) {
    const left = document.getElementById('panel-editor-left');
    const right = document.getElementById('panel-editor-right');
    const btnEditor = document.getElementById('btn-mview-editor');
    const btnPreview = document.getElementById('btn-mview-preview');

    if (screen === 'preview') {
      if (left) left.classList.add('hidden');
      if (right) {
        right.classList.remove('hidden');
        right.classList.add('flex');
      }
      if (btnEditor) {
        btnEditor.className = 'flex-1 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center gap-1.5 border border-slate-700 transition';
      }
      if (btnPreview) {
        btnPreview.className = 'flex-1 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white flex items-center justify-center gap-1.5 transition';
      }
      this.refreshPreview();
    } else {
      if (left) left.classList.remove('hidden');
      if (right) {
        right.classList.add('hidden');
        right.classList.remove('flex');
      }
      if (btnEditor) {
        btnEditor.className = 'flex-1 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white flex items-center justify-center gap-1.5 transition';
      }
      if (btnPreview) {
        btnPreview.className = 'flex-1 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center gap-1.5 border border-slate-700 transition';
      }
    }
  },

  // ==========================================
  // PREVIEW INTERATIVO EM TEMPO REAL (NATIVO & INSTANTÂNEO)
  // ==========================================
  focusStep(stepIndex) {
    this.currentEditingStepIndex = stepIndex;
    this.preview.currentStepIndex = stepIndex;
    this.renderSteps(); // Atualiza destaque visual na lista de etapas
    this.refreshPreview(stepIndex);
  },

  clearPreviewTimers() {
    (this.preview.stepTimers || []).forEach(t => clearTimeout(t));
    this.preview.stepTimers = [];
  },

  refreshPreview(stepIndex) {
    if (!this.currentQuiz) return;

    const viewport = document.getElementById('preview-viewport');
    if (!viewport) return;

    if (stepIndex !== undefined && stepIndex !== null) {
      this.preview.currentStepIndex = stepIndex;
    }

    const steps = this.currentQuiz.steps || [];
    const totalSteps = steps.length;
    let currentIdx = this.preview.currentStepIndex;

    if (currentIdx >= totalSteps) {
      currentIdx = totalSteps > 0 ? totalSteps - 1 : 0;
      this.preview.currentStepIndex = currentIdx;
    }
    if (currentIdx < 0) {
      currentIdx = 0;
      this.preview.currentStepIndex = 0;
    }

    // 1. Atualiza estilos dinâmicos escopados do tema
    const styleEl = document.getElementById('preview-scoped-styles');
    if (styleEl && typeof QuizTemplateEngine !== 'undefined') {
      styleEl.innerHTML = QuizTemplateEngine.generateThemeCss(this.currentQuiz.theme, '#preview-viewport');
    }

    // 2. Atualiza Barra de Progresso Psicológica (Demanda 2)
    const theme = this.currentQuiz.theme || {};
    const showProgress = theme.showProgressBar !== false;
    const progressSection = document.getElementById('preview-progress-section');
    if (progressSection) {
      progressSection.style.display = showProgress ? 'block' : 'none';
    }

    const progressBar = document.getElementById('preview-progress-bar');
    const progressPercent = document.getElementById('preview-progress-percent');
    const stepIndicator = document.getElementById('preview-step-indicator');
    const backBtn = document.getElementById('preview-btn-back');

    const currentStep = steps[currentIdx];

    if (totalSteps > 0 && showProgress) {
      const pct = QuizTemplateEngine.calculateProgressPercent(currentIdx, totalSteps, theme);
      const text = QuizTemplateEngine.getProgressText(currentIdx, totalSteps, theme, pct);
      if (progressBar) progressBar.style.width = pct + '%';
      if (progressPercent) progressPercent.innerText = pct + '%';
      if (stepIndicator) stepIndicator.innerText = text;
    }

    if (backBtn) {
      backBtn.style.display = currentIdx > 0 ? 'inline-flex' : 'none';
    }

    // 3. Renderiza o conteúdo da etapa montado por blocos
    const contentEl = document.getElementById('preview-step-content');
    if (contentEl && currentStep) {
      contentEl.innerHTML = QuizTemplateEngine.renderStepContentHtml(currentStep, this.preview, true);

      this.clearPreviewTimers();
      if (!this.preview.stepTimers) this.preview.stepTimers = [];

      const blocks = currentStep.blocks || [];

      // Demanda 4: Universal Delay em todos os blocos no preview
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
            this.preview.stepTimers.push(timer);
          }
        }
      });

      // Demanda 5: Executa Fake Loader no preview se existir na etapa
      const loaderBlock = blocks.find(b => b.type === 'fake_loader');
      if (loaderBlock) {
        this.runPreviewFakeLoader(loaderBlock);
      }
    }
  },

  runPreviewFakeLoader(block) {
    const durationSec = Math.max(1, parseInt(block.duration, 10) || 4);
    const totalMs = durationSec * 1000;
    const rawMsgs = block.messages || 'Analisando suas respostas...\nCruzando com nosso banco de dados...\nCalculando seu perfil ideal...\nDiagnóstico pronto!';
    const messages = Array.isArray(rawMsgs) ? rawMsgs : rawMsgs.split('\n').map(m => m.trim()).filter(Boolean);

    const barEl = document.querySelector('#preview-viewport #loader-bar');
    const pctEl = document.querySelector('#preview-viewport #loader-percent');
    const msgEl = document.querySelector('#preview-viewport #loader-msg');
    const ctaEl = document.querySelector('#preview-viewport #loader-cta');
    const autoAdvance = block.autoAdvance !== false;

    const startTime = performance.now();
    if (msgEl && messages.length > 0) msgEl.innerText = messages[0];

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / totalMs);

      // Curva orgânica
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
        this.preview.stepTimers.push(timer);
      } else {
        if (barEl) barEl.style.width = '100%';
        if (pctEl) pctEl.innerText = '100%';
        if (msgEl && messages.length > 0) msgEl.innerText = messages[messages.length - 1];

        if (autoAdvance) {
          const timer = setTimeout(() => {
            this.previewNextStep();
          }, 450);
          this.preview.stepTimers.push(timer);
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
    this.preview.stepTimers.push(initialTimer);
  },

  previewSelectOption(optIdx) {
    if (!this.currentQuiz) return;
    const steps = this.currentQuiz.steps || [];
    const step = steps[this.preview.currentStepIndex];
    if (!step) return;

    const qBlock = (step.blocks || []).find(b => b.type === 'question');
    if (!qBlock || !qBlock.options || !qBlock.options[optIdx]) return;

    const opt = qBlock.options[optIdx];
    this.preview.userAnswers[step.id] = optIdx;

    if (opt.points) {
      this.preview.totalScore += parseInt(opt.points, 10) || 0;
    }

    this.refreshPreview();

    if (opt.targetStepIndex !== undefined && opt.targetStepIndex !== '') {
      const targetIdx = parseInt(opt.targetStepIndex, 10);
      setTimeout(() => {
        this.preview.currentStepIndex = targetIdx;
        this.refreshPreview();
      }, 250);
      return;
    }

    const hasDelay = (step.blocks || []).some(b => b.type === 'delay_button');
    if (!hasDelay) {
      setTimeout(() => {
        this.previewNextStep();
      }, 250);
    }
  },

  previewNextStep() {
    if (!this.currentQuiz) return;
    const steps = this.currentQuiz.steps || [];
    if (this.preview.currentStepIndex + 1 < steps.length) {
      this.preview.currentStepIndex++;
      this.refreshPreview();
    }
  },

  previewPrevStep() {
    if (this.preview.currentStepIndex > 0) {
      this.preview.currentStepIndex--;
      this.refreshPreview();
    }
  },

  previewSubmitLead(event) {
    if (event) event.preventDefault();
    const nameEl = document.getElementById('lead-name');
    const phoneEl = document.getElementById('lead-whatsapp');
    const emailEl = document.getElementById('lead-email');

    this.preview.leadData = {
      name: nameEl ? nameEl.value.trim() : '',
      whatsapp: phoneEl ? phoneEl.value.trim() : '',
      email: emailEl ? emailEl.value.trim() : ''
    };

    this.previewNextStep();
  },

  scrollPreview(direction) {
    const vp = document.getElementById('preview-viewport');
    if (!vp) return;
    if (direction === -1) {
      vp.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      vp.scrollBy({ top: 300, behavior: 'smooth' });
    }
  },

  restartPreview() {
    clearTimeout(this.preview.delayTimeout);
    this.preview.currentStepIndex = 0;
    this.preview.userAnswers = {};
    this.preview.totalScore = 0;
    this.preview.leadData = {};
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

    const htmlContent = QuizTemplateEngine.generate(quiz, 0);
    this.lastExportedHtml = htmlContent;

    const safeTitle = (quiz.title || 'quiz')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');

    const filename = `${safeTitle}.html`;
    this.downloadFile(filename, htmlContent, 'text/html');

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

        importedQuiz.id = 'quiz_' + Date.now();
        importedQuiz.title = (importedQuiz.title || 'Quiz Importado') + ' (Importado)';
        importedQuiz.updatedAt = new Date().toISOString();
        importedQuiz.steps = importedQuiz.steps.map(s => QuizTemplateEngine.normalizeStep(s));

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
    event.target.value = '';
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
  // ABA 4: DASHBOARD DE RETENÇÃO & FUNIL (Demanda 7)
  // ==========================================
  renderFunnelDashboard() {
    if (!this.currentQuiz) return;
    const steps = this.currentQuiz.steps || [];
    const container = document.getElementById('analytics-funnel-container');
    if (!container) return;

    const analytics = this.currentQuiz.analytics || { views: {} };
    const views = analytics.views || {};

    const totalStarted = views['step_0'] || 0;
    const lastStepKey = `step_${Math.max(0, steps.length - 1)}`;
    const totalCompleted = views[lastStepKey] || 0;
    const conversionRate = totalStarted > 0 ? ((totalCompleted / totalStarted) * 100).toFixed(1) : '0.0';

    // Calcula maior drop-off entre etapas
    let maxDrop = 0;
    let maxDropStepTitle = 'Nenhum';
    let maxDropPct = '0.0%';

    for (let i = 1; i < steps.length; i++) {
      const prev = views[`step_${i-1}`] || 0;
      const curr = views[`step_${i}`] || 0;
      if (prev > 0) {
        const diff = prev - curr;
        const dropPct = (diff / prev) * 100;
        if (dropPct > maxDrop) {
          maxDrop = dropPct;
          maxDropStepTitle = steps[i].title || `Etapa ${i+1}`;
          maxDropPct = dropPct.toFixed(1) + '%';
        }
      }
    }

    // Atualiza KPIs no topo
    const elStarted = document.getElementById('kpi-total-started');
    const elCompleted = document.getElementById('kpi-total-completed');
    const elCompSub = document.getElementById('kpi-completion-sub');
    const elRate = document.getElementById('kpi-conversion-rate');
    const elDrop = document.getElementById('kpi-biggest-drop');
    const elDropPct = document.getElementById('kpi-drop-pct');

    if (elStarted) elStarted.innerText = totalStarted.toLocaleString('pt-BR');
    if (elCompleted) elCompleted.innerText = totalCompleted.toLocaleString('pt-BR');
    if (elCompSub) elCompSub.innerText = `${conversionRate}% concluídos`;
    if (elRate) elRate.innerText = `${conversionRate}%`;
    if (elDrop) elDrop.innerText = maxDrop > 0 ? maxDropStepTitle : 'Nenhum gargalo';
    if (elDropPct) elDropPct.innerText = maxDrop > 0 ? `Abandono de ${maxDropPct}` : 'Sem perdas registradas';

    // Renderiza Banner de Status da Planilha Google
    const banner = document.getElementById('analytics-sheet-status-banner');
    if (banner) {
      const sheetUrl = (this.currentQuiz.tracking && this.currentQuiz.tracking.sheetUrl) || '';
      const lastSync = analytics.lastSync ? new Date(analytics.lastSync).toLocaleString('pt-BR') : null;

      if (sheetUrl) {
        banner.innerHTML = `
          <div class="flex items-center gap-3">
            <span class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-extrabold text-white text-xs">Planilha Google Conectada</span>
                <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">Pronta para Sincronizar</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5 font-mono truncate max-w-sm sm:max-w-md">
                ${sheetUrl}
              </p>
              ${lastSync ? `<p class="text-[10px] text-slate-400 mt-0.5">Última sincronização: <b class="text-emerald-400">${lastSync}</b></p>` : '<p class="text-[10px] text-amber-400 mt-0.5">Nenhum dado sincronizado ainda. Clique em "Sincronizar Planilha" acima.</p>'}
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button onclick="App.syncMetricsFromGoogleSheet()" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1 shadow-md shadow-emerald-500/20">
              <i class="ph ph-arrows-clockwise text-sm"></i> Sincronizar Agora
            </button>
            <button onclick="App.openSheetsGuideModal()" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition" title="Instruções de Configuração">
              <i class="ph ph-question text-sm"></i> Ajuda
            </button>
          </div>
        `;
      } else {
        banner.innerHTML = `
          <div class="flex items-center gap-2.5 text-amber-400">
            <i class="ph ph-warning-circle text-xl shrink-0"></i>
            <div>
              <p class="font-bold text-xs">Nenhuma Planilha Google Conectada a Este Funil</p>
              <p class="text-[11px] text-slate-400">Para receber acessos e visualizar o funil com dados reais dos seus clientes, conecte uma planilha.</p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button onclick="App.switchEditorTab('tracking')" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1 shadow-md">
              <i class="ph ph-link text-sm"></i> Conectar Planilha
            </button>
            <button onclick="App.openSheetsGuideModal()" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition">
              <i class="ph ph-file-spreadsheet text-sm"></i> Ver Passo a Passo
            </button>
          </div>
        `;
      }
    }

    if (steps.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-400 py-6 text-center">Nenhuma etapa cadastrada no quiz.</p>';
    } else if (totalStarted === 0) {
      container.innerHTML = `
        <div class="py-10 px-4 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800 space-y-3">
          <div class="text-3xl">📊</div>
          <p class="text-xs font-bold text-slate-300">Nenhum tráfego registrado ainda neste quiz</p>
          <p class="text-[11px] text-slate-500 max-w-md mx-auto">
            Conforme os usuários acessam suas páginas, os acessos são contabilizados aqui e na sua Planilha Google. Clique em "Sincronizar Planilha" acima ou gere uma demonstração:
          </p>
          <button onclick="App.simulateFunnelTraffic()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-500/20 inline-flex items-center gap-1.5">
            <i class="ph ph-lightning"></i> Simular Tráfego de Demonstração (500 Visitantes)
          </button>
        </div>
      `;
    } else {
      container.innerHTML = steps.map((step, idx) => {
        const stepViews = views[`step_${idx}`] || 0;
        const retentionPct = totalStarted > 0 ? ((stepViews / totalStarted) * 100).toFixed(1) : (idx === 0 && stepViews > 0 ? '100.0' : '0.0');
        
        let dropInfo = '';
        let isBottleneck = false;

        if (idx > 0) {
          const prevViews = views[`step_${idx-1}`] || 0;
          const diff = Math.max(0, prevViews - stepViews);
          const dropPct = prevViews > 0 ? ((diff / prevViews) * 100).toFixed(1) : '0.0';
          isBottleneck = parseFloat(dropPct) === parseFloat(maxDrop.toFixed(1)) && maxDrop > 0;
          dropInfo = `
            <span class="text-[11px] font-semibold text-red-400/90 flex items-center gap-1">
              <i class="ph ph-arrow-down-right"></i> -${diff} saíram (-${dropPct}%)
            </span>
          `;
        }

        return `
          <div class="bg-slate-900/90 border ${isBottleneck ? 'border-amber-500/60 shadow-lg shadow-amber-500/10' : 'border-slate-800'} rounded-xl p-3.5 space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-extrabold text-xs flex items-center justify-center">
                  ${idx + 1}
                </span>
                <span class="font-bold text-white text-xs truncate max-w-[200px] sm:max-w-[320px]">
                  ${this.escape(step.title || `Etapa ${idx + 1}`)}
                </span>
                ${isBottleneck ? '<span class="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full uppercase">Maior Gargalo</span>' : ''}
              </div>

              <div class="flex items-center gap-3">
                ${dropInfo}
                <span class="text-xs font-mono font-bold text-white">${stepViews.toLocaleString('pt-BR')} acessos</span>
                <span class="text-xs font-mono font-extrabold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">${retentionPct}%</span>
              </div>
            </div>

            <!-- Barra visual do Funil -->
            <div class="w-full bg-slate-950/80 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-800">
              <div class="funnel-bar-container h-full rounded-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400" style="width: ${Math.max(2, parseFloat(retentionPct))}%;"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Renderiza Lista de Leads Recebidos da Planilha
    const leadsContainer = document.getElementById('analytics-leads-container');
    const leadsBadge = document.getElementById('analytics-leads-count-badge');
    const leads = analytics.leads || [];

    if (leadsBadge) {
      leadsBadge.innerText = `${leads.length} ${leads.length === 1 ? 'Lead' : 'Leads'}`;
    }

    if (leadsContainer) {
      if (leads.length === 0) {
        leadsContainer.innerHTML = `
          <div class="py-6 text-center text-slate-500 text-xs bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
            <p>Nenhum lead capturado ou sincronizado ainda.</p>
            <p class="text-[11px] text-slate-400 mt-1">Conforme os visitantes preenchem o formulário de captura no quiz, eles aparecerão aqui com link direto para o WhatsApp.</p>
          </div>
        `;
      } else {
        leadsContainer.innerHTML = `
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-slate-700 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                  <th class="py-2.5 px-3">Data/Hora</th>
                  <th class="py-2.5 px-3">Nome</th>
                  <th class="py-2.5 px-3">WhatsApp</th>
                  <th class="py-2.5 px-3">E-mail</th>
                  <th class="py-2.5 px-3 text-center">Score</th>
                  <th class="py-2.5 px-3">Origem / UTM</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800 font-medium text-slate-200">
                ${leads.map(lead => {
                  const rawPhone = (lead.whatsapp || '').replace(/\D/g, '');
                  const waLink = rawPhone ? `https://wa.me/55${rawPhone}` : null;
                  return `
                    <tr class="hover:bg-slate-800/40 transition">
                      <td class="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">${lead.date || '-'}</td>
                      <td class="py-2.5 px-3 font-bold text-white">${this.escape(lead.name || 'Anônimo')}</td>
                      <td class="py-2.5 px-3 whitespace-nowrap">
                        ${waLink ? `
                          <a href="${waLink}" target="_blank" class="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <i class="ph ph-whatsapp-logo text-sm"></i> ${this.escape(lead.whatsapp)}
                          </a>
                        ` : (lead.whatsapp ? `<span class="font-mono text-slate-300">${this.escape(lead.whatsapp)}</span>` : '<span class="text-slate-500">-</span>')}
                      </td>
                      <td class="py-2.5 px-3 font-mono text-[11px] text-slate-300 truncate max-w-[160px]">${this.escape(lead.email || '-')}</td>
                      <td class="py-2.5 px-3 text-center">
                        <span class="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold text-[11px]">${lead.score || 0} pts</span>
                      </td>
                      <td class="py-2.5 px-3 text-slate-400 text-[11px] truncate max-w-[140px]">${this.escape(lead.utm || '-')}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }
  },

  async syncMetricsFromGoogleSheet() {
    if (!this.currentQuiz) return;
    const sheetUrl = (this.currentQuiz.tracking && this.currentQuiz.tracking.sheetUrl) || '';
    if (!sheetUrl || sheetUrl.trim() === '') {
      alert('⚠️ Nenhuma URL de Planilha Google configurada para este funil!\n\nVá até a aba "Rastreamento & Métricas" e cole a URL do seu Google Apps Script.');
      this.switchEditorTab('tracking');
      return;
    }

    const btn = document.getElementById('btn-sync-sheet-metrics');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="ph ph-arrows-clockwise animate-spin text-sm"></i> Sincronizando...';
    }

    try {
      const sep = sheetUrl.indexOf('?') !== -1 ? '&' : '?';
      const fetchUrl = sheetUrl + sep + 'action=getMetrics&nocache=' + Date.now();
      
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Servidor do Google respondeu com código ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'success') {
        if (!this.currentQuiz.analytics) this.currentQuiz.analytics = {};
        this.currentQuiz.analytics.views = data.stepViews || {};
        this.currentQuiz.analytics.leads = data.recentLeads || [];
        this.currentQuiz.analytics.totalStarts = data.totalStarts || 0;
        this.currentQuiz.analytics.totalCompletions = data.totalCompletions || 0;
        this.currentQuiz.analytics.lastSync = new Date().toISOString();
        this.currentQuiz.analytics.isRealData = true;

        this.saveQuizzesToStorage();
        this.renderFunnelDashboard();
        
        const count = Object.values(data.stepViews || {}).reduce((a, b) => a + b, 0);
        alert(`✅ Sincronizado com sucesso!\n\nDados da planilha carregados no Dashboard:\n• ${count} acessos registrados\n• ${(data.recentLeads || []).length} leads capturados`);
      } else {
        throw new Error(data.message || 'Erro desconhecido retornado pelo script.');
      }
    } catch (err) {
      console.error('Erro ao sincronizar com Google Sheets:', err);
      alert('❌ Não foi possível sincronizar com a Planilha Google:\n\n' + err.message + '\n\nCertifique-se de que na implantação do Apps Script a permissão "Quem pode acessar" esteja como "Qualquer pessoa".');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  },

  simulateFunnelTraffic() {
    if (!this.currentQuiz) return;
    const steps = this.currentQuiz.steps || [];
    if (steps.length === 0) return;

    let base = 500;
    const views = {};
    steps.forEach((s, idx) => {
      views[`step_${idx}`] = Math.round(base);
      // Simula uma perda realista de 12% a 20% por etapa
      const dropRate = 0.84 - (idx * 0.02);
      base = base * dropRate;
    });

    this.currentQuiz.analytics = {
      views: views,
      simulatedAt: new Date().toISOString()
    };
    this.saveQuizzesToStorage();
    this.renderFunnelDashboard();
  },

  resetFunnelAnalytics() {
    if (!this.currentQuiz) return;
    this.currentQuiz.analytics = { views: {} };
    this.saveQuizzesToStorage();
    this.renderFunnelDashboard();
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
  // QUIZ DE EXEMPLO PADRÃO (MONTADO EM BLOCOS)
  // ==========================================
  getSampleQuizData() {
    return {
      id: 'quiz_demo_vsl',
      title: 'Diagnóstico de Vendas Express (Exemplo)',
      description: 'Funil montado com blocos modulares: vídeo + perguntas + botões com delay + diagnóstico falso.',
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
        maxWidth: '560px',
        showProgressBar: true,
        progressTextFormat: 'full',
        startPercent: 60
      },
      tracking: {
        webhookUrl: '',
        metaPixelId: '',
        ga4Id: '',
        customHeadScripts: '',
        customBodyTopScripts: '',
        customBodyBottomScripts: ''
      },
      steps: [
        {
          id: 'step_1',
          title: 'Etapa 1: Qualificação',
          blocks: [
            {
              id: 'b_1',
              type: 'heading',
              tag: 'Diagnóstico 1 de 5',
              title: 'Qual é o seu maior gargalo de vendas atualmente?',
              subtitle: 'Selecione a situação que mais se aproxima do seu dia a dia.',
              delaySeconds: 0
            },
            {
              id: 'b_2',
              type: 'question',
              delaySeconds: 0,
              options: [
                { icon: '📲', text: 'Pouco tráfego qualificado chegando no WhatsApp', points: 10, targetStepIndex: '' },
                { icon: '👻', text: 'Pessoas chegam, perguntam preço e somem', points: 15, targetStepIndex: '' },
                { icon: '🧱', text: 'Não tenho uma esteira de produtos bem definida', points: 20, targetStepIndex: '' }
              ]
            }
          ]
        },
        {
          id: 'step_2',
          title: 'Etapa 2: Vídeo de Explicação',
          blocks: [
            {
              id: 'b_3',
              type: 'heading',
              tag: 'Vídeo Importante',
              title: 'Veja como dobrar sua conversão com este método',
              subtitle: 'Assista a esta breve explicação de 1 minuto.',
              delaySeconds: 0
            },
            {
              id: 'b_4',
              type: 'video',
              youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              orientation: 'horizontal',
              delaySeconds: 0
            },
            {
              id: 'b_5',
              type: 'delay_button',
              delaySeconds: 0,
              text: 'Entendi! Quero Continuar o Teste →',
              url: ''
            }
          ]
        },
        {
          id: 'step_3',
          title: 'Etapa 3: Diagnóstico Falso (0% a 100%)',
          blocks: [
            {
              id: 'b_loader',
              type: 'fake_loader',
              duration: 4,
              autoAdvance: true,
              buttonText: 'Ver Meu Diagnóstico →',
              messages: 'Analisando suas respostas...\nCruzando com nosso banco de inteligência de vendas...\nCalculando seu perfil ideal de cliente...\nDiagnóstico concluído com sucesso!',
              delaySeconds: 0
            }
          ]
        },
        {
          id: 'step_4',
          title: 'Etapa 4: Degustação do Produto & Lead',
          blocks: [
            {
              id: 'b_6',
              type: 'heading',
              tag: 'Degustação do Produto',
              title: 'Navegue pelo painel do método',
              subtitle: 'Preencha seus dados abaixo para receber sua oferta final.',
              delaySeconds: 0
            },
            {
              id: 'b_7',
              type: 'html',
              customHtml: '<div style="background:linear-gradient(135deg, #1e1b4b, #312e81); border:1px solid #4338ca; padding:18px; border-radius:12px; text-align:center; color:#fff;"><h4 style="margin-bottom:6px; font-weight:bold;">🚀 Simulador de Resultados</h4><p style="font-size:13px; opacity:0.85;">Com este funil implementado, sua taxa de conversão sobe expressivamente.</p></div>',
              delaySeconds: 0
            },
            {
              id: 'b_8',
              type: 'lead_form',
              requireEmail: true,
              submitButtonText: 'Liberar Meu Diagnóstico com Oferta →',
              delaySeconds: 0
            }
          ]
        },
        {
          id: 'step_5',
          title: 'Etapa 5: Oferta Final & Checkout',
          blocks: [
            {
              id: 'b_9',
              type: 'heading',
              tag: 'Oferta Especial Liberada',
              title: 'Parabéns! Sua Condição Especial Está Pronta',
              subtitle: 'Você foi aprovado para receber 50% de desconto na adesão hoje.',
              delaySeconds: 0
            },
            {
              id: 'b_10',
              type: 'offer',
              productTitle: 'Método Funil de Quiz 2.0',
              productDescription: 'Acesso vitalício ao treinamento, modelos prontos de copy e suporte individual.',
              productPrice: 'De R$ 497 por apenas R$ 197 à vista',
              ctaText: 'Garantir Minha Vaga com 50% de Desconto →',
              ctaUrl: 'https://pay.hotmart.com/exemplo',
              delaySeconds: 0
            }
          ]
        }
      ]
    };
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
