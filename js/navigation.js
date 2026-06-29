/* ======================================
   Navigation Controller
   Roadmap ↔ Sub-roadmap switching
   Breadcrumb management
   ====================================== */

class NavigationController {
  constructor(flowchart) {
    this.flowchart = flowchart;
    this.viewTitleEl = document.getElementById("viewTitle");
  }

  /** Initialize: load and render data for the current HTML page */
  async init() {
    if (!window.PAGE_DATA) {
      console.error("No PAGE_DATA found in this HTML file.");
      return;
    }

    this._renderData(window.PAGE_DATA);
  }

  /** Render a specific flowchart data */
  _renderData(data) {
    // If it's the root roadmap, isSub = false
    const isSub =
      data.id !== undefined &&
      data.id !== "roadmap" &&
      data.parentRoadmap !== undefined;

    this.flowchart.render(data, isSub);
    this.flowchart.onNodeClick = (node) => this._onNodeClick(node);

    this._setViewTitle(data.title, data.id);
  }

  /** Handle click on any node */
  async _onNodeClick(node) {
    if (node.targetHtml) {
      // It's a sub-roadmap with a dedicated HTML page!
      window.location.href = node.targetHtml;
    } else if (node.type === "lesson") {
      // Navigate to lesson page
      // Note: In a real app you might want lesson.html?id=...
      const lessonPage = (window.BASE_PATH || "") + "lesson.html";
      const url = buildUrl(lessonPage, {
        file: node.lessonFile || "placeholder.js"
      });
      window.location.href = url;
    }
  }

  /** Set view title with glitch animation */
  _setViewTitle(title, courseId) {
    if (!this.viewTitleEl) return;
    this.viewTitleEl.innerHTML = title;

    // Remove previous modifiers
    this.viewTitleEl.classList.remove(
      "view-title--beginner",
      "view-title--blueteam",
      "view-title--redteam",
      "view-title--sub",
    );

    if (courseId && courseId !== "roadmap") {
      this.viewTitleEl.classList.add("view-title--sub");
      this.viewTitleEl.classList.add(`view-title--${courseId}`);
    }
    // Re-trigger animation
    this.viewTitleEl.style.animation = "none";
    this.viewTitleEl.offsetHeight; // force reflow
    this.viewTitleEl.style.animation = "";
  }

  /** Update URL without page reload */
  _updateUrl(params) {
    const url = buildUrl(window.location.pathname, params);
    window.history.replaceState(null, "", url);
  }
}
