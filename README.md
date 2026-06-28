# ECSC Learning Platform

Trang web học tập dạng cho CLB An Ninh Mạng ECSC — EPU.

## Cách chạy

Trang web cần HTTP server (do sử dụng `fetch()` để load JSON):

```bash
# Python
python3 -m http.server 8080

# hoặc Node.js
npx serve .

# hoặc Live Server trong VS Code
```

Sau đó mở `http://localhost:8080` trong trình duyệt.

## Cấu trúc thư mục

```
├── index.html          # Trang canvas chính (Roadmap)
├── lesson.html         # Trang bài giảng riêng biệt
├── css/                # Stylesheets
├── js/                 # JavaScript modules
├── data/
│   ├── roadmap.json    # Roadmap chính
│   └── courses/        # Sub-roadmaps (1 file/module)
└── assets/             # Logo, favicons, icons
```

## Cách thêm bài học mới

1. Mở file JSON trong `data/courses/` tương ứng
2. Thêm node mới vào mảng `nodes`:
```json
{
  "id": "unique-id",
  "label": "Tên bài học",
  "type": "lesson",
  "x": 0, "y": 400,
  "status": "available",
  "content": {
    "title": "Tên bài học",
    "body": "<p>Nội dung HTML...</p>",
    "resources": [
      { "label": "Tài liệu", "url": "https://..." }
    ]
  }
}
```
3. Thêm edge kết nối vào mảng `edges`

## Cách thêm module mới

1. Tạo file JSON mới trong `data/courses/`
2. Thêm node vào `data/roadmap.json` với trường `courseFile` trỏ tới file mới
