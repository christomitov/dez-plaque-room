class RoomPlanner {
    constructor() {
        this.room = document.getElementById('room');
        this.gridSize = {
            x: 12,
            y: 8
        };
        this.items = new Map();
        this.nextId = 1;
        this.svgCache = new Map();
        this.snapToGrid = true;
        
        this.loadSVGs().then(() => {
            this.initializeEventListeners();
            this.loadSavedLayout();
        });
    }

    async loadSVGs() {
        try {
            const [goldResponse, platinumResponse] = await Promise.all([
                fetch('assets/plaque-gold.svg'),
                fetch('assets/plaque-platinum.svg')
            ]);
            
            if (!goldResponse.ok) {
                throw new Error(`Failed to load gold SVG: ${goldResponse.status}`);
            }
            if (!platinumResponse.ok) {
                throw new Error(`Failed to load platinum SVG: ${platinumResponse.status}`);
            }
            
            const goldText = await goldResponse.text();
            const platinumText = await platinumResponse.text();
            
            console.log('SVG Load Status:', {
                gold: goldResponse.status,
                platinum: platinumResponse.status
            });
            
            this.svgCache.set('plaque-gold', goldText);
            this.svgCache.set('plaque-platinum', platinumText);
        } catch (error) {
            console.error('Error loading SVGs:', error);
            // Add visual feedback for users
            document.querySelectorAll('.asset-item[data-type="plaque-platinum"]').forEach(item => {
                item.style.opacity = '0.5';
                item.title = 'Failed to load asset';
            });
        }
    }

    initializeEventListeners() {
        // Asset panel drag start
        document.querySelectorAll('.asset-item').forEach(item => {
            item.addEventListener('dragstart', (e) => this.handleDragStart(e));
        });

        // Room drop zone
        this.room.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        this.room.addEventListener('drop', (e) => this.handleDrop(e));

        // Save button
        document.getElementById('saveBtn').addEventListener('click', () => this.saveLayout());
        
        // Share button
        document.getElementById('shareBtn').addEventListener('click', () => this.shareLayout());

        // Grid snap toggle
        document.getElementById('gridSnap').addEventListener('change', (e) => {
            this.snapToGrid = e.target.checked;
        });
    }

    handleDragStart(e) {
        e.dataTransfer.setData('type', e.target.dataset.type);
    }

    handleDrop(e) {
        e.preventDefault();
        const type = e.dataTransfer.getData('type');
        const roomRect = this.room.getBoundingClientRect();
        
        const cellWidth = roomRect.width / this.gridSize.x;
        const cellHeight = roomRect.height / this.gridSize.y;
        
        let x = e.clientX - roomRect.left;
        let y = e.clientY - roomRect.top;
        
        if (this.snapToGrid) {
            x = Math.floor(x / cellWidth) * cellWidth;
            y = Math.floor(y / cellHeight) * cellHeight;
        }
        
        this.createItem(type, x, y);
    }

    createItem(type, x, y) {
        const item = document.createElement('div');
        const id = `item-${this.nextId++}`;
        
        item.id = id;
        item.className = 'draggable-item';
        item.style.left = `${x}px`;
        item.style.top = `${y}px`;
        
        switch(type) {
            case 'plaque-gold':
            case 'plaque-platinum':
                const object = document.createElement('object');
                object.data = `assets/${type}.svg`;
                object.type = 'image/svg+xml';
                object.width = 100;
                object.height = 120;
                object.style.pointerEvents = 'none';
                item.appendChild(object);
                break;
            case 'plant':
                item.innerHTML = '🌴';
                break;
        }

        this.makeDraggable(item);
        this.room.appendChild(item);
        
        this.items.set(id, {
            type,
            x,
            y
        });
    }

    makeDraggable(element) {
        let pos = { x: 0, y: 0 };
        
        element.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const rect = element.getBoundingClientRect();
            pos = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            const mouseMoveHandler = (e) => {
                const roomRect = this.room.getBoundingClientRect();
                const cellWidth = roomRect.width / this.gridSize.x;
                const cellHeight = roomRect.height / this.gridSize.y;
                
                let newX = e.clientX - pos.x - roomRect.left;
                let newY = e.clientY - pos.y - roomRect.top;
                
                if (this.snapToGrid) {
                    newX = Math.floor(newX / cellWidth) * cellWidth;
                    newY = Math.floor(newY / cellHeight) * cellHeight;
                }
                
                // Boundary checking
                newX = Math.max(0, Math.min(newX, roomRect.width - cellWidth));
                newY = Math.max(0, Math.min(newY, roomRect.height - cellHeight));
                
                element.style.left = `${newX}px`;
                element.style.top = `${newY}px`;
                
                this.items.set(element.id, {
                    type: this.items.get(element.id).type,
                    x: newX,
                    y: newY
                });
            };
            
            const mouseUpHandler = () => {
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
            };
            
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        });
    }

    saveLayout() {
        localStorage.setItem('roomLayout', JSON.stringify(Array.from(this.items.entries())));
        alert('Layout saved!');
    }

    loadSavedLayout() {
        const savedLayout = localStorage.getItem('roomLayout');
        if (savedLayout) {
            const layout = new Map(JSON.parse(savedLayout));
            layout.forEach((item, id) => {
                this.createItem(item.type, item.x, item.y);
            });
        }
    }

    shareLayout() {
        const layout = Array.from(this.items.entries());
        const layoutString = btoa(JSON.stringify(layout));
        const shareUrl = `${window.location.origin}${window.location.pathname}?layout=${layoutString}`;
        
        // Create temporary input to copy URL
        const temp = document.createElement('input');
        document.body.appendChild(temp);
        temp.value = shareUrl;
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        
        alert('Share URL copied to clipboard!');
    }
}

// Initialize the room planner when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const planner = new RoomPlanner();
}); 