class MediaManager {
    constructor() {
        this.dataTable = null;
        this.currentFile = null;
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
            console.error('DataTables n\'est pas encore chargé, tentative de retry...');
            setTimeout(() => {
                this.initializeDataTable();
            }, 500);
            return;
        }

        try {
            this.dataTable = $('#filesTable').DataTable({
                data: [],
                columns: [
                    { 
                        data: 'name', 
                        title: 'Nom du fichier',
                        render: function(data, type, row) {
                            // Retirer le préfixe pdf/ pour tous les types d'affichage
                            const cleanName = data.replace(/^pdf\//, '');
                            
                            // Pour l'export, retourner juste le nom propre
                            if (type === 'export') {
                                return cleanName;
                            }
                            // Pour l'affichage, ajouter l'icône
                            return `<i class="fas fa-file-pdf text-danger me-2"></i>${cleanName}`;
                        }
                    },
                    { 
                        data: 'url', 
                        title: 'URL',
                        visible: false, // Cachée mais disponible pour l'export
                        render: function(data, type, row) {
                            return data; // Toujours retourner l'URL brute
                        }
                    },
                    { 
                        data: 'url', 
                        title: 'Lien du fichier',
                        orderable: false,
                        render: function(data, type, row) {
                            // Pour l'affichage, lien avec bouton copie
                            return `
                                <a href="${data}" target="_blank" class="me-2" title="Ouvrir le fichier">
                                    <i class="fas fa-external-link-alt"></i>
                                </a>
                                <button class="btn btn-sm btn-outline-info" onclick="mediaManager.copyUrl('${data}')" title="Copier l'URL">
                                    <i class="fas fa-copy"></i>
                                </button>
                            `;
                        }
                    },
                    { 
                        data: null, 
                        title: 'Actions',
                        orderable: false,
                        render: function(data, type, row) {
                            return `
                                <button class="btn btn-sm btn-outline-danger" onclick="mediaManager.confirmDelete('${row.name}', '${row.name.replace(/^pdf\//, '')}')" title="Supprimer le fichier">
                                    <i class="fas fa-trash"></i>
                                </button>
                            `;
                        }
                    }
                ],
                dom: 'Bfrtip',
                buttons: [
                    {
                        extend: 'excelHtml5',
                        text: '<i class="fas fa-file-excel me-2"></i>Exporter Excel',
                        className: 'btn btn-success btn-sm',
                        title: 'Liste des fichiers - ' + new Date().toLocaleDateString('fr-FR'),
                        exportOptions: {
                            columns: [0, 1] // Nom et URL (exclut Actions colonne 2)
                        }
                    }
                ],
                responsive: true,
                language: {
                    url: '//cdn.datatables.net/plug-ins/1.13.8/i18n/fr-FR.json'
                },
                pageLength: 25,
                order: [[0, 'asc']]
            });
            
            console.log('DataTables initialisé avec succès');
        } catch (error) {
            console.error('Erreur lors de initialisation de DataTables:', error);
            this.showAlert('Erreur lors de initialisation du tableau. Veuillez actualiser la page.', 'danger');
        }
    }

