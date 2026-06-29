const fs = require('fs');
const path = require('path');

function walkSync(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      filelist = walkSync(filepath, filelist);
    } else {
      filelist.push(filepath);
    }
  }
  return filelist;
}

const allFiles = walkSync('data');
const jsonFiles = allFiles.filter(f => f.endsWith('.json') && !f.includes(path.normalize('data/lessons/')));

// Load template
const templateHtml = fs.readFileSync('template.html', 'utf8');

// Build a map of all courses to build breadcrumbs and find relationships
const courseMap = {};

jsonFiles.forEach(file => {
  const rawData = fs.readFileSync(file, 'utf8');
  let data;
  try {
    data = JSON.parse(rawData);
  } catch (e) {
    console.error(`Error parsing ${file}:`, e);
    return;
  }
  
  const isRoot = file === path.normalize('data/roadmap.json');
  
  // Calculate relative target HTML path
  // data/courses/beginner/network.json -> pages/courses/beginner/network.html
  // data/roadmap.json -> index.html (root)
  let targetHtml;
  if (isRoot) {
    targetHtml = 'index.html';
  } else {
    // replace 'data' with 'pages' and '.json' with '.html'
    targetHtml = file.replace(/^data[\/\\]/, 'pages/').replace(/\.json$/, '.html');
  }
  
  courseMap[file] = {
    file,
    data,
    targetHtml,
    title: data.title
  };
});

// Helper to build breadcrumb HTML based on file path
function buildBreadcrumb(file, basePath) {
  if (file === path.normalize('data/roadmap.json')) {
    return `<span class="breadcrumb__item breadcrumb__item--active">&gt; Roadmap</span>`;
  }
  
  // We can trace back using the directory structure
  // e.g. data/courses/beginner/network.json -> network.json (current), beginner.json (parent), roadmap.json (root)
  const parts = file.split(path.sep);
  const breadcrumb = [];
  
  // Root is always Roadmap
  breadcrumb.push({ label: '> Roadmap', href: basePath + 'index.html' });
  
  // Build parent chain
  let currentPath = 'data';
  for (let i = 1; i < parts.length - 1; i++) {
    currentPath = path.join(currentPath, parts[i]);
    const potentialParent = currentPath + '.json';
    if (courseMap[potentialParent]) {
      // Calculate relative link from current file to parent
      // But it's easier to use basePath + parent's targetHtml
      breadcrumb.push({ 
        label: courseMap[potentialParent].title, 
        href: basePath + courseMap[potentialParent].targetHtml 
      });
    }
  }
  
  // Add current
  breadcrumb.push({ label: courseMap[file].title, href: null });
  
  // Generate HTML
  return breadcrumb.map((b, i) => {
    if (i === breadcrumb.length - 1) {
      // Active item
      return `<span class="breadcrumb__item breadcrumb__item--active">${b.label}</span>`;
    } else {
      // Link item
      return `<a href="${b.href}" class="breadcrumb__item" style="text-decoration:none;">${b.label}</a><span class="breadcrumb__sep">›</span>`;
    }
  }).join('');
}

// Ensure directory exists
function ensureDirSync(dirpath) {
  if (!fs.existsSync(dirpath)) {
    fs.mkdirSync(dirpath, { recursive: true });
  }
}

// Generate HTML files
Object.values(courseMap).forEach(course => {
  const { file, data, targetHtml, title } = course;
  
  // Calculate {{BASE_PATH}}
  // If targetHtml is index.html, depth is 0.
  // If targetHtml is pages/courses/beginner.html, depth is 2 (pages, courses).
  const parts = targetHtml.split('/');
  const depth = parts.length - 1;
  const basePath = depth === 0 ? './' : '../'.repeat(depth);
  
  // Pre-process nodes to convert .json references to .html references
  if (data.nodes && Array.isArray(data.nodes)) {
    data.nodes.forEach(n => {
      if (n.courseFile) {
        // Find the target HTML file for this courseFile
        const targetPath = path.normalize(`data/${n.courseFile}`);
        if (courseMap[targetPath]) {
           n.targetHtml = basePath + courseMap[targetPath].targetHtml;
        } else {
           // Fallback if not found
           const fallbackHtml = 'pages/' + n.courseFile.replace(/\.json$/, '.html');
           n.targetHtml = basePath + fallbackHtml;
        }
        delete n.courseFile; // remove old property to clean up
        delete n.courseVar;
      }
    });
  }

  // Generate breadcrumb
  const breadcrumbHtml = buildBreadcrumb(file, basePath);

  // Replace placeholders in template
  let outputHtml = templateHtml;
  outputHtml = outputHtml.replace(/\{\{\s*BASE_PATH\s*\}\}/g, basePath);
  outputHtml = outputHtml.replace(/\{\{\s*TITLE\s*\}\}/g, title);
  outputHtml = outputHtml.replace(/\{\{\s*BREADCRUMB\s*\}\}/g, breadcrumbHtml);
  outputHtml = outputHtml.replace(/\{\{\s*PAGE_DATA\s*\}\}/g, JSON.stringify(data));

  // Ensure directory exists
  const dir = path.dirname(targetHtml);
  ensureDirSync(dir);

  fs.writeFileSync(targetHtml, outputHtml);
  console.log(`Generated ${targetHtml} from ${file}`);
});

console.log('Conversion done. Multi-Page Architecture built successfully.');

// Build lesson navigation map
const lessonNavMap = {};
jsonFiles.forEach((f) => {
  if (f === path.normalize("data/roadmap.json")) return;
  try {
    const data = JSON.parse(fs.readFileSync(f, "utf8"));
    const courseId = path.basename(f, ".json");
    if (!data.nodes) return;
    
    const lessons = data.nodes.filter(n => n.type === 'lesson');
    
    lessons.forEach((l, index) => {
      const nextNode = lessons[index + 1] || null;
      const prevNode = lessons[index - 1] || null;
      
      lessonNavMap[l.id] = {
        courseId: courseId,
        courseTitle: data.title,
        title: l.label,
        file: l.lessonFile || "placeholder.js",
        next: nextNode ? { id: nextNode.id, title: nextNode.label, file: nextNode.lessonFile || "placeholder.js" } : null,
        prev: prevNode ? { id: prevNode.id, title: prevNode.label, file: prevNode.lessonFile || "placeholder.js" } : null
      };
    });
  } catch (err) {
    console.error(`Error building nav map for ${f}:`, err);
  }
});
fs.writeFileSync("data/lesson-nav-map.js", "window.LESSON_NAV_MAP = " + JSON.stringify(lessonNavMap, null, 2) + ";");
console.log("Generated data/lesson-nav-map.js");
