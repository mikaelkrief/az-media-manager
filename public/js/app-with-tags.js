class MediaManager {
    constructor() {
        this.filesTable = null;
        this.currentFile = null;
        this.currentTags = {};
        this.init();
    }

    init() {
        this.initializeDataTable();
        this.setupEventListeners();
        this.loadFiles();
    }

    initializeDataTable() {
        // Vérifier que DataTables est disponible
        if (typeof $.fn.DataTable === 'undefined') {
            console.error('DataTables n\'est pas disponible');
            this.showAlert('Erreur de chargement des composants. Veuillez actualiser la page.', 'danger');
            return;
        }

        try {
            this.filesTable = $('#filesTable').DataTable({
                responsive: true,
                pageLength: 25,
                lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
                order: [[2, 'desc']], // Sort by date modified descending
                stateSave: true,
                stateDuration: 60 * 60 * 24, // 24 heures
                processing: true,
                deferRender: true,
                language: {
                    url: 'https://cdn.datatables.net/plug-ins/1.13.8/i18n/fr-FR.json',
                    // Fallback français si le CDN n'est pas accessible
                    processing: "Traitement en cours...",
                    search: "Rechercher :",
                    lengthMenu: "Afficher _MENU_ éléments",
                    info: "Affichage de l'élément _START_ à _END_ sur _TOTAL_ éléments",
                    infoEmpty: "Affichage de l'élément 0 à 0 sur 0 élément",
                    infoFiltered: "(filtré de _MAX_ éléments au total)",
                    infoThousands: " ",
                    loadingRecords: "Chargement en cours...",
                    zeroRecords: "Aucun élément à afficher",
                    emptyTable: "Aucune donnée disponible dans le tableau",
                    paginate: {
                        first: "Premier",
                        previous: "Précédent",
                        next: "Suivant",
                        last: "Dernier"
                    },
                    aria: {
                        sortAscending: ": activer pour trier la colonne par ordre croissant",
                        sortDescending: ": activer pour trier la colonne par ordre décroissant"
                    }
                },
            columns: [
                { 
                    data: 'displayName',
                    type: 'string',
                    title: 'Nom du fichier',
                    render: (data, type, row) => {
                        if (type === 'display') {
                            return `<i class="fas fa-file-pdf text-danger me-2"></i>${data}`;
                        }
                        return data;
                    }
                },
                { 
                    data: 'size',
                    type: 'num',
                    title: 'Taille',
                    render: (data, type) => {
                        if (type === 'display') {
                            return this.formatFileSize(data);
                        }
                        return data;
                    }
                },
                { 
                    data: 'lastModified',
                    type: 'date',
                    title: 'Date de modification',
                    render: (data, type) => {
                        if (type === 'display') {
                            return new Date(data).toLocaleString('fr-FR');
                        }
                        return data;
                    }
                },
                { 
                    data: null,
                    orderable: false,
                    searchable: false,
                    title: 'Actions',
                    render: (data, type, row) => {
                        return `
                            <div class="file-actions">
                                <button class="btn btn-sm btn-outline-primary me-1" onclick="mediaManager.openFile('${row.url}')" title="Ouvrir">
                                    <i class="fas fa-external-link-alt"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="mediaManager.confirmDelete('${row.name}', '${row.displayName}')" title="Supprimer">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `;
                    }
                }
            ]
        });
        
        console.log('DataTables initialisé avec succès');
        } catch (error) {
            console.error('Erreur lors de l\'initialisation de DataTables:', error);
            this.showAlert('Erreur lors de l\'initialisation du tableau. Veuillez actualiser la page.', 'danger');
        }
    }

    setupEventListeners() {
        // Upload area events
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelection(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelection(e.target.files[0]);
            }
        });

        // Upload button
        document.getElementById('uploadBtn').addEventListener('click', () => {
            this.uploadFile();
        });

        // Tags management
        document.getElementById('addTagBtn').addEventListener('click', () => {
            this.addTag();
        });

        document.getElementById('saveTagsBtn').addEventListener('click', () => {
            this.saveTags();
        });

        // Confirm delete
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            this.deleteFile();
        });

        // Enter key for tags
        document.getElementById('newTagKey').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('newTagValue').focus();
            }
        });

        document.getElementById('newTagValue').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTag();
            }
        });
    }

    handleFileSelection(file) {
        if (file.type !== 'application/pdf') {
            this.showAlert('Seuls les fichiers PDF sont autorisés.', 'danger');
            return;
        }

        if (file.size > 50 * 1024 * 1024) { // 50MB
            this.showAlert('Le fichier est trop volumineux. Taille maximale : 50MB.', 'danger');
            return;
        }

        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = this.formatFileSize(file.size);
        document.getElementById('fileInfo').classList.remove('d-none');
        document.getElementById('uploadBtn').disabled = false;
    }

    async uploadFile() {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];

        if (!file) {
            this.showAlert('Aucun fichier sélectionné.', 'danger');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        const uploadBtn = document.getElementById('uploadBtn');
        const progressContainer = document.getElementById('uploadProgress');
        const progressBar = progressContainer.querySelector('.progress-bar');

        try {
            uploadBtn.disabled = true;
            progressContainer.classList.remove('d-none');
            progressBar.style.width = '0%';

            // Simulate progress (since we can't track real upload progress easily)
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 10;
                progressBar.style.width = `${Math.min(progress, 90)}%`;
            }, 100);

            const response = await fetch('/api/blobs', {
                method: 'POST',
                body: formData
            });

            clearInterval(progressInterval);
            progressBar.style.width = '100%';

            const result = await response.json();

            if (result.success) {
                this.showAlert('Fichier téléchargé avec succès !', 'success');
                this.loadFiles();
                bootstrap.Modal.getInstance(document.getElementById('uploadModal')).hide();
                this.resetUploadForm();
            } else {
                throw new Error(result.error || 'Erreur lors du téléchargement');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showAlert(`Erreur lors du téléchargement : ${error.message}`, 'danger');
        } finally {
            uploadBtn.disabled = false;
            progressContainer.classList.add('d-none');
        }
    }

    resetUploadForm() {
        document.getElementById('fileInput').value = '';
        document.getElementById('fileInfo').classList.add('d-none');
        document.getElementById('uploadBtn').disabled = true;
        document.getElementById('uploadProgress').classList.add('d-none');
    }

    async loadFiles() {
        // Utiliser un indicateur visuel simple au lieu de la modale
        this.showTableLoading(true);
        
        try {
            const response = await fetch('/api/blobs');
            const result = await response.json();

            if (result.success) {
                this.filesTable.clear().rows.add(result.data).draw();
                console.log(`${result.data.length} fichiers chargés avec succès`);
            } else {
                throw new Error(result.error || 'Erreur lors du chargement des fichiers');
            }
        } catch (error) {
            console.error('Load files error:', error);
            this.showAlert(`Erreur lors du chargement des fichiers : ${error.message}`, 'danger');
        } finally {
            this.showTableLoading(false);
        }
    }

    showTableLoading(show) {
        const tableContainer = document.querySelector('#filesTable_wrapper') || document.querySelector('#filesTable').parentElement;
        
        if (show) {
            // Afficher un spinner dans le tableau
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'table-loading';
            loadingDiv.className = 'text-center p-4';
            loadingDiv.innerHTML = `
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Chargement...</span>
                </div>
                <div class="mt-2">Chargement des fichiers...</div>
            `;
            
            // Supprimer le précédent s'il existe
            const existing = document.getElementById('table-loading');
            if (existing) existing.remove();
            
            if (tableContainer) {
                tableContainer.appendChild(loadingDiv);
            }
        } else {
            // Supprimer le spinner
            const loadingDiv = document.getElementById('table-loading');
            if (loadingDiv) {
                loadingDiv.remove();
            }
        }
    }

    openFile(url) {
        window.open(url, '_blank');
    }

    async manageTags(blobName) {
        this.currentFile = blobName;
        
        try {
            const response = await fetch(`/api/blobs/${encodeURIComponent(blobName)}/tags`);
            const result = await response.json();

            if (result.success) {
                this.currentTags = { ...result.data };
                
                // Update modal content
                document.getElementById('currentFileName').textContent = blobName.split('/').pop();
                this.updateTagsDisplay();
                
                const modal = new bootstrap.Modal(document.getElementById('tagsModal'));
                modal.show();
            } else {
                throw new Error(result.error || 'Erreur lors du chargement des tags');
            }
        } catch (error) {
            console.error('Load tags error:', error);
            this.showAlert(`Erreur lors du chargement des tags : ${error.message}`, 'danger');
        }
    }

    updateTagsDisplay() {
        const currentTagsContainer = document.getElementById('currentTags');
        const tagsContainer = document.getElementById('tagsContainer');
        
        // Display current tags
        currentTagsContainer.innerHTML = this.renderTags(this.currentTags) || '<span class="text-muted">Aucun tag</span>';
        
        // Display editable tags
        tagsContainer.innerHTML = '';
        Object.entries(this.currentTags).forEach(([key, value]) => {
            const tagElement = document.createElement('div');
            tagElement.className = 'row mb-2';
            tagElement.innerHTML = `
                <div class="col-5">
                    <input type="text" class="form-control tag-key" value="${key}" readonly>
                </div>
                <div class="col-5">
                    <input type="text" class="form-control tag-value" value="${value}">
                </div>
                <div class="col-2">
                    <button type="button" class="btn btn-danger w-100" onclick="this.closest('.row').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            tagsContainer.appendChild(tagElement);
        });
    }

    addTag() {
        const keyInput = document.getElementById('newTagKey');
        const valueInput = document.getElementById('newTagValue');
        const key = keyInput.value.trim();
        const value = valueInput.value.trim();

        if (!key || !value) {
            this.showAlert('Veuillez saisir une clé et une valeur pour le tag.', 'warning');
            return;
        }

        if (key.length > 128 || value.length > 256) {
            this.showAlert('La clé ne peut pas dépasser 128 caractères et la valeur 256 caractères.', 'warning');
            return;
        }

        this.currentTags[key] = value;
        this.updateTagsDisplay();
        
        keyInput.value = '';
        valueInput.value = '';
        keyInput.focus();
    }

    async saveTags() {
        const tagsContainer = document.getElementById('tagsContainer');
        const tagRows = tagsContainer.querySelectorAll('.row');
        
        const updatedTags = {};
        
        tagRows.forEach(row => {
            const key = row.querySelector('.tag-key').value.trim();
            const value = row.querySelector('.tag-value').value.trim();
            
            if (key && value) {
                updatedTags[key] = value;
            }
        });

        try {
            const response = await fetch(`/api/blobs/${encodeURIComponent(this.currentFile)}/tags`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tags: updatedTags })
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('Tags mis à jour avec succès !', 'success');
                this.loadFiles();
                bootstrap.Modal.getInstance(document.getElementById('tagsModal')).hide();
            } else {
                throw new Error(result.error || 'Erreur lors de la sauvegarde des tags');
            }
        } catch (error) {
            console.error('Save tags error:', error);
            this.showAlert(`Erreur lors de la sauvegarde des tags : ${error.message}`, 'danger');
        }
    }

    confirmDelete(blobName, displayName) {
        this.currentFile = blobName;
        document.getElementById('deleteFileName').textContent = displayName;
        
        const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
        modal.show();
    }

    async deleteFile() {
        try {
            const response = await fetch(`/api/blobs/${encodeURIComponent(this.currentFile)}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('Fichier supprimé avec succès !', 'success');
                this.loadFiles();
                bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
            } else {
                throw new Error(result.error || 'Erreur lors de la suppression');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showAlert(`Erreur lors de la suppression : ${error.message}`, 'danger');
        }
    }

    renderTags(tags) {
        if (!tags || Object.keys(tags).length === 0) {
            return '<span class="text-muted">Aucun tag</span>';
        }

        return Object.entries(tags).map(([key, value]) => 
            `<span class="badge bg-secondary tag-badge">${key}: ${value}</span>`
        ).join('');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showAlert(message, type = 'info', duration = 5000) {
        const alertContainer = document.getElementById('alertContainer');
        const alertId = 'alert_' + Date.now();
        
        const alertElement = document.createElement('div');
        alertElement.id = alertId;
        alertElement.className = `alert alert-${type} alert-dismissible fade show`;
        alertElement.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        alertContainer.appendChild(alertElement);
        
        // Auto-dismiss after duration
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, duration);
    }

    showLoading(show) {
        try {
            const loadingModal = document.getElementById('loadingModal');
            if (!loadingModal) {
                console.warn('Modal de chargement introuvable');
                return;
            }

            if (show) {
                // Afficher la modale de chargement
                const modal = new bootstrap.Modal(loadingModal, {
                    backdrop: 'static',
                    keyboard: false
                });
                modal.show();
                console.log('Modal de chargement affichée');
            } else {
                // Cacher la modale de chargement
                const modalInstance = bootstrap.Modal.getInstance(loadingModal);
                if (modalInstance) {
                    modalInstance.hide();
                    console.log('Modal de chargement cachée via getInstance');
                } else {
                    // Fallback : forcer la fermeture
                    loadingModal.classList.remove('show');
                    loadingModal.style.display = 'none';
                    document.body.classList.remove('modal-open');
                    
                    // Supprimer le backdrop s'il existe
                    const backdrop = document.querySelector('.modal-backdrop');
                    if (backdrop) {
                        backdrop.remove();
                    }
                    console.log('Modal de chargement cachée via fallback');
                }
            }
        } catch (error) {
            console.error('Erreur dans showLoading:', error);
            // En cas d'erreur, essayer de nettoyer manuellement
            if (!show) {
                try {
                    const loadingModal = document.getElementById('loadingModal');
                    if (loadingModal) {
                        loadingModal.classList.remove('show');
                        loadingModal.style.display = 'none';
                    }
                    document.body.classList.remove('modal-open');
                    const backdrop = document.querySelector('.modal-backdrop');
                    if (backdrop) backdrop.remove();
                    console.log('Nettoyage forcé de la modal de chargement');
                } catch (cleanupError) {
                    console.error('Erreur lors du nettoyage forcé:', cleanupError);
                }
            }
        }
    }
}

