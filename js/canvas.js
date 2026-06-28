/* ======================================
   Bounded Canvas Engine
   Pan & zoom with limits
   ====================================== */

class CanvasEngine {
  constructor(container) {
    this.container = container;
    this.canvas = container.querySelector('#infinite-canvas');
    this.dotGrid = container.querySelector('#dotGrid');
    this.majorGrid = container.querySelector('#majorGrid');

    // State
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
    this.bounds = null; // { minX, minY, maxX, maxY }

    this.MIN_ZOOM = 0.3;
    this.MAX_ZOOM = 3;

    // Drag state
    this._isDragging = false;
    this._dragStartX = 0;
    this._dragStartY = 0;
    this._panStartX = 0;
    this._panStartY = 0;

    // Touch state
    this._lastTouchDist = 0;
    this._isTouching = false;

    // Callbacks
    this.onUpdate = null;

    this._bindEvents();
  }

  setBounds(bounds) {
    this.bounds = bounds;
    this._clampPan();
    this.update();
  }

  /** Get the center of the canvas in screen coordinates */
  get screenCenter() {
    return {
      x: this.container.clientWidth / 2,
      y: this.container.clientHeight / 2
    };
  }

  /** Convert world coordinates to screen position */
  worldToScreen(wx, wy) {
    const c = this.screenCenter;
    return {
      x: c.x + (wx + this.panX) * this.zoom,
      y: c.y + (wy + this.panY) * this.zoom
    };
  }

  /** Convert screen coordinates to world position */
  screenToWorld(sx, sy) {
    const c = this.screenCenter;
    return {
      x: (sx - c.x) / this.zoom - this.panX,
      y: (sy - c.y) / this.zoom - this.panY
    };
  }

  /** Clamp pan within bounds */
  _clampPan() {
    if (!this.bounds) return;
    const b = this.bounds;
    const c = this.screenCenter;
    const halfW = c.x / this.zoom;
    const halfH = c.y / this.zoom;

    // Allow some margin so nodes at edges are visible
    const margin = 100;
    const minX = -b.maxX - margin + halfW;
    const maxX = -b.minX + margin - halfW;
    const minY = -b.maxY - margin + halfH;
    const maxY = -b.minY + margin - halfH;

    // If screen is wider than bounds, lock to center (0)
    if (minX > maxX) {
      this.panX = 0;
    } else {
      this.panX = clamp(this.panX, minX, maxX);
    }

    if (minY > maxY) {
      this.panY = 0;
    } else {
      this.panY = clamp(this.panY, minY, maxY);
    }
  }

  /** Update visual state */
  update() {
    // Update grid backgrounds
    const dotSize = 40 * this.zoom;
    const majorSize = 200 * this.zoom;
    const c = this.screenCenter;

    const offsetX = (this.panX * this.zoom + c.x);
    const offsetY = (this.panY * this.zoom + c.y);

    const dotOffX = ((offsetX % dotSize) + dotSize) % dotSize;
    const dotOffY = ((offsetY % dotSize) + dotSize) % dotSize;
    this.dotGrid.style.backgroundSize = `${dotSize}px ${dotSize}px`;
    this.dotGrid.style.backgroundPosition = `${dotOffX}px ${dotOffY}px`;

    const majorOffX = ((offsetX % majorSize) + majorSize) % majorSize;
    const majorOffY = ((offsetY % majorSize) + majorSize) % majorSize;
    this.majorGrid.style.backgroundSize = `${majorSize}px ${majorSize}px`;
    this.majorGrid.style.backgroundPosition = `${majorOffX}px ${majorOffY}px`;

    if (this.onUpdate) this.onUpdate();
  }

