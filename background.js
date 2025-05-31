// Log au démarrage du service worker
console.log('Background service worker started');

// Stocker les données extraites
let extractedData = {};

// Écouter les messages du content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background script received message:', message);
    
    if (message.type === 'DATA_EXTRACTED') {
        try {
            // Stocker les données extraites avec l'URL comme clé
            extractedData[message.url] = message.data;
            
            // Ajouter à l'historique existant
            chrome.storage.local.get('extractionHistory', (result) => {
                const history = result.extractionHistory || [];
                const historyEntry = {
                    url: message.url,
                    timestamp: Date.now(),
                    html: JSON.stringify(message.data)
                };
                history.unshift(historyEntry); // Ajouter au début du tableau
                
                // Limiter l'historique à 100 entrées
                if (history.length > 100) {
                    history.pop();
                }
                
                // Sauvegarder dans le stockage local
                chrome.storage.local.set({ 
                    extractionHistory: history 
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Error saving data:', chrome.runtime.lastError);
                        return;
                    }
                    
                    console.log('Data and history saved successfully');
                    // Envoyer une confirmation au content script
                    if (sender.tab) {
                        chrome.tabs.sendMessage(sender.tab.id, {
                            type: 'DATA_SAVED',
                            success: true
                        }).catch(error => {
                            console.error('Error sending confirmation:', error);
                        });
                    }
                });
            });
        } catch (error) {
            console.error('Error processing DATA_EXTRACTED:', error);
        }
    }
});

// Écouter les erreurs du service worker
self.addEventListener('error', (event) => {
    console.error('Service worker error:', event.error);
});

// Écouter les rejets de promesses non gérés
self.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
