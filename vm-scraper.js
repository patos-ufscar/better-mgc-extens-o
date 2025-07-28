log('Ativado. Iniciando espera inteligente pela tabela de VMs...');

const CSV_PRICES_URL = 'https://magalu.cloud/wp-content/uploads/Prices_VirtualMachines.csv';

let currentPriceMap = {};

async function fetchAndParseCsvPrices() {
  log('Buscando o CSV de preços atualizados...');
  try {
    const response = await fetch(CSV_PRICES_URL);
    if (!response.ok) {
      throw new Error(`Erro HTTP ao buscar o CSV: ${response.status} ${response.statusText}`);
    }
    const csvText = await response.text();
    
    const lines = csvText.trim().split('\n');
    const header = lines[0].split(',');
    
    const typeIndex = header.indexOf('Tipos');
    const priceIndex = header.indexOf('Preco');
    const osIndex = header.indexOf('SistemaOperacional');

    const newPriceMap = {};
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

      let vmType = row[typeIndex] ? row[typeIndex].replace(/"/g, '').trim() : '';
      let price = row[priceIndex] ? row[priceIndex].replace(/"/g, '').trim() : '';
      let OS = row[osIndex] ? row[osIndex].replace(/"/g, '').trim() : '';

      price = sanitizePrice(price);

      if (OS.toLowerCase() == 'windows') {
        vmType = `W${vmType}`;
      }

      if (vmType && !isNaN(price)) {
        newPriceMap[vmType] = price;
      }
    }
    log('CSV de preços carregado e processado com sucesso.');
    return newPriceMap;

  } catch (error) {
    log('Erro ao carregar ou processar o CSV de preços:', error);
    return {};
  }
}
function sanitizePrice(raw) {
  let price = raw.replace(/[R$\s"]/g, '');

  const lastDotIndex = price.lastIndexOf('.'); // Gambi!! Ja que a tabela está completamente errada em como formatar os preços

  if (lastDotIndex !== -1) {
    const centsPart = price.slice(lastDotIndex + 1);
    if (/^\d{2}$/.test(centsPart)) {
      const before = price.slice(0, lastDotIndex).replace(/\./g, '');
      price = `${before}.${centsPart}`;
    } else {
      price = price.replace(/\./g, '');
    }
  }

  return parseFloat(price);
}

document.title = 'Better MGC - Scraper Ativo';

const INITIAL_DELAY = 4000;

const CHECK_INTERVAL = 500;
const STABILIZATION_TIME = 3000;
const GLOBAL_TIMEOUT = 20000;

let lastRowCount = -1;
let stabilizationTimer = null;

log(`Aguardando ${INITIAL_DELAY / 1000} segundos antes de iniciar a automação...`);

setTimeout(() => {
  iniciarMonitoramentoTabela();
}, INITIAL_DELAY);

function iniciarMonitoramentoTabela() {
  const checkIntervalId = setInterval(() => {
    const currentRowCount = document.querySelectorAll('tbody tr').length;

    if (currentRowCount > lastRowCount) {
      log(`Tabela está carregando... Encontradas ${currentRowCount} linhas.`);
      lastRowCount = currentRowCount;
      
      clearTimeout(stabilizationTimer);
      
      stabilizationTimer = setTimeout(() => {
        log(`Tabela parece estável com ${lastRowCount} linhas. Iniciando extração...`);
        clearInterval(checkIntervalId);
        clearTimeout(globalTimeoutId);
        scrapeData(document.querySelectorAll('tbody tr'));
      }, STABILIZATION_TIME);

    }
  }, CHECK_INTERVAL);

  const globalTimeoutId = setTimeout(() => {
    clearInterval(checkIntervalId);
    clearTimeout(stabilizationTimer);
    log('TEMPO ESGOTADO. A automação foi cancelada pois a tabela não estabilizou.');
    alert('Better MGC: A automação foi cancelada pois a tabela de VMs não carregou a tempo.');
    window.close();
  }, GLOBAL_TIMEOUT);
}

async function scrapeData(rows) {
  currentPriceMap = await fetchAndParseCsvPrices();

  console.log(currentPriceMap);

  let totalCost = 0;
  const foundVms = [];
  const checkedInstances = new Set(); 

  try {
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length > 1) { 
        const instanceName = cells[2].innerText.trim();

        const instanceType = cells[1].innerText.trim();

        if (instanceType.includes('windows') || instanceType.includes('Windows')) {
          instanceName = `W${instanceName}`;
        }

        if (currentPriceMap[instanceName] !== undefined) {
            const cost = currentPriceMap[instanceName];
            totalCost += cost;
            foundVms.push({ name: instanceName, cost: cost });
            checkedInstances.add(instanceName);
            log(`Encontrada: ${instanceName} -> Custo: R$ ${cost.toFixed(2)}`);
        } else if (instanceName && !checkedInstances.has(instanceName)) {
            checkedInstances.add(instanceName);
            log(`ALERTA: A instância "${instanceName}" foi encontrada, mas não tem preço no CSV atualizado.`);
        }
      } else {
          log('AVISO: Linha da tabela ignorada (menos de 2 células).');
      }
    });

    log(`CÁLCULO FINAL: Custo total das VMs encontradas: R$ ${totalCost.toFixed(2)}`);

    verificarCusto(totalCost);

    chrome.storage.local.set({
      mgcCost: totalCost.toFixed(2),
      vmsData: foundVms,
      lastUpdated: new Date().toISOString()
    }, () => {
      log('Dados salvos. Fechando a aba.');
      window.close();
    });

  } catch (error) {
    log('Ocorreu um erro inesperado ao ler os dados:', error);
    window.close();
  }
}

async function verificarCusto(totalCost) {
  const result = await chrome.storage.sync.get('mgcCost');
  const mgcCost = result.mgcCost;

  if (totalCost === 0 || totalCost < mgcCost * 0.2) {
    log('Provavelmente houve um erro ao pegar os dados, rodando a macro novamente.');
    iniciarMonitoramentoTabela();
  }
}

async function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[BetterMGC Console] [${timestamp}] ${message}`);
}