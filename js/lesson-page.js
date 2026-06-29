/* ======================================
   Lesson Page Logic
   Loads lesson content from course JSON
   Runs on lesson.html
   ====================================== */

document.addEventListener("DOMContentLoaded", async () => {
  const params = getUrlParams();
  const courseId = params.course;
  const lessonId = params.lesson;

  if (!courseId || !lessonId) {
    showError("Thiếu thông tin bài học. Vui lòng quay lại Roadmap.");
    return;
  }

  // Load main roadmap to find course file path
  let roadmap;
  try {
    roadmap = await loadDataJS("data/roadmap.js", "ROADMAP_DATA");
  } catch (e) {
    return;
  }

  const courseNode = roadmap.nodes.find((n) => n.id === courseId);
  if (!courseNode) {
    showError(`Không tìm thấy khóa học: ${courseId}`);
    return;
  }

  // Load course data
  let courseData;
  try {
    courseData = await loadDataJS(
      `data/${courseNode.courseFile}`,
      courseNode.courseVar,
    );
  } catch (e) {
    return;
  }

  // Find lesson
  const lesson = courseData.nodes.find((n) => n.id === lessonId);
  if (!lesson) {
    showError(`Không tìm thấy bài học: ${lessonId}`);
    return;
  }

  // Render breadcrumb
  renderBreadcrumb(
    courseId,
    courseData.title,
    lesson.content?.title || lesson.label,
  );

  // Render lesson content
  await renderLesson(lesson, courseData);

  // Init particles
  const bgCanvas = document.getElementById("bg-canvas");
  if (bgCanvas) {
    const particles = new ParticleSystem(bgCanvas);
    particles.init();
  }
});

function renderBreadcrumb(courseId, courseTitle, lessonTitle) {
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

  // Separator
  breadcrumb.appendChild(
    createElement("span", { className: "breadcrumb__sep", textContent: "›" }),
  );

  // Course link
  const courseLink = createElement("a", {
    className: "breadcrumb__item",
    href: buildUrl("index.html", { course: courseId }),
    textContent: courseTitle,
  });
  breadcrumb.appendChild(courseLink);

  // Separator
  breadcrumb.appendChild(
    createElement("span", { className: "breadcrumb__sep", textContent: "›" }),
  );

  // Current lesson
  breadcrumb.appendChild(
    createElement("span", {
      className: "breadcrumb__item breadcrumb__item--active",
      textContent: lessonTitle,
    }),
  );
}

