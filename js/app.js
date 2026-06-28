/* ======================================
   App — Main Entry Point
   Init canvas, flowchart, navigation
   ====================================== */

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("canvas-container");
  if (!container) return;

  // 1. Init canvas engine
  const engine = new CanvasEngine(container);

  // 2. Init flowchart renderer
  const nodesContainer = document.getElementById("nodes-container");
  const edgesSvg = document.getElementById("edges-svg");
  const flowchart = new FlowchartRenderer(engine, nodesContainer, edgesSvg);

  // 3. Init navigation
  const nav = new NavigationController(flowchart);
  nav.init();

  // Center canvas based on data bounds
  engine.reset();

  // 4. Init particles
  const bgCanvas = document.getElementById("bg-canvas");
  if (bgCanvas) {
    const particles = new ParticleSystem(bgCanvas);
    window.addEventListener("load", () => particles.init());
  }

  // 5. Reset button
  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      engine.reset();
    });
  }

  // 6. Help toast auto-hide
  const helpToast = document.getElementById("helpToast");
  if (helpToast) {
    setTimeout(() => helpToast.classList.add("hidden"), 4000);
  }
});
