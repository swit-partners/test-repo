const middleware = require("../middleware/middleware")

module.exports = function (app, model, controllers) {

    // app.get('/hubspot-auth', function (req, res) {
    //     res.render('hubspot-auth.html');
    // });

    app.get('/swit-hubspot-auth-user', function (req, res) {
        res.render('hubspot/swit-hubspot-user-login.html');
    });
    app.get('/hubspot-auth-proceed', controllers.hubspotAuth);
    app.get('/hubspot-login', controllers.hubspotLogin);
    app.post('/userActions', middleware.hubspotNewAccessTokenMiddleware(), controllers.userActions);


}