<script>
  import { onMount } from 'svelte';
  
  let room;
  let items = new Map();
  let nextId = 1;
  let svgCache = new Map();
  let snapToGrid = true;
  const gridSize = {
    x: 12,
    y: 8
  };

  // Add state for tracking dragged item
  let draggedItem = null;
  let dragOffset = { x: 0, y: 0 };

  // Add state for preview position
  let dragPreview = { x: 0, y: 0, show: false };

  onMount(async () => {
    await loadSVGs();
    loadSavedLayout();
  });

  async function loadSVGs() {
    try {
      console.log('Loading SVGs...');
      const [goldResponse, platinumResponse] = await Promise.all([
        fetch('/plaque-gold.svg'),
        fetch('/plaque-platinum.svg')
      ]);

      console.log('SVG responses:', {
        gold: goldResponse.status,
        platinum: platinumResponse.status
      });

      if (!goldResponse.ok) {
        throw new Error(`Failed to load gold SVG: ${goldResponse.status}`);
      }
      if (!platinumResponse.ok) {
        throw new Error(`Failed to load platinum SVG: ${platinumResponse.status}`);
      }

      const goldText = await goldResponse.text();
      const platinumText = await platinumResponse.text();

      if (!goldText.includes('<svg') || !platinumText.includes('<svg')) {
        throw new Error('Invalid SVG content received');
      }

      svgCache.set('plaque-gold', goldText);
      svgCache.set('plaque-platinum', platinumText);
    } catch (error) {
      console.error('Error loading SVGs:', error);
    }
  }

  function handleDragStart(e, type) {
    e.dataTransfer.setData('type', type);
  }

  function handleDrop(e) {
    e.preventDefault();
    dragPreview.show = false;
    const roomRect = room.getBoundingClientRect();
    const cellWidth = roomRect.width / gridSize.x;
    const cellHeight = roomRect.height / gridSize.y;

    if (draggedItem) {
      // Moving existing item
      let x = e.clientX - roomRect.left - dragOffset.x;
      let y = e.clientY - roomRect.top - dragOffset.y;

      if (snapToGrid) {
        x = Math.floor(x / cellWidth) * cellWidth;
        y = Math.floor(y / cellHeight) * cellHeight;
      }

      const item = items.get(draggedItem);
      items.set(draggedItem, { ...item, x, y });
      items = items; // Trigger reactivity
      draggedItem = null;
    } else {
      // Creating new item
      const type = e.dataTransfer.getData('type');
      let x = e.clientX - roomRect.left;
      let y = e.clientY - roomRect.top;

      if (snapToGrid) {
        x = Math.floor(x / cellWidth) * cellWidth;
        y = Math.floor(y / cellHeight) * cellHeight;
      }

      createItem(type, x, y);
    }
  }

  function createItem(type, x, y) {
    const id = `item-${nextId++}`;
    items.set(id, { type, x, y });
    items = items; // Trigger Svelte reactivity
  }

  function saveLayout() {
    localStorage.setItem('roomLayout', JSON.stringify(Array.from(items.entries())));
    alert('Layout saved!');
  }

  function loadSavedLayout() {
    const savedLayout = localStorage.getItem('roomLayout');
    if (savedLayout) {
      const layout = new Map(JSON.parse(savedLayout));
      layout.forEach((item, id) => {
        createItem(item.type, item.x, item.y);
      });
    }
  }

  function shareLayout() {
    const layout = Array.from(items.entries());
    const layoutString = btoa(JSON.stringify(layout));
    const shareUrl = `${window.location.origin}${window.location.pathname}?layout=${layoutString}`;

    navigator.clipboard.writeText(shareUrl);
    alert('Share URL copied to clipboard!');
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const roomRect = room.getBoundingClientRect();
    const cellWidth = roomRect.width / gridSize.x;
    const cellHeight = roomRect.height / gridSize.y;

    let x, y;
    
    if (draggedItem) {
      // If dragging existing item, use offset
      x = e.clientX - roomRect.left - dragOffset.x;
      y = e.clientY - roomRect.top - dragOffset.y;
    } else {
      // If dragging new item, center it on cursor
      x = e.clientX - roomRect.left - (100 / 2); // 100 is item width
      y = e.clientY - roomRect.top - (120 / 2);  // 120 is item height
    }

    if (snapToGrid) {
      x = Math.floor(x / cellWidth) * cellWidth;
      y = Math.floor(y / cellHeight) * cellHeight;
    }

    // Keep preview within bounds
    x = Math.max(0, Math.min(x, roomRect.width - 100));
    y = Math.max(0, Math.min(y, roomRect.height - 120));

    dragPreview = { x, y, show: true };
  }

  function handleDragLeave() {
    dragPreview.show = false;
  }

  // Add handlers for dragging placed items
  function handleItemDragStart(e, id, item) {
    e.stopPropagation();
    draggedItem = id;
    const rect = e.target.getBoundingClientRect();
    dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    e.dataTransfer.setData('text/plain', ''); // Required for Firefox
  }
</script>

