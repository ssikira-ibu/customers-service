import { MigrationFn } from "umzug";
import { QueryInterface } from "sequelize";

export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  // Add a unique constraint on email and userId combination
  await queryInterface.addConstraint("customers", {
    fields: ["email", "userId"],
    type: "unique",
    name: "customers_email_userId_unique",
  });
};

export const down: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  // Remove the unique constraint
  await queryInterface.removeConstraint(
    "customers",
    "customers_email_userId_unique"
  );
};
