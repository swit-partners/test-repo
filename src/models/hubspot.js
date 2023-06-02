module.exports = function (Sequelize, Schema) {
  var Hubspot = Schema.define(
    "hubspot",
    {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      hubspot_user_id: {
        type: Sequelize.STRING,
      },
      swit_code: {
        type: Sequelize.STRING,
      },
      swit_token: {
        type: Sequelize.TEXT,
      },
      swit_user_id: {
        type: Sequelize.STRING
      },
      user_email: {
        type: Sequelize.STRING,
      },
      hubspot_token: {
        type: Sequelize.TEXT,
      },
      hubspot_refresh_token: {
        type: Sequelize.TEXT,
      },
    },
    { underscored: true }
  );

  Hubspot.sync({ alter: true });

  return Hubspot;
};
