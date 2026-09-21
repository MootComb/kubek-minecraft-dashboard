import { Injectable } from "@nestjs/common";
import type {
  IServer,
  ServerStatus,
  ServerVariableValue,
} from "@shared/types/server/server.types";
import { SqliteProvider } from "../sqlite.provider";

export abstract class IServersRepository {
  abstract findAll(): IServer[];

  abstract findById(id: string): IServer | null;

  abstract findByName(name: string): IServer | null;

  abstract create(server: Omit<IServer, "id">): IServer;

  abstract update(id: string, updates: Partial<IServer>): IServer | null;

  abstract delete(id: string): boolean;
}

@Injectable()
export class ServersRepository implements IServersRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  findAll(): IServer[] {
    const rows = this.sqlite.connection.query("SELECT * FROM servers").all();
    return rows.map((r: any) => this.deserialize(r));
  }

  findById(id: string): IServer | null {
    const row = this.sqlite.connection
      .query("SELECT * FROM servers WHERE id = ?")
      .get(id);
    return row ? this.deserialize(row) : null;
  }

  findByName(name: string): IServer | null {
    const row = this.sqlite.connection
      .query("SELECT * FROM servers WHERE name = ?")
      .get(name);
    return row ? this.deserialize(row) : null;
  }

  /**
   * Generate server ID from name:
   * - Convert to lowercase
   * - Replace spaces and special chars with hyphens
   * - Remove any non-alphanumeric chars except hyphens
   * - Collapse multiple hyphens
   * - Trim hyphens from ends
   */
  private generateIdFromName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphen
      .replace(/^-+|-+$/g, '');      // Remove leading/trailing hyphens
  }

  create(server: Omit<IServer, "id">): IServer {
    // Generate ID from server name
    const id = this.generateIdFromName(server.name);
    
    // Check if ID already exists (name collision after normalization)
    const existing = this.findById(id);
    if (existing) {
      throw new Error(`Server ID "${id}" already exists (conflict with server "${existing.name}"). Please use a different name.`);
    }

    const stmt = this.sqlite.connection.prepare(`INSERT INTO servers
                                                 (id, name, status, restartEnabled, restartAttempts, folderId, blueprintId, blueprintVersion, variables, runtimeKind)
                                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(
      id,
      server.name,
      server.status,
      server.restartOnError.enabled ? 1 : 0,
      server.restartOnError.attempts,
      server.folderId ?? null,
      server.blueprintId,
      server.blueprintVersion ?? null,
      JSON.stringify(server.variables ?? {}),
      server.runtimeKind ?? null,
    );

    return this.findById(id)!;
  }

  update(id: string, updates: Partial<IServer>): IServer | null {
    const existing = this.findById(id);
    if (!existing) return null;

    // If name is being updated, check for ID conflicts
    if (updates.name && updates.name !== existing.name) {
      const newId = this.generateIdFromName(updates.name);
      if (newId !== id) {
        const conflict = this.findById(newId);
        if (conflict) {
          throw new Error(`Cannot rename: server ID "${newId}" already exists (conflict with server "${conflict.name}")`);
        }
        // Update ID along with name
        const updated = { ...existing, ...updates };
        // Delete old record and insert with new ID
        this.delete(id);
        const stmt = this.sqlite.connection.prepare(`INSERT INTO servers
                                                     (id, name, status, restartEnabled, restartAttempts, folderId, blueprintId, blueprintVersion, variables, runtimeKind)
                                                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        stmt.run(
          newId,
          updated.name,
          updated.status,
          updated.restartOnError.enabled ? 1 : 0,
          updated.restartOnError.attempts,
          updated.folderId ?? null,
          updated.blueprintId,
          updated.blueprintVersion ?? null,
          JSON.stringify(updated.variables ?? {}),
          updated.runtimeKind ?? null,
        );
        return this.findById(newId);
      }
    }

    const updated = { ...existing, ...updates };
    const stmt = this.sqlite.connection.prepare(`UPDATE servers SET
                                                                  name = ?, status = ?, restartEnabled = ?, restartAttempts = ?, folderId = ?, blueprintId = ?, blueprintVersion = ?, variables = ?, runtimeKind = ?
                                                 WHERE id = ?`);
    stmt.run(
      updated.name,
      updated.status,
      updated.restartOnError.enabled ? 1 : 0,
      updated.restartOnError.attempts,
      updated.folderId ?? null,
      updated.blueprintId,
      updated.blueprintVersion ?? null,
      JSON.stringify(updated.variables ?? {}),
      updated.runtimeKind ?? null,
      id,
    );

    return this.findById(id);
  }

  delete(id: string): boolean {
    const existing = this.findById(id);
    if (!existing) return false;

    this.sqlite.connection.prepare("DELETE FROM servers WHERE id = ?").run(id);
    return true;
  }

  private deserialize(row: any): IServer {
    return {
      id: String(row.id),
      name: String(row.name),
      status: String(row.status) as ServerStatus,
      restartOnError: {
        enabled: !!row.restartEnabled,
        attempts: Number(row.restartAttempts),
      },
      folderId: row.folderId != null ? String(row.folderId) : null,
      blueprintId: String(row.blueprintId),
      blueprintVersion:
        row.blueprintVersion != null ? String(row.blueprintVersion) : undefined,
      variables: row.variables
        ? (JSON.parse(row.variables) as Record<string, ServerVariableValue>)
        : {},
      runtimeKind:
        row.runtimeKind != null
          ? (String(row.runtimeKind) as IServer["runtimeKind"])
          : undefined,
    };
  }
}
