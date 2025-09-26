// Sistema de comentarios en tiempo real
class CommentsSystem {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.comments = [];
        this.apiBase = window.API_BASE || 'http://localhost:3000/api';
        this.avisoId = null;
        this.init();
        // Expose a lightweight API for other scripts (e.g., WS indicator) to reuse or observe the connection
        window.__commentsWS = {
            getSocket: () => this.socket,
            onStatus: (cb) => {
                // Attach simple status callback; invoke immediately with current state
                try {
                    const s = this.socket?.readyState;
                    cb && cb(s === WebSocket.OPEN ? 'open' : s === WebSocket.CONNECTING ? 'connecting' : 'closed');
                } catch {}
                this._statusCb = cb;
            }
        };
    }

    init() {
        this.currentUser = this.getCurrentUser();
        this.avisoId = this.getAvisoId();
        // Solo inicializar si hay contexto de aviso
        if (!this.avisoId) {
            return;
        }
        // WebSocket activado para comentarios en tiempo real
        this.initWebSocket();
        this.createCommentsUI();
    }

    getCurrentUser() {
        const token = localStorage.getItem('token');
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                id: payload.usuario_id,
                nombre: localStorage.getItem('userName') || 'Usuario',
                rol: payload.rol,
                email: payload.email
            };
        } catch (error) {
            console.error('Error al decodificar token:', error);
            return null;
        }
    }

    getAvisoId() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (!id) return null;
        const n = Number(id);
        return Number.isFinite(n) ? n : null;
    }

    initWebSocket() {
        try {
            const loc = window.location;
            const wsScheme = loc.protocol === 'https:' ? 'wss' : 'ws';
            const wsUrl = `${wsScheme}://${loc.host}/comments`;
            this.socket = new WebSocket(wsUrl);
            this.socket.onopen = () => {
                console.log('Conectado al sistema de comentarios');
                if (this._statusCb) this._statusCb('open');
            };
            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleIncomingComment(data);
            };
            this.socket.onclose = () => {
                console.log('Desconectado del sistema de comentarios');
                if (this._statusCb) this._statusCb('closed');
                setTimeout(() => this.initWebSocket(), 3000);
            };
            this.socket.onerror = (error) => {
                console.error('Error en WebSocket:', error);
                if (this._statusCb) this._statusCb('error');
            };
        } catch (error) {
            console.error('Error al conectar WebSocket:', error);
        }
    }

    createCommentsUI() {
        if (document.getElementById('comments-container')) return;

        const commentsHTML = `
            <div id="comments-container" class="comments-container">
                <div class="comments-header">
                    <h3>Comentarios</h3>
                    <button id="toggle-comments" class="btn-toggle-comments">
                        <span>💬</span>
                    </button>
                </div>
                <div id="comments-panel" class="comments-panel">
                    <div id="comments-list" class="comments-list"></div>
                    <div class="comment-form">
                        <textarea id="comment-input" placeholder="Escribe un comentario..." rows="3"></textarea>
                        <button id="send-comment" class="btn-send-comment">Enviar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', commentsHTML);
        this.attachEventListeners();
        this.loadComments();
    }

    attachEventListeners() {
        const toggleBtn = document.getElementById('toggle-comments');
        const sendBtn = document.getElementById('send-comment');
        const commentInput = document.getElementById('comment-input');

        toggleBtn.addEventListener('click', () => {
            this.toggleCommentsPanel();
        });

        sendBtn.addEventListener('click', () => {
            this.sendComment();
        });

        commentInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendComment();
            }
        });
    }

    toggleCommentsPanel() {
        const panel = document.getElementById('comments-panel');
        const container = document.getElementById('comments-container');
        
        if (panel.style.display === 'none' || !panel.style.display) {
            panel.style.display = 'block';
            container.classList.add('expanded');
        } else {
            panel.style.display = 'none';
            container.classList.remove('expanded');
        }
    }

    async loadComments() {
        if (!this.avisoId) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBase}/comentarios/aviso/${this.avisoId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.comments = await response.json();
                this.renderComments();
            }
        } catch (error) {
            console.error('Error al cargar comentarios:', error);
        }
    }

    async sendComment() {
        const input = document.getElementById('comment-input');
        const content = input.value.trim();

        if (!content || !this.currentUser || !this.avisoId) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBase}/comentarios`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ aviso_id: this.avisoId, comentario: content })
            });

            if (response.ok) {
                const newComment = await response.json();
                input.value = '';
                
                // Enviar por WebSocket si está disponible, de lo contrario actualizar la lista local
                if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                    this.socket.send(JSON.stringify({
                        type: 'new_comment',
                        comment: newComment
                    }));
                } else {
                    this.comments.unshift(newComment);
                    this.renderComments();
                }
            }
        } catch (error) {
            console.error('Error al enviar comentario:', error);
        }
    }

    handleIncomingComment(data) {
        if (data.type === 'new_comment') {
            const c = data.comment;
            if (c && Number(c.aviso_id) === Number(this.avisoId)) {
                this.comments.unshift(c);
                this.renderComments();
                this.showNotification('Nuevo comentario recibido');
            }
        }
    }

    renderComments() {
        const commentsList = document.getElementById('comments-list');
        if (!commentsList) return;

        commentsList.innerHTML = (this.comments || []).map(comment => `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-author">${comment.autor?.nombre || 'Usuario'}${comment.autor?.email ? ': ' + comment.autor.email : ''}</span>
                    <span class="comment-time">${this.formatTime(comment.createdAt || comment.created_at)}</span>
                </div>
                <div class="comment-content">${comment.comentario}</div>
            </div>
        `).join('');

        // Scroll al último comentario
        commentsList.scrollTop = commentsList.scrollHeight;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showNotification(message) {
        // Crear notificación temporal
        const notification = document.createElement('div');
        notification.className = 'comment-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    destroy() {
        if (this.socket) {
            this.socket.close();
        }
        const container = document.getElementById('comments-container');
        if (container) {
            container.remove();
        }
    }
}

