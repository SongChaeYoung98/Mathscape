import { invoke } from '@tauri-apps/api/core';
import { normalizeProject, type MathscapeProject } from './project';

export type ProjectSummary = {
  project_id: string;
  title: string;
  updated_at: number;
};

type TauriWindow = Window &
  typeof globalThis & {
    __TAURI_INTERNALS__?: unknown;
  };

export function isNativeRuntime(): boolean {
  return typeof window !== 'undefined' && Boolean((window as TauriWindow).__TAURI_INTERNALS__);
}

export function projectLibraryId(project: MathscapeProject): string {
  const sceneId = project.activeSceneId || project.scenes[0]?.id || 'untitled';
  return `local-${sceneId}`;
}

export async function saveProjectToLibrary(project: MathscapeProject): Promise<ProjectSummary | undefined> {
  if (!isNativeRuntime()) return undefined;

  return invoke<ProjectSummary>('save_project_to_library', {
    projectId: projectLibraryId(project),
    project
  });
}

export async function loadProjectFromLibrary(projectId: string): Promise<MathscapeProject | undefined> {
  if (!isNativeRuntime()) return undefined;

  const project = await invoke<MathscapeProject>('load_project_from_library', { projectId });
  return normalizeProject(project);
}

export async function listProjectLibrary(): Promise<ProjectSummary[]> {
  if (!isNativeRuntime()) return [];

  return invoke<ProjectSummary[]>('list_project_library');
}
