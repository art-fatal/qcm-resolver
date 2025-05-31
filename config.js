// Structure de données pour stocker les configurations
let urlConfigs = {};

// Charger les configurations existantes
chrome.storage.local.get('urlConfigs', (result) => {
    if (result.urlConfigs) {
        urlConfigs = result.urlConfigs;
        updateConfigDisplay();
    }
});

// Ajouter une nouvelle URL
document.getElementById('addUrl').addEventListener('click', () => {
    const urlInput = document.getElementById('newUrlInput');
    const url = urlInput.value.trim();
    
    if (url && !urlConfigs[url]) {
        urlConfigs[url] = {
            selectors: {}
        };
        urlInput.value = '';
        updateConfigDisplay();
    }
});

// Mettre à jour l'affichage des configurations
function updateConfigDisplay() {
    const container = document.getElementById('urlConfigs');
    container.innerHTML = '';
    
    for (const [url, config] of Object.entries(urlConfigs)) {
        const urlConfig = document.createElement('div');
        urlConfig.className = 'url-config';
        urlConfig.dataset.url = url;
        
        urlConfig.innerHTML = `
            <div class="url-header">
                <div class="url-title">${url}</div>
                <button class="delete delete-url" data-url="${url}">Supprimer URL</button>
            </div>
            <div class="selector-list">
                ${Object.entries(config.selectors).map(([key, selector]) => `
                    <div class="selector-item" data-url="${url}" data-key="${key}">
                        <span>${key}: ${selector}</span>
                        <div>
                            <button class="edit-selector" data-url="${url}" data-key="${key}" data-selector="${selector}">Éditer</button>
                            <button class="delete delete-selector" data-url="${url}" data-key="${key}">Supprimer</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="add-selector">
                <input type="text" class="key-input" data-url="${url}" placeholder="Nom du champ">
                <input type="text" class="selector-input" data-url="${url}" placeholder="Sélecteur CSS">
                <button class="add-selector-btn" data-url="${url}">Ajouter sélecteur</button>
            </div>
        `;
        
        container.appendChild(urlConfig);
    }

    // Ajouter les gestionnaires d'événements
    setupEventListeners();
}

// Configurer les gestionnaires d'événements
function setupEventListeners() {
    // Gestionnaire pour les boutons de suppression d'URL
    document.querySelectorAll('.delete-url').forEach(button => {
        button.addEventListener('click', (e) => {
            const url = e.target.dataset.url;
            deleteUrl(url);
        });
    });

    // Gestionnaire pour les boutons de suppression de sélecteur
    document.querySelectorAll('.delete-selector').forEach(button => {
        button.addEventListener('click', (e) => {
            const { url, key } = e.target.dataset;
            deleteSelector(url, key);
        });
    });

    // Gestionnaire pour les boutons d'édition de sélecteur
    document.querySelectorAll('.edit-selector').forEach(button => {
        button.addEventListener('click', (e) => {
            const { url, key, selector } = e.target.dataset;
            editSelector(url, key, selector);
        });
    });

    // Gestionnaire pour les boutons d'ajout de sélecteur
    document.querySelectorAll('.add-selector-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const url = e.target.dataset.url;
            addSelector(url);
        });
    });
}

// Ajouter un sélecteur à une URL
function addSelector(url) {
    const urlConfig = document.querySelector(`.url-config[data-url="${url}"]`);
    const keyInput = urlConfig.querySelector('.key-input');
    const selectorInput = urlConfig.querySelector('.selector-input');
    
    const key = keyInput.value.trim();
    const selector = selectorInput.value.trim();
    
    if (key && selector) {
        urlConfigs[url].selectors[key] = selector;
        keyInput.value = '';
        selectorInput.value = '';
        updateConfigDisplay();
    }
}

// Éditer un sélecteur
function editSelector(url, key, selector) {
    const urlConfig = document.querySelector(`.url-config[data-url="${url}"]`);
    const keyInput = urlConfig.querySelector('.key-input');
    const selectorInput = urlConfig.querySelector('.selector-input');
    
    keyInput.value = key;
    selectorInput.value = selector;
    
    // Supprimer l'ancien sélecteur
    delete urlConfigs[url].selectors[key];
    
    // Mettre à jour l'affichage
    updateConfigDisplay();
}

// Supprimer un sélecteur
function deleteSelector(url, key) {
    delete urlConfigs[url].selectors[key];
    updateConfigDisplay();
}

// Supprimer une URL
function deleteUrl(url) {
    delete urlConfigs[url];
    updateConfigDisplay();
}

// Sauvegarder toutes les configurations
document.getElementById('saveAll').addEventListener('click', () => {
    chrome.storage.local.set({ urlConfigs }, () => {
        alert('Configurations sauvegardées !');
    });
});

// Exporter les données
document.getElementById('exportData').addEventListener('click', () => {
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
            alert('Aucune donnée à exporter');
        }
    });
}); 