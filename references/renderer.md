# 本地手绘图渲染器

`scripts/render.cjs` 接受 JSON 场景，输出 PNG。Rough.js、Xiaolai、Excalifont 已随 skill 打包，无需再次下载字体或安装 fontTools。

## 运行

在仓库根目录运行 `npm ci` 和 `npx playwright install chromium` 后，即可使用本地渲染器。Codex 桌面也可用 `load_workspace_dependencies` 返回的 Node 与 node_modules 路径。

```bash
node scripts/render.cjs assets/example.scene.json --output output/example.png
```

如需使用已有运行环境，显式传入对应路径：

```bash
"/path/to/node" "/path/to/handdrawn-diagrams/scripts/render.cjs" \
  "/absolute/path/scene.json" \
  --output "/absolute/path/diagram.png" \
  --modules-dir "/path/to/node_modules" \
  --browser-executable "/path/to/chromium"
```

- `--modules-dir` 可省略，脚本先尝试常规 `require('playwright')`。
- `--browser-executable` 可省略：先使用 Playwright 已安装浏览器，再尝试常见 macOS / Linux 浏览器。也可设 `HANDDRAWN_BROWSER`。
- `--scale` 默认 `2`，允许 1–4。逻辑画布 1800 × 1120 会导出 3600 × 2240 PNG。
- 已存在的输出不会被覆盖。修改后可另取 `-v2.png`；确需重渲染同一草稿时使用 `--overwrite`。
- 缺少依赖会返回明确错误；先使用环境中已有运行时，不必安装整套 Excalidraw。临时 HTML 自动清理，不作为交付物。

## 场景格式

顶层：`width`、`height`、`background`（默认白色）、`seed`（固定值稳定手绘轮廓，不承诺跨浏览器版本逐字节相同）、`elements`。所有坐标都是逻辑像素，元素按数组顺序绘制。

画布宽高须为不超过 `10000` 的正整数，导出总像素 `width × height × scale²` 不得超过 5000 万。大图超限时可减小画布或倍率。

| type | 必需字段 | 常用可选字段 |
|---|---|---|
| `rect` | `x,y,width,height` | `radius`、`fill`、`stroke`、`strokeWidth`、`roughness` |
| `ellipse` | `x,y,width,height` | 与 rect 同类；x/y 为外接框左上角 |
| `line` / `arrow` | `points: [[x,y],...]` | `stroke`、`strokeWidth`、`dashed`、`headSize`（arrow） |
| `path` | `d`（SVG path） | `fill`、`stroke`、`strokeWidth`、`roughness` |
| `text` | `x,y,text` | `size`、`color`、`align`、`maxWidth`、`lineHeight` |

文本默认字号 28，颜色近黑。`align` 为 `left`、`center` 或 `right`；x 对应所选对齐位置，y 是**第一行中线**。多行使用真正的换行符，`lineHeight` 默认为字号的 1.35 倍。`maxWidth` 超出时会报错，不自动缩字。不要在 text 中放 HTML。

各元素可给 `id` 便于报错定位。推荐逻辑字号：标题 46–56、主节点 32–38、说明 24–28、脚注 22–25；这是起点，不是固定规范。

```json
{
  "width": 900,
  "height": 420,
  "seed": 77123,
  "elements": [
    {"type":"text","x":50,"y":55,"text":"读取流程","size":42},
    {"type":"rect","x":50,"y":140,"width":310,"height":160,"fill":"#fff0b3"},
    {"type":"text","x":205,"y":220,"text":"读取数据","size":32,"align":"center","maxWidth":260},
    {"type":"arrow","points":[[380,220],[500,220]]},
    {"type":"rect","x":520,"y":140,"width":310,"height":160,"fill":"#d3f4d3"},
    {"type":"text","x":675,"y":220,"text":"返回结果","size":32,"align":"center","maxWidth":260}
  ]
}
```

## 检查边界

脚本会验证元素类型、数值、字体字符覆盖、文字渲染后的边界和 maxWidth。它不会判断箭头语义，也不会自动判断文字是否被其他节点遮住。PNG 生成后仍须目视检查。

内置字体覆盖中英文常用内容。遇到未覆盖的符号，先判断是否能用更清楚的普通文字表达；不能损失含义时，补充合适字体或使用环境支持的其他绘制方式，不要静默交付缺字方框。

字体与 Rough.js 的来源、许可保存在 `assets/licenses/`；生成图片时不需要把这些说明绘入图中。
