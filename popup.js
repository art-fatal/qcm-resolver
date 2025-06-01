// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', () => {
    // Ouvrir la page de configuration
    const openConfigButton = document.getElementById('openConfig');
    if (openConfigButton) {
        openConfigButton.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
    }

    // Ouvrir l'historique
    const openHistoryButton = document.getElementById('openHistory');
    if (openHistoryButton) {
        openHistoryButton.addEventListener('click', () => {
            chrome.tabs.create({ url: 'history.html' });
        });
    }

    // Extraire les données
    const extractDataButton = document.getElementById('extractData');
    if (extractDataButton) {
        extractDataButton.addEventListener('click', () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const currentTab = tabs[0];
                chrome.tabs.sendMessage(currentTab.id, { type: 'EXTRACT_BODY_CONTENT' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log('Erreur lors de l\'extraction des données. Assurez-vous que la page est complètement chargée.');
                    }
                });
            });
        });
    }

    // Exporter les données
    const exportDataButton = document.getElementById('exportData');
    if (exportDataButton) {
        exportDataButton.addEventListener('click', () => {
            chrome.storage.local.get('extractedData', (result) => {
                if (result.extractedData) {
                    const dataStr = JSON.stringify(result.extractedData, null, 2);
                    const blob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'extracted_data.json';
                    a.click();
                    
                    URL.revokeObjectURL(url);
                } else {
                    console.log('Aucune donnée à exporter');
                }
            });
        });
    }
}); 