import { loadMathJax } from "obsidian";
import { ReferenceIndex } from "./reference-index";
import { rewriteMath } from "./math-rewriter";

type MathJaxOptions = { display?: boolean; [key: string]: unknown };
type MathJaxOutput = unknown;
type TexToChtml = (tex: string, options?: MathJaxOptions) => MathJaxOutput;

interface MathJaxRuntime {
  tex2chtml: TexToChtml;
}

export class MathJaxHook {
  private runtime: MathJaxRuntime | null = null;
  private original: TexToChtml | null = null;
  private wrapper: TexToChtml | null = null;

  constructor(private readonly index: ReferenceIndex) {}

  async install(): Promise<boolean> {
    await loadMathJax();
    const runtime = (globalThis as typeof globalThis & { MathJax?: MathJaxRuntime }).MathJax;
    if (!runtime || typeof runtime.tex2chtml !== "function") return false;
    const original = runtime.tex2chtml;
    const index = this.index;
    const wrapper: TexToChtml = function (tex, options) {
      return original.call(runtime, rewriteMath(tex, options?.display === true, index), options);
    };
    this.runtime = runtime;
    this.original = original;
    this.wrapper = wrapper;
    runtime.tex2chtml = wrapper;
    return true;
  }

  uninstall(): void {
    if (this.runtime && this.original && this.runtime.tex2chtml === this.wrapper) {
      this.runtime.tex2chtml = this.original;
    }
    this.runtime = null;
    this.original = null;
    this.wrapper = null;
  }
}
