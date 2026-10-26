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

    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-editor').classList.remove('hidden');
    document.getElementById('btn-header-back-dashboard').classList.remove('hidden');
    document.getElementById('btn-header-export-html').classList.remove('hidden');

    document.getElementById('editor-quiz-title').value = quiz.title || '';

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
          <button onclick="App.addNewStep()" class="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow">
            + Adicionar Primeira Etapa
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = steps.map((step, idx) => {
      return this.renderStepCardHtml(step, idx, steps.length);
    }).join('');
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
        <button onclick="App.addBlockToStep(${stepIdx}, 'delay_button')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold border border-slate-700 transition flex items-center gap-1">
          <span>⏱️</span> Botão com Delay
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

    return `
      <div class="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800/60">
          ${blockBadge}
          <div class="flex items-center gap-1">
            <button onclick="App.moveBlockInStep(${stepIdx}, ${bIdx}, -1)" ${bIdx === 0 ? 'disabled class="opacity-30 cursor-not-allowed p-1 text-slate-500"' : 'class="p-1 text-slate-400 hover:text-white"'} title="Mover bloco para cima">
              <i class="ph ph-arrow-up text-xs"></i>
            </button>
            <button onclick="App.moveBlockInStep(${stepIdx}, ${bIdx}, 1)" ${bIdx === totalBlocks - 1 ? 'disabled class="opacity-30 cursor-not-allowed p-1 text-slate-500"' : 'class="p-1 text-slate-400 hover:text-white"'} title="Mover bloco para baixo">
              <i class="ph ph-arrow-down text-xs"></i>
            </button>
            <button onclick="App.deleteBlockFromStep(${stepIdx}, ${bIdx})" class="p-1 text-slate-500 hover:text-red-400 transition" title="Excluir este componente">
              <i class="ph ph-trash text-xs"></i>
            </button>
          </div>
        </div>
        ${blockBody}
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
    this.focusStep(this.currentQuiz.steps.length - 1);
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

    let newBlock = { id: 'b_' + Date.now(), type: blockType };

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

    // 2. Atualiza Barra de Progresso
    const progressBar = document.getElementById('preview-progress-bar');
    const progressPercent = document.getElementById('preview-progress-percent');
    const stepIndicator = document.getElementById('preview-step-indicator');
    const backBtn = document.getElementById('preview-btn-back');

    const currentStep = steps[currentIdx];

    if (totalSteps > 0) {
      const pct = Math.round(((currentIdx + 1) / totalSteps) * 100);
      if (progressBar) progressBar.style.width = pct + '%';
      if (progressPercent) progressPercent.innerText = pct + '%';
      if (stepIndicator) stepIndicator.innerText = `Etapa ${currentIdx + 1} de ${totalSteps}`;
    }

    if (backBtn) {
      backBtn.style.display = currentIdx > 0 ? 'inline-flex' : 'none';
    }

    // 3. Renderiza o conteúdo da etapa montado por blocos
    const contentEl = document.getElementById('preview-step-content');
    if (contentEl && currentStep) {
      contentEl.innerHTML = QuizTemplateEngine.renderStepContentHtml(currentStep, this.preview, true);

      clearTimeout(this.preview.delayTimeout);

      // Tratamento do Botão com Delay Programável se houver algum bloco de delay nesta etapa
      const delayBlock = (currentStep.blocks || []).find(b => b.type === 'delay_button');
      if (delayBlock) {
        const delaySeconds = parseInt(delayBlock.delaySeconds, 10) || 5;
        this.preview.delayTimeout = setTimeout(() => {
          const btnBox = document.getElementById('delayed-btn-box');
          if (btnBox) btnBox.style.display = 'flex';
        }, delaySeconds * 1000);
      }
    }
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
      description: 'Funil montado com blocos modulares: vídeo + perguntas + botões com delay.',
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
          title: 'Etapa 1: Qualificação',
          blocks: [
            {
              id: 'b_1',
              type: 'heading',
              tag: 'Diagnóstico 1 de 4',
              title: 'Qual é o seu maior gargalo de vendas atualmente?',
              subtitle: 'Selecione a situação que mais se aproxima do seu dia a dia.'
            },
            {
              id: 'b_2',
              type: 'question',
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
          title: 'Etapa 2: Vídeo + Botão com Delay',
          blocks: [
            {
              id: 'b_3',
              type: 'heading',
              tag: 'Vídeo Importante',
              title: 'Veja como dobrar sua conversão com este método',
              subtitle: 'Assista a esta breve explicação de 1 minuto (o botão aparecerá em instantes).'
            },
            {
              id: 'b_4',
              type: 'video',
              youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              orientation: 'horizontal'
            },
            {
              id: 'b_5',
              type: 'delay_button',
              delaySeconds: 6,
              text: 'Entendi! Quero Continuar o Teste →',
              url: ''
            }
          ]
        },
        {
          id: 'step_3',
          title: 'Etapa 3: Degustação do Produto',
          blocks: [
            {
              id: 'b_6',
              type: 'heading',
              tag: 'Degustação do Produto',
              title: 'Navegue pelo painel do método',
              subtitle: 'Teste o bloco interativo abaixo antes de receber sua oferta final.'
            },
            {
              id: 'b_7',
              type: 'html',
              customHtml: '<div style="background:linear-gradient(135deg, #1e1b4b, #312e81); border:1px solid #4338ca; padding:20px; border-radius:12px; text-align:center; color:#fff;"><h4 style="margin-bottom:8px; font-weight:bold;">🚀 Simulador de Resultados</h4><p style="font-size:13px; opacity:0.85;">Com a implementação deste funil, seus leads chegam 3x mais conscientes e prontos para comprar.</p></div>'
            },
            {
              id: 'b_8',
              type: 'delay_button',
              delaySeconds: 4,
              text: 'Ir para a Análise Final →',
              url: ''
            }
          ]
        },
        {
          id: 'step_4',
          title: 'Etapa 4: Captura de Lead',
          blocks: [
            {
              id: 'b_9',
              type: 'heading',
              tag: 'Último Passo',
              title: 'Onde devemos liberar o seu acesso com desconto?',
              subtitle: 'Preencha seus dados para receber o diagnóstico completo.'
            },
            {
              id: 'b_10',
              type: 'lead_form',
              requireEmail: true,
              submitButtonText: 'Ver Meu Plano Personalizado →'
            }
          ]
        },
        {
          id: 'step_5',
          title: 'Etapa 5: Oferta Final',
          blocks: [
            {
              id: 'b_11',
              type: 'heading',
              tag: 'Oferta Especial Liberada',
              title: 'Parabéns! Sua Condição Especial Está Pronta',
              subtitle: 'Você foi aprovado para receber 50% de desconto na adesão hoje.'
            },
            {
              id: 'b_12',
              type: 'offer',
              productTitle: 'Método Funil de Quiz 2.0',
              productDescription: 'Acesso vitalício ao treinamento, modelos prontos de copy e suporte individual.',
              productPrice: 'De R$ 497 por apenas R$ 197 à vista',
              ctaText: 'Garantir Minha Vaga com 50% de Desconto →',
              ctaUrl: 'https://pay.hotmart.com/exemplo'
            }
          ]
        },
        {
          id: 'step_6',
          title: 'Etapa 6: Teste em Branco',
          blocks: []
        }
      ]
    };
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
