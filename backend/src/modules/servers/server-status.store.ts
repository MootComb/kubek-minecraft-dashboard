import * as fs from "fs";
import * as path from "path";

const STATUS_FILE = "/data/server-status.json";

export class ServerStatusStore {
  private statuses: Map<string, string> = new Map();

  constructor() {
    this.load();
  }

  load(): void {
    try {
      if (fs.existsSync(STATUS_FILE)) {
        const data = fs.readFileSync(STATUS_FILE, "utf8");
        const parsed = JSON.parse(data);
        this.statuses = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.error("[ServerStatusStore] Failed to load statuses:", error);
    }
  }

  save(): void {
    try {
      const obj = Object.fromEntries(this.statuses);
      fs.writeFileSync(STATUS_FILE, JSON.stringify(obj, null, 2));
    } catch (error) {
      console.error("[ServerStatusStore] Failed to save statuses:", error);
    }
  }

  setStatus(serverId: string, status: string): void {
    this.statuses.set(serverId, status);
    this.save();
  }

  getStatus(serverId: string): string | undefined {
    return this.statuses.get(serverId);
  }

  getAll(): Map<string, string> {
    return new Map(this.statuses);
  }

  clear(): void {
    this.statuses.clear();
    this.save();
  }
}
