import { BadResponseFilter } from "@/core/middlewares/badResponseFilter";
import { validationPipe } from "@/core/middlewares/validationPipe";
import { readPortBeforeNestInit } from "@/core/utils/configEarly";
import { LoggerAddon } from "@/core/utils/logger";
import { Startup } from "@/core/utils/startup";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import { AppModule } from "./app.module";

process.on("unhandledRejection", (reason) => {
  console.error("[Process] Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[Process] Uncaught exception:", error);
});

async function bootstrap() {
  Startup.initTerminal();

  const configuredPort = readPortBeforeNestInit();

  await Startup.runIntro();

  const app = await NestFactory.create(AppModule, {
    logger: new LoggerAddon(),
  });

  app.useGlobalFilters(new BadResponseFilter());
  app.useGlobalPipes(validationPipe);

  if (process.env.NODE_ENV === "development") {
    const docConfig = new DocumentBuilder()
      .setTitle("Kubek - Minecraft Server Management")
      .setVersion("1.0")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "Secret",
          description: "Enter secret token",
        },
        "access-token",
      )
      .build();

    const document = SwaggerModule.createDocument(app, docConfig, {
      ignoreGlobalPrefix: true,
    });

    SwaggerModule.setup("/api/docs", app, document, {
      jsonDocumentUrl: "/api/docs-json",
      swaggerOptions: { persistAuthorization: true },
    });

    app.use(
      "/api/reference",
      apiReference({
        url: "/api/docs-json",
        theme: "default",
        layout: "modern",
        authentication: {
          preferredSecurityScheme: "httpBearer",
        },
      }),
    );
  }

  app.enableCors();
  app.enableShutdownHooks();

  const server = await app.listen(process.env.PORT ?? configuredPort);
  await Startup.serverStarted(configuredPort);

  let shuttingDown = false;
  const gracefulShutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`[Process] Received ${signal}, starting graceful shutdown...`);
    try {
      await new Promise<void>((resolve) => {
        server.close((err) => {
          if (err && (err as any).code !== "ERR_SERVER_NOT_RUNNING") {
            console.error("[Process] server.close error:", err);
          }
          resolve();
        });
      });

      await app.close();
      console.log("[Process] Application closed successfully");
      process.exit(0);
    } catch (error) {
      console.error("[Process] Error during shutdown:", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGQUIT", () => gracefulShutdown("SIGQUIT"));
}

bootstrap();