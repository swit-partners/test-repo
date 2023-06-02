module.exports = function (app, model, controllers) {
	
	require('./jira.js')(app, model, controllers.jiraController);
	require('./hubspot.js')(app, model, controllers.hubspotController);
	require('./confluence.js')(app, model, controllers.confluenceController);

}