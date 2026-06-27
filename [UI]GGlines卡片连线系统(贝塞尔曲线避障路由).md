# GGlines — 卡片连线系统技术文档

> **版本**: 1.0.0
> **技术栈**: 纯前端 HTML + CSS + JavaScript (ES6+)
> **依赖**: Font Awesome 6 (CDN) + Google Fonts Inter (CDN)
> **数据持久化**: localStorage

---

## 一、核心功能

| 功能 | 描述 |
|------|------|
| 任务卡片 | 可自由添加、拖拽、编辑标题/描述、更换颜色 |
| 无限画布 | 5000×5000px 可滚动画布，点阵背景格 |
| 锚点连线 | 每卡片 4 方向锚点 (上/下/左/右)，拖拽锚点建立连线 |
| 贝塞尔曲线 | 连线自动使用三次贝塞尔曲线，控制点沿锚点方向延伸 |
| 避障路由 | 连线路径自动检测障碍卡片，计算偏移路径绕行 |
| 线段样式 | 实线 / 虚线 / 点线 / 右箭头 / 左箭头 / 双箭头 / 无箭头 |
| 流动动画 | 单箭头线自动叠加流动光段，方向与箭头一致 |
| 样式浮板 | 点击连线弹出浮板选择样式，选中后自动淡出 |
| 位置记忆 | 所有卡片位置、连线、样式持久化到 localStorage |
| 数据备份 | 支持 JSON 导出下载 / File System Access API 保存 |

---

## 二、数据结构

### 卡片 (Card)

```javascript
{
    id: 1,                      // 唯一 ID
    title: "任务 1",             // 卡片标题
    description: "双击编辑描述…", // 卡片描述
    x: 200,                     // 左上角 X 坐标 (px)
    y: 150,                     // 左上角 Y 坐标 (px)
    color: null,                // 主题色 (null 或 hex 值)
    _height: 120                // 计算高度 (渲染时更新)
}
```

### 连线 (Connection)

```javascript
{
    id: 1,                      // 唯一 ID
    fromCardId: 1,              // 源卡片 ID
    fromAnchor: "bottom",       // 源锚点方向: top|bottom|left|right
    toCardId: 2,                // 目标卡片 ID
    toAnchor: "top",            // 目标锚点方向
    style: "solid"              // 线段样式: solid|dashed|dotted|
}                               //   arrow-right|arrow-left|arrow-both|none
```

### 持久化格式

```json
{
    "cards": [ /* Card[] */ ],
    "connections": [ /* Connection[] */ ],
    "nextCardId": 4,
    "nextConnId": 2
}
```

---

## 三、核心算法

### 3.1 锚点坐标计算

卡片尺寸: 宽 220px，高动态 (最小 120px)

| 锚点 | X 偏移 | Y 偏移 |
|------|--------|--------|
| `top` | `x + 110` | `y` |
| `bottom` | `x + 110` | `y + height` |
| `left` | `x` | `y + height/2` |
| `right` | `x + 220` | `y + height/2` |

```javascript
function getAnchorPos(cardId, anchorDir) {
    const card = cards.find(c => c.id === cardId);
    const h = getCardHeight(card);
    switch (anchorDir) {
        case 'top':    return { x: card.x + 110, y: card.y };
        case 'bottom': return { x: card.x + 110, y: card.y + h };
        case 'left':   return { x: card.x, y: card.y + h / 2 };
        case 'right':  return { x: card.x + 220, y: card.y + h / 2 };
    }
}
```

### 3.2 控制点方向向量

```javascript
function anchorDir(d) {
    switch (d) {
        case 'top':    return { x: 0, y: -1 };
        case 'bottom': return { x: 0, y: 1 };
        case 'left':   return { x: -1, y: 0 };
        case 'right':  return { x: 1, y: 0 };
    }
}
```

### 3.3 单段贝塞尔曲线 (无遮挡)

```
控制点延伸距离 = max(80px, 两点距 × 0.4)

M from.x from.y
C from.x + fd.x * extend  from.y + fd.y * extend,
  to.x   + td.x * extend  to.y   + td.y * extend,
  to.x   to.y
```

`fd` = fromAnchor 方向向量, `td` = toAnchor 方向向量

### 3.4 避障多段曲线 (有遮挡)

**碰撞检测** — 将路径采样 20 个等分点，检测是否进入任意障碍卡片 (排除源/目标卡片) 的扩展包围盒 (±15px margin):

