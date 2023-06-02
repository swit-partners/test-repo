const middleware = require('../middleware/middleware');
module.exports = function (app, model, controllers) {

    app.get('/jira-auth', function (req, res) {
        res.render('jira-auth.html');
    });

    app.get('/jira-auth-temp', function (req, res) {
        res.render('jira/jira-auth', {
            user_id: '8374'
        });
    });

    app.get('/jira-auth-success', function (req, res) {
        res.render('jira/jira-auth-success');
    });

    app.get('/swit-auth-user', function (req, res) {
        res.render('swit-user-login.html');
    });

    // app.get('/jira-auth-success', function (req, res) {
    //     res.render('jira-auth-success.html');
    // });

    app.get('/jira-auth-proceed', controllers.jiraAuth);
    app.post('/jira-webhook', controllers.jiraWebhook);
    app.get('/set-swit-authcode', controllers.setSwitToken);
    app.post('/swit' , middleware.jiraNewAccessTokenMiddleware(), controllers.setSwitUserAction);

    app.post('/jira-refresh-token', middleware.jiraNewAccessTokenMiddleware(), function (req, res) {
        res.send({ status: 200, msg: "JIRA token successfully refreshed" });
      });

}