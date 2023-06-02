const middleware = require('../middleware/middleware');
module.exports = function (app, model, controllers) {

  app.get('/confluence-auth', function (req, res) {
    res.render('confluence/confluence-auth.html');
  });

  app.get('/confluence-swit-user-login', function (req, res) {
    res.render('confluence/confluence-swit-auth-login.html');
  });

  app.get('/confluence-auth-proceed', controllers.confluenceAuth);

  // app.get('/confluence-swit-auth-proceed', function (req, res) {
  //     res.render('confluence-swit-auth-login.html');
  // });

  app.get('/confluence-swit-callback-proceed', controllers.setSwitToken);
  app.post('/confluence-swit-user-action', middleware.confluenceNewAccessTokenMiddleware(),controllers.setConfluenceSwitUserAction)

    app.post('/confluence-refresh-token', middleware.confluenceNewAccessTokenMiddleware(), function (req, res) {
        res.send({ status: 200, msg: "CONFLUENCE token successfully refreshed" });
    });


  //------------------------WEBHOOKS-------------------------------

  app.post('/page_created', controllers.pageCreatedWebhook);
  app.post('/page_updated', controllers.pageUpdatedWebhook);
  app.post('/blog_created', controllers.blogCreatedWebhook);
  app.post('/comment_created', controllers.commentCreatedWebhook);
  // app.post('/page_children_reordered', controllers.pageReorderedWebhook);

}