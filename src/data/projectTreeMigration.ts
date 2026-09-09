import type { Project } from "../types/dashboard";

export const PROJECT_TREE_MIGRATION = "v1.6.0-project-tree";

/**
 * Converts legacy flat projects into L1 nodes and repairs malformed tree metadata
 * without removing any legacy project fields or execution steps.
 */
export function migrateProjectTree(projects: Project[]): { projects: Project[]; changed: boolean } {
  const byId = new Map(projects.map((project) => [project.id, project]));
  const parentMap = new Map<string, string | null>();
  let changed = false;

  projects.forEach((project, index) => {
    const parentId = project.parentId && byId.has(project.parentId) && project.parentId !== project.id ? project.parentId : null;
    parentMap.set(project.id, parentId);
    if (parentId !== (project.parentId || null)) changed = true;
    if (!Number.isFinite(Number(project.sortOrder))) changed = true;
    if (project.isDelayed !== (project.isDelayed === true)) changed = true;
    if (!Number.isFinite(Number(project.sortOrder))) project.sortOrder = (index + 1) * 10;
  });

  const visited = new Set<string>();
  projects.forEach((project) => {
    const chain = new Set<string>();
    let currentId: string | null = project.id;
    let depth = 1;
    let rootId = project.id;
    while (currentId) {
      if (chain.has(currentId)) {
        parentMap.set(currentId, null);
        changed = true;
        break;
      }
      chain.add(currentId);
      const parentId: string | null = parentMap.get(currentId) || null;
      if (!parentId) {
        rootId = currentId;
        break;
      }
      depth += 1;
      currentId = parentId;
      if (depth > 5) {
        parentMap.set(project.id, null);
        depth = 1;
        rootId = project.id;
        changed = true;
        break;
      }
    }

    const nextParentId = parentMap.get(project.id) || null;
    const nextDepth = nextParentId ? depth : 1;
    const nextRootId = nextParentId ? rootId : project.id;
    if (project.parentId !== nextParentId || project.depth !== nextDepth || project.rootProjectId !== nextRootId) changed = true;
    project.parentId = nextParentId;
    project.depth = nextDepth;
    project.rootProjectId = nextRootId;
    if (project.isDelayed !== true) project.isDelayed = false;
    visited.add(project.id);
  });

  return { projects, changed: changed || visited.size !== projects.length };
}

