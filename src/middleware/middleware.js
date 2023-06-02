const jiraHelper = require('../helpers/jira');
const hubspotHelper = require('../helpers/hubspot');
const confluenceHelper = require('../helpers/confluence');

const helper = require('../helpers/functions');
const Sequelize = require('sequelize');
global.Sequelize = Sequelize;
const sequelizeDB = require('../config/database.js')(Sequelize);
global.sequelize1 = sequelizeDB;
const model = require('../models/index')(Sequelize, sequelizeDB);

module.exports = {

  //-------------middleware for jiraNewAccessToken function-----------

  jiraNewAccessTokenMiddleware() {
    return async function (req, res, next) {
      try {
        //---------------------------check jira token is expired or not------------------------
        let userId = req?.body?.user_info?.user_id;
        console.log(userId, 'swit ---- userId');

        let userData = await model.Jira.findOne({ where: { user_id: userId }, raw: true });

        if (!userData || !userData?.jira_token || !userData?.jira_refresh_token) {
          next();
        } else {

          const resHeaders = {
            "Authorization": "Bearer " + userData.jira_token
          }
          let resourceRes = await helper.getRequest(process.env.JIRA_ACCESS_RESOURCE_API, resHeaders);

          //----------------check unauthorized----------------
          if (resourceRes?.response?.data?.code === 401) {
            console.log('----------token expired----------');
            let tokenObj = await jiraHelper.jiraNewAccessToken(userData);
            if (tokenObj && tokenObj?.jira_token) {
              await model.Jira.update
                (
                  { jira_token: tokenObj.jira_token, jira_refresh_token: tokenObj.jira_refresh_token }
                  ,
                  {
                    where: { user_id: userId }
                  }
                );
            }
          } else {
            console.log('--jira token working fine--');
          }


          next();
        }
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to refresh JIRA token' });
      }
    }
  },

  // Function for refresh token of hubspot
  hubspotNewAccessTokenMiddleware() {
    return async function (req, res, next) {
      try {
        //---------------------------check hubspot token is expired or not------------------------
        let userId = req?.body?.user_info?.user_id;
        console.log(userId, 'swit ---- userId');

        let userData = await model.Hubspot.findOne({ where: { swit_user_id: userId }, raw: true });
        if (!userData || !userData.hubspot_token || !userData.hubspot_refresh_token) {
          next();
        } else {
          const resHeaders = {
            "Authorization": "Bearer " + userData.hubspot_token
          }
          let resourceRes = await helper.getRequest("https://api.hubapi.com/account-info/v3/details", resHeaders);
          console.log("resourceRes", resourceRes?.response)
          //----------------check unauthorized----------------
          if (resourceRes?.response?.status === 401 && resourceRes?.response?.statusText === "Unauthorized") {
            console.log('----------token expired----------');
            let tokenObj = await hubspotHelper.refreshToken(userData?.hubspot_refresh_token, userData);
            if (tokenObj) {
              await model.Hubspot.update
                (
                  { hubspot_token: tokenObj.access_token, hubspot_refresh_token: tokenObj.refresh_token }
                  ,
                  {
                    where: { swit_user_id: userId }
                  }
                );
            }
          } else {
            console.log('--Hubspot token working fine--');
          }
          next();
        }
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to refresh HUBSPOT token' });
      }
    }
  },

  confluenceNewAccessTokenMiddleware() {
    return async function (req, res, next) {
      try {
        //---------------------------check confluence token is expired or not------------------------
        let userId = req?.body?.user_info?.user_id;
        console.log(userId, 'swit ---- userId');

        let userData = await model.confluence.findOne({ where: { user_id: userId }, raw: true });

        if (!userData) {
          next();
        } else {

          const resHeaders = {
            "Authorization": "Bearer " + userData.confluence_token
          }
          let resourceRes = await helper.getRequest(process.env.CONFLUENCE_ACCESS_RESOURCE_API, resHeaders);

          //----------------check unauthorized----------------
          if (resourceRes?.response?.data?.code === 401) {
            console.log('----------token expired----------');
            let tokenObj = await confluenceHelper.confluenceNewAccessToken(userData);
            if (tokenObj && tokenObj?.confluence_token) {
              await model.confluence.update
                (
                  { confluence_token: tokenObj.confluence_token, confluence_refresh_token: tokenObj.confluence_refresh_token }
                  ,
                  {
                    where: { user_id: userId }
                  }
                );
            }
          } else {
            console.log('--confluence token working fine--');
          }
          next();
        }
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to refresh confluence token' });
      }
    }
  }
}