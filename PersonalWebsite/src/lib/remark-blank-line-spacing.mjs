/**
 * Turn extra blank lines in Markdown source into real vertical space.
 *
 * Markdown normally collapses multiple blank lines, so pressing Enter a few
 * times has no effect on the output. This walks the top-level blocks and, for
 * every blank line *beyond* the single one that already separates paragraphs,
 * inserts a spacer element. So one blank line = a normal paragraph gap, and
 * each additional blank line = one more line of space.
 */
export function remarkBlankLineSpacing() {
  return (tree) => {
    const children = tree.children;
    if (!Array.isArray(children)) return;

    const out = [];
    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      out.push(node);

      const next = children[i + 1];
      if (next && node.position && next.position) {
        const blankLines = next.position.start.line - node.position.end.line - 1;
        const extra = Math.max(0, blankLines - 1);
        for (let k = 0; k < extra; k++) {
          out.push({ type: 'html', value: '<div class="md-space" aria-hidden="true"></div>' });
        }
      }
    }

    tree.children = out;
  };
}