// Initialize the application when the page loads
let mediaManager;

// Fonction d'initialisation appelée depuis index.html
function initializeMediaManager() {
    console.log('Initialisation de MediaManager...');
    try {
        // Vérifier si DataTables est disponible
        if (typeof $.fn.DataTable !== 'undefined') {
            console.log('DataTables détecté, initialisation de MediaManager complet');
            mediaManager = new MediaManager();
        } else {
            console.log('DataTables non disponible, initialisation de MediaManagerBasic');
            mediaManager = new MediaManagerBasic();
        }
        console.log('MediaManager initialisé avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de MediaManager:', error);
        // Fallback vers la version basique
        console.log('Tentative de fallback vers MediaManagerBasic');
        try {
            mediaManager = new MediaManagerBasic();
            console.log('MediaManagerBasic initialisé avec succès');
        } catch (fallbackError) {
            console.error('Erreur critique lors de l\'initialisation:', fallbackError);
        }
    }
}

// Auto-initialisation si jQuery est déjà disponible
if (typeof $ !== 'undefined') {
    $(document).ready(() => {
        initializeMediaManager();
    });
} else {
    // Fallback si jQuery n'est pas encore chargé
    document.addEventListener('DOMContentLoaded', () => {
        // Attendre un peu pour que les scripts se chargent
        setTimeout(() => {
            if (typeof $ !== 'undefined') {
                initializeMediaManager();
            } else {
                console.error('jQuery non disponible, impossible d\'initialiser MediaManager');
            }
        }, 1000);
    });
}

