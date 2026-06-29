/* ======================================
   Lesson Page Logic
   Loads lesson content directly from lesson JSON
   Runs on lesson.html
   ====================================== */

document.addEventListener("DOMContentLoaded", async () => {
  const params = getUrlParams();
  const nodeId = params.id;
  const navInfo = window.LESSON_NAV_MAP ? window.LESSON_NAV_MAP[nodeId] : null;

  const file = navInfo ? navInfo.file : (params.file || "placeholder.js");
  const courseId = navInfo ? navInfo.courseId : "";
  const courseTitle = navInfo ? navInfo.courseTitle : "";
  const lessonTitle = navInfo ? navInfo.title : "";

  // Render lesson content
  await renderLesson(file, courseId, courseTitle, lessonTitle, navInfo);

  // Init particles
  const bgCanvas = document.getElementById("bg-canvas");
  if (bgCanvas) {
    const particles = new ParticleSystem(bgCanvas);
    particles.init();
  }
});

function renderBreadcrumb(courseId, courseTitle, lessonTitle, defaultTitle) {
  const breadcrumb = document.getElementById("breadcrumb");
  if (!breadcrumb) return;

  breadcrumb.innerHTML = "";

  // Roadmap link
  const roadmapLink = createElement("a", {
    className: "breadcrumb__item",
    href: "index.html",
    textContent: "> Roadmap",
  });
  breadcrumb.appendChild(roadmapLink);

  if (courseId && courseTitle && courseId !== "roadmap") {
    // Separator
    breadcrumb.appendChild(
      createElement("span", { className: "breadcrumb__sep", textContent: "›" }),
    );

    // Course link
    const courseLink = createElement("a", {
      className: "breadcrumb__item",
      href: `pages/courses/${courseId}.html`,
      textContent: courseTitle,
    });
    breadcrumb.appendChild(courseLink);
  }

  // Separator
  breadcrumb.appendChild(
    createElement("span", { className: "breadcrumb__sep", textContent: "›" }),
  );

  // Current lesson
  breadcrumb.appendChild(
    createElement("span", {
      className: "breadcrumb__item breadcrumb__item--active",
      textContent: lessonTitle || defaultTitle,
    }),
  );
}

