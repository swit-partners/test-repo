const helper = require('../helpers/functions');
const jiraCreateJson = require('../uijson/jira/create-issue.json');
const jiraEpicJson = require('../uijson/jira/create-epic.json');
const jiraConnectJson = require('../uijson/jira/connect.json');
const jiraDetailJson = require('../uijson/jira/details.json');
const jiraIssueListJson = require('../uijson/jira/issue-list.json');
const shareIssueJson = require('../uijson/jira/share-issue.json');
const shareAttachmentJson = require('../uijson/jira/share-attachment.json');
const switHelper = require('../helpers/swit');

const jiraClientId = "xBjrRgfBAJtVY0VK25EJERQThLOR1TSg";
const jiraClientSecret = "ATOAQTo1dlL-vJTh98Ks_VTOxjE-WUivNk6Vdr7Es4p3WMlA0Qh9wTZ1ZIhiPIGXILMA2951493F";
const JIRA_API_PREFIX = "https://api.atlassian.com/ex/jira/";

module.exports = {


    async jiraCreateIssueRequest(reqFormData, userData) {
        //console.log(reqFormData, 'reqFormData-------------------------------');
        var objectIds = ["text_input", "select", "datepicker", "textarea"];

        var filteredInputs = reqFormData.filter(function (itm) {
            return objectIds.indexOf(itm.type) > -1;
        });

        console.log(filteredInputs, 'filteredInputs');

        let jiraCreateObject = {
            project: "",
            issue_type: "",
            summary: "",
            description: "",
            assignee: "",
            labels: "",
            duedate: "",
            startdate: ""

        }

        filteredInputs.forEach((element, index) => {
            console.log(element, 'element----------------------s');

            if (element?.value) {
                let keyName = Object.keys(jiraCreateObject)[index];
                console.log(keyName, 'keyName ----------------', element.value);
                jiraCreateObject[keyName] = element.value;
            }

        });

        //-------------handle data validation as currently not supported from frontend UI---------------
        let jiraCreateJsonUp;
        if (!jiraCreateObject.project || !jiraCreateObject.issue_type || !jiraCreateObject.summary) {
            jiraCreateJsonUp = await this.jiraSetProjectList(userData, '');
            let warningString = "**Please fill up mandatory fields and try again!**";
            if (jiraCreateJsonUp.new_view.body.elements[0]?.content != warningString) {
                jiraCreateJsonUp.new_view.header.subtitle = "**Please fill up mandatory fields and try again!**";
            }
            jiraCreateJsonUp.callback_type = "views.update";
            return jiraCreateJsonUp;
        }

        let createIssueData = {
            "fields": {
                "assignee": {
                    "id": jiraCreateObject.assignee[0] ?? null
                },
                "description": {
                    "content": [
                        {
                            "content": [
                                {
                                    "text": jiraCreateObject.description,
                                    "type": "text"
                                }
                            ],
                            "type": "paragraph"
                        }
                    ],
                    "type": "doc",
                    "version": 1
                },

                "issuetype": {
                    "id": jiraCreateObject?.issue_type[0] ?? null
                },
                "labels": jiraCreateObject.labels,

                "project": {
                    "id": jiraCreateObject?.project[0] ?? null
                },

                "summary": jiraCreateObject.summary,
                "duedate": jiraCreateObject.duedate,
                //  "startdate":jiraCreateObject.startdate
            },
            "update": {}
        }
        console.log(userData, 'userData', createIssueData);

        if (!jiraCreateObject.assignee) {
            delete createIssueData.fields.assignee;
        }

        if (!jiraCreateObject.description) {
            delete createIssueData.fields.description;
        }

        if (!jiraCreateObject.labels) {
            delete createIssueData.fields.labels;
        }

        if (!jiraCreateObject.duedate) {
            delete createIssueData.fields.duedate;
        } else {
            createIssueData.duedate = jiraCreateObject.duedate.split('T')[0];
        }

        console.log(createIssueData, 'createIssueData to create issue');

        //-----replace it with userData.jira_token once token issue resolved------
        let headers = {
            Authorization: 'Bearer ' + userData.jira_token,
            'Content-Type': 'application/json'
        }
        let issuePostAPI = JIRA_API_PREFIX + userData.jira_cloud_id + "/rest/api/3/issue";

        let response = await helper.postRequest(issuePostAPI, createIssueData, headers);
        //console.log(response.response, 'response------');
        //---------handle api error-------------
        if (response?.response?.data?.errors) {
            console.log(response?.response?.data?.errors, 'response------');
            let errorObj = response?.response?.data?.errors
            let jiraCreateJsonUp = await this.jiraSetProjectList(userData, '');
            let createJsonRef = jiraCreateJsonUp;
            let errorString = 'Jira error(s) : ';
            for (var prop in errorObj) {
                if (Object.prototype.hasOwnProperty.call(errorObj, prop)) {
                    console.log(errorObj, '------prop objects', prop);
                    if (errorObj[prop]) errorString = errorString + ' ' + errorObj[prop];
                }
            }

            createJsonRef.new_view.header.subtitle = "**" + errorString + "**";
            createJsonRef.callback_type = "views.update";
            return createJsonRef;
        } else {
            this.sendInfoAttachment(userData, response, jiraCreateObject);
            // console.log(response, '----response from create api----');
        }

        return null;


    },

    async sendInfoAttachment(userData, response, createObj) {
        //console.log(response, 'response------------created');
        //--------get more details using keyId to show in attachment, no details found in response to fulfill card details-------
        let keyId;
        if (response?.data) {
            keyId = response.data.key;
        } else {
            return;
        }
        let issueDetails = await this.jiraGetIssueDetailsBasic(userData, keyId);
        console.log(issueDetails, 'issueDetails');

        let attachmentContent = [
            {
                label: "Assignee",
                text: {
                    type: "text",
                    markdown: false,
                    content: issueDetails?.assignee?.displayName ?? 'NA',
                },
            },
            {
                label: "Priority",
                text: {
                    type: "text",
                    markdown: false,
                    content: issueDetails?.priority?.name ?? 'NA',
                },
            },
            {
                label: "Status",
                text: {
                    type: "text",
                    markdown: false,
                    content: issueDetails?.status?.name ?? 'NA',
                },
            },
        ];
        let attachData = [{
            type: "info_card",
            draggable: false,
            items: attachmentContent,
        }];

        shareAttachmentJson.attachments[0].header.title = createObj.summary;
        shareAttachmentJson.attachments[0].header.subtitle = issueDetails?.project?.name + ' | ' + keyId + ' | ' + issueDetails?.issuetype?.name ?? 'Task';
        shareAttachmentJson.attachments[0].body.elements = attachData;
        shareAttachmentJson.attachments[0].footer.buttons[0].action_id = "attachmentDetails=" + keyId;
        console.log(shareAttachmentJson.attachments, 'working for sending attachment---------------------');

        switHelper.sendSwitAttachmentMessage('New issue added', shareAttachmentJson.attachments, userData.swit_token, userData.swit_channel);

    },

    //--------------generate new access token-----------------

    async jiraNewAccessToken(userData) {
        let headers = { 'Content-Type': 'application/json' };
        let data = {
            "grant_type": "refresh_token",
            "client_id": jiraClientId,
            "client_secret": jiraClientSecret,
            "refresh_token": userData.jira_refresh_token
        }
        console.log(data, 'data refersh token api');
        let response = await helper.postRequest(process.env.JIRA_TOKEN_API, data, headers);
        console.log(response, 'response');
        if (response?.data?.access_token && response?.data?.refresh_token) {
            return {
                jira_token: response.data.access_token,
                jira_refresh_token: response.data.refresh_token
            }
        } else {
            return null;
        }

    },


    //--------------get all project list--------------------

    async jiraSetProjectList(userData, projectId) {


        let headers = {
            Authorization: 'Bearer ' + userData.jira_token,
            'Content-Type': 'application/json'
        }

        let response = await this.getProjectList(userData);
        let jiraCreateJsonVar = {};
        jiraCreateJsonVar = jiraCreateJson;

        if (response?.values) {
            let resData = response?.values;
            let options = [];
            resData.forEach((element, index) => {
                options.push(
                    {
                        "label": element.name,
                        "action_id": element.id
                    },
                );
            });
            jiraCreateJsonVar.new_view.body.elements[1].options = options;
        }

        //-------------now set issue types---------------------------------------
        let issueTypeAPI;
        if (projectId) {
            issueTypeAPI = JIRA_API_PREFIX + userData.jira_cloud_id + "/rest/api/3/issuetype/project?projectId=" + projectId;
        } else {
            issueTypeAPI = JIRA_API_PREFIX + userData.jira_cloud_id + "/rest/api/3/issuetype";
        }

        let responseIssueType = await helper.getRequest(issueTypeAPI, headers);
        // console.log(responseIssueType, 'response------ issue type, --------  auth--' + auth);
        if (responseIssueType?.data) {
            //console.log(responseIssueType?.data, 'responseIssueType?.data');
            let resDataType = responseIssueType.data;
            let optionsTypes = [];
            // let epicTypeAdded = false;
            //------remove duplicate data--------
            let uniqueTaskType = resDataType.filter((obj, index) => {
                return index === resDataType.findIndex(o => obj.name === o.name);
            });
            uniqueTaskType.forEach((element, index) => {
                if (element.name == 'Task' || element.name == 'Epic') {
                    // if (element.name == 'Epic') { epicTypeAdded = true; }
                    optionsTypes.push(
                        {
                            "label": element.name,
                            "action_id": element.id
                        },
                    );
                }
            });

            jiraCreateJsonVar.new_view.body.elements[3].options = optionsTypes;
        }

        //----------add assignee api-----------------------------
        let usersList = JIRA_API_PREFIX + userData.jira_cloud_id + "/rest/api/3/users/search";



        let responseAssginee = await helper.getRequest(usersList, headers);

        if (responseAssginee?.data) {
            let atlassianUsers = responseAssginee.data;
            //------------get only atlassian users---------------
            atlassianUsers = atlassianUsers.filter((obj, index) => {
                return obj.accountType == "atlassian";
            });

            let resDataAssignee = atlassianUsers;
            let optionsAssignee = [];
            resDataAssignee.forEach((element, index) => {
                //console.log(element, 'element for assignee-----');
                optionsAssignee.push(
                    {
                        "label": element.displayName,
                        "action_id": element.accountId
                    },
                );
            });
            jiraCreateJsonVar.new_view.body.elements[9].options = optionsAssignee;
        }

        //--------set labels------------------------------------
        let responseLabels = await this.getJiraLabels(userData);
        if (responseLabels) {
            let labels = [];
            responseLabels.values.forEach((element, index) => {
                labels.push(
                    {
                        "label": element,
                        "action_id": element
                    },
                );
            });
            jiraCreateJsonVar.new_view.body.elements[11].options = labels;
        }

        if (userData?.jira_domain) jiraCreateJsonVar.new_view.header.buttons[0].static_action.link_url = userData.jira_domain + '/jira/projects/' ?? ''
        jiraCreateJsonVar.new_view.header.subtitle = "Required fields *";

        return jiraCreateJsonVar;

    },


    //--------------------------------------------------------------------------------------------------

    async jiraSetProjectNChannel(userData) {


        let response = await this.getProjectList(userData);
        let optionsProjects = [];
        if (!response?.values) { response = await this.getProjectList(userData); }
        //---------------updating options with user project listing---------------------
        if (response?.values) {
            let resData = response?.values;
            //let options = [];
            resData.forEach((element, index) => {
                optionsProjects.push(
                    {
                        "label": element.name,
                        "action_id": element.id
                    },
                );
            });
            jiraConnectJson.new_view.body.elements[1].options = optionsProjects;
        }

        //-------------now set channels types---------------------------------------
        let repWorkspaceList = await switHelper.getWorkspaceList(userData);
        //console.log(repWorkspaceList, 'repWorkspaceList------------------------', repWorkspaceList?.data?.workspaces[0]?.id);

        let workspaceId;
        if (repWorkspaceList?.data?.workspaces[0]?.id) {
            workspaceId = repWorkspaceList.data.workspaces[0].id;
        }


        if (workspaceId) {
            let responseChannelList = await switHelper.getChannelList(userData, workspaceId);
            //console.log(responseChannelList, 'responseChannelList------------------------', responseChannelList.data.channels);

            //---------------------------------set channels------------------------------
            let channelsOpt = [];
            responseChannelList.data.channels.forEach((element, index) => {
                channelsOpt.push(
                    {
                        "label": element.name,
                        "action_id": element.id
                    },
                );
            });
            jiraConnectJson.new_view.body.elements[3].options = channelsOpt;
            if (userData?.jira_domain) jiraConnectJson.new_view.header.buttons[0].static_action.link_url = userData.jira_domain + '/jira/projects/' ?? ''
        }


        return jiraConnectJson;

    },


    async getProjectList(userData) {

        let projectListAPI = JIRA_API_PREFIX + userData.jira_cloud_id + "/rest/api/3/project/search";

        let headers = {
            Authorization: 'Bearer ' + userData.jira_token,
            'Content-Type': 'application/json'
        }

        let responseProjectList = await helper.getRequest(projectListAPI, headers);

        if (responseProjectList?.data) {
            return responseProjectList?.data;
        } else {
            return null;
        }

    },

    async getIssueList(userData, params) {

        let issueListAPI = JIRA_API_PREFIX + userData.jira_cloud_id + "/rest/api/3/search";
        console.log('appending params------->', params);
        //?jql=status="In+Progress"&fields=id,key,status
        if (params) {
            issueListAPI = issueListAPI + "?jql=" + params;
        }

        console.log(issueListAPI.length, '--------------issueListAPI------------');

        let headers = {
            Authorization: 'Bearer ' + userData.jira_token,
            'Content-Type': 'application/json'
        }

        let responseIssueList = await helper.getRequest(issueListAPI, headers);
        // console.log(responseIssueList, 'responseIssueList');
        if (responseIssueList?.data) {
            return responseIssueList?.data;
        } else {
            console.log(responseIssueList, 'responseIssueList');
            return null;
        }

    },

    async getIssueListFiltered(userData, params) {
        //fields=id,key,status,summary,description,assignee,priority

        let issueListAPI = JIRA_API_PREFIX + userData.jira_cloud_id + "/rest/api/3/search";
        //console.log('appending params------->', params);
        //?jql=status="In+Progress"&fields=id,key,status
        if (params) {
            issueListAPI = issueListAPI + "?jql=" + params;
        }
        if (params) {
            params = params + '&startAt=0&maxResults=50';
        }
        // else {
        //     params = '?startAt=0&maxResults=50';
        // }
        else {
            issueListAPI = JIRA_API_PREFIX + userData.jira_cloud_id + "/rest/api/latest/search?jql=watcher+=+currentUser()&maxResults=50&startAt=0";
        }


        console.log(issueListAPI, '--------------issueListAPI path------------');

        let headers = {
            Authorization: 'Bearer ' + userData.jira_token,
            'Content-Type': 'application/json'
        }

        //?fields=id,key,status,summary,description,assignee,priority
        //&maxResults=1000

        let responseIssueList = await helper.getRequest(issueListAPI, headers);
        // console.log(responseIssueList, 'responseIssueList');
        if (responseIssueList?.data) {
            return responseIssueList?.data;
        } else {
            console.log(responseIssueList, 'responseIssueList');
            return null;
        }
    },

    async getIssueStatusList(userData) {

        let issueStatusListAPI = JIRA_API_PREFIX + userData.jira_cloud_id + "/rest/api/3/status";

        let headers = {
            Authorization: 'Bearer ' + userData.jira_token,
            'Content-Type': 'application/json'
        }

        let responseIssueList = await helper.getRequest(issueStatusListAPI, headers);
        if (responseIssueList?.data) {
            return responseIssueList?.data;
        } else {
            console.log(responseIssueList, 'responseIssueList');
            return null;
        }

    },

    async getIssuePriorityList(userData) {

        let issuePriorityListAPI = JIRA_API_PREFIX + userData.jira_cloud_id + "/rest/api/3/priority";

        let headers = {
            Authorization: 'Bearer ' + userData.jira_token,
            'Content-Type': 'application/json'
        }

        let responsePriorityList = await helper.getRequest(issuePriorityListAPI, headers);
        if (responsePriorityList?.data) {
            return responsePriorityList?.data;
        } else {
            console.log(responsePriorityList, 'responsePriorityList');
            return null;
        }

    },


    async setIssueRightPanel(userData, params, switReq) {
        let jiraListRenderJson = {};
        jiraListRenderJson = jiraIssueListJson;
        console.log(jiraListRenderJson?.new_view?.body?.elements, '------------jiraListRenderJson------------first');
        //--------------------------Set Project List--------------------------
        let projectListRes = await this.getProjectList(userData);

        if (projectListRes?.values) {
            let resData = projectListRes?.values;
            let options1 = [];
            resData.forEach((element, index) => {
                options1.push(
                    {
                        "label": element.name,
                        "action_id": element.name,
                    },
                );
            });
            jiraListRenderJson.new_view.body.elements[0].options = options1;
        }


        //-----------------set issue status--------------------------------------

        let statusListRes = await this.getIssueStatusList(userData);

        if (statusListRes) {
            let resData = statusListRes;
            //-----------filter duplicate names-------------
            let uniqueStatusList = resData.filter((obj, index) => {
                return index === resData.findIndex(o => obj.name === o.name);
            });

            let options2 = [];
            uniqueStatusList.forEach((element, index) => {
                options2.push(
                    {
                        "label": element.name,
                        "action_id": element.name,
                    },
                );
            });
            //--------------select inside container-----------------
            let containerPanel = jiraListRenderJson.new_view.body.elements[1];

            containerPanel.elements[0].options = options2;
        }

        //-----------------------------set priority----------------------------

        let priorityListRes = await this.getIssuePriorityList(userData);

        if (priorityListRes) {
            let resData2 = priorityListRes;

            let uniquePriorityList = resData2.filter((obj, index) => {
                return index === resData2.findIndex(o => obj.name === o.name);
            });

            let options2 = [];
            uniquePriorityList.forEach((element, index) => {
                options2.push(
                    {
                        "label": element.name,
                        "action_id": element.name
                    },
                );
            });
            //--------------select inside container-----------------
            let containerPanel = jiraListRenderJson.new_view.body.elements[1];
            console.log(containerPanel, 'containerPanel');

            containerPanel.elements[1].options = options2;
        }


        //--------------------------Set issue list-----------------------------
        let noData = {
            "type": "list_item",
            "action_id": 'NA',
            "title": 'No issue found for your request',
            "subtitle": 'Please check jira app for more details',
            "icon": {
                "type": "image",
                "image_url": "https://swtio-bck-dev.dvconsulting.org/assets/image/jira-icon.png",
                "shape": "circular"
            },
            "draggable": false
        }
        console.log(switReq?.current_view?.body?.elements[0].value, '-------project selection------');
        //--------reset list without fetching issues--------
        if (switReq?.user_action?.id == "refresh-jira-list" ||
            !switReq?.current_view?.body?.elements[0].value || switReq?.user_action?.type == "right_panel_open") {
            //----------------remove selected values-----------------
            if (jiraListRenderJson.new_view.body.elements[0]?.value) {
                delete jiraListRenderJson.new_view.body.elements[0].value;
            }
            if (jiraListRenderJson.new_view.body.elements[1]?.elements[0]?.value) {
                delete jiraListRenderJson.new_view.body.elements[1].elements[0].value
            }
            if (jiraListRenderJson.new_view.body.elements[1]?.elements[1]?.value) {
                delete jiraListRenderJson.new_view.body.elements[1].elements[1].value;
            }
        }

        let issueListRes = null;
        issueListRes = await this.getIssueListFiltered(userData, params);
        if (issueListRes) {
            let issueListTemp = issueListRes.issues;

            let refreshElements = [];
            let tempElementsRef = jiraListRenderJson.new_view.body.elements;
            refreshElements.push(tempElementsRef[0]);
            refreshElements.push(tempElementsRef[1]);
            refreshElements.push(tempElementsRef[2]);

            jiraListRenderJson.new_view.body.elements = refreshElements;

            if (!issueListTemp || issueListTemp.length == 0) {
                jiraListRenderJson.new_view.body.elements.push(noData);
            } else {

                issueListTemp.forEach((issue, index) => {
                    let subtitle = '';
                    if (issue?.fields?.assignee?.displayName) {
                        subtitle = issue.key + ' | ' + issue?.fields?.status?.name + ' | ' + issue?.fields?.priority?.name + ' | ' + issue?.fields?.issuetype?.name + ' | ' + issue?.fields?.assignee?.displayName ?? 'NA';
                    } else {
                        subtitle = issue.key + ' | ' + issue?.fields?.status?.name + ' | ' + issue?.fields?.priority?.name + ' | ' + issue?.fields?.issuetype?.name;
                    }

                    jiraListRenderJson.new_view.body.elements.push({
                        "type": "list_item",
                        "action_id": issue.key,
                        "title": issue?.fields?.summary ?? '',
                        "subtitle": subtitle,
                        "snippet": issue?.fields?.project?.name ?? 'NA',
                        "icon": {
                            "type": "image",
                            "image_url": "https://swtio-bck-dev.dvconsulting.org/assets/image/jira-icon.png",
                            "shape": "circular"
                        },
                        "draggable": true

                    });

                });
            }

        }
        else {
            jiraListRenderJson.new_view.body.elements.push(noData);
        }
        //-------------set values selected from right panel-------------
        let projectVal = '';
        let statusVal = '';
        let priorityVal = '';


        if (switReq?.current_view?.body?.elements && switReq?.user_action?.type == 'view_actions.input') {
            let switReqElements = switReq?.current_view?.body?.elements;
            console.log(switReq, 'switReq?.current_view?.body sadfsdafsdf');
            if (switReqElements[0]?.value) {
                projectVal = switReqElements[0].value;
                jiraListRenderJson.new_view.body.elements[0].value = projectVal;
            }
            if (switReqElements[1]?.elements[0]?.value) {
                statusVal = switReqElements[1]?.elements[0]?.value;
                jiraListRenderJson.new_view.body.elements[1].elements[0].value = statusVal;
            }
            if (switReqElements[1]?.elements[1]?.value) {
                priorityVal = switReqElements[1]?.elements[1]?.value;
                jiraListRenderJson.new_view.body.elements[1].elements[1].value = priorityVal;
            }
            console.log(switReqElements[0]?.value, switReqElements[1]?.elements[0]?.value, switReqElements[1]?.elements[1]?.value, 'swit search values');
        }

        return jiraListRenderJson;
    },

    async jiraGetIssueDetailsBasic(userData, issueKey) {

        let getJiraIssueAPI = JIRA_API_PREFIX + userData.jira_cloud_id + "/rest/api/3/issue/" + issueKey;

        let headers = {
            Authorization: 'Bearer ' + userData.jira_token,
            'Content-Type': 'application/json'
        }

        let response = await helper.getRequest(getJiraIssueAPI, headers);
        if (response?.data?.fields) {
            let resIssueDetail = response.data.fields;
            return resIssueDetail
        } else {
            return null;
        }
    },


    async jiraGetIssueDetails(fullCommand, userData, featureType) {

        let issueKeyOrId;
        if (featureType == 'right_panel_list') {
            issueKeyOrId = fullCommand;
        }
        else if (featureType.includes('attachmentDetails')) {
            console.log(featureType, 'featureType');
            issueKeyOrId = featureType.split('=')[1];
        }
        else {
            //-----handle command condition-----
            if (fullCommand.includes('/jira-details')) {
                issueKeyOrId = fullCommand.split(' ')[1].trim();
                console.log(issueKeyOrId, 'issueKeyOrId isssue key when click ommand is used-----------');
            } else {
                issueKeyOrId = fullCommand.split('details')[1].trim();
            }
        }
        console.log('final issue key', issueKeyOrId);

        let getJiraIssueAPI = JIRA_API_PREFIX + userData.jira_cloud_id + "/rest/api/3/issue/" + issueKeyOrId;

        let headers = {
            Authorization: 'Bearer ' + userData.jira_token,
            'Content-Type': 'application/json'
        }

        let response = await helper.getRequest(getJiraIssueAPI, headers);
        if (response?.data) {
            let resIssueDetail = response.data.fields;
            console.log(resIssueDetail, 'response?.data?.description?.content[0]', resIssueDetail);
            let detailsText = "Summary: " + resIssueDetail.summary + "/n"
                + "Assignee: " + resIssueDetail.assignee + "/n"
                + "Status: " + resIssueDetail.status?.name;
            console.log(detailsText, 'detailsText---details');

            let items = [];

            if (resIssueDetail?.summary) {
                items.push({
                    "label": "Title",
                    "text": {
                        "type": "text",
                        "content": resIssueDetail.summary
                    }
                })
            }

            if (resIssueDetail?.issuetype?.name) {
                items.push({
                    "label": "Type",
                    "text": {
                        "type": "text",
                        "content": resIssueDetail.issuetype.name
                    }
                })
            }

            // if (issueKeyOrId) {
            //     items.push({
            //         "label": "Issue Key",
            //         "text": {
            //             "type": "text",
            //             "content": issueKeyOrId
            //         }
            //     })
            // }

            if (resIssueDetail.description?.content[0]) {
                //handle content array or string
                items.push({
                    "label": "Description",
                    "text": {
                        "type": "text",
                        "content": resIssueDetail.description?.content[0].content[0].text
                    }
                })
            }

            if (resIssueDetail.status?.name) {
                items.push({
                    "label": "Status",
                    "text": {
                        "type": "text",
                        "content": resIssueDetail.status.name
                    }
                })
            }

            if (resIssueDetail?.assignee?.displayName) {
                items.push({
                    "label": "Assignee",
                    "text": {
                        "type": "text",
                        "content": resIssueDetail.assignee.displayName
                    }
                })
            }

            if (resIssueDetail?.priority) {
                items.push({
                    "label": "Priority",
                    "text": {
                        "type": "text",
                        "content": resIssueDetail.priority.name
                    }
                })
            }

            if (resIssueDetail?.duedate) {
                items.push({
                    "label": "Due Date",
                    "text": {
                        "type": "text",
                        "content": resIssueDetail.duedate
                    }
                })
            }

            jiraDetailJson.new_view.body.elements[0].items = items;
            if (userData?.jira_domain) {
                jiraDetailJson.new_view.header.buttons[0].static_action.link_url = userData.jira_domain + '/jira/projects/' ?? ''
            }
            jiraDetailJson.new_view.header.title = "View Jira Issue : " + issueKeyOrId;

            if (userData?.jira_domain && issueKeyOrId) {
                jiraDetailJson.new_view.body.elements[1].static_action.link_url = userData.jira_domain + '/browse/' + issueKeyOrId;
            }

            return jiraDetailJson;
        } else {
            return null;
        }
    },

    async enableWebhook(userData, projectName) {

        let headers = {
            Authorization: 'Bearer ' + userData.jira_token,
            'Content-Type': 'application/json'
        }

        let data = {
            "url": "https://swtio-bck-dev.dvconsulting.org/jira-webhook",
            "webhooks": [
                {
                    "events": [
                        "jira:issue_created",
                        "jira:issue_updated"
                    ],
                    "jqlFilter": "project = '" + projectName + "'"
                }
            ]
        }

        let webhookApiUri = JIRA_API_PREFIX + userData.jira_cloud_id + "/rest/api/2/webhook";

        let response = await helper.postRequest(webhookApiUri, data, headers);
        if (response?.data) {
            console.log(response?.data?.webhookRegistrationResult, 'response webhook');
            return 200;
        } else {
            console.log(response, 'response error / exception webhook');
            return 500;
        }

    },

    async getJiraLabels(userData) {

        let labelApiUri = JIRA_API_PREFIX + userData.jira_cloud_id + "/rest/api/3/label";

        let headers = {
            Authorization: 'Bearer ' + userData.jira_token,
            'Content-Type': 'application/json'
        }

        let response = await helper.getRequest(labelApiUri, headers);
        if (response?.data) {
            return response?.data;
        } else {
            console.log(response, 'response error / exception webhook');
            return null;
        }

    },

    async getUserDetails(jiraToken, jiraCloudId) {
        let labelApiUri = JIRA_API_PREFIX + jiraCloudId + "/rest/api/2/myself";

        let headers = {
            Authorization: 'Bearer ' + jiraToken,
            'Content-Type': 'application/json'
        }

        let response = await helper.getRequest(labelApiUri, headers);
        if (response?.data) {
            console.log(response, 'response userdetails');
            return response?.data;
        } else {
            console.log(response, 'response error / exception userdetails');
            return null;
        }

    },

    async handleRightPanelOptions(jsonElements, userData) {
        let projectSel;
        let status;
        let priority;
        let params = '';
        let elementsTemp = jsonElements?.current_view?.body?.elements;
        console.log(elementsTemp, 'jsonElements to check');
        //append after search----- ?jql=status="In+Progress"&fields=id,key,status,summary,description,assignee,priority

        console.log(elementsTemp[0].options, 'elementsTemp[0].options');
        if (elementsTemp[0]?.value) {
            projectSel = elementsTemp[0]?.value;
            params = params + 'project="' + projectSel + "\"";
        }
        if (elementsTemp[1]?.elements[0]?.value) {
            status = elementsTemp[1].elements[0].value;
            if (params != '') {
                params = params + '+and+status="' + status + "\"";
            } else {
                params = params + 'status="' + status + "\"";
            }
        }
        if (elementsTemp[1]?.elements[1]?.value) {
            priority = elementsTemp[1].elements[1].value[0];
            if (params != '') {
                params = params + '+and+priority="' + priority + "\"";
            } else {
                params = params + 'priority="' + priority + "\"";
            }
        }

        //------check if search input---------------
        if (elementsTemp[2]?.value) {
            let searchKey = elementsTemp[2].value;
            if (params != '') {
                params = params + '+and+summary~"' + searchKey + "\"";
            } else {
                params = params + 'summary~"' + searchKey + "\"";
            }
        }

        if (params) {
            params = params.replace(/ /g, '+');;
        }

        let callRightFunction = await this.setIssueRightPanel(userData, params, jsonElements);
        if (callRightFunction) {
            callRightFunction.callback_type = "views.update"
        }
        return callRightFunction;

    },

    async setDropAttachmentData(switReq, userData) {
        let elements = switReq.current_view.body.elements;
        let issueId = switReq.user_action.id;

        var filteredIssueData = elements.filter(function (itm) {
            return itm.action_id == issueId;
        });

        if (filteredIssueData[0]) {
            filteredIssueData = filteredIssueData[0];
        }

        let updateSubTitle = filteredIssueData.subtitle;
        updateSubTitle = filteredIssueData.subtitle.split('|');
        let projectName = filteredIssueData.snippet;

        shareIssueJson.attachments[0].header.title = filteredIssueData.title;
        shareIssueJson.attachments[0].header.subtitle = projectName + ' | ' + updateSubTitle[0] + ' | ' + updateSubTitle[3];

        let getIssueExtraDetail = await this.jiraGetIssueDetailsBasic(userData, updateSubTitle[0]);

        let subData;
        let assginee = '';
        let status = '';
        let priority = '';
        if (filteredIssueData.subtitle.includes('|')) {
            subData = filteredIssueData.subtitle.split("|");
            if (subData[4]) {
                assginee = subData[4];
            } else {
                assginee = 'NA'
            }
            if (subData[1]) {
                status = subData[1];
            }
            if (subData[2]) {
                priority = subData[2];
            }
        }

        let otherDetails = [];

        otherDetails.push(
            {
                "label": "Assignee",
                "text": {
                    "type": "text",
                    "markdown": false,
                    "content": assginee
                }
            }
        );

        otherDetails.push(
            {
                "label": "Priority",
                "text": {
                    "type": "text",
                    "markdown": false,
                    "content": priority
                }
            }
        );

        otherDetails.push(
            {
                "label": "Status",
                "text": {
                    "type": "text",
                    "markdown": false,
                    "content": status
                }
            }
        )


        if (getIssueExtraDetail?.duedate) {
            otherDetails.push(
                {
                    "label": "Due Date",
                    "text": {
                        "type": "text",
                        "markdown": false,
                        "content": getIssueExtraDetail.duedate
                    }
                }
            )
        }

        shareIssueJson.attachments[0].body.elements[0].items = otherDetails;
        let sendShareJson = shareIssueJson;
        sendShareJson.attachments[0].footer.buttons[0].static_action.link_url = userData.jira_domain + '/browse/' + updateSubTitle[0];
        return sendShareJson;
    },

    setupMutipleConnects(userData, jiraProject, switChannel) {
        let connectsN = [];
        if (userData?.jira_connects) {
            connectsN = JSON.parse(userData.jira_connects);
            const isObjectPresent = connectsN.find((o) => o.project_id == jiraProject && o.swit_channel == switChannel);
            if (!isObjectPresent) {
                if (connectsN) {
                    connectsN.push({
                        project_id: jiraProject,
                        swit_channel: switChannel,
                    });
                    return connectsN;
                }
            } else {
                return null;
            }

        } else {
            connectsN.push({
                project_id: jiraProject,
                swit_channel: switChannel,
            });
            return connectsN;
        }
    }


}