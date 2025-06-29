import * as dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: '.env.local' });
}

import Koa from 'koa';
import helmet from 'koa-helmet';
import cors from '@koa/cors';
import { logger } from './logging';
import { initializeDatabase } from './db/database';
import router from './routes/customers/index';
import authRouter from './routes/auth';
import healthRouter from './routes/health';
import remindersRouter from './routes/reminders';
import './config/firebase';
import { AuthContext } from './middleware/auth';
import requestLogger from './middleware/logging';

const app = new Koa<Koa.DefaultState, AuthContext>();
app.context.log = logger;

logger.info("Starting customers service...");
logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
logger.info(`DATABASE_URL configured: ${!!process.env.DATABASE_URL}`);
if (process.env.DATABASE_URL) {
  logger.info(
    `DATABASE_URL preview: ${process.env.DATABASE_URL.substring(0, 50)}...`
  );
}

// Console logging for Cloud Run visibility
console.log(`[APP STARTUP] Starting customers service`);
console.log(`[APP CONFIG] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(
  `[APP CONFIG] DATABASE_URL: ${
    process.env.DATABASE_URL ? "CONFIGURED" : "NOT_SET"
  }`
);
console.log(
  `[APP CONFIG] CLOUD_SQL_CONNECTION_NAME: ${
    process.env.CLOUD_SQL_CONNECTION_NAME ? "CONFIGURED" : "NOT_SET"
  }`
);
console.log(`[APP CONFIG] PORT: ${process.env.PORT || "8080"}`);

initializeDatabase()
  .then(() => {
    logger.info("Database initialized successfully");
    console.log(`[APP] Database initialized successfully`);

    app
      .use(helmet())
      .use(requestLogger)
      .use(healthRouter.routes()) // Health endpoint without CORS
      .use(healthRouter.allowedMethods())
      .use(
        cors({
          origin: (ctx) => {
            const origin = ctx.get("Origin");

            // Allow localhost with any port for development
            if (process.env.NODE_ENV !== "production") {
              if (
                origin &&
                (origin.startsWith("http://localhost:") ||
                  origin.startsWith("http://127.0.0.1:") ||
                  origin === "http://localhost:3000")
              ) {
                return origin;
              }
              // Default to allow all origins in development
              return "*";
            }

            // Use CORS_ORIGIN environment variable for production
            const corsOrigin = process.env.CORS_ORIGIN;
            if (corsOrigin && origin === corsOrigin) {
              return origin;
            }

            // Reject in production if not in allowed list
            throw new Error("CORS not allowed");
          },
          allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
          allowHeaders: ["Content-Type", "Authorization", "Accept"],
          credentials: true,
        })
      )
      .use(authRouter.routes())
      .use(authRouter.allowedMethods())
      .use(remindersRouter.routes())
      .use(remindersRouter.allowedMethods())
      .use(router.routes())
      .use(router.allowedMethods());

    const PORT = parseInt(process.env.PORT || "8080", 10); // Parse as number for Cloud Run

    app.listen(PORT, "0.0.0.0", () => {
      // Listen on all interfaces
      logger.info(`Server is running on http://0.0.0.0:${PORT}`);
      console.log(`[APP] Server is running on http://0.0.0.0:${PORT}`);
      console.log(`[APP] Application startup completed successfully`);
    });
  })
  .catch((error) => {
    const errorDetails = {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      cause:
        error instanceof Error && "cause" in error ? error.cause : undefined,
      nodeEnv: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL ? "SET" : "NOT_SET",
      cloudSqlConnection: process.env.CLOUD_SQL_CONNECTION_NAME
        ? "SET"
        : "NOT_SET",
      port: process.env.PORT || "8080",
    };

    logger.error("Application startup failed", errorDetails);

    // Critical console logging for Cloud Run
    console.error(`[APP STARTUP FAILED] Application startup failed`);
    console.error(`[APP ERROR] ${errorDetails.error}`);
    console.error(`[APP ERROR NAME] ${errorDetails.name || "Unknown"}`);
    console.error(
      `[APP CONFIG] ENV: ${errorDetails.nodeEnv}, DB: ${errorDetails.databaseUrl}, Cloud SQL: ${errorDetails.cloudSqlConnection}, Port: ${errorDetails.port}`
    );
    if (errorDetails.stack) {
      console.error(`[APP STARTUP STACK]`);
      console.error(errorDetails.stack);
    }
    if (errorDetails.cause) {
      console.error(
        `[APP STARTUP CAUSE] ${JSON.stringify(errorDetails.cause)}`
      );
    }

    process.exit(1);
  });
