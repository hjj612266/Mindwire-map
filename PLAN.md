# Mindwire 开发计划

## 一、阶段总览

```
Phase 1: 基础骨架 & 数据层     (1–2 天)
Phase 2: 画布 & 卡片系统        (2–3 天)
Phase 3: 连线系统               (2–3 天)  ← 已有关键文档
Phase 4: 视觉效果 & 粒子系统    (2–3 天)
Phase 5: 多画布管理 & 后端      (1–2 天)
Phase 6: 打磨 & 动画优化        (1 天)
```

---

## 二、Phase 1 — 基础骨架 & 数据层

### 1.1 HTML 骨架 + CSS 系统

| 文件 | 内容 |
|------|------|
| `index.html` | 页面骨架，CDN 引入 (FA6, Inter), `<script>` 标签加载 JS |
| `css/reset.css` | 全局 reset，`box-sizing: border-box` |
| `css/variables.css` | 双主题 CSS 变量 (dark/light)，参照现有文档 |
| `css/layout.css` | `#app` 纵向三栏布局 (顶栏/内容/状态栏) |
| `css/effects.css` | 毛玻璃、过渡动画、粒子层样式（占位） |

### 1.2 数据持久化层

- `js/store.js` — 封装 `localStorage` + `saveState()` / `loadState()`
- 数据格式: `Map { id, name, cards[], connections[], settings{} }`
- 提供 `autoSave(debounce 500ms)` 接口

### 1.3 确认事项

- [ ] 双主题 CSS 变量覆盖所有颜色引用
- [ ] 深色模式下 `backdrop-filter: blur()` 启用；浅色关闭
- [ ] 滚动条自定义 (直角细条)

---

## 三、Phase 2 — 画布 & 卡片系统

### 2.1 Canvas 无限画布

- `js/canvas.js` — 实现可拖拽/缩放的无限画布
- 点阵背景 (间隔 30px, 半透明点)
- 鼠标滚轮缩放 (translate + scale)
- 画布尺寸通过 viewport 动态计算，不限定 `5000×5000`

### 2.2 卡片系统

- `js/card.js` — 卡片 CRUD + 渲染 + 交互
- 卡片 HTML 结构:

```html
<div class="card" data-id="1">
  <div class="card-header">
    <span class="card-title" contenteditable>标题</span>
    <div class="card-actions">
      <button class="btn-icon" data-action="color">🎨</button>
      <button class="btn-icon" data-action="collapse">−</button>
      <button class="btn-icon" data-action="delete">×</button>
    </div>
  </div>
  <div class="card-body" contenteditable>描述</div>
  <!-- 4 个锚点 -->
  <div class="anchor anchor-top"></div>
  <div class="anchor anchor-bottom"></div>
  <div class="anchor anchor-left"></div>
  <div class="anchor anchor-right"></div>
</div>
```

### 2.3 卡片交互

| 操作 | 实现 |
|------|------|
| 创建 | 双击空白处 / 工具栏按钮 |
| 拖拽 | `mousedown → mousemove → mouseup`，更新 x/y |
| 编辑 | `contenteditable` 双击标题/描述 |
| 换色 | 点击颜色按钮弹出 8 色调色盘 |
| 折叠 | 折叠描述区，仅显示标题 |
| 删除 | 确认后删除卡片及关联连线 |

### 2.4 视觉效果

- 卡片入场动画: `scale(0) → scale(1)` + `opacity 0→1`，`0.25s ease-out`
- 卡片拖拽: 轻微 `box-shadow` 提升 + `scale(1.02)`
- 卡片悬停: 边框发光 `box-shadow: 0 0 12px var(--primary)`

---

## 四、Phase 3 — 连线系统

> 核心参考 `[UI]GGlines卡片连线系统(贝塞尔曲线避障路由).md`

### 3.1 实现文件

- `js/connection.js` — 全部连线逻辑

### 3.2 核心功能

| 功能 | 说明 |
|------|------|
| 锚点拖拽建连 | 从锚点拖出虚线，落到目标锚点完成 |
| 贝塞尔曲线 | 三次贝塞尔，控制点沿锚点方向延伸 |
| 避障路由 | 检测障碍物 → 计算偏移路径点 → 多段曲线拼接 |
| 线段样式 | `solid/dashed/dotted/arrow-right/arrow-left/arrow-both/none` |
| 样式浮板 | 点击连线弹出浮板选择样式/删除 |
| 流动动画 | arrow 类自动叠加 CSS dash-offset 动画 |
| 高亮悬停 | hover 连线加粗变色 (1.5px → 3px) |

### 3.3 SVG 实现

```html
<svg class="connections-svg" style="position:absolute;inset:0;pointer-events:none;z-index:3">
  <defs>
    <marker id="arrowhead" .../>
    <marker id="arrowhead-rev" .../>
  </defs>
</svg>
```

- SVG `overflow: visible` 避免连线被裁剪
- `.conn-line` (可见线) + `.conn-hit` (透明宽点击区域)

### 3.4 连入/连出动画

- 连线创建: 路径从起点生长到终点 (`stroke-dasharray + stroke-dashoffset` 动画)
- 流动光段: `arrow-right/left/both` 时自动叠加光流

---

## 五、Phase 4 — 视觉效果 & 粒子系统

### 5.1 粒子系统 — `js/particles.js`

| 参数 | 默认值 | 说明 |
|------|--------|------|
| 粒子数量 | 60 | 浮动粒子 |
| 粒子大小 | 1.5–3 px | 随机 |
| 粒子颜色 | `var(--primary)` 半透明 | 随主题变化 |
| 运动速度 | 0.1–0.4 px/frame | 布朗运动 |
| 连线距离 | 120px | 粒子间距 < 此值绘制连线 |
| 交互响应 | 鼠标周边 80px | 粒子避开鼠标 (斥力) |

