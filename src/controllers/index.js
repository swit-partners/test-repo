module.exports = function (model) {
	var module = {};

	module.jiraController = require('./JiraController')(model);
	module.confluenceController = require('./confluenceController')(model);
	module.hubspotController = require('./HubspotController')(model);

	return module;
}	