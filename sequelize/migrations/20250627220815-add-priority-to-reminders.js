'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('reminders', 'priority', {
      type: Sequelize.ENUM('low', 'medium', 'high'),
      defaultValue: 'medium',
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('reminders', 'priority');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_reminders_priority";');
  }
};
