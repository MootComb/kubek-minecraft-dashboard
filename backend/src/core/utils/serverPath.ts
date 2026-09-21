import { BadRequestException } from "@nestjs/common";
import process from "node:process";
import path, { join, normalize, resolve, sep } from "path";

// Get server directory by server name
export const getServerPath = (serverName: string) => {
  return `/data/servers/${serverName}`;
};

// Get server startup script path by server name
export const getServerLaunchConfiguration = (serverName: string) => {
  if (process.platform === "win32") {
    return [path.resolve(`/data/servers/${serverName}/start.bat`)];
  } else if (["linux", "darwin"].includes(process.platform)) {
    return ["sh", path.resolve(`/data/servers/${serverName}/start.sh`)];
  } else {
    throw new Error(`Unsupported platform: ${process.platform}`);
  }
};

///
/// SAFE PATH RESOLUTION
///

// Validate serverName as a single path segment, then jail requestedPath under the server directory
export function getSafeServerPath(
  serverName: string,
  requestedPath = "",
): string {
  if (!serverName || /[\\/]|\.\./.test(serverName)) {
    throw new BadRequestException("Invalid server name");
  }

  const base = resolve(getServerPath(serverName));
  const full = resolve(join(base, normalize(requestedPath)));

  if (full !== base && !full.startsWith(base + sep)) {
    throw new BadRequestException(
      "Invalid path: directory traversal attempt detected",
    );
  }

  return full;
}