<div class="toolbar">
  <button on:click={saveLayout}>Save Layout</button>
  <button on:click={shareLayout}>Share Layout</button>
  <div class="toggle-container">
    <label for="gridSnap">Snap to Grid</label>
    <input type="checkbox" id="gridSnap" bind:checked={snapToGrid}>
  </div>
</div>

<div class="container">
  <div class="assets-panel">
    <h3>Available Items</h3>
    <div class="asset-item" draggable="true" on:dragstart={(e) => handleDragStart(e, 'plaque-gold')}>
      <object data="/plaque-gold.svg" type="image/svg+xml" width="50" height="60"></object>
    </div>
    <div class="asset-item" draggable="true" on:dragstart={(e) => handleDragStart(e, 'plaque-platinum')}>
      <object data="/plaque-platinum.svg" type="image/svg+xml" width="50" height="60"></object>
    </div>
    <div class="asset-item" draggable="true" on:dragstart={(e) => handleDragStart(e, 'plant')}>🌴</div>
  </div>

  <div class="room-container">
    <div class="grid-overlay"></div>
    <div 
      bind:this={room}
      class="room"
      on:dragover={handleDragOver}
      on:dragleave={handleDragLeave}
      on:drop={handleDrop}
    >
      {#if dragPreview.show}
        <div 
          class="drag-preview"
          style="left: {dragPreview.x}px; top: {dragPreview.y}px;"
        >
          <div class="preview-box"></div>
        </div>
      {/if}

      {#each [...items] as [id, item] (id)}
        <div 
          class="draggable-item"
          style="left: {item.x}px; top: {item.y}px;"
          draggable="true"
          on:dragstart={(e) => handleItemDragStart(e, id, item)}
        >
          {#if item.type === 'plant'}
            🌴
          {:else}
            <object 
              data="/{item.type}.svg"
              type="image/svg+xml"
              width="100"
              height="120"
            ></object>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  :global(*) {
    font-family: 'Inter', sans-serif;
  }

  .container {
    display: flex;
    gap: 30px;
    padding: 80px 20px 20px 20px;
    position: relative;
    min-height: 100vh;
    box-sizing: border-box;
    justify-content: center;
  }

  .room-container {
    position: relative;
    width: 1200px;
    height: 800px;
    background: white;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    flex-shrink: 0;
  }

  .room {
    background-image: url('/bg.png');
    background-size: cover;
    width: 100%;
    height: 100%;
    position: relative;
  }

  .grid-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    grid-template-rows: repeat(8, 1fr);
    pointer-events: none;
    z-index: 2;
    display: none;
  }

  .grid-overlay::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent 98%, rgba(0,0,0,0.1) 2%),
                linear-gradient(0deg, transparent 98%, rgba(0,0,0,0.1) 2%);
    background-size: 8.33% 12.5%;
  }

  .assets-panel {
    background: #f5f5f5;
    padding: 20px;
    width: 300px;
    height: fit-content;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    align-self: flex-start;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .assets-panel h3 {
    margin: 0 0 20px 0;
    font-weight: 600;
    color: #1a1a1a;
    text-align: center;
    width: 100%;
  }

  .asset-item {
    padding: 0;
    margin: 0 auto 12px auto;
    background: white;
    border: 1px solid #ddd;
    cursor: move;
    user-select: none;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 120px;
    width: 100px;
    transition: all 0.2s;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }

  .asset-item:hover {
    border-color: #007bff;
    box-shadow: 0 2px 4px -1px rgb(0 0 0 / 0.1);
  }

  .asset-item :global(object) {
    pointer-events: none;
    width: 80px;
    height: 100px;
    object-fit: contain;
    display: block;
    margin: auto;
  }

  .draggable-item {
    position: absolute;
    cursor: move;
    z-index: 5;
    width: 100px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: all;
    background: transparent;
    user-select: none; /* Add this to prevent text selection while dragging */
  }

  .draggable-item :global(object) {
    pointer-events: none;
    width: 80px;
    height: 100px;
    object-fit: contain;
  }

  .toolbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    gap: 12px;
    z-index: 10;
    align-items: center;
    padding: 20px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid #eee;
    justify-content: flex-end;
    height: 60px;
    box-sizing: border-box;
  }

  button {
    padding: 8px 16px;
    background: #007bff;
    color: white;
    border: none;
    cursor: pointer;
    font-weight: 500;
    font-size: 14px;
    transition: all 0.2s;
  }

  button:hover {
    background: #0056b3;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px -1px rgb(0 0 0 / 0.1);
  }

  .toggle-container {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 16px;
    color: #333;
    font-size: 14px;
    font-weight: 500;
  }

  .toggle-container input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: #007bff;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    background: #f8f9fa;
  }

  .asset-item :global(svg) {
    pointer-events: none;
  }

  .drag-preview {
    position: absolute;
    pointer-events: none;
    z-index: 10;
  }

  .preview-box {
    width: 100px;
    height: 120px;
    border: 2px dashed #007bff;
    border-radius: 4px;
    background: rgba(0, 123, 255, 0.1);
  }
</style> 