/**
 * SCRIPT PARA GOOGLE PLANILHAS (Google Apps Script) - Versão 3.0 (Métricas por Visitante Único & Suporte a SRC)
 * 
 * Melhoras desta versão:
 * 1. MÉTRICAS PRECISAS: Calcula o funil por VISITANTE ÚNICO (Sessão). Se 1 usuário responder 5 etapas,
 *    ele será contabilizado como EXATAMENTE 1 PESSOA avançando no funil (e não 5 pessoas como antes).
 * 2. SUPORTE A SRC: Coluna dedicada para capturar parâmetros de tráfego direto (?src=... ou ?sck=...).
 * 3. RETROCOMPATÍVEL INTELIGENTE: Adapta-se automaticamente à sua planilha existente (mesmo com dados antigos),
 *    adicionando a coluna SRC sem quebrar nada.
 * 
 * =========================================================================
 * INSTRUÇÕES RÁPIDAS DE ATUALIZAÇÃO NO APPS SCRIPT:
 * =========================================================================
 * 1. Abra a sua planilha Google existente.
 * 2. Clique em: Extensões > Apps Script.
 * 3. Apague tudo e cole TODO o código deste arquivo.
 * 4. Clique em "Implantar" (botão azul) > "Gerenciar implantações".
 * 5. Clique no ícone de lápis (Editar) no canto superior direito.
 * 6. Em "Versão", selecione "Nova versão" (MUITO IMPORTANTE para aplicar as mudanças).
 * 7. Clique em "Implantar" e depois em "Concluído".
 * =========================================================================
 */

