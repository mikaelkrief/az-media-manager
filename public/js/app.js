class MediaManager {
    constructor() {
        this.dataTable = null;
        this.videosDataTable = null;
        this.currentFile = null;
        this.currentVideo = null;
        this.authToken = null; // Token Easy Auth (Entra ID) mis en cache
        this.init();
    }

    init() {
        this.initializeDataTable();
        this.initializeVideosDataTable();
        this.setupEventListeners();
        this.setupVideoEventListeners();
        this.loadFiles();
        this.loadVideos();
    }

    // Récupère et met en cache le token d'authentification Easy Auth (/.auth/me)
    async getAuthToken() {
        if (this.authToken) return this.authToken;
        try {
            const resp = await fetch('/.auth/me', { credentials: 'include' });
            console.log('/.auth/me status:', resp.status);
            if (!resp.ok) { console.warn('/.auth/me non OK'); return null; }
            const text = await resp.text();
            console.log('/.auth/me raw length:', text.length);
            let data;
            try { data = JSON.parse(text); } catch(parseErr){
              console.warn('Parse /.auth/me failed', parseErr);
              return null;
            }
            // data est un tableau; on prend le premier provider
            if (Array.isArray(data) && data.length > 0) {
                // access_token (API Graph/Entra) ou id_token; EasyAuth accepte généralement l'id_token
                const tok = data[0].access_token || data[0].id_token;
                if (tok) {
                    this.authToken = tok;
                    console.log('Token récupéré (longueur):', tok.length);
                    return tok;
                }
            }
        } catch (e) {
            console.warn('Impossible de récupérer le token Easy Auth:', e);
        }
        return null;
    }

    async addAuth(options = {}) {
        const token = await this.getAuthToken();
        const headers = new Headers(options.headers || {});
        if (token && !headers.has('Authorization')) {
            headers.set('Authorization', 'Bearer ' + token);
        }
        return { ...options, headers, credentials: 'include' };
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
                            // Utiliser displayName si disponible, sinon nettoyer le nom complet
                            var cleanName = row.displayName || data.split('/').pop();
                            
                            if (type === 'export') {
                                return cleanName;
                            }
                            return '<i class="fas fa-file-pdf text-danger me-2"></i>' + cleanName;
                        }
                    },
                    { 
                        data: 'lastModified', 
                        title: 'Dernière modification',
                        render: function(data, type, row) {
                            if (!data) return '-';
                            var date = new Date(data);
                            if (type === 'export') {
                                return date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR');
                            }
                            var dateStr = date.toLocaleDateString('fr-FR');
                            var timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                            return '<span class="text-muted small">' + dateStr + '<br>' + timeStr + '</span>';
                        }
                    },
                    { 
                        data: 'url', 
                        title: 'URL',
                        visible: false,
                        render: function(data, type, row) {
                            return data;
                        }
                    },
                    { 
                        data: 'url', 
                        title: 'Lien du fichier',
                        orderable: false,
                        render: function(data, type, row) {
                            return '<a href="' + data + '" target="_blank" class="me-2" title="Ouvrir le fichier">' +
                                   '<i class="fas fa-external-link-alt"></i></a>' +
                                   '<button class="btn btn-sm btn-outline-info" onclick="mediaManager.copyUrl(\'' + data + '\')" title="Copier l\'URL">' +
                                   '<i class="fas fa-copy"></i></button>';
                        }
                    },
                    { 
                        data: null, 
                        title: 'Actions',
                        orderable: false,
                        render: function(data, type, row) {
                            // Utiliser displayName si disponible, sinon nettoyer le nom complet
                            var cleanName = row.displayName || row.name.split('/').pop();
                            return '<button class="btn btn-sm btn-outline-danger" onclick="mediaManager.confirmDelete(\'' + row.name + '\', \'' + cleanName + '\')" title="Supprimer le fichier">' +
                                   '<i class="fas fa-trash"></i></button>';
                        }
                    }
                ],
                dom: 'Blfrtip',
                buttons: [
                    {
                        extend: 'excelHtml5',
                        text: '<i class="fas fa-file-excel me-2"></i>Exporter Excel',
                        className: 'btn btn-success btn-sm',
                        title: 'Liste des fichiers - ' + new Date().toLocaleDateString('fr-FR'),
                        exportOptions: {
                            columns: [0, 1, 2] // Nom, Dernière modification, URL (cachée)
                        }
                    }
                ],
                lengthMenu: [[25, 50, 100, 200, -1], [25, 50, 100, 200, "Tous"]],
                responsive: true,
                language: {
                    "sEmptyTable": "Aucune donnée disponible dans le tableau",
                    "sInfo": "Affichage de _START_ à _END_ sur _TOTAL_ entrées",
                    "sInfoEmpty": "Affichage de 0 à 0 sur 0 entrée",
                    "sInfoFiltered": "(filtré à partir de _MAX_ entrées au total)",
                    "sInfoThousands": " ",
                    "sLengthMenu": "Afficher _MENU_ entrées",
                    "sLoadingRecords": "Chargement...",
                    "sProcessing": "Traitement...",
                    "sSearch": "Rechercher :",
                    "sZeroRecords": "Aucune entrée correspondante trouvée",
                    "oPaginate": {
                        "sFirst": "Premier",
                        "sLast": "Dernier",
                        "sNext": "Suivant",
                        "sPrevious": "Précédent"
                    },
                    "oAria": {
                        "sSortAscending": ": activer pour trier la colonne par ordre croissant",
                        "sSortDescending": ": activer pour trier la colonne par ordre décroissant"
                    },
                    "select": {
                        "rows": {
                            "_": "%d lignes sélectionnées",
                            "0": "Aucune ligne sélectionnée",
                            "1": "1 ligne sélectionnée"
                        }
                    }
                },
                pageLength: 200,
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

            const response = await fetch('/api/blobs', await this.addAuth({
                method: 'POST',
                body: formData
            }));

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            // Vérifier le type de contenu
            const contentType = response.headers.get('content-type');
            console.log('Content-Type:', contentType);
            
            // Lire la réponse comme texte d'abord pour voir ce qu'on reçoit
            const responseText = await response.text();
            console.log('Response text:', responseText);
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (jsonError) {
                console.error('JSON Parse Error:', jsonError);
                console.error('Response was not JSON:', responseText);
                
                // Si ce n'est pas du JSON, c'est probablement une erreur serveur
                if (response.status >= 400) {
                    throw new Error(`Server error (${response.status}): ${responseText || 'Unknown error'}`);
                } else {
                    throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
                }
            }

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
            const response = await fetch('/api/blobs', await this.addAuth());
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

            const response = await fetch(`/api/blobs/${encodeURIComponent(this.currentFile)}`, await this.addAuth({
                method: 'DELETE'
            }));

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

    // ========================================
    // YouTube Videos Management
    // ========================================

    initializeVideosDataTable() {
        if (typeof $.fn.DataTable === 'undefined') {
            console.error('DataTables not loaded for videos table');
            setTimeout(() => this.initializeVideosDataTable(), 500);
            return;
        }

        try {
            this.videosDataTable = $('#videosTable').DataTable({
                data: [],
                columns: [
                    { 
                        data: 'title',
                        title: 'Titre',
                        render: function(data, type, row) {
                            if (type === 'export') return data;
                            return '<i class="fab fa-youtube text-danger me-2"></i>' + data;
                        }
                    },
                    { 
                        data: 'youtubeId',
                        title: 'YouTube ID',
                        render: function(data, type, row) {
                            if (type === 'export') return data;
                            return '<code>' + data + '</code>';
                        }
                    },
                    { 
                        data: 'tags',
                        title: 'Tags',
                        render: function(data, type, row) {
                            if (type === 'export') return data ? data.join(', ') : '';
                            if (!data || data.length === 0) return '<span class="text-muted">-</span>';
                            return data.map(tag => 
                                '<span class="badge bg-info tag-badge">' + tag + '</span>'
                            ).join(' ');
                        }
                    },
                    { 
                        data: 'createdAt',
                        title: 'Date de création',
                        render: function(data, type, row) {
                            if (!data) return '-';
                            var date = new Date(data);
                            if (type === 'export') {
                                return date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR');
                            }
                            return date.toLocaleDateString('fr-FR');
                        }
                    },
                    { 
                        data: 'isPublished',
                        title: 'Statut',
                        render: function(data, type, row) {
                            if (type === 'export') return data ? 'Publié' : 'Non publié';
                            if (data) {
                                return '<span class="badge bg-success"><i class="fas fa-eye me-1"></i>Publié</span>';
                            } else {
                                return '<span class="badge bg-secondary"><i class="fas fa-eye-slash me-1"></i>Non publié</span>';
                            }
                        }
                    },
                    { 
                        data: null,
                        title: 'Actions',
                        orderable: false,
                        render: function(data, type, row) {
                            return '<div class="btn-group btn-group-sm" role="group">' +
                                   '<button class="btn btn-outline-primary" onclick="mediaManager.viewVideo(\'' + row.id + '\')" title="Voir détails">' +
                                   '<i class="fas fa-eye"></i></button>' +
                                   '<button class="btn btn-outline-warning" onclick="mediaManager.editVideo(\'' + row.id + '\')" title="Modifier">' +
                                   '<i class="fas fa-edit"></i></button>' +
                                   '<button class="btn btn-outline-' + (row.isPublished ? 'secondary' : 'success') + '" ' +
                                   'onclick="mediaManager.togglePublish(\'' + row.id + '\', ' + !row.isPublished + ')" title="' + 
                                   (row.isPublished ? 'Dépublier' : 'Publier') + '">' +
                                   '<i class="fas fa-' + (row.isPublished ? 'eye-slash' : 'eye') + '"></i></button>' +
                                   '<button class="btn btn-outline-danger" onclick="mediaManager.confirmDeleteVideo(\'' + row.id + '\', \'' + 
                                   row.title.replace(/'/g, "\\'") + '\')" title="Supprimer">' +
                                   '<i class="fas fa-trash"></i></button>' +
                                   '</div>';
                        }
                    }
                ],
                dom: 'Blfrtip',
                buttons: [
                    {
                        extend: 'excelHtml5',
                        text: '<i class="fas fa-file-excel me-2"></i>Exporter Excel',
                        className: 'btn btn-success btn-sm',
                        title: 'Liste des vidéos - ' + new Date().toLocaleDateString('fr-FR'),
                        exportOptions: {
                            columns: [0, 1, 2, 3, 4]
                        }
                    }
                ],
                lengthMenu: [[25, 50, 100, 200, -1], [25, 50, 100, 200, "Toutes"]],
                responsive: true,
                language: {
                    "sEmptyTable": "Aucune vidéo disponible",
                    "sInfo": "Affichage de _START_ à _END_ sur _TOTAL_ vidéos",
                    "sInfoEmpty": "Affichage de 0 à 0 sur 0 vidéo",
                    "sInfoFiltered": "(filtré à partir de _MAX_ vidéos au total)",
                    "sInfoThousands": " ",
                    "sLengthMenu": "Afficher _MENU_ vidéos",
                    "sLoadingRecords": "Chargement...",
                    "sProcessing": "Traitement...",
                    "sSearch": "Rechercher :",
                    "sZeroRecords": "Aucune vidéo correspondante trouvée",
                    "oPaginate": {
                        "sFirst": "Premier",
                        "sLast": "Dernier",
                        "sNext": "Suivant",
                        "sPrevious": "Précédent"
                    },
                    "oAria": {
                        "sSortAscending": ": activer pour trier la colonne par ordre croissant",
                        "sSortDescending": ": activer pour trier la colonne par ordre décroissant"
                    },
                    "select": {
                        "rows": {
                            "_": "%d lignes sélectionnées",
                            "0": "Aucune ligne sélectionnée",
                            "1": "1 ligne sélectionnée"
                        }
                    }
                },
                pageLength: 200,
                order: [[3, 'desc']] // Sort by creation date desc
            });
            
            console.log('Videos DataTable initialized successfully');
        } catch (error) {
            console.error('Error initializing Videos DataTable:', error);
        }
    }

    setupVideoEventListeners() {
        // YouTube ID preview
        const youtubeIdInput = document.getElementById('youtubeId');
        if (youtubeIdInput) {
            youtubeIdInput.addEventListener('input', (e) => {
                this.previewVideo(e.target.value);
            });
        }

        // Save video button
        const saveVideoBtn = document.getElementById('saveVideoBtn');
        if (saveVideoBtn) {
            saveVideoBtn.addEventListener('click', () => this.saveVideo());
        }

        // Confirm delete video button
        const confirmDeleteVideoBtn = document.getElementById('confirmDeleteVideoBtn');
        if (confirmDeleteVideoBtn) {
            confirmDeleteVideoBtn.addEventListener('click', () => this.deleteVideo());
        }

        // Copy player URL button
        const copyPlayerUrlBtn = document.getElementById('copyPlayerUrlBtn');
        if (copyPlayerUrlBtn) {
            copyPlayerUrlBtn.addEventListener('click', () => {
                const url = document.getElementById('videoPlayerUrl').value;
                this.copyUrl(url);
            });
        }

        // Reset form on modal close
        const videoModal = document.getElementById('videoModal');
        if (videoModal) {
            videoModal.addEventListener('hidden.bs.modal', () => {
                this.resetVideoForm();
            });
        }

        // Load videos when switching to videos tab
        const videosTab = document.getElementById('videos-tab');
        if (videosTab) {
            videosTab.addEventListener('shown.bs.tab', () => {
                this.loadVideos();
            });
        }
    }

    previewVideo(youtubeId) {
        const preview = document.getElementById('videoPreview');
        const frame = document.getElementById('videoPreviewFrame');
        
        if (youtubeId && youtubeId.length >= 11) {
            // Configuration complète de l'iframe (comme dans le player)
            // IMPORTANT: Définir tous les attributs AVANT le src
            frame.width = '560';
            frame.height = '315';
            frame.frameBorder = '0';
            frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
            frame.referrerPolicy = 'strict-origin-when-cross-origin';
            frame.allowFullscreen = true;
            // Définir le src en dernier pour que tous les attributs soient appliqués
            frame.src = `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`;
            preview.classList.remove('d-none');
        } else {
            preview.classList.add('d-none');
            frame.src = '';
        }
    }

    async loadVideos() {
        try {
            const response = await fetch('/api/youtube-videos', await this.addAuth());
            const result = await response.json();

            if (result.success) {
                if (this.videosDataTable) {
                    this.videosDataTable.clear();
                    if (Array.isArray(result.videos)) {
                        this.videosDataTable.rows.add(result.videos).draw();
                        console.log(`${result.videos.length} videos loaded`);
                    }
                }
            } else {
                throw new Error(result.error || 'Error loading videos');
            }
        } catch (error) {
            console.error('Load videos error:', error);
            this.showAlert(`Erreur lors du chargement des vidéos : ${error.message}`, 'danger');
        }
    }

    async saveVideo() {
        const form = document.getElementById('videoForm');
        const videoId = document.getElementById('videoId').value;
        const isEdit = !!videoId;

        // Validation
        const youtubeId = document.getElementById('youtubeId').value.trim();
        const title = document.getElementById('videoTitle').value.trim();

        if (!youtubeId || !title) {
            this.showAlert('YouTube ID et titre sont obligatoires', 'warning');
            return;
        }

        // Prepare data
        const videoData = {
            youtubeId: youtubeId,
            title: title,
            description: document.getElementById('videoDescription').value.trim(),
            tags: document.getElementById('videoTags').value
                .split(',')
                .map(t => t.trim())
                .filter(t => t.length > 0),
            isPublished: document.getElementById('videoPublished').checked
        };

        const saveBtn = document.getElementById('saveVideoBtn');
        const originalText = saveBtn.innerHTML;
        
        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enregistrement...';

            const url = isEdit 
                ? `/api/youtube-videos/${videoId}`
                : '/api/youtube-videos';
            
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, await this.addAuth({
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(videoData)
            }));

            const result = await response.json();

            if (result.success) {
                this.showAlert(
                    isEdit ? 'Vidéo mise à jour avec succès !' : 'Vidéo ajoutée avec succès !',
                    'success'
                );
                this.loadVideos();
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('videoModal'));
                if (modal) modal.hide();
            } else {
                throw new Error(result.error || 'Erreur lors de l\'enregistrement');
            }
        } catch (error) {
            console.error('Save video error:', error);
            this.showAlert(`Erreur : ${error.message}`, 'danger');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }

    editVideo(id) {
        fetch(`/api/youtube-videos/${id}`, { method: 'GET' })
            .then(res => res.json())
            .then(result => {
                if (result.success && result.video) {
                    const video = result.video;
                    
                    // Fill form
                    document.getElementById('videoId').value = video.id;
                    document.getElementById('youtubeId').value = video.youtubeId;
                    document.getElementById('videoTitle').value = video.title;
                    document.getElementById('videoDescription').value = video.description || '';
                    document.getElementById('videoTags').value = video.tags ? video.tags.join(', ') : '';
                    document.getElementById('videoPublished').checked = video.isPublished;
                    
                    // Update modal title
                    document.getElementById('videoModalTitle').textContent = 'Modifier la vidéo';
                    
                    // Show preview
                    this.previewVideo(video.youtubeId);
                    
                    // Show modal
                    const modal = new bootstrap.Modal(document.getElementById('videoModal'));
                    modal.show();
                } else {
                    throw new Error(result.error || 'Video not found');
                }
            })
            .catch(error => {
                console.error('Edit video error:', error);
                this.showAlert(`Erreur : ${error.message}`, 'danger');
            });
    }

    async viewVideo(id) {
        try {
            const response = await fetch(`/api/youtube-videos/${id}`, await this.addAuth());
            const result = await response.json();

            if (result.success && result.video) {
                const video = result.video;
                
                // Set video details avec iframe complète
                // IMPORTANT: Définir tous les attributs AVANT le src
                const frame = document.getElementById('videoDetailsFrame');
                frame.width = '560';
                frame.height = '315';
                frame.frameBorder = '0';
                frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
                frame.referrerPolicy = 'strict-origin-when-cross-origin';
                frame.allowFullscreen = true;
                // Définir le src en dernier pour que tous les attributs soient appliqués
                frame.src = `https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0&modestbranding=1`;
                
                document.getElementById('videoDetailsTitle').textContent = video.title;
                document.getElementById('videoDetailsYoutubeId').textContent = 
                    `YouTube ID: ${video.youtubeId}`;
                
                // Tags
                const tagsContainer = document.getElementById('videoDetailsTags');
                if (video.tags && video.tags.length > 0) {
                    tagsContainer.innerHTML = video.tags.map(tag => 
                        `<span class="badge bg-info tag-badge">${tag}</span>`
                    ).join(' ');
                } else {
                    tagsContainer.innerHTML = '<span class="text-muted">Aucun tag</span>';
                }
                
                // Description
                document.getElementById('videoDetailsDescription').textContent = 
                    video.description || 'Aucune description';
                
                // Date
                const date = new Date(video.createdAt);
                document.getElementById('videoDetailsDate').textContent = 
                    `Créée le ${date.toLocaleDateString('fr-FR')}`;
                
                // Status
                const statusSpan = document.getElementById('videoDetailsStatus');
                if (video.isPublished) {
                    statusSpan.innerHTML = '<span class="badge bg-success"><i class="fas fa-eye me-1"></i>Publié</span>';
                } else {
                    statusSpan.innerHTML = '<span class="badge bg-secondary"><i class="fas fa-eye-slash me-1"></i>Non publié</span>';
                }
                
                // Player URL (you'll need to configure this based on your static player deployment)
                const playerUrl = `${window.location.origin}/player/player.html?id=${video.id}`;
                document.getElementById('videoPlayerUrl').value = playerUrl;
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('videoDetailsModal'));
                modal.show();
            } else {
                throw new Error(result.error || 'Video not found');
            }
        } catch (error) {
            console.error('View video error:', error);
            this.showAlert(`Erreur : ${error.message}`, 'danger');
        }
    }

    async togglePublish(id, newStatus) {
        try {
            const response = await fetch(`/api/youtube-videos/${id}/publish`, await this.addAuth({
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isPublished: newStatus })
            }));

            const result = await response.json();

            if (result.success) {
                this.showAlert(
                    newStatus ? 'Vidéo publiée avec succès !' : 'Vidéo dépubliée avec succès !',
                    'success'
                );
                this.loadVideos();
            } else {
                throw new Error(result.error || 'Error toggling publish status');
            }
        } catch (error) {
            console.error('Toggle publish error:', error);
            this.showAlert(`Erreur : ${error.message}`, 'danger');
        }
    }

    confirmDeleteVideo(id, title) {
        this.currentVideo = id;
        document.getElementById('deleteVideoTitle').textContent = title;
        
        const modal = new bootstrap.Modal(document.getElementById('deleteVideoModal'));
        modal.show();
    }

    async deleteVideo() {
        if (!this.currentVideo) return;

        const confirmBtn = document.getElementById('confirmDeleteVideoBtn');
        const originalText = confirmBtn.innerHTML;
        
        try {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Suppression...';

            const response = await fetch(`/api/youtube-videos/${this.currentVideo}`, await this.addAuth({
                method: 'DELETE'
            }));

            const result = await response.json();

            if (result.success) {
                this.showAlert('Vidéo supprimée avec succès !', 'success');
                this.loadVideos();
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('deleteVideoModal'));
                if (modal) modal.hide();
            } else {
                throw new Error(result.error || 'Error deleting video');
            }
        } catch (error) {
            console.error('Delete video error:', error);
            this.showAlert(`Erreur : ${error.message}`, 'danger');
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalText;
            this.currentVideo = null;
        }
    }

    resetVideoForm() {
        document.getElementById('videoForm').reset();
        document.getElementById('videoId').value = '';
        document.getElementById('videoModalTitle').textContent = 'Ajouter une vidéo YouTube';
        document.getElementById('videoPreview').classList.add('d-none');
        document.getElementById('videoPreviewFrame').src = '';
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