```javascript
function lineIntersectsRect(x1, y1, x2, y2, rect) {
    for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const px = x1 + (x2 - x1) * t;
        const py = y1 + (y2 - y1) * t;
        if (px >= rect.x && px <= rect.x + rect.w &&
            py >= rect.y && py <= rect.y + rect.h) return true;
    }
    return false;
}
```

**偏移路径计算** — 拾取两个路径点 (30% 和 70% 位置) 沿垂直于线段方向偏移:

```javascript
perpX = -dy / len;
perpY =  dx / len;
// 尝试偏移量: ±60, ±100, ±140, ±180, ±250px
// 每尝试一组偏移 → 检测三段直线是否穿过任何障碍物
// 通过则使用该组偏移点作为中间路径点
```

**多段曲线拼接** — 每段使用贝塞尔，段间用 SVG `S` 命令平滑连接:

```
M A
C A+c1, WP1-c2, WP1
S WP2-c3, WP2
C WP2+c4, B-c5, B
```

### 3.5 箭头样式处理

| 样式 | 路径方向 | 标记 | 实现 |
|------|---------|------|------|
| `arrow-right` | A→B (正向) | `marker-end` | 正常路径 + 终点箭头 |
| `arrow-left` | B→A (反向) | `marker-end` | 路径起点终点对调 + 终点箭头 |
| `arrow-both` | A→B (正向) | `marker-start` + `marker-end` | 起点反向箭头 + 终点正向箭头 |
| `none` | — | 无 | 纯线无标记 |

### SVG 箭头标记定义

```html
<marker id="arrowhead" markerWidth="10" markerHeight="7"
        refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
    <polygon points="0 0, 10 3.5, 0 7" fill="当前颜色"/>
</marker>

<!-- 反向箭头 (用于双箭头起点) -->
<marker id="arrowhead-rev" markerWidth="10" markerHeight="7"
        refX="1" refY="3.5" orient="auto" markerUnits="strokeWidth">
    <polygon points="10 0, 0 3.5, 10 7" fill="当前颜色"/>
</marker>
```

### 3.6 流动动画

**CSS 实现** (无 JavaScript 循环):

```css
.conn-flow.fwd {
    stroke-dasharray: 4 28;
    animation: flowFwd 4s linear infinite;
}

@keyframes flowFwd {
    from { stroke-dashoffset: 0; }
    to   { stroke-dashoffset: -360; }
}
```

`stroke-dashoffset` 逐渐减小 → 虚线模式沿路径正向移动 (起点→终点)

---

## 四、交互流程

### 4.1 创建连线

```
mousedown on anchor
  → dragLineState 初始化 (记录源卡片/锚点/位置)
  → 锚点高亮 (active-drag)
  → renderConnections() 绘制虚线预览
mousemove
  → dragLineState.currentPos 更新
  → 预览线实时跟随
  → 鼠标经过目标锚点 → 高亮 (highlight-drop)
mouseup on anchor (目标)
  → addConnection(source, target)
  → 非空、非自身、非重复校验
  → 写入 connections 数组
  → renderConnections() 重绘所有连线
mouseup elsewhere
  → 取消 (dragLineState = null)
```

### 4.2 点击选择样式

```
click on conn-line / conn-hit
  → showLineStylePopup(e, connId)
  → 固定定位浮板于鼠标点击处
style-btn click
  → setLineStyle(style)
  → conn.style = style
  → renderConnections() + saveState()
  → hideLineStylePopup() 自动淡出
delete-btn click
  → confirm + deleteConnection(id)
```

### 4.3 拖拽卡片

```
mousedown on .card (非 input/textarea/anchor)
  → dragCardState 初始化
mousemove
  → moveCard(id, x, y)
  → 更新 card.x/card.y + DOM 位置
  → renderConnections() 所有连线跟随
mouseup
  → dragCardState = null, saveState()
```

---

## 五、UI 组件结构

### 5.1 Top Bar

```
[Logo] NodeCanvas — 任务连线系统     [添加任务] [清空] [导出] [保存文件]
```

### 5.2 Canvas

```
┌─────────────────────────────────────────────┐
│  .canvas-wrap (overflow: auto)              │
│  ┌─────────────────────────────────────────┐│
│  │  .canvas-inner (5000×5000)             ││
│  │  ├─ .connections-svg (SVG overlay)     ││
│  │  ├─ .card × N (absolute positioned)    ││
│  │  │   ├─ .card-header (title + actions) ││
│  │  │   ├─ .card-body (description)       ││
│  │  │   ├─ .anchor.anchor-top             ││
│  │  │   ├─ .anchor.anchor-bottom          ││
│  │  │   ├─ .anchor.anchor-left            ││
│  │  │   └─ .anchor.anchor-right           ││
│  │  └─ .empty-state                       ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

### 5.3 锚点锚定规则

```css
.anchor { position: absolute; width: 14px; height: 14px;
          border-radius: 50%; cursor: crosshair;
          transform: translate(-50%, -50%);
          z-index: 30; }
