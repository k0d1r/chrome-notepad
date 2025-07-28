// Basit ve çalışan not defteri
document.addEventListener('DOMContentLoaded', function() {
    const noteEditor = document.getElementById('noteEditor');
    const noteTitle = document.getElementById('noteTitle');
    const saveBtn = document.getElementById('saveBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const lastSaved = document.getElementById('lastSaved');
    const storageSize = document.getElementById('storageSize');
    
    // Tab elements
    const editorTab = document.getElementById('editor-tab');
    const historyTab = document.getElementById('history-tab');
    const editorContent = document.getElementById('editor-content');
    const historyContent = document.getElementById('history-content');
    const historyList = document.getElementById('historyList');
    
    let autoSaveTimeout = null;
    
    // Tab switching
    function switchTab(activeTab, activeContent) {
        // Remove active from all tabs
        document.querySelectorAll('.nav-link').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('show', 'active');
        });
        
        // Add active to selected tab
        activeTab.classList.add('active');
        activeContent.classList.add('show', 'active');
    }
    
    // Load history
    function loadHistory() {
        chrome.storage.local.get(['noteHistory'], function(result) {
            const history = result.noteHistory || [];
            
            if (history.length === 0) {
                historyList.innerHTML = `
                    <div class="text-center text-muted py-3">
                        <i class="fas fa-inbox fa-2x mb-2"></i>
                        <p class="mb-0">No saved notes yet</p>
                    </div>
                `;
                return;
            }
            
            historyList.innerHTML = history.map((item, index) => `
                <div class="history-item" data-index="${index}">
                    <div class="history-item-title">${item.title}</div>
                    <div class="history-item-date">${item.date}</div>
                    <div class="history-item-preview">${item.preview}</div>
                    <div class="history-item-actions">
                        <button class="btn btn-primary btn-sm load-note" data-index="${index}">
                            <i class="fas fa-edit"></i> Load
                        </button>
                        <button class="btn btn-danger btn-sm delete-history" data-index="${index}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
            
            // Add event listeners to history buttons
            document.querySelectorAll('.load-note').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const index = parseInt(this.dataset.index);
                    loadNoteFromHistory(index);
                });
            });
            
            document.querySelectorAll('.delete-history').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const index = parseInt(this.dataset.index);
                    deleteFromHistory(index);
                });
            });
        });
    }
    
    // Load note from history
    function loadNoteFromHistory(index) {
        chrome.storage.local.get(['noteHistory'], function(result) {
            const history = result.noteHistory || [];
            if (history[index]) {
                noteEditor.value = history[index].content;
                updateTitle();
                switchTab(editorTab, editorContent);
            }
        });
    }
    
    // Delete from history
    function deleteFromHistory(index) {
        if (confirm('Are you sure you want to delete this history record?')) {
            chrome.storage.local.get(['noteHistory'], function(result) {
                const history = result.noteHistory || [];
                history.splice(index, 1);
                chrome.storage.local.set({ noteHistory: history }, function() {
                    loadHistory();
                    updateStorageInfo();
                });
            });
        }
    }
    
    // Save to history
    function saveToHistory(content, timestamp) {
        if (!content.trim()) return;
        
        const title = content.split('\n')[0].substring(0, 30) + (content.split('\n')[0].length > 30 ? '...' : '');
        const preview = content.substring(0, 100) + (content.length > 100 ? '...' : '');
        
        const historyItem = {
            title: title || 'Untitled Note',
            date: timestamp,
            content: content,
            preview: preview
        };
        
        chrome.storage.local.get(['noteHistory'], function(result) {
            const history = result.noteHistory || [];
            
            // Add to beginning and limit to 10 items
            history.unshift(historyItem);
            if (history.length > 10) {
                history.pop();
            }
            
            chrome.storage.local.set({ noteHistory: history });
        });
    }
    
    // Storage boyutunu hesapla ve göster
    function updateStorageInfo() {
        chrome.storage.local.get(null, function(result) {
            const dataStr = JSON.stringify(result);
            const bytes = new Blob([dataStr]).size;
            const kb = (bytes / 1024).toFixed(1);
            storageSize.textContent = `${kb} KB`;
        });
    }
    
    // Başlık güncelle
    function updateTitle() {
        const content = noteEditor.value.trim();
        if (content) {
            const firstLine = content.split('\n')[0].substring(0, 20);
            noteTitle.textContent = firstLine + (firstLine.length < content.split('\n')[0].length ? '...' : '');
        } else {
            noteTitle.textContent = 'Untitled Note';
        }
    }
    
    // Not yükle
    function loadNote() {
        chrome.storage.local.get(['note', 'lastSaved'], function(result) {
            if (result.note) {
                noteEditor.value = result.note;
                updateTitle();
            }
            if (result.lastSaved) {
                lastSaved.textContent = `Last saved: ${result.lastSaved}`;
            }
            updateStorageInfo();
        });
    }
    
    // Not kaydet
    function saveNote() {
        const noteContent = noteEditor.value;
        const timestamp = new Date().toLocaleString('tr-TR');
        
        chrome.storage.local.set({
            note: noteContent,
            lastSaved: timestamp
        }, function() {
            lastSaved.textContent = `Last saved: ${timestamp}`;
            updateStorageInfo();
            
            // Save to history
            saveToHistory(noteContent, timestamp);
            
            // Kaydet butonuna başarı animasyonu
            saveBtn.innerHTML = '<i class="fas fa-check me-1"></i>Saved!';
            saveBtn.classList.add('btn-success');
            saveBtn.classList.remove('btn-primary');
            
            setTimeout(() => {
                saveBtn.innerHTML = '<i class="fas fa-save me-1"></i>Save';
                saveBtn.classList.remove('btn-success');
                saveBtn.classList.add('btn-primary');
            }, 1000);
        });
    }
    
    // Not sil
    function deleteNote() {
        if (confirm('Are you sure you want to delete this note?')) {
            chrome.storage.local.remove(['note', 'lastSaved'], function() {
                noteEditor.value = '';
                lastSaved.textContent = 'Last saved: Never';
                updateTitle();
                updateStorageInfo();
            });
        }
    }
    
    // Tema yükle
    function loadTheme() {
        chrome.storage.local.get(['theme'], function(result) {
            const theme = result.theme || 'light';
            applyTheme(theme);
        });
    }
    
    // Tema uygula
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        if (theme === 'dark') {
            themeIcon.className = 'fas fa-sun';
            themeToggle.title = 'Switch to light theme';
        } else {
            themeIcon.className = 'fas fa-moon';
            themeToggle.title = 'Switch to dark theme';
        }
    }
    
    // Tema kaydet
    function saveTheme(theme) {
        chrome.storage.local.set({ theme: theme }, function() {
            updateStorageInfo();
        });
    }
    
    // Tema değiştir
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
        saveTheme(newTheme);
    }
    
    // Otomatik kaydet (1 saniye sonra)
    function autoSave() {
        if (autoSaveTimeout) {
            clearTimeout(autoSaveTimeout);
        }
        autoSaveTimeout = setTimeout(() => {
            saveNote();
        }, 1000);
    }
    
    // Tab event listeners
    editorTab.addEventListener('click', () => switchTab(editorTab, editorContent));
    historyTab.addEventListener('click', () => {
        switchTab(historyTab, historyContent);
        loadHistory();
    });
    
    // Event listeners
    noteEditor.addEventListener('input', function() {
        updateTitle();
        autoSave();
    });
    
    saveBtn.addEventListener('click', saveNote);
    deleteBtn.addEventListener('click', deleteNote);
    themeToggle.addEventListener('click', toggleTheme);
    
    // Klavye kısayolları
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveNote();
        }
    });
    
    // Başlangıç
    loadNote();
    loadTheme();
}); 