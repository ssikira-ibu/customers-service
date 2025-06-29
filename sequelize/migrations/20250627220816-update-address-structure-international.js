'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Rename 'street' to 'addressLine1'
    await queryInterface.renameColumn('addresses', 'street', 'addressLine1');
    
    // Add new optional 'addressLine2' field
    await queryInterface.addColumn('addresses', 'addressLine2', {
      type: Sequelize.STRING(128),
      allowNull: true,
      after: 'addressLine1'
    });
    
    // Rename 'state' to 'stateProvince' and make it optional
    await queryInterface.renameColumn('addresses', 'state', 'stateProvince');
    await queryInterface.changeColumn('addresses', 'stateProvince', {
      type: Sequelize.STRING(128),
      allowNull: true
    });
    
    // Make 'postalCode' optional (some countries don't use postal codes)
    await queryInterface.changeColumn('addresses', 'postalCode', {
      type: Sequelize.STRING(128),
      allowNull: true
    });
    
    // Add optional 'region' field for countries that use regions instead of states
    await queryInterface.addColumn('addresses', 'region', {
      type: Sequelize.STRING(128),
      allowNull: true,
      after: 'stateProvince'
    });
    
    // Add optional 'district' field for additional administrative divisions
    await queryInterface.addColumn('addresses', 'district', {
      type: Sequelize.STRING(128),
      allowNull: true,
      after: 'region'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove new columns
    await queryInterface.removeColumn('addresses', 'district');
    await queryInterface.removeColumn('addresses', 'region');
    await queryInterface.removeColumn('addresses', 'addressLine2');
    
    // Revert postalCode to required
    await queryInterface.changeColumn('addresses', 'postalCode', {
      type: Sequelize.STRING(128),
      allowNull: false
    });
    
    // Revert stateProvince to required and rename back to state
    await queryInterface.changeColumn('addresses', 'stateProvince', {
      type: Sequelize.STRING(128),
      allowNull: false
    });
    await queryInterface.renameColumn('addresses', 'stateProvince', 'state');
    
    // Rename addressLine1 back to street
    await queryInterface.renameColumn('addresses', 'addressLine1', 'street');
  }
}; 