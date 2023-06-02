module.exports = function (Sequelize, Schema) {
    var module = {};

    module.Jira = require('./jira')(Sequelize, Schema);
    // module.User = require('./user')(Sequelize, Schema);
    module.Hubspot = require('./hubspot')(Sequelize, Schema);
    module.confluence = require('./confluence')(Sequelize, Schema);
    module.confluencesubscription = require('./confluencesubscription')(Sequelize, Schema);

    return module;
};