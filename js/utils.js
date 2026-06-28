/* ======================================
   Utility Helpers
   ====================================== */

/** Parse URL search params */
function getUrlParams() {
  const params = {};
  const search = window.location.search.substring(1);
  if (!search) return params;
  search.split('&').forEach(pair => {
    const [key, val] = pair.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent(val || '');
  });
  return params;
}

/** Build URL with params */
function buildUrl(base, params) {
  const query = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return query ? `${base}?${query}` : base;
}

/** Load JS data file (JSONP style) to avoid CORS on file:/// */
function loadDataJS(url, globalVarName) {
  return new Promise((resolve, reject) => {
    if (window[globalVarName]) {
      return resolve(window[globalVarName]);
    }
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve(window[globalVarName]);
    script.onerror = () => {
      console.error(`[loadDataJS] Failed to load ${url}`);
      alert(`Lỗi tải dữ liệu từ ${url}. Hãy chắc chắn bạn đã chạy file qua HTTP server hoặc các file JS tồn tại.`);
      reject(new Error(`Failed to load ${url}`));
    };
    document.head.appendChild(script);
  });
}

/** Create DOM element helper */
function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([key, val]) => {
    if (key === 'className') el.className = val;
    else if (key === 'textContent') el.textContent = val;
    else if (key === 'innerHTML') el.innerHTML = val;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), val);
    else if (key.startsWith('data-')) el.setAttribute(key, val);
    else el.setAttribute(key, val);
  });
  children.forEach(child => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child) el.appendChild(child);
  });
  return el;
}

/** Debounce */
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Clamp value between min and max */
function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}
