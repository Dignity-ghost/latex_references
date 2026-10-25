# LaTeX References

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

普通 Markdown 图片和 Obsidian 图片嵌入完全使用 Markdown 自己的链接，插件不会接管。只有显式 `figure` 或 `figure*` 环境内部的 `\label{fig:key}` 才会获得图片编号。点击这类引用会跳到 `\begin{figure}`，而不是把光标放在标签源码上。

## 文献来源

插件默认索引 vault 内所有 `.bib` 文件，也支持 Markdown 中的 fenced `bibtex` 代码块。可以在设置中用 vault 相对路径限制 `.bib` 文件或文件夹。

文献笔记可以用 frontmatter 建立映射：

```yaml
---
citekey: knuth1984
---
```

文件名 `@knuth1984.md` 和 `knuth1984.md` 也会自动识别。

## 本地安装测试

1. 在本仓库运行 `npm install` 和 `npm run build`。
2. 创建 `<vault>/.obsidian/plugins/latex-references/`。
3. 将 `main.js`、`manifest.json`、`styles.css` 复制进去。
4. 重载 Obsidian，在“设置 → 第三方插件”中启用 **LaTeX References**。

移动端只需让上述插件目录随 vault 同步，然后在移动设备上重载并启用插件。

桌面与移动端的逐项检查表见 [MANUAL_TEST.md](./MANUAL_TEST.md)。完整测试笔记为 [`examples/latex-references-comprehensive-test.md`](./examples/latex-references-comprehensive-test.md)，复制时请同时带上同目录的测试 SVG。

更完整的语法、编号规则、限制和开发说明见 [英文 README](./README.md)。
