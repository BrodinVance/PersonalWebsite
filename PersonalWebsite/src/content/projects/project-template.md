---
title: "Anatomy of a Project"
description: "A reference entry showing every field a project supports and how each one renders. Copy it, replace it, ship it."
status: "building"
stack: ["Astro", "TypeScript", "CSS"]
year: 2026
featured: true
order: 100
links:
  github: "https://github.com/BrodinVance"
  # demo: "https://example.com"   # optional — omit the line entirely if there's no demo
---

This entry is a template. It documents every project field and shows how each renders, so the next project is just a matter of swapping the contents.

## The frontmatter fields

- **`title`** — the project name, shown in the list and as the page heading.
- **`description`** — one sentence. It's the summary in the list and the dek on the detail page.
- **`status`** — one of `building`, `planned`, `ongoing`, or `shipped`. It renders as a tag; `building` glows honey, `ongoing` reads sage, the rest stay quiet.
- **`stack`** — the tech, as a list. It renders as a `·`-separated line in mono.
- **`year`** — used for sorting and reference.
- **`featured`** — `true` surfaces the project on the home page. Keep this to a small handful.
- **`order`** — manual sort weight; higher numbers float to the top among featured projects.
- **`links`** — optional `github` and `demo` URLs. Each renders as an underlined link only if present, so an empty `links` block shows nothing.

## The body is plain Markdown

Everything under the frontmatter is the project write-up. The same prose tools as a blog post apply — **bold**, *italic*, [links](https://brodinvance.com), and `inline code`.

### Use sub-headings to structure longer write-ups

A "How it works" section, a "Current status" section, a "What's next" — whatever the project needs. Lists work too:

- What problem it solves.
- The one idea it's built around.
- Where it stands right now.

Code blocks render the same way they do in posts:

```ts
export function statusLabel(status: Status): string {
  return STATUS_LABELS[status] ?? "Unknown";
}
```

## Writing a new project

Copy this file, rename it to something URL-friendly like `my-project.md`, replace the frontmatter and body, and push. Set `featured: true` if it should appear on the home page; leave it off otherwise. That's the whole workflow.
