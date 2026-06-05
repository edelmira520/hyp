# Dotforge

Dotforge 是一个无需后端的本地 Halftone 图片风格化工具。图片处理完全在浏览器内完成，不上传图片。

当前主应用入口是 `index.html`。它是这个项目目前的 source of truth，包含页面结构、样式和浏览器端 Canvas 图像处理逻辑。

项目仍保持单文件本地浏览器工具架构：不需要 React、Vue、构建工具或后端服务。

## 文件结构

```text
.
├── index.html
├── styles.css
├── app.js
├── .gitignore
└── README.md
```

## 当前文件说明

- `index.html`：当前主应用入口，也是主要源码文件。
- `app.js`：当前为 legacy/unused 或预留文件，暂时保留。
- `styles.css`：当前为 legacy/unused 或预留文件，暂时保留。

除非明确确认，不要删除 `app.js` 或 `styles.css`。

## 运行方式

最简单的方式：直接双击打开 `index.html`。

也可以在当前文件夹启动一个本地静态服务器：

```bash
python3 -m http.server 8000
```

然后在浏览器中打开：

```text
http://localhost:8000
```

## Regression checklist

在修改参数、Reset、导出或新增 effect 前后，建议手动检查：

- 上传一张静态图片，并确认画布可以正常预览。
- 修改 Shape，以及 Basic / Texture / Advanced CMYK 参数。
- 在 CMYK / Single Ink 之间切换，并确认控件和预览正常更新。
- 点击 Reset，并确认控件和预览回到当前 effect 的默认参数。
- 切换透明背景，并确认预览和导出行为正常。
- 分别以 1x / 2x / 3x 导出 PNG。
- 测试 GIF 或 MP4 动态预览。
- 检查浏览器控制台是否有明显错误。
