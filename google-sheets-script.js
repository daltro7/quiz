// =====================================================================
// SCRIPT INTEGRADO: QUIZFORGE + KIRVANO + PERFECTPAY + META CAPI
// Métricas, Funil, Leads e Envio de Vendas Aprovadas para a Meta
// =====================================================================

// ==========================================
// CONFIGURAÇÕES META CONVERSIONS API (CAPI)
// Preencha para enviar Vendas Aprovadas direto para a Meta (Facebook Ads)
// garantindo que Pix NÃO pago NUNCA seja contabilizado como compra!
// ==========================================
var META_PIXEL_ID = "1375613420763965";        // Seu Pixel ID da Meta
var META_API_TOKEN = "";                       // Cole o Token de Acesso da Conversions API (gerado no Gerenciador de Eventos)
var META_TEST_EVENT_CODE = "";                 // Opcional: Cole aqui o código de teste da aba "Testar Eventos" da Meta (ex: TEST12345)
var META_QUIZ_URL = "https://orcaobra.site";   // URL da sua página / quiz

// Funções de Criptografia SHA-256 e Formatação para a Meta API
function sha256(input) {
  if (!input) return null;
  var clean = String(input).trim().toLowerCase();
  if (!clean) return null;
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, clean, Utilities.Charset.UTF_8);
  var txt = '';
  for (var i = 0; i < rawHash.length; i++) {
    var b = rawHash[i];
    if (b < 0) b += 256;
    var hex = b.toString(16);
    if (hex.length === 1) hex = '0' + hex;
    txt += hex;
  }
  return txt;
}

function normalizePhoneForMeta(rawPhone) {
  if (!rawPhone) return '';
  var digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.indexOf('0') === 0) digits = digits.substring(1);
  if (digits.indexOf('55') === 0 && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return '55' + digits;
  return digits;
}

function sendMetaCapiPurchase(params) {
  var pixelId = (META_PIXEL_ID || '').trim();
  var token = (META_API_TOKEN || '').trim();
  if (!pixelId || !token) {
    return { success: false, reason: 'META_PIXEL_ID ou META_API_TOKEN não preenchidos no topo do script.' };
  }
  try {
    var userData = {};
    if (params.email) {
      var hEm = sha256(params.email);
      if (hEm) userData.em = [hEm];
    }
    if (params.phone) {
      var hPh = sha256(normalizePhoneForMeta(params.phone));
      if (hPh) userData.ph = [hPh];
    }
    if (params.name) {
      var parts = String(params.name).trim().split(/\s+/);
      if (parts[0]) {
        var hFn = sha256(parts[0]);
        if (hFn) userData.fn = [hFn];
      }
      if (parts.length > 1) {
        var hLn = sha256(parts.slice(1).join(' '));
        if (hLn) userData.ln = [hLn];
      }
    }
    userData.country = [sha256('br')];

    var evt = {
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: String(params.orderId || ('ord_' + Date.now())),
      action_source: 'website',
      event_source_url: (META_QUIZ_URL || 'https://orcaobra.site').trim(),
      user_data: userData,
      custom_data: {
        currency: 'BRL',
        value: Number(params.amount) || 0,
        content_name: params.productName || 'Oferta',
        order_id: String(params.orderId || '')
      }
    };

    var payload = {
      data: [evt]
    };
    if (META_TEST_EVENT_CODE && String(META_TEST_EVENT_CODE).trim() !== '') {
      payload.test_event_code = String(META_TEST_EVENT_CODE).trim();
    }

    var url = 'https://graph.facebook.com/v19.0/' + encodeURIComponent(pixelId) + '/events?access_token=' + encodeURIComponent(token);
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var resp = UrlFetchApp.fetch(url, options);
    var resCode = resp.getResponseCode();
    var resText = resp.getContentText();
    return { success: resCode >= 200 && resCode < 300, code: resCode, response: resText };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

// ==========================================
// FUNÇÕES DE AUTORIZAÇÃO E TESTE NO APPS SCRIPT
// ==========================================

// Execute esta função UMA VEZ no Apps Script se o Google pedir permissão de rede (script.external_request)
function autorizarPermissoes() {
  SpreadsheetApp.getActiveSpreadsheet();
  UrlFetchApp.fetch("https://graph.facebook.com", { muteHttpExceptions: true });
  Logger.log("Permissão concedida com sucesso!");
}

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🚀 QuizForge')
      .addItem('🧪 Testar Conexão com Meta CAPI', 'testarEnvioMetaCapi')
      .addItem('📤 Enviar Linha Selecionada para a Meta', 'enviarLinhaSelecionadaParaMeta')
      .addToUi();
  } catch(e) {}
}