// CSS para el sistema de comentarios
const commentsCSS = `
.comments-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 350px;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border: 1px solid #e1e5e9;
}

.comments-container.expanded {
    height: 500px;
}

.comments-header {
    background: #f8f9fa;
    padding: 16px 20px;
    border-radius: 12px 12px 0 0;
    border-bottom: 1px solid #e1e5e9;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.comments-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #2c3e50;
}

.btn-toggle-comments {
    background: #007bff;
    border: none;
    border-radius: 8px;
    width: 40px;
    height: 40px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.btn-toggle-comments:hover {
    background: #0056b3;
    transform: scale(1.05);
}

.btn-toggle-comments span {
    font-size: 18px;
    color: white;
}

.comments-panel {
    display: none;
    height: 420px;
    display: flex;
    flex-direction: column;
}

.comments-list {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    max-height: 320px;
}

.comment-item {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
    border-left: 3px solid #007bff;
}

.comment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.comment-author {
    font-weight: 600;
    color: #2c3e50;
    font-size: 14px;
}

.comment-time {
    font-size: 12px;
    color: #6c757d;
}

.comment-content {
    color: #495057;
    line-height: 1.4;
    font-size: 14px;
    white-space: pre-wrap;
}

.comment-form {
    padding: 16px;
    border-top: 1px solid #e1e5e9;
    background: #f8f9fa;
    border-radius: 0 0 12px 12px;
}

.comment-form textarea {
    width: 100%;
    border: 1px solid #ced4da;
    border-radius: 6px;
    padding: 10px;
    font-size: 14px;
    resize: vertical;
    min-height: 60px;
    margin-bottom: 10px;
    font-family: inherit;
    box-sizing: border-box;
}

.comment-form textarea:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.btn-send-comment {
    background: #28a745;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
    width: 100%;
}

.btn-send-comment:hover {
    background: #218838;
}

.btn-send-comment:disabled {
    background: #6c757d;
    cursor: not-allowed;
}

.comment-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #28a745;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1001;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@media (max-width: 768px) {
    .comments-container {
        width: 300px;
        right: 10px;
        bottom: 10px;
    }
    
    .comments-container.expanded {
        height: 400px;
    }
    
    .comments-panel {
        height: 320px;
    }
    
    .comments-list {
        max-height: 220px;
    }
}
`;

// Inyectar CSS si no existe
if (!document.getElementById('comments-css')) {
    const style = document.createElement('style');
    style.id = 'comments-css';
    style.textContent = commentsCSS;
    document.head.appendChild(style);
}

// Inicializar sistema de comentarios cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        window.commentsSystem = new CommentsSystem();
    }
});