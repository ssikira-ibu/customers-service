'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Enable the pg_trgm extension for fuzzy matching
        await queryInterface.sequelize.query(`
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
    `);

        // Add a combined tsvector column for full-text search
        await queryInterface.sequelize.query(`
      ALTER TABLE customers 
      ADD COLUMN search_vector tsvector 
      GENERATED ALWAYS AS (
        to_tsvector('english',
          coalesce("firstName",'') || ' ' ||
          coalesce("lastName",'') || ' ' ||
          coalesce(email,'')
        )
      ) STORED;
    `);

        // Add a combined text column for trigram similarity search
        await queryInterface.sequelize.query(`
      ALTER TABLE customers
      ADD COLUMN search_text text
      GENERATED ALWAYS AS (
        lower(
          coalesce("firstName",'') || ' ' ||
          coalesce("lastName",'') || ' ' ||
          coalesce(email,'')
        )
      ) STORED;
    `);

        // Create GIN index for full-text search
        await queryInterface.sequelize.query(`
      CREATE INDEX customers_search_vector_idx ON customers USING GIN(search_vector);
    `);

        // Create GIN index for trigram similarity search
        await queryInterface.sequelize.query(`
      CREATE INDEX customers_search_text_idx ON customers USING GIN(search_text gin_trgm_ops);
    `);
    },

    async down(queryInterface, Sequelize) {
        // Drop indexes
        await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS customers_search_vector_idx;
      DROP INDEX IF EXISTS customers_search_text_idx;
    `);

        // Drop columns
        await queryInterface.sequelize.query(`
      ALTER TABLE customers 
      DROP COLUMN IF EXISTS search_vector,
      DROP COLUMN IF EXISTS search_text;
    `);

        // Drop the extension (only if no other tables are using it)
        await queryInterface.sequelize.query(`
      DROP EXTENSION IF EXISTS pg_trgm;
    `);
    }
}; 