// Fonction pour vérifier si l'URL actuelle est surveillée et obtenir sa configuration
async function getUrlConfig() {
    const result = await chrome.storage.local.get('urlConfigs');
    console.log('getUrlConfig');
    console.log(result);
    
    if (!result.urlConfigs) {
        return null;
    }
    
    // Extraire le nom de domaine de l'URL actuelle
    const currentUrl = window.location.href;
    const currentDomain = new URL(currentUrl).hostname;
    console.log('Current domain:', currentDomain);
    
    // Trouver la configuration correspondante au domaine actuel
    for (const [urlPattern, config] of Object.entries(result.urlConfigs)) {
        // Extraire le nom de domaine du pattern
        let patternDomain;
        try {
            // Si le pattern est une URL complète
            patternDomain = new URL(urlPattern).hostname;
        } catch {
            // Si le pattern est juste un nom de domaine
            patternDomain = urlPattern;
        }
        console.log('Pattern domain:', patternDomain);
        
        if (patternDomain === currentDomain) {
            return config;
        }
    }
    
    return null;
}

// Fonction pour extraire les données selon la configuration
async function extractData() {
    // Obtenir la configuration pour l'URL actuelle
    const config = await getUrlConfig();
    
    if (!config) {
        console.log('Aucune configuration trouvée pour cette URL');
        return;
    }

    const extractedData = {};
    
    console.log('config');
    console.log(config);
    
    // Parcourir les sélecteurs de la configuration
    for (const [key, selector] of Object.entries(config.selectors)) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            extractedData[key] = Array.from(elements).map(el => el.textContent);
        }
    }

    // Extraire les données des éléments qtext et fieldset
    const responseForm = document.querySelector('#responseform');
    if (responseForm) {
        const qtextElements = responseForm.querySelectorAll('.qtext');
        if (qtextElements.length > 0) {
            extractedData.generated = Array.from(qtextElements).map(qtextEl => {
                const fieldsetEl = qtextEl.nextElementSibling;
                const answerDiv = fieldsetEl ? fieldsetEl.querySelector('.answer') : null;
                return {
                    qtext: qtextEl.textContent,
                    fieldset: answerDiv ? answerDiv.textContent : ''
                };
            });
        }
    }

    // Envoyer les données extraites au background script
    chrome.runtime.sendMessage({
        type: 'DATA_EXTRACTED',
        data: extractedData,
        url: window.location.href
    });
}

// Exécuter l'extraction au chargement de la page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        extractData();
    });
} else {
    // Le DOM est déjà chargé, exécuter directement
    extractData();
}

// Écouter les messages du background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('onMessage');
    console.log(message);
    
    if (message.type === 'EXTRACT_DATA') {
        extractData();
    }
});

// Écouter les messages du popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('onMessage popup');
    console.log(request);

    if (request.type === 'EXTRACT_BODY_CONTENT') {
        // Extraire uniquement le texte du body
        const bodyText = document.body.textContent;
        
        // Créer l'objet de données
        const data = {
            url: window.location.href,
            timestamp: new Date().toISOString(),
            html: bodyText
        };

        // Sauvegarder dans l'historique
        chrome.storage.local.get('extractionHistory', (result) => {
            const history = result.extractionHistory || [];
            history.unshift(data); // Ajouter au début du tableau
            
            // Limiter l'historique à 100 entrées
            if (history.length > 100) {
                history.pop();
            }
            
            chrome.storage.local.set({ extractionHistory: history }, () => {
                alert('Données extraites et sauvegardées avec succès !');
            });
        });

        sendResponse({ success: true });
    }
}); 
