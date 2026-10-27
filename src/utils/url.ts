// The site lives under /portfolio on GitHub Pages, so internal links need that
// prefix. url('work/ai-fluency') returns '/portfolio/work/ai-fluency'.
export function url(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const clean = path.replace(/^\//, '');
  return clean ? `${base}/${clean}` : `${base}/`;
}
