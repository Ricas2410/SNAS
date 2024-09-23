'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Users', 'profilePhoto', {
      type: Sequelize.STRING,
      allowNull: true, // Profile photo can be null initially
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Users', 'profilePhoto');
  }
};
