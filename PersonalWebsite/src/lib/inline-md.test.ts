import { describe, expect, it } from 'vitest';
import { renderInline } from './inline-md';

describe('renderInline', () => {
  it('renders emphasis and strong inline without a <p> wrapper', async () => {
    expect(await renderInline('mostly *quantum mechanics*')).toBe(
      'mostly <em>quantum mechanics</em>'
    );
    expect(await renderInline('Heading into **Honours Math** this fall')).toBe(
      'Heading into <strong>Honours Math</strong> this fall'
    );
  });

  it('passes plain text through', async () => {
    expect(await renderInline('just words')).toBe('just words');
  });

  it('keeps multi-paragraph markdown wrapped', async () => {
    const out = await renderInline('one\n\ntwo');
    expect(out).toBe('<p>one</p>\n<p>two</p>');
  });

  it('handles empty input', async () => {
    expect(await renderInline('')).toBe('');
  });
});