async function renderLesson(lesson, courseData) {
  const container = document.getElementById("lessonContent");
  if (!container) return;

  container.innerHTML = ""; // Clear existing

  // Header
  const header = createElement("div", { className: "lesson-header" });

  // Extract emoji from label
  const emojiMatch = lesson.label.match(
    /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u,
  );
  if (emojiMatch) {
    header.appendChild(
      createElement("span", {
        className: "lesson-header__icon",
        textContent: emojiMatch[0].trim(),
      }),
    );
  }

  header.appendChild(
    createElement("h1", {
      className: "lesson-header__title",
      textContent: lesson.label,
    }),
  );

  header.appendChild(
    createElement("div", {
      className: "lesson-header__course",
      textContent: courseData.title,
    }),
  );

  container.appendChild(header);

  // Load external lesson data if specified
  let lessonData = null;
  if (lesson.lessonFile) {
    try {
      const response = await fetch(`data/lessons/${lesson.lessonFile}`);
      if (!response.ok) throw new Error("Network response was not ok");
      lessonData = await response.json();
    } catch (error) {
      console.error("Error loading lesson file:", error);
      showError(
        "Không thể tải nội dung bài học. Vui lòng chạy trên HTTP Server hoặc kiểm tra kết nối.",
      );
      return;
    }
  }

  // Body
  if (lessonData && lessonData.tasks && lessonData.tasks.length > 0) {
    const tasksContainer = createElement("div", { className: "lesson-tasks" });

    lessonData.tasks.forEach((task, index) => {
      const taskEl = createElement("div", {
        className: `task-block task-block--${task.status}`,
      });

      // Task Header
      const taskHeader = createElement("div", { className: "task-header" });
      taskHeader.onclick = () => {
        taskEl.classList.toggle("task-block--expanded");
      };

      const taskTitleWrap = createElement("div", {
        className: "task-title-wrap",
      });
      const statusIconMap = {
        completed: "fa-solid fa-circle-check",
        active: "fa-regular fa-circle",
        locked: "fa-solid fa-lock",
      };

      taskTitleWrap.appendChild(
        createElement("i", {
          className: `task-status-icon ${statusIconMap[task.status]}`,
        }),
      );
      taskTitleWrap.appendChild(
        createElement("span", {
          className: "task-title",
          textContent: `Task ${index + 1} `,
        }),
      );
      taskTitleWrap.appendChild(
        createElement("span", {
          className: "task-subtitle",
          textContent: task.title,
        }),
      );
      taskHeader.appendChild(taskTitleWrap);

      const toggleIcon = createElement("i", {
        className: "fa-solid fa-chevron-down task-toggle-icon",
      });
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
        const qSection = createElement("div", {
          className: "task-questions-section",
        });
        qSection.appendChild(
          createElement("h4", {
            className: "task-questions-title",
            textContent: "Answer the questions below",
          }),
        );

        task.questions.forEach((q) => {
          const qBlock = createElement("div", { className: "question-block" });
          qBlock.appendChild(
            createElement("p", {
              className: "question-text",
              textContent: q.text,
            }),
          );

          const inputGroup = createElement("div", {
            className: "question-input-group",
          });
          const input = createElement("input", {
            className: "question-input",
            type: "text",
            placeholder: "----",
          });
          const btnSubmit = createElement("button", {
            className: "btn-check",
            textContent: "Check",
          });
          const btnHint = createElement("button", {
            className: "btn-hint",
            title: q.hint,
          });
          btnHint.innerHTML = '<i class="fa-regular fa-lightbulb"></i>';

          btnSubmit.onclick = () => {
            if (
              input.value.trim().toLowerCase() ===
              (q.answer || "").toLowerCase()
            ) {
              input.classList.remove("is-invalid");
              input.classList.add("is-valid");
              btnSubmit.textContent = "Correct!";
              btnSubmit.style.backgroundColor = "var(--status-available)";
              btnSubmit.style.color = "var(--bg-navy-dark)";
            } else {
              input.classList.remove("is-valid");
              input.classList.add("is-invalid");
              btnSubmit.textContent = "Incorrect";
              btnSubmit.style.backgroundColor = "var(--status-locked)";
              btnSubmit.style.color = "white";

              setTimeout(() => {
                btnSubmit.textContent = "Check";
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
    placeholder.appendChild(
      createElement("span", {
        className: "lesson-placeholder__icon",
        textContent: "📝",
      }),
    );
    placeholder.appendChild(
      createElement("div", {
        className: "lesson-placeholder__text",
        textContent: "Nội dung đang được chuẩn bị...",
      }),
    );
    placeholder.appendChild(
      createElement("div", {
        className: "lesson-placeholder__subtext",
        textContent: "Bài giảng này sẽ được cập nhật sớm. Hãy quay lại sau!",
      }),
    );
    container.appendChild(placeholder);
  }

  // Back button
  const backUrl = buildUrl("index.html", { course: courseData.id });
  container.appendChild(
    createElement("a", {
      className: "lesson-back",
      href: backUrl,
      innerHTML: "← Quay lại " + courseData.title,
    }),
  );
}

function showError(message) {
  const container = document.getElementById("lessonContent");
  if (!container) return;

  const placeholder = createElement("div", { className: "lesson-placeholder" });
  placeholder.appendChild(
    createElement("span", {
      className: "lesson-placeholder__icon",
      textContent: "⚠️",
    }),
  );
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
      innerHTML: "← Quay lại Roadmap",
      style: "margin-top: 24px;",
    }),
  );
  container.appendChild(placeholder);
}
