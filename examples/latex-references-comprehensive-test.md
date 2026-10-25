---
title: LaTeX References 综合测试
aliases:
  - LaTeX 引用测试
ignored-example: "\\label{ignored:frontmatter}"
---

# LaTeX References 综合测试 \label{sec:test-root}

这份笔记用于测试 LaTeX References v0.1.1。请把本文件和同目录下的
`latex-references-test-figure.svg` 一起复制到 Obsidian vault，再分别检查源码模式、
Live Preview 和阅读视图。

预期：源码始终保留原始 LaTeX 命令；离开命令所在位置后，Live Preview 与阅读视图
显示可点击引用；点击引用会跳到对应的 `\label`。

## 1. 标题与段落标签 \label{sec:labels}

回到文首：第~\ref{sec:test-root}节。当前小节是第~\ref{sec:labels}节。

这一段有一个只用于导航、不自动编号的锚点。\label{para:checkpoint}

段落锚点引用：\ref{para:checkpoint}。它应显示标签名并可点击跳回上一段。

## 2. 公式编号与括号 \label{sec:equations}

第一个带标签的行间公式：

$$
E = mc^2
\label{eq:energy}
$$

`\ref` 和 `\eqref` 指向公式时都应带括号：公式~\ref{eq:energy}；
公式~\eqref{eq:energy}。上面公式右侧的自动编号也应显示为 `(1)`。

第二个公式用于测试多行内容：

$$
\begin{aligned}
L(\theta) &= \sum_{i=1}^{n}\ell_i(\theta), \\
\nabla L(\theta) &= \sum_{i=1}^{n}\nabla\ell_i(\theta).
\end{aligned}
\label{eq:loss}
$$

第二个公式应显示 `(2)`，引用应显示~\ref{eq:loss}。

第三个公式测试公式内部的引用：

$$
R = E_{\ref{eq:energy}} + L_{\ref{eq:loss}}
\label{eq:derived}
$$

公式内部的两个引用应分别渲染为 `(1)` 与 `(2)`，第三个公式编号应为 `(3)`。

行内数学仍由 Obsidian 正常渲染，例如 $e^{i\pi}+1=0$；行内公式不会自动编号。

## 3. 图片编号与引用 \label{sec:figures}

![LaTeX References 跨平台引用流程](latex-references-test-figure.svg)
\label{fig:workflow}

上图引用为图~\ref{fig:workflow}。预期显示“图 1”，点击后跳回图片下方的标签。
图片标签必须紧跟在标准 Markdown 图片或 Obsidian `![[图片]]` 嵌入之后；两者之间只允许空白。

## 4. 文献引用 \label{sec:citations}

单篇文献：Knuth 提出了文学编程~\cite{knuth1984}。

多篇文献：LaTeX 与文学编程参见~\cite{lamport1994,knuth1984}。

带定位信息的文献：参见~\cite[见][p. 97]{knuth1984}。

预期：本节第一次出现的 `knuth1984` 编号为 `[1]`，`lamport1994` 编号为 `[2]`；
点击编号会跳到本文末尾 `bibtex` 块中的对应条目。

## 5. Markdown 共存与忽略区 \label{sec:markdown}

- 普通 Markdown [内部链接](#原生-markdown-锚点)仍可使用。
- **粗体**、*斜体*、列表和行内代码都不受影响。
- 行内代码中的命令不会处理：`\ref{ignored:inline-code}`。
- HTML 注释中的命令不会处理：<!-- \label{ignored:comment} -->

下面代码块里的命令应保持原样，也不应产生标签、引用或报错：

```latex
\label{ignored:fence}
\ref{ignored:fence}
\cite{ignored-citation}
```

### 原生 Markdown 锚点

如果上面的“内部链接”能跳到这里，说明插件没有干扰 Markdown 自带的页内跳转。

## 6. 可选的错误状态测试

下面示例暂时放在代码块中，因此不会触发。若要检查红色未解析状态和验证命令，
请每次复制一行到代码块外，然后运行命令面板中的
“LaTeX References: Validate references in current note”。

```text
\ref{missing:label}
\cite{missing-citation}
\label{invalid label with spaces}
$x \label{invalid:inline-math}$
```

## 参考文献数据

```bibtex
@article{knuth1984,
  author  = {Donald E. Knuth},
  title   = {Literate Programming},
  journal = {The Computer Journal},
  year    = {1984},
  volume  = {27},
  number  = {2},
  pages   = {97--111}
}

@book{lamport1994,
  author    = {Leslie Lamport},
  title     = {LaTeX: A Document Preparation System},
  publisher = {Addison-Wesley},
  year      = {1994}
}
```

## 最终检查

- 公式标签依次为 `(1)`、`(2)`、`(3)`。
- 指向公式的 `\ref` 和 `\eqref` 都有括号。
- 图~\ref{fig:workflow} 可点击，且不带公式式样的括号。
- 标题、段落、公式、图片和文献引用均可跳转。
- 切回源码模式后，没有任何 `\tag`、Wikilink 或其他标记被写入本文。