// Executar esta função no Apps Script para validar o Token da Meta na hora!
function testarEnvioMetaCapi() {
  var res = sendMetaCapiPurchase({
    orderId: 'teste_' + Date.now(),
    amount: 47.90,
    productName: 'Teste QuizForge',
    name: 'Cliente Teste',
    email: 'cliente.teste@exemplo.com',
    phone: '11999999999'
  });
  Logger.log(JSON.stringify(res));
  try {
    SpreadsheetApp.getUi().alert('Resultado do Envio para a Meta:\n\n' + JSON.stringify(res, null, 2));
  } catch(e) {}
  return res;
}

// Permite que qualquer venda colocada manualmente na planilha seja enviada para a Meta!
function enviarLinhaSelecionadaParaMeta() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var rowIdx = sheet.getActiveCell().getRow();
  if (rowIdx <= 1) {
    ui.alert('Selecione uma linha de venda (linha 2 em diante) para enviar à Meta.');
    return;
  }
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var rowVals = sheet.getRange(rowIdx, 1, 1, lastCol).getValues()[0];
  var colMap = {};
  for (var c = 0; c < headers.length; c++) colMap[String(headers[c] || '').trim().toLowerCase()] = c;
  function getV(keys) {
    for (var k = 0; k < keys.length; k++) {
      var idx = colMap[keys[k].toLowerCase()];
      if (idx !== undefined && rowVals[idx] !== undefined) return rowVals[idx];
    }
    return '';
  }

  var orderId = String(getV(['sessão (id)', 'sessão', 'sessao']) || ('manual_' + rowIdx));
  var amount = parseFloat(String(getV(['valor (r$)', 'valor'])).replace(/[^\d,\.]/g, '').replace(',', '.')) || 0;
  var prodName = String(getV(['quiz / produto', 'produto']) || 'Oferta');
  var name = String(getV(['nome', 'cliente']) || 'Cliente');
  var email = String(getV(['email', 'e-mail']) || '');
  var phone = String(getV(['whatsapp', 'telefone', 'phone']) || '');

  var res = sendMetaCapiPurchase({
    orderId: orderId,
    amount: amount,
    productName: prodName,
    name: name,
    email: email,
    phone: phone
  });

  // Atualiza a coluna Meta CAPI na planilha
  var capiColIdx = colMap['meta capi'] || colMap['capi'];
  if (capiColIdx !== undefined) {
    sheet.getRange(rowIdx, capiColIdx + 1).setValue(res.success ? 'Enviado (Purchase)' : ('Erro: ' + (res.error || res.code || res.reason)));
  }

  ui.alert('Status do Envio para Meta:\n\n' + JSON.stringify(res, null, 2));
}

