export interface MarkdownChecklistItem {
  checked: boolean;
  text: string;
}

export interface MarkdownSection {
  title: string;
  items: MarkdownChecklistItem[];
  paragraphs: string[];
}

export function extractMarkdownSections(body: string, sectionTitles: string[]): MarkdownSection[] {
  const wanted = new Map(sectionTitles.map(title => [normalizeTitle(title), title]));
  const lines = body.split(/\r?\n/);
  const sections: MarkdownSection[] = [];
  let active: {
    title: string;
    level: number;
    lines: string[];
  } | undefined;

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      if (active) {
        sections.push(parseSection(active.title, active.lines));
        active = undefined;
      }

      const level = heading[1].length;
      const title = wanted.get(normalizeTitle(heading[2]));
      if (title) {
        active = { title, level, lines: [] };
      }
      continue;
    }

    if (active) {
      active.lines.push(line);
    }
  }

  if (active) {
    sections.push(parseSection(active.title, active.lines));
  }

  return sections;
}

function parseSection(title: string, lines: string[]): MarkdownSection {
  const items: MarkdownChecklistItem[] = [];
  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];

  for (const line of lines) {
    const checklist = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/.exec(line);
    if (checklist) {
      flushParagraph();
      items.push({
        checked: checklist[1].toLowerCase() === 'x',
        text: checklist[2].trim()
      });
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    currentParagraph.push(line.trim());
  }

  flushParagraph();

  return { title, items, paragraphs };

  function flushParagraph(): void {
    if (currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join(' '));
      currentParagraph = [];
    }
  }
}

function normalizeTitle(value: string): string {
  return value.trim().toLowerCase();
}
