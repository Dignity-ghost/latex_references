# LaTeX References 中文说明

LaTeX References 让 Obsidian 支持可跳转的 `\label`、`\ref`、`\eqref` 和 `\cite`，同时始终保留 Markdown 文件中的原始 LaTeX 语法，插件不会向文件写入 `\tag`、Wikilink 或其他 Obsidian 专用标记。

支持 Windows、macOS、Linux、iOS、iPadOS 和 Android。运行时不使用 Node.js、Electron、外部程序、网络请求、账号或遥测。

## 快速示例

```markdown
# 方法 \label{sec:method}

$$
\begin{equation}
L(\theta)=\sum_i \ell_i(\theta)
\label{eq:loss}
\end{equation}
$$

如式~\eqref{eq:loss}和第~\ref{sec:method}节所示，
相关工作参见~\cite{lamport1994,knuth1984}。
```

在 Live Preview 和阅读视图中，引用会显示为可点击的编号；源码模式仍然显示原始 LaTeX。点击后可以跳到当前文件或其他文件中的准确位置。

指向公式标签时，`\ref` 和 `\eqref` 都显示带括号的编号，例如 `(1)`。公式标签必须位于显式的 `equation`、`align`、`alignat`、`flalign`、`gather` 或 `multline` 环境中；外层仍用 Obsidian 的 `$$...$$`。直接放在普通 `$$...$$` 中的标签不会编号，并会由验证命令报告。

普通 Markdown 图片和 Obsidian 图片嵌入完全使用 Markdown 自己的链接，插件不会检查或接管。需要保留正规 LaTeX 源码时，可以写：

```latex
\begin{figure}[htbp]
\centering
\includegraphics[width=0.8\linewidth]{figures/system}
\caption{System diagram}
\label{fig:system}
\end{figure}
```

Live Preview 和阅读视图会把能在 vault 中解析到的 `\includegraphics` 临时转换成 Obsidian 图片嵌入，再交给 Obsidian 自己的 Markdown 渲染器；文件内容不会被改写。光标进入该环境时会重新显示原始 LaTeX 便于编辑。点击 `\ref{fig:system}` 只会滚动到渲染后的图片，不会把光标移入环境而暴露标签源码。

当前兼容 `figure`/`figure*`、`\includegraphics`/`\includegraphics*`、跨行可选参数、`\caption`、嵌套花括号、`\label`、TeX 注释、无扩展名 vault 路径和多张图片。定位、浮动、宽度、裁剪、子图、`\graphicspath` 等复杂 LaTeX 排版特性不会被模拟，预览始终采用 Obsidian 默认 Markdown 图片行为。请让完整环境单独占行。

## 文献来源

插件只从真实的 `.bib` 文件读取文献条目，默认索引 vault 内所有 `.bib` 文件。Markdown 中的 fenced `bibtex`/`bib` 代码块始终只是普通代码，不会进入文献索引。可以在设置中用 vault 相对路径限制 `.bib` 文件或文件夹。

文献笔记可以用 frontmatter 建立映射：

```yaml
---
citekey: knuth1984
---
```

文件名 `@knuth1984.md` 和 `knuth1984.md` 也会自动识别。

没有受支持 LaTeX 命令的笔记会直接旁路：插件不创建编辑器装饰；不含 `\label`、`\ref` 或 `\eqref` 的数学输入会原样交还 MathJax。因而普通 Markdown、原生链接、图片、代码块和公式继续使用 Obsidian 原本的行为。

## 本地安装测试

1. 使用 Node.js 22，在本仓库运行 `npm ci` 和 `npm run build`。
2. 创建 `<vault>/.obsidian/plugins/latex-references/`。
3. 将 `main.js`、`manifest.json`、`styles.css` 复制进去。
4. 重载 Obsidian，在“设置 → 第三方插件”中启用 **LaTeX References**。

移动端只需让上述插件目录随 vault 同步，然后在移动设备上重载并启用插件。

桌面与移动端的逐项检查表见 [MANUAL_TEST.md](./MANUAL_TEST.md)。完整测试笔记为 [`examples/latex-references-comprehensive-test.md`](./examples/latex-references-comprehensive-test.md)，复制时请同时带上同目录的 `references.bib` 和测试 SVG。

更完整的语法、编号规则、限制和开发说明见 [英文 README](./README.md)。

## 作者、许可与开发致谢

本插件由 **dignifiedghost** 维护，采用 [MIT 许可证](./LICENSE) 开源。架构设计参考了采用 MIT 许可证的 Equation Ordinal 和 Cite，但当前实现没有复制这些项目的源代码；详情见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。

初始实现及 1.0.0 版本整理过程中使用了 Codex 中的 OpenAI GPT-5.6 Sol 模型协助开发。维护者已审查并对源代码、测试、文档、许可和发布负责；该 AI 工具不是插件的运行时依赖。
