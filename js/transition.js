/* ======================================
   Page Transition Logic
   ====================================== */

const PageTransition = {
  init() {
    // Fade in on load
    window.addEventListener("load", () => {
      const overlay = document.getElementById("page-transition");
      if (overlay) {
        overlay.classList.remove("is-loading");
      }
    });

    // Intercept clicks on anchor tags
    document.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (link && link.href) {
        // Exclude external links, new tabs, anchors, and javascript links
        const url = new URL(link.href, window.location.href);
        const isInternal = url.origin === window.location.origin;
        const isSamePage =
          url.pathname === window.location.pathname &&
          url.search === window.location.search;

        if (
          isInternal &&
          link.target !== "_blank" &&
          !link.href.includes("javascript:") &&
          !isSamePage
        ) {
          e.preventDefault();
          this.navigate(link.href);
        }
      }
    });
  },

  navigate(url) {
    const overlay = document.getElementById("page-transition");
    if (overlay) {
      overlay.classList.add("is-loading");
      setTimeout(() => {
        window.location.href = url;
      }, 400); // match CSS transition time
    } else {
      window.location.href = url;
    }
  },
};

// Global navigateTo function for JS triggers
window.navigateTo = (url) => PageTransition.navigate(url);

document.addEventListener("DOMContentLoaded", () => PageTransition.init());
