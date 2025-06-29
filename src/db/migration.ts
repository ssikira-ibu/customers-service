import { Umzug, SequelizeStorage } from "umzug";
import path from "path";
import { Sequelize } from "sequelize";
import { logger } from "../logging";

function createUmzug(sequelize: Sequelize) {
  return new Umzug({
    migrations: {
      glob: path.join(__dirname, "migrations/*.ts"),
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({
      sequelize,
      tableName: "SequelizeMeta",
    }),
    logger: {
      info: (message) => logger.info("Migration", { message }),
      warn: (message) => logger.warn("Migration", { message }),
      error: (message) => logger.error("Migration", { message }),
      debug: (message) => logger.debug("Migration", { message }),
    },
  });
}

export async function runMigrations(sequelize: Sequelize) {
  const umzug = createUmzug(sequelize);

  try {
    logger.info("Starting migration process");

    // Check for pending migrations
    const pendingMigrations = await umzug.pending();
    const executedMigrations = await umzug.executed();

    logger.info("Migration status", {
      pendingCount: pendingMigrations.length,
      executedCount: executedMigrations.length,
      pending: pendingMigrations.map((m) => m.name),
    });

    if (pendingMigrations.length > 0) {
      logger.info("Running database migrations", {
        pendingCount: pendingMigrations.length,
        migrations: pendingMigrations.map((m) => m.name),
      });

      // Run migrations
      await umzug.up();

      logger.info("All database migrations completed successfully", {
        migrationsRun: pendingMigrations.length,
        completedMigrations: pendingMigrations.map((m) => m.name),
      });
    } else {
      logger.info("No pending database migrations");
    }
  } catch (error) {
    const errorDetails = {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };

    logger.error("Database migration process failed", errorDetails);
    throw error;
  }
}
