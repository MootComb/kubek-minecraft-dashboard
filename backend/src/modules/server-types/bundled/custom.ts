import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";

export const custom = {
  manifestVersion: 1,
  id: "com.kubek.custom",
  name: "Custom JAR",
  shortName: "Custom",
  description: "Run a user-supplied server jar",
  game: "minecraft",
  author: {
    name: "Kubek Team",
  },
  version: "1.0.0",
  tags: ["minecraft", "java", "custom"],
  engines: {
    kubek: ">=4.0.0",
  },
  runtime: {
    kind: "native",
  },
  dockerProfile: {
    image: "itzg/minecraft-server:{{JAVA_IMAGE_TAG}}",
    stdinOpen: true,
    stop: {
      type: "signal:SIGTERM",
    },
    env: {
      EULA: "TRUE",
      TYPE: "CUSTOM",
      CUSTOM_SERVER: "/data/server.jar",
      MAX_MEMORY: "{{XMX}}M",
      INIT_MEMORY: "{{XMS}}M",
      JVM_OPTS: "{{JVM_ARGS}}",
      SERVER_PORT: "{{SERVER_PORT}}",
      OVERRIDE_SERVER_PROPERTIES: "false",
      ENABLE_RCON: "TRUE",
      RCON_PASSWORD: "kubek",
      PUID: "{{HOST_UID}}",
      PGID: "{{HOST_GID}}",
    },
  },
  variables: [
    {
      key: "JVM_ARGS",
      label: "JVM Arguments (Full Command)",
      type: "string",
      default: '"/data/java/jdk-17.0.19+10-jre/bin/java" -Dfile.encoding=UTF-8 -Xms1024M -Xmx4096M -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -jar server.jar nogui',
      description: "Full Java command with all arguments",
      userEditable: true,
    },
    {
      key: "JAVA_VERSION",
      label: "Java",
      type: "number",
      default: 21,
      userEditable: true,
    },
    {
      key: "XMX",
      label: "Memory (MB)",
      type: "number",
      default: 2048,
      rules: "required|min:512",
      userEditable: true,
    },
    {
      key: "XMS",
      label: "Initial Memory (MB)",
      type: "number",
      default: 512,
      rules: "required|min:256",
      userEditable: true,
    },
  ],
  versions: {
    kind: "none",
  },
  install: {
    runIn: "host",
    steps: [
      {
        type: "writeFile",
        path: "eula.txt",
        content: "eula=true",
      },
      {
        type: "writeFile",
        path: "server.properties",
        content:
          "server-port={{SERVER_PORT}}\nquery.port={{SERVER_PORT}}\nenable-query=true\nonline-mode=false\nmotd=§f{{SERVER_NAME}}",
      },
    ],
  },
  startup: {
    command: "{{JVM_ARGS}}",
    stop: {
      type: "command",
      value: "stop",
    },
  },
  detection: {
    starting: ["Starting minecraft server", "Preparing spawn area"],
    running: [
      "Done \\(.*\\)! For help",
      "Done \\(.*\\)s\\)?!",
      "Listening on",
      "Server startup complete",
    ],
    stopping: ["Stopping (the )?server"],
  },
  query: {
    protocol: "minecraft-java",
    port: {
      fromVariable: "SERVER_PORT",
    },
  },
  ports: [
    {
      key: "game",
      label: "Game",
      default: 25565,
      protocol: "tcp",
      env: "SERVER_PORT",
      primary: true,
    },
  ],
  configFiles: [
    {
      path: "server.properties",
      parser: "properties",
      label: "Server Properties",
    },
  ],
  features: ["console", "backups", "files", "plugins:modrinth", "players"],
} satisfies KubekBlueprintManifest;
