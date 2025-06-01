// Log au démarrage du service worker
console.log('Background service worker started');

// Stocker les données extraites
let extractedData = {};

//const serverUrl = 'https://qcm-resolver-server.onrender.com/api';
const serverUrl = 'http://localhost:3000/api';

// Écouter les messages du content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'DATA_EXTRACTED') {
        try {
            // Stocker les données extraites avec l'URL comme clé
            extractedData[message.url] = message.data;
            // Envoyer les données au serveur
            fetch(serverUrl + '/data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: message.url,
                    data: message.data,
                    timestamp: Date.now()
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erreur lors de l\'envoi des données au serveur');
                }
                console.log('Données envoyées au serveur avec succès');
            })
            .catch(error => {
                console.error('Erreur lors de l\'envoi des données:', error);
            });
            
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

// Écouter les messages du content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'BODY_CONTENT_EXTRACTED') {
        console.log('BODY_CONTENT_EXTRACTED');
        console.log(message);
        try {
            // Envoyer les données au serveur
            fetch(serverUrl + '/extract-quiz', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: message.url,
                    ...message.data,
                    timestamp: Date.now()
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erreur lors de l\'envoi des données au serveur');
                }
                console.log('Données envoyées au serveur avec succès');
            })
            .catch(error => {
                console.error('Erreur lors de l\'envoi des données:', error);
            });
            
        } catch (error) {
            console.error('Error processing BODY_CONTENT_EXTRACTED:', error);
        }
    }
});

// Écouter les messages du content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXTRACT_BODY_CONTENT_REQUEST') {
        console.log('EXTRACT_BODY_CONTENT_REQUEST');
        // Get the current tab and send message to content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentTab = tabs[0];
            if (currentTab) {
                chrome.tabs.sendMessage(currentTab.id, { type: 'EXTRACT_BODY_CONTENT' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log('Error extracting data. Make sure the page is fully loaded.');
                    }
                });
            }
        });
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
