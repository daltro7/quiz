/**
 * SCRIPT PARA GOOGLE PLANILHAS (Google Apps Script) - Versão 2.0 (Duas Vias)
 * 
 * Funcionalidades:
 * 1. doPost(e): Recebe cada acesso, resposta, lead e conclusão do quiz e salva na planilha.
 * 2. doGet(e): Lê os dados da planilha e devolve as métricas calculadas em tempo real para o QuizForge.
 * 3. Auto-configuração: Se a planilha for nova/em branco, cria os cabeçalhos automaticamente!
 * 
 * =========================================================================
 * PASSO A PASSO PARA CONFIGURAR EM 2 MINUTOS:
 * =========================================================================
 * 1. Abra o Google Planilhas (https://sheets.new) e crie uma planilha para o seu funil.
 *    (Dê o nome que preferir, ex: "Métricas - Quiz 1").
 * 2. No menu superior da planilha, clique em: Extensões > Apps Script.
 * 3. Apague todo o código que estiver na tela e cole TODO o código deste arquivo.
 * 4. Clique no botão azul "Implantar" (canto superior direito) > "Nova implantação".
 * 5. Na engrenagem, escolha "App da Web".
 * 6. Preencha as opções exatamente assim:
 *    - Descrição: Webhook QuizForge
 *    - Executar como: "Eu (seu email)"
 *    - Quem pode acessar: "Qualquer pessoa" (MUITO IMPORTANTE para permitir que o quiz envie os dados)
 * 7. Clique em "Implantar", autorize o acesso com sua conta Google e copie a "URL do app da Web"
 *    (ela começa com https://script.google.com/macros/s/...).
 * 8. Abra o Construtor do Quiz no QuizForge, vá na aba "Rastreamento & Métricas" e cole a URL no campo:
 *    "URL da Planilha Google (Webhook & Sincronização)".
 * =========================================================================
 */

// 1. LEITURA DOS DADOS (QuizForge ➔ Planilha)
function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    
    // Se a planilha estiver vazia ou só tiver o cabeçalho
    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        totalStarts: 0,
        totalCompletions: 0,
        totalLeads: 0,
        stepViews: {},
        recentLeads: [],
        message: 'Planilha conectada! Aguardando os primeiros acessos do quiz.'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var rows = sheet.getDataRange().getValues();
    var stepViews = {};
    var leadsMap = {};
    var recentLeads = [];
    var totalStarts = 0;
    var totalCompletions = 0;
    
    // Mapeamento das colunas (Linha 1 é cabeçalho):
    // 0: Data/Hora | 1: Evento | 2: Quiz | 3: Etapa | 4: Pergunta/Título | 5: Resposta | 6: Pontos | 7: Nome | 8: WhatsApp | 9: Email | 10: UTM_Source | 11: UTM_Campaign
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var event = String(row[1] || '').trim();
      var stepIdx = String(row[3] || '').trim();
      var leadName = String(row[7] || '').trim();
      var leadPhone = String(row[8] || '').trim();
      var leadEmail = String(row[9] || '').trim();
      var points = row[6];
      var rowDate = row[0];
      var utmSrc = String(row[10] || '').trim();
      var utmCmp = String(row[11] || '').trim();
      
      // Contabiliza visualizações por etapa
      var numStep = parseInt(stepIdx, 10);
      if (!isNaN(numStep) && numStep >= 1) {
        var key = 'step_' + (numStep - 1);
        stepViews[key] = (stepViews[key] || 0) + 1;
        if (numStep === 1) totalStarts++;
      } else if (event.indexOf('Quiz_Etapa_') === 0) {
        var parsed = parseInt(event.replace('Quiz_Etapa_', ''), 10);
        if (!isNaN(parsed) && parsed >= 1) {
          var key2 = 'step_' + (parsed - 1);
          stepViews[key2] = (stepViews[key2] || 0) + 1;
          if (parsed === 1) totalStarts++;
        }
      } else if (event === 'Quiz_Iniciado') {
        stepViews['step_0'] = (stepViews['step_0'] || 0) + 1;
        totalStarts++;
      }
      
      // Conclusão / Oferta
      if (event === 'Quiz_Concluido' || event === 'Oferta_Visualizada') {
        totalCompletions++;
      }
      
      // Coleta Leads únicos
      if (leadName || leadPhone || leadEmail) {
        var leadKey = leadPhone || leadEmail || (leadName + '_' + i);
        if (!leadsMap[leadKey]) {
          leadsMap[leadKey] = true;
          recentLeads.unshift({
            date: rowDate ? Utilities.formatDate(new Date(rowDate), Session.getScriptTimeZone() || "GMT-3", "dd/MM/yyyy HH:mm") : '',
            name: leadName || 'Anônimo',
            whatsapp: leadPhone || '',
            email: leadEmail || '',
            score: points || 0,
            utm: [utmSrc, utmCmp].filter(Boolean).join(' / ') || '-'
          });
        }
      }
    }
    
    // Limita aos 30 leads mais recentes
    if (recentLeads.length > 30) {
      recentLeads = recentLeads.slice(0, 30);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      totalStarts: totalStarts,
      totalCompletions: totalCompletions,
      totalLeads: Object.keys(leadsMap).length,
      stepViews: stepViews,
      recentLeads: recentLeads,
      lastUpdated: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. GRAVAÇÃO DOS DADOS (Quiz do Visitante ➔ Planilha)
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Se a planilha estiver vazia, cria o cabeçalho visualmente estilizado
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Data/Hora',
        'Evento',
        'Quiz',
        'Etapa',
        'Pergunta / Título',
        'Resposta',
        'Pontos / Score',
        'Nome',
        'WhatsApp',
        'Email',
        'UTM_Source',
        'UTM_Campaign'
      ]);
      sheet.getRange(1, 1, 1, 12).setFontWeight('bold').setBackground('#e2e8f0');
      sheet.setFrozenRows(1);
    }
    
    var data = {};
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch(pErr) {
        data = e.parameter || {};
      }
    } else {
      data = e.parameter || {};
    }
    
    var timestamp = new Date();
    var event = data.event || '';
    var quizTitle = data.quizTitle || '';
    var stepIndex = (data.data && data.data.stepIndex) || '';
    var stepTitle = (data.data && (data.data.stepTitle || data.data.question)) || '';
    var answer = (data.data && data.data.answer) || '';
    var points = (data.data && data.data.points) !== undefined ? data.data.points : (data.totalScore || '');
    
    var leadName = (data.lead && data.lead.name) || '';
    var leadWhatsApp = (data.lead && data.lead.whatsapp) || '';
    var leadEmail = (data.lead && data.lead.email) || '';
    
    var utmSource = (data.utms && data.utms.utm_source) || '';
    var utmCampaign = (data.utms && data.utms.utm_campaign) || '';

    // Insere linha no final da planilha
    sheet.appendRow([
      timestamp,
      event,
      quizTitle,
      stepIndex,
      stepTitle,
      answer,
      points,
      leadName,
      leadWhatsApp,
      leadEmail,
      utmSource,
      utmCampaign
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
