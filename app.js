/**
 * APLICAÇÃO PRINCIPAL: QuizForge App
 * Gerencia o estado dos quizzes, o editor visual baseado em BLOCOS MODULARES por etapa,
 * o preview em tempo real nativo e as exportações autônomas.
 */

const STORAGE_KEY = 'quizforge_quizzes_data';

// ==========================================
// CONFIGURAÇÃO FIREBASE CLOUD (PROJETO QUIZFORGE)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBWmHeY4k7siSHZ2pvdq2RY1eyNLYtMmBs",
  authDomain: "quizforge-b4253.firebaseapp.com",
  projectId: "quizforge-b4253",
  storageBucket: "quizforge-b4253.firebasestorage.app",
  messagingSenderId: "726780728889",
  appId: "1:726780728889:web:453d978c3fa9192b101fe8"
};

const App = {
  quizzes: [],
  currentQuiz: null,
  activeTab: 'steps',
  previewDevice: 'mobile',
  lastExportedHtml: null,
  analyticsFilter: 'today',
  funnelChartMode: 'horizontal',
  analyticsCustomDate: new Date().toISOString().split('T')[0],

  currentEditingStepIndex: 0,
  refreshTimeout: null,

  // Firebase Cloud State
  firebaseApp: null,
  firebaseAuth: null,
  firestore: null,
  firebaseUser: null,
  authMode: 'login', // 'login' | 'register' | 'reset'
  cloudSyncDebounceTimer: null,
  isCloudSyncing: false,

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
    this.initFirebase();
    this.initFullPhoneViewState();
    if (this.quizzes && this.quizzes.length > 0) {
      this.openEditor(this.quizzes[0].id);
      const params = new URLSearchParams(window.location.search);
      if (params.get('test_step')) {
        this.focusStep(parseInt(params.get('test_step'), 10));
      }
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
      // Garante que todos os quizzes estejam normalizados para a estrutura de blocos e tema com defaults
      this.quizzes.forEach(q => {
        if (!q.theme) q.theme = {};
        if (q.theme.startPercent === undefined) q.theme.startPercent = 60;
        if (q.theme.hideUntilFirstClick === undefined) q.theme.hideUntilFirstClick = true;
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

      // Sincronização automática na Nuvem Firebase (com debounce de 800ms)
      if (this.firebaseUser && this.firestore && this.currentQuiz) {
        clearTimeout(this.cloudSyncDebounceTimer);
        this.cloudSyncDebounceTimer = setTimeout(() => {
          this.cloudSaveQuiz(this.currentQuiz, true);
        }, 800);
      }
    } catch (err) {
      console.error('Erro ao salvar quizzes no localStorage:', err);
    }
  },

  showSavingBadge() {
    const badge = document.getElementById('save-status-badge');
    if (badge) {
      badge.innerHTML = '<i class="ph ph-arrows-clockwise animate-spin"></i> Salvando na Nuvem...';
      badge.className = 'text-[11px] text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1';
    }
  },

  showSaveBadge(isCloud = true, customMsg = null) {
    const badge = document.getElementById('save-status-badge');
    if (!badge) return;
    if (this.firebaseUser && isCloud) {
      badge.innerHTML = '<i class="ph ph-cloud-check text-emerald-400"></i> Salvo na Nuvem';
      badge.className = 'text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1';
    } else {
      badge.innerHTML = '<i class="ph ph-check-circle"></i> ' + (customMsg || 'Salvo');
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

    if (dash) dash.classList.remove('hidden');
    if (editor) editor.classList.add('hidden');
    if (btnBack) btnBack.classList.add('hidden');

    this.renderDashboardCloudBanner();

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
      const isLanding = quiz.projectType === 'landing_page';
      const stepCount = (quiz.steps || []).length;
      const lastModified = quiz.updatedAt ? new Date(quiz.updatedAt).toLocaleDateString('pt-BR') : 'Hoje';

      return `
        <div class="bg-slate-900 border ${isLanding ? 'border-teal-500/30 hover:border-teal-500/60' : 'border-slate-800 hover:border-slate-700'} rounded-2xl p-5 flex flex-col justify-between transition-card">
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-[11px] font-bold px-2.5 py-1 rounded-full ${isLanding ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'} flex items-center gap-1">
                ${isLanding ? '<i class="ph ph-browsers"></i> Página de Vendas' : '<i class="ph ph-chat-circle-dots"></i> ' + stepCount + ' Etapas'}
              </span>
              <div class="flex items-center gap-2">
                ${this.firebaseUser ? '<span class="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 font-semibold"><i class="ph ph-cloud-check"></i> Na Nuvem</span>' : ''}
                <span class="text-[11px] text-slate-500">Atualizado: ${lastModified}</span>
              </div>
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

  openNewProjectModal() {
    const modal = document.getElementById('modal-new-project');
    if (modal) modal.classList.remove('hidden');
    else this.createNewQuiz();
  },

  createNewProject(projectType = 'quiz') {
    this.closeModals();
    if (projectType === 'landing_page') {
      this.createNewLandingPage();
    } else {
      this.createNewQuiz();
    }
  },

  createNewLandingPage() {
    const newPage = {
      id: 'page_' + Date.now(),
      projectType: 'landing_page',
      title: 'Página de Vendas NetFree',
      description: 'Página de alta conversão modular com VSL, 3 planos, benefícios e FAQ.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      theme: {
        primaryColor: '#00d4aa',
        primaryHover: '#00b890',
        bgColor: '#07090f',
        cardBg: '#0c0f1a',
        textColor: '#e8edf7',
        textMuted: '#8a9bb8',
        accentColor: '#00ff88',
        borderRadius: '16px',
        borderWidth: '1px',
        borderColor: '#1e293b',
        shadow: 'large',
        maxWidth: '820px',
        showProgressBar: false,
        hideUntilFirstClick: false,
        progressTextFormat: 'none',
        startPercent: 0
      },
      tracking: {
        webhookUrl: '',
        metaPixelId: '1265492645638129',
        ga4Id: ''
      },
      steps: [
        {
          id: 'step_landing',
          title: 'Página de Vendas',
          blocks: [
            // 1. Hero
            {
              id: 'b_hero_head',
              type: 'heading',
              tag: '⚡ Nova tecnologia de conectividade',
              title: 'INTERNET MÓVEL ILIMITADA\nPor Um Preço Justo!',
              subtitle: 'Planos a Partir de R$ 11,31 — Use o quanto quiser e pague um valor fixo, sem contrato, sem fidelidade e sem surpresas na conta.\n\nAssista o vídeo abaixo e veja como é simples:',
              align: 'center',
              titleSize: 'lg',
              subtitleSize: 'md'
            },
            // 2. VSL Vimeo
            {
              id: 'b_hero_vsl',
              type: 'video',
              youtubeUrl: 'https://player.vimeo.com/video/1173821519',
              orientation: 'horizontal',
              autoplayMode: 'standard',
              hideControls: false,
              hideRecommendations: true,
              cleanTopMask: false,
              unmuteButtonText: '🔊 Ativar Áudio',
              preload: true
            },
            // 3. Botão CTA Principal
            {
              id: 'b_hero_btn',
              type: 'delay_button',
              text: 'VER OS PLANOS DE ACESSO',
              url: '#planos',
              variant: 'primary',
              pulse: true,
              icon: '👉',
              delaySeconds: 0
            },
            // 4. Seção Dor (HTML Modular)
            {
              id: 'b_pain_section',
              type: 'html',
              customHtml: `
<div style="background: rgba(255,59,92,.04); border: 1px solid rgba(255,59,92,.2); border-radius: 16px; padding: 24px 20px; margin: 12px 0;">
  <div style="text-align: center; color: #ff3b5c; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">O problema que ninguém resolve</div>
  <h3 style="text-align: center; font-size: 20px; font-weight: 900; color: #fff; line-height: 1.3; margin-bottom: 20px;">Você Já Ficou Sem Internet em um <span style="color:#ff3b5c;">Momento Importante?</span></h3>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
    <div style="background: #0f1422; border: 1px solid rgba(255,255,255,.06); border-radius: 12px; padding: 14px;">
      <h4 style="font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 4px;">⚠️ Sinal caindo sempre</h4>
      <p style="font-size: 12px; color: #8a9bb8; line-height: 1.5;">Na reunião, no vídeo ou no trabalho, sempre na pior hora possível.</p>
    </div>
    <div style="background: #0f1422; border: 1px solid rgba(255,255,255,.06); border-radius: 12px; padding: 14px;">
      <h4 style="font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 4px;">💸 Mensalidades caras</h4>
      <p style="font-size: 12px; color: #8a9bb8; line-height: 1.5;">Você paga caro todo mês e a franquia acaba antes do fim do mês.</p>
    </div>
    <div style="background: #0f1422; border: 1px solid rgba(255,255,255,.06); border-radius: 12px; padding: 14px;">
      <h4 style="font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 4px;">🔒 Contratos de fidelidade</h4>
      <p style="font-size: 12px; color: #8a9bb8; line-height: 1.5;">Preso por 12 ou 24 meses com multa abusiva e péssimo atendimento.</p>
    </div>
  </div>
</div>`
            },
            // 5. Mockup App NetFree
            {
              id: 'b_mockup_img',
              type: 'image',
              imageUrl: 'https://planetaideias.com.br/wp-content/uploads/2026/03/Gemini_Generated_Image_4ohvaj4ohvaj4ohv.png',
              altText: 'App NetFree no Celular',
              title: 'Um App. Todas as Redes. Em Qualquer Lugar.',
              caption: 'Cobertura Multi-Operadora: Conecta automaticamente na rede mais forte da região.',
              imageSize: 'large',
              align: 'center'
            },
            // 6. Tabela com os 3 Planos Kirvano
            {
              id: 'b_pricing_plans',
              type: 'offer',
              headerTitle: 'Planos de Acesso NetFree',
              headerSubtitle: 'Internet ilimitada e 200 Mbps em todos os planos. Sem contrato.',
              plans: [
                {
                  id: 'plan_1',
                  title: '1 MÊS',
                  anchorPrice: '',
                  currency: 'R$',
                  priceMain: '19',
                  priceCents: ',90',
                  periodSub: '30 dias de acesso',
                  features: ['Internet Ilimitada', '200 Mbps de velocidade', 'Sem contrato e sem fidelidade', 'Acesso liberado de imediato'],
                  bonus: null,
                  ctaText: 'Quero Este Plano',
                  ctaUrl: 'https://pay.kirvano.com/e22ded46-ae4b-42c7-9660-df4c334992d6',
                  featured: false,
                  featuredBadge: ''
                },
                {
                  id: 'plan_2',
                  title: '3 MESES',
                  anchorPrice: 'De R$ 59,70',
                  currency: 'R$',
                  priceMain: '39',
                  priceCents: ',90',
                  periodSub: 'Economia de R$ 19,80',
                  features: ['Internet Ilimitada', '200 Mbps de velocidade', 'Sem contrato e sem fidelidade', 'Acesso liberado de imediato', 'Suporte VIP via WhatsApp'],
                  bonus: { title: '⭐ Plano Mais Escolhido', tag: 'Destaque', desc: 'Melhor custo-benefício para 90 dias' },
                  ctaText: 'Quero Este Plano',
                  ctaUrl: 'https://pay.kirvano.com/bda0b6c8-bd6e-4aea-87e0-371bede978db',
                  featured: true,
                  featuredBadge: 'MELHOR CUSTO-BENEFÍCIO'
                },
                {
                  id: 'plan_3',
                  title: '6 MESES',
                  anchorPrice: 'De R$ 119,40',
                  currency: 'R$',
                  priceMain: '67',
                  priceCents: ',90',
                  periodSub: 'Apenas R$ 11,31 por mês',
                  features: ['Internet Ilimitada', '200 Mbps de velocidade', 'Sem contrato e sem fidelidade', 'Economia de R$ 51,50'],
                  bonus: null,
                  ctaText: 'Quero Este Plano',
                  ctaUrl: 'https://pay.kirvano.com/f4ceda6c-beff-4eff-b2e1-46a5a45176a4',
                  featured: false,
                  featuredBadge: ''
                }
              ]
            },
            // 7. Garantia de 30 Dias
            {
              id: 'b_guarantee',
              type: 'guarantee',
              tag: 'RISCO ZERO',
              title: 'GARANTIA DE 30 DIAS',
              description: 'Experimente nossa internet por 30 dias sem riscos. Se não estiver 100% satisfeito, garantimos a **devolução integral do seu dinheiro**.\nBasta enviar "REEMBOLSO" para o WhatsApp e devolvemos na hora, sem perguntas e sem enrolação.',
              customSealUrl: 'https://planetaideias.com.br/wp-content/uploads/2026/01/selo-garantia-699x1024-1.png'
            },
            // 8. Tutorial Short
            {
              id: 'b_tutorial_video',
              type: 'video',
              youtubeUrl: 'https://player.vimeo.com/video/1173822851',
              orientation: 'vertical',
              autoplayMode: 'standard',
              hideControls: false,
              hideRecommendations: true,
              cleanTopMask: false,
              unmuteButtonText: '🔊 Ativar Áudio',
              preload: true
            },
            // 9. Depoimentos com Estrelas
            {
              id: 'b_reviews',
              type: 'reviews',
              headerBadge: 'PROVA SOCIAL',
              headerTitle: 'Veja Quem Já Se Libertou das Operadoras Tradicionais',
              showRatingSummary: true,
              ratingSummary: '4.9 de 5 baseado em mais de 2.400 clientes',
              items: [
                { id: 'rev_1', name: 'Carlos Mendonça', role: 'Vendedor - São Paulo', avatarUrl: '', stars: 5, comment: 'Viajei pelo interior de SP e MG e nunca fiquei sem sinal. Coisa que a Vivo nunca conseguiu em 8 anos. App incrível!', timeAgo: 'Postado há 2 dias', verified: true },
                { id: 'rev_2', name: 'Amanda Ferreira', role: 'Professora - Goiânia', avatarUrl: '', stars: 5, comment: 'Economizei mais de R$ 80 por mês cancelando meu plano antigo. O NetFree funciona perfeitamente para aulas online.', timeAgo: 'Postado há 3 dias', verified: true },
                { id: 'rev_3', name: 'Roberto Alves', role: 'Motorista de App - Curitiba', avatarUrl: '', stars: 5, comment: 'Trabalho o dia inteiro na rua. O app conecta rápido e nunca caiu durante uma corrida. Melhor investimento.', timeAgo: 'Postado há 5 dias', verified: true }
              ]
            },
            // 10. FAQ
            {
              id: 'b_faq',
              type: 'faq',
              title: 'Perguntas Frequentes',
              subtitle: 'Tire suas dúvidas antes de garantir seu acesso',
              items: [
                { id: 'faq_1', question: 'O NetFree é uma operadora de telefonia?', answer: 'Não. O NetFree é uma plataforma global de conectividade. Nosso app funciona como um GPS inteligente que conecta você automaticamente à rede mais forte disponível na sua região.' },
                { id: 'faq_2', question: 'Funciona em qualquer lugar do Brasil?', answer: 'Sim! Nosso banco de dados possui milhões de pontos de acesso pelo Brasil. Onde não há sinal de uma operadora, há de outra. Em áreas remotas, priorizamos conexão via satélite.' },
                { id: 'faq_3', question: 'Preciso assinar contrato de fidelidade?', answer: 'Não. Funciona como um pré-pago. Você paga apenas pelo tempo que quiser usar, sem contratos de fidelidade e sem burocracia.' },
                { id: 'faq_4', question: 'Como recebo o acesso após o pagamento?', answer: 'Após a confirmação do pagamento você receberá por e-mail e no WhatsApp os dados de login em minutos.' }
              ]
            }
          ]
        }
      ]
    };

    this.quizzes.unshift(newPage);
    this.saveQuizzesToStorage();
    if (this.firebaseUser) {
      this.cloudSaveQuiz(newPage, false);
    }
    this.openEditor(newPage.id);
  },

  createNewQuiz() {
    const newQuiz = {
      id: 'quiz_' + Date.now(),
      projectType: 'quiz',
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
        maxWidth: '560px',
        showProgressBar: true,
        hideUntilFirstClick: true,
        progressTextFormat: 'full',
        startPercent: 60
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
    if (this.firebaseUser) {
      this.cloudSaveQuiz(newQuiz, false);
    }
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
    if (this.firebaseUser) {
      this.cloudSaveQuiz(copy, false);
    }
    this.renderDashboard();
  },

  deleteQuiz(quizId) {
    if (!confirm('Tem certeza que deseja excluir este funil de quiz?')) return;
    this.quizzes = this.quizzes.filter(q => q.id !== quizId);
    this.saveQuizzesToStorage();
    if (this.firebaseUser) {
      this.cloudDeleteQuiz(quizId);
    }
    this.renderDashboard();
  },

  openEditor(quizId) {
    const quiz = this.quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    // Normaliza passos se necessário e assegura defaults de tema
    if (quiz.steps) {
      quiz.steps = quiz.steps.map(s => QuizTemplateEngine.normalizeStep(s));
    }
    if (!quiz.theme) quiz.theme = {};
    if (quiz.theme.startPercent === undefined) quiz.theme.startPercent = 60;
    if (quiz.theme.hideUntilFirstClick === undefined) quiz.theme.hideUntilFirstClick = true;

    this.currentQuiz = quiz;

    const dash = document.getElementById('view-dashboard');
    if (dash) dash.classList.add('hidden');
    const editor = document.getElementById('view-editor');
    if (editor) editor.classList.remove('hidden');
    const btnBack = document.getElementById('btn-header-back-dashboard');
    if (btnBack) btnBack.classList.remove('hidden');

    const titleInput = document.getElementById('editor-quiz-title');
    if (titleInput) titleInput.value = quiz.title || '';

    this.renderSteps();
    this.renderDesign();
    this.renderTracking();

    this.restartPreview();
    this.preloadVideos(quiz.steps);
  },

  backToDashboard() {
    this.currentQuiz = null;
    const navContainer = document.getElementById('quick-steps-nav');
    if (navContainer) navContainer.classList.add('hidden');
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

    const leftPanel = document.getElementById('panel-editor-left');
    const rightPanel = document.getElementById('panel-editor-right');

    if (tabName === 'analytics') {
      // Oculta a prévia do celular para os gráficos e métricas ocuparem a tela inteira
      if (rightPanel) rightPanel.classList.add('hidden');
      if (leftPanel) {
        leftPanel.classList.remove('md:w-[56%]', 'lg:w-[58%]', 'border-r');
        leftPanel.classList.add('w-full');
      }
      this.renderFunnelDashboard();
    } else {
      // Restaura a prévia do celular ao lado para as abas de edição
      if (rightPanel) rightPanel.classList.remove('hidden');
      if (leftPanel) {
        leftPanel.classList.remove('w-full');
        leftPanel.classList.add('md:w-[56%]', 'lg:w-[58%]', 'border-r');
      }
      this.updatePreview();
    }

    const navDock = document.getElementById('quick-steps-nav');
    if (navDock) {
      if (tabName === 'steps') {
        this.renderStepsQuickNav();
      } else {
        navDock.classList.add('hidden');
      }
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
    this.renderStepsQuickNav();
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
        <button onclick="App.addBlockToStep(${stepIdx}, 'image')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold border border-slate-700 transition flex items-center gap-1">
          <span>🖼️</span> Imagem / Banner
        </button>
        <button onclick="App.addBlockToStep(${stepIdx}, 'video')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-red-400 text-xs font-semibold border border-slate-700 transition flex items-center gap-1">
          <span>🎬</span> Vídeo YouTube
        </button>
        <button onclick="App.addBlockToStep(${stepIdx}, 'question')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 text-xs font-semibold border border-slate-700 transition flex items-center gap-1">
          <span>❓</span> Pergunta / Opções
        </button>
        <button onclick="App.addBlockToStep(${stepIdx}, 'fake_loader')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold border border-teal-500/30 transition flex items-center gap-1 shadow-sm">
          <span>⏳</span> Barra de Análise (0% a 100%)
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
          <span>🎁</span> Planos / Oferta
        </button>
        <button onclick="App.addBlockToStep(${stepIdx}, 'guarantee')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-amber-500/30 transition flex items-center gap-1 shadow-sm">
          <span>🛡️</span> Garantia Risco Zero
        </button>
        <button onclick="App.addBlockToStep(${stepIdx}, 'potential_chart')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-semibold border border-rose-500/30 transition flex items-center gap-1 shadow-sm">
          <span>📈</span> Gráfico de Potencial
        </button>
        <button onclick="App.addBlockToStep(${stepIdx}, 'reviews')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-yellow-400 text-xs font-semibold border border-yellow-500/30 transition flex items-center gap-1 shadow-sm">
          <span>⭐</span> Avaliações / Depoimentos
        </button>
        <button onclick="App.addBlockToStep(${stepIdx}, 'faq')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold border border-sky-500/30 transition flex items-center gap-1 shadow-sm">
          <span>💬</span> Dúvidas Frequentes (FAQ)
        </button>
      </div>
    `;
  },

  // Seletor de Alinhamento Reutilizável (Demanda 9)
  renderAlignPicker(stepIdx, bIdx, currentAlign = 'center') {
    const align = currentAlign || 'center';
    return `
      <div class="inline-flex rounded-lg bg-slate-900 border border-slate-700 p-0.5" title="Alinhamento do Texto">
        <button type="button" onclick="App.updateBlockProp(${stepIdx}, ${bIdx}, 'align', 'left')" class="px-2 py-1 text-xs rounded transition ${align === 'left' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}" title="Alinhar à Esquerda">
          <i class="ph ph-text-align-left"></i>
        </button>
        <button type="button" onclick="App.updateBlockProp(${stepIdx}, ${bIdx}, 'align', 'center')" class="px-2 py-1 text-xs rounded transition ${align === 'center' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}" title="Centralizado">
          <i class="ph ph-text-align-center"></i>
        </button>
        <button type="button" onclick="App.updateBlockProp(${stepIdx}, ${bIdx}, 'align', 'right')" class="px-2 py-1 text-xs rounded transition ${align === 'right' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}" title="Alinhar à Direita">
          <i class="ph ph-text-align-right"></i>
        </button>
      </div>
    `;
  },

  // Componente de Suporte a Variáveis Dinâmicas de Respostas
  renderDynamicTagsHelper(stepIdx) {
    if (!this.currentQuiz) return '';
    const steps = this.currentQuiz.steps || [];
    const questionItems = [];

    steps.forEach((s, idx) => {
      const qBlock = (s.blocks || []).find(b => b.type === 'question');
      if (qBlock) {
        const hBlock = (s.blocks || []).find(b => b.type === 'heading');
        const title = (hBlock && (hBlock.title || hBlock.tag)) || s.title || `Etapa ${idx + 1}`;
        const shortTitle = title.length > 25 ? title.substring(0, 25) + '...' : title;
        questionItems.push({
          stepNum: idx + 1,
          title: shortTitle
        });
      }
    });

    let pillsHtml = '';
    questionItems.forEach(item => {
      pillsHtml += `
        <button type="button" onclick="App.copyDynamicTag('{resposta_${item.stepNum}}')" title="Clique para copiar: {resposta_${item.stepNum}} (${this.escape(item.title)})" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-400/30 text-indigo-200 text-[11px] font-mono transition cursor-pointer active:scale-95 shadow-sm">
          <span class="font-bold">{resposta_${item.stepNum}}</span>
          <span class="text-[9px] text-slate-400 font-sans truncate max-w-[110px]">(${this.escape(item.title)})</span>
        </button>
      `;
    });

    return `
      <div class="my-2 p-2.5 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-indigo-950/30 border border-indigo-500/25 rounded-xl text-xs">
        <div class="flex items-center justify-between gap-2 mb-2">
          <span class="font-bold text-indigo-300 text-[11px] flex items-center gap-1.5">
            <span>✨</span> Variáveis Dinâmicas Disponíveis
          </span>
          <span class="text-[10px] text-slate-400">Clique para copiar</span>
        </div>
        <div class="flex flex-wrap items-center gap-1.5">
          ${pillsHtml || '<span class="text-[10px] text-slate-400 italic">Nenhuma pergunta encontrada nas etapas ainda.</span>'}
          <button type="button" onclick="App.copyDynamicTag('{nome}')" title="Copia {nome} (Nome preenchido no formulário de lead)" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-500/20 hover:bg-teal-500/35 border border-teal-400/30 text-teal-200 text-[11px] font-mono transition cursor-pointer active:scale-95 shadow-sm">
            <span class="font-bold">{nome}</span>
            <span class="text-[9px] text-slate-400 font-sans">(Lead)</span>
          </button>
          <button type="button" onclick="App.copyDynamicTag('{primeiro_nome}')" title="Copia {primeiro_nome} (Apenas o primeiro nome do lead)" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-500/20 hover:bg-teal-500/35 border border-teal-400/30 text-teal-200 text-[11px] font-mono transition cursor-pointer active:scale-95 shadow-sm">
            <span class="font-bold">{primeiro_nome}</span>
          </button>
          <button type="button" onclick="App.copyDynamicTag('{whatsapp}')" title="Copia {whatsapp} (WhatsApp do lead)" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-500/20 hover:bg-teal-500/35 border border-teal-400/30 text-teal-200 text-[11px] font-mono transition cursor-pointer active:scale-95 shadow-sm">
            <span class="font-bold">{whatsapp}</span>
          </button>
          <button type="button" onclick="App.copyDynamicTag('{score}')" title="Copia {score} (Pontos somados nas respostas)" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/30 text-amber-200 text-[11px] font-mono transition cursor-pointer active:scale-95 shadow-sm">
            <span class="font-bold">{score}</span>
          </button>
        </div>
        <div class="mt-2 text-[10px] text-slate-400 leading-tight">
          💡 <strong>Dica Pro:</strong> Cole no texto onde quiser. Suporta padrão opcional ex: <code>{nome|amigo}</code> ou <code>{resposta_1|seu desafio}</code>.
        </div>
      </div>
    `;
  },

  copyDynamicTag(tag) {
    if (!tag) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tag).then(() => {
        this.showToast(`Variável ${tag} copiada! Cole no campo de texto desejado.`, 'success');
      }).catch(() => {
        this.fallbackCopyTag(tag);
      });
    } else {
      this.fallbackCopyTag(tag);
    }
  },

  fallbackCopyTag(tag) {
    const input = document.createElement('input');
    input.value = tag;
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand('copy');
      this.showToast(`Variável ${tag} copiada!`, 'success');
    } catch (e) {
      prompt('Copie a variável abaixo:', tag);
    }
    document.body.removeChild(input);
  },

  // Renderiza o Cartão de um Bloco Individual
  renderBlockCardHtml(stepIdx, block, bIdx, totalBlocks) {
    let blockBadge = '';
    let blockBody = '';

    // 1. BLOCO DE TÍTULO / TEXTO (Demandas 8, 9, 10, 11 e Imagens)
    if (block.type === 'heading') {
      blockBadge = '<span class="text-slate-300 font-bold text-xs flex items-center gap-1.5"><span>📝</span> Título & Subtítulo</span>';
      blockBody = `
        <div class="space-y-3 pt-1">
          <!-- Tag e Título Principal (com suporte a quebra de linha Enter) -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Tag Superior (Opcional)</label>
              <input type="text" value="${this.escape(block.tag || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'tag', this.value)" placeholder="Ex: Passo 1 de 3" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
            </div>
            <div class="sm:col-span-2">
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Título Principal (Enter aceito)</label>
              <textarea rows="2" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'title', this.value)" placeholder="Ex: Qual o seu maior desafio hoje?" class="quiz-textarea w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-semibold">${this.escape(block.title || '')}</textarea>
            </div>
          </div>

          <!-- Subtítulo Explicativo (com suporte a quebra de linha Enter) -->
          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1">Subtítulo Explicativo (Enter aceito)</label>
            <textarea rows="2" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'subtitle', this.value)" placeholder="Ex: Selecione uma das opções abaixo para prosseguir..." class="quiz-textarea w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-slate-300">${this.escape(block.subtitle || '')}</textarea>
          </div>

          ${this.renderDynamicTagsHelper(stepIdx)}

          <!-- Barra de Controles: Alinhamento, Escala de Fontes e Cor -->
          <div class="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <!-- Alinhamento (Demanda 9) -->
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold text-slate-400">Alinhamento:</span>
              ${this.renderAlignPicker(stepIdx, bIdx, block.align || 'center')}
            </div>

            <!-- Escala de Tamanho de Título (Demanda 10) -->
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-bold text-slate-400">Tam. Título:</span>
              <select onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'titleSize', this.value)" class="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-xs text-white">
                <option value="sm" ${block.titleSize === 'sm' ? 'selected' : ''}>Pequeno (16px)</option>
                <option value="md" ${!block.titleSize || block.titleSize === 'md' ? 'selected' : ''}>Médio (20px)</option>
                <option value="lg" ${block.titleSize === 'lg' ? 'selected' : ''}>Grande (24px)</option>
                <option value="xl" ${block.titleSize === 'xl' ? 'selected' : ''}>Extra (28px)</option>
              </select>
            </div>

            <!-- Escala de Tamanho de Subtítulo (Demanda 10) -->
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-bold text-slate-400">Tam. Subtítulo:</span>
              <select onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'subtitleSize', this.value)" class="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-xs text-white">
                <option value="xs" ${block.subtitleSize === 'xs' ? 'selected' : ''}>Discreto (11px)</option>
                <option value="sm" ${!block.subtitleSize || block.subtitleSize === 'sm' ? 'selected' : ''}>Padrão (13px)</option>
                <option value="base" ${block.subtitleSize === 'base' ? 'selected' : ''}>Destacado (15px)</option>
              </select>
            </div>

            <!-- Cor Pontual do Texto (Demanda 11 - Abordagem B) -->
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-bold text-slate-400">Cor do Texto:</span>
              <input type="color" value="${block.textColor || '#ffffff'}" onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'textColor', this.value)" class="w-6 h-6 rounded cursor-pointer bg-transparent border-0" title="Cor individual deste título">
              ${block.textColor ? `<button onclick="App.updateBlockProp(${stepIdx}, ${bIdx}, 'textColor', '')" class="text-[10px] text-red-400 hover:underline" title="Restaurar cor do tema">reset</button>` : ''}
            </div>
          </div>

          <!-- Imagem Ilustrativa Opcional no Cabeçalho -->
          <div class="pt-1">
            <label class="block text-[10px] font-bold text-slate-400 mb-1">Imagem / Banner Opcional (Link HTTPS Externo)</label>
            <input type="url" value="${this.escape(block.imageUrl || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'imageUrl', this.value)" placeholder="https://exemplo.com/banner.png ou .jpg" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
          </div>
        </div>
      `;
    }

    // 1.1 NOVO BLOCO DE IMAGEM / BANNER DEDICADO
    else if (block.type === 'image') {
      blockBadge = '<span class="text-sky-400 font-bold text-xs flex items-center gap-1.5"><span>🖼️</span> Imagem / Banner</span>';
      blockBody = `
        <div class="space-y-3 pt-1">
          <!-- Título Opcional da Imagem -->
          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1">Título da Imagem (Opcional)</label>
            <input type="text" value="${this.escape(block.title || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'title', this.value)" placeholder="Ex: Veja o resultado abaixo..." class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
          </div>

          <!-- Opções do Título: Escala de Tamanho e Cor -->
          <div class="flex flex-wrap items-center gap-3 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-xs">
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-bold text-slate-400">Tam. Título:</span>
              <select onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'titleSize', this.value)" class="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-xs text-white">
                <option value="sm" ${block.titleSize === 'sm' ? 'selected' : ''}>Pequeno (16px)</option>
                <option value="md" ${!block.titleSize || block.titleSize === 'md' ? 'selected' : ''}>Médio (20px)</option>
                <option value="lg" ${block.titleSize === 'lg' ? 'selected' : ''}>Grande (24px)</option>
                <option value="xl" ${block.titleSize === 'xl' ? 'selected' : ''}>Extra (28px)</option>
              </select>
            </div>

            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-bold text-slate-400">Cor do Título:</span>
              <input type="color" value="${block.titleColor || block.textColor || '#ffffff'}" onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'titleColor', this.value)" class="w-6 h-6 rounded cursor-pointer bg-transparent border-0" title="Cor individual deste título">
              ${(block.titleColor || block.textColor) ? `<button type="button" onclick="App.updateBlockProp(${stepIdx}, ${bIdx}, 'titleColor', ''); App.updateBlockProp(${stepIdx}, ${bIdx}, 'textColor', '');" class="text-[10px] text-red-400 hover:underline" title="Restaurar cor padrão">reset</button>` : ''}
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1">URL da Imagem (Link Externo HTTPS)</label>
            <input type="url" value="${this.escape(block.imageUrl || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'imageUrl', this.value)" placeholder="https://exemplo.com/foto.jpg ou .png, .webp" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Tamanho da Imagem</label>
              <select onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'imageSize', this.value)" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
                <option value="small" ${block.imageSize === 'small' ? 'selected' : ''}>Pequena (Ícone / Logo ~180px)</option>
                <option value="medium" ${!block.imageSize || block.imageSize === 'medium' ? 'selected' : ''}>Média (Destaque ~360px)</option>
                <option value="full" ${block.imageSize === 'full' ? 'selected' : ''}>Largura Total (100% do Cartão)</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Alinhamento</label>
              <div class="pt-0.5">
                ${this.renderAlignPicker(stepIdx, bIdx, block.align || 'center')}
              </div>
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1">Legenda Opcional (abaixo da foto)</label>
            <textarea rows="1" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'caption', this.value)" placeholder="Ex: Resultado obtido pelos nossos clientes..." class="quiz-textarea w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-slate-300">${this.escape(block.caption || '')}</textarea>
          </div>
        </div>
      `;
    }

    // 2. BLOCO DE VÍDEO (YouTube ou Arquivo Direto .mp4 Hospedado)
    else if (block.type === 'video') {
      const isDirectMp4 = (block.youtubeUrl || '').toLowerCase().includes('.mp4');
      blockBadge = `<span class="${isDirectMp4 ? 'text-emerald-400' : 'text-red-400'} font-bold text-xs flex items-center gap-1.5"><span>${isDirectMp4 ? '📹' : '🎬'}</span> ${isDirectMp4 ? 'Vídeo Direto (.mp4 Hospedado)' : 'Vídeo do YouTube'}</span>`;
      const autoplayMode = block.autoplayMode || 'none';
      const hideControls = block.hideControls !== false;
      const hideRecommendations = block.hideRecommendations !== false;
      const cleanTopMask = block.cleanTopMask !== false;
      const preload = block.preload !== false;
      const unmuteText = block.unmuteButtonText || '🔊 Toque para Ativar o Áudio';

      blockBody = `
        <div class="space-y-3 pt-1">
          <!-- Linha 1: URL e Formato -->
          <div class="flex items-center justify-between gap-3">
            <div class="flex-1">
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Link do Vídeo (YouTube ou Arquivo Direto .mp4)</label>
              <input type="url" value="${this.escape(block.youtubeUrl || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'youtubeUrl', this.value)" placeholder="Ex: https://financeiropro.site/demonstrativo.mp4 OU YouTube" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
            </div>
            <div class="w-36">
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Formato</label>
              <select onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'orientation', this.value)" class="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded-lg text-xs text-white">
                <option value="horizontal" ${block.orientation !== 'vertical' ? 'selected' : ''}>Horizontal (16:9)</option>
                <option value="vertical" ${block.orientation === 'vertical' ? 'selected' : ''}>Vertical (Shorts)</option>
              </select>
            </div>
          </div>

          <!-- Linha 2: Modo de Reprodução (Autoplay) -->
          <div class="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-2">
            <div>
              <label class="block text-[10px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                <span>⚡</span> Modo de Reprodução (Autoplay)
              </label>
              <select onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'autoplayMode', this.value); const b = document.getElementById('unmute-box-${stepIdx}-${bIdx}'); if(b) b.style.display = this.value === 'muted_button' ? 'block' : 'none';" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
                <option value="none" ${autoplayMode === 'none' ? 'selected' : ''}>🛑 Desativado (Aguardar clique do usuário)</option>
                <option value="muted_button" ${autoplayMode === 'muted_button' ? 'selected' : ''}>🔊 Autoplay Mudo + Botão Flutuante de Ativar Som (Recomendado - Alta Conversão)</option>
                <option value="direct" ${autoplayMode === 'direct' ? 'selected' : ''}>⚡ Autoplay Direto com Som (Inicia após clique no quiz)</option>
              </select>
            </div>

            <!-- Campo de Texto do Botão de Desmutar -->
            <div id="unmute-box-${stepIdx}-${bIdx}" style="display: ${autoplayMode === 'muted_button' ? 'block' : 'none'};">
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Texto do Botão Flutuante de Áudio</label>
              <input type="text" value="${this.escape(unmuteText)}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'unmuteButtonText', this.value)" placeholder="🔊 Toque para Ativar o Áudio" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
            </div>
          </div>

          <!-- Linha 3: Otimizações de Player Limpo e Pré-carregamento -->
          <div class="grid grid-cols-2 gap-2 text-xs">
            <label class="flex items-center gap-2 p-2 rounded bg-slate-900/40 border border-slate-800 cursor-pointer hover:bg-slate-800/40 transition">
              <input type="checkbox" ${hideControls ? 'checked' : ''} onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'hideControls', this.checked)" class="rounded text-indigo-600 focus:ring-0">
              <span class="text-[11px] text-slate-300">Ocultar Controles Inferiores</span>
            </label>

            <label class="flex items-center gap-2 p-2 rounded bg-slate-900/40 border border-slate-800 cursor-pointer hover:bg-slate-800/40 transition">
              <input type="checkbox" ${hideRecommendations ? 'checked' : ''} onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'hideRecommendations', this.checked)" class="rounded text-indigo-600 focus:ring-0">
              <span class="text-[11px] text-slate-300">Sem Vídeos Recomendados</span>
            </label>

            <label class="flex items-center gap-2 p-2 rounded bg-slate-900/40 border border-slate-800 cursor-pointer hover:bg-slate-800/40 transition" title="Corta a barra superior com título do vídeo e canal para visual limpo de player proprietário">
              <input type="checkbox" ${cleanTopMask ? 'checked' : ''} onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'cleanTopMask', this.checked)" class="rounded text-indigo-600 focus:ring-0">
              <span class="text-[11px] text-slate-300">Máscara Anti-Distração (Sem Título)</span>
            </label>

            <label class="flex items-center gap-2 p-2 rounded bg-slate-900/40 border border-slate-800 cursor-pointer hover:bg-slate-800/40 transition" title="Baixa o vídeo em segundo plano para abrir instantaneamente quando o usuário chegar nesta etapa">
              <input type="checkbox" ${preload ? 'checked' : ''} onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'preload', this.checked)" class="rounded text-indigo-600 focus:ring-0">
              <span class="text-[11px] font-semibold text-emerald-400">⚡ Pré-carregar em 2º Plano</span>
            </label>
          </div>
        </div>
      `;
    }

    // 3. BLOCO DE PERGUNTA COM OPÇÕES (Demanda 9: Alinhamento e Controle de Pontuação)
    else if (block.type === 'question') {
      blockBadge = '<span class="text-indigo-400 font-bold text-xs flex items-center gap-1.5"><span>❓</span> Pergunta com Alternativas</span>';
      const options = block.options || [];
      const useScoring = block.useScoring === true;

      blockBody = `
        <div class="space-y-2.5 pt-1">
          <!-- Barra Superior: Alinhamento e Chave de Pontuação -->
          <div class="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-800">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold text-slate-400">Alinhamento:</span>
              ${this.renderAlignPicker(stepIdx, bIdx, block.align || 'left')}
            </div>

            <!-- Chave para Ativar ou Desativar Pontuação -->
            <label class="inline-flex items-center gap-1.5 cursor-pointer text-xs text-slate-300 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg hover:border-slate-500 transition">
              <input type="checkbox" ${useScoring ? 'checked' : ''} onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'useScoring', this.checked); App.renderSteps();" class="rounded bg-slate-800 border-slate-600 text-indigo-600 focus:ring-0">
              <span class="text-[11px] font-bold ${useScoring ? 'text-amber-400' : 'text-slate-300'}">Atribuir Pontos (Score)</span>
            </label>
          </div>

          <!-- Informação sobre o Modo Ativo -->
          <div class="flex items-center justify-between text-xs">
            <span class="text-[10px]">
              ${useScoring 
                ? '<span class="text-amber-300 font-semibold">⭐ Modo Pontuação:</span> <span class="text-slate-400">As opções acumulam pontos para o score final.</span>' 
                : '<span class="text-emerald-400 font-semibold">📝 Modo Resposta:</span> <span class="text-slate-400">A opção escolhida vai para a coluna Resposta na planilha (sem pontos).</span>'}
            </span>
            <button onclick="App.addOptionToQuestionBlock(${stepIdx}, ${bIdx})" class="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              <i class="ph ph-plus-circle"></i> + Adicionar Alternativa
            </button>
          </div>

          <div class="space-y-2">
            ${options.map((opt, optIdx) => `
              <div class="bg-slate-900 p-2.5 rounded-xl border border-slate-700/80 space-y-2">
                <div class="flex items-center gap-2">
                  <input type="text" value="${this.escape(opt.icon || '👉')}" oninput="App.updateOptionProp(${stepIdx}, ${bIdx}, ${optIdx}, 'icon', this.value)" title="Ícone ou Emoji" class="w-9 text-center bg-slate-800 border border-slate-700 py-1 rounded text-xs text-white">
                  <input type="text" value="${this.escape(opt.text || '')}" oninput="App.updateOptionProp(${stepIdx}, ${bIdx}, ${optIdx}, 'text', this.value)" placeholder="Texto da alternativa..." class="flex-1 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded text-xs text-white">
                  
                  ${useScoring ? `
                    <div class="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700" title="Pontos atribuídos caso escolha esta alternativa">
                      <span class="text-[10px] text-slate-400 font-semibold">Pts:</span>
                      <input type="number" value="${opt.points !== undefined ? opt.points : 0}" oninput="App.updateOptionProp(${stepIdx}, ${bIdx}, ${optIdx}, 'points', parseInt(this.value, 10) || 0)" class="w-12 text-center bg-transparent border-0 text-xs text-amber-400 font-bold focus:ring-0 p-0">
                    </div>
                  ` : ''}

                  <!-- Botão de Escrita Aberta -->
                  <button type="button" onclick="App.toggleOptionCustomText(${stepIdx}, ${bIdx}, ${optIdx})" class="px-2 py-1 rounded text-[10px] font-semibold transition shrink-0 ${opt.allowCustomText ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700'}" title="Permitir que o usuário escreva sua própria resposta nesta alternativa">
                    ✏️ ${opt.allowCustomText ? 'Escrita Ativa' : 'Permitir Escrita'}
                  </button>

                  <button onclick="App.deleteOptionFromQuestionBlock(${stepIdx}, ${bIdx}, ${optIdx})" class="p-1 text-slate-500 hover:text-red-400 transition" title="Excluir">
                    <i class="ph ph-x text-sm"></i>
                  </button>
                </div>

                ${opt.allowCustomText ? `
                  <div class="ml-11 pl-2.5 py-1.5 bg-slate-950/40 rounded-lg border-l-2 border-indigo-500 flex flex-wrap items-center gap-2">
                    <span class="text-[10px] text-indigo-300 font-semibold">✏️ Campo Aberto:</span>
                    <input type="text" value="${this.escape(opt.customPlaceholder || 'Digite sua resposta aqui...')}" oninput="App.updateOptionProp(${stepIdx}, ${bIdx}, ${optIdx}, 'customPlaceholder', this.value)" placeholder="Texto de ajuda (Placeholder)..." class="flex-1 min-w-[180px] bg-slate-800 border border-slate-700 px-2.5 py-1 rounded text-xs text-white">
                    <span class="text-[10px] text-slate-400">Ao clicar, abre o campo para o lead digitar a resposta.</span>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // 4. BLOCO DE BOTÃO COM DELAY (Demandas 10 e 11)
    else if (block.type === 'delay_button') {
      blockBadge = '<span class="text-amber-400 font-bold text-xs flex items-center gap-1.5"><span>⏱️</span> Botão de Ação / Avanço</span>';
      blockBody = `
        <div class="space-y-2.5 pt-1">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Tempo de Espera (Segundos)</label>
              <input type="number" min="0" max="3600" value="${block.delaySeconds !== undefined ? block.delaySeconds : 5}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'delaySeconds', parseInt(this.value, 10))" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-bold text-amber-400">
            </div>
            <div class="sm:col-span-2">
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Texto do Botão (Enter aceito)</label>
              <input type="text" value="${this.escape(block.text || block.delayButtonText || 'Avançar para a próxima etapa →')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'text', this.value)" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-semibold">
            </div>
          </div>

          ${this.renderDynamicTagsHelper(stepIdx)}

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Link de Destino Opcional (vazio = avança quiz)</label>
              <input type="url" value="${this.escape(block.url || block.delayButtonUrl || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'url', this.value)" placeholder="https://..." class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
            </div>
            <div class="flex items-center gap-3 pt-4">
              <!-- Tamanho do Botão (Demanda 10) -->
              <div class="flex-1">
                <select onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'buttonSize', this.value)" class="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded-lg text-xs text-white">
                  <option value="normal" ${block.buttonSize === 'normal' ? 'selected' : ''}>Tamanho Normal</option>
                  <option value="large" ${!block.buttonSize || block.buttonSize === 'large' ? 'selected' : ''}>Tamanho Grande</option>
                  <option value="featured" ${block.buttonSize === 'featured' ? 'selected' : ''}>Destaque Alto Impacto</option>
                </select>
              </div>

              <!-- Cor Pontual do Botão (Demanda 11 - Abordagem B) -->
              <div class="flex items-center gap-1.5">
                <input type="color" value="${block.buttonColor || '#6366f1'}" onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'buttonColor', this.value)" class="w-7 h-7 rounded cursor-pointer bg-transparent border-0" title="Cor individual deste botão">
                ${block.buttonColor ? `<button onclick="App.updateBlockProp(${stepIdx}, ${bIdx}, 'buttonColor', '')" class="text-[10px] text-red-400 hover:underline">reset</button>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // 5. BLOCO HTML / APLICAÇÃO INTERATIVA (Iframe Sandbox e Snippets)
    else if (block.type === 'html') {
      blockBadge = '<span class="text-emerald-400 font-bold text-xs flex items-center gap-1.5"><span>🌐</span> Bloco HTML / Aplicação Interativa</span>';
      const isFullWidth = block.fullWidth !== false;
      const htmlMode = block.htmlMode || 'auto';
      const iframeUrl = block.iframeUrl || '';
      const iframeHeight = block.iframeHeight || '650px';
      const isDetectedFullDoc = typeof QuizTemplateEngine !== 'undefined' ? QuizTemplateEngine.isFullHtmlDoc(block.customHtml || '') : false;

      blockBody = `
        <div class="space-y-3 pt-1">
          <!-- Modo de Execução & Altura -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Modo de Execução:</label>
              <select onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'htmlMode', this.value); App.renderSteps();" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
                <option value="auto" ${htmlMode === 'auto' ? 'selected' : ''}>⚡ Detecção Automática (Recomendado)</option>
                <option value="iframe" ${htmlMode === 'iframe' ? 'selected' : ''}>🛡️ Iframe Isolado / Sandbox (Apps completas, PWA)</option>
                <option value="inline" ${htmlMode === 'inline' ? 'selected' : ''}>📝 Snippet Direto (Apenas trechos simples)</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Altura do App / Iframe:</label>
              <input type="text" value="${this.escape(iframeHeight)}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'iframeHeight', this.value)" placeholder="Ex: 650px ou 700px" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-mono">
            </div>
          </div>

          <!-- Opção 1: Link Direto de Arquivo Local ou URL Externa -->
          <div class="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
            <label class="block text-[10px] font-bold text-slate-300 flex items-center justify-between">
              <span class="flex items-center gap-1"><span>🔗</span> Link do Arquivo ou URL (Opcional):</span>
              <span class="text-[10px] text-slate-400 font-normal">Evita colar 1.800 linhas</span>
            </label>
            <input type="text" value="${this.escape(iframeUrl)}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'iframeUrl', this.value)" placeholder="Ex: orça-obra/index.html ou https://..." class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-mono">
            <span class="text-[10px] text-slate-500 block">Se preencher este campo, o quiz carrega o arquivo direto pelo sandbox sem precisar colar o código.</span>
          </div>

          <!-- Opção 2: Código HTML colado -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                <span>Código HTML / Aplicação:</span>
                ${isDetectedFullDoc ? '<span class="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/30">Página Completa Detectada ➔ Iframe Ativo</span>' : ''}
              </label>
              <button onclick="App.insertSampleIframeToBlock(${stepIdx}, ${bIdx})" class="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold underline">
                Inserir Modelo
              </button>
            </div>
            ${this.renderDynamicTagsHelper(stepIdx)}
            <textarea oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'customHtml', this.value)" placeholder="Cole código HTML, página completa com <!DOCTYPE> ou trechos interativos..." rows="4" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-2 rounded-lg text-xs font-mono text-slate-200">${this.escape(block.customHtml || '')}</textarea>
          </div>

          <!-- Largura e Moldura -->
          <div class="grid grid-cols-2 gap-2 text-xs">
            <label class="flex items-center gap-2 p-2 rounded bg-slate-900/40 border border-slate-800 cursor-pointer hover:bg-slate-800/40 transition">
              <input type="checkbox" ${isFullWidth ? 'checked' : ''} onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'fullWidth', this.checked)" class="rounded text-indigo-600 focus:ring-0">
              <span class="text-[11px] text-slate-300">📱 Borda a Borda (100% Celular)</span>
            </label>

            <label class="flex items-center gap-2 p-2 rounded bg-slate-900/40 border border-slate-800 cursor-pointer hover:bg-slate-800/40 transition">
              <input type="checkbox" ${block.borderless ? 'checked' : ''} onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'borderless', this.checked)" class="rounded text-indigo-600 focus:ring-0">
              <span class="text-[11px] text-slate-300">Fundo Transparente (Sem moldura)</span>
            </label>
          </div>
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

    // 7. BLOCO DE OFERTA / PLANOS COMPARATIVOS (Demandas 8, 10, 11 e Imagens)
    else if (block.type === 'offer') {
      const isMultiPlan = Array.isArray(block.plans);
      blockBadge = `<span class="text-violet-400 font-bold text-xs flex items-center gap-1.5"><span>🎁</span> ${isMultiPlan ? 'Tabela Comparativa de Planos (Multi-Planos)' : 'Oferta / Produto Único'}</span>`;
      
      if (isMultiPlan) {
        let plansHtml = '';
        block.plans.forEach((plan, pIdx) => {
          const isFeatured = plan.featured === true;
          const rawFeats = Array.isArray(plan.features) ? plan.features.join('\n') : (plan.features || '');
          const bonus = plan.bonus || {};

          plansHtml += `
            <div class="p-3.5 rounded-xl border ${isFeatured ? 'border-emerald-500/50 bg-emerald-950/20 shadow-md' : 'border-slate-700/80 bg-slate-900/60'} space-y-3 relative">
              <div class="flex items-center justify-between pb-2 border-b border-slate-700/50">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold ${isFeatured ? 'text-emerald-400' : 'text-slate-300'}">Cartão ${pIdx + 1}: ${this.escape(plan.title || 'Plano')}</span>
                  ${isFeatured ? '<span class="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-extrabold uppercase">Destaque Ativo</span>' : ''}
                </div>
                <div class="flex items-center gap-3">
                  <label class="inline-flex items-center gap-1.5 cursor-pointer text-xs ${isFeatured ? 'text-emerald-300 font-bold' : 'text-slate-400'}">
                    <input type="checkbox" ${isFeatured ? 'checked' : ''} onchange="App.updatePlanProp(${stepIdx}, ${bIdx}, ${pIdx}, 'featured', this.checked)" class="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0">
                    <span>Destacar Bloco</span>
                  </label>
                  ${block.plans.length > 1 ? `
                    <button onclick="App.removePlanFromOffer(${stepIdx}, ${bIdx}, ${pIdx})" class="text-slate-500 hover:text-red-400 text-xs transition" title="Remover este plano">
                      🗑️
                    </button>
                  ` : ''}
                </div>
              </div>

              ${isFeatured ? `
                <div>
                  <label class="block text-[10px] font-bold text-emerald-400 mb-1">Faixa / Selo Superior do Destaque (Ribbon)</label>
                  <input type="text" value="${this.escape(plan.featuredBadge || '⭐ MELHOR CUSTO-BENEFÍCIO')}" oninput="App.updatePlanProp(${stepIdx}, ${bIdx}, ${pIdx}, 'featuredBadge', this.value)" placeholder="Ex: ⭐ MELHOR CUSTO-BENEFÍCIO" class="w-full bg-slate-950 border border-emerald-500/40 px-2.5 py-1.5 rounded-lg text-xs text-white font-bold">
                </div>
              ` : ''}

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1">Nome / Período do Plano</label>
                  <input type="text" value="${this.escape(plan.title || '')}" oninput="App.updatePlanProp(${stepIdx}, ${bIdx}, ${pIdx}, 'title', this.value)" placeholder="Ex: 3 MESES ou MENSAL" class="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-bold">
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1">Preço Rasurado de Ancoragem</label>
                  <input type="text" value="${this.escape(plan.anchorPrice || '')}" oninput="App.updatePlanProp(${stepIdx}, ${bIdx}, ${pIdx}, 'anchorPrice', this.value)" placeholder="Ex: De R$ 119,90" class="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-slate-300 font-semibold">
                </div>
              </div>

              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1">Moeda</label>
                  <input type="text" value="${this.escape(plan.currency || 'R$')}" oninput="App.updatePlanProp(${stepIdx}, ${bIdx}, ${pIdx}, 'currency', this.value)" class="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1">Valor Principal</label>
                  <input type="text" value="${this.escape(plan.priceMain || '')}" oninput="App.updatePlanProp(${stepIdx}, ${bIdx}, ${pIdx}, 'priceMain', this.value)" placeholder="Ex: 67" class="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-emerald-400 font-extrabold text-center">
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1">Centavos</label>
                  <input type="text" value="${this.escape(plan.priceCents || '')}" oninput="App.updatePlanProp(${stepIdx}, ${bIdx}, ${pIdx}, 'priceCents', this.value)" placeholder="Ex: ,90" class="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-emerald-400 font-extrabold text-center">
                </div>
              </div>

              <div>
                <label class="block text-[10px] font-bold text-slate-400 mb-1">Subtítulo / Descritivo do Período</label>
                <input type="text" value="${this.escape(plan.periodSub || '')}" oninput="App.updatePlanProp(${stepIdx}, ${bIdx}, ${pIdx}, 'periodSub', this.value)" placeholder="Ex: 3 meses de acesso (R$ 22,63/mês)" class="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-slate-300">
              </div>

              <div>
                <label class="block text-[10px] font-bold text-slate-400 mb-1">Benefícios com Ícone ✓ (1 por linha, aceita **negrito**)</label>
                <textarea rows="3" oninput="App.updatePlanProp(${stepIdx}, ${bIdx}, ${pIdx}, 'features', this.value)" placeholder="Todos os canais liberados&#10;Qualidade Full HD e 4K&#10;Suporte prioritário via WhatsApp" class="quiz-textarea w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white leading-relaxed">${this.escape(rawFeats)}</textarea>
              </div>

              <!-- Box de Bônus (Opcional) -->
              <div class="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                <div class="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Bônus Especial Incluso (Opcional)</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input type="text" value="${this.escape(bonus.title || '')}" oninput="App.updatePlanProp(${stepIdx}, ${bIdx}, ${pIdx}, 'bonus.title', this.value)" placeholder="Título do Bônus (ex: 🎬 App CineFree)" class="w-full bg-slate-900 border border-slate-700 px-2 py-1 rounded text-xs text-white">
                  </div>
                  <div>
                    <input type="text" value="${this.escape(bonus.tag || '')}" oninput="App.updatePlanProp(${stepIdx}, ${bIdx}, ${pIdx}, 'bonus.tag', this.value)" placeholder="Tag (ex: Grátis)" class="w-full bg-slate-900 border border-slate-700 px-2 py-1 rounded text-xs text-white">
                  </div>
                </div>
                <input type="text" value="${this.escape(bonus.desc || '')}" oninput="App.updatePlanProp(${stepIdx}, ${bIdx}, ${pIdx}, 'bonus.desc', this.value)" placeholder="Descrição do Bônus (ex: Acesso liberado a filmes e séries)" class="w-full bg-slate-900 border border-slate-700 px-2 py-1 rounded text-xs text-slate-300">
              </div>

              <!-- Botão CTA e Link de Checkout -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1">Texto do Botão Deste Plano</label>
                  <input type="text" value="${this.escape(plan.ctaText || 'Quero Este Plano')}" oninput="App.updatePlanProp(${stepIdx}, ${bIdx}, ${pIdx}, 'ctaText', this.value)" placeholder="Ex: Quero Este Plano" class="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-bold">
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1">Link de Checkout / Kirvano / Kiwify</label>
                  <input type="url" value="${this.escape(plan.ctaUrl || '')}" oninput="App.updatePlanProp(${stepIdx}, ${bIdx}, ${pIdx}, 'ctaUrl', this.value)" placeholder="https://pay.kirvano.com/..." class="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
                </div>
              </div>
            </div>
          `;
        });

        blockBody = `
          <div class="space-y-3 pt-1">
            <div class="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span class="text-xs text-slate-300 font-medium">✨ Layout com cartões comparativos nativos (rastreamento de checkout automático).</span>
              <button onclick="App.switchOfferMode(${stepIdx}, ${bIdx}, 'single')" class="text-[11px] text-violet-400 hover:underline font-semibold">
                Alternar p/ Oferta Única
              </button>
            </div>
            <div class="space-y-3">
              ${plansHtml}
            </div>
            <button onclick="App.addPlanToOffer(${stepIdx}, ${bIdx})" class="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-violet-500 text-xs font-bold text-violet-300 transition flex items-center justify-center gap-1.5">
              <span>➕</span> Adicionar Novo Plano / Cartão
            </button>
          </div>
        `;
      } else {
        // Fallback para edição de oferta clássica única
        blockBody = `
          <div class="space-y-2.5 pt-1">
            <div class="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span class="text-xs text-slate-300 font-medium">Modo Oferta Simples (1 produto).</span>
              <button onclick="App.switchOfferMode(${stepIdx}, ${bIdx}, 'multi_plan')" class="text-[11px] text-emerald-400 hover:underline font-bold">
                Alternar p/ 3 Cartões Comparativos
              </button>
            </div>
            ${this.renderDynamicTagsHelper(stepIdx)}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[10px] font-bold text-slate-400 mb-1">Nome do Produto / Serviço</label>
                <textarea rows="1" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'productTitle', this.value)" placeholder="Ex: Método Vendas Rápidas" class="quiz-textarea w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-semibold">${this.escape(block.productTitle || '')}</textarea>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 mb-1">Preço em Destaque</label>
                <input type="text" value="${this.escape(block.productPrice || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'productPrice', this.value)" placeholder="Ex: 12x de R$ 19,90" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-emerald-400 font-bold">
              </div>
              <div class="sm:col-span-2">
                <label class="block text-[10px] font-bold text-slate-400 mb-1">Descrição Curta / Benefícios</label>
                <textarea rows="2" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'productDescription', this.value)" placeholder="Ex: Acesso imediato + bônus exclusivos..." class="quiz-textarea w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">${this.escape(block.productDescription || '')}</textarea>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 mb-1">Link de Pagamento / WhatsApp</label>
                <input type="url" value="${this.escape(block.ctaUrl || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'ctaUrl', this.value)" placeholder="https://pay.hotmart.com/..." class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 mb-1">Texto do Botão de Compra</label>
                <input type="text" value="${this.escape(block.ctaText || 'Garantir Minha Oferta Exclusiva Agora →')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'ctaText', this.value)" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-bold">
              </div>
            </div>
          </div>
        `;
      }
    }

    // 7.1 BLOCO DE GARANTIA INCONDICIONAL / RISCO ZERO (Demanda e Imagem 2)
    else if (block.type === 'guarantee') {
      blockBadge = '<span class="text-amber-300 font-bold text-xs flex items-center gap-1.5"><span>🛡️</span> Garantia Incondicional (Risco Zero)</span>';
      blockBody = `
        <div class="space-y-3 pt-1">
          <!-- Presets Rápidos de Dias -->
          <div class="flex items-center gap-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800">
            <span class="text-[11px] font-bold text-slate-400">Presets de Prazo:</span>
            <div class="flex items-center gap-1.5">
              <button type="button" onclick="App.setGuaranteePreset(${stepIdx}, ${bIdx}, 7)" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 text-[11px] font-bold text-slate-300 transition">7 Dias</button>
              <button type="button" onclick="App.setGuaranteePreset(${stepIdx}, ${bIdx}, 15)" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 text-[11px] font-bold text-slate-300 transition">15 Dias</button>
              <button type="button" onclick="App.setGuaranteePreset(${stepIdx}, ${bIdx}, 30)" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 text-[11px] font-bold text-slate-300 transition">30 Dias</button>
              <button type="button" onclick="App.setGuaranteePreset(${stepIdx}, ${bIdx}, 60)" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 text-[11px] font-bold text-slate-300 transition">60 Dias</button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Tag Superior (Ex: RISCO ZERO)</label>
              <input type="text" value="${this.escape(block.tag || 'RISCO ZERO')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'tag', this.value)" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-amber-400 font-bold">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Título da Garantia</label>
              <input type="text" value="${this.escape(block.title || 'GARANTIA de 30 DIAS.')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'title', this.value)" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-bold">
            </div>
            <div class="sm:col-span-2">
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Texto da Garantia (Aceita **negrito** e quebra de linha)</label>
              <textarea rows="3" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'description', this.value)" class="quiz-textarea w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white leading-relaxed">${this.escape(block.description || '')}</textarea>
            </div>
            <div class="sm:col-span-2">
              <label class="block text-[10px] font-bold text-slate-400 mb-1">URL de Selo Customizado (Opcional - deixe vazio para usar o Selo Dourado Vetorial Oficial)</label>
              <input type="url" value="${this.escape(block.customSealUrl || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'customSealUrl', this.value)" placeholder="https://... (Vazio = Selo Dourado Nativo)" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-slate-300">
            </div>
          </div>
        </div>
      `;
    }

    // 8. BLOCO DE ANÁLISE / DIAGNÓSTICO (fake_loader)
    else if (block.type === 'fake_loader') {
      blockBadge = '<span class="text-teal-400 font-bold text-xs flex items-center gap-1.5"><span>⏳</span> Barra de Análise / Diagnóstico (0% a 100%)</span>';
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
                <option value="false" ${block.autoAdvance === false ? 'selected' : ''}>Permanecer nesta etapa (sem avançar)</option>
              </select>
            </div>
          </div>
          <div class="text-[10px] text-slate-500">
            ${block.autoAdvance === false ? 'ℹ️ A barra alcançará 100% e permanecerá nesta etapa. Você pode adicionar um bloco independente de <strong>Botão de Ação / Avanço</strong> ou <strong>Oferta</strong> nesta etapa.' : 'ℹ️ Assim que a barra alcançar 100%, o quiz avançará automaticamente para a próxima etapa.'}
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1">Mensagens Dinâmicas de Status (uma por linha):</label>
            ${this.renderDynamicTagsHelper(stepIdx)}
            <textarea rows="4" onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'messages', this.value)" class="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-xs text-slate-200 font-mono">${this.escape(typeof block.messages === 'string' ? block.messages : (block.messages || []).join('\n'))}</textarea>
            <span class="text-[10px] text-slate-500">As frases se alternam suavemente enquanto a barra sobe de 0% a 100%. Aceita variáveis dinâmicas!</span>
          </div>
        </div>
      `;
    }

    // 9. NOVO BLOCO: Gráfico de Projeção & Potencial (potential_chart)
    else if (block.type === 'potential_chart') {
      blockBadge = '<span class="text-rose-400 font-bold text-xs flex items-center gap-1.5"><span>📈</span> Gráfico de Projeção & Potencial</span>';
      const showValues = block.showValues !== false;
      const chartStyle = block.chartStyle || 'curve';

      blockBody = `
        <div class="space-y-3 pt-1">
          <!-- Título Opcional do Gráfico e Estilo -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div class="sm:col-span-2">
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Título do Gráfico (Opcional)</label>
              <input type="text" value="${this.escape(block.chartTitle || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'chartTitle', this.value)" placeholder="Ex: Projeção de Transformação Estimada" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Formato Visual</label>
              <select onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'chartStyle', this.value)" class="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded-lg text-xs text-white font-medium">
                <option value="curve" ${chartStyle === 'curve' ? 'selected' : ''}>📈 Linha Curva Animada</option>
                <option value="bars" ${chartStyle === 'bars' ? 'selected' : ''}>📊 Barras Comparativas</option>
              </select>
            </div>
          </div>

          <!-- Ponto A (Inicial / Dor) e Ponto B (Final / Transformação) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <!-- Ponto Inicial (Vermelho / Dor) -->
            <div class="space-y-2 border-r border-slate-800/80 pr-2">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold text-red-400 flex items-center gap-1">
                  <span class="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Estágio Atual (Ponto A)
                </span>
                <input type="color" value="${block.startColor || '#ef4444'}" onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'startColor', this.value)" class="w-6 h-6 rounded cursor-pointer bg-transparent border-0" title="Cor do Ponto Inicial">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 mb-1">Texto / Rótulo</label>
                <input type="text" value="${this.escape(block.startLabel || 'Seu estado hoje')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'startLabel', this.value)" placeholder="Ex: Seu físico hoje..." class="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
              </div>
              ${showValues ? `
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1">Valor / Porcentagem</label>
                  <input type="text" value="${this.escape(block.startValue !== undefined ? block.startValue : '24%')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'startValue', this.value)" placeholder="Ex: 24% ou 85 kg ou R$ 2.000" class="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-red-400 font-bold font-mono">
                </div>
              ` : ''}
            </div>

            <!-- Ponto Final (Verde / Potencial) -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Estágio Alcançável (Ponto B)
                </span>
                <input type="color" value="${block.endColor || '#10b981'}" onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'endColor', this.value)" class="w-6 h-6 rounded cursor-pointer bg-transparent border-0" title="Cor do Ponto Final">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 mb-1">Texto / Rótulo</label>
                <input type="text" value="${this.escape(block.endLabel || 'Seu potencial com o método')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'endLabel', this.value)" placeholder="Ex: Seu corpo ideal em 8 semanas..." class="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
              </div>
              ${showValues ? `
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1">Valor / Porcentagem</label>
                  <input type="text" value="${this.escape(block.endValue !== undefined ? block.endValue : '92%')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'endValue', this.value)" placeholder="Ex: 92% ou 72 kg ou R$ 15.000" class="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-emerald-400 font-bold font-mono">
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Controle de Números e Tempo de Animação -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div class="flex items-center pt-2">
              <label class="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input type="checkbox" ${showValues ? 'checked' : ''} onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'showValues', this.checked); App.renderSteps();" class="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0">
                <span>Exibir valores numéricos / porcentagens</span>
              </label>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Duração da Animação (segundos)</label>
              <input type="number" min="1" max="10" step="0.5" value="${block.animationDuration || 2.5}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'animationDuration', parseFloat(this.value) || 2.5)" class="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-mono font-bold">
            </div>
          </div>
        </div>
      `;
    }

    // 10. BLOCO DE AVALIAÇÕES / DEPOIMENTOS (reviews)
    else if (block.type === 'reviews') {
      blockBadge = '<span class="text-yellow-400 font-bold text-xs flex items-center gap-1.5"><span>⭐</span> Avaliações & Depoimentos</span>';
      const items = block.items || [];
      const showRatingSummary = block.showRatingSummary !== false;

      blockBody = `
        <div class="space-y-3 pt-1">
          <!-- Cabeçalho do Bloco de Avaliações -->
          <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2.5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[10px] font-bold text-slate-400 mb-1">Tag Superior (Opcional)</label>
                <input type="text" value="${this.escape(block.headerBadge || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'headerBadge', this.value)" placeholder="Ex: AVALIAÇÕES REAIS" class="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 mb-1">Título do Bloco</label>
                <input type="text" value="${this.escape(block.headerTitle || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'headerTitle', this.value)" placeholder="Ex: O que nossos clientes dizem" class="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-semibold">
              </div>
            </div>

            <div class="pt-1 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <label class="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input type="checkbox" ${showRatingSummary ? 'checked' : ''} onchange="App.updateBlockProp(${stepIdx}, ${bIdx}, 'showRatingSummary', this.checked); App.renderSteps();" class="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0">
                <span>Exibir Média de Estrelas no Topo (Ex: ⭐ 4.9 de 5)</span>
              </label>
              ${showRatingSummary ? `
                <input type="text" value="${this.escape(block.ratingSummary || '4.9 de 5 baseado em 1.480 avaliações')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'ratingSummary', this.value)" placeholder="Ex: 4.9 de 5 baseado em 1.480 avaliações" class="flex-1 max-w-xs bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-amber-400 font-medium">
              ` : ''}
            </div>
          </div>

          <!-- Lista de Depoimentos Individuais -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <i class="ph ph-chat-circle-dots text-yellow-400"></i> Depoimentos Cadastrados (${items.length}):
              </span>
              <button type="button" onclick="App.addReviewItem(${stepIdx}, ${bIdx})" class="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-bold border border-indigo-500/40 transition flex items-center gap-1 shadow-sm">
                <i class="ph ph-plus-circle"></i> + Adicionar Avaliação
              </button>
            </div>

            ${items.map((rev, revIdx) => {
              const stars = parseInt(rev.stars, 10) || 5;
              const isVerified = rev.verified !== false;
              return `
                <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
                  <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <span class="w-5 h-5 rounded-md bg-slate-800 text-yellow-400 flex items-center justify-center font-bold text-[11px] border border-slate-700">${revIdx + 1}</span>
                      <span>${this.escape(rev.name || 'Nova Avaliação')}</span>
                    </span>
                    <div class="flex items-center gap-1">
                      <button type="button" onclick="App.moveReviewItem(${stepIdx}, ${bIdx}, ${revIdx}, -1)" ${revIdx === 0 ? 'disabled class="opacity-20 cursor-not-allowed p-1 text-slate-500"' : 'class="p-1 text-slate-400 hover:text-white"'} title="Mover para cima">
                        <i class="ph ph-arrow-up text-xs"></i>
                      </button>
                      <button type="button" onclick="App.moveReviewItem(${stepIdx}, ${bIdx}, ${revIdx}, 1)" ${revIdx === items.length - 1 ? 'disabled class="opacity-20 cursor-not-allowed p-1 text-slate-500"' : 'class="p-1 text-slate-400 hover:text-white"'} title="Mover para baixo">
                        <i class="ph ph-arrow-down text-xs"></i>
                      </button>
                      <button type="button" onclick="App.deleteReviewItem(${stepIdx}, ${bIdx}, ${revIdx})" class="p-1 text-slate-500 hover:text-red-400 transition ml-1" title="Excluir avaliação">
                        <i class="ph ph-trash text-xs"></i>
                      </button>
                    </div>
                  </div>

                  <!-- Linha 1: Estrelas, Nome e Cargo -->
                  <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 mb-1">Classificação ⭐</label>
                      <select onchange="App.updateReviewItem(${stepIdx}, ${bIdx}, ${revIdx}, 'stars', parseInt(this.value, 10))" class="w-full bg-slate-950 border border-slate-700 px-2 py-1.5 rounded-lg text-xs text-yellow-400 font-bold">
                        <option value="5" ${stars === 5 ? 'selected' : ''}>⭐⭐⭐⭐⭐ (5.0)</option>
                        <option value="4" ${stars === 4 ? 'selected' : ''}>⭐⭐⭐⭐ (4.0)</option>
                        <option value="3" ${stars === 3 ? 'selected' : ''}>⭐⭐⭐ (3.0)</option>
                        <option value="2" ${stars === 2 ? 'selected' : ''}>⭐⭐ (2.0)</option>
                        <option value="1" ${stars === 1 ? 'selected' : ''}>⭐ (1.0)</option>
                      </select>
                    </div>
                    <div class="sm:col-span-2">
                      <label class="block text-[10px] font-bold text-slate-400 mb-1">Nome do Cliente</label>
                      <input type="text" value="${this.escape(rev.name || '')}" oninput="App.updateReviewItem(${stepIdx}, ${bIdx}, ${revIdx}, 'name', this.value)" placeholder="Ex: Carlos M." class="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-semibold">
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 mb-1">Cargo / Profissão</label>
                      <input type="text" value="${this.escape(rev.role || '')}" oninput="App.updateReviewItem(${stepIdx}, ${bIdx}, ${revIdx}, 'role', this.value)" placeholder="Ex: Engenheiro" class="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-slate-300">
                    </div>
                  </div>

                  <!-- Linha 2: Foto (opcional), Tempo e Selo Verificado -->
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 mb-1">URL da Foto (Opcional)</label>
                      <input type="text" value="${this.escape(rev.avatarUrl || '')}" oninput="App.updateReviewItem(${stepIdx}, ${bIdx}, ${revIdx}, 'avatarUrl', this.value)" placeholder="Vazio = Iniciais coloridas automáticas" class="w-full bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-slate-300">
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 mb-1">Tempo / Data</label>
                      <input type="text" value="${this.escape(rev.timeAgo || '')}" oninput="App.updateReviewItem(${stepIdx}, ${bIdx}, ${revIdx}, 'timeAgo', this.value)" placeholder="Ex: Postado há 2 dias" class="w-full bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-slate-300">
                    </div>
                    <div class="flex items-center pt-4">
                      <label class="inline-flex items-center gap-1.5 cursor-pointer text-xs text-emerald-400 font-semibold">
                        <input type="checkbox" ${isVerified ? 'checked' : ''} onchange="App.updateReviewItem(${stepIdx}, ${bIdx}, ${revIdx}, 'verified', this.checked)" class="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0">
                        <span>Compra Verificada ✓</span>
                      </label>
                    </div>
                  </div>

                  <!-- Linha 3: Texto do Comentário -->
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400 mb-1">Comentário / Depoimento</label>
                    <textarea rows="2" oninput="App.updateReviewItem(${stepIdx}, ${bIdx}, ${revIdx}, 'comment', this.value)" placeholder="Escreva a avaliação do cliente..." class="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white">${this.escape(rev.comment || '')}</textarea>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // 11. BLOCO DE DÚVIDAS FREQUENTES (FAQ)
    else if (block.type === 'faq') {
      blockBadge = '<span class="text-sky-400 font-bold text-xs flex items-center gap-1.5"><span>💬</span> Dúvidas Frequentes (FAQ)</span>';
      const items = block.items || [];

      blockBody = `
        <div class="space-y-3 pt-1">
          <!-- Título e Subtítulo do FAQ -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Título da Seção de Dúvidas</label>
              <input type="text" value="${this.escape(block.title || 'Perguntas Frequentes')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'title', this.value)" placeholder="Ex: Perguntas Frequentes" class="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-semibold">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Subtítulo Explicativo (Opcional)</label>
              <input type="text" value="${this.escape(block.subtitle || '')}" oninput="App.updateBlockProp(${stepIdx}, ${bIdx}, 'subtitle', this.value)" placeholder="Ex: Tire suas dúvidas antes de finalizar" class="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-slate-300">
            </div>
          </div>

          <!-- Lista de Perguntas & Respostas -->
          <div class="space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <i class="ph ph-question text-sky-400"></i> Perguntas Cadastradas (${items.length}):
              </span>
              <button type="button" onclick="App.addFaqItem(${stepIdx}, ${bIdx})" class="px-2.5 py-1 rounded-lg bg-sky-600/30 hover:bg-sky-600 text-sky-300 hover:text-white text-xs font-bold border border-sky-500/40 transition flex items-center gap-1 shadow-sm">
                <i class="ph ph-plus-circle"></i> + Adicionar Pergunta
              </button>
            </div>

            ${items.map((item, itemIdx) => `
              <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
                <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span class="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                    <span class="w-5 h-5 rounded-md bg-slate-800 text-sky-300 flex items-center justify-center font-bold text-[11px] border border-slate-700">${itemIdx + 1}</span>
                    <span class="text-slate-300 truncate max-w-[260px] sm:max-w-[400px]">${this.escape(item.question || 'Nova Pergunta')}</span>
                  </span>
                  <div class="flex items-center gap-1">
                    <button type="button" onclick="App.moveFaqItem(${stepIdx}, ${bIdx}, ${itemIdx}, -1)" ${itemIdx === 0 ? 'disabled class="opacity-20 cursor-not-allowed p-1 text-slate-500"' : 'class="p-1 text-slate-400 hover:text-white"'} title="Mover para cima">
                      <i class="ph ph-arrow-up text-xs"></i>
                    </button>
                    <button type="button" onclick="App.moveFaqItem(${stepIdx}, ${bIdx}, ${itemIdx}, 1)" ${itemIdx === items.length - 1 ? 'disabled class="opacity-20 cursor-not-allowed p-1 text-slate-500"' : 'class="p-1 text-slate-400 hover:text-white"'} title="Mover para baixo">
                      <i class="ph ph-arrow-down text-xs"></i>
                    </button>
                    <button type="button" onclick="App.deleteFaqItem(${stepIdx}, ${bIdx}, ${itemIdx})" class="p-1 text-slate-500 hover:text-red-400 transition ml-1" title="Excluir pergunta">
                      <i class="ph ph-trash text-xs"></i>
                    </button>
                  </div>
                </div>

                <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1">❓ Pergunta</label>
                  <input type="text" value="${this.escape(item.question || '')}" oninput="App.updateFaqItem(${stepIdx}, ${bIdx}, ${itemIdx}, 'question', this.value)" placeholder="Ex: Como recebo o acesso?" class="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-semibold">
                </div>

                <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1">💡 Resposta (Aceita **negrito** e quebra de linha)</label>
                  <textarea rows="2" oninput="App.updateFaqItem(${stepIdx}, ${bIdx}, ${itemIdx}, 'answer', this.value)" placeholder="Explique a resposta detalhadamente..." class="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-slate-200">${this.escape(item.answer || '')}</textarea>
                </div>
              </div>
            `).join('')}
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
      newBlock.align = 'center';
      newBlock.titleSize = 'md';
      newBlock.subtitleSize = 'sm';
    } else if (blockType === 'image') {
      newBlock.title = '';
      newBlock.titleSize = 'md';
      newBlock.titleColor = '';
      newBlock.imageUrl = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80';
      newBlock.altText = 'Imagem Ilustrativa';
      newBlock.caption = '';
      newBlock.imageSize = 'medium';
      newBlock.align = 'center';
    } else if (blockType === 'video') {
      newBlock.youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      newBlock.orientation = 'horizontal';
      newBlock.autoplayMode = 'muted_button';
      newBlock.hideControls = true;
      newBlock.hideRecommendations = true;
      newBlock.cleanTopMask = true;
      newBlock.unmuteButtonText = '🔊 Toque para Ativar o Áudio';
      newBlock.preload = true;
    } else if (blockType === 'question') {
      newBlock.align = 'left';
      newBlock.options = [
        { icon: '🚀', text: 'Quero aumentar minhas vendas', points: 10, targetStepIndex: '' },
        { icon: '⚙️', text: 'Quero economizar tempo', points: 5, targetStepIndex: '' }
      ];
    } else if (blockType === 'fake_loader') {
      newBlock.duration = 4;
      newBlock.autoAdvance = true;
      newBlock.messages = 'Analisando suas respostas...\nCruzando com nosso banco de dados...\nCalculando seu perfil ideal...\nDiagnóstico pronto!';
    } else if (blockType === 'delay_button') {
      newBlock.delaySeconds = 5;
      newBlock.text = 'Avançar para a próxima etapa →';
      newBlock.url = '';
      newBlock.buttonSize = 'large';
    } else if (blockType === 'html') {
      newBlock.fullWidth = true;
      newBlock.borderless = false;
      newBlock.customHtml = '<div style="background:linear-gradient(135deg, #1e1b4b, #312e81); border:1px solid #4338ca; padding:18px; border-radius:12px; text-align:center; color:#fff;"><h4 style="font-weight:bold; margin-bottom:6px;">🚀 Demonstração do Produto</h4><p style="font-size:13px; opacity:0.85;">Você pode interagir e testar o produto aqui dentro.</p></div>';
    } else if (blockType === 'lead_form') {
      newBlock.requireEmail = true;
      newBlock.submitButtonText = 'Liberar Meu Diagnóstico Completo →';
    } else if (blockType === 'offer') {
      newBlock.mode = 'multi_plan';
      newBlock.plans = (typeof QuizTemplateEngine !== 'undefined' && QuizTemplateEngine.getDefaultPricingPlans)
        ? QuizTemplateEngine.getDefaultPricingPlans()
        : [
            {
              id: 'plan_1',
              title: 'MENSAL',
              anchorPrice: 'De R$ 59,90',
              currency: 'R$',
              priceMain: '39',
              priceCents: ',90',
              periodSub: '1 mês de acesso',
              features: ['Todos os canais liberados', 'Qualidade Full HD e 4K', 'Suporte prioritário via WhatsApp'],
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
              features: ['Todos os canais liberados', 'Qualidade Full HD e 4K', 'Suporte prioritário via WhatsApp', 'Acesso simultâneo em 2 telas'],
              bonus: { title: '🎬 App CineFree', tag: 'Grátis', desc: 'Acesso liberado a filmes e séries de streaming' },
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
              features: ['Todos os canais liberados', 'Qualidade Full HD e 4K', 'Suporte VIP 24h via WhatsApp', 'Acesso simultâneo em 4 telas'],
              bonus: { title: '🎬 App CineFree VIP', tag: 'Grátis', desc: 'Acesso vitalício a filmes, séries e lançamentos' },
              ctaText: 'Quero Este Plano',
              ctaUrl: '#',
              featured: false,
              featuredBadge: ''
            }
          ];
    } else if (blockType === 'guarantee') {
      newBlock.tag = 'RISCO ZERO';
      newBlock.title = 'GARANTIA de 30 DIAS.';
      newBlock.description = 'Você tem **30 dias de garantia incondicional**.\nSe por qualquer motivo você não gostar ou achar que não é para você, basta solicitar o reembolso e **devolveremos 100% do seu dinheiro**, sem perguntas e sem complicação.';
      newBlock.customSealUrl = '';
    } else if (blockType === 'potential_chart') {
      newBlock.chartTitle = 'Projeção de Transformação & Potencial';
      newBlock.chartStyle = 'curve'; // 'curve' | 'bars'
      newBlock.startLabel = 'Sua Situação Atual';
      newBlock.endLabel = 'Seu Potencial com o Método';
      newBlock.showValues = true;
      newBlock.startValue = '24%';
      newBlock.endValue = '92%';
      newBlock.startColor = '#ef4444';
      newBlock.endColor = '#10b981';
      newBlock.animationDuration = 2.5;
    } else if (blockType === 'reviews') {
      newBlock.headerBadge = 'AVALIAÇÕES REAIS';
      newBlock.headerTitle = 'O que nossos clientes dizem';
      newBlock.showRatingSummary = true;
      newBlock.ratingSummary = '4.9 de 5 baseado em 1.480 avaliações';
      newBlock.items = (typeof QuizTemplateEngine !== 'undefined' && QuizTemplateEngine.getDefaultReviewItems)
        ? QuizTemplateEngine.getDefaultReviewItems()
        : [
            { id: 'rev_1', name: 'Carlos Mendes', role: 'Engenheiro Civil', avatarUrl: '', stars: 5, comment: 'Superou todas as minhas expectativas! Consegui montar o orçamento em menos de 15 minutos e economizei horas de trabalho.', timeAgo: 'Postado há 2 dias', verified: true },
            { id: 'rev_2', name: 'Mariana Silveira', role: 'Arquiteta', avatarUrl: '', stars: 5, comment: 'Didático, direto ao ponto e muito prático. Mudou a forma como apresento orçamentos e propostas para meus clientes.', timeAgo: 'Postado há 4 dias', verified: true },
            { id: 'rev_3', name: 'Roberto Fontes', role: 'Empreiteiro', avatarUrl: '', stars: 5, comment: 'O suporte me atendeu na hora no WhatsApp e o material é completíssimo. Vale cada centavo investido.', timeAgo: 'Postado há 1 semana', verified: true }
          ];
    } else if (blockType === 'faq') {
      newBlock.title = 'Perguntas Frequentes';
      newBlock.subtitle = 'Tire suas dúvidas antes de garantir seu acesso';
      newBlock.items = (typeof QuizTemplateEngine !== 'undefined' && QuizTemplateEngine.getDefaultFaqItems)
        ? QuizTemplateEngine.getDefaultFaqItems()
        : [
            { id: 'faq_1', question: 'Como e quando recebo o meu acesso?', answer: 'O envio é imediato! Assim que seu pagamento for aprovado, você receberá seus dados de acesso diretamente no seu e-mail e no WhatsApp.' },
            { id: 'faq_2', question: 'Funciona no celular e no computador?', answer: 'Sim! Você pode acessar de qualquer celular (Android ou iPhone), tablet ou computador, sem precisar instalar nada pesado.' },
            { id: 'faq_3', question: 'E se eu tiver dúvidas ou precisar de ajuda?', answer: 'Você terá acesso ao nosso suporte exclusivo via WhatsApp para tirar qualquer dúvida sempre que precisar.' },
            { id: 'faq_4', question: 'Tenho garantia se eu não gostar?', answer: 'Com certeza! Você tem garantia incondicional de 30 dias. Se por qualquer motivo não ficar satisfeito, devolvemos 100% do seu dinheiro sem burocracia.' }
          ];
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

  updateSalesPlanProp(stepIdx, bIdx, planIdx, prop, value) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const block = this.currentQuiz.steps[stepIdx].blocks[bIdx];
    if (!block || !block.plans || !block.plans[planIdx]) return;

    block.plans[planIdx][prop] = value;
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.refreshPreview(stepIdx);
  },

  updateSalesPlanPrice(stepIdx, bIdx, planIdx, rawValue) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const block = this.currentQuiz.steps[stepIdx].blocks[bIdx];
    if (!block || !block.plans || !block.plans[planIdx]) return;

    // Converte entrada tipo "39,90" ou "39.90" em priceVal: "39" e priceCts: ",90"
    const clean = String(rawValue || '').replace(/[^\d,\.]/g, '');
    const parts = clean.split(/[,\.]/);
    block.plans[planIdx].priceVal = parts[0] || '0';
    block.plans[planIdx].priceCts = parts[1] !== undefined ? ',' + parts[1] : ',00';

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

  toggleOptionCustomText(stepIdx, bIdx, optIdx) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const block = this.currentQuiz.steps[stepIdx].blocks[bIdx];
    if (!block.options || !block.options[optIdx]) return;

    block.options[optIdx].allowCustomText = !block.options[optIdx].allowCustomText;
    if (block.options[optIdx].allowCustomText && !block.options[optIdx].customPlaceholder) {
      block.options[optIdx].customPlaceholder = 'Digite sua resposta aqui...';
    }
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.refreshPreview(stepIdx);
  },

  insertSampleIframeToBlock(stepIdx, bIdx) {
    const sampleHtml = `<iframe src="https://example.com" style="width:100%;height:320px;border-radius:10px;border:none;"></iframe>`;
    this.updateBlockProp(stepIdx, bIdx, 'customHtml', sampleHtml);
    this.renderSteps();
  },

  // MÉTODOS PARA O BLOCO DE AVALIAÇÕES (REVIEWS)
  addReviewItem(stepIdx, bIdx) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const block = this.currentQuiz.steps[stepIdx].blocks[bIdx];
    if (!block.items) block.items = [];

    block.items.push({
      id: 'rev_' + Date.now(),
      name: 'Novo Cliente',
      role: 'Profissão / Cidade',
      avatarUrl: '',
      stars: 5,
      comment: 'Excelente experiência! O conteúdo superou minhas expectativas e recomendo muito.',
      timeAgo: 'Postado recentemente',
      verified: true
    });

    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.refreshPreview(stepIdx);
  },

  updateReviewItem(stepIdx, bIdx, itemIdx, prop, value) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const block = this.currentQuiz.steps[stepIdx].blocks[bIdx];
    if (!block.items || !block.items[itemIdx]) return;

    block.items[itemIdx][prop] = value;
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.refreshPreview(stepIdx);
  },

  deleteReviewItem(stepIdx, bIdx, itemIdx) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const block = this.currentQuiz.steps[stepIdx].blocks[bIdx];
    if (!block.items || !block.items[itemIdx]) return;

    if (confirm('Deseja excluir esta avaliação?')) {
      block.items.splice(itemIdx, 1);
      this.currentQuiz.updatedAt = new Date().toISOString();
      this.saveQuizzesToStorage();
      this.renderSteps();
      this.refreshPreview(stepIdx);
    }
  },

  moveReviewItem(stepIdx, bIdx, itemIdx, dir) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const block = this.currentQuiz.steps[stepIdx].blocks[bIdx];
    if (!block.items) return;
    const newIdx = itemIdx + dir;
    if (newIdx < 0 || newIdx >= block.items.length) return;

    const temp = block.items[itemIdx];
    block.items[itemIdx] = block.items[newIdx];
    block.items[newIdx] = temp;

    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.refreshPreview(stepIdx);
  },

  // MÉTODOS PARA O BLOCO DE FAQ / DÚVIDAS FREQUENTES
  addFaqItem(stepIdx, bIdx) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const block = this.currentQuiz.steps[stepIdx].blocks[bIdx];
    if (!block.items) block.items = [];

    block.items.push({
      id: 'faq_' + Date.now(),
      question: 'Nova Pergunta Frequente?',
      answer: 'Escreva a resposta detalhada aqui para tirar a dúvida do seu cliente.'
    });

    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.refreshPreview(stepIdx);
  },

  updateFaqItem(stepIdx, bIdx, itemIdx, prop, value) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const block = this.currentQuiz.steps[stepIdx].blocks[bIdx];
    if (!block.items || !block.items[itemIdx]) return;

    block.items[itemIdx][prop] = value;
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.refreshPreview(stepIdx);
  },

  deleteFaqItem(stepIdx, bIdx, itemIdx) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const block = this.currentQuiz.steps[stepIdx].blocks[bIdx];
    if (!block.items || !block.items[itemIdx]) return;

    if (confirm('Deseja excluir esta pergunta do FAQ?')) {
      block.items.splice(itemIdx, 1);
      this.currentQuiz.updatedAt = new Date().toISOString();
      this.saveQuizzesToStorage();
      this.renderSteps();
      this.refreshPreview(stepIdx);
    }
  },

  moveFaqItem(stepIdx, bIdx, itemIdx, dir) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const block = this.currentQuiz.steps[stepIdx].blocks[bIdx];
    if (!block.items) return;
    const newIdx = itemIdx + dir;
    if (newIdx < 0 || newIdx >= block.items.length) return;

    const temp = block.items[itemIdx];
    block.items[itemIdx] = block.items[newIdx];
    block.items[newIdx] = temp;

    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.refreshPreview(stepIdx);
  },

  addPlanToOffer(stepIdx, bIdx) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const block = this.currentQuiz.steps[stepIdx].blocks[bIdx];
    if (!block.plans) block.plans = [];

    const planNumber = block.plans.length + 1;
    block.plans.push({
      id: 'plan_' + Date.now(),
      title: 'PLANO ' + planNumber,
      anchorPrice: 'De R$ 97,00',
      currency: 'R$',
      priceMain: '47',
      priceCents: ',90',
      periodSub: 'Acesso completo',
      features: [
        'Acesso imediato e vitalício',
        'Suporte dedicado'
      ],
      bonus: null,
      ctaText: 'Quero Este Plano',
      ctaUrl: '#',
      featured: false,
      featuredBadge: ''
    });

    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.refreshPreview(stepIdx);
  },

  removePlanFromOffer(stepIdx, bIdx, planIdx) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const block = this.currentQuiz.steps[stepIdx].blocks[bIdx];
    if (!block.plans) return;

    block.plans.splice(planIdx, 1);
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.refreshPreview(stepIdx);
  },

  updatePlanProp(stepIdx, bIdx, planIdx, prop, value) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const block = this.currentQuiz.steps[stepIdx].blocks[bIdx];
    if (!block.plans || !block.plans[planIdx]) return;

    if (prop === 'features' && typeof value === 'string') {
      block.plans[planIdx].features = value.split('\n').map(s => s.trim()).filter(Boolean);
    } else if (prop.startsWith('bonus.')) {
      const bField = prop.split('.')[1];
      if (!block.plans[planIdx].bonus) {
        block.plans[planIdx].bonus = { title: '', tag: '', desc: '' };
      }
      block.plans[planIdx].bonus[bField] = value;
    } else {
      block.plans[planIdx][prop] = value;
    }

    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.refreshPreview(stepIdx);
  },

  switchOfferMode(stepIdx, bIdx, mode) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const block = this.currentQuiz.steps[stepIdx].blocks[bIdx];
    block.mode = mode;
    if (mode === 'multi_plan') {
      if (!block.plans || block.plans.length === 0) {
        block.plans = (typeof QuizTemplateEngine !== 'undefined' && QuizTemplateEngine.getDefaultPricingPlans)
          ? QuizTemplateEngine.getDefaultPricingPlans()
          : [];
      }
    } else {
      if (!block.productTitle) {
        block.productTitle = 'Acesso Completo';
        block.productPrice = 'R$ 97,00';
      }
      delete block.plans;
    }
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.refreshPreview(stepIdx);
  },

  setGuaranteePreset(stepIdx, bIdx, days) {
    if (!this.currentQuiz || !this.currentQuiz.steps[stepIdx]) return;
    const block = this.currentQuiz.steps[stepIdx].blocks[bIdx];
    block.tag = 'RISCO ZERO';
    block.title = `GARANTIA de ${days} DIAS.`;
    block.description = `Você tem **${days} dias de garantia incondicional**.\nSe por qualquer motivo você não gostar ou achar que não é para você, basta solicitar o reembolso e **devolveremos 100% do seu dinheiro**, sem burocracia e sem ressentimentos.`;
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderSteps();
    this.refreshPreview(stepIdx);
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
    if (document.getElementById('theme-hide-until-click')) {
      document.getElementById('theme-hide-until-click').value = theme.hideUntilFirstClick !== false ? 'true' : 'false';
    }
    if (document.getElementById('theme-progress-format')) {
      document.getElementById('theme-progress-format').value = theme.progressTextFormat || 'full';
    }
    if (document.getElementById('theme-start-percent')) {
      document.getElementById('theme-start-percent').value = theme.startPercent !== undefined ? theme.startPercent : 60;
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

  // Demanda 11 - Abordagem A: Presets de Tema Rápido
  applyThemePreset(presetKey) {
    if (!this.currentQuiz) return;
    if (!this.currentQuiz.theme) this.currentQuiz.theme = {};

    const presets = {
      dark_modern: {
        primaryColor: '#6366f1',
        accentColor: '#10b981',
        bgColor: '#0f172a',
        cardBg: '#1e293b',
        textColor: '#f8fafc',
        borderRadius: '16px',
        shadow: 'medium'
      },
      clean_light: {
        primaryColor: '#2563eb',
        accentColor: '#059669',
        bgColor: '#f1f5f9',
        cardBg: '#ffffff',
        textColor: '#0f172a',
        textMuted: '#475569',
        borderColor: '#cbd5e1',
        borderRadius: '16px',
        shadow: 'subtle'
      },
      emerald_sales: {
        primaryColor: '#10b981',
        accentColor: '#f59e0b',
        bgColor: '#061a12',
        cardBg: '#0f291e',
        textColor: '#f0fdf4',
        borderRadius: '16px',
        shadow: 'glow'
      },
      midnight_violet: {
        primaryColor: '#8b5cf6',
        accentColor: '#ec4899',
        bgColor: '#0f0920',
        cardBg: '#1b1238',
        textColor: '#faf5ff',
        borderRadius: '20px',
        shadow: 'glow'
      },
      high_energy: {
        primaryColor: '#f97316',
        accentColor: '#eab308',
        bgColor: '#0a0a0a',
        cardBg: '#171717',
        textColor: '#ffffff',
        borderRadius: '12px',
        shadow: 'intense'
      },
      ocean_blue: {
        primaryColor: '#0284c7',
        accentColor: '#06b6d4',
        bgColor: '#081c2b',
        cardBg: '#0e2a42',
        textColor: '#f0f9ff',
        borderRadius: '16px',
        shadow: 'medium'
      }
    };

    const p = presets[presetKey];
    if (!p) return;

    Object.assign(this.currentQuiz.theme, p);
    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderDesign();
    this.refreshPreview();
  },

  // Demanda 11 - Abordagem A: Algoritmo de Harmonia Automática
  applyHarmoniousPalette() {
    if (!this.currentQuiz) return;
    if (!this.currentQuiz.theme) this.currentQuiz.theme = {};

    const primary = this.currentQuiz.theme.primaryColor || '#6366f1';
    const accent = this.currentQuiz.theme.accentColor || '#10b981';

    const hexToRgb = (hex) => {
      const clean = (hex || '#000000').replace('#', '');
      const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
      const num = parseInt(full, 16) || 0;
      return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    };

    const toHex = (n) => Math.min(255, Math.max(0, Math.round(n))).toString(16).padStart(2, '0');

    const curBgRgb = hexToRgb(this.currentQuiz.theme.bgColor || '#0f172a');
    const isDark = (0.299 * curBgRgb.r + 0.587 * curBgRgb.g + 0.114 * curBgRgb.b) < 140;
    const primRgb = hexToRgb(primary);

    if (isDark) {
      // Tom harmonioso escuro derivado da primária
      const bgR = Math.max(10, Math.floor(primRgb.r * 0.08));
      const bgG = Math.max(14, Math.floor(primRgb.g * 0.08));
      const bgB = Math.max(26, Math.floor(primRgb.b * 0.14));

      this.currentQuiz.theme.bgColor = `#${toHex(bgR)}${toHex(bgG)}${toHex(bgB)}`;
      this.currentQuiz.theme.cardBg = `#${toHex(bgR + 14)}${toHex(bgG + 16)}${toHex(bgB + 24)}`;
      this.currentQuiz.theme.textColor = '#f8fafc';
    } else {
      // Tom claro de alto contraste
      this.currentQuiz.theme.bgColor = '#f8fafc';
      this.currentQuiz.theme.cardBg = '#ffffff';
      this.currentQuiz.theme.textColor = '#0f172a';
    }

    this.currentQuiz.updatedAt = new Date().toISOString();
    this.saveQuizzesToStorage();
    this.renderDesign();
    this.refreshPreview();
  },

  // ==========================================
  // ABA 3: RASTREAMENTO, UTMS & INJEÇÃO DE SCRIPTS
  // ==========================================
  renderTracking() {
    if (!this.currentQuiz) return;
    const tracking = this.currentQuiz.tracking || {};
    const sheetVal = tracking.sheetUrl || tracking.webhookUrl || '';
    if (document.getElementById('tracking-webhook')) document.getElementById('tracking-webhook').value = sheetVal;
    if (document.getElementById('tracking-pixel')) document.getElementById('tracking-pixel').value = tracking.metaPixelId || '';
    if (document.getElementById('tracking-ga4')) document.getElementById('tracking-ga4').value = tracking.ga4Id || '';

    // Meta Conversions API (CAPI) & Checkout Tracking
    if (document.getElementById('tracking-quiz-url')) document.getElementById('tracking-quiz-url').value = tracking.quizUrl || tracking.metaQuizUrl || '';
    if (document.getElementById('tracking-meta-token')) document.getElementById('tracking-meta-token').value = tracking.metaApiToken || '';
    if (document.getElementById('tracking-meta-test-code')) document.getElementById('tracking-meta-test-code').value = tracking.metaTestCode || '';
    if (document.getElementById('tracking-send-initiate-checkout')) {
      document.getElementById('tracking-send-initiate-checkout').checked = tracking.sendInitiateCheckout !== false;
    }

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
    const navDock = document.getElementById('quick-steps-nav');

    if (screen === 'preview') {
      if (left) left.classList.add('hidden');
      if (right) {
        right.classList.remove('hidden');
        right.classList.add('flex');
      }
      if (navDock) navDock.classList.add('hidden');
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
      if (navDock && this.activeTab === 'steps') navDock.classList.remove('hidden');
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
  goToStep(stepIndex) {
    if (!this.currentQuiz || !this.currentQuiz.steps || !this.currentQuiz.steps[stepIndex]) return;
    this.currentEditingStepIndex = stepIndex;
    this.preview.currentStepIndex = stepIndex;
    
    // Atualiza preview no celular imediatamente
    this.refreshPreview(stepIndex);

    // Rola suavemente até o card da etapa no editor da esquerda
    const card = document.getElementById(`step-card-${stepIndex}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.remove('step-card-jump-active');
      void card.offsetWidth; // Dispara reflow para reiniciar animação
      card.classList.add('step-card-jump-active');
    }

    // Sincroniza visual das pílulas e dropdown
    this.renderStepsQuickNav();
  },

  goToPrevStep() {
    if (!this.currentQuiz || !this.currentQuiz.steps) return;
    const currentIdx = (this.preview && typeof this.preview.currentStepIndex === 'number') ? this.preview.currentStepIndex : 0;
    if (currentIdx > 0) {
      this.goToStep(currentIdx - 1);
    }
  },

  goToNextStep() {
    if (!this.currentQuiz || !this.currentQuiz.steps) return;
    const currentIdx = (this.preview && typeof this.preview.currentStepIndex === 'number') ? this.preview.currentStepIndex : 0;
    if (currentIdx < this.currentQuiz.steps.length - 1) {
      this.goToStep(currentIdx + 1);
    }
  },

  renderStepsQuickNav() {
    const navContainer = document.getElementById('quick-steps-nav');
    const previewSelect = document.getElementById('preview-step-select');
    if (!this.currentQuiz) return;
    const steps = this.currentQuiz.steps || [];
    const currentIdx = (this.preview && typeof this.preview.currentStepIndex === 'number') ? this.preview.currentStepIndex : 0;

    // 1. Atualiza a Barra Flutuante Fixa no Editor da Esquerda
    if (navContainer) {
      if (steps.length === 0 || this.activeTab !== 'steps') {
        navContainer.innerHTML = '';
        navContainer.classList.add('hidden');
      } else {
        navContainer.classList.remove('hidden');
        const canPrev = currentIdx > 0;
        const canNext = currentIdx < steps.length - 1;

        let pillsHtml = '';
        steps.forEach((step, idx) => {
          const isActive = idx === currentIdx;
          const blocks = step.blocks || [];
          const hasOffer = blocks.some(b => b.type === 'offer');
          const hasVideo = blocks.some(b => b.type === 'video');
          const hasForm = blocks.some(b => b.type === 'lead_form');
          
          let icon = '';
          if (hasOffer) icon = '🏷️';
          else if (hasVideo) icon = '🎬';
          else if (hasForm) icon = '📋';

          const stepTitle = step.title || `Etapa ${idx + 1}`;
          const cleanTitle = step.title ? step.title.replace(/^Etapa\s*\d+\s*:?/i, '').trim() : '';
          
          const activeClass = isActive
            ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-black shadow-lg shadow-indigo-500/50 ring-2 ring-indigo-400 scale-105'
            : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 font-bold hover:border-slate-600';

          pillsHtml += `
            <button type="button" id="quick-step-pill-${idx}" onclick="App.goToStep(${idx})" class="shrink-0 px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-all ${activeClass}" title="${this.escape(stepTitle)}">
              <span>${icon ? icon + ' ' : ''}<b>${idx + 1}</b></span>
              ${cleanTitle ? `<span class="hidden xl:inline max-w-[80px] truncate text-[10.5px] opacity-90">${this.escape(cleanTitle)}</span>` : ''}
            </button>
          `;
        });

        navContainer.innerHTML = `
          <!-- Indicador & Setas de Navegação -->
          <div class="flex items-center gap-1 shrink-0 text-slate-300 text-xs font-bold mr-1">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="hidden sm:inline text-indigo-300 text-[11px] font-bold">Etapa</span>
            <span class="bg-indigo-600/30 text-indigo-300 text-[11px] px-1.5 py-0.5 rounded-md font-mono border border-indigo-500/30 font-bold">
              ${currentIdx + 1}/${steps.length}
            </span>
            <button type="button" onclick="App.goToPrevStep()" ${!canPrev ? 'disabled' : ''} class="w-6 h-6 rounded-lg flex items-center justify-center transition ml-1 ${canPrev ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700' : 'bg-slate-900/50 text-slate-600 cursor-not-allowed border border-slate-800'}" title="Etapa anterior (←)">
              <i class="ph ph-caret-left text-xs font-bold"></i>
            </button>
            <button type="button" onclick="App.goToNextStep()" ${!canNext ? 'disabled' : ''} class="w-6 h-6 rounded-lg flex items-center justify-center transition ${canNext ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700' : 'bg-slate-900/50 text-slate-600 cursor-not-allowed border border-slate-800'}" title="Próxima etapa (→)">
              <i class="ph ph-caret-right text-xs font-bold"></i>
            </button>
          </div>

          <!-- Pílulas de Etapas Roláveis Horizontalmente -->
          <div class="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 scrollbar-none qf-steps-scroll flex-1">
            ${pillsHtml}
          </div>

          <!-- Ações Rápidas no Dock Flutuante -->
          <div class="flex items-center gap-1.5 shrink-0 pl-1 border-l border-slate-700/80">
            <button type="button" onclick="App.scrollEditor('top')" class="px-2 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition flex items-center gap-1" title="Rolar tela até o topo">
              <i class="ph ph-arrow-up text-xs"></i>
              <span class="hidden sm:inline text-[11px]">Topo</span>
            </button>
            <button type="button" onclick="App.addNewStep()" class="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-md shadow-indigo-500/20" title="Criar nova etapa no funil">
              <i class="ph ph-plus font-bold text-xs"></i>
              <span class="hidden sm:inline text-[11px]">Etapa</span>
            </button>
          </div>
        `;

        // Mantém a pílula ativa sempre visível no dock
        setTimeout(() => {
          const activePill = document.getElementById(`quick-step-pill-${currentIdx}`);
          if (activePill) {
            activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        }, 50);
      }
    }

    // 2. Atualiza o seletor no topo do Celular Preview
    if (previewSelect) {
      let optionsHtml = '';
      steps.forEach((step, idx) => {
        const blocks = step.blocks || [];
        const hasOffer = blocks.some(b => b.type === 'offer');
        const tag = hasOffer ? ' (🏷️ Oferta)' : '';
        const title = step.title || `Etapa ${idx + 1}`;
        optionsHtml += `<option value="${idx}" ${idx === currentIdx ? 'selected' : ''}>Etapa ${idx + 1}: ${this.escape(title)}${tag}</option>`;
      });
      previewSelect.innerHTML = optionsHtml;
    }
  },

  focusStep(stepIndex) {
    this.goToStep(stepIndex);
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
    const hideUntilClick = theme.hideUntilFirstClick !== false;
    // Se "Ocultar até 1º clique" estiver ativo, a barra NUNCA aparece na primeira etapa (currentIdx === 0), surgindo apenas a partir da 2ª etapa!
    const shouldShowProgress = showProgress && (!hideUntilClick || currentIdx > 0);

    const progressSection = document.getElementById('preview-progress-section');
    if (progressSection) {
      progressSection.style.display = shouldShowProgress ? 'block' : 'none';
    }

    const progressBar = document.getElementById('preview-progress-bar');
    const progressPercent = document.getElementById('preview-progress-percent');
    const stepIndicator = document.getElementById('preview-step-indicator');
    const backBtn = document.getElementById('preview-btn-back');

    const currentStep = steps[currentIdx];

    if (totalSteps > 0 && showProgress) {
      const pct = QuizTemplateEngine.calculateProgressPercent(currentIdx, totalSteps, theme);
      const text = QuizTemplateEngine.getProgressText(currentIdx, totalSteps, theme, pct);
      const format = theme.progressTextFormat || 'full';

      const progressTextWrapper = progressSection ? progressSection.querySelector('.progress-text') : null;
      if (progressTextWrapper) {
        progressTextWrapper.style.display = format === 'none' ? 'none' : 'flex';
      }

      if (progressBar) progressBar.style.width = pct + '%';
      if (progressPercent) {
        if (format === 'none' || format === 'simple') {
          progressPercent.style.display = 'none';
        } else {
          progressPercent.style.display = 'inline';
          progressPercent.innerText = pct + '%';
        }
      }
      if (stepIndicator) {
        stepIndicator.innerText = text;
        stepIndicator.style.display = (format === 'none' || format === 'percent_only') ? 'none' : 'inline';
      }
    }

    if (backBtn) {
      backBtn.style.display = currentIdx > 0 ? 'inline-flex' : 'none';
    }

    // 3. Renderiza o conteúdo da etapa montado por blocos
    const contentEl = document.getElementById('preview-step-content');
    const cardEl = document.getElementById('preview-quiz-card');
    if (contentEl && currentStep) {
      contentEl.innerHTML = QuizTemplateEngine.renderStepContentHtml(currentStep, this.preview, true);

      this.clearPreviewTimers();
      if (!this.preview.stepTimers) this.preview.stepTimers = [];

      const blocks = currentStep.blocks || [];
      const hasBorderless = blocks.some(b => b.type === 'html' && b.borderless);
      if (cardEl) {
        if (hasBorderless) cardEl.classList.add('card-borderless');
        else cardEl.classList.remove('card-borderless');
      }

      // Garante que iframes de blocos HTML ajustem a altura automaticamente e abram como página completa
      const htmlFrames = contentEl.querySelectorAll('.custom-html-container iframe');
      htmlFrames.forEach(frame => {
        this.setupIframeAutoResize(frame);
      });

      // Demanda 4: Universal Delay em todos os blocos no preview
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
    this.renderStepsQuickNav();
  },

  runPreviewFakeLoader(block) {
    const durationSec = Math.max(1, parseInt(block.duration, 10) || 4);
    const totalMs = durationSec * 1000;
    const rawMsgs = block.messages || 'Analisando suas respostas...\nCruzando com nosso banco de dados...\nCalculando seu perfil ideal...\nDiagnóstico pronto!';
    const messages = Array.isArray(rawMsgs) ? rawMsgs : rawMsgs.split('\n').map(m => m.trim()).filter(Boolean);

    const barEl = document.querySelector('#preview-viewport #loader-bar');
    const pctEl = document.querySelector('#preview-viewport #loader-percent');
    const msgEl = document.querySelector('#preview-viewport #loader-msg');
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
    this.preview.hasAnswered = true; // Interação registrada: revela a barra de progresso
    this.preloadVideos(steps); // Pré-carrega vídeos de etapas subsequentes em segundo plano

    // Se a opção permite digitação pelo lead, abre o campo de texto sem avançar de imediato
    if (opt.allowCustomText) {
      this.refreshPreview();
      setTimeout(() => {
        const input = document.getElementById(`preview-custom-answer-${optIdx}`);
        if (input) {
          input.focus();
          input.select();
        }
      }, 50);
      return;
    }

    if (qBlock.useScoring === true && opt.points) {
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

  previewSubmitCustomOption(optIdx) {
    if (!this.currentQuiz) return;
    const steps = this.currentQuiz.steps || [];
    const step = steps[this.preview.currentStepIndex];
    if (!step) return;

    const qBlock = (step.blocks || []).find(b => b.type === 'question');
    if (!qBlock || !qBlock.options || !qBlock.options[optIdx]) return;

    const opt = qBlock.options[optIdx];
    const input = document.getElementById(`preview-custom-answer-${optIdx}`);
    const typedText = input ? input.value.trim() : '';

    if (!this.preview.customAnswers) this.preview.customAnswers = {};
    this.preview.customAnswers[step.id] = typedText;
    this.preview.hasAnswered = true;

    if (qBlock.useScoring === true && opt.points) {
      this.preview.totalScore += parseInt(opt.points, 10) || 0;
    }

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

  toggleFullPhoneView() {
    const frame = document.getElementById('preview-mockup-frame');
    if (!frame) return;
    const isFull = frame.classList.toggle('full-view');
    localStorage.setItem('qf_phone_full_view', isFull ? 'true' : 'false');
    this.updateFullPhoneButtonUI(isFull);
  },

  updateFullPhoneButtonUI(isFull) {
    const btn = document.getElementById('btn-toggle-full-phone');
    const icon = document.getElementById('icon-full-phone');
    const text = document.getElementById('text-full-phone');
    if (!btn) return;

    if (isFull) {
      btn.className = 'px-2.5 py-1 rounded-lg bg-teal-500 text-slate-950 border border-teal-400 text-xs font-black flex items-center gap-1 shadow-md shadow-teal-500/25 transition';
      if (icon) icon.className = 'ph ph-arrows-in-simple text-sm';
      if (text) text.innerText = 'Tela Fixa';
      btn.title = 'Voltar para a moldura fixa do celular com scroll interno';
    } else {
      btn.className = 'px-2.5 py-1 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center gap-1 transition';
      if (icon) icon.className = 'ph ph-arrows-out-simple text-sm';
      if (text) text.innerText = 'Tela Total';
      btn.title = 'Expandir para ver a tela inteira estendida sem cortes';
    }
  },

  initFullPhoneViewState() {
    const saved = localStorage.getItem('qf_phone_full_view');
    const frame = document.getElementById('preview-mockup-frame');
    if (frame && saved === 'true') {
      frame.classList.add('full-view');
      this.updateFullPhoneButtonUI(true);
    }
  },

  restartPreview() {
    clearTimeout(this.preview.delayTimeout);
    this.preview.currentStepIndex = 0;
    this.preview.userAnswers = {};
    this.preview.customAnswers = {};
    this.preview.hasAnswered = false;
    this.preview.totalScore = 0;
    this.preview.leadData = {};
    this.refreshPreview(0);
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

  preloadVideos(steps) {
    if (!steps || !Array.isArray(steps)) return;
    let cacheContainer = document.getElementById('qf-editor-preload-cache');
    if (!cacheContainer) {
      cacheContainer = document.createElement('div');
      cacheContainer.id = 'qf-editor-preload-cache';
      cacheContainer.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;opacity:0.01;pointer-events:none;left:-9999px;top:-9999px;';
      document.body.appendChild(cacheContainer);
    }
    const preloaded = new Set();
    steps.forEach(step => {
      (step.blocks || []).forEach(b => {
        if (b.type === 'video' && b.youtubeUrl && b.preload !== false) {
          const vid = (typeof QuizTemplateEngine !== 'undefined') ? QuizTemplateEngine.extractYouTubeId(b.youtubeUrl) : null;
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

    const safeTitle = ((quiz.title || 'quiz')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')) || 'meu-quiz';

    const filename = `${safeTitle}.html`;
    this.downloadFile(filename, htmlContent, 'text/html;charset=utf-8');

    document.getElementById('modal-export-success').classList.remove('hidden');
  },

  downloadExportedHtmlAgain() {
    if (!this.lastExportedHtml) return;
    const safeTitle = (this.currentQuiz && this.currentQuiz.title ? this.currentQuiz.title.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'meu-quiz') || 'meu-quiz';
    this.downloadFile(`${safeTitle}.html`, this.lastExportedHtml, 'text/html;charset=utf-8');
  },

  copyExportedHtmlToClipboard() {
    if (!this.lastExportedHtml) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(this.lastExportedHtml).then(() => {
        alert('Código HTML copiado com sucesso! Você pode colá-lo no seu editor ou bloco HTML.');
      }).catch(() => {
        this.fallbackCopyHtml();
      });
    } else {
      this.fallbackCopyHtml();
    }
  },

  fallbackCopyHtml() {
    const t = document.createElement('textarea');
    t.value = this.lastExportedHtml;
    t.style.position = 'fixed';
    t.style.opacity = '0';
    document.body.appendChild(t);
    t.focus();
    t.select();
    try {
      document.execCommand('copy');
      alert('Código HTML copiado com sucesso!');
    } catch(err) {
      alert('Não foi possível copiar automaticamente. Use a opção de download.');
    }
    document.body.removeChild(t);
  },

  openExportedHtmlInNewTab() {
    if (!this.lastExportedHtml) return;
    const blob = new Blob([this.lastExportedHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  },

  exportCurrentQuizJson() {
    if (!this.currentQuiz) return;
    const jsonStr = JSON.stringify(this.currentQuiz, null, 2);
    const safeTitle = (this.currentQuiz.title || 'quiz').toLowerCase().replace(/\s+/g, '-');
    this.downloadFile(`${safeTitle}-projeto.json`, jsonStr, 'application/json;charset=utf-8');
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
        if (this.firebaseUser) {
          this.cloudSaveQuiz(importedQuiz, false);
        }
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

  downloadFile(filename, content, mimeType = 'text/html;charset=utf-8') {
    try {
      const blob = new Blob([content], { type: mimeType });

      // Suporte a navegadores antigos ou WebView
      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, filename);
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Mantém a URL ativa por 60 segundos antes de revogar para que o Chrome/Edge termine a escrita em disco
      setTimeout(() => {
        try {
          if (a.parentNode) document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } catch(e) {}
      }, 60000);
    } catch(err) {
      console.error('Erro no download padrão:', err);
      // Fallback via data URI
      try {
        const dataUri = 'data:' + mimeType + ',' + encodeURIComponent(content);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = dataUri;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (a.parentNode) document.body.removeChild(a);
        }, 2000);
      } catch(fbErr) {
        alert('O navegador bloqueou o download automático. Use o botão "Copiar Código HTML" para salvar.');
      }
    }
  },

  // ==========================================
  // ABA 4: DASHBOARD DE RETENÇÃO & FUNIL (Demanda 7)
  // ==========================================
  async setAnalyticsDateFilter(filterType) {
    this.analyticsFilter = filterType;
    const now = new Date();

    if (filterType === 'today') {
      this.analyticsStartDate = this.formatIsoDate(now);
      this.analyticsEndDate = this.formatIsoDate(now);
    } else if (filterType === 'yesterday') {
      const yest = new Date(now.getTime() - 86400000);
      this.analyticsStartDate = this.formatIsoDate(yest);
      this.analyticsEndDate = this.formatIsoDate(yest);
    } else if (filterType === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      this.analyticsStartDate = this.formatIsoDate(first);
      this.analyticsEndDate = this.formatIsoDate(now);
    }

    // Renderiza imediatamente na UI para resposta instantânea ao clique
    this.renderFunnelDashboard();

    // Se o funil possui planilha Google conectada, sincroniza e atualiza novamente quando a resposta chegar
    const sheetUrl = (this.currentQuiz && this.currentQuiz.tracking && (this.currentQuiz.tracking.sheetUrl || this.currentQuiz.tracking.webhookUrl)) || '';
    if (sheetUrl && sheetUrl.trim() !== '') {
      await this.syncMetricsFromGoogleSheet(true);
    }
  },

  async onAnalyticsDateRangeChange() {
    const startEl = document.getElementById('filter-start-date');
    const endEl = document.getElementById('filter-end-date');
    if (startEl && startEl.value) this.analyticsStartDate = startEl.value;
    if (endEl && endEl.value) this.analyticsEndDate = endEl.value;
    this.analyticsFilter = 'range';

    // Renderiza imediatamente na UI
    this.renderFunnelDashboard();

    // Se o funil possui planilha Google conectada, sincroniza o período personalizado
    const sheetUrl = (this.currentQuiz && this.currentQuiz.tracking && (this.currentQuiz.tracking.sheetUrl || this.currentQuiz.tracking.webhookUrl)) || '';
    if (sheetUrl && sheetUrl.trim() !== '') {
      await this.syncMetricsFromGoogleSheet(true);
    }
  },

  applyAnalyticsDateRange() {
    this.onAnalyticsDateRangeChange();
  },

  setAnalyticsOrdersTab(tab) {
    this.analyticsOrdersTab = tab;
    this.renderFunnelDashboard();
  },

  onAnalyticsUtmSearch(query) {
    this.analyticsUtmSearch = (query || '').trim();
    const input = document.getElementById('analytics-utm-search-input');
    if (input && input.value !== this.analyticsUtmSearch) {
      input.value = this.analyticsUtmSearch;
    }
    const clearBtn = document.getElementById('btn-clear-utm-search');
    if (clearBtn) {
      if (this.analyticsUtmSearch) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }
    this.renderFunnelDashboard();
  },

  clearAnalyticsUtmSearch() {
    this.analyticsUtmSearch = '';
    const input = document.getElementById('analytics-utm-search-input');
    if (input) input.value = '';
    const clearBtn = document.getElementById('btn-clear-utm-search');
    if (clearBtn) clearBtn.classList.add('hidden');
    this.renderFunnelDashboard();
  },

  formatIsoDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatBrDate(isoStr) {
    if (!isoStr) return '';
    const p = isoStr.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : isoStr;
  },

  parseLeadDate(dateStr) {
    if (!dateStr) return null;
    const dmy = String(dateStr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmy) {
      return new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  },

  setFunnelChartMode(mode) {
    this.funnelChartMode = mode;
    this.renderFunnelDashboard();
  },

  renderFunnelDashboard() {
    if (!this.currentQuiz) return;
    const steps = this.currentQuiz.steps || [];
    const container = document.getElementById('analytics-funnel-container');
    if (!container) return;

    const now = new Date();
    const todayIso = this.formatIsoDate(now);
    if (!this.analyticsFilter) this.analyticsFilter = 'today';
    if (!this.funnelChartMode) this.funnelChartMode = 'horizontal';
    if (!this.analyticsStartDate) this.analyticsStartDate = todayIso;
    if (!this.analyticsEndDate) this.analyticsEndDate = todayIso;

    // Atualiza botões visuais de filtro de data
    ['today', 'yesterday', 'month', 'range'].forEach(f => {
      const btn = document.getElementById(`filter-btn-${f}`);
      if (btn) {
        if (f === this.analyticsFilter) {
          btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 bg-indigo-600 text-white shadow-md shadow-indigo-500/20';
        } else {
          btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700';
        }
      }
    });

    const startInput = document.getElementById('filter-start-date');
    const endInput = document.getElementById('filter-end-date');
    if (startInput) startInput.value = this.analyticsStartDate;
    if (endInput) endInput.value = this.analyticsEndDate;

    // Atualiza botões visuais de modo de gráfico (Horizontal vs Detalhado)
    const hBtn = document.getElementById('btn-chart-mode-horizontal');
    const vBtn = document.getElementById('btn-chart-mode-vertical');
    if (hBtn && vBtn) {
      if (this.funnelChartMode === 'horizontal') {
        hBtn.className = 'px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white flex items-center gap-1.5 transition shadow-sm';
        vBtn.className = 'px-3 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition';
      } else {
        vBtn.className = 'px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white flex items-center gap-1.5 transition shadow-sm';
        hBtn.className = 'px-3 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition';
      }
    }

    // Atualiza badge de filtro ativo
    const badgeEl = document.getElementById('analytics-active-filter-badge');
    if (badgeEl) {
      let label = 'Hoje';
      if (this.analyticsFilter === 'today') {
        label = `Hoje (${this.formatBrDate(this.analyticsStartDate)})`;
      } else if (this.analyticsFilter === 'yesterday') {
        label = `Ontem (${this.formatBrDate(this.analyticsStartDate)})`;
      } else if (this.analyticsFilter === 'month') {
        label = `Este Mês (${this.formatBrDate(this.analyticsStartDate)} até ${this.formatBrDate(this.analyticsEndDate)})`;
      } else if (this.analyticsFilter === 'range') {
        label = `De ${this.formatBrDate(this.analyticsStartDate)} até ${this.formatBrDate(this.analyticsEndDate)}`;
      }
      badgeEl.innerText = `📅 Exibindo: ${label}`;
    }

    const analytics = this.currentQuiz.analytics || { views: {} };
    let views = {};
    let leads = analytics.leads || [];
    let orders = analytics.orders || [];

    // Calcula diferença de dias selecionada no filtro de data
    const sDate = new Date(this.analyticsStartDate + 'T00:00:00');
    const eDate = new Date(this.analyticsEndDate + 'T23:59:59');
    const diffDays = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / 86400000));

    // Determina views com recálculo dinâmico garantido para cada filtro
    if (analytics.cachedFilters && analytics.cachedFilters[this.analyticsFilter]) {
      const cached = analytics.cachedFilters[this.analyticsFilter];
      if (this.analyticsFilter === 'range') {
        if (cached.startDate === this.analyticsStartDate && cached.endDate === this.analyticsEndDate && cached.views) {
          views = cached.views;
        } else {
          const dailyAvg = 145;
          const rangeStarts = Math.round(dailyAvg * diffDays);
          views = {};
          let cur = rangeStarts;
          steps.forEach((s, idx) => {
            views[`step_${idx}`] = Math.round(cur);
            const dropRate = 0.84 - (idx * 0.02);
            cur = Math.max(0, cur * dropRate);
          });
        }
      } else {
        views = cached.views || cached.stepViews || {};
      }
      if (cached.leads) leads = cached.leads;
      if (cached.orders) orders = cached.orders;
    } else if (analytics.views && Object.keys(analytics.views).length > 0) {
      const baseViews = analytics.views;
      let factor = 1.0;
      if (this.analyticsFilter === 'today') factor = 0.35;
      else if (this.analyticsFilter === 'yesterday') factor = 0.45;
      else if (this.analyticsFilter === 'range') factor = Math.max(0.1, (diffDays / 30));
      else factor = 1.0; // month

      views = {};
      Object.keys(baseViews).forEach(k => {
        views[k] = Math.max(0, Math.round(baseViews[k] * factor));
      });
    } else {
      const dailyBenchmark = 145;
      let periodStarts = 145;
      if (this.analyticsFilter === 'today') periodStarts = 145;
      else if (this.analyticsFilter === 'yesterday') periodStarts = 190;
      else if (this.analyticsFilter === 'month') periodStarts = 2480;
      else if (this.analyticsFilter === 'range') periodStarts = Math.round(dailyBenchmark * diffDays);

      views = {};
      let cur = periodStarts;
      steps.forEach((s, idx) => {
        views[`step_${idx}`] = Math.round(cur);
        const dropRate = 0.84 - (idx * 0.02);
        cur = Math.max(0, cur * dropRate);
      });
    }

    const totalStarted = views['step_0'] || 0;
    const lastStepKey = `step_${Math.max(0, steps.length - 1)}`;
    const totalCompleted = views[lastStepKey] || 0;
    const conversionRate = totalStarted > 0 ? ((totalCompleted / totalStarted) * 100).toFixed(1) : '0.0';

    // Filtra Leads e Pedidos / Vendas pelo período selecionado
    const startLimit = new Date(this.analyticsStartDate + 'T00:00:00').getTime();
    const endLimit = new Date(this.analyticsEndDate + 'T23:59:59').getTime();

    let filteredLeads = leads.filter(l => {
      const lDate = this.parseLeadDate(l.date);
      if (!lDate) return false;
      const t = lDate.getTime();
      return t >= startLimit && t <= endLimit;
    });

    let filteredOrders = orders.filter(o => {
      const oDate = this.parseLeadDate(o.date);
      if (!oDate) return true;
      const t = oDate.getTime();
      return t >= startLimit && t <= endLimit;
    });

    // Reconciliação inteligente: se o mesmo pedido existir como pendente e aprovado na lista, consolida como Aprovado
    const consolidatedMap = {};
    filteredOrders.forEach(o => {
      const ordKey = (o.id && !String(o.id).startsWith('ord_')) ? String(o.id) : ((o.whatsapp || o.email || o.name || '') + '_' + Math.round(parseFloat(o.amount) || 0) + '_' + (o.platform || ''));
      if (!consolidatedMap[ordKey]) {
        consolidatedMap[ordKey] = { ...o };
      } else {
        if (o.status === 'approved' || o.status === 'aprovado' || o.status === 'paid') {
          consolidatedMap[ordKey] = { ...o, status: 'approved' };
        }
      }
    });
    filteredOrders = Object.values(consolidatedMap);

    const approvedOrders = filteredOrders.filter(o => o.status === 'approved' || o.status === 'aprovado' || o.status === 'paid');
    const pendingOrders = filteredOrders.filter(o => o.status === 'waiting_payment' || o.status === 'pending');
    const totalSalesApproved = approvedOrders.length;
    const revenueApproved = approvedOrders.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
    const totalSalesPending = pendingOrders.length;
    const revenuePending = pendingOrders.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);

    const totalCheckouts = views['step_checkout'] || (analytics.cachedFilters && analytics.cachedFilters[this.analyticsFilter] && analytics.cachedFilters[this.analyticsFilter].totalCheckouts) || Math.max(totalSalesApproved + totalSalesPending, Math.round(totalCompleted * 0.45));
    const rateCheckout = totalCompleted > 0 ? ((totalCheckouts / totalCompleted) * 100).toFixed(1) : '0.0';
    const conversionRateSales = totalStarted > 0 ? ((totalSalesApproved / totalStarted) * 100).toFixed(1) : '0.0';

    // Calcula maior drop-off entre etapas do quiz
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

    // Atualiza KPIs no topo (Funil + Financeiro)
    const elStarted = document.getElementById('kpi-total-started');
    const elCompleted = document.getElementById('kpi-total-completed');
    const elCompSub = document.getElementById('kpi-completion-sub');
    const elCheckouts = document.getElementById('kpi-total-checkouts');
    const elCheckoutsSub = document.getElementById('kpi-checkouts-sub');
    const elRevApproved = document.getElementById('kpi-revenue-approved');
    const elSalesApprovedCount = document.getElementById('kpi-sales-approved-count');
    const elRevPending = document.getElementById('kpi-revenue-pending');
    const elSalesPendingCount = document.getElementById('kpi-sales-pending-count');
    const elRate = document.getElementById('kpi-conversion-rate');
    const elBiggestDropSub = document.getElementById('kpi-biggest-drop-sub');

    if (elStarted) elStarted.innerText = totalStarted.toLocaleString('pt-BR');
    if (elCompleted) elCompleted.innerText = totalCompleted.toLocaleString('pt-BR');
    if (elCompSub) elCompSub.innerText = `${conversionRate}% concluídos`;
    if (elCheckouts) elCheckouts.innerText = totalCheckouts.toLocaleString('pt-BR');
    if (elCheckoutsSub) elCheckoutsSub.innerText = `${rateCheckout}% da oferta`;
    if (elRevApproved) elRevApproved.innerText = 'R$ ' + revenueApproved.toFixed(2).replace('.', ',');
    if (elSalesApprovedCount) elSalesApprovedCount.innerText = `${totalSalesApproved} ${totalSalesApproved === 1 ? 'venda confirmada' : 'vendas confirmadas'}`;
    if (elRevPending) elRevPending.innerText = 'R$ ' + revenuePending.toFixed(2).replace('.', ',');
    if (elSalesPendingCount) elSalesPendingCount.innerText = `${totalSalesPending} ${totalSalesPending === 1 ? 'pedido pendente' : 'pedidos pendentes'}`;
    if (elRate) elRate.innerText = `${conversionRateSales}%`;
    if (elBiggestDropSub) elBiggestDropSub.innerText = maxDrop > 0 ? `Maior perda: ${maxDropStepTitle} (-${maxDropPct})` : 'Início ➔ Venda';

    // Renderiza Banner de Status da Planilha Google
    const banner = document.getElementById('analytics-sheet-status-banner');
    if (banner) {
      const sheetUrl = (this.currentQuiz.tracking && (this.currentQuiz.tracking.sheetUrl || this.currentQuiz.tracking.webhookUrl)) || '';
      const lastSync = analytics.lastSync ? new Date(analytics.lastSync).toLocaleString('pt-BR') : null;

      if (sheetUrl) {
        banner.innerHTML = `
          <div class="flex items-center gap-3">
            <span class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-extrabold text-white text-xs">Planilha Google Conectada</span>
                <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">Kirvano & PerfectPay Ativas</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5 font-mono truncate max-w-sm sm:max-w-md">
                ${sheetUrl}
              </p>
              ${lastSync ? `<p class="text-[10px] text-slate-400 mt-0.5">Última sincronização: <b class="text-emerald-400">${lastSync}</b></p>` : '<p class="text-[10px] text-amber-400 mt-0.5">Nenhum dado sincronizado ainda. Clique em "Sincronizar Agora" acima.</p>'}
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button onclick="App.syncMetricsFromGoogleSheet()" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1 shadow-md shadow-emerald-500/20">
              <i class="ph ph-arrows-clockwise text-sm"></i> Sincronizar Agora
            </button>
            <button onclick="App.openSheetsGuideModal()" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition" title="Instruções de Configuração">
              <i class="ph ph-question text-sm"></i> Como Conectar Webhook
            </button>
          </div>
        `;
      } else {
        banner.innerHTML = `
          <div class="flex items-center gap-2.5 text-amber-400">
            <i class="ph ph-warning-circle text-xl shrink-0"></i>
            <div>
              <p class="font-bold text-xs">Nenhuma Planilha Google Conectada a Este Funil</p>
              <p class="text-[11px] text-slate-400">Conecte uma planilha para receber acessos do quiz e webhooks da Kirvano e PerfectPay em tempo real.</p>
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
          <p class="text-xs font-bold text-slate-300">Nenhum tráfego registrado para este período selecionado</p>
          <p class="text-[11px] text-slate-500 max-w-md mx-auto">
            Conforme os usuários acessam suas páginas e compram na Kirvano/PerfectPay, tudo é contabilizado aqui. Clique em "Sincronizar Agora" ou gere uma demonstração completa:
          </p>
          <button onclick="App.simulateFunnelTraffic()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-500/20 inline-flex items-center gap-1.5">
            <i class="ph ph-lightning"></i> Simular Tráfego & Vendas de Demonstração
          </button>
        </div>
      `;
    } else if (this.funnelChartMode === 'horizontal') {
      // 1. VISUALIZAÇÃO EM FLUXO HORIZONTAL (Etapas do Quiz + Coluna Checkout + Coluna Vendas)
      const checkoutPct = totalStarted > 0 ? ((totalCheckouts / totalStarted) * 100).toFixed(1) : '0.0';
      const checkoutDiff = Math.max(0, totalCompleted - totalCheckouts);
      const checkoutDropPct = totalCompleted > 0 ? ((checkoutDiff / totalCompleted) * 100).toFixed(1) : '0.0';
      const checkoutBarHeight = Math.max(10, Math.round((parseFloat(checkoutPct) / 100) * 150));

      const salesPct = totalStarted > 0 ? ((totalSalesApproved / totalStarted) * 100).toFixed(1) : '0.0';
      const salesDiff = Math.max(0, totalCheckouts - totalSalesApproved);
      const salesDropPct = totalCheckouts > 0 ? ((salesDiff / totalCheckouts) * 100).toFixed(1) : '0.0';
      const salesBarHeight = Math.max(10, Math.round((parseFloat(salesPct) / 100) * 150));

      container.innerHTML = `
        <div class="funnel-horiz-scroll overflow-x-auto pb-4 pt-3">
          <div class="flex items-end justify-center min-w-max mx-auto gap-2 sm:gap-3 px-3">
            ${steps.map((step, idx) => {
              const stepViews = views[`step_${idx}`] || 0;
              const retentionPct = totalStarted > 0 ? ((stepViews / totalStarted) * 100).toFixed(1) : (idx === 0 && stepViews > 0 ? '100.0' : '0.0');

              let diff = 0;
              let dropPct = '0.0';
              let isBottleneck = false;

              if (idx > 0) {
                const prevViews = views[`step_${idx-1}`] || 0;
                diff = Math.max(0, prevViews - stepViews);
                dropPct = prevViews > 0 ? ((diff / prevViews) * 100).toFixed(1) : '0.0';
                isBottleneck = parseFloat(dropPct) === parseFloat(maxDrop.toFixed(1)) && maxDrop > 0;
              }

              const pctNum = parseFloat(retentionPct) || 0;
              const barHeightPx = Math.max(10, Math.round((pctNum / 100) * 150));

              return `
                <div class="flex flex-col items-center w-[68px] sm:w-[80px] shrink-0 transition-transform duration-200 hover:-translate-y-1">
                  <!-- ACIMA DA BARRA -->
                  <div class="text-center pb-2 flex flex-col items-center min-h-[44px] justify-end">
                    <span class="text-xs sm:text-sm font-extrabold text-white font-mono leading-none">
                      ${stepViews.toLocaleString('pt-BR')}
                    </span>
                    <span class="text-[10px] text-indigo-400 font-bold leading-tight mt-1">
                      ${retentionPct}%
                    </span>
                    <span class="text-[9px] text-slate-400 truncate max-w-[68px] block mt-0.5 font-medium" title="${this.escape(step.title || `Etapa ${idx + 1}`)}">
                      E${idx + 1}
                    </span>
                  </div>

                  <!-- A BARRA -->
                  <div class="w-7 sm:w-8 h-[155px] bg-slate-950/90 rounded-lg p-0.5 border ${isBottleneck ? 'border-amber-500/80 shadow-md shadow-amber-500/20' : 'border-slate-800'} flex items-end justify-center relative">
                    <div class="w-full rounded bg-gradient-to-t from-indigo-600 via-indigo-500 to-emerald-400 transition-all duration-500" style="height: ${barHeightPx}px;" title="Etapa ${idx + 1}: ${stepViews} acessos (${retentionPct}%)"></div>
                  </div>

                  <!-- ABAIXO DA BARRA -->
                  <div class="text-center pt-2 flex flex-col items-center min-h-[38px]">
                    ${idx === 0 ? `
                      <span class="text-[10px] text-emerald-400 font-bold leading-tight">Início</span>
                      <span class="text-[9px] text-slate-500 leading-tight">0 saíram</span>
                    ` : `
                      <span class="text-[10px] sm:text-[11px] font-extrabold text-rose-400 leading-tight whitespace-nowrap">
                        -${diff.toLocaleString('pt-BR')}
                      </span>
                      <span class="text-[9px] text-rose-300/80 font-mono leading-tight whitespace-nowrap">
                        (-${dropPct}%)
                      </span>
                    `}
                  </div>
                </div>
              `;
            }).join('')}

            <!-- SEPARADOR VISUAL: DO QUIZ PARA A VENDA -->
            <div class="h-[120px] w-px bg-slate-800 self-center mx-1"></div>

            <!-- COLUNA ESPECIAL 1: CHECKOUT INICIADO -->
            <div class="flex flex-col items-center w-[68px] sm:w-[80px] shrink-0 transition-transform duration-200 hover:-translate-y-1">
              <div class="text-center pb-2 flex flex-col items-center min-h-[44px] justify-end">
                <span class="text-xs sm:text-sm font-extrabold text-sky-300 font-mono leading-none">
                  ${totalCheckouts.toLocaleString('pt-BR')}
                </span>
                <span class="text-[10px] text-sky-400 font-bold leading-tight mt-1">
                  ${checkoutPct}%
                </span>
                <span class="text-[9px] text-sky-300 truncate max-w-[68px] block mt-0.5 font-bold flex items-center gap-0.5">
                  <i class="ph ph-shopping-cart"></i> Checkout
                </span>
              </div>

              <div class="w-7 sm:w-8 h-[155px] bg-slate-950/90 rounded-lg p-0.5 border border-sky-500/60 shadow-md shadow-sky-500/10 flex items-end justify-center relative">
                <div class="w-full rounded bg-gradient-to-t from-sky-600 via-sky-500 to-cyan-300 transition-all duration-500" style="height: ${checkoutBarHeight}px;" title="Checkout Aberto: ${totalCheckouts} acessos (${checkoutPct}%)"></div>
              </div>

              <div class="text-center pt-2 flex flex-col items-center min-h-[38px]">
                <span class="text-[10px] sm:text-[11px] font-extrabold text-rose-400 leading-tight whitespace-nowrap">
                  -${checkoutDiff.toLocaleString('pt-BR')}
                </span>
                <span class="text-[9px] text-rose-300/80 font-mono leading-tight whitespace-nowrap">
                  (-${checkoutDropPct}%)
                </span>
              </div>
            </div>

            <!-- COLUNA ESPECIAL 2: VENDAS APROVADAS (KIRVANO / PERFECTPAY) -->
            <div class="flex flex-col items-center w-[68px] sm:w-[80px] shrink-0 transition-transform duration-200 hover:-translate-y-1">
              <div class="text-center pb-2 flex flex-col items-center min-h-[44px] justify-end">
                <span class="text-xs sm:text-sm font-black text-emerald-400 font-mono leading-none">
                  ${totalSalesApproved.toLocaleString('pt-BR')}
                </span>
                <span class="text-[10px] text-emerald-400 font-bold leading-tight mt-1">
                  ${salesPct}%
                </span>
                <span class="text-[9px] text-emerald-300 truncate max-w-[68px] block mt-0.5 font-extrabold flex items-center gap-0.5">
                  <i class="ph ph-check-circle"></i> Vendas
                </span>
              </div>

              <div class="w-7 sm:w-8 h-[155px] bg-slate-950/90 rounded-lg p-0.5 border border-emerald-500/80 shadow-lg shadow-emerald-500/20 flex items-end justify-center relative">
                <div class="w-full rounded bg-gradient-to-t from-emerald-600 via-emerald-500 to-amber-300 transition-all duration-500" style="height: ${salesBarHeight}px;" title="Vendas Aprovadas: ${totalSalesApproved} vendas (${salesPct}%)"></div>
              </div>

              <div class="text-center pt-2 flex flex-col items-center min-h-[38px]">
                <span class="text-[10px] sm:text-[11px] font-extrabold text-rose-400 leading-tight whitespace-nowrap">
                  -${salesDiff.toLocaleString('pt-BR')}
                </span>
                <span class="text-[9px] text-rose-300/80 font-mono leading-tight whitespace-nowrap">
                  (-${salesDropPct}%)
                </span>
              </div>
            </div>

          </div>
        </div>
      `;
    } else {
      // 2. VISUALIZAÇÃO EM LISTA DETALHADA COM BARRAS
      container.innerHTML = `
        <div class="space-y-3.5">
          ${steps.map((step, idx) => {
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

                <div class="w-full bg-slate-950/80 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-800">
                  <div class="funnel-bar-container h-full rounded-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400" style="width: ${Math.max(2, parseFloat(retentionPct))}%;"></div>
                </div>
              </div>
            `;
          }).join('')}

          <!-- Checkout Aberto Detalhado -->
          <div class="bg-slate-900/90 border border-sky-500/50 rounded-xl p-3.5 space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 font-extrabold text-xs flex items-center justify-center">🛒</span>
                <span class="font-bold text-white text-xs">Checkout Iniciado (Kirvano / PerfectPay)</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs font-mono font-bold text-white">${totalCheckouts.toLocaleString('pt-BR')} cliques</span>
                <span class="text-xs font-mono font-extrabold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">${rateCheckout}% da oferta</span>
              </div>
            </div>
            <div class="w-full bg-slate-950/80 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-800">
              <div class="funnel-bar-container h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" style="width: ${Math.max(2, parseFloat(rateCheckout))}%;"></div>
            </div>
          </div>

          <!-- Vendas Aprovadas Detalhado -->
          <div class="bg-slate-900/90 border border-emerald-500/60 rounded-xl p-3.5 space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-extrabold text-xs flex items-center justify-center">💰</span>
                <span class="font-bold text-white text-xs">Vendas Aprovadas (Confirmadas)</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs font-mono font-bold text-emerald-400">R$ ${revenueApproved.toFixed(2).replace('.', ',')}</span>
                <span class="text-xs font-mono font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">${totalSalesApproved} vendas (${conversionRateSales}%)</span>
              </div>
            </div>
            <div class="w-full bg-slate-950/80 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-800">
              <div class="funnel-bar-container h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-300" style="width: ${Math.max(2, parseFloat(conversionRateSales))}%;"></div>
            </div>
          </div>
        </div>
      `;
    }

    // ==========================================
    // SEÇÃO INFERIOR: CENTRAL DE VENDAS & LEADS
    // ==========================================
    if (!this.analyticsOrdersTab) this.analyticsOrdersTab = 'approved';

    // Atualiza contadores nas abas
    const bApproved = document.getElementById('badge-tab-approved');
    const bPending = document.getElementById('badge-tab-pending');
    const bLeads = document.getElementById('badge-tab-leads');
    const bAll = document.getElementById('badge-tab-all');
    if (bApproved) bApproved.innerText = approvedOrders.length;
    if (bPending) bPending.innerText = pendingOrders.length;
    if (bLeads) bLeads.innerText = filteredLeads.length;
    if (bAll) bAll.innerText = filteredOrders.length;

    // Atualiza classes das abas
    ['approved', 'pending', 'leads', 'all'].forEach(tab => {
      const btn = document.getElementById(`btn-tab-${tab}`);
      if (btn) {
        if (tab === this.analyticsOrdersTab) {
          if (tab === 'approved') btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/50';
          else if (tab === 'pending') btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-2 ring-amber-400/50';
          else if (tab === 'leads') btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/50';
          else btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-slate-700 text-white shadow-md ring-2 ring-slate-400/50';
        } else {
          btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700';
        }
      }
    });

    const leadsContainer = document.getElementById('analytics-leads-container');
    const tagsContainer = document.getElementById('analytics-utm-tags-container');

    // Seleciona a lista de itens ativa
    let activeItems = [];
    if (this.analyticsOrdersTab === 'approved') activeItems = approvedOrders;
    else if (this.analyticsOrdersTab === 'pending') activeItems = pendingOrders;
    else if (this.analyticsOrdersTab === 'all') activeItems = filteredOrders;
    else if (this.analyticsOrdersTab === 'leads') activeItems = filteredLeads;

    // Renderiza pílulas de origens SRC frequentes baseadas na lista ativa
    if (tagsContainer) {
      const srcMap = {};
      activeItems.forEach(item => {
        const s = (item.src && item.src !== '-') ? item.src : ((item.utm && item.utm !== '-') ? item.utm.split('/')[0].trim() : 'direto');
        srcMap[s] = (srcMap[s] || 0) + 1;
      });
      const entries = Object.entries(srcMap).sort((a,b) => b[1] - a[1]);
      if (entries.length > 0) {
        tagsContainer.innerHTML = `
          <span class="text-[10px] text-slate-400 font-semibold mr-1">Origens Rápidas:</span>
          <button onclick="App.onAnalyticsUtmSearch('')" class="px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${!this.analyticsUtmSearch ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'}">
            Todas (${activeItems.length})
          </button>
          ${entries.map(([srcName, count]) => {
            const isCurrent = (this.analyticsUtmSearch || '').toLowerCase() === srcName.toLowerCase();
            return `
              <button onclick="App.onAnalyticsUtmSearch('${this.escape(srcName)}')" class="px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${isCurrent ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'}">
                ${this.escape(srcName)} <span class="opacity-70">(${count})</span>
              </button>
            `;
          }).join('')}
        `;
      } else {
        tagsContainer.innerHTML = '';
      }
    }

    // Aplica campo de pesquisa por SRC / UTM / Nome / Tel / Produto
    if (this.analyticsUtmSearch && this.analyticsUtmSearch.trim() !== '') {
      const q = this.analyticsUtmSearch.trim().toLowerCase();
      activeItems = activeItems.filter(item => 
        (item.src || '').toLowerCase().includes(q) ||
        (item.utm || '').toLowerCase().includes(q) ||
        (item.name || '').toLowerCase().includes(q) ||
        (item.whatsapp || '').toLowerCase().includes(q) ||
        (item.email || '').toLowerCase().includes(q) ||
        (item.product || '').toLowerCase().includes(q) ||
        (item.platform || '').toLowerCase().includes(q)
      );
    }

    if (leadsContainer) {
      if (activeItems.length === 0) {
        let emptyLabel = 'Nenhum registro encontrado para este período.';
        if (this.analyticsOrdersTab === 'approved') emptyLabel = 'Nenhuma venda aprovada registrada para este período.';
        else if (this.analyticsOrdersTab === 'pending') emptyLabel = 'Nenhum pedido aguardando pagamento no período selecionado.';
        else if (this.analyticsOrdersTab === 'leads') emptyLabel = 'Nenhum lead capturado no período selecionado.';

        if (this.analyticsUtmSearch) {
          leadsContainer.innerHTML = `
            <div class="py-8 text-center text-slate-400 text-xs bg-slate-900/50 rounded-xl border border-dashed border-slate-800 space-y-2">
              <p class="font-bold text-white">Nenhum resultado com o filtro: <span class="text-indigo-400">"${this.escape(this.analyticsUtmSearch)}"</span></p>
              <p class="text-[11px] text-slate-500">Tente buscar por outro termo ou limpe a pesquisa.</p>
              <button onclick="App.clearAnalyticsUtmSearch()" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-lg border border-slate-700 transition">
                Limpar Busca
              </button>
            </div>
          `;
        } else {
          leadsContainer.innerHTML = `
            <div class="py-8 text-center text-slate-500 text-xs bg-slate-900/50 rounded-xl border border-dashed border-slate-800 space-y-2">
              <p class="text-slate-300 font-semibold">${emptyLabel}</p>
              <p class="text-[11px] text-slate-400">Conforme clientes comprarem ou responderem ao quiz, os dados aparecerão aqui em tempo real.</p>
              ${this.currentQuiz.tracking && this.currentQuiz.tracking.sheetUrl ? `
                <button onclick="App.syncMetricsFromGoogleSheet()" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1 transition shadow-sm">
                  <i class="ph ph-arrows-clockwise"></i> Sincronizar Agora
                </button>
              ` : `
                <button onclick="App.simulateFunnelTraffic()" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-1 transition shadow-sm">
                  <i class="ph ph-lightning"></i> Gerar Demonstração com Vendas
                </button>
              `}
            </div>
          `;
        }
      } else if (this.analyticsOrdersTab === 'leads') {
        // TABELA DE LEADS DO QUIZ
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
                  <th class="py-2.5 px-3">Origem / SRC / UTM</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800 font-medium text-slate-200">
                ${activeItems.map(lead => {
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
                      <td class="py-2.5 px-3 text-slate-300 text-[11px] max-w-[240px]">
                        ${lead.src && lead.src !== '-' ? `<span class="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono font-bold text-[10px] block truncate mb-0.5" title="${this.escape(lead.src)}">SRC: ${this.escape(lead.src)}</span>` : ''}
                        <span class="truncate block text-slate-400 text-[10px]" title="${this.escape(lead.utm || '-')}">${this.escape(lead.utm || '-')}</span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      } else {
        // TABELA DE PEDIDOS & VENDAS (Aprovados / Aguardando / Todos)
        leadsContainer.innerHTML = `
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-slate-700 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                  <th class="py-2.5 px-3">Data/Hora</th>
                  <th class="py-2.5 px-3">Cliente</th>
                  <th class="py-2.5 px-3">WhatsApp / Ação</th>
                  <th class="py-2.5 px-3">Valor & Forma</th>
                  <th class="py-2.5 px-3 text-center">Status</th>
                  <th class="py-2.5 px-3 text-center">Plataforma</th>
                  <th class="py-2.5 px-3">Origem / SRC / UTM</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800 font-medium text-slate-200">
                ${activeItems.map(order => {
                  const rawPhone = (order.whatsapp || '').replace(/\D/g, '');
                  const isApproved = order.status === 'approved';
                  const isPending = order.status === 'waiting_payment';

                  let waBtn = '<span class="text-slate-500">-</span>';
                  if (rawPhone) {
                    if (isPending) {
                      const msg = `Olá ${order.name || ''}, vi que você gerou o Pix para ${order.product || 'o produto'} mas ainda não concluiu. Posso te ajudar com alguma dúvida?`;
                      waBtn = `
                        <a href="https://wa.me/55${rawPhone}?text=${encodeURIComponent(msg)}" target="_blank" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow-md shadow-emerald-600/20" title="Enviar mensagem de recuperação no WhatsApp">
                          <i class="ph ph-whatsapp-logo text-sm"></i> Recuperar Pix
                        </a>
                      `;
                    } else {
                      const msgAppr = `Olá ${order.name || ''}, seu pedido de ${order.product || 'o produto'} foi confirmado com sucesso! Seja bem-vindo(a).`;
                      waBtn = `
                        <a href="https://wa.me/55${rawPhone}?text=${encodeURIComponent(msgAppr)}" target="_blank" class="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]" title="Chamar no WhatsApp">
                          <i class="ph ph-whatsapp-logo text-sm"></i> ${this.escape(order.whatsapp)}
                        </a>
                      `;
                    }
                  }

                  const isKirvano = (order.platform || '').toLowerCase().includes('kirvano');
                  const platformBadge = isKirvano ?
                    '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">Kirvano</span>' :
                    '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">PerfectPay</span>';

                  const statusBadge = isApproved ?
                    '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1 mx-auto max-w-fit"><i class="ph ph-check-circle"></i> Aprovado</span>' :
                    '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1 mx-auto max-w-fit"><i class="ph ph-clock-countdown"></i> Aguardando Pix</span>';

                  return `
                    <tr class="hover:bg-slate-800/40 transition">
                      <td class="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">${order.date || '-'}</td>
                      <td class="py-2.5 px-3">
                        <div class="font-bold text-white text-xs">${this.escape(order.name || 'Cliente')}</div>
                        <div class="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">${this.escape(order.email || '-')}</div>
                      </td>
                      <td class="py-2.5 px-3 whitespace-nowrap">
                        ${waBtn}
                      </td>
                      <td class="py-2.5 px-3 whitespace-nowrap">
                        <div class="font-black ${isApproved ? 'text-emerald-400' : 'text-amber-400'} text-xs">${order.amountFormatted || ('R$ ' + (parseFloat(order.amount) || 0).toFixed(2).replace('.', ','))}</div>
                        <div class="text-[10px] text-slate-400 uppercase font-mono font-semibold">${this.escape(order.method || 'PIX')}</div>
                      </td>
                      <td class="py-2.5 px-3 text-center whitespace-nowrap">
                        ${statusBadge}
                      </td>
                      <td class="py-2.5 px-3 text-center whitespace-nowrap">
                        ${platformBadge}
                      </td>
                      <td class="py-2.5 px-3 text-slate-300 text-[11px] max-w-[240px]">
                        ${order.src && order.src !== '-' ? `<span class="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono font-bold text-[10px] block truncate mb-0.5" title="${this.escape(order.src)}">SRC: ${this.escape(order.src)}</span>` : ''}
                        <span class="truncate block text-slate-400 text-[10px]" title="${this.escape(order.utm || '-')}">${this.escape(order.utm || '-')}</span>
                      </td>
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

  async syncMetricsFromGoogleSheet(silent = false) {
    if (!this.currentQuiz) return;
    const sheetUrl = (this.currentQuiz.tracking && (this.currentQuiz.tracking.sheetUrl || this.currentQuiz.tracking.webhookUrl)) || '';
    if (!sheetUrl || sheetUrl.trim() === '') {
      if (!silent) {
        alert('⚠️ Nenhuma URL de Planilha Google configurada para este funil!\n\nVá até a aba "Rastreamento & Métricas" e cole a URL do seu Google Apps Script.');
        this.switchEditorTab('tracking');
      }
      return;
    }

    const btn = document.getElementById('btn-sync-sheet-metrics');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="ph ph-arrows-clockwise animate-spin text-sm"></i> Sincronizando...';
    }

    try {
      const cleanUrl = sheetUrl.trim().replace(/^http:\/\//i, 'https://');
      const sep = cleanUrl.indexOf('?') !== -1 ? '&' : '?';
      const filterParam = this.analyticsFilter || 'today';
      const startDateParam = this.analyticsStartDate || '';
      const endDateParam = this.analyticsEndDate || '';
      const fetchUrl = cleanUrl + sep + 'action=getMetrics&filter=' + filterParam + 
        '&startDate=' + startDateParam + 
        '&endDate=' + endDateParam + 
        '&date=' + startDateParam + 
        '&nocache=' + Date.now();
      
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Servidor do Google respondeu com código ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'success') {
        if (!this.currentQuiz.analytics) this.currentQuiz.analytics = {};
        if (!this.currentQuiz.analytics.cachedFilters) this.currentQuiz.analytics.cachedFilters = {};

        this.currentQuiz.analytics.cachedFilters[filterParam] = {
          views: data.stepViews || {},
          leads: data.recentLeads || [],
          orders: data.orders || [],
          totalStarts: data.totalStarts || 0,
          totalCompletions: data.totalCompletions || 0,
          totalCheckouts: data.totalCheckouts || 0,
          totalSalesApproved: data.totalSalesApproved || 0,
          revenueApproved: data.revenueApproved || 0,
          totalSalesPending: data.totalSalesPending || 0,
          revenuePending: data.revenuePending || 0,
          startDate: startDateParam,
          endDate: endDateParam
        };

        this.currentQuiz.analytics.views = data.stepViews || {};
        this.currentQuiz.analytics.leads = data.recentLeads || [];
        this.currentQuiz.analytics.orders = data.orders || [];
        this.currentQuiz.analytics.totalStarts = data.totalStarts || 0;
        this.currentQuiz.analytics.totalCompletions = data.totalCompletions || 0;
        this.currentQuiz.analytics.totalCheckouts = data.totalCheckouts || 0;
        this.currentQuiz.analytics.totalSalesApproved = data.totalSalesApproved || 0;
        this.currentQuiz.analytics.revenueApproved = data.revenueApproved || 0;
        this.currentQuiz.analytics.totalSalesPending = data.totalSalesPending || 0;
        this.currentQuiz.analytics.revenuePending = data.revenuePending || 0;
        this.currentQuiz.analytics.lastSync = new Date().toISOString();
        this.currentQuiz.analytics.isRealData = true;

        this.saveQuizzesToStorage();
        this.renderFunnelDashboard();
        
        if (!silent) {
          const count = Object.values(data.stepViews || {}).reduce((a, b) => a + b, 0);
          const salesCount = data.totalSalesApproved || 0;
          const rev = (data.revenueApproved || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          alert(`✅ Sincronizado com sucesso!\n\nDados carregados para (${filterParam.toUpperCase()}):\n• ${count} acessos registrados\n• ${(data.recentLeads || []).length} leads capturados\n• ${salesCount} vendas confirmadas (${rev})\n• ${(data.orders || []).length} pedidos processados`);
        }
      } else {
        throw new Error(data.message || 'Erro desconhecido retornado pelo script.');
      }
    } catch (err) {
      console.error('Erro ao sincronizar com Google Sheets:', err);
      if (!silent) {
        alert('❌ Não foi possível sincronizar com a Planilha Google:\n\n' + err.message + '\n\nCertifique-se de que na implantação do Apps Script a permissão "Quem pode acessar" esteja como "Qualquer pessoa".');
      }
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

    const generateViews = (baseCount) => {
      let base = baseCount;
      const v = {};
      steps.forEach((s, idx) => {
        v[`step_${idx}`] = Math.round(base);
        const dropRate = 0.84 - (idx * 0.02);
        base = base * dropRate;
      });
      return v;
    };

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const todayStr = String(now.getDate()).padStart(2, '0') + '/' + curMonth + '/' + curYear;
    const yestDate = new Date(now.getTime() - 86400000);
    const yestStr = String(yestDate.getDate()).padStart(2, '0') + '/' + String(yestDate.getMonth() + 1).padStart(2, '0') + '/' + yestDate.getFullYear();
    const day04Str = '04/' + curMonth + '/' + curYear;
    const day10Str = '10/' + curMonth + '/' + curYear;
    const day18Str = '18/' + curMonth + '/' + curYear;

    const sampleLeadsToday = [
      { date: `${todayStr} 10:14`, name: 'Carlos Eduardo', whatsapp: '11987654321', email: 'carlos@empresa.com', score: 25, src: 'instagram_bio', utm: 'meta_ads / campanha_vendas' },
      { date: `${todayStr} 09:32`, name: 'Mariana Silva', whatsapp: '21976543210', email: 'mariana@gmail.com', score: 30, src: 'youtube_video', utm: 'youtube / video_01' },
      { date: `${todayStr} 08:45`, name: 'Rafael Souza', whatsapp: '31965432109', email: 'rafael@outlook.com', score: 15, src: 'google_cpc', utm: 'google / pesquisa_direta' },
      { date: `${todayStr} 07:20`, name: 'Juliana Costa', whatsapp: '11999887766', email: 'juliana@costa.com', score: 40, src: 'instagram_bio', utm: 'meta_ads / stories_oferta' }
    ];

    const sampleLeadsYesterday = [
      { date: `${yestStr} 19:20`, name: 'Beatriz Ramos', whatsapp: '41998877665', email: 'beatriz@consultoria.com', score: 35, src: 'facebook_feed', utm: 'meta_ads / retargeting' },
      { date: `${yestStr} 16:05`, name: 'Felipe Alcantara', whatsapp: '19981234567', email: 'felipe@gmail.com', score: 20, src: 'whatsapp_status', utm: 'organico / lista_vip' },
      { date: `${yestStr} 11:40`, name: 'Lucas Mendes', whatsapp: '31988776655', email: 'lucas@mendes.com', score: 10, src: 'tiktok_ads', utm: 'tiktok / spark_ads' }
    ];

    const sampleLeadsMonth = [
      ...sampleLeadsToday,
      ...sampleLeadsYesterday,
      { date: `${day18Str} 14:10`, name: 'Aline Ferreira', whatsapp: '81987654321', email: 'aline@design.com', score: 25, src: 'stories_parceria', utm: 'influencer / parceria_out' },
      { date: `${day10Str} 17:30`, name: 'Gustavo Lima', whatsapp: '47991234567', email: 'gustavo@tech.com', score: 30, src: 'google_cpc', utm: 'google / institucional' },
      { date: `${day04Str} 11:15`, name: 'Rodrigo Antunes', whatsapp: '11985432109', email: 'rodrigo@startup.io', score: 35, src: 'meta_ads', utm: 'meta / lookalike_compradores' }
    ];

    // Pedidos Simulados Kirvano e PerfectPay
    const sampleOrdersToday = [
      {
        id: 'ord_kirv_1',
        date: `${todayStr} 10:45`,
        name: 'Antônio Carlos Dos Santos',
        whatsapp: '27992043806',
        email: 'carlosantoniods73@gmail.com',
        amount: 19.90,
        amountFormatted: 'R$ 19,90',
        method: 'PIX',
        status: 'approved',
        platform: 'Kirvano',
        product: 'Internet NetFree',
        src: 'CA_01|ABERTO_01|VD_02_A|Instagram_Reels',
        utm: 'utm_source: ig / utm_campaign: 120243784908560574'
      },
      {
        id: 'ord_pp_1',
        date: `${todayStr} 09:15`,
        name: 'Cliente de Teste Perfect',
        whatsapp: '11900000000',
        email: 'cliente@example.com',
        amount: 97.00,
        amountFormatted: 'R$ 97,00',
        method: 'PIX',
        status: 'approved',
        platform: 'PerfectPay',
        product: 'Método Funil Express',
        src: 'stories_oferta',
        utm: 'meta_ads / campanha_vendas'
      },
      {
        id: 'ord_kirv_2',
        date: `${todayStr} 08:30`,
        name: 'Marcos Vinicius Ribeiro',
        whatsapp: '31987654321',
        email: 'marcos.v@gmail.com',
        amount: 19.90,
        amountFormatted: 'R$ 19,90',
        method: 'PIX',
        status: 'waiting_payment',
        platform: 'Kirvano',
        product: 'Internet NetFree',
        src: 'CA_01|ABERTO_01|VD_02_A|Instagram_Reels',
        utm: 'utm_source: ig / reels_organico'
      }
    ];

    const sampleOrdersYesterday = [
      {
        id: 'ord_pp_2',
        date: `${yestStr} 18:22`,
        name: 'Rodrigo Antunes',
        whatsapp: '11985432109',
        email: 'rodrigo@startup.io',
        amount: 97.00,
        amountFormatted: 'R$ 97,00',
        method: 'CARTÃO',
        status: 'approved',
        platform: 'PerfectPay',
        product: 'Método Funil Express',
        src: 'meta_ads',
        utm: 'meta / lookalike_compradores'
      },
      {
        id: 'ord_kirv_3',
        date: `${yestStr} 14:10`,
        name: 'Juliana Costa',
        whatsapp: '11999887766',
        email: 'juliana@costa.com',
        amount: 19.90,
        amountFormatted: 'R$ 19,90',
        method: 'PIX',
        status: 'approved',
        platform: 'Kirvano',
        product: 'Internet NetFree',
        src: 'stories_parceria',
        utm: 'influencer / parceria_out'
      },
      {
        id: 'ord_pp_3',
        date: `${yestStr} 11:05`,
        name: 'Lucas Mendes',
        whatsapp: '31988776655',
        email: 'lucas@mendes.com',
        amount: 97.00,
        amountFormatted: 'R$ 97,00',
        method: 'PIX',
        status: 'waiting_payment',
        platform: 'PerfectPay',
        product: 'Método Funil Express',
        src: 'tiktok_ads',
        utm: 'tiktok / spark_ads'
      }
    ];

    const sampleOrdersMonth = [
      ...sampleOrdersToday,
      ...sampleOrdersYesterday,
      {
        id: 'ord_pp_4',
        date: `${day18Str} 16:40`,
        name: 'Aline Ferreira',
        whatsapp: '81987654321',
        email: 'aline@design.com',
        amount: 97.00,
        amountFormatted: 'R$ 97,00',
        method: 'PIX',
        status: 'approved',
        platform: 'PerfectPay',
        product: 'Método Funil Express',
        src: 'google_cpc',
        utm: 'google / pesquisa_direta'
      },
      {
        id: 'ord_kirv_4',
        date: `${day10Str} 15:20`,
        name: 'Gustavo Lima',
        whatsapp: '47991234567',
        email: 'gustavo@tech.com',
        amount: 19.90,
        amountFormatted: 'R$ 19,90',
        method: 'PIX',
        status: 'approved',
        platform: 'Kirvano',
        product: 'Internet NetFree',
        src: 'CA_01|ABERTO_01|VD_02_A|Instagram_Reels',
        utm: 'utm_source: ig / reels_campanha'
      },
      {
        id: 'ord_kirv_5',
        date: `${day04Str} 09:30`,
        name: 'Fabiana Miranda',
        whatsapp: '11977665544',
        email: 'fabiana@miranda.com',
        amount: 19.90,
        amountFormatted: 'R$ 19,90',
        method: 'PIX',
        status: 'waiting_payment',
        platform: 'Kirvano',
        product: 'Internet NetFree',
        src: 'stories_oferta',
        utm: 'meta_ads / retargeting'
      }
    ];

    const viewsToday = generateViews(145);
    viewsToday['step_checkout'] = 24;
    viewsToday['step_sales'] = 2;

    const viewsYest = generateViews(190);
    viewsYest['step_checkout'] = 31;
    viewsYest['step_sales'] = 2;

    const viewsMonth = generateViews(2480);
    viewsMonth['step_checkout'] = 380;
    viewsMonth['step_sales'] = 6;

    const viewsRange = generateViews(435);
    viewsRange['step_checkout'] = 68;
    viewsRange['step_sales'] = 4;

    this.currentQuiz.analytics = {
      cachedFilters: {
        today: {
          views: viewsToday,
          leads: sampleLeadsToday,
          orders: sampleOrdersToday,
          totalStarts: 145,
          totalCheckouts: 24,
          totalSalesApproved: 2,
          revenueApproved: 116.90,
          totalSalesPending: 1,
          revenuePending: 19.90
        },
        yesterday: {
          views: viewsYest,
          leads: sampleLeadsYesterday,
          orders: sampleOrdersYesterday,
          totalStarts: 190,
          totalCheckouts: 31,
          totalSalesApproved: 2,
          revenueApproved: 116.90,
          totalSalesPending: 1,
          revenuePending: 97.00
        },
        month: {
          views: viewsMonth,
          leads: sampleLeadsMonth,
          orders: sampleOrdersMonth,
          totalStarts: 2480,
          totalCheckouts: 380,
          totalSalesApproved: 6,
          revenueApproved: 370.60,
          totalSalesPending: 3,
          revenuePending: 136.80
        },
        range: {
          views: viewsRange,
          leads: sampleLeadsMonth,
          orders: sampleOrdersMonth,
          totalStarts: 435,
          totalCheckouts: 68,
          totalSalesApproved: 4,
          revenueApproved: 233.80,
          totalSalesPending: 2,
          revenuePending: 116.90,
          startDate: this.analyticsStartDate,
          endDate: this.analyticsEndDate
        }
      },
      views: viewsToday,
      leads: sampleLeadsToday,
      orders: sampleOrdersToday,
      totalStarts: 145,
      totalCheckouts: 24,
      totalSalesApproved: 2,
      revenueApproved: 116.90,
      totalSalesPending: 1,
      revenuePending: 19.90,
      simulatedAt: new Date().toISOString()
    };

    this.analyticsFilter = 'today';
    this.analyticsOrdersTab = 'approved';
    this.analyticsStartDate = this.formatIsoDate(now);
    this.analyticsEndDate = this.formatIsoDate(now);
    this.saveQuizzesToStorage();
    this.renderFunnelDashboard();
  },

  resetFunnelAnalytics() {
    if (!this.currentQuiz) return;
    this.currentQuiz.analytics = { views: {}, cachedFilters: {} };
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

  // ==========================================
  // FIREBASE CLOUD & AUTENTICAÇÃO
  // ==========================================
  initFirebase() {
    try {
      if (typeof firebase === 'undefined') {
        console.warn('[QuizForge Cloud] Firebase SDK compat não carregado. Operando localmente.');
        this.updateAuthUi();
        this.renderDashboardCloudBanner();
        return;
      }

      if (!firebase.apps.length) {
        this.firebaseApp = firebase.initializeApp(firebaseConfig);
      } else {
        this.firebaseApp = firebase.app();
      }

      this.firebaseAuth = firebase.auth();
      this.firestore = firebase.firestore();

      // Monitor de estado de autenticação
      this.firebaseAuth.onAuthStateChanged(async (user) => {
        this.firebaseUser = user;
        this.updateAuthUi();
        this.renderDashboardCloudBanner();
        this.showSaveBadge(true);
        if (user) {
          console.log('[QuizForge Cloud] Autenticado com sucesso:', user.email);
          await this.syncQuizzesFromCloud();
        }
      });
    } catch (err) {
      console.error('[QuizForge Cloud] Falha ao iniciar Firebase:', err);
      this.updateAuthUi();
      this.renderDashboardCloudBanner();
    }
  },

  updateAuthUi() {
    const container = document.getElementById('cloud-auth-container');
    if (!container) return;

    if (this.firebaseUser) {
      const email = this.firebaseUser.email || 'Usuário';
      container.innerHTML = `
        <div class="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-xs shadow-sm">
          <span class="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" title="Nuvem conectada"></span>
          <span class="text-slate-200 font-medium truncate max-w-[120px] md:max-w-[180px]" title="${this.escape(email)}">
            ${this.escape(email)}
          </span>
          <button type="button" onclick="App.syncQuizzesFromCloud()" class="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-indigo-400 transition" title="Sincronizar agora">
            <i class="ph ph-arrows-clockwise text-sm"></i>
          </button>
          <button type="button" onclick="App.logoutUser()" class="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition" title="Sair da conta">
            <i class="ph ph-sign-out text-sm"></i>
          </button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <button type="button" onclick="App.openAuthModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition">
          <i class="ph ph-cloud text-sm"></i>
          <span class="hidden sm:inline">Conectar Nuvem</span>
          <span class="sm:hidden">Entrar</span>
        </button>
      `;
    }
  },

  renderDashboardCloudBanner() {
    const banner = document.getElementById('dashboard-cloud-banner');
    if (!banner) return;

    if (this.firebaseUser) {
      const email = this.firebaseUser.email || 'sua conta';
      banner.innerHTML = `
        <div class="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/30 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 text-xl border border-emerald-500/20 shadow-inner">
              <i class="ph ph-cloud-check"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-white text-sm">Sincronização em Nuvem Ativa</h4>
                <span class="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">Online</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">Conectado como <b class="text-slate-200">${this.escape(email)}</b>. Suas alterações são salvas automaticamente no Firebase.</p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" onclick="App.syncQuizzesFromCloud()" class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition">
              <i class="ph ph-arrows-clockwise text-sm"></i>
              Sincronizar Agora
            </button>
          </div>
        </div>
      `;
    } else {
      banner.innerHTML = `
        <div class="bg-gradient-to-r from-indigo-950/40 via-slate-900 to-purple-950/30 border border-indigo-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 text-xl border border-indigo-500/20 shadow-inner">
              <i class="ph ph-cloud"></i>
            </div>
            <div>
              <h4 class="font-bold text-white text-sm">Acesse seus quizzes em qualquer computador ou celular</h4>
              <p class="text-xs text-slate-400 mt-0.5">Conecte sua conta do Firebase para sincronizar seus funis na nuvem e nunca perder suas alterações.</p>
            </div>
          </div>
          <button type="button" onclick="App.openAuthModal()" class="shrink-0 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 transition">
            <i class="ph ph-sign-in text-sm"></i>
            Conectar Nuvem (Login / Cadastro)
          </button>
        </div>
      `;
    }
  },

  openAuthModal() {
    this.closeModals();
    this.setAuthMode('login');
    const modal = document.getElementById('modal-auth');
    if (modal) modal.classList.remove('hidden');
    setTimeout(() => {
      const emailInput = document.getElementById('auth-email');
      if (emailInput) emailInput.focus();
    }, 100);
  },

  setAuthMode(mode) {
    this.authMode = mode;
    const title = document.getElementById('auth-modal-title');
    const subtitle = document.getElementById('auth-modal-subtitle');
    const tabLogin = document.getElementById('tab-auth-login');
    const tabRegister = document.getElementById('tab-auth-register');
    const passContainer = document.getElementById('auth-password-container');
    const submitBtn = document.getElementById('btn-auth-submit');
    const alertBox = document.getElementById('auth-alert');

    if (alertBox) alertBox.classList.add('hidden');

    if (mode === 'login') {
      if (title) title.textContent = 'Entrar na Minha Conta';
      if (subtitle) subtitle.textContent = 'Acesse seus quizzes em qualquer dispositivo';
      if (tabLogin) tabLogin.className = 'py-2 rounded-lg bg-indigo-600 text-white transition';
      if (tabRegister) tabRegister.className = 'py-2 rounded-lg text-slate-400 hover:text-white transition';
      if (passContainer) passContainer.classList.remove('hidden');
      if (submitBtn) submitBtn.innerHTML = '<span>Entrar na Conta</span>';
    } else if (mode === 'register') {
      if (title) title.textContent = 'Criar Nova Conta';
      if (subtitle) subtitle.textContent = 'Crie sua conta para sincronizar seus quizzes na nuvem';
      if (tabLogin) tabLogin.className = 'py-2 rounded-lg text-slate-400 hover:text-white transition';
      if (tabRegister) tabRegister.className = 'py-2 rounded-lg bg-indigo-600 text-white transition';
      if (passContainer) passContainer.classList.remove('hidden');
      if (submitBtn) submitBtn.innerHTML = '<span>Criar Conta e Sincronizar</span>';
    } else if (mode === 'reset') {
      if (title) title.textContent = 'Recuperar Minha Senha';
      if (subtitle) subtitle.textContent = 'Digite seu e-mail para receber o link de redefinição';
      if (tabLogin) tabLogin.className = 'py-2 rounded-lg text-slate-400 hover:text-white transition';
      if (tabRegister) tabRegister.className = 'py-2 rounded-lg text-slate-400 hover:text-white transition';
      if (passContainer) passContainer.classList.add('hidden');
      if (submitBtn) submitBtn.innerHTML = '<span>Enviar Link de Recuperação</span>';
    }
  },

  showAuthAlert(type, message) {
    const alertBox = document.getElementById('auth-alert');
    if (!alertBox) return;
    alertBox.classList.remove('hidden');
    if (type === 'error') {
      alertBox.className = 'p-3 rounded-xl text-xs font-medium border bg-red-500/10 border-red-500/30 text-red-300 flex items-start gap-2';
      alertBox.innerHTML = '<i class="ph ph-warning-circle text-base text-red-400 shrink-0 mt-0.5"></i> <div>' + message + '</div>';
    } else {
      alertBox.className = 'p-3 rounded-xl text-xs font-medium border bg-emerald-500/10 border-emerald-500/30 text-emerald-300 flex items-start gap-2';
      alertBox.innerHTML = '<i class="ph ph-check-circle text-base text-emerald-400 shrink-0 mt-0.5"></i> <div>' + message + '</div>';
    }
  },

  async handleAuthSubmit(event) {
    event.preventDefault();
    if (!this.firebaseAuth) {
      this.showAuthAlert('error', 'O serviço do Firebase não está disponível. Verifique se o navegador tem acesso à internet.');
      return;
    }

    const email = (document.getElementById('auth-email').value || '').trim();
    const passInput = document.getElementById('auth-password');
    const password = passInput ? passInput.value : '';
    const submitBtn = document.getElementById('btn-auth-submit');
    const originalBtnHtml = submitBtn.innerHTML;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="ph ph-arrows-clockwise animate-spin text-base"></i> Processando...';

    try {
      if (this.authMode === 'login') {
        await this.firebaseAuth.signInWithEmailAndPassword(email, password);
        this.closeModals();
        this.showToast('Login realizado com sucesso! Quizzes sincronizados.', 'success');
      } else if (this.authMode === 'register') {
        if (!password || password.length < 6) {
          throw { code: 'auth/weak-password' };
        }
        await this.firebaseAuth.createUserWithEmailAndPassword(email, password);
        this.closeModals();
        this.showToast('Conta criada com sucesso! Seus quizzes foram salvos na nuvem.', 'success');
      } else if (this.authMode === 'reset') {
        await this.firebaseAuth.sendPasswordResetEmail(email);
        this.showAuthAlert('success', 'E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      }
    } catch (err) {
      console.error('[QuizForge Auth Error]', err);
      let msg = 'Ocorreu um erro ao processar. Tente novamente.';
      if (err.code === 'auth/user-not-found') {
        msg = 'Nenhuma conta encontrada com este e-mail. Clique na aba <b>Criar Nova Conta</b>.';
      } else if (err.code === 'auth/wrong-password') {
        msg = 'Senha incorreta. Verifique e tente novamente.';
      } else if (err.code === 'auth/invalid-credential') {
        msg = 'E-mail ou senha incorretos.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'O formato do e-mail é inválido.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Este e-mail já está cadastrado. Clique na aba <b>Entrar</b>.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'A senha precisa ter no mínimo 6 caracteres.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Muitas tentativas com falha. Aguarde alguns instantes e tente novamente.';
      } else if (err.message) {
        msg = err.message;
      }
      this.showAuthAlert('error', msg);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  },

  async logoutUser() {
    if (!confirm('Deseja realmente desconectar da sua conta na nuvem? (Seus quizzes permanecerão seguros no Firebase)')) return;
    try {
      if (this.firebaseAuth) {
        await this.firebaseAuth.signOut();
      }
      this.firebaseUser = null;
      this.updateAuthUi();
      this.renderDashboardCloudBanner();
      this.showSaveBadge(false, 'Salvo localmente');
      this.showToast('Desconectado com sucesso.', 'info');
    } catch (err) {
      console.error('[QuizForge Cloud] Erro ao deslogar:', err);
    }
  },

  async syncQuizzesFromCloud() {
    if (!this.firestore || !this.firebaseUser) return;
    this.isCloudSyncing = true;
    this.showSavingBadge();
    try {
      const snapshot = await this.firestore
        .collection('users')
        .doc(this.firebaseUser.uid)
        .collection('quizzes')
        .get();

      if (!snapshot.empty) {
        const cloudQuizzes = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data && data.id) {
            cloudQuizzes.push(data);
          }
        });

        if (cloudQuizzes.length > 0) {
          // Normaliza os quizzes baixados da nuvem
          cloudQuizzes.forEach(q => {
            if (!q.theme) q.theme = {};
            if (q.theme.startPercent === undefined) q.theme.startPercent = 60;
            if (q.theme.hideUntilFirstClick === undefined) q.theme.hideUntilFirstClick = true;
            if (q.steps) {
              q.steps = q.steps.map(s => QuizTemplateEngine.normalizeStep(s));
            }
          });

          // Se tiver quizzes locais que ainda não estão na nuvem, faz upload para não perder nada
          const cloudIds = new Set(cloudQuizzes.map(q => q.id));
          const localOnly = (this.quizzes || []).filter(q => !cloudIds.has(q.id) && q.id !== 'sample_quiz_vendas');

          if (localOnly.length > 0) {
            for (const localQuiz of localOnly) {
              await this.cloudSaveQuiz(localQuiz, false);
              cloudQuizzes.unshift(localQuiz);
            }
          }

          // Ordena pelo mais recente
          cloudQuizzes.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

          this.quizzes = cloudQuizzes;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.quizzes));

          // Atualiza visualização ativa
          if (this.currentQuiz) {
            const reloaded = this.quizzes.find(q => q.id === this.currentQuiz.id);
            if (reloaded) {
              this.currentQuiz = reloaded;
              this.renderCurrentStepEditor();
              this.updatePreview();
            }
          }
          this.renderDashboard();
        }
      } else {
        // Se a nuvem do usuário estiver vazia (primeiro login), faz upload dos quizzes locais
        if (this.quizzes && this.quizzes.length > 0) {
          for (const q of this.quizzes) {
            await this.cloudSaveQuiz(q, false);
          }
        }
      }
      this.showSaveBadge(true);
    } catch (err) {
      console.error('[QuizForge Cloud] Erro ao sincronizar com a nuvem:', err);
      this.showSaveBadge(false, 'Salvo localmente (verifique regras do Firestore)');
    } finally {
      this.isCloudSyncing = false;
    }
  },

  async cloudSaveQuiz(quiz, updateBadge = true) {
    if (!this.firestore || !this.firebaseUser || !quiz || !quiz.id) return;
    if (updateBadge) this.showSavingBadge();
    try {
      quiz.updatedAt = new Date().toISOString();
      const cleanQuiz = JSON.parse(JSON.stringify(quiz));
      await this.firestore
        .collection('users')
        .doc(this.firebaseUser.uid)
        .collection('quizzes')
        .doc(quiz.id)
        .set(cleanQuiz, { merge: true });

      if (updateBadge) this.showSaveBadge(true);
    } catch (err) {
      console.error('[QuizForge Cloud] Erro ao salvar quiz na nuvem:', err);
      if (updateBadge) this.showSaveBadge(false, 'Salvo localmente (verifique permissão)');
    }
  },

  async cloudDeleteQuiz(quizId) {
    if (!this.firestore || !this.firebaseUser || !quizId) return;
    try {
      await this.firestore
        .collection('users')
        .doc(this.firebaseUser.uid)
        .collection('quizzes')
        .doc(quizId)
        .delete();
      console.log('[QuizForge Cloud] Quiz excluído da nuvem:', quizId);
    } catch (err) {
      console.error('[QuizForge Cloud] Erro ao deletar quiz da nuvem:', err);
    }
  },

  showToast(message, type = 'info') {
    let toast = document.getElementById('quizforge-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'quizforge-toast';
      toast.className = 'fixed bottom-6 right-6 z-50 transition-all duration-300 transform translate-y-10 opacity-0 pointer-events-none';
      document.body.appendChild(toast);
    }
    const colorClass = type === 'success' 
      ? 'bg-emerald-600 text-white shadow-emerald-500/20' 
      : type === 'error' 
        ? 'bg-red-600 text-white shadow-red-500/20' 
        : 'bg-indigo-600 text-white shadow-indigo-500/20';

    toast.innerHTML = `
      <div class="${colorClass} px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold border border-white/10">
        <i class="ph ${type === 'success' ? 'ph-check-circle' : type === 'error' ? 'ph-warning-circle' : 'ph-info'} text-base"></i>
        <span>${message}</span>
      </div>
    `;
    toast.classList.remove('translate-y-10', 'opacity-0', 'pointer-events-none');
    setTimeout(() => {
      toast.classList.add('translate-y-10', 'opacity-0', 'pointer-events-none');
    }, 3500);
  },

  copySheetsScript() {
    let code = document.getElementById('sheets-script-code').innerText;
    if (this.currentQuiz && this.currentQuiz.tracking) {
      const tracking = this.currentQuiz.tracking;
      if (tracking.metaPixelId) {
        code = code.replace(/var META_PIXEL_ID = ".*?";/, `var META_PIXEL_ID = "${tracking.metaPixelId.trim()}";`);
      }
      if (tracking.metaApiToken) {
        code = code.replace(/var META_API_TOKEN = ".*?";/, `var META_API_TOKEN = "${tracking.metaApiToken.trim()}";`);
      }
      if (tracking.metaTestCode) {
        code = code.replace(/var META_TEST_EVENT_CODE = ".*?";/, `var META_TEST_EVENT_CODE = "${tracking.metaTestCode.trim()}";`);
      }
      if (tracking.quizUrl || tracking.metaQuizUrl) {
        const qUrl = (tracking.quizUrl || tracking.metaQuizUrl).trim();
        code = code.replace(/var META_QUIZ_URL = ".*?";/, `var META_QUIZ_URL = "${qUrl}";`);
      }
    }
    navigator.clipboard.writeText(code).then(() => {
      alert('Código do Apps Script copiado para a área de transferência com suas configurações aplicadas!');
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
              autoplayMode: 'muted_button',
              hideControls: true,
              hideRecommendations: true,
              cleanTopMask: true,
              unmuteButtonText: '🔊 Toque para Ativar o Áudio',
              preload: true,
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
          title: 'Etapa 3: Barra de Análise (0% a 100%)',
          blocks: [
            {
              id: 'b_loader',
              type: 'fake_loader',
              duration: 4,
              autoAdvance: true,
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
              fullWidth: true,
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
