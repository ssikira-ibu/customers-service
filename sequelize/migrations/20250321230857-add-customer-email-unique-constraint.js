'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add a unique constraint on email and userId combination
    await queryInterface.addConstraint('customers', {
      fields: ['email', 'userId'],
      type: 'unique',
      name: 'customers_email_userId_unique'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the unique constraint
    await queryInterface.removeConstraint('customers', 'customers_email_userId_unique');
  }
};
