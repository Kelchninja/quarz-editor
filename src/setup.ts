import katex from "katex";
import "katex/dist/katex.min.css";
import { initHighlighter } from "codemirror-live-markdown";

/** Prepares codemirror-live-markdown: KaTeX as a global, lowlight loaded. */
export async function setupLibraries() {
  // The library reads KaTeX from window instead of importing it.
  // KaTeX's own types declare window.katex as the module, hence the cast.
  window.katex = katex as typeof window.katex;
  await initHighlighter();
}
