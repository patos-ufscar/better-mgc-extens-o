log('Ativo. Aguardando dados de custo...');

function displayCostPanel(mgcCost) {
  let panel = document.getElementById('better-mgc-panel');

  setTimeout(() => {
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'better-mgc-panel';
      Object.assign(panel.style, {
        // Estilos para o painel
        backgroundColor: '#1a202c',
        color: 'white',
        padding: '15px',
        borderRadius: '8px',
        zIndex: '9999',
        fontSize: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        marginTop: '20px',
        marginBottom: '20px'
      });

      const targetH2 = Array.from(document.querySelectorAll('h2')).find(h2 => 
        h2.textContent.toLowerCase().includes('console')
      );

      if (targetH2) {
        // Se o H2 for encontrado, injeta o painel após ele.
        targetH2.parentNode.insertBefore(panel, targetH2.nextSibling);
        log('Painel injetado após o H2 "Console".');
      } else {
        // Fallback: se o H2 não for encontrado após o atraso, anexa ao corpo do documento.
        log('H2 "Console" (ou similar) não encontrado. Anexando ao body.');
        document.body.appendChild(panel);
      }
    }

    panel.innerHTML = `Estimativa de Custo Mensal (VMs): <strong style="font-size: 1.2em; color: #48bb78;">R$ ${mgcCost}</strong>`;
  }, 1000);
}

setInterval(() => {
  chrome.storage.local.get(['mgcCost'], (result) => {
    const mgcCost = result.mgcCost || 0;
    displayCostPanel(mgcCost);
  });
}, 2000);

async function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[BetterMGC Console] [${timestamp}] ${message}`);
}