// Reset upload form when modal is hidden
document.getElementById('uploadModal').addEventListener('hidden.bs.modal', () => {
    if (mediaManager) {
        mediaManager.resetUploadForm();
    }
});

// Version basique sans DataTables pour le fallback
class MediaManagerBasic {
    constructor() {
        this.currentFile = null;
        this.currentTags = {};
        this.files = [];
        this.init();
    }

    init() {
        console.log('Initialisation MediaManagerBasic (sans DataTables)');
        this.setupEventListeners();
        this.loadFiles();
    }

    setupEventListeners() {
        // Upload area events
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelection(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelection(e.target.files[0]);
            }
        });

        // Upload button
        document.getElementById('uploadBtn').addEventListener('click', () => {
            this.uploadFile();
        });

        // Tags management
        document.getElementById('addTagBtn').addEventListener('click', () => {
            this.addTag();
        });

        document.getElementById('saveTagsBtn').addEventListener('click', () => {
            this.saveTags();
        });

        // Confirm delete
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            this.deleteFile();
        });

        // Enter key for tags
        document.getElementById('newTagKey').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('newTagValue').focus();
            }
        });

        document.getElementById('newTagValue').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTag();
            }
        });
    }

    displayFilesBasic() {
        const tbody = document.querySelector('#filesTable tbody');
        tbody.innerHTML = '';

        this.files.forEach(file => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><i class="fas fa-file-pdf text-danger me-2"></i>${file.displayName}</td>
                <td>${this.formatFileSize(file.size)}</td>
                <td>${new Date(file.lastModified).toLocaleString('fr-FR')}</td>
                <td>${this.renderTags(file.tags)}</td>
                <td>
                    <div class="file-actions">
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="window.open('${file.url}', '_blank')" title="Ouvrir">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary me-1" onclick="mediaManager.manageTags('${file.name}')" title="Gérer les tags">
                            <i class="fas fa-tags"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="mediaManager.confirmDelete('${file.name}', '${file.displayName}')" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadFiles() {
        this.showTableLoading(true);
        
        try {
            const response = await fetch('/api/blobs');
            const result = await response.json();

            if (result.success) {
                this.files = result.data;
                this.displayFilesBasic();
                console.log(`${result.data.length} fichiers chargés avec succès (mode basique)`);
            } else {
                throw new Error(result.error || 'Erreur lors du chargement des fichiers');
            }
        } catch (error) {
            console.error('Load files error:', error);
            this.showAlert(`Erreur lors du chargement des fichiers : ${error.message}`, 'danger');
        } finally {
            this.showTableLoading(false);
        }
    }

    showTableLoading(show) {
        const tableContainer = document.querySelector('#filesTable').parentElement;
        
        if (show) {
            // Afficher un spinner dans le tableau
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'table-loading-basic';
            loadingDiv.className = 'text-center p-4';
            loadingDiv.innerHTML = `
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Chargement...</span>
                </div>
                <div class="mt-2">Chargement des fichiers...</div>
            `;
            
            // Supprimer le précédent s'il existe
            const existing = document.getElementById('table-loading-basic');
            if (existing) existing.remove();
            
            if (tableContainer) {
                tableContainer.appendChild(loadingDiv);
            }
        } else {
            // Supprimer le spinner
            const loadingDiv = document.getElementById('table-loading-basic');
            if (loadingDiv) {
                loadingDiv.remove();
            }
        }
    }

    // Réutiliser les autres méthodes de MediaManager
    handleFileSelection(file) { return MediaManager.prototype.handleFileSelection.call(this, file); }
    async uploadFile() { return MediaManager.prototype.uploadFile.call(this); }
    resetUploadForm() { return MediaManager.prototype.resetUploadForm.call(this); }
    async manageTags(blobName) { return MediaManager.prototype.manageTags.call(this, blobName); }
    updateTagsDisplay() { return MediaManager.prototype.updateTagsDisplay.call(this); }
    addTag() { return MediaManager.prototype.addTag.call(this); }
    async saveTags() { return MediaManager.prototype.saveTags.call(this); }
    confirmDelete(blobName, displayName) { return MediaManager.prototype.confirmDelete.call(this, blobName, displayName); }
    async deleteFile() { return MediaManager.prototype.deleteFile.call(this); }
    renderTags(tags) { return MediaManager.prototype.renderTags.call(this, tags); }
    formatFileSize(bytes) { return MediaManager.prototype.formatFileSize.call(this, bytes); }
    showAlert(message, type, duration) { return MediaManager.prototype.showAlert.call(this, message, type, duration); }
    showLoading(show) { return MediaManager.prototype.showLoading.call(this, show); }
}