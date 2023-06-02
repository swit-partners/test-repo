const helper = require('../helpers/functions');
// ------below creds not working from local env file-------
const jiraClientId = "xBjrRgfBAJtVY0VK25EJERQThLOR1TSg";
const jiraClientSecret = "ATOAQTo1dlL-vJTh98Ks_VTOxjE-WUivNk6Vdr7Es4p3WMlA0Qh9wTZ1ZIhiPIGXILMA2951493F";
const jiraHelper = require('../helpers/jira');
const switHelper = require('../helpers/swit');
const shareIssueJson = require('../uijson/jira/share-issue.json');
const logoutJson = require('../uijson/jira/logout.json');
const warningJson = require('../uijson/jira/warning.json');
const JiraRightPanelLoginJson = require('../uijson/jira/rightpanel-login.json');

module.exports = function (model, config) {
    var module = {};

    module.setSwitToken = async function (req, res) {

        let responseToken = await switHelper.setSwitTokenUser(req.query.code, process.env.SWIT_AUTH_GRANT_TYPE, process.env.SWIT_CLIENT_ID, process.env.SWIT_CLIENT_SECRET, process.env.SWIT_REDIRECT_URI);
        if (!responseToken) { res.send({ status: 500, msg: "user code not found" }); }

        //-----------------handle if user data not fetched -------------------
        let userJson = await helper.parseJwt(responseToken);
        let switUser;
        switUser = userJson.sub;

        let switUserFind = await model.Jira.findOne({ where: { user_id: switUser } });
        if (!switUserFind) {
            //----------------------------create user or update with swit details----------------------------
            await model.Jira.create({
                user_id: switUser,
                swit_token: responseToken,
            });
        } else {
            switUserFind.update({
                swit_token: responseToken,
            });
        }
        req.session.user_id = switUser;
        res.render('jira/jira-auth', {
            auth: req.session,
            user_id: switUser
        });

    };

    module.setSwitUserAction = async (req, res) => {

        let switReq = req.body;
        let switUserId = switReq?.user_info?.user_id;
        console.log(switUserId, 'switUserId', switReq);

        let userData;
        if (switUserId) {
            userData = await model.Jira.findOne({ where: { 'user_id': switUserId }, raw: true });
        }

        //-----------------------------Check for user token & data----------------------------------------

        let userCheck = await switHelper.checkSwitUser(userData, switReq);
        if (userCheck) {
            console.log('---------------inside not logged in state-------------', userData);
            req.session.login_user_id = switUserId;
            // -----------login user & check for right panel----------
            res.send(userCheck);
            return;
        }

        //------------handle right panel outh complete--------------
        if (switReq?.user_action?.type == "view_actions.oauth_complete" && switReq?.current_view?.view_id == 'right_panel_list' ) {
            let issueListJsonTemp = await jiraHelper.setIssueRightPanel(userData, '', switReq);
            res.send(issueListJsonTemp);
            return;
        }

        if (switReq?.user_action?.type == "view_actions.oauth_complete") {
            res.send({ "callback_type": "views.close" });
            return;
        }

        

        //---------------------------------------------Connect--------------------------------------------

        if (switReq?.user_action?.id == "jira-issue-create" && switReq?.user_action?.slash_command == "/jira connect" ||
            switReq?.user_action?.type == 'user_commands.extensions:chat' && switReq?.user_action?.id == 'jira-connect'
        ) {
            let jiraCreateJsonUp2 = await jiraHelper.jiraSetProjectNChannel(userData);
            res.send(jiraCreateJsonUp2);
            if (switReq.context.channel_id) await model.Jira.update({ swit_channel: switReq.context.channel_id }, { where: { user_id: switUserId } });
            return;
        }

        if (switReq?.current_view?.view_id == 'jira_connect_form' && switReq?.user_action?.type == 'view_actions.submit') {

            //------------------set project n channel----------------------
            let formElements = switReq?.current_view?.body?.elements;
            let checkConnects = await jiraHelper.setupMutipleConnects(userData, formElements[1].value[0], formElements[3].value[0]);

            let updateObj = {
                jira_project: formElements[1].value[0]
            };
            let msgText;
            if (checkConnects) {
                updateObj.jira_connects = JSON.stringify(checkConnects);
                //-------------check if project webhook request is already registered-------------
                await jiraHelper.enableWebhook(userData, formElements[1].value[0]);
                await model.Jira.update(updateObj, { where: { user_id: switUserId } });
                msgText = 'Your Jira app has been enabled for receiving notifications....';
            } else {
                msgText = 'Selected project is already connected with this channel';
            }
            userData.swit_channel = formElements[3].value[0];
            await switHelper.sendMessageToSelectedChannel(userData, msgText);

            res.send({ "callback_type": "views.close" });
            return;
        }

        //------------------------------check for login request---------------------------------------------
        if (switReq?.user_action?.id == "jira-issue-create" && switReq?.user_action?.slash_command == "/jira login"
            || switReq?.user_action?.id == "jira-login"
        ) {
            warningJson.new_view.body.elements[0].content = 'You are already logged in to Jira App!'
            res.send(warningJson);
            return;
        }


        //--------------------------------Create & Submit-----------------------------------------------

        if (switReq?.user_action?.id == "jira-issue-create" && switReq?.user_action?.slash_command == "/jira create"
            || switReq?.user_action?.id == "create-jira-issue" && switReq.current_view.view_id == "right_panel_list"
            || switReq?.user_action?.id == "jira-create"
        ) {
            var jiraCreateJsonN = await jiraHelper.jiraSetProjectList(userData, 'task');
            jiraCreateJsonN.callback_type = "views.open";
            if (jiraCreateJsonN?.new_view?.body?.elements[1]?.value) {
                delete jiraCreateJsonN.new_view.body.elements[1].value;
            }
            res.send(jiraCreateJsonN);
            if (switReq.context.channel_id) await model.Jira.update({ swit_channel: switReq.context.channel_id }, { where: { user_id: switUserId } });
            return;
        }

        if (switReq?.current_view?.view_id == 'builder_test' && switReq?.user_action?.type == 'view_actions.submit'

        ) {
            let validateJson = await jiraHelper.jiraCreateIssueRequest(switReq.current_view.body.elements, userData);
            if (validateJson) {
                console.log('-----------in validation failed state-----------', validateJson.new_view.body.elements);
                res.send(validateJson);
                return;
            } else {
                res.send({ callback_type: "views.close" });
                return;
            }

        }
        //-------------set project data-------------
        if (switReq?.current_view?.view_id == 'builder_test' && switReq?.user_action?.type == 'view_actions.input') {
            let projectId = '';
            if (switReq?.current_view?.body?.elements[1]?.value) {
                projectId = switReq?.current_view?.body?.elements[1]?.value;
            }
            var jiraCreateJsonInput = await jiraHelper.jiraSetProjectList(userData, projectId);
            if (projectId && jiraCreateJsonInput?.new_view?.body?.elements[1]) {
                jiraCreateJsonInput.new_view.body.elements[1].value = projectId;
            }
            jiraCreateJsonInput.callback_type = "views.update";
            res.send(jiraCreateJsonInput);
            return
        }


        //------------------------------------Get issue details---------------------------------------------
        if (switReq?.user_action?.id == 'jira-issue-create' && switReq?.user_action?.slash_command?.includes("/jira details") ||
            switReq?.user_action?.slash_command?.includes("/jira-details") ||
            switReq?.user_action?.id?.includes("attachmentDetails")
        ) {
            let detailAction = 'detail_command';
            if (switReq?.user_action?.id?.includes("attachmentDetails")) {
                detailAction = switReq.user_action.id;
            }
            let issueDetailsJson = await jiraHelper.jiraGetIssueDetails(switReq.user_action.slash_command, userData, detailAction);
            if (issueDetailsJson) {
                res.send(issueDetailsJson);
                return;
            } else {
                warningJson.new_view.body.elements[0].content = 'Issue / Epic not found using provided Key, please try again...'
                res.send(warningJson);
                return;
            }

        }

        //-----------------------------------Set Right Panel------------------------------------------------

        if (switReq?.user_action?.type == "right_panel_open" ||
            switReq?.user_action?.id == "refresh-jira-list" && switReq?.user_action?.type == 'view_actions.submit'
            || switReq?.user_action?.type == "view_actions.oauth_complete" && switReq?.current_view?.view_id == "right_panel_list") {
            //------------get project list for now-------------
            let issueListJsonTemp = await jiraHelper.setIssueRightPanel(userData, '', switReq);
            res.send(issueListJsonTemp);
            return;
        }

        //--------------------------------------handle click from right panel----------------------------------

        if (switReq?.current_view?.view_id == "right_panel_list" && switReq?.user_action?.type == 'view_actions.submit' && switReq.user_action.id != 'logout-jira-app') {
            //------------get project list for now-------------
            let issueDetailsJson = await jiraHelper.jiraGetIssueDetails(switReq.user_action.id, userData, 'right_panel_list');
            if (issueDetailsJson) {
                res.send(issueDetailsJson);
                return;
            } else {
                warningJson.new_view.body.elements[0].content = 'Issue / Epic not found using provided Key, please try again...'
                res.send(warningJson);
                return;
            }
        }


        if (switReq?.user_action?.type == "view_actions.drop") {
            if (switReq?.current_view?.body) {
                let shareJsonProcessed = await jiraHelper.setDropAttachmentData(switReq, userData);
                res.send(shareJsonProcessed);
                return;
            } else {
                res.send(shareIssueJson);
                return;
            }
        }

        //---------------------------Handle right menu options-------------------------------------

        if (switReq?.user_action?.type == 'view_actions.input' && switReq?.current_view?.view_id == 'right_panel_list'
        ) {
            let updatedRes = await jiraHelper.handleRightPanelOptions(switReq, userData);
            res.send(updatedRes);
            return;
        }

        //---------------------------------------Logout---------------------------------------------

        if (switReq?.user_action?.id == "jira-issue-create" && switReq?.user_action?.slash_command == "/jira logout"

            || switReq?.user_action?.id == "jira-logout") {

            if (req.body?.current_view?.view_id == "jira-logout-open" && req.body?.user_action?.id == "No") {
                res.send({ callback_type: "views.close" });
                return;
            } else {
                res.send(logoutJson);
                if (switReq.context.channel_id) await model.Jira.update({ swit_channel: switReq.context.channel_id }, { where: { user_id: switUserId } });
                return;
            }

        }

        if (switReq?.current_view?.view_id == 'jira-logout-open' && switReq?.user_action?.type == 'view_actions.submit'
            || switReq?.user_action?.id == 'logout-jira-app' && switReq?.current_view?.view_id == 'right_panel_list'
        ) {
            if (userData && userData?.user_id) {
                await model.Jira.destroy({
                    where: {
                        user_id: userData.user_id
                    }
                })
            }
            //send channel message
            await switHelper.sendMessageToSelectedChannel(userData, 'You have been logged out from Jira successfully!');
            if (switReq?.current_view?.view_id == 'right_panel_list') {
                res.send(JiraRightPanelLoginJson);
            } else {
                res.send({ "callback_type": "views.close" });
            }

            return;
        }

        if (switReq?.user_action?.id == "jira-issue-create" && switReq?.user_action?.slash_command.includes('jira notify')) {
            if (switReq?.user_action?.slash_command == '/jira notify off') {
                await model.Jira.update({ jira_notification: 0 }, { where: { user_id: switUserId } });
            } else {
                await model.Jira.update({ jira_notification: 1 }, { where: { user_id: switUserId } });
            }
            warningJson.new_view.body.elements[0].content = 'Jira notification status has been updated successfully!'
            res.send(warningJson);
            return;
        }

        //----------------------------check if command not present-----------------------------

        warningJson.new_view.body.elements[0].content = 'Jira app command not found!'
        res.send(warningJson);

    };

    module.jiraAuth = async function (req, res) {
        let jiraAuthCode = req.query.code;
        if (!jiraAuthCode) {
            //message
            res.render('jira/jira-error', {
                message: 'Jira authorization not completed, please try again! (error - no user code)'
            });
            return;
        }

        //----------------get token using jira token api---------------------------
        let dataToken = {
            "grant_type": "authorization_code",
            "client_id": jiraClientId,
            "client_secret": jiraClientSecret,
            "code": jiraAuthCode,
            "redirect_uri": process.env.JIRA_REDIRECT_URI
        }
        const headers = {
            "Content-Type": "application/json"
        }
        let tokenRes = await helper.postRequest(process.env.JIRA_TOKEN_API, dataToken, headers);

        //-------------set user loud Id to Db---------------------

        if (tokenRes?.data?.access_token && tokenRes?.data?.refresh_token) {

            let userData = await model.Jira.findOne({ where: { 'user_id': req.query.state }, raw: true });
            if (userData) {

                //----------------------set user domain if required----------------------

                const resHeaders = {
                    "Authorization": "Bearer " + tokenRes.data.access_token
                }
                let resourceRes = await helper.getRequest(process.env.JIRA_ACCESS_RESOURCE_API, resHeaders);

                //-----------------------get jira user id---------------------------------

                let jiraUser = await jiraHelper.getUserDetails(tokenRes.data.access_token, resourceRes.data[0].id);

                let inputSaveData;
                if (resourceRes?.data[0]?.url && resourceRes?.data[0]?.id) {
                    inputSaveData = {
                        jira_token: tokenRes.data.access_token,
                        jira_refresh_token: tokenRes.data.refresh_token,
                        jira_domain: resourceRes.data[0].url,
                        jira_cloud_id: resourceRes.data[0].id,
                        jira_user_id: jiraUser.accountId
                    }
                } else {
                    inputSaveData = {
                        jira_token: tokenRes.data.access_token,
                        jira_refresh_token: tokenRes.data.refresh_token
                    };
                }

                //------------------------------------------------------------------------

                await model.Jira.update(inputSaveData, { where: { user_id: req.query.state } });

                res.render('jira/jira-auth-success.html');
            } else {

            }

        } else {
            res.send({ status: 501, msg: "jira auth token api error" })
        }
    };

    //------------use in connect for recieving notifications---------------
    module.jiraWebhook = async function (req, res) {

        let webhookReq = req.body
        let userData = await model.Jira.findOne({ where: { 'jira_user_id': webhookReq?.user?.accountId }, raw: true });
        let textInfo;
        let issuePath = '';
        if (webhookReq.issue_event_type_name == 'issue_created') {
            textInfo = "Jira | New task has been created by " + "@" + webhookReq?.user?.displayName + ", " + webhookReq?.issue?.fields?.summary + ' ';
        }
        else if (webhookReq.issue_event_type_name == 'issue_updated') {
            textInfo = "Jira | Task has been updated by " + "@" + webhookReq?.user?.displayName + ', ' + webhookReq?.issue?.fields?.summary + ' ';
        }

        if (userData.jira_domain && webhookReq?.issue?.key) {
            issuePath = userData.jira_domain + '/browse/' + webhookReq?.issue?.key;
        }

        //---------------check channel & send notification on multiple or single selected channel-----------
        if (webhookReq?.issue?.fields?.project && userData.jira_connects) {
            let projectId = webhookReq.issue.fields.project.id;
            let projectName = webhookReq.issue.fields.project.name;

            //-------get user channel selections-------
            let parsedConnects = JSON.parse(userData.jira_connects);
            var filteredChannels = parsedConnects.filter(function (connect) {
                return connect.project_id == projectId;
            });

            filteredChannels.forEach(async (connect, index) => {
                //------------add condition if attachment is shared to channel no need to send notification in same channel
                if (connect.swit_channel && userData.swit_channel != connect.swit_channel) {
                    //let msgRes = await switHelper.sendMessageWithChannelId(userData, connect.swit_channel, textInfo);
                    let msgRes = await switHelper.sendSwitMessageRichTextMethod(userData, connect.swit_channel, textInfo, issuePath, webhookReq?.issue?.key);
                }
            });

        }

        res.send({ status: 200, msg: "webhook data received" });
    }


    return module;
}

