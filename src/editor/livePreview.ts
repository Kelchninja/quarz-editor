import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import type { Range } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";

const hidden = Decoration.replace({});

// Zeilen, in denen ein Cursor oder eine Auswahl liegt.
function activeLines(view: EditorView): Set<number> {
  const { doc, selection } = view.state;
  const lines = new Set<number>();
  for (const range of selection.ranges) {
    const first = doc.lineAt(range.from).number;
    const last = doc.lineAt(range.to).number;
    for (let n = first; n <= last; n++) lines.add(n);
  }
  return lines;
}

function buildDecorations(view: EditorView): DecorationSet {
  const { doc } = view.state;
  const active = activeLines(view);
  const ranges: Range<Decoration>[] = [];

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter(node) {
        const heading = node.node.parent;
        if (node.name !== "HeaderMark" || !heading?.name.startsWith("ATXHeading")) return;
        if (active.has(doc.lineAt(node.from).number)) return;

        // Vorne: "### " samt Leerzeichen danach. Hinten: " ###" samt Leerzeichen davor.
        let start = node.from;
        let end = node.to;
        if (start === heading.from) {
          if (doc.sliceString(end, end + 1) === " ") end++;
        } else if (doc.sliceString(start - 1, start) === " ") {
          start--;
        }
        ranges.push(hidden.range(start, end));
      },
    });
  }

  return Decoration.set(ranges, true);
}

export const hideHeadingMarks = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged ||
        syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);
