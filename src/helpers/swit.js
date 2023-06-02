const helper = require("../helpers/functions");
const jiraLoginJson = require("../uijson/jira/jira-login.json");
const hubspotLoginJson = require("../uijson/hubspot/hubspot-login.json");
const hubspotRightPanelLoginJson = require("../uijson/hubspot/right-panel-login.json");
var FormData = require("form-data");
const confluenceLoginJson = require('../uijson/confluence/login.json');
const confluenceRightPanelLoginJson = require('../uijson/confluence/rightPanelLogin.json');
const JiraRightPanelLoginJson = require('../uijson/jira/rightpanel-login.json');
module.exports = {

  async setSwitTokenUser(code, authType, cId, cSecret, redirectUri) {

    let userCode = code;
    if (!userCode) { return null; }

    console.log(authType, cId, cSecret, redirectUri)

    console.log('usercode', userCode);

    var bodyFormData = new FormData();
    bodyFormData.append('grant_type', authType);
    bodyFormData.append('client_id', cId);
    bodyFormData.append('client_secret', cSecret);
    bodyFormData.append('redirect_uri', redirectUri);
    bodyFormData.append('code', userCode);

    //----------------generate token using code-------------------------

    let response = await helper.postRequest('https://openapi.swit.io/oauth/token', bodyFormData);
    console.log(response, 'response data----------bodyFormData', bodyFormData);
    if (response?.data?.access_token) {
      let responseToken = response.data.access_token
      console.log(responseToken, 'response data token----------');
      return responseToken;
    } else {
      return null;
    }

  },

  async checkSwitUser(userData, switReq) {

    if (userData?.swit_token && userData?.jira_token) {
      return null;
    } else {
      if (switReq?.user_action?.type == "right_panel_open" || switReq?.current_view?.view_id == "right_panel_list") {
        return JiraRightPanelLoginJson;
      } else {
        return jiraLoginJson;
      }

    }

  },

  async checkConfluenceSwitUser(userData, reqType) {
    if (userData?.swit_token) {
      return null;
    } else {
      if (reqType.includes("right_panel")) {
        return confluenceRightPanelLoginJson;
      } else {
        return confluenceLoginJson;
      }
    }
  },

  async getWorkspaceList(userData) {

    let headersSwit = {
      Authorization: 'Bearer ' + userData?.swit_token,
      'Content-Type': 'application/json'
    }

    let responseWorkspaceList = await helper.getRequest("https://openapi.swit.io/v1/api/workspace.list", headersSwit);

    if (responseWorkspaceList?.data) {
      return responseWorkspaceList?.data;
    } else {
      return null;
    }

  },

  async getChannelList(userData, wId) {

    let headersSwit = {
      Authorization: 'Bearer ' + userData?.swit_token,
      'Content-Type': 'application/json'
    }

    let responseChannelList = await helper.getRequest("https://openapi.swit.io/v1/api/channel.list?workspace_id=" + wId, headersSwit);

    if (responseChannelList?.data) {
      return responseChannelList?.data;
    } else {
      return null;
    }

  },

  async sendMessageToSelectedChannel(userData, text) {
    console.log(userData.swit_channel, 'sending message to this channel id');
    const headers = {
      Authorization: 'Bearer ' + userData.swit_token
    }

    let data = {
      channel_id: userData.swit_channel,
      content: text
    }

    let resSendMsg = await helper.postRequest('https://openapi.swit.io/v1/api/' + 'message.create', data, headers);

    if (resSendMsg?.data) {
      return resSendMsg?.data;
    } else {
      console.log(resSendMsg, 'resSendMsg------------');
      return null;
    }
  },

  async sendMessageWithChannelId(userData, channelId, text) {
    const headers = {
      Authorization: 'Bearer ' + userData.swit_token
    }

    let data = {
      channel_id: channelId,
      content: text
    }

    let resSendMsg = await helper.postRequest('https://openapi.swit.io/v1/api/' + 'message.create', data, headers);

    if (resSendMsg?.data) {
      return resSendMsg?.data;
    } else {
      console.log(resSendMsg, 'resSendMsg------------');
      return null;
    }
  },

  async sendSwitMessageRichTextMethod(userData, channelId, text, link, keyId) {
    const headers = {
      Authorization: 'Bearer ' + userData.swit_token
    }

    let sendContent = {
      "type": "rich_text",
      "elements": [
        {
          "type": "rt_section",
          "elements": [
            {
              "type": "rt_text",
              "content": text
            },
            {
              "type": "rt_link",
              "content": keyId,
              "url": link
            }
          ]
        }
      ]
    }

    let data = {
      "channel_id": channelId,
      "body_type": "json_string",
      "content": JSON.stringify(sendContent)
    }

    let resSendMsg = await helper.postRequest('https://openapi.swit.io/v1/api/' + 'message.create', data, headers);

    if (resSendMsg?.data) {
      return resSendMsg?.data;
    } else {
      console.log(resSendMsg, 'resSendMsg------------');
      return null;
    }
  },

  async sendSwitAttachmentMessage(msg, attachment, switToken, channel_id) {
    const headers = {
      Authorization: `Bearer ${switToken}`,
    };

    let data = {
      attachments: [
        {
          attachment_type: "custom",
          values: attachment,
        },
      ],
      channel_id: channel_id,
      content: msg,
    };

    let response = await helper.postRequest("https://openapi.swit.io/v1/api/message.create", data, headers);
    console.log(response, 'response');

  },

  async checkSwitUserForHubSpot(req, userData) {
    if (userData?.swit_token && userData?.hubspot_token) {
      return null;
    } else {
      if (req.body?.user_action.type.includes("right_panel") || req.body.current_view?.view_id == "login_right_side") {
        return hubspotRightPanelLoginJson;
      } else {
        return hubspotLoginJson;
      }
    }
  }
};
