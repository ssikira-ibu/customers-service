import { Sequelize } from 'sequelize';
import { Customer, defineCustomerModel } from './customer';
import { CustomerNote, defineCustomerNoteModel } from './note';
import { CustomerPhone, initCustomerPhone } from './customerphone';
import { logger } from '../logging';
import { CustomerAddress, initAddress } from './address';
import { CustomerReminder, defineCustomerReminderModel } from './reminder';
import { User, defineUserModel } from './user';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in environment variables.");
}

// Create Sequelize instance following Cloud SQL best practices
export const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: "postgres",
  logging:
    process.env.NODE_ENV === "production"
      ? (sql, timing) => logger.info("Database query executed", { sql, timing })
      : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    socketPath: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
  },
  retry: {
    max: 3,
    match: [
      /ECONNRESET/,
      /ENOTFOUND/,
      /ECONNREFUSED/,
      /ETIMEDOUT/,
      /connection/i,
    ],
  },
});

export async function initializeDatabase() {
  try {
    // Log connection details for debugging (without exposing sensitive info)
    logger.info("Initializing database connection", {
      databaseUrl: process.env.DATABASE_URL
        ? `${process.env.DATABASE_URL.substring(0, 30)}...`
        : "NOT_SET",
      cloudSqlConnection: process.env.CLOUD_SQL_CONNECTION_NAME || "NOT_SET",
      nodeEnv: process.env.NODE_ENV,
      dialect: sequelize.getDialect(),
      poolConfig: {
        max: sequelize.config.pool?.max,
        min: sequelize.config.pool?.min,
        acquire: sequelize.config.pool?.acquire,
        idle: sequelize.config.pool?.idle,
      },
    });

    console.log(
      `[DATABASE] Initializing connection - ENV: ${
        process.env.NODE_ENV
      }, Cloud SQL: ${
        process.env.CLOUD_SQL_CONNECTION_NAME ? "SET" : "NOT_SET"
      }`
    );

    // Test database connection
    await sequelize.authenticate();
    logger.info("Database connection established successfully");
    console.log(`[DATABASE] Connection established successfully`);

    // Run migrations
    try {
      const { runMigrations } = await import("./migration");
      await runMigrations(sequelize);
    } catch (migrationError) {
      const errorDetails = {
        error:
          migrationError instanceof Error
            ? migrationError.message
            : String(migrationError),
        stack:
          migrationError instanceof Error ? migrationError.stack : undefined,
        name: migrationError instanceof Error ? migrationError.name : undefined,
        cause:
          migrationError instanceof Error && "cause" in migrationError
            ? migrationError.cause
            : undefined,
        databaseUrl: process.env.DATABASE_URL
          ? `${process.env.DATABASE_URL.substring(0, 30)}...`
          : "NOT_SET",
        cloudSqlConnection: process.env.CLOUD_SQL_CONNECTION_NAME || "NOT_SET",
      };

      logger.error("Database migration failed during startup", errorDetails);

      // Critical console logging for Cloud Run
      console.error(
        `[DATABASE CRITICAL ERROR] Migration failed during startup`
      );
      console.error(`[DATABASE ERROR] ${errorDetails.error}`);
      console.error(`[DATABASE ERROR NAME] ${errorDetails.name || "Unknown"}`);
      console.error(
        `[DATABASE CONFIG] Cloud SQL: ${errorDetails.cloudSqlConnection}, DB URL: ${errorDetails.databaseUrl}`
      );
      if (errorDetails.stack) {
        console.error(`[DATABASE STACK TRACE]`);
        console.error(errorDetails.stack);
      }
      if (errorDetails.cause) {
        console.error(
          `[DATABASE ROOT CAUSE] ${JSON.stringify(errorDetails.cause)}`
        );
      }

      // Close the connection on migration failure
      try {
        await sequelize.close();
        logger.info("Database connection closed after migration failure");
        console.log(`[DATABASE] Connection closed after migration failure`);
      } catch (closeError) {
        logger.error("Error closing database connection", {
          error:
            closeError instanceof Error
              ? closeError.message
              : String(closeError),
          stack: closeError instanceof Error ? closeError.stack : undefined,
        });

        console.error(
          `[DATABASE] Error closing connection: ${
            closeError instanceof Error
              ? closeError.message
              : String(closeError)
          }`
        );
      }
      throw migrationError;
    }

    // Initialize models
    defineCustomerModel(sequelize);
    defineCustomerNoteModel(sequelize);
    initCustomerPhone(sequelize);
    initAddress(sequelize);
    defineCustomerReminderModel(sequelize);
    defineUserModel(sequelize);

    // Set up associations
    Customer.hasMany(CustomerNote, {
      foreignKey: "customerId",
      as: "notes",
    });

    CustomerNote.belongsTo(Customer, {
      foreignKey: "customerId",
    });

    Customer.hasMany(CustomerPhone, {
      foreignKey: "customerId",
      as: "phones",
    });
    CustomerPhone.belongsTo(Customer, {
      foreignKey: "customerId",
      as: "customer",
    });

    Customer.hasMany(CustomerAddress, {
      foreignKey: "customerId",
      as: "addresses",
    });
    CustomerAddress.belongsTo(Customer, {
      foreignKey: "customerId",
      as: "customer",
    });

    Customer.hasMany(CustomerReminder, {
      foreignKey: "customerId",
      as: "reminders",
    });
    CustomerReminder.belongsTo(Customer, {
      foreignKey: "customerId",
      as: "customer",
    });

    Customer.belongsTo(User, { foreignKey: "userId", as: "user" });
    User.hasMany(Customer, { foreignKey: "userId", as: "customers" });

    logger.info("Database models and associations initialized successfully");
    console.log(`[DATABASE] Models and associations initialized successfully`);
  } catch (error) {
    const errorDetails = {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      cause:
        error instanceof Error && "cause" in error ? error.cause : undefined,
    };

    logger.error("Database initialization failed", errorDetails);

    // Critical console logging for Cloud Run
    console.error(
      `[DATABASE INITIALIZATION FAILED] Database initialization failed`
    );
    console.error(`[DATABASE ERROR] ${errorDetails.error}`);
    console.error(`[DATABASE ERROR NAME] ${errorDetails.name || "Unknown"}`);
    console.error(
      `[DATABASE ENV] NODE_ENV: ${process.env.NODE_ENV}, DB_URL: ${
        process.env.DATABASE_URL ? "SET" : "NOT_SET"
      }, Cloud SQL: ${
        process.env.CLOUD_SQL_CONNECTION_NAME ? "SET" : "NOT_SET"
      }`
    );
    if (errorDetails.stack) {
      console.error(`[DATABASE INITIALIZATION STACK]`);
      console.error(errorDetails.stack);
    }
    if (errorDetails.cause) {
      console.error(
        `[DATABASE INITIALIZATION CAUSE] ${JSON.stringify(errorDetails.cause)}`
      );
    }

    throw error;
  }
}