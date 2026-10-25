# LaTeX References

LaTeX References 让 Obsidian 支持可跳转的 `\label`、`\ref`、`\eqref` 和 `\cite`，同时始终保留 Markdown 文件中的原始 LaTeX 语法，插件不会向文件写入 `\tag`、Wikilink 或其他 Obsidian 专用标记。

支持 Windows、macOS、Linux、iOS、iPadOS 和 Android。运行时不使用 Node.js、Electron、外部程序、网络请求、账号或遥测。

## 快速示例

```markdown
# 方法 \label{sec:method}

$$
L(\theta)=\sum_i \ell_i(\theta)
\label{eq:loss}
$$

如式~\eqref{eq:loss}和第~\ref{sec:method}节所示，
相关工作参见~\cite{lamport1994,knuth1984}。
```

在 Live Preview 和阅读视图中，引用会显示为可点击的编号；源码模式仍然显示原始 LaTeX。点击后可以跳到当前文件或其他文件中的准确位置。

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

桌面与移动端的逐项检查表见 [MANUAL_TEST.md](./MANUAL_TEST.md)，示例文件位于 [`examples/`](./examples/)。

更完整的语法、编号规则、限制和开发说明见 [英文 README](./README.md)。
