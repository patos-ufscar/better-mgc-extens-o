document.addEventListener('DOMContentLoaded', () => {
  const runButton = document.getElementById('injetarMacro');

  runButton.addEventListener('click', () => {
    runScraping();
  });

  function runScraping(){
    console.log('Iniciando macro para cálculo de custos...');
    const vmUrl = 'https://console.magalu.cloud/virtual-machine';

    chrome.tabs.create({ url: vmUrl, active: false }, (tab) => {
      chrome.tabs.move(tab.id, { index: 0 });
    });

    //window.close();
  }
});