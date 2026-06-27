# Layout UI System — 页面结构布局参考

> 基于 OrgHUB 项目的通用页面骨架设计，适用于纯前端、零构建的桌面端工具类应用。
> 布局层级：`#app` → `#top-bar` + `#main-container` + `#status-bar`

---

## 1. 页面骨架构图

```
┌──────────────────────────────────────────────────────┐
│  #top-bar                      height: 52px (固定)    │
│  ├── .top-bar-left   (logo + 系统名)                  │
│  ├── .top-bar-center (可选，操作按钮)                  │
│  └── .top-bar-right  (设置/帮助等图标按钮)              │
├──────────────────────────────────────────────────────┤
│  #main-container               flex: 1 (自适应)        │
│  ├── #view-switcher   (48px, 左侧纵向视图切换)          │
│  └── .view-content    (flex:1, 可替换的内容区)          │
├──────────────────────────────────────────────────────┤
│  #status-bar                    height: 28px (固定)    │
│  ├── #statusText     (左侧状态信息)                    │
│  └── #statusDataInfo (右侧数据摘要)                    │
└──────────────────────────────────────────────────────┘
```

### 容器 CSS

```css
#app {
    display: flex;
    flex-direction: column;  /* 纵向排列顶栏 → 内容 → 状态栏 */
    height: 100vh;
    overflow: hidden;
}

#main-container {
    flex: 1;
    display: flex;
    overflow: hidden;        /* 内容溢出时内部滚动 */
    position: relative;
}
```

### HTML 骨架

```html
<div id="app">
    <header id="top-bar">...</header>
    <div id="main-container">
        <!-- 可选：左侧视图导航 -->
        <nav id="view-switcher">...</nav>
        <!-- 主体内容，不同项目替换此区域 -->
        <div id="content-area" class="view-content active">...</div>
    </div>
    <footer id="status-bar">...</footer>
</div>
```

---

## 2. Top Bar (顶栏)

### 设计规格

| 属性 | 值 | 说明 |
|------|-----|------|
| 高度 | `52px` | 固定，不含弹性 |
| 布局 | `flex` + `justify-content: space-between` | 左右分布 |
| 内边距 | `0 16px` | 水平留白 |
| 背景 | `var(--bg-surface)` | 半透明表面层 |
| 毛玻璃 | `backdrop-filter: blur(16px)` | 深色模式；浅色模式关闭 |
| 底部边框 | `1px solid var(--border-color-faint)` | 极弱分隔线 |
| 层级 | `z-index: 100` | 高于内容区 |

### 三段式结构

```html
<header id="top-bar">
    <div class="top-bar-left">
        <!-- logo + 系统名 -->
    </div>
    <div class="top-bar-center">
        <!-- 居中操作按钮（可选） -->
    </div>
    <div class="top-bar-right">
        <!-- 设置、帮助等图标按钮 -->
    </div>
</header>
```

```css
#top-bar {
    height: 52px;
    min-height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    background: var(--bg-surface);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border-color-faint);
    z-index: 100;
    gap: 16px;
}
[data-theme="light"] #top-bar { backdrop-filter: none; }

.top-bar-left   { display: flex; align-items: center; gap: 12px; min-width: 200px; }
.top-bar-center { display: flex; align-items: center; gap: 8px; }
.top-bar-right  { display: flex; align-items: center; gap: 8px; }
```

### Logo 区组合

```html
<div class="logo-area">
    <i class="fas fa-sitemap logo-icon"></i>
    <span class="system-name">OrgHUB</span>
    <span class="version-badge">v1.0.0</span>
</div>
```

```css
.logo-area      { display: flex; align-items: center; gap: 10px; }
.logo-icon      { font-size: 24px; color: var(--primary); }
.system-name    { font-size: 15px; font-weight: 700; color: var(--text-primary); letter-spacing: 0.5px; }
.version-badge  { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); padding: 2px 6px; border: 1px solid var(--border-color-faint); }
```

### 使用要点

1. **Logo 图标** 选一个 Font Awesome 图标代表应用品类
2. **系统名** 可在运行时通过 JS 更新（`#systemName` 设置 `textContent`）
3. **版本徽章** 可选，用小号等宽字体 + 细边框
4. **右侧图标按钮** 使用 `btn btn-ghost btn-icon` 组合，降低视觉权重

---

## 3. Status Bar (状态栏)

### 设计规格

| 属性 | 值 | 说明 |
|------|-----|------|
| 高度 | `28px` | 紧凑，信息密度低 |
| 布局 | `flex` + `justify-content: space-between` | 左右分布 |
| 字体 | `var(--font-size-xs)` = `11px` | 最小号文字 |
| 颜色 | `var(--text-muted)` | 弱化视觉权重 |
| 背景 | `var(--bg-surface)` | 与顶栏一致 |
| 顶部边框 | `1px solid var(--border-color-faint)` | 与内容区分隔 |

### HTML & CSS

```html
<footer id="status-bar">
    <span id="statusText">就绪</span>
    <span id="statusDataInfo"></span>
</footer>
```

```css
#status-bar {
    height: 28px;
    min-height: 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    background: var(--bg-surface);
    border-top: 1px solid var(--border-color-faint);
    font-size: 11px;
    color: var(--text-muted);
}
#statusText { display: flex; align-items: center; gap: 6px; }
```