    setupEventListeners() {
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

        document.getElementById('uploadBtn').addEventListener('click', () => {
            this.uploadFile();
        });

        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            this.deleteFile();
        });
    }

    handleFileSelection(file) {
        console.log('Fichier sélectionné:', file.name);
        
        if (file.type !== 'application/pdf') {
            this.showAlert('Seuls les fichiers PDF sont autorisés.', 'warning');
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            this.showAlert('Le fichier est trop volumineux. Taille maximale : 50MB.', 'warning');
            return;
        }

        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = this.formatFileSize(file.size);
        document.getElementById('fileInfo').classList.remove('d-none');
        document.getElementById('uploadBtn').disabled = false;
        this.selectedFile = file;
    }

    async uploadFile() {
        if (!this.selectedFile) {
            this.showAlert('Aucun fichier sélectionné.', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('file', this.selectedFile);

        const uploadBtn = document.getElementById('uploadBtn');
        const originalText = uploadBtn.textContent;
        
        try {
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Upload...';

            const response = await fetch('/api/blobs', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('Fichier uploadé avec succès !', 'success');
                this.resetUploadForm();
                this.loadFiles();
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('uploadModal'));
                if (modal) {
                    modal.hide();
                }
            } else {
                throw new Error(result.error || 'Erreur lors de upload');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showAlert(`Erreur lors de upload : ${error.message}`, 'danger');
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = originalText;
        }
    }

    resetUploadForm() {
        document.getElementById('fileInput').value = '';
        document.getElementById('fileInfo').classList.add('d-none');
        document.getElementById('uploadProgress').classList.add('d-none');
        document.getElementById('uploadBtn').disabled = true;
        this.selectedFile = null;
    }

    async loadFiles() {
        try {
            const response = await fetch('/api/blobs');
            const result = await response.json();

            if (result.success) {
                // Vérifier que DataTables est initialisé avant d'essayer de le manipuler
                if (this.dataTable) {
                    this.dataTable.clear();
                    // Vérification de sécurité pour result.files
                    if (Array.isArray(result.files)) {
                        this.dataTable.rows.add(result.files).draw();
                        console.log(`${result.files.length} fichiers chargés avec succès`);
                    } else {
                        console.warn('result.files n\'est pas un tableau:', result.files);
                        this.dataTable.draw();
                        console.log('0 fichiers chargés (données invalides)');
                    }
                } else {
                    console.warn('DataTables n\'est pas encore initialisé, retry dans 500ms...');
                    setTimeout(() => {
                        this.loadFiles();
                    }, 500);
                    return;
                }
            } else {
                throw new Error(result.error || 'Erreur lors du chargement des fichiers');
            }
        } catch (error) {
            console.error('Load files error:', error);
            this.showAlert(`Erreur lors du chargement des fichiers : ${error.message}`, 'danger');
        }
    }

    openFile(url) {
        window.open(url, '_blank');
    }

    async copyUrl(url) {
        try {
            await navigator.clipboard.writeText(url);
            this.showToast('URL copiée dans le presse-papiers', 'success');
        } catch (err) {
            console.error('Erreur lors de la copie :', err);
            this.fallbackCopyToClipboard(url);
        }
    }

    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showToast('URL copiée dans le presse-papiers', 'success');
        } catch (err) {
            console.error('Erreur lors de la copie fallback :', err);
            this.showToast('Impossible de copier URL', 'error');
        } finally {
            document.body.removeChild(textArea);
        }
    }

    showToast(message, type = 'info') {
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }

        const toastId = 'toast_' + Date.now();
        const bgClass = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-info';
        
        const toastHtml = `
            <div id="${toastId}" class="toast ${bgClass} text-white" role="alert">
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: 3000
        });
        
        toast.show();
        
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    confirmDelete(blobName, displayName) {
        this.currentFile = blobName;
        document.getElementById('deleteFileName').textContent = displayName;
        
        const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
        modal.show();
    }

    async deleteFile() {
        if (!this.currentFile) return;

        const confirmBtn = document.getElementById('confirmDeleteBtn');
        const originalText = confirmBtn.textContent;
        
        try {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Suppression...';

            const response = await fetch(`/api/blobs/${encodeURIComponent(this.currentFile)}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('Fichier supprimé avec succès !', 'success');
                this.loadFiles();
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
                if (modal) {
                    modal.hide();
                }
            } else {
                throw new Error(result.error || 'Erreur lors de la suppression');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showAlert(`Erreur lors de la suppression : ${error.message}`, 'danger');
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = originalText;
            this.currentFile = null;
        }
    }

    showAlert(message, type = 'info', duration = 5000) {
        const alertContainer = document.getElementById('alertContainer');
        const alertId = 'alert_' + Date.now();
        
        const alertElement = document.createElement('div');
        alertElement.id = alertId;
        alertElement.className = `alert alert-${type} alert-dismissible fade show`;
        alertElement.setAttribute('role', 'alert');
        
        alertElement.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        alertContainer.appendChild(alertElement);
        
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, duration);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Le MediaManager sera initialisé depuis index.html après le chargement de DataTables

document.addEventListener('DOMContentLoaded', () => {
    const uploadModal = document.getElementById('uploadModal');
    if (uploadModal) {
        uploadModal.addEventListener('hidden.bs.modal', () => {
            if (mediaManager) {
                mediaManager.resetUploadForm();
            }
        });
    }
});
