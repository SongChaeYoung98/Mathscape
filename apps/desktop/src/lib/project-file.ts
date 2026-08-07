import { normalizeProject, type MathscapeProject } from './project';

const projectMimeType = 'application/vnd.mathscape.project+json';

export function serializeProject(project: MathscapeProject): string {
  return JSON.stringify(project, null, 2);
}

export function parseProjectFile(contents: string): MathscapeProject {
  const parsed = JSON.parse(contents) as MathscapeProject;
  return normalizeProject(parsed);
}

export function downloadProject(project: MathscapeProject): void {
  const blob = new Blob([serializeProject(project)], { type: projectMimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${slugify(project.title || 'mathscape-project')}.mathscape.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function readProjectFromFile(file: File): Promise<MathscapeProject> {
  return parseProjectFile(await file.text());
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'mathscape-project';
}
