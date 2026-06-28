/* ======================================
   Flowchart Renderer
   Renders nodes + SVG edges from JSON
   ====================================== */

class FlowchartRenderer {
  constructor(canvasEngine, nodesContainer, edgesSvg) {
    this.engine = canvasEngine;
    this.nodesContainer = nodesContainer;
    this.edgesSvg = edgesSvg;
    this.data = null;
    this.nodeElements = {};
    this.decorElements = [];
    this.collapsedStates = {};
    this.hiddenNodes = new Set();

    // Callback when a node is clicked
    this.onNodeClick = null;

    // Hook into canvas update
    this.engine.onUpdate = () => this._updatePositions();
  }

  /** Load data and render */
  render(data, isSubRoadmap = false) {
    this.data = data;
    this.nodeElements = {};

    // Initialize collapsed states (default to true: all hidden)
    if (data.id === 'roadmap') {
      const saved = localStorage.getItem('roadmap_collapse');
      if (saved) {
        this.collapsedStates = JSON.parse(saved);
      } else {
        this.collapsedStates = {};
        data.nodes.forEach(n => this.collapsedStates[n.id] = true);
      }
    } else {
      this.collapsedStates = {};
      data.nodes.forEach(n => this.collapsedStates[n.id] = true);
    }

    // Clear previous
    this.nodesContainer.innerHTML = '';
    this.edgesSvg.innerHTML = '';

    // Set bounds
    if (data.bounds) {
      this.engine.setBounds(data.bounds);
    }

    // Create arrow marker
    this._createArrowMarker();

    // Render nodes
    data.nodes.forEach((node, i) => {
      const el = this._createNodeElement(node, isSubRoadmap);
      // Fade in with staggered delay
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.4s ease';
      this.nodesContainer.appendChild(el);
      this.nodeElements[node.id] = { el, data: node };
      setTimeout(() => { el.style.opacity = '1'; }, 50 + i * 80);
    });

    // Render decors
    if (data.decors) {
      data.decors.forEach(decor => {
        const el = createElement('img', {
          className: 'flow-decor',
          src: decor.src
        });
        el.style.position = 'absolute';
        if (decor.width) el.style.width = decor.width;
        if (decor.height) el.style.height = decor.height;
        if (!decor.width && !decor.height) el.style.height = '400px';
        el.style.opacity = decor.opacity || '0.2';
        el.style.pointerEvents = 'none';
        el.style.zIndex = '5';
        this.nodesContainer.appendChild(el);
        this.decorElements.push({ el, data: decor });
      });
    }

    // Render edges
    data.edges.forEach(edge => {
      this._createEdge(edge);
    });

    // Initial position update
    this.engine.reset();
    this._updatePositions();
  }

  /** Create a node DOM element */
  _createNodeElement(node, isSubRoadmap) {
    const type = node.type || (isSubRoadmap ? 'lesson' : 'course');
    const statusClass = `flow-node--${node.status || 'available'}`;
    const typeClass = `flow-node--${type}`;
    const isClickable = !!node.courseFile || type === 'lesson';

    const el = createElement('div', {
      className: `flow-node ${statusClass} ${typeClass}`,
      'data-id': node.id,
      'data-clickable': isClickable
    });

    // Set custom color
    if (node.color) {
      el.style.setProperty('--node-color', node.color);
      el.style.borderColor = node.color;
    }

    // Icon (extract emoji from label)
    let icon = '';
    let label = node.label;
    try {
      const emojiMatch = node.label.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u);
      if (emojiMatch) {
        icon = emojiMatch[0].trim();
        label = node.label.slice(emojiMatch[0].length);
      }
    } catch (e) {
      // Fallback: check for common emoji patterns
      const simpleMatch = node.label.match(/^([\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF]+)\s*/);
      if (simpleMatch) {
        icon = simpleMatch[0].trim();
        label = node.label.slice(simpleMatch[0].length);
      }
    }

