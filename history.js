// Charger l'historique au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    
    // Ajouter l'écouteur d'événements pour le bouton d'effacement
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
    
    // Ajouter l'écouteur d'événements pour le bouton de rafraîchissement
    document.getElementById('refreshHistoryBtn').addEventListener('click', loadHistory);
});

// Charger l'historique depuis le stockage
function loadHistory() {
    chrome.storage.local.get('extractionHistory', (result) => {
        console.log('loadHistory');
        const historyList = document.getElementById('historyList');
        const history = result.extractionHistory || [];
        
        if (history.length === 0) {
            historyList.innerHTML = '<div class="no-history">Aucun historique disponible</div>';
            return;
        }

        historyList.innerHTML = '';
        
        // Trier l'historique par date (plus récent en premier)
        history.sort((a, b) => b.timestamp - a.timestamp);
        
        history.forEach((item, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const date = new Date(item.timestamp).toLocaleString();
            
            historyItem.innerHTML = `
                <div class="history-header">
                    <div class="history-url">${item.url}</div>
                    <div class="history-date">${date}</div>
                </div>
                <div class="history-content">
                    ${(() => {
                        try {
                            const data = JSON.parse(item.html);
                            if (data.generated) {
                                return `
                                    <div class="quiz-container" data-quiz-index="${index}">
                                        <div class="quiz-actions">
                                            <button class="copy-quiz">📋 Copier le quiz</button>
                                        </div>
                                        ${data.generated.map((question, qIndex) => {
                                            const generatedQuestion = data.generated[qIndex];
                                            return `
                                                <div class="quiz-question">
                                                    <div class="question-text">${generatedQuestion.qtext}</div>
                                                    <div class="question-options">
                                                        ${generatedQuestion.fieldset.split('\n').map(option => 
                                                            option.trim() ? `<div class="option">${option}</div>` : ''
                                                        ).join('')}
                                                    </div>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                `;
                            }
                            return `<pre>${item.html}</pre>`;
                        } catch (e) {
                            return `<pre>${item.html}</pre>`;
                        }
                    })()}
                </div>
                <div class="history-actions">
                    <button class="export">Exporter</button>
                    <button class="delete">Supprimer</button>
                </div>
            `;
            
            historyList.appendChild(historyItem);
        });

        // Ajouter les écouteurs d'événements après le chargement
        addCopyButtonListeners();
    });
}

// Exporter un élément de l'historique
function exportItem(index) {
    chrome.storage.local.get('extractionHistory', (result) => {
        const history = result.extractionHistory || [];
        const item = history[index];
        
        if (item) {
            const htmlStr = item.html;
            const blob = new Blob([htmlStr], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `extraction_${new Date(item.timestamp).toISOString()}.html`;
            a.click();
            
            URL.revokeObjectURL(url);
        }
    });
}

// Supprimer un élément de l'historique
function deleteItem(index) {
    chrome.storage.local.get('extractionHistory', (result) => {
        const history = result.extractionHistory || [];
        history.splice(index, 1);
        
        chrome.storage.local.set({ extractionHistory: history }, () => {
            loadHistory();
        });
    });
}

// Fonction pour effacer tout l'historique
function clearHistory() {
    if (confirm('Êtes-vous sûr de vouloir effacer tout l\'historique ?')) {
        chrome.storage.local.set({ extractionHistory: [] }, () => {
            loadHistory();
        });
    }
}

// Fonction pour copier le contenu du quiz
function copyQuizContent(index) {
    chrome.storage.local.get('extractionHistory', (result) => {
        const history = result.extractionHistory || [];
        const item = history[index];
        
        if (item) {
            try {
                const data = JSON.parse(item.html);
                if (data.generated) {
                    const quizContent = data.generated.map((q, i) => {
                        return `${q.qtext}\n\nOptions:\n${q.fieldset}`;
                    }).join('\n\n');
                    
                    navigator.clipboard.writeText(quizContent).then(() => {
                        // Afficher une notification de succès
                        const notification = document.createElement('div');
                        notification.className = 'copy-notification';
                        notification.textContent = 'Quiz copié dans le presse-papiers !';
                        document.body.appendChild(notification);
                        
                        // Supprimer la notification après 2 secondes
                        setTimeout(() => {
                            notification.remove();
                        }, 2000);
                    }).catch(err => {
                        console.error('Erreur lors de la copie:', err);
                    });
                }
            } catch (e) {
                console.error('Erreur lors du parsing du quiz:', e);
            }
        }
    });
}

// Ajouter les écouteurs d'événements pour les boutons de copie
function addCopyButtonListeners() {
    document.querySelectorAll('.copy-quiz').forEach(button => {
        button.addEventListener('click', (e) => {
            const quizContainer = e.target.closest('.quiz-container');
            const index = quizContainer.dataset.quizIndex;
            copyQuizContent(index);
        });
    });
} 