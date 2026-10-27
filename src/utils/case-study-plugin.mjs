// Reshapes a case study's Markdown into the deck's layout while the site builds.
// Each "##" heading starts a full-width section, and a few patterns in the
// writing (phase headings, image notes, results, [gaps]) get their own styling.
// Written by hand so it needs no extra dependency.

// Sections alternate these backgrounds, except the ones named below
const CYCLE = ['paper', 'mist'];
const NAMED = { Results: 'teal', Reflection: 'blue' };

const el = (tagName, className, children = []) => ({
  type: 'element',
  tagName,
  properties: className ? { className: [className] } : {},
  children,
});
const text = (value) => ({ type: 'text', value });

function textOf(node) {
  if (node.type === 'text') return node.value;
  return (node.children || []).map(textOf).join('');
}

const isWhitespace = (node) => node.type === 'text' && !node.value.trim();
const firstContent = (node) => (node.children || []).find((child) => !isWhitespace(child));

// Prefix site-relative links with the base path, and highlight [gaps]
function walk(node, base) {
  if (node.type !== 'element' && node.type !== 'root') return;
  if (node.tagName === 'code' || node.tagName === 'pre') return;

  if (node.tagName === 'a' && typeof node.properties.href === 'string') {
    const href = node.properties.href;
    if (href.startsWith('/') && !href.startsWith(`${base}/`)) {
      node.properties.href = base + href;
    }
  }

  const children = [];
  for (const child of node.children) {
    if (child.type === 'text' && /\[[^\]]+\]/.test(child.value)) {
      for (const part of child.value.split(/(\[[^\]]+\])/)) {
        if (!part) continue;
        children.push(/^\[[^\]]+\]$/.test(part) ? el('span', 'todo', [text(part)]) : text(part));
      }
    } else {
      walk(child, base);
      children.push(child);
    }
  }
  node.children = children;
}

// "*Image: audit spreadsheet*" on its own line becomes a placeholder box
function imagePlaceholder(node) {
  if (node.type !== 'element' || node.tagName !== 'p') return null;
  const content = node.children.filter((child) => !isWhitespace(child));
  if (content.length !== 1 || content[0].tagName !== 'em') return null;
  const label = textOf(content[0]).trim();
  if (!label.startsWith('Image:')) return null;
  return el('figure', 'image-placeholder', [
    el('span', null, [text(`Image placeholder. ${label.replace(/^Image:\s*/, '')}`)]),
  ]);
}

// "Phase 1: Discovery and audit" becomes a small label above the heading
function splitPhase(heading) {
  const match = textOf(heading).match(/^(Phase \d+):\s*(.+)$/);
  if (!match) return [heading];
  heading.children = [text(match[2])];
  return [el('p', 'label', [text(match[1])]), heading];
}

// In Results, the bold number at the start of each item becomes a big number
function styleResults(nodes) {
  for (const node of nodes) {
    if (node.tagName !== 'ul') continue;
    node.properties.className = ['results'];
    for (const item of node.children) {
      const lead = firstContent(item);
      if (lead?.tagName !== 'strong') continue;
      lead.properties.className = ['results__number'];
      const last = lead.children[lead.children.length - 1];
      if (last?.type === 'text') last.value = last.value.replace(/:\s*$/, '');
    }
  }
}

// In the stakeholder section, paragraphs that open with an *italic name* become panels
function groupPanels(nodes) {
  const out = [];
  let group = null;
  for (const node of nodes) {
    const isPanel = node.tagName === 'p' && firstContent(node)?.tagName === 'em';
    if (isPanel) {
      if (!group) {
        group = el('div', 'panels');
        out.push(group);
      }
      group.children.push(el('div', 'panel', [node]));
    } else if (!isWhitespace(node)) {
      group = null;
      out.push(node);
    }
  }
  return out;
}

// Astro 7's Markdown engine (Sätteri) hands plugins a read-only tree, so this
// copies it, reshapes the copy, and swaps the copy in.
export default function caseStudyPlugin({ base = '' } = {}) {
  const transform = reshape(base);
  return {
    name: 'case-study-sections',
    before(root, ctx) {
      const copy = JSON.parse(JSON.stringify(root));
      transform(copy);
      ctx.replaceNode(root, copy);
    },
  };
}

function reshape(base) {
  return (tree) => {
    walk(tree, base);

    const sections = [];
    let current = null;
    let cycleIndex = 0;

    for (const node of tree.children) {
      if (node.type === 'element' && node.tagName === 'h2') {
        const name = textOf(node).trim();
        const tone = NAMED[name] || CYCLE[cycleIndex++ % CYCLE.length];
        current = { name, tone, children: splitPhase(node) };
        sections.push(current);
        continue;
      }
      if (!current) {
        current = { name: '', tone: CYCLE[cycleIndex++ % CYCLE.length], children: [] };
        sections.push(current);
      }
      current.children.push(imagePlaceholder(node) || node);
    }

    tree.children = sections.map(({ name, tone, children }) => {
      let body = children;
      if (name === 'Results') styleResults(body);
      if (/stakeholder/i.test(name)) body = groupPanels(body);
      const section = el('section', null, [el('div', 'container flow', body)]);
      section.properties.className = ['section', `section--${tone}`, 'cs-section'];
      return section;
    });
  };
}