.anchor-top    { top: 0; left: 50%; }
.anchor-bottom { top: 100%; left: 50%; }
.anchor-left   { top: 50%; left: 0; }
.anchor-right  { top: 50%; left: 100%; }

/* 交互状态 */
.anchor:hover       → scale(1.6) + 亮绿色发光
.anchor.active-drag → scale(1.8) + 黄色发光
.anchor.highlight-drop → scale(2) + 强绿光
```

### 5.4 连线渲染层级

```
z-index 3:  .connections-svg (SVG + 箭头标记)
z-index 5:  .conn-line (可见连线)
z-index 3:  .conn-hit (不可见宽路径点击区域)
z-index 10: .card (卡片本体)
z-index 20: .anchor (锚点置于卡片之上)
```

### 5.5 样式浮板

```
┌────────────────────────────┐
│ 线段样式                     │
│ ─── 实线                     │
│ ─ ─ 虚线                     │
│ ··· 点线                     │
│ ─▶ 右箭头                    │
│ ◀─ 左箭头                    │
│ ◀─▶ 双箭头                   │
│     无箭头                    │
│ ────────────────             │
│ 🗑 删除连线                   │
└────────────────────────────┘
```

---

## 六、连线状态管理

### 6.1 状态变量

```javascript
let cards = [];           // Card[]
let connections = [];     // Connection[]
let nextCardId = 1;       // 自增 ID
let nextConnId = 1;       // 自增 ID
let dragCardState = null; // 卡片拖拽状态
let dragLineState = null; // 连线拖拽状态
let selectedCardId = null;
let activeConnId = null;  // 弹出浮板的连线 (用于高亮)
```

### 6.2 保存 / 加载

```javascript
function saveState() {
    const data = { cards, connections, nextCardId, nextConnId };
    localStorage.setItem('nodecanvas_data', JSON.stringify(data));
}

function loadState() {
    const raw = localStorage.getItem('nodecanvas_data');
    if (raw) {
        const data = JSON.parse(raw);
        cards = data.cards || [];
        connections = data.connections || [];
        nextCardId = data.nextCardId || 1;
        nextConnId = data.nextConnId || 1;
    }
}
```

---

## 七、CSS 设计系统

### 7.1 主题变量

```css
:root {
    --primary: #4bcfa0;
    --primary-light: #76ffc4;
    --accent: #6c5ce7;
    --bg-dark: #0a0e14;
    --bg-surface: rgba(18, 24, 34, 0.85);
    --bg-card: rgba(26, 35, 48, 0.9);
    --text-primary: #eef5ff;
    --text-secondary: #b9d9ff;
    --text-muted: #7c9eb0;
    --border-color: rgba(72, 187, 150, 0.3);
    --anchor-default: rgba(124, 158, 176, 0.4);
    --anchor-hover: #4bcfa0;
    --line-color: rgba(75, 207, 160, 0.6);
    --line-hover: #4bcfa0;
}
```

### 7.2 深色主题要点

- 背景: 渐变 radial-gradient 深色 + 点阵 (30px 间隔, 8% 透明度)
- 表面: 半透明 rgba + `backdrop-filter: blur()`
- 卡片: 半透明背景 + 1px 边框 + 阴影
- 连线: 半透明 + hover 时加粗变亮
- 动画: 流动光段使用 CSS animation, pointer-events: none

---

## 八、开发指引

### 快速启动

1. 创建 `index.html`，引入 Font Awesome 6 CDN + Google Fonts Inter
2. 复制上述 CSS 变量系统和布局结构
3. 复制数据模型和状态管理
4. 实现 `renderCard()` 和卡片交互
5. 实现锚点拖拽和 `addConnection()`
6. 实现 `computeCurvedPath()` 和 SVG 渲染
7. 实现样式浮板 `showLineStylePopup()` / `setLineStyle()`
8. 实现流动动画 CSS
9. 加入 `saveState()` / `loadState()` 持久化

### 参考实现

完整参考见 `index.html` (单文件 ~50KB)，包含全部 HTML/CSS/JS。
