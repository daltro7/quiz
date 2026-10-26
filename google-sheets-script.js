/**
 * SCRIPT PARA GOOGLE PLANILHAS (Google Apps Script)
 * 
 * Como configurar em 2 minutos:
 * 1. Abra o Google Sheets (planilhas) e crie uma nova planilha em branco.
 * 2. Na primeira linha (cabeçalho), escreva nas colunas:
 *    A1: Data/Hora | B1: Evento | C1: Quiz | D1: Etapa | E1: Pergunta | F1: Resposta | G1: Pontos | H1: Nome | I1: WhatsApp | J1: Email
 * 3. No menu superior da planilha, clique em: Extensões > Apps Script.
 * 4. Apague tudo o que estiver lá e cole o código abaixo.
 * 5. Clique no botão azul "Implantar" (canto superior direito) > "Nova implantação".
 * 6. Na engrenagem, escolha "App da Web".
 * 7. Em "Quem pode acessar", selecione "Qualquer pessoa" (isso evita qualquer erro de permissão).
 * 8. Clique em "Implantar" e copie a URL gerada (ela começa com https://script.google.com/macros/s/...).
 * 9. Cole essa URL no campo "URL da Planilha Google (Webhook)" dentro do Construtor de Quiz!
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    var timestamp = new Date();
    var event = data.event || '';
    var quizTitle = data.quizTitle || '';
    var stepTitle = (data.data && data.data.stepTitle) || (data.data && data.data.question) || '';
    var stepIndex = (data.data && data.data.stepIndex) || '';
    var answer = (data.data && data.data.answer) || '';
    var points = (data.data && data.data.points) !== undefined ? data.data.points : (data.totalScore || '');
    
    var leadName = (data.lead && data.lead.name) || '';
    var leadWhatsApp = (data.lead && data.lead.whatsapp) || '';
    var leadEmail = (data.lead && data.lead.email) || '';

    // Insere a nova linha no final da planilha
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
      leadEmail
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
