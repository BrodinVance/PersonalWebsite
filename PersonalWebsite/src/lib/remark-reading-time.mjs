import getReadingTime from 'reading-time';
import { toString } from 'mdast-util-to-string';

export function remarkReadingTime() {
  return (tree, file) => {
    const minutes = Math.max(1, Math.round(getReadingTime(toString(tree)).minutes));
    file.data.astro.frontmatter.minutesRead = `${minutes} min read`;
  };
}