    if (node.faIcon) {
      const iconEl = createElement('span', { className: 'flow-node__icon' });
      iconEl.innerHTML = `<i class="${node.faIcon}"></i>`;
      el.appendChild(iconEl);
    } else if (icon) {
      el.appendChild(createElement('span', { className: 'flow-node__icon', textContent: icon }));
    }

    el.appendChild(createElement('div', { className: 'flow-node__label', textContent: label }));

    if (node.description) {
      el.appendChild(createElement('div', { className: 'flow-node__desc', textContent: node.description }));
    }

    // Check if node has children
    const hasChildren = this.data.layout === 'tree' && this.data.edges.some(e => e.from === node.id);
    if (hasChildren) {
      el.setAttribute('data-expandable', 'true');
      el.setAttribute('data-collapsed', !!this.collapsedStates[node.id]);
    }

    // Click handler
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (node.status === 'locked') return;

      if (hasChildren) {
        // Toggle collapse state
        this.collapsedStates[node.id] = !this.collapsedStates[node.id];
        el.setAttribute('data-collapsed', this.collapsedStates[node.id]);
        this._updatePositions();
      }

      if (this.onNodeClick) this.onNodeClick(node);
    });

    return el;
  }

  /** Create SVG arrow marker definition */
  _createArrowMarker() {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <marker id="arrowhead" markerWidth="14" markerHeight="10" 
              refX="12" refY="5" orient="auto" markerUnits="userSpaceOnUse">
        <polygon points="0 0, 14 5, 0 10" class="edge-arrow-marker" />
      </marker>
      <marker id="arrowhead-locked" markerWidth="14" markerHeight="10" 
              refX="12" refY="5" orient="auto" markerUnits="userSpaceOnUse">
        <polygon points="0 0, 14 5, 0 10" fill="rgba(255,255,255,0.15)" />
      </marker>
    `;
    this.edgesSvg.appendChild(defs);
  }

  /** Create an SVG edge between two nodes */
  _createEdge(edge) {
    const fromNode = this.data.nodes.find(n => n.id === edge.from);
    const toNode = this.data.nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('data-from', edge.from);
    path.setAttribute('data-to', edge.to);
    if (edge.type) path.setAttribute('data-type', edge.type);

    const isLocked = toNode.status === 'locked';
    path.classList.add('edge-line');
    if (isLocked) path.classList.add('edge-line--locked');
    path.setAttribute('marker-end', isLocked ? 'url(#arrowhead-locked)' : 'url(#arrowhead)');

    this.edgesSvg.appendChild(path);
  }

  _calculateAutoLayout() {
    if (!this.data || this.data.layout !== 'tree') return;

    this.hiddenNodes = new Set();
    const incomingEdges = new Set(this.data.edges.map(e => e.to));
    const roots = this.data.nodes.filter(n => !incomingEdges.has(n.id));
    
    if (roots.length === 0) return;

    let currentY = 0;
    const startX = -200;

    const layoutTree = (nodeId, xLevel, isHidden) => {
      const node = this.data.nodes.find(n => n.id === nodeId);
      if (!node) return;

      if (isHidden) {
        this.hiddenNodes.add(nodeId);
      } else {
        node.x = xLevel;
        node.y = currentY;
      }

      const isCollapsed = this.collapsedStates[nodeId];
      const children = this.data.edges.filter(e => e.from === nodeId).map(e => e.to);
      
      children.forEach(childId => {
        if (!isHidden && !isCollapsed) {
          currentY += 150;
        }
        layoutTree(childId, xLevel + 400, isHidden || isCollapsed);
      });
    };

    roots.forEach(root => {
      layoutTree(root.id, startX, false);
      currentY += 200;
    });

    // Auto-center horizontally
    const visibleNodes = this.data.nodes.filter(n => !this.hiddenNodes.has(n.id));
    if (visibleNodes.length > 0) {
      const minX = Math.min(...visibleNodes.map(n => n.x));
      const maxX = Math.max(...visibleNodes.map(n => n.x));
      const offsetX = -(minX + maxX) / 2;
      
      this.data.nodes.forEach(n => {
        n.x += offsetX;
      });
      
      const minY = Math.min(...visibleNodes.map(n => n.y));
      const titleY = this.data.titleY !== undefined ? this.data.titleY : minY - 200;
      
      const newMinX = Math.min(...this.data.nodes.map(n => n.x));
      const newMaxX = Math.max(...this.data.nodes.map(n => n.x));
      const newMinY = Math.min(...this.data.nodes.map(n => n.y));
      const newMaxY = Math.max(...this.data.nodes.map(n => n.y));

      this.engine.bounds = {
        ...this.engine.bounds, // Preserve startX and startY
        minX: newMinX - 1000,
        maxX: newMaxX + 1000,
        minY: newMinY - 1000,
        maxY: newMaxY + 1000
      };
      // Also update data.bounds so minimap scales correctly
      this.data.bounds = this.engine.bounds;
    }
  }

  /** Update all node positions and edges based on canvas state */
  _updatePositions() {
    if (!this.data) return;

    this._calculateAutoLayout();

    // Update nodes
    Object.values(this.nodeElements).forEach(({ el, data: node }) => {
      const isHidden = this.data.layout === 'tree' && this.hiddenNodes.has(node.id);
      el.classList.toggle('flow-node--hidden', isHidden);

      const screen = this.engine.worldToScreen(node.x, node.y);
      const w = el.offsetWidth || 260;
      const h = el.offsetHeight || 100;
      el.style.left = `${screen.x - w / 2}px`;
      el.style.top = `${screen.y - h / 2}px`;
    });

    // Update decors
    this.decorElements.forEach(({ el, data: decor }) => {
      const screen = this.engine.worldToScreen(decor.x, decor.y);
      el.style.left = `${screen.x}px`;
      el.style.top = `${screen.y}px`;
      const scale = this.engine.zoom * (decor.scale || 1);
      el.style.transform = `translate(-50%, -50%) rotate(${decor.rotation || 0}deg) scale(${scale})`;
    });

    // Update title so it moves with the canvas
    const titleContainer = document.getElementById('world-title-container');
    if (titleContainer && this.data && this.data.nodes.length > 0) {
      // Determine Y coordinate: use data.titleY if specified, otherwise place 200px above highest node
      let titleWorldY = -350;
      if (this.data.titleY !== undefined) {
        titleWorldY = this.data.titleY;
      } else {
        const highestNodeY = Math.min(...this.data.nodes.map(n => n.y));
        titleWorldY = highestNodeY - 200;
      }
      // Calculate horizontal center of the node cluster
      const visibleNodes = this.data.nodes.filter(n => !this.hiddenNodes.has(n.id));
      const nodesForCenter = visibleNodes.length > 0 ? visibleNodes : this.data.nodes;
      const minX = Math.min(...nodesForCenter.map(n => n.x));
      const maxX = Math.max(...nodesForCenter.map(n => n.x));
      const centerX = (minX + maxX) / 2;

      const screen = this.engine.worldToScreen(centerX, titleWorldY);
      titleContainer.style.left = `${screen.x}px`;
      titleContainer.style.top = `${screen.y}px`;
      titleContainer.style.transform = `translate(-50%, -50%) scale(${this.engine.zoom})`;
    }

    // Update edges
    const paths = this.edgesSvg.querySelectorAll('path.edge-line');
    paths.forEach(path => {
      const fromId = path.getAttribute('data-from');
      const toId = path.getAttribute('data-to');
      const edgeType = path.getAttribute('data-type');
      const fromNode = this.data.nodes.find(n => n.id === fromId);
      const toNode = this.data.nodes.find(n => n.id === toId);
      if (!fromNode || !toNode) return;

      if (this.data.layout === 'tree' && this.hiddenNodes) {
        const isHidden = this.hiddenNodes.has(fromId) || this.hiddenNodes.has(toId);
        path.classList.toggle('edge-line--hidden', isHidden);
      }

      const fromScreen = this.engine.worldToScreen(fromNode.x, fromNode.y);
      const toScreen = this.engine.worldToScreen(toNode.x, toNode.y);

      const fromEl = this.nodeElements[fromId]?.el;
      const toEl = this.nodeElements[toId]?.el;
      const fromH = (fromEl?.offsetHeight || 80) / 2;
      const toH = (toEl?.offsetHeight || 80) / 2;
      const toW = (toEl?.offsetWidth || 240) / 2;

      let d = '';
      if (edgeType === 'tree') {
        // Orthogonal routing: Spine goes down from Parent center, then branches to Child left-center
        const x1 = fromScreen.x;
        const y1 = fromScreen.y + fromH;
        
        // Target left-center of child
        const x2 = toScreen.x - toW - 8; // -8 for some padding before arrowhead
        const y2 = toScreen.y;
        
        d = `M ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2}`;
      } else {
        // Normal straight line
        const x1 = fromScreen.x;
        const y1 = fromScreen.y + fromH;
        const x2 = toScreen.x;
        const y2 = toScreen.y - toH - 8; // padding for arrowhead
        d = `M ${x1} ${y1} L ${x2} ${y2}`;
      }

      path.setAttribute('d', d);
    }); // Update HUD
    this._updateHUD();
    this._updateMinimap();
  }

  /** Update HUD display */
  _updateHUD() {
    const hudX = document.getElementById('hudX');
    const hudY = document.getElementById('hudY');
    const hudZoom = document.getElementById('hudZoom');
    if (hudX) hudX.textContent = Math.round(-this.engine.panX);
    if (hudY) hudY.textContent = Math.round(-this.engine.panY);
    if (hudZoom) hudZoom.textContent = Math.round(this.engine.zoom * 100) + '%';
  }

  /** Update minimap */
  _updateMinimap() {
    const viewport = document.getElementById('minimapViewport');
    const minimapNodes = document.querySelector('.minimap-nodes');
    if (!viewport || !this.data?.bounds) return;

    const mmW = 140;
    const mmH = 95;
    const b = this.data.bounds;
    const worldW = b.maxX - b.minX;
    const worldH = b.maxY - b.minY;
    const scaleX = mmW / worldW;
    const scaleY = mmH / worldH;
    const scale = Math.min(scaleX, scaleY) * 0.8;

    // Viewport rectangle
    const c = this.engine.screenCenter;
    const vpWorldW = (c.x * 2) / this.engine.zoom;
    const vpWorldH = (c.y * 2) / this.engine.zoom;
    const vpWorldX = -this.engine.panX - vpWorldW / 2;
    const vpWorldY = -this.engine.panY - vpWorldH / 2;

    const offsetX = mmW / 2;
    const offsetY = mmH / 2;

    viewport.style.width = Math.max(8, vpWorldW * scale) + 'px';
    viewport.style.height = Math.max(6, vpWorldH * scale) + 'px';
    viewport.style.left = clamp(offsetX + vpWorldX * scale, 0, mmW - 8) + 'px';
    viewport.style.top = clamp(offsetY + vpWorldY * scale, 0, mmH - 6) + 'px';

    // Minimap node dots
    if (minimapNodes) {
      minimapNodes.innerHTML = '';
      this.data.nodes.forEach(node => {
        const dot = createElement('div', { className: 'minimap-node-dot' });
        dot.style.left = (offsetX + node.x * scale - 2) + 'px';
        dot.style.top = (offsetY + node.y * scale - 2) + 'px';
        if (node.color) dot.style.background = node.color;
        minimapNodes.appendChild(dot);
      });
    }
  }
}