  /** Zoom at a specific screen point */
  zoomAt(sx, sy, newZoom) {
    newZoom = clamp(newZoom, this.MIN_ZOOM, this.MAX_ZOOM);
    const c = this.screenCenter;

    // World point under cursor before zoom
    const worldX = (sx - c.x) / this.zoom - this.panX;
    const worldY = (sy - c.y) / this.zoom - this.panY;

    this.zoom = newZoom;

    // Adjust pan so same world point stays under cursor
    this.panX = (sx - c.x) / this.zoom - worldX;
    this.panY = (sy - c.y) / this.zoom - worldY;

    this._clampPan();
    this.update();
  }

  /** Reset to top center (0, 0) */
  reset() {
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
    this._clampPan();
    this.update();
  }

  /** Bind all input events */
  _bindEvents() {
    const el = this.container;

    // Mouse drag
    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      // Don't start drag if clicking a node
      if (e.target.closest('.flow-node')) return;
      this._isDragging = true;
      this._dragStartX = e.clientX;
      this._dragStartY = e.clientY;
      this._panStartX = this.panX;
      this._panStartY = this.panY;
      el.classList.add('grabbing');
    });

    document.addEventListener('mousemove', (e) => {
      if (!this._isDragging) return;
      const dx = e.clientX - this._dragStartX;
      const dy = e.clientY - this._dragStartY;
      this.panX = this._panStartX + dx / this.zoom;
      this.panY = this._panStartY + dy / this.zoom;
      this._clampPan();
      this.update();
    });

    document.addEventListener('mouseup', () => {
      this._isDragging = false;
      el.classList.remove('grabbing');
    });

    // Wheel event (pan by default, zoom with ctrl/meta)
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const delta = -e.deltaY * 0.005;
        const newZoom = this.zoom * (1 + delta);
        this.zoomAt(e.clientX, e.clientY, newZoom);
      } else {
        // Pan
        this.panX -= e.deltaX / this.zoom;
        this.panY -= e.deltaY / this.zoom;
        this._clampPan();
        this.update();
      }
    }, { passive: false });

    // Touch
    el.addEventListener('touchstart', (e) => {
      if (e.target.closest('.flow-node')) return;
      if (e.touches.length === 1) {
        this._isTouching = true;
        this._dragStartX = e.touches[0].clientX;
        this._dragStartY = e.touches[0].clientY;
        this._panStartX = this.panX;
        this._panStartY = this.panY;
      } else if (e.touches.length === 2) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        this._lastTouchDist = Math.hypot(dx, dy);
      }
      e.preventDefault();
    }, { passive: false });

    el.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this._isTouching) {
        const dx = e.touches[0].clientX - this._dragStartX;
        const dy = e.touches[0].clientY - this._dragStartY;
        this.panX = this._panStartX + dx / this.zoom;
        this.panY = this._panStartY + dy / this.zoom;
        this._clampPan();
        this.update();
      } else if (e.touches.length === 2) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const dist = Math.hypot(dx, dy);
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        if (this._lastTouchDist > 0) {
          this.zoomAt(midX, midY, this.zoom * (dist / this._lastTouchDist));
        }
        this._lastTouchDist = dist;
      }
      e.preventDefault();
    }, { passive: false });

    el.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) this._lastTouchDist = 0;
      if (e.touches.length === 0) this._isTouching = false;
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      const step = 60 / this.zoom;
      switch (e.key) {
        case 'ArrowUp': this.panY += step; break;
        case 'ArrowDown': this.panY -= step; break;
        case 'ArrowLeft': this.panX += step; break;
        case 'ArrowRight': this.panX -= step; break;
        case '+': case '=':
          this.zoomAt(this.screenCenter.x, this.screenCenter.y, this.zoom * 1.15);
          return;
        case '-':
          this.zoomAt(this.screenCenter.x, this.screenCenter.y, this.zoom / 1.15);
          return;
        case '0':
          this.reset();
          return;
        default: return;
      }
      this._clampPan();
      this.update();
    });

    // Resize
    window.addEventListener('resize', debounce(() => this.update(), 100));
  }
}