### 状态反馈类型

| 类型 | CSS 类 | 颜色变量 | 图标 | 自动清除 |
|------|--------|----------|------|---------|
| 保存中 | `.saving` | `var(--info)` | spinner | 否（持续态） |
| 已完成 | `.saved` | `var(--success)` | check | 3s |
| 错误 | `.error` | `var(--danger)` | exclamation | 3s |
| 信息 | (默认) | `var(--text-muted)` | 纯文本 | 3s |

```javascript
function setStatus(message, type) {
    // type: 'saving' | 'success' | 'error' | undefined (info)
    // saving 不会自动清除
    // 其他类型 3s 后恢复默认文字"就绪"
}
```

### 右侧数据摘要

```css
#statusDataInfo {
    font-family: var(--font-mono);
    font-size: 11px;
}
```

右侧一般显示数据统计，如 `联系人: 14 | 工作流: 2`，使用等宽字体。

---

## 4. 中部内容区 (参考)

> 内容区变化最大，这里只列出通用的约束模式，具体实现按项目定制。

### 通用约束

```css
#main-container {
    flex: 1;             /* 填充顶栏和状态栏之间的所有空间 */
    display: flex;
    overflow: hidden;    /* 内容溢出时，由内部元素各自滚动 */
    position: relative;  /* 为绝对定位的子元素（如加载遮罩）提供锚点 */
}
.view-content {
    display: none;       /* 默认隐藏，多视图切换用 */
    flex: 1;
    flex-direction: column;
    overflow: hidden;
}
.view-content.active {
    display: flex;       /* 当前激活的视图 */
}
```

### 可选的视图切换器

当应用有多个视图（如 GBE / FLOW），可在内容区左侧放置纵向导航：

```css
#view-switcher {
    width: 48px;
    min-width: 48px;
    display: flex;
    flex-direction: column;
    background: var(--bg-surface);
    border-right: 1px solid var(--border-color-faint);
    padding: 8px 4px;
    gap: 4px;
}
.view-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 2px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 11px;
    transition: all 0.12s ease;
}
.view-btn:hover {
    color: var(--text-secondary);
    background: var(--hover-bg);
}
.view-btn.active {
    color: var(--primary);
    border-color: var(--border-color-dim);
    background: var(--tag-bg);
}
.view-btn i    { font-size: 18px; }
.view-btn span { font-size: 9px; font-weight: 600; letter-spacing: 0.5px; }
```

### 内容区内部常见子结构

```
#main-container
  ├── #view-switcher (48px, 可选)
  └── .view-content (flex:1)
        ├── .toolbar       (操作栏, ~40px, border-bottom)
        │     ├── 左侧: 主操作按钮
        │     └── 右侧: 辅助按钮 / 视图相关控件
        ├── .content-body  (flex:1, overflow: auto, 可滚动)
        │     └── 核心数据展示
        └── .sidebar       (定宽面板, border-left, 可选侧边栏)
```

---

## 5. 覆盖层 (Overlay) 系统

### 模态框

```css
.modal {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
}
.modal-backdrop {
    position: absolute;
    inset: 0;
    background: var(--bg-overlay);
    z-index: 0;
}
```

### 加载遮罩

```css
.loading-overlay {
    position: fixed;
    inset: 0;
    z-index: 2000;          /* 高于模态框 */
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-overlay-heavy);
}
```

### Welcome / 空状态

```css
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px;
    color: var(--text-dim);
    text-align: center;
}
```

---

## 6. 滚动条风格

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 0; }
::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); }
```

直角、细、半透明主题色、hover 加深。

---

## 7. CSS 变量引用速查

| 变量 | 深色值 | 浅色值 | 用途 |
|------|--------|--------|------|
| `--bg-dark` | `#030507` | `#eef0f3` | 页面画布底色 |
| `--bg-surface` | `rgba(18,24,34,0.85)` | `rgba(255,255,255,0.98)` | 顶栏/状态栏/表面层 |
| `--text-primary` | `#eef5ff` | `#1a2332` | 主标题、重要数据 |
| `--text-muted` | `#7c9eb0` | `#8896a6` | 状态栏文字 |
| `--border-color-faint` | `rgba(80,210,165,0.16)` | `rgba(0,0,0,0.04)` | 极弱分隔线 |
| `--hover-bg` | `rgba(255,255,255,0.04)` | `rgba(0,0,0,0.03)` | 通用悬停背景 |
| `--primary` | `#4bcfa0` | `#3cb38a` | 主色（状态图标、选中态） |

---

## 8. 迁移到新项目的步骤

1. **拷贝 CSS**：`RESET` + `APP LAYOUT` + `TOP BAR` + `STATUS BAR` + `BUTTONS` + `MODALS` + `LOADING OVERLAY` + `SCROLLBAR` + `ANIMATIONS` 区块
2. **拷贝 HTML 骨架**：`#app` → `#top-bar` + `#main-container` + `#status-bar`
3. **替换图标**：`logo-icon` 的 `fa-sitemap` 改为项目对应的 Font Awesome 图标
4. **实现内容区**：在 `.view-content` 内构建项目特有的 UI
5. **集成双主题**：拷贝 `DUAL-THEME-SYSTEM.md` 中的 CSS 变量 + JS 切换逻辑
