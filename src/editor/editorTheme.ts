import { EditorView } from "codemirror";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

// Farben kommen aus den CSS-Variablen in App.css.
export const editorTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      color: "var(--text)",
      backgroundColor: "var(--bg)",
    },
    "&.cm-focused": {
      outline: "none",
    },
    ".cm-scroller": {
      fontFamily: "var(--font-text)",
      lineHeight: "1.6",
    },
    ".cm-content": {
      maxWidth: "var(--line-width)",
      margin: "0 auto",
      padding: "48px 24px",
      caretColor: "var(--accent)",
    },

    // Ruhiger: keine Zeilennummern, keine hervorgehobene Zeile.
    ".cm-gutters": {
      display: "none",
    },
    ".cm-activeLine": {
      backgroundColor: "transparent",
    },

    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--accent)",
      borderLeftWidth: "2px",
    },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "var(--accent-soft)",
      },
    ".cm-selectionMatch": {
      backgroundColor: "transparent",
      outline: "1px solid var(--border)",
    },

    // Suchleiste (Mod+F) und Popups (Autocomplete).
    ".cm-panels": {
      backgroundColor: "var(--bg-sidebar)",
      color: "var(--text)",
    },
    ".cm-panels.cm-panels-bottom": {
      borderTop: "1px solid var(--border)",
    },
    ".cm-tooltip": {
      backgroundColor: "var(--bg-sidebar)",
      border: "1px solid var(--border)",
      borderRadius: "6px",
    },
    ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
      backgroundColor: "var(--accent-soft)",
      color: "var(--text)",
    },
  },
  { dark: true },
);

// Ersetzt den Standardstil aus basicSetup komplett.
const markdownStyle = HighlightStyle.define([
  { tag: tags.heading1, fontSize: "1.8em", fontWeight: "700", lineHeight: "1.3" },
  { tag: tags.heading2, fontSize: "1.6em", fontWeight: "700", lineHeight: "1.3" },
  { tag: tags.heading3, fontSize: "1.4em", fontWeight: "700", lineHeight: "1.3" },
  { tag: tags.heading4, fontSize: "1.25em", fontWeight: "700" },
  { tag: tags.heading5, fontSize: "1.1em", fontWeight: "700" },
  { tag: tags.heading6, fontSize: "1em", fontWeight: "700" },

  // Steuerzeichen wie #, **, `, > und Listenpunkte.
  { tag: tags.processingInstruction, color: "var(--text-muted)" },

  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: [tags.link, tags.url], color: "var(--accent)" },
  { tag: tags.monospace, fontFamily: "var(--font-mono)", fontSize: "0.9em" },
  { tag: tags.quote, color: "var(--text-muted)" },
  { tag: tags.contentSeparator, color: "var(--text-muted)" },
]);

export const markdownHighlighting = syntaxHighlighting(markdownStyle);
