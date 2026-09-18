export interface StoredWorkspaceLayout {
  id: string;
  userId: string;
  workspaceKey: string;
  version: number;
  layoutJson: unknown;
  updatedAt: Date;
}

export interface SaveWorkspaceLayoutRecord {
  userId: string;
  workspaceKey: string;
  version: number;
  layoutJson: object;
}

export interface WorkspaceLayoutRepository {
  findByUserAndWorkspace(
    userId: string,
    workspaceKey: string,
  ): Promise<StoredWorkspaceLayout | null>;
  upsert(record: SaveWorkspaceLayoutRecord): Promise<StoredWorkspaceLayout>;
  deleteByUserAndWorkspace(userId: string, workspaceKey: string): Promise<void>;
}
