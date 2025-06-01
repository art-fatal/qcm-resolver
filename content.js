// Fonction pour vérifier si l'URL actuelle est surveillée et obtenir sa configuration
async function getUrlConfig() {
    const result = await chrome.storage.local.get('urlConfigs');
    if (!result.urlConfigs) {
        return null;
    }
    
    // Extraire le nom de domaine de l'URL actuelle
    const currentUrl = window.location.href;
    const currentDomain = new URL(currentUrl).hostname;
    
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

    // Send message to background script to handle tab query
    chrome.runtime.sendMessage({
        type: 'EXTRACT_BODY_CONTENT_REQUEST'
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
    if (message.type === 'EXTRACT_DATA') {
        extractData();
    }
});

// Écouter les messages du popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'EXTRACT_BODY_CONTENT') {
        // Recherche hiérarchique du contenu
        let content = '';
        
        // 1. Chercher l'élément avec l'id page-content
        const pageContent = document.getElementById('page-content');
        if (pageContent) {
            content = pageContent.textContent;
        } else {
            // 2. Chercher l'élément avec l'id main-container
            const mainContainer = document.getElementById('main-container');
            if (mainContainer) {
                content = mainContainer.textContent;
            } else {
                // 3. Chercher l'élément avec l'id page
                const page = document.getElementById('page');
                if (page) {
                    content = page.textContent;
                } else {
                    // 4. Chercher tous les formulaires dans le body
                    const forms = document.body.querySelectorAll('form');
                    if (forms.length > 0) {
                        // Concaténer le contenu de tous les formulaires
                        content = Array.from(forms)
                            .map(form => cleanText(form.textContent))
                            .join('\n---\n'); // Séparateur entre les formulaires
                    } else {
                        // 5. Utiliser le contenu du body comme fallback
                        content = cleanText(document.body.textContent);
                    }
                }
            }
        }
        
        // Nettoyer le contenu final
        content = cleanText(content);
        
        // Envoyer les données extraites au background script
        chrome.runtime.sendMessage({
            type: 'BODY_CONTENT_EXTRACTED',
            data: {html: content},
            url: window.location.href
        });

        sendResponse({ success: true });
    }
});

// Fonction pour nettoyer le texte
function cleanText(text) {
    return text
        .replace(/\s+/g, ' ')  // Remplace tous les espaces multiples par un seul espace
        .replace(/\n\s*\n/g, '\n')  // Remplace les lignes vides multiples par une seule
        .trim();  // Supprime les espaces au début et à la fin
} 