async function renderLesson(file, courseId, courseTitle, lessonTitle, navInfo) {
  const container = document.getElementById("lessonContent");
  if (!container) return;

  container.innerHTML = ""; // Clear existing

  // Load external lesson data via JSONP style (to bypass CORS on file:///)
  let lessonData = null;
  try {
    // We expect the script to assign window.LESSON_DATA
    lessonData = await loadDataJS(`data/lessons/${file}`, "LESSON_DATA");
  } catch (error) {
    console.error("Error loading lesson file:", error);
    showError("Missing lesson information. Please return to the Roadmap.");
    return;
  }
  
  // Render breadcrumb with actual lesson title
  renderBreadcrumb(courseId, courseTitle, lessonTitle, lessonData.title || "Lesson");

  // Header
  const header = createElement("div", { className: "lesson-header" });
  header.appendChild(
    createElement("h1", {
      className: "lesson-header__title",
      textContent: lessonData.title || "Lesson",
    }),
  );
  if (lessonData.description) {
    header.appendChild(
      createElement("div", {
        className: "lesson-header__desc",
        textContent: lessonData.description,
      }),
    );
  }
  container.appendChild(header);

  // Body
  if (lessonData && lessonData.tasks && lessonData.tasks.length > 0) {
    const tasksContainer = createElement("div", { className: "lesson-tasks" });
    
    lessonData.tasks.forEach((task, index) => {
      const taskEl = createElement("div", { className: `task-block task-block--${task.status}` });
      
      // Task Header
      const taskHeader = createElement("div", { className: "task-header" });
      taskHeader.onclick = () => {
        taskEl.classList.toggle("task-block--expanded");
      };

      const taskTitleWrap = createElement("div", { className: "task-title-wrap" });
      const statusIconMap = {
        "completed": "fa-solid fa-circle-check",
        "active": "fa-regular fa-circle",
        "locked": "fa-solid fa-lock"
      };
      
      taskTitleWrap.appendChild(createElement("i", { className: `task-status-icon ${statusIconMap[task.status]}` }));
      taskTitleWrap.appendChild(createElement("span", { className: "task-title", textContent: task.title }));
      taskHeader.appendChild(taskTitleWrap);
      
      const toggleIcon = createElement("i", { className: "fa-solid fa-chevron-down task-toggle-icon" });
      taskHeader.appendChild(toggleIcon);
      
      taskEl.appendChild(taskHeader);

      // Task Body
      const taskBody = createElement("div", { className: "task-body" });
      
      if (task.content) {
        const contentEl = createElement("div", { className: "task-content" });
        contentEl.innerHTML = task.content;
        taskBody.appendChild(contentEl);
      }

      if (task.questions && task.questions.length > 0) {
        const qSection = createElement("div", { className: "task-questions" });
        qSection.appendChild(createElement("h4", { className: "task-questions-title", textContent: "Luyện tập & Trả lời" }));
        
        task.questions.forEach(q => {
          const qBlock = createElement("div", { className: "question-block" });
          qBlock.appendChild(createElement("p", { className: "question-text", textContent: q.text }));
          
          const inputGroup = createElement("div", { className: "question-input-group" });
          const input = createElement("input", { className: "question-input", type: "text", placeholder: "----" });
          const btnSubmit = createElement("button", { className: "btn-check", textContent: "Kiểm tra" });
          const btnHint = createElement("button", { className: "btn-hint", title: q.hint });
          btnHint.innerHTML = '<i class="fa-regular fa-lightbulb"></i>';
          
          btnSubmit.onclick = () => {
            if (input.value.trim().toLowerCase() === (q.answer || "").toLowerCase()) {
              input.classList.remove("is-invalid");
              input.classList.add("is-valid");
              btnSubmit.textContent = "Chính xác!";
              btnSubmit.style.backgroundColor = "var(--status-available)";
              btnSubmit.style.color = "var(--bg-navy-dark)";
            } else {
              input.classList.remove("is-valid");
              input.classList.add("is-invalid");
              btnSubmit.textContent = "Sai rồi";
              btnSubmit.style.backgroundColor = "var(--status-locked)";
              btnSubmit.style.color = "white";
              
              setTimeout(() => {
                btnSubmit.textContent = "Kiểm tra";
                btnSubmit.style.backgroundColor = "";
                btnSubmit.style.color = "";
              }, 2000);
            }
          };

          btnHint.onclick = () => {
            alert("Hint: " + q.hint);
          };
          
          inputGroup.appendChild(input);
          inputGroup.appendChild(btnSubmit);
          inputGroup.appendChild(btnHint);
          qBlock.appendChild(inputGroup);
          
          qSection.appendChild(qBlock);
        });
        taskBody.appendChild(qSection);
      }

      taskEl.appendChild(taskBody);
      tasksContainer.appendChild(taskEl);

      // Open active tasks by default
      if (task.status === "active") {
        taskEl.classList.add("task-block--expanded");
      }
    });
    
    container.appendChild(tasksContainer);
  } else {
    // Placeholder
    const placeholder = createElement("div", {
      className: "lesson-placeholder",
    });
    
    const iconSpan = createElement("span", {
      className: "lesson-placeholder__icon",
    });
    iconSpan.innerHTML = '<i class="fa-solid fa-file-signature"></i>';
    placeholder.appendChild(iconSpan);
    
    placeholder.appendChild(
      createElement("div", {
        className: "lesson-placeholder__text",
        textContent: "Content is being prepared...",
      }),
    );
    placeholder.appendChild(
      createElement("div", {
        className: "lesson-placeholder__subtext",
        textContent: "Bài học này sẽ sớm được cập nhật. Vui lòng quay lại sau!",
      }),
    );
    container.appendChild(placeholder);
  }

  // Footer / Navigation Buttons
  const footerNav = createElement("div", { className: "post-navigation" });

  // Left side: Prev Lesson (Older)
  if (navInfo && navInfo.prev) {
    const prevWrap = createElement("a", {
      className: "nav-link nav-link--prev",
      href: buildUrl("lesson.html", { id: navInfo.prev.id })
    });
    prevWrap.innerHTML = `
      <span class="nav-label">BÀI TRƯỚC</span>
      <span class="nav-title">${navInfo.prev.title}</span>
    `;
    footerNav.appendChild(prevWrap);
  } else {
    // If no prev, just show close lesson
    const prevWrap = createElement("a", {
      className: "nav-link nav-link--prev",
      href: courseId ? `pages/courses/${courseId}.html` : "index.html"
    });
    prevWrap.innerHTML = `
      <span class="nav-label">QUAY LẠI</span>
      <span class="nav-title">Đóng bài học</span>
    `;
    footerNav.appendChild(prevWrap);
  }

  // Right side: Next Lesson (Newer)
  if (navInfo && navInfo.next) {
    const nextWrap = createElement("a", {
      className: "nav-link nav-link--next",
      href: buildUrl("lesson.html", { id: navInfo.next.id })
    });
    nextWrap.innerHTML = `
      <span class="nav-label">BÀI TIẾP THEO</span>
      <span class="nav-title">${navInfo.next.title}</span>
    `;
    footerNav.appendChild(nextWrap);
  } else {
    // Empty spacer if no next
    const spacer = createElement("div", { className: "nav-link nav-link--empty" });
    footerNav.appendChild(spacer);
  }

  container.appendChild(footerNav);
}

function showError(message) {
  const container = document.getElementById("lessonContent");
  if (!container) return;

  const placeholder = createElement("div", { className: "lesson-placeholder" });
  
  const iconSpan = createElement("span", {
    className: "lesson-placeholder__icon",
  });
  iconSpan.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
  placeholder.appendChild(iconSpan);
  
  placeholder.appendChild(
    createElement("div", {
      className: "lesson-placeholder__text",
      textContent: message,
    }),
  );
  placeholder.appendChild(
    createElement("a", {
      className: "lesson-back",
      href: "index.html",
      innerHTML: '<i class="fa-solid fa-arrow-left"></i> Quay lại lộ trình',
      style: "margin-top: 24px;",
    }),
  );
  container.appendChild(placeholder);
}