// 1. LEITURA DOS DADOS (QuizForge ➔ Planilha com Contagem de Visitantes Únicos)
function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        totalStarts: 0,
        totalCompletions: 0,
        totalLeads: 0,
        stepViews: {},
        recentLeads: [],
        message: 'Planilha conectada! Aguardando novos acessos.'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var lastCol = sheet.getLastColumn();
    var rows = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = rows[0];
    var colMap = {};
    for (var c = 0; c < headers.length; c++) {
      colMap[String(headers[c] || '').trim().toLowerCase()] = c;
    }
    
    function getCol(row, candidates) {
      for (var j = 0; j < candidates.length; j++) {
        var idx = colMap[candidates[j].toLowerCase()];
        if (idx !== undefined && row[idx] !== undefined) return row[idx];
      }
      return '';
    }

    // Estruturas de agregação por VISITANTE ÚNICO (Sessão)
    var stepVisitors = {};      // { 'step_0': { 'sessao_1': true }, 'step_1': { ... } }
    var uniqueStarts = {};      // { 'sessao_1': true }
    var uniqueCompletions = {}; // { 'sessao_1': true }
    var leadsMap = {};
    var recentLeads = [];

    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var rowDate = getCol(row, ['data/hora', 'data', 'timestamp']);
      var rawSession = String(getCol(row, ['sessão (id)', 'sessão', 'sessao', 'session', 'sessao (id)']) || '').trim();
      var event = String(getCol(row, ['evento', 'event']) || '').trim();
      var stepIdx = String(getCol(row, ['etapa', 'step']) || '').trim();
      var leadName = String(getCol(row, ['nome']) || '').trim();
      var leadPhone = String(getCol(row, ['whatsapp', 'telefone']) || '').trim();
      var leadEmail = String(getCol(row, ['email', 'e-mail']) || '').trim();
      var points = getCol(row, ['pontos / score', 'pontos', 'score']);
      var src = String(getCol(row, ['src', 'src (rastreamento)']) || '').trim();
      var utmSrc = String(getCol(row, ['utm_source', 'source']) || '').trim();
      var utmCmp = String(getCol(row, ['utm_campaign', 'campaign']) || '').trim();

      // Se a linha for antiga e não tiver sessionId gravado, agrupa por data/hora aproximada (janela de 15min)
      var sessionKey = rawSession;
      if (!sessionKey) {
        var timeCluster = rowDate ? Utilities.formatDate(new Date(rowDate), "GMT", "yyyy-MM-dd_HH") + '_' + Math.floor(new Date(rowDate).getMinutes() / 15) : ('leg_' + i);
        sessionKey = (leadPhone || leadEmail || 'visitante') + '_' + timeCluster;
      }

      // 1. Contabilização de Etapas (Apenas eventos de VISUALIZAÇÃO contam como passo no funil)
      // Quiz_Resposta é apenas o registro da opção clicada e NÃO duplica o acesso da etapa!
      if (event.indexOf('Quiz_Etapa_') === 0) {
        var numStep = parseInt(event.replace('Quiz_Etapa_', ''), 10);
        if (!isNaN(numStep) && numStep >= 1) {
          var k = 'step_' + (numStep - 1);
          if (!stepVisitors[k]) stepVisitors[k] = {};
          stepVisitors[k][sessionKey] = true;
          if (numStep === 1) uniqueStarts[sessionKey] = true;
        }
      } else if (event === 'Quiz_Iniciado') {
        if (!stepVisitors['step_0']) stepVisitors['step_0'] = {};
        stepVisitors['step_0'][sessionKey] = true;
        uniqueStarts[sessionKey] = true;
      } else if (stepIdx && !isNaN(parseInt(stepIdx, 10)) && event !== 'Quiz_Resposta') {
        var num = parseInt(stepIdx, 10);
        if (num >= 1) {
          var k2 = 'step_' + (num - 1);
          if (!stepVisitors[k2]) stepVisitors[k2] = {};
          stepVisitors[k2][sessionKey] = true;
          if (num === 1) uniqueStarts[sessionKey] = true;
        }
      }

      // 2. Conclusão / Oferta
      if (event === 'Quiz_Concluido' || event === 'Oferta_Visualizada') {
        uniqueCompletions[sessionKey] = true;
      }

      // 3. Coleta de Leads Únicos
      if (leadName || leadPhone || leadEmail) {
        var lKey = leadPhone || leadEmail || (leadName + '_' + sessionKey);
        if (!leadsMap[lKey]) {
          leadsMap[lKey] = true;
          var originTag = src ? ('SRC: ' + src) : [utmSrc, utmCmp].filter(Boolean).join(' / ');
          recentLeads.unshift({
            date: rowDate ? Utilities.formatDate(new Date(rowDate), Session.getScriptTimeZone() || "GMT-3", "dd/MM/yyyy HH:mm") : '',
            name: leadName || 'Anônimo',
            whatsapp: leadPhone || '',
            email: leadEmail || '',
            score: points || 0,
            src: src || '-',
            utm: originTag || '-'
          });
        }
      }
    }

    // Calcula total de visitantes únicos por etapa
    var stepViews = {};
    for (var sKey in stepVisitors) {
      stepViews[sKey] = Object.keys(stepVisitors[sKey]).length;
    }

    if (recentLeads.length > 50) {
      recentLeads = recentLeads.slice(0, 50);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      totalStarts: Object.keys(uniqueStarts).length,
      totalCompletions: Object.keys(uniqueCompletions).length,
      totalLeads: Object.keys(leadsMap).length,
      stepViews: stepViews,
      recentLeads: recentLeads,
      lastUpdated: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. GRAVAÇÃO DOS DADOS (Quiz do Visitante ➔ Planilha com Mapeamento Dinâmico de Colunas)
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastCol = sheet.getLastColumn();
    
    // Se a planilha for completamente nova, cria o cabeçalho padrão
    if (lastCol === 0) {
      sheet.appendRow([
        'Data/Hora',
        'Sessão (ID)',
        'Evento',
        'Quiz',
        'Etapa',
        'Pergunta / Título',
        'Resposta',
        'Pontos / Score',
        'Nome',
        'WhatsApp',
        'Email',
        'SRC',
        'UTM_Source',
        'UTM_Campaign',
        'UTM_Medium',
        'UTM_Content'
      ]);
      sheet.getRange(1, 1, 1, 16).setFontWeight('bold').setBackground('#e2e8f0');
      sheet.setFrozenRows(1);
      lastCol = 16;
    } else {
      // Se for uma planilha já existente, garante que SRC e Sessão existam no cabeçalho
      var curHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var hasSrc = curHeaders.some(function(h) { return String(h).toUpperCase().indexOf('SRC') !== -1; });
      var hasSess = curHeaders.some(function(h) { return String(h).toLowerCase().indexOf('sess') !== -1; });
      
      if (!hasSrc) {
        lastCol++;
        sheet.getRange(1, lastCol).setValue('SRC').setFontWeight('bold').setBackground('#e2e8f0');
      }
      if (!hasSess) {
        lastCol++;
        sheet.getRange(1, lastCol).setValue('Sessão (ID)').setFontWeight('bold').setBackground('#e2e8f0');
      }
    }
    
    var data = {};
    if (e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch(p) { data = e.parameter || {}; }
    } else { data = e.parameter || {}; }
    
    // Captura os dados do evento
    var timestamp = new Date();
    var sessionId = data.sessionId || '';
    var event = data.event || '';
    var quizTitle = data.quizTitle || '';
    var stepIndex = (data.data && data.data.stepIndex) || '';
    var stepTitle = (data.data && (data.data.question || data.data.stepTitle || data.data.title)) || '';
    var answer = (data.data && data.data.answer) || '';
    var points = '';
    if (data.data && data.data.points !== undefined && data.data.points !== null && data.data.points !== '') {
      points = data.data.points;
    } else if (event === 'Quiz_Concluido' || event === 'Lead') {
      points = (data.totalScore !== undefined && data.totalScore > 0) ? data.totalScore : '';
    }
    
    var leadName = (data.lead && data.lead.name) || '';
    var leadWhatsApp = (data.lead && data.lead.whatsapp) || '';
    var leadEmail = (data.lead && data.lead.email) || '';
    
    var utms = data.utms || {};
    var src = data.src || utms.src || utms.sck || utms.SRC || utms.SCK || '';
    var utmSource = data.utm_source || utms.utm_source || '';
    var utmCampaign = data.utm_campaign || utms.utm_campaign || '';
    var utmMedium = data.utm_medium || utms.utm_medium || '';
    var utmContent = data.utm_content || utms.utm_content || '';

    // Mapeamento dinâmico pelo nome das colunas
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var colMap = {};
    for (var c = 0; c < headers.length; c++) {
      colMap[String(headers[c] || '').trim().toLowerCase()] = c;
    }
    
    var newRow = new Array(headers.length);
    for (var k = 0; k < newRow.length; k++) newRow[k] = '';
    
    function setVal(candidates, val) {
      for (var j = 0; j < candidates.length; j++) {
        var idx = colMap[candidates[j].toLowerCase()];
        if (idx !== undefined) {
          newRow[idx] = val;
          return;
        }
      }
    }
    
    setVal(['data/hora', 'data', 'timestamp'], timestamp);
    setVal(['sessão (id)', 'sessão', 'sessao', 'session', 'sessao (id)'], sessionId);
    setVal(['evento', 'event'], event);
    setVal(['quiz', 'quiztitle', 'título do quiz'], quizTitle);
    setVal(['etapa', 'step'], stepIndex);
    setVal(['pergunta / título', 'pergunta / titulo', 'pergunta', 'título'], stepTitle);
    setVal(['resposta', 'answer'], answer);
    setVal(['pontos / score', 'pontos', 'score'], points);
    setVal(['nome', 'leadname'], leadName);
    setVal(['whatsapp', 'telefone', 'phone'], leadWhatsApp);
    setVal(['email', 'e-mail'], leadEmail);
    setVal(['src', 'src (rastreamento)'], src);
    setVal(['utm_source', 'source'], utmSource);
    setVal(['utm_campaign', 'campaign'], utmCampaign);
    setVal(['utm_medium', 'medium'], utmMedium);
    setVal(['utm_content', 'content'], utmContent);

    sheet.appendRow(newRow);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