- 渲染在独立 Canvas 层，`pointer-events: none`
- 使用 `requestAnimationFrame` 循环
- 浅色模式下粒子数量减半 + 透明度降低

### 5.2 光效系统 — `js/effects.js`

| 效果 | 实现 |
|------|------|
| 页面背景 | `radial-gradient` + 点阵叠加 |
| 毛玻璃 | `backdrop-filter: blur(16px)` on top-bar/status-bar |
| 连线光晕 | SVG filter: `feGaussianBlur` 叠加半透明宽线 |
| 卡片发光 | `box-shadow: 0 0 20px var(--primary)` on hover |
| 过渡动画 | 所有 UI 变化 `transition: 0.2s ease` |
| 加载动画 | 旋转 logo 或粒子汇聚效果 |
| 空态欢迎 | 居中提示 + 微动 Logo |

### 5.3 性能优化

- 粒子数量动态调整 (根据视口大小)
- 使用 `will-change: transform` 提升渲染
- Canvas 离屏渲染减少重绘
- 闲置时帧率降至 30fps

---

## 六、Phase 5 — 多画布管理 & 后端

### 6.1 多画布管理 — `js/map-manager.js`

| 操作 | 接口 |
|------|------|
| 列出画布 | `getMaps()` → `Map[]` |
| 创建画布 | `createMap(name)` → `Map` |
| 打开画布 | `openMap(id)` → 加载该 map 的 cards/connections |
| 重命名 | `renameMap(id, name)` |
| 删除 | `deleteMap(id)` |
| 复制 | `duplicateMap(id)` |

- 画布列表展示在左侧抽屉 / 切换页面
- 当前画布名显示在顶栏居中位置
- 用 `<select>` 或列表切换画布

### 6.2 后端 (4010) — `server/server.js`

```
GET  /api/maps          → 获取画布列表
POST /api/maps          → 创建画布
GET  /api/maps/:id      → 获取单个画布数据
PUT  /api/maps/:id      → 保存画布数据
DELETE /api/maps/:id    → 删除画布文件
GET  /                  → 静态文件服务 (index.html)
```

- 文件命名 `maps/*.mwm` (JSON)
- 前端降级: 后端不可用时自动 fallback 到 `localStorage`
- Express 静态文件 `express.static('../')` 指向项目根

### 6.3 前后端协作模式

```
前端操作 → app.js → store.js → 后端 API (4010)
                                → maps/*.mwm
                            ↕ fallback
                        localStorage
```

---

## 七、Phase 6 — 打磨 & 动画优化

### 7.1 交互微动效

| 场景 | 动画 |
|------|------|
| 卡片创建 | `scale 0→1` + `opacity 0→1`，`0.3s spring` |
| 卡片删除 | 缩小 + 淡出，`0.2s` |
| 连线的创建 | 路径从起点生长 |
| 画布切换 | 内容区 `opacity 0→1` 交叉淡入 |
| 主题切换 | `transition: 0.4s` 所有颜色平滑过渡 |
| 粒子漂浮 | 持续布朗运动 |

### 7.2 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+N` | 新卡片 |
| `Ctrl+S` | 保存 |
| `Delete` | 删除选中卡片 |
| `Ctrl+Z` | 撤销 (可选) |
| `Escape` | 关闭弹出/取消操作 |

### 7.3 响应式

- 最小窗口 900×600（桌面应用级别）
- 顶部按钮自适应折叠

---

## 八、文件创建顺序

```
Day 1:
  ├── index.html          (骨架 + CDN)
  ├── css/reset.css
  ├── css/variables.css
  ├── css/layout.css
  ├── js/app.js
  └── js/store.js

Day 2:
  ├── css/canvas.css
  ├── css/effects.css
  ├── js/canvas.js
  └── js/card.js

Day 3:
  └── js/connection.js

Day 4:
  ├── js/particles.js
  └── js/effects.js

Day 5:
  ├── js/map-manager.js
  ├── server/package.json
  └── server/server.js
```

---

## 九、视觉效果优先级 (核心特色)

| 优先级 | 效果 | 实现难度 |
|--------|------|---------|
| P0 | 点阵背景 + 深色渐变 | 低 |
| P0 | 毛玻璃顶栏/状态栏 | 低 |
| P0 | 卡片 hover 边框发光 | 低 |
| P0 | 连线流动光段动画 | 中 |
| P1 | 粒子漂浮系统 | 中 |
| P1 | 粒子间连接线 | 中 |
| P1 | 卡片入场弹跳 | 低 |
| P1 | 连线创建生长动画 | 低 |
| P2 | 粒子鼠标斥力 | 中 |
| P2 | 画布切换过渡 | 低 |
| P2 | 主题切换平滑过渡 | 低 |
| P3 | 粒子汇聚Logo动画 | 高 |

---

## 十、里程碑检查点

| # | 检查内容 | 验证方式 |
|---|---------|---------|
| M1 | 页面骨架渲染，双主题切换 | 浏览器打开 `index.html`，切换主题 |
| M2 | 创建/拖拽/编辑卡片 | 创建 3 张卡片，自由拖拽，编辑文字 |
| M3 | 锚点建连，贝塞尔渲染 | 拖拽锚点建立连线，观察曲线 |
| M4 | 避障路由 | 卡片B位于A→C之间，A→C连线自动绕行 |
| M5 | 粒子漂浮 + 粒子间连线 | 页面打开即有粒子浮动静默运行 |
| M6 | 多画布 CRUD | 创建画布B，切换，回到画布A，数据独立 |
| M7 | 后端 4010 完整流程 | `node server.js`，通过浏览器操作，文件保存到 `maps/` |
