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
  renderLesson(lesson, courseData);

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

function renderLesson(lesson, courseData) {
  const container = document.getElementById("lessonContent");
  if (!container) return;

  const content = lesson.content || {};

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
      textContent: content.title || lesson.label,
    }),
  );

  header.appendChild(
    createElement("div", {
      className: "lesson-header__course",
      textContent: courseData.title,
    }),
  );

  container.appendChild(header);

  // Body
  if (
    content.body &&
    content.body !== "Nội dung bài giảng sẽ được cập nhật sau."
  ) {
    const body = createElement("div", { className: "lesson-body" });
    body.innerHTML = content.body;
    container.appendChild(body);
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

  // Resources
  if (content.resources && content.resources.length > 0) {
    const resources = createElement("div", { className: "lesson-resources" });
    resources.appendChild(
      createElement("h3", {
        className: "lesson-resources__title",
        textContent: "> Tài liệu tham khảo",
      }),
    );

    content.resources.forEach((res) => {
      const link = createElement("a", {
        className: "resource-link",
        href: res.url,
        target: "_blank",
        rel: "noopener noreferrer",
      });
      link.appendChild(
        createElement("span", {
          className: "resource-link__icon",
          textContent: "📎",
        }),
      );
      link.appendChild(document.createTextNode(res.label));
      resources.appendChild(link);
    });

    container.appendChild(resources);
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