// 1. LEITURA DOS DADOS (QuizForge ➔ Planilha: Funil, Leads e Vendas)
function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success', totalStarts: 0, totalCompletions: 0, totalCheckouts: 0,
        totalSalesApproved: 0, revenueApproved: 0, totalSalesPending: 0, revenuePending: 0,
        stepViews: {}, recentLeads: [], orders: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    var lastCol = sheet.getLastColumn();
    var rows = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = rows[0], colMap = {};
    for (var c = 0; c < headers.length; c++) colMap[String(headers[c] || '').trim().toLowerCase()] = c;
    function getCol(row, candidates) {
      for (var j = 0; j < candidates.length; j++) {
        var idx = colMap[candidates[j].toLowerCase()];
        if (idx !== undefined && row[idx] !== undefined) return row[idx];
      }
      return '';
    }

    var stepVisitors = {}, uniqueStarts = {}, uniqueCompletions = {}, uniqueCheckouts = {};
    var leadsMap = {}, recentLeads = [];
    var orders = [], ordersMap = {};
    var totalSalesApproved = 0, revenueApproved = 0;
    var totalSalesPending = 0, revenuePending = 0;

    var filter = String((e && e.parameter && e.parameter.filter) || 'today').toLowerCase();
    var targetDate = (e && e.parameter && e.parameter.date) || '';
    var startDateParam = (e && e.parameter && e.parameter.startDate) || '';
    var endDateParam = (e && e.parameter && e.parameter.endDate) || '';

    function parseDateSafe(val) {
      if (!val) return null;
      if (val instanceof Date) return val;
      var str = String(val).trim();
      var d = new Date(str);
      if (!isNaN(d.getTime())) return d;
      var matchBr = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
      if (matchBr) {
        var day = parseInt(matchBr[1], 10);
        var month = parseInt(matchBr[2], 10) - 1;
        var year = parseInt(matchBr[3], 10);
        var hours = parseInt(matchBr[4] || '0', 10);
        var minutes = parseInt(matchBr[5] || '0', 10);
        var seconds = parseInt(matchBr[6] || '0', 10);
        return new Date(year, month, day, hours, minutes, seconds);
      }
      return null;
    }

    function matchesFilter(dVal, filt, tDate, sDate, eDate) {
      if (!dVal || filt === 'all') return true;
      var d = parseDateSafe(dVal);
      if (!d || isNaN(d.getTime())) return true;
      var now = new Date();
      var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      var tomorrowStart = todayStart + 86400000;
      var yestStart = todayStart - 86400000;
      var monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      var tTime = d.getTime();
      if (filt === 'today') return tTime >= todayStart && tTime < tomorrowStart;
      if (filt === 'yesterday') return tTime >= yestStart && tTime < todayStart;
      if (filt === 'month') return tTime >= monthStart;
      if ((filt === 'range' || filt === 'custom') && sDate) {
        var sp = sDate.split('-');
        var sStart = new Date(parseInt(sp[0],10), parseInt(sp[1],10)-1, parseInt(sp[2],10), 0, 0, 0).getTime();
        var ep = (eDate || sDate).split('-');
        var eEnd = new Date(parseInt(ep[0],10), parseInt(ep[1],10)-1, parseInt(ep[2],10), 23, 59, 59, 999).getTime();
        return tTime >= sStart && tTime <= eEnd;
      }
      return true;
    }

    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var rowDate = getCol(row, ['data/hora', 'data', 'timestamp']);
      if (!matchesFilter(rowDate, filter, targetDate, startDateParam, endDateParam)) continue;

      var rawSession = String(getCol(row, ['sessão (id)', 'sessão', 'sessao', 'session', 'sessao (id)']) || '').trim();
      var event = String(getCol(row, ['evento', 'event']) || '').trim();
      var stepIdx = String(getCol(row, ['etapa', 'step']) || '').trim();
      var leadName = String(getCol(row, ['nome', 'cliente']) || '').trim();
      var leadPhone = String(getCol(row, ['whatsapp', 'telefone', 'phone']) || '').trim();
      var leadEmail = String(getCol(row, ['email', 'e-mail']) || '').trim();
      var points = getCol(row, ['pontos / score', 'pontos', 'score']);
      var src = String(getCol(row, ['src', 'src (rastreamento)', 'sck']) || '').trim();
      var utmSrc = String(getCol(row, ['utm_source', 'source']) || '').trim();
      var utmCmp = String(getCol(row, ['utm_campaign', 'campaign']) || '').trim();
      var saleStatus = String(getCol(row, ['status venda', 'status', 'status_venda']) || '').toLowerCase().trim();
      var saleValRaw = getCol(row, ['valor (r$)', 'valor', 'sale_amount', 'total_price']);
      var payMethod = String(getCol(row, ['método', 'metodo', 'payment_method', 'forma pagamento']) || 'PIX').trim();
      var platform = String(getCol(row, ['plataforma', 'platform', 'gateway']) || '').trim();
      var product = String(getCol(row, ['quiz / produto', 'produto', 'product']) || '').trim();

      var saleVal = 0;
      if (typeof saleValRaw === 'number') saleVal = saleValRaw;
      else if (saleValRaw) {
        var cleanV = String(saleValRaw).replace(/[^\d,\.]/g, '').replace(',', '.');
        saleVal = parseFloat(cleanV) || 0;
      }

      var sessionKey = rawSession;
      if (!sessionKey) {
        var timeCluster = rowDate ? Utilities.formatDate(new Date(rowDate), "GMT", "yyyy-MM-dd_HH") + '_' + Math.floor(new Date(rowDate).getMinutes() / 15) : ('leg_' + i);
        sessionKey = (leadPhone || leadEmail || 'visitante') + '_' + timeCluster;
      }

      // Funil: Etapas do Quiz
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
      if (event === 'Quiz_Concluido' || event === 'Oferta_Visualizada') uniqueCompletions[sessionKey] = true;

      // Funil: Checkout Iniciado
      if (event === 'Checkout_Iniciado' || event === 'InitiateCheckout') {
        if (!stepVisitors['step_checkout']) stepVisitors['step_checkout'] = {};
        stepVisitors['step_checkout'][sessionKey] = true;
        uniqueCheckouts[sessionKey] = true;
      }

      // Funil e Métricas: Vendas Kirvano & PerfectPay
      var isSaleApproved = (event === 'Venda_Aprovada' || saleStatus === 'approved' || saleStatus === 'aprovado' || saleStatus === 'paid');
      var isSalePending = (event === 'Aguardando_Pagamento' || saleStatus === 'waiting_payment' || saleStatus === 'pending' || saleStatus === 'billet_printed' || saleStatus === 'pix_generated');

      if (isSaleApproved || isSalePending) {
        var ordKey = (rawSession ? (platform + '_' + rawSession) : '') || ((leadPhone || leadEmail || leadName) + '_' + Math.round(saleVal) + '_' + (platform || 'gw'));
        var originTag = src ? ('SRC: ' + src) : [utmSrc, utmCmp].filter(Boolean).join(' / ');
        var formattedVal = 'R$ ' + saleVal.toFixed(2).replace('.', ',');

        if (!ordersMap[ordKey]) {
          ordersMap[ordKey] = {
            id: rawSession || sessionKey || ('ord_' + i),
            date: rowDate ? Utilities.formatDate(new Date(rowDate), Session.getScriptTimeZone() || "GMT-3", "dd/MM/yyyy HH:mm") : '',
            name: leadName || 'Cliente',
            whatsapp: leadPhone || '',
            email: leadEmail || '',
            amount: saleVal,
            amountFormatted: formattedVal,
            method: payMethod || 'PIX',
            status: isSaleApproved ? 'approved' : 'waiting_payment',
            platform: platform || (event.indexOf('Kirvano') !== -1 ? 'Kirvano' : 'PerfectPay'),
            product: product || 'Oferta',
            src: src || '-',
            utm: originTag || '-',
            sessionKey: sessionKey
          };
        } else {
          // Se o pedido já existia (ex: Pix gerado) e agora veio a linha de pagamento aprovado, promove para Aprovado!
          if (isSaleApproved && ordersMap[ordKey].status !== 'approved') {
            ordersMap[ordKey].status = 'approved';
            if (rowDate) {
              ordersMap[ordKey].date = Utilities.formatDate(new Date(rowDate), Session.getScriptTimeZone() || "GMT-3", "dd/MM/yyyy HH:mm");
            }
            if (saleVal > 0) {
              ordersMap[ordKey].amount = saleVal;
              ordersMap[ordKey].amountFormatted = formattedVal;
            }
            if (payMethod) ordersMap[ordKey].method = payMethod;
            if (src && (!ordersMap[ordKey].src || ordersMap[ordKey].src === '-')) ordersMap[ordKey].src = src;
          }
        }
      }

      // Leads capturados no formulário do quiz
      if (leadName || leadPhone || leadEmail) {
        var lKey = leadPhone || leadEmail || (leadName + '_' + sessionKey);
        if (!leadsMap[lKey] && !isSaleApproved && !isSalePending) {
          leadsMap[lKey] = true;
          var originTag2 = src ? ('SRC: ' + src) : [utmSrc, utmCmp].filter(Boolean).join(' / ');
          recentLeads.unshift({
            date: rowDate ? Utilities.formatDate(new Date(rowDate), Session.getScriptTimeZone() || "GMT-3", "dd/MM/yyyy HH:mm") : '',
            name: leadName || 'Anônimo', whatsapp: leadPhone || '', email: leadEmail || '', score: points || 0, src: src || '-', utm: originTag2 || '-'
          });
        }
      }
    }

    for (var oKey in ordersMap) {
      var ord = ordersMap[oKey];
      if (ord.status === 'approved') {
        totalSalesApproved++;
        revenueApproved += ord.amount;
        if (!stepVisitors['step_sales']) stepVisitors['step_sales'] = {};
        if (ord.sessionKey) stepVisitors['step_sales'][ord.sessionKey] = true;
      } else {
        totalSalesPending++;
        revenuePending += ord.amount;
      }
      orders.unshift(ord);
    }

    var stepViews = {};
    for (var sKey in stepVisitors) stepViews[sKey] = Object.keys(stepVisitors[sKey]).length;
    if (recentLeads.length > 100) recentLeads = recentLeads.slice(0, 100);
    if (orders.length > 100) orders = orders.slice(0, 100);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      totalStarts: Object.keys(uniqueStarts).length,
      totalCompletions: Object.keys(uniqueCompletions).length,
      totalCheckouts: Object.keys(uniqueCheckouts).length,
      totalSalesApproved: totalSalesApproved,
      revenueApproved: revenueApproved,
      totalSalesPending: totalSalesPending,
      revenuePending: revenuePending,
      totalLeads: Object.keys(leadsMap).length,
      stepViews: stepViews,
      recentLeads: recentLeads,
      orders: orders,
      lastUpdated: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. GRAVAÇÃO DOS DADOS (Receptor Universal: QuizForge + Webhook Kirvano + Webhook PerfectPay)
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastCol = sheet.getLastColumn();
    var expectedHeaders = ['Data/Hora', 'Sessão (ID)', 'Evento', 'Quiz / Produto', 'Etapa', 'Status Venda', 'Valor (R$)', 'Método', 'Plataforma', 'Nome', 'WhatsApp', 'Email', 'SRC', 'UTM_Source', 'UTM_Campaign', 'UTM_Medium', 'UTM_Content', 'Meta CAPI'];

    if (lastCol === 0) {
      sheet.appendRow(expectedHeaders);
      sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold').setBackground('#e2e8f0');
      sheet.setFrozenRows(1);
      lastCol = expectedHeaders.length;
    } else {
      var curHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      for (var h = 0; h < expectedHeaders.length; h++) {
        var hName = expectedHeaders[h];
        var found = curHeaders.some(function(cur) { return String(cur).trim().toLowerCase() === hName.toLowerCase(); });
        if (!found) {
          lastCol++;
          sheet.getRange(1, lastCol).setValue(hName).setFontWeight('bold').setBackground('#e2e8f0');
        }
      }
      SpreadsheetApp.flush();
    }

    var raw = (e.postData && e.postData.contents) ? e.postData.contents : '';
    var data = {};
    try {
      data = JSON.parse(raw);
      if (data.request && typeof data.request.body === 'string') {
        try { data = JSON.parse(data.request.body); } catch(p) {}
      }
    } catch(errJson) {
      data = e.parameter || {};
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var colMap = {};
    for (var c = 0; c < headers.length; c++) colMap[String(headers[c] || '').trim().toLowerCase()] = c;
    var newRow = new Array(headers.length);
    for (var k = 0; k < newRow.length; k++) newRow[k] = '';
    function setVal(candidates, val) {
      for (var j = 0; j < candidates.length; j++) {
        var idx = colMap[candidates[j].toLowerCase()];
        if (idx !== undefined) { newRow[idx] = val; return; }
      }
    }

    setVal(['data/hora', 'data', 'timestamp'], new Date());

    // CASO A: WEBHOOK DA KIRVANO
    if (data.sale_id || data.checkout_id || data.event === 'SALE_APPROVED' || (data.fiscal && data.fiscal.total_value !== undefined)) {
      var isApproved = (data.status === 'APPROVED' || data.event === 'SALE_APPROVED' || data.event === 'ORDER_PAID');
      var isWaiting = (data.status === 'WAITING_PAYMENT' || data.event === 'WAITING_PAYMENT' || data.event === 'PIX_GENERATED' || data.event === 'ORDER_WAITING_PAYMENT');
      var statusStr = isApproved ? 'approved' : (isWaiting ? 'waiting_payment' : (data.status || ''));
      var eventStr = isApproved ? 'Venda_Aprovada' : 'Aguardando_Pagamento';
      var cust = data.customer || {};
      var utmsK = data.utm || {};
      var amountVal = (data.fiscal && data.fiscal.total_value) || (data.total_price ? parseFloat(String(data.total_price).replace(/[^\d,\.]/g, '').replace(',', '.')) : 0);
      var prodName = (data.products && data.products[0] && data.products[0].name) || 'Kirvano Oferta';

      setVal(['sessão (id)', 'sessão', 'sessao'], data.sale_id || ('kirv_' + Date.now()));
      setVal(['evento', 'event'], eventStr);
      setVal(['quiz / produto', 'produto'], prodName);
      setVal(['status venda', 'status_venda', 'status'], statusStr);
      setVal(['valor (r$)', 'valor'], amountVal);
      setVal(['método', 'metodo'], data.payment_method || (data.payment && data.payment.method) || 'PIX');
      setVal(['plataforma', 'platform'], 'Kirvano');
      setVal(['nome', 'cliente'], cust.name || '');
      setVal(['whatsapp', 'telefone'], cust.phone_number || '');
      setVal(['email', 'e-mail'], cust.email || '');
      setVal(['src', 'sck'], utmsK.src || utmsK.sck || '');
      setVal(['utm_source', 'source'], utmsK.utm_source || '');
      setVal(['utm_campaign', 'campaign'], utmsK.utm_campaign || '');
      setVal(['utm_medium', 'medium'], utmsK.utm_medium || '');
      setVal(['utm_content', 'content'], utmsK.utm_content || '');

      // Disparo Meta CAPI exclusivo para vendas aprovadas (Elimina Pix pendente)
      if (isApproved) {
        var capiResK = sendMetaCapiPurchase({
          orderId: data.sale_id || ('kirv_' + Date.now()),
          amount: amountVal,
          productName: prodName,
          name: cust.name || '',
          email: cust.email || '',
          phone: cust.phone_number || ''
        });
        setVal(['meta capi', 'capi'], capiResK.success ? 'Enviado (Purchase)' : ('Erro: ' + (capiResK.error || capiResK.code || capiResK.reason)));
      }

      sheet.appendRow(newRow);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', platform: 'Kirvano' })).setMimeType(ContentService.MimeType.JSON);
    }

    // CASO B: WEBHOOK DA PERFECTPAY
    if (data.sale_status_enum_key !== undefined || data.sale_amount !== undefined || (data.code && String(data.code).indexOf('PP') === 0) || data.webhook_owner) {
      var isAppP = (data.sale_status_enum === 2 || data.sale_status_enum_key === 'approved' || data.sale_status_detail === 'approved');
      var isWaitP = (data.sale_status_enum === 1 || data.sale_status_enum_key === 'waiting_payment' || data.sale_status_enum_key === 'billet_printed' || data.sale_status_detail === 'waiting_payment');
      var statusStrP = isAppP ? 'approved' : (isWaitP ? 'waiting_payment' : (data.sale_status_enum_key || ''));
      var eventStrP = isAppP ? 'Venda_Aprovada' : 'Aguardando_Pagamento';
      var custP = data.customer || {};
      var metaP = data.metadata || {};
      var amountValP = data.sale_amount || (data.plan && data.plan.sale_amount) || 0;
      var prodNameP = (data.product && data.product.name) || (data.plan && data.plan.name) || 'PerfectPay Oferta';
      var phoneP = custP.phone_formated_ddi || custP.phone_formated || custP.phone_number || '';

      setVal(['sessão (id)', 'sessão', 'sessao'], data.code || ('pp_' + Date.now()));
      setVal(['evento', 'event'], eventStrP);
      setVal(['quiz / produto', 'produto'], prodNameP);
      setVal(['status venda', 'status_venda', 'status'], statusStrP);
      setVal(['valor (r$)', 'valor'], amountValP);
      setVal(['método', 'metodo'], data.payment_type_enum_key || 'pix');
      setVal(['plataforma', 'platform'], 'PerfectPay');
      setVal(['nome', 'cliente'], custP.full_name || custP.name || '');
      setVal(['whatsapp', 'telefone'], phoneP);
      setVal(['email', 'e-mail'], custP.email || '');
      setVal(['src', 'sck'], metaP.src || metaP.sck || '');
      setVal(['utm_source', 'source'], metaP.utm_source || '');
      setVal(['utm_campaign', 'campaign'], metaP.utm_campaign || '');
      setVal(['utm_medium', 'medium'], metaP.utm_medium || '');
      setVal(['utm_content', 'content'], metaP.utm_content || '');

      // Disparo Meta CAPI exclusivo para vendas aprovadas (Elimina Pix pendente)
      if (isAppP) {
        var capiResP = sendMetaCapiPurchase({
          orderId: data.code || ('pp_' + Date.now()),
          amount: amountValP,
          productName: prodNameP,
          name: custP.full_name || custP.name || '',
          email: custP.email || '',
          phone: phoneP
        });
        setVal(['meta capi', 'capi'], capiResP.success ? 'Enviado (Purchase)' : ('Erro: ' + (capiResP.error || capiResP.code || capiResP.reason)));
      }

      sheet.appendRow(newRow);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', platform: 'PerfectPay' })).setMimeType(ContentService.MimeType.JSON);
    }

    // CASO C: DISPARO PADRÃO DO QUIZFORGE
    var utms = data.utms || {};
    var src = data.src || utms.src || utms.sck || utms.SRC || utms.SCK || '';
    setVal(['sessão (id)', 'sessão', 'sessao'], data.sessionId || '');
    setVal(['evento', 'event'], data.event || '');
    setVal(['quiz / produto', 'quiz'], data.quizTitle || '');
    setVal(['etapa', 'step'], (data.data && data.data.stepIndex) || '');
    setVal(['nome', 'leadname'], (data.lead && data.lead.name) || '');
    setVal(['whatsapp', 'telefone', 'phone'], (data.lead && data.lead.whatsapp) || '');
    setVal(['email', 'e-mail'], (data.lead && data.lead.email) || '');
    setVal(['src', 'sck'], src);
    setVal(['utm_source', 'source'], data.utm_source || utms.utm_source || '');
    setVal(['utm_campaign', 'campaign'], data.utm_campaign || utms.utm_campaign || '');
    setVal(['utm_medium', 'medium'], data.utm_medium || utms.utm_medium || '');
    setVal(['utm_content', 'content'], data.utm_content || utms.utm_content || '');
    sheet.appendRow(newRow);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', platform: 'QuizForge' })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
