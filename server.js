require("dotenv").config();
const express = require("express");
const app = express();
// const cors = require("cors");
const Sequelize = require('sequelize');
global.Sequelize = Sequelize;
const sequelizeDB = require('./src/config/database.js')(Sequelize);
global.sequelize1 = sequelizeDB;
const model = require('./src/models/index')(Sequelize, sequelizeDB);
const controllers = require('./src/controllers/index')(model);
const cookieSession = require('cookie-session');
const session = require('express-session');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const errorHandler = require('errorhandler');
const morgan = require('morgan');
const ace = require('atlassian-connect-express');
const helmet = require('helmet');
const nocache = require('nocache');
// const addServerSideRendering = require('./server-side-rendering.js');
const addon = ace(app);


// See config.json
const port = addon.config.port();
app.set('port', port);

// Log requests, using an appropriate formatter by env
const devEnv = app.get('env') === 'development';
app.use(morgan(devEnv ? 'dev' : 'combined'));

// We don't want to log JWT tokens, for security reasons
morgan.token('url', redactJwtTokens);

// Atlassian security policy requirements
// http://go.atlassian.com/security-requirements-for-cloud-apps
// HSTS must be enabled with a minimum age of at least one year
app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubDomains: false
}));
app.use(helmet.referrerPolicy({
  policy: ['origin']
}));

app.use(cookieParser());

// Gzip responses when appropriate
app.use(compression());

// Include atlassian-connect-express middleware
app.use(addon.middleware());


// Atlassian security policy requirements
// http://go.atlassian.com/security-requirements-for-cloud-apps
app.use(nocache());

// Show nicer errors in dev mode
if (devEnv) app.use(errorHandler());

// // Wire up routes
// const confluenceRoutes = require('./src/routes/confluence.js')
// confluenceRoutes(app, addon, model, controllers);

app.use(express.static(__dirname + '/src/public'));

app.set('views', __dirname + '/src/public/views');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');



const bodyParser = require('body-parser');
const request = require('request');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}))


require('./src/routes/index')(app, model, controllers);


app.use(function (req, res, next) {
  res.locals.session = req.session;
  next();
});

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
// app.use(cors()) //This line does the same with your res.headers() code block
// app.options("*",cors())

app.get('/', (req, res) => {
  res.send("Welcome to integration test app");
});

app.get('/auth', function (req, res) {
  res.render('jira/index.html');
});

app.get('/hubspot-auth', function (req, res) {
  res.render('hubspot-install.html');
})

//-----------test commit---------------
//--------test 2 commit--------------


app.listen(process.env.PORT, () =>{
  console.log('App server running at port: ' + port);

  if (1) addon.register();
});

function redactJwtTokens(req) {
  const url = req.originalUrl || req.url || '';
  const params = new URLSearchParams(url);
  let redacted = url;
  params.forEach((value, key) => {
    if (key.toLowerCase() === 'jwt') {
      redacted = redacted.replace(value, 'redacted');
    }
  });
  return redacted;
}

