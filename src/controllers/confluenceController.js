const fetch = require('node-fetch');
const _ = require("lodash");
const helper = require('../helpers/functions');
const switHelper = require('../helpers/swit');
const confluenceHelper = require('../helpers/confluence');
const notificationsJson = require('../uijson/confluence/notifications.json');
const confluenceaddSubscriptionJson = require('../uijson/confluence/addsubscription.json');
const confluenceconnectspacepageJson = require('../uijson/confluence/connectspacepage.json');
const confluenceexistsspaceorpageJson = require('../uijson/confluence/existsspaceorpage.json');
const confluencenotapagelinkJson = require('../uijson/confluence/notapagelink.json');
const confluenaddsubscriptionspaceJson = require('../uijson/confluence/addsubscriptionspace.json');
const confluennotaspacelinkJson = require('../uijson/confluence/notaspacelink.json');
const conflueviewsubscriptionlistlinkJson = require('../uijson/confluence/viewsubscriptionlist.json');
const conflueeditsubscriptionspaceJson = require('../uijson/confluence/editsubscriptionspace.json');
const conflueeditsubscriptionJson = require('../uijson/confluence/editsubscription.json');
const conflueeditpermissioncheckJson = require('../uijson/confluence/editpermissioncheck.json');
const confluedeletepermissioncheckJson = require('../uijson/confluence/deletepermissioncheck.json');
const confluecheckurlerrorJson = require('../uijson/confluence/checkurlerror.json');
const confluechecknotificationerrorJson = require('../uijson/confluence/checknotificationerror.json');
const confluechealreadydeleteJson = require('../uijson/confluence/alreadydelete.json');
const logoutJson = require('../uijson/confluence/logout.json')
const errorJson = require("../uijson/confluence/error.json")
const confirmDeleteJson = require("../uijson/confluence/confirmDelete.json")
const rightPanelLoginJson = require('../uijson/confluence/rightPanelLogin.json')

module.exports = function (model, config) {
    var module = {};
    let userData;
    let userData2;

    //--------------------User Actions---------------------
    module.setConfluenceSwitUserAction = async (req, res) => {

        try {
            let switReq = req.body;
            console.log(switReq, "------------body-------------");
            let switUserId = switReq?.user_info?.user_id;
            if (switUserId) {
                userData = await model.confluence.findOne({ where: { 'user_id': switUserId }, raw: true });
            }
            if (switReq?.context?.channel_id == '') {

            } else {
                let swit_channel = switReq?.context?.channel_id;
                console.log("Setting swit channel");
                await model.confluence.update({ swit_channel }, { where: { 'user_id': switUserId }, raw: true })
            }
            //-----------------------------Check for user token & data----------------------------------------
            let userCheck = await switHelper.checkConfluenceSwitUser(userData, switReq?.user_action?.type);
            if (userCheck) {
                req.session.login_user_id = switUserId;
                res.send(userCheck);
                return;
            }

            // if (switReq?.user_action?.type == "right_panel_open" || (switReq?.user_action?.type == "view_actions.oauth_complete" && switReq?.user_action?.id == "Confluence right panel login button"  && switReq?.current_view?.view_id == "right_panel_list")) {
            //     console.log("Inside right panel")
            //     let responseJson = await confluenceHelper.rightPanelSearch(userData);
            //     console.log("back to controller")
            //     console.log(responseJson.new_view.body.elements)
            //     if (responseJson) {
            //         console.log("--------sending fresh rightPanelJson--------")
            //         res.send(responseJson);
            //     } else {
            //         res.send("Some error occurred");
            //     }
            // }
            
            //------------------initial right panel------------------
            if (
                switReq?.user_action?.type === "right_panel_open" ||
                (switReq?.user_action?.type === "view_actions.oauth_complete" &&
                    switReq?.user_action?.id === "Confluence right panel login button" &&
                    switReq?.current_view?.view_id === "right_panel_list")
            ) {
                console.log("Inside right panel");

                let requestQueue = []; // Initialized an empty request queue

                function addToRequestQueue(switReq, userData, res) {
                    const request = { switReq, userData, res };
                    requestQueue.push(request);
                }

                async function processNextRequest() {
                    if (requestQueue.length > 0) {
                        const request = requestQueue.shift(); // Dequeued the first request from the queue

                        try {
                            // Execute the function logic for the request
                            const { switReq, userData, res } = request;

                            const responseJson = await confluenceHelper.rightPanelSearch(userData);
                            console.log("Back to controller");
                            console.log(responseJson.new_view.body.elements);
                            if (responseJson) {
                                console.log("--------sending fresh rightPanelJson--------");
                                res.send(responseJson);
                            } else {
                                res.send("Some error occurred");
                            }
                        } catch (error) {
                            console.error(`Error processing request:`, error);
                            request.res.send("Some error occurred");
                        } finally {
                            // Process the next request in the queue
                            processNextRequest();
                        }
                    }
                }
                // Add the requests to the queue
                addToRequestQueue(switReq, userData, res);
                if (requestQueue.length === 1) {
                    // Process the first request in the queue
                    processNextRequest();
                }
            }
            if (switReq?.user_action?.type == "view_actions.oauth_complete" && switReq?.user_action?.id != "Confluence right panel login button") {
                res.send({ "callback_type": "views.close" });
                return;
            }
            //----------------Add Subscription Page or Space ----------------- 
            if (switReq?.user_action?.id == "confluence-add-subscribe") {
                console.log(switReq?.user_info?.user_id, '--------------switReq?.user_info?.user_id------------');
                confluenceconnectspacepageJson.callback_type = "views.open";
                res.send(confluenceconnectspacepageJson);
            }
            if (switReq?.current_view?.view_id == 'confluence_subscription_connectspacepage' && switReq?.user_action?.type == 'view_actions.submit') {

                if (switReq?.user_action?.id == 'connext-page') {
                    let formElementsval = switReq?.user_action?.id;
                    console.log(formElementsval, '----------call data page---------');
                    confluenceaddSubscriptionJson.callback_type = "views.open";
                    res.send(confluenceaddSubscriptionJson);
                } else if (switReq?.user_action?.id == 'connect-space') {
                    let formElementsval = switReq?.user_action?.id;
                    console.log(formElementsval, '----------call data space---------');
                    confluenaddsubscriptionspaceJson.callback_type = "views.open";
                    res.send(confluenaddsubscriptionspaceJson);
                }
            }

            //----------------Add Subscription Page----------------- 
            if (switReq?.current_view?.view_id == 'confluence_subscription' && switReq?.user_action?.type == 'view_actions.submit') {
                let checkelements = switReq?.current_view?.body?.elements;
                console.log(checkelements, '------checkelementsEditEditEditSpacecheckelements');
                let formElementsval;
                let formElements;
                checkelements.forEach(async (element, index) => {
                    if (switReq?.current_view?.body?.elements[index].type == 'select') {
                        formElementsval = switReq?.current_view?.body?.elements[index].value;
                    } if (switReq?.current_view?.body?.elements[index].type == 'text_input') {
                        formElements = switReq?.current_view?.body?.elements[index].value;
                    }
                });
                let switUserId = switReq?.user_info?.user_id;
                let pageurl = formElements;
                let validationDeal = await confluenceHelper.validateAddconnectpages(
                    switReq?.current_view?.body?.elements,
                    switReq?.current_view
                );
                console.log("validationDeal444444", validationDeal);
                if (validationDeal != false) {
                    res.send(validationDeal);
                }
                else {
                    let text = pageurl;
                    let position = text.search("pages");
                    let pageId = null;
                    let dataval;
                    let oripagename = null;
                    const regexspace = /\/spaces\/([^\/]+)\//;
                    const matchspace = pageurl.match(regexspace);
                    const spaceId = matchspace ? matchspace[1] : null;
                    if (position > 1) {
                        typeName = 'pages';
                        const regex = /\/pages\/(\d+)\//;
                        const match = pageurl.match(regex);
                        pageId = match ? match[1] : null;
                        console.log(spaceId, '-----my space id----');
                        console.log(pageId, '----------my page id---------');
                        dataval = await model.confluencesubscription.findOne({ where: { 'user_id': switUserId, 'pages_id': pageId }, raw: true });
                        console.log(dataval);
                        if (dataval != null) {
                            confluenceexistsspaceorpageJson.callback_type = "views.open";
                            res.send(confluenceexistsspaceorpageJson);
                            confluenceaddSubscriptionJson.callback_type = "views.close";
                            res.send(confluenceaddSubscriptionJson);
                        } else if (dataval == null) {
                            let url = process.env.CONFLUENCE_API_DOMAIN + userData.confluence_cloud_id + "/wiki/rest/api/content/" + pageId;
                            let headers = {
                                Authorization: `Bearer ${userData.confluence_token}`,
                                "Accept": "application/json"
                            };
                            console.log(headers)
                            let pageResponse = await helper.getRequest(url, headers);
                            oripagename = pageResponse.data.title;
                            console.log(pageResponse.data.title, '---------My OWN Page Id---------------');
                            await model.confluencesubscription.create({
                                user_id: switUserId,
                                page_url: pageurl,
                                page_type: typeName,
                                pages_id: pageId,
                                spaces_id: spaceId,
                                page_name: oripagename,
                            });
                            userData2 = await model.confluencesubscription.findOne({ where: { 'user_id': switUserId, 'pages_id': pageId }, raw: true });
                            fetch(process.env.CONFLUENCE_API_DOMAIN + userData.confluence_cloud_id + '/wiki/rest/api/user/watch/content/' + pageId, {
                                method: 'POST',
                                headers: {
                                    Authorization: `Bearer ${userData.confluence_token}`,
                                    "Accept": "application/json",
                                    "X-Atlassian-Token": "no-check"
                                }
                            }).then(response => {
                                console.log(
                                    `Response: ${response.status} ${response.statusText}`
                                );
                                return response.text();
                            })
                                .then(text => console.log(text))
                                .catch(err => console.error(err));
                            console.log(formElementsval, '-----------------------my request body data---------22222');
                            formElementsval.forEach(async (element, index) => {
                                console.log(element, '-----------Element values--------');
                                switch (element) {
                                    case 'main-page-update':
                                        userData2.mainpage_update = 1;
                                        break;
                                    case 'main-page-comment':
                                        userData2.mainpage_comment = 1;
                                        break;
                                    case 'child-page-create':
                                        userData2.childpage_create = 1;
                                        break;
                                    case 'child-page-update':
                                        userData2.childpage_update = 1;
                                        break;
                                    case 'child-page-comment':
                                        userData2.childpage_comment = 1;
                                        break;
                                    default:
                                    // code block
                                };
                                console.log(userData2, '--------ddddttttaaa--userdata2updatedcode--------')
                            });
                            let data = {
                                mainpage_update: userData2.mainpage_update,
                                mainpage_comment: userData2.mainpage_comment,
                                childpage_create: userData2.childpage_create,
                                childpage_update: userData2.childpage_update,
                                childpage_comment: userData2.childpage_comment,
                            }
                            await model.confluencesubscription.update(data, { where: { user_id: switUserId, pages_id: pageId } });
                            await switHelper.sendMessageToSelectedChannel(userData, "Your Confluence Page has been subscribed successfully.");
                            confluenceaddSubscriptionJson.callback_type = "views.close"
                            res.send(confluenceaddSubscriptionJson)
                        }
                    } else {
                        confluencenotapagelinkJson.callback_type = "views.open";
                        res.send(confluencenotapagelinkJson);
                    }
                }
            };

            //----------------Add Subscription Space-----------------

            if (switReq?.current_view?.view_id == 'confluence_subscription_space' && switReq?.user_action?.type == 'view_actions.submit') {
                let checkelements = switReq?.current_view?.body?.elements;
                console.log(checkelements, '------checkelementsEditEditEditSpacecheckelements');
                let formElementsval;
                let formElements;
                checkelements.forEach(async (element, index) => {
                    if (switReq?.current_view?.body?.elements[index].type == 'select') {
                        formElementsval = switReq?.current_view?.body?.elements[index].value;
                    } if (switReq?.current_view?.body?.elements[index].type == 'text_input') {
                        formElements = switReq?.current_view?.body?.elements[index].value;
                    }
                });
                //let formElements = switReq?.current_view?.body?.elements;
                //let formElementsval = switReq?.current_view?.body?.elements[5].value;
                console.log(formElementsval, '------------HHHHHSpace------');
                let switUserId = switReq?.user_info?.user_id;
                let pageurl = formElements;
                // if (formElementsval == null || pageurl == null) {
                //confluecheckurlerrorJson.callback_type = "views.open";
                //res.send(confluecheckurlerrorJson);
                let validationDeal = await confluenceHelper.validateAddconnectspace(
                    switReq?.current_view?.body?.elements,
                    switReq?.current_view
                );
                console.log("validationDeal444444", validationDeal);
                if (validationDeal != false) {
                    res.send(validationDeal);
                }
                else {
                    let text = pageurl;
                    let position = text.search("spaces");
                    let pageId = null;
                    let dataval;
                    let oripagename = null;
                    const regex = /\/pages\/(\d+)\//;
                    const match = pageurl.match(regex);
                    pageId = match ? match[1] : null;
                    const regexspace = /\/spaces\/([^\/]+)\//;
                    const matchspace = pageurl.match(regexspace);
                    const spaceId = matchspace ? matchspace[1] : null;
                    console.log(spaceId, '-----my space id----');
                    if (spaceId != null && position > 1 && pageId == null) {
                        dataval = await model.confluencesubscription.findOne({ where: { 'user_id': switUserId, 'pages_id': pageId, 'spaces_id': spaceId }, raw: true });
                        console.log(dataval);
                        if (dataval != null) {
                            confluenceexistsspaceorpageJson.callback_type = "views.open";
                            res.send(confluenceexistsspaceorpageJson);
                            confluenceaddSubscriptionJson.callback_type = "views.close";
                            res.send(confluenceaddSubscriptionJson);
                        } else if (dataval == null) {
                            let url = process.env.CONFLUENCE_API_DOMAIN + userData.confluence_cloud_id + '/wiki/rest/api/space/' + spaceId;
                            let headers = {
                                Authorization: `Bearer ${userData.confluence_token}`,
                                "Accept": "application/json"
                            };
                            let pageResponse = await helper.getRequest(url, headers);
                            console.log(pageResponse, '---------My OWN Space Id---------------');
                            oripagename = pageResponse.data.name;
                            typeName = 'spaces';
                            await model.confluencesubscription.create({
                                user_id: switUserId,
                                page_url: pageurl,
                                page_type: typeName,
                                pages_id: pageId,
                                spaces_id: spaceId,
                                page_name: oripagename,
                            });
                            userData2 = await model.confluencesubscription.findOne({ where: { 'user_id': switUserId, 'spaces_id': spaceId }, raw: true });
                            fetch(process.env.CONFLUENCE_API_DOMAIN + userData.confluence_cloud_id + 'wiki/rest/api/user/watch/space/' + spaceId, {
                                method: 'POST',
                                headers: {
                                    Authorization: `Bearer ${userData.confluence_token}`,
                                    "Accept": "application/json",
                                    "X-Atlassian-Token": "no-check"
                                }
                            }).then(response => {
                                console.log(
                                    `Response: ${response.status} ${response.statusText}`
                                );
                                return response.text();
                            })
                                .then(text => console.log(text))
                                .catch(err => console.error(err));
                            console.log(formElementsval, '-----------------------my request body data---------22222');
                            formElementsval.forEach(async (element, index) => {
                                console.log(element, '-----------Element values--------');
                                switch (element) {
                                    case 'create-new-page':
                                        userData2.mainpage_create = 1;
                                        userData2.childpage_create = 1;
                                        break;
                                    case 'create-new-blog-post':
                                        userData2.blog_create = 1;
                                        break;
                                    case 'edit-page':
                                        userData2.childpage_update = 1;
                                        userData2.mainpage_update = 1;
                                        break;
                                    case 'comment-page':
                                        userData2.childpage_comment = 1;
                                        userData2.mainpage_comment = 1;
                                        break;
                                    default:
                                    // code block
                                };
                                console.log(userData2, '--------ddddttttaaa--userdata2updatedcode--------')
                            });
                            let data = {
                                blog_create: userData2.blog_create,
                                mainpage_create: userData2.mainpage_create,
                                mainpage_update: userData2.mainpage_update,
                                mainpage_comment: userData2.mainpage_comment,
                                childpage_create: userData2.childpage_create,
                                childpage_update: userData2.childpage_update,
                                childpage_comment: userData2.childpage_comment,
                            }
                            await model.confluencesubscription.update(data, { where: { user_id: switUserId, spaces_id: spaceId } });
                            await switHelper.sendMessageToSelectedChannel(userData, "Your Confluence space has been subscribed successfully.");
                            confluenceaddSubscriptionJson.callback_type = "views.close"
                            res.send(confluenceaddSubscriptionJson)
                        }
                    } else {
                        confluennotaspacelinkJson.callback_type = "views.open";
                        res.send(confluennotaspacelinkJson);
                    }

                }
            };

            //----------------View List Subscription Space and Page----------------- 
            if (switReq?.user_action?.id == 'confluence-sub-list') {
                let message = ' ';
                let switUserId = switReq?.user_info?.user_id;
                let subscriptiondata = await model.confluencesubscription.findAll({ where: { 'user_id': switUserId }, raw: true });
                let checkdata = '';
                if (subscriptiondata == '') {
                    await switHelper.sendMessageToSelectedChannel(userData, "You don't have any subscribe records");
                } else if (subscriptiondata != '') {
                    let datarec = (_.chunk(subscriptiondata, 2));
                    console.log(switUserId, '--------submy user id-----------');
                    console.log(datarec, '--------------My all Data space page-------');
                    await switHelper.sendMessageToSelectedChannel(userData, "View Confluence Subscription Space and Page list:");
                    datarec.forEach(async (row, index1) => {
                        row.forEach(async (element, index) => {
                            setTimeout(async () => {
                                if (element.page_type == 'spaces') {
                                    checkdata = 'Space';
                                } if (element.page_type == 'pages') {
                                    checkdata = 'Page';
                                }
                                console.log(index, '----------Indexindexindex----------');
                                console.log(element, '-----------Element values space page--------');
                                conflueviewsubscriptionlistlinkJson.attachments[0].body.elements = [];
                                conflueviewsubscriptionlistlinkJson.attachments[0].body.elements.push({
                                    "type": "info_card",
                                    "draggable": true,
                                    "items": [
                                        {
                                            "label": `${checkdata} Name:`,
                                            "text": {
                                                "type": "text",
                                                "markdown": true,
                                                "content": `[${element.page_name}](${element.page_url})`
                                            }
                                        },
                                    ]
                                })
                                conflueviewsubscriptionlistlinkJson.attachments[0].body.elements.push({
                                    "type": "text",
                                    "markdown": false,
                                    "content": "Send notifications when someone:"
                                })
                                if (element.mainpage_create == 1) {
                                    conflueviewsubscriptionlistlinkJson.attachments[0].body.elements.push({

                                        "type": "text",
                                        "markdown": false,
                                        "content": `Adds a page`
                                    })
                                } if (element.mainpage_update == 1) {
                                    conflueviewsubscriptionlistlinkJson.attachments[0].body.elements.push({

                                        "type": "text",
                                        "markdown": false,
                                        "content": `Edits a page`
                                    })
                                } if (element.mainpage_comment == 1) {
                                    conflueviewsubscriptionlistlinkJson.attachments[0].body.elements.push({

                                        "type": "text",
                                        "markdown": false,
                                        "content": `Comments on a page`
                                    })
                                } if (element.blog_create == 1) {
                                    conflueviewsubscriptionlistlinkJson.attachments[0].body.elements.push({

                                        "type": "text",
                                        "markdown": false,
                                        "content": `Adds a blog post`
                                    })
                                }
                                let dataarr = [
                                    {
                                        "type": "button",
                                        "label": "Edit Subscription",
                                        "style": "primary_filled",
                                        "action_id": `edit-${element.id}`
                                    },
                                    {
                                        "type": "button",
                                        "label": "Delete",
                                        "style": "primary_filled",
                                        "action_id": `delete-${element.id}`
                                    }
                                ]
                                conflueviewsubscriptionlistlinkJson.attachments[0].footer = { "buttons": dataarr }
                                await confluenceHelper.sendSwitConfluenceMessage(
                                    message,
                                    conflueviewsubscriptionlistlinkJson.attachments,
                                    userData?.swit_token,
                                    userData?.swit_channel
                                );
                            }, index * 1000);
                        });
                    });
                }
                res.send({ callback_type: "views.close" });
            }

            //----------------View Manage Subsctiption Edit-----------------
            if (switReq?.user_action?.id.includes('edit')) {
                let arr = switReq.user_action.id.split('-');
                const editvalue = arr[1];
                let sucheck = -1;
                let switUserId = -2;
                let subdata = await model.confluencesubscription.findOne({ where: { 'id': editvalue }, raw: true });
                if (switReq?.user_info?.user_id) {
                    switUserId = switReq?.user_info?.user_id;
                } if (subdata != null) {
                    console.log(subdata, '----------dddfff---hhh--');
                    sucheck = subdata.user_id;
                }
                //console.log(switUserId, '--------request user id-----');
                //console.log(subdata.user_id, '---------------database user id----');
                //console.log(editvalue, '---------------For Id Split----');
                //console.log(subdata.page_name, '---------------For Id Split Data Value----');
                if (switUserId != sucheck) {
                    conflueeditpermissioncheckJson.callback_type = "views.open";
                    res.send(conflueeditpermissioncheckJson);

                } else if (switUserId == sucheck) {
                    conflueeditsubscriptionspaceJson.new_view.body.elements = [];
                    conflueeditsubscriptionJson.new_view.body.elements = [];
                    if (subdata.page_type == 'spaces') {
                        conflueeditsubscriptionspaceJson.new_view.body.elements.push({
                            "type": "text",
                            "markdown": false,
                            "content": `Space: ${subdata.page_name}`
                        })
                        conflueeditsubscriptionspaceJson.new_view.body.elements.push({
                            "type": "text",
                            "markdown": false,
                            "content": "Channel: Confluence"
                        })
                        conflueeditsubscriptionspaceJson.new_view.body.elements.push({
                            "type": "text",
                            "markdown": false,
                            "content": "Currently showing notifications for:"
                        })
                        if (subdata.mainpage_create == 1) {
                            conflueeditsubscriptionspaceJson.new_view.body.elements.push({
                                "type": "text",
                                "markdown": false,
                                "content": "Create a new page"
                            })
                        } if (subdata.blog_create == 1) {
                            conflueeditsubscriptionspaceJson.new_view.body.elements.push({
                                "type": "text",
                                "markdown": false,
                                "content": "Create a new blog post"
                            })
                        } if (subdata.mainpage_update == 1) {
                            conflueeditsubscriptionspaceJson.new_view.body.elements.push({
                                "type": "text",
                                "markdown": false,
                                "content": "Edit"
                            })
                        } if (subdata.mainpage_comment == 1) {
                            conflueeditsubscriptionspaceJson.new_view.body.elements.push({
                                "type": "text",
                                "markdown": false,
                                "content": "Comments"
                            })
                        }
                        conflueeditsubscriptionspaceJson.new_view.body.elements.push({
                            "type": "select",
                            "placeholder": "Select an item",
                            "multiselect": true,
                            "trigger_on_input": true,
                            "options": [
                                {
                                    "label": "Create a new page",
                                    "action_id": "create-new-page"
                                },
                                {
                                    "label": "Create a new blog post",
                                    "action_id": "create-new-blog-post"
                                },
                                {
                                    "label": "Edit",
                                    "action_id": "edit-page"
                                },
                                {
                                    "label": "Comments",
                                    "action_id": "comment-page"
                                }
                            ]
                        })
                        conflueeditsubscriptionspaceJson.new_view.body.elements.push({
                            "type": "container",
                            "elements": [
                                {
                                    "type": "button",
                                    "label": "Cancel",
                                    "style": "primary_filled",
                                    "static_action": {
                                        "action_type": "close_view",

                                    }
                                },
                                {
                                    "type": "button",
                                    "label": "Done",
                                    "style": "primary_filled",
                                    "action_id": `${editvalue}`,
                                }
                            ]
                        })
                        conflueeditsubscriptionspaceJson.callback_type = "views.open";
                        res.send(conflueeditsubscriptionspaceJson);
                    } else if (subdata.page_type == 'pages') {
                        console.log('pages');
                        conflueeditsubscriptionJson.new_view.body.elements.push({
                            "type": "text",
                            "markdown": false,
                            "content": `Pages: ${subdata.page_name}`
                        })
                        conflueeditsubscriptionJson.new_view.body.elements.push({
                            "type": "text",
                            "markdown": false,
                            "content": "Channel: Confluence"
                        })
                        conflueeditsubscriptionJson.new_view.body.elements.push({
                            "type": "text",
                            "markdown": false,
                            "content": "Currently showing notifications for:"
                        })
                        if (subdata.mainpage_update == 1) {
                            conflueeditsubscriptionJson.new_view.body.elements.push({
                                "type": "text",
                                "markdown": false,
                                "content": "Edits this page"
                            })
                        } if (subdata.mainpage_comment == 1) {
                            conflueeditsubscriptionJson.new_view.body.elements.push({
                                "type": "text",
                                "markdown": false,
                                "content": "Comments on this page"
                            })
                        }
                        conflueeditsubscriptionJson.new_view.body.elements.push({
                            "type": "select",
                            "placeholder": "Select an item",
                            "multiselect": true,
                            "trigger_on_input": true,
                            "options": [
                                {
                                    "label": "Edits this page",
                                    "action_id": "main-page-update"
                                },
                                {
                                    "label": "Comments on this page",
                                    "action_id": "main-page-comment"
                                }
                            ]
                        })
                        conflueeditsubscriptionJson.new_view.body.elements.push({
                            "type": "container",
                            "elements": [
                                {
                                    "type": "button",
                                    "label": "Cancel",
                                    "style": "primary_filled",
                                    "static_action": {
                                        "action_type": "close_view"
                                    }
                                },
                                {
                                    "type": "button",
                                    "label": "Done",
                                    "style": "primary_filled",
                                    "action_id": `${editvalue}`,
                                }
                            ]
                        })
                        conflueeditsubscriptionJson.callback_type = "views.open";
                        res.send(conflueeditsubscriptionJson);
                    }

                }

            }

            if (switReq?.current_view?.view_id == 'confluence_subscription_edit_space' && switReq?.user_action?.type == 'view_actions.submit') {
                let checkelements = switReq?.current_view?.body?.elements;
                console.log(checkelements, '------checkelementsEditEditEditSpacecheckelements');
                let formElementsval;
                let formElements;
                checkelements.forEach(async (element, index) => {
                    if (switReq?.current_view?.body?.elements[index].type == 'select') {
                        formElementsval = switReq?.current_view?.body?.elements[index].value;
                    } if (switReq?.current_view?.body?.elements[index].type == 'container') {
                        formElements = switReq?.current_view?.body?.elements[index].elements[1].action_id;
                    }
                });
                console.log(formElementsval, '------EditEditEditSpaceformElementsval');
                console.log(formElements, '------EditEditEditSpacefformElements');
                let validationDeal = await confluenceHelper.validateEditconnectspace(
                    switReq?.current_view?.body?.elements,
                    switReq?.current_view
                );
                console.log("validationDeal444444", validationDeal);
                if (validationDeal != false) {
                    res.send(validationDeal);
                } else {
                    let datarec = {
                        "blog_create": 0,
                        "mainpage_create": 0,
                        "mainpage_update": 0,
                        "mainpage_comment": 0,
                        "childpage_create": 0,
                        "childpage_update": 0,
                        "childpage_comment": 0
                    }
                    formElementsval.forEach(async (element, index) => {
                        console.log(element, '-----------EDITEDITEDITElement values--------');
                        switch (element) {
                            case 'create-new-page':
                                datarec.mainpage_create = 1;
                                datarec.childpage_create = 1;
                                break;
                            case 'create-new-blog-post':
                                datarec.blog_create = 1;
                                break;
                            case 'edit-page':
                                datarec.childpage_update = 1;
                                datarec.mainpage_update = 1;
                                break;
                            case 'comment-page':
                                datarec.childpage_comment = 1;
                                datarec.mainpage_comment = 1;
                                break;
                            default:
                            // code block
                        };
                        console.log(datarec, '--------SPACE EDITEIT ddddttttaaa--userdata2updatedcode--------')
                    });
                    let data = {
                        blog_create: datarec.blog_create,
                        mainpage_create: datarec.mainpage_create,
                        mainpage_update: datarec.mainpage_update,
                        mainpage_comment: datarec.mainpage_comment,
                        childpage_create: datarec.childpage_create,
                        childpage_update: datarec.childpage_update,
                        childpage_comment: datarec.childpage_comment,
                    }
                    await model.confluencesubscription.update(data, { where: { id: formElements } });
                    res.send({ "callback_type": "views.close" });
                    await switHelper.sendMessageToSelectedChannel(userData, "You have successfully updated your Space Subscription");
                }
            } if (switReq?.current_view?.view_id == 'confluence_subscription_edit_page' && switReq?.user_action?.type == 'view_actions.submit') {
                let checkelements = switReq?.current_view?.body?.elements;
                console.log(checkelements, '------checkelementsEditEditEditSpacecheckelements');
                let formElementsval;
                let formElements;
                checkelements.forEach(async (element, index) => {
                    if (switReq?.current_view?.body?.elements[index].type == 'select') {
                        formElementsval = switReq?.current_view?.body?.elements[index].value;
                    } if (switReq?.current_view?.body?.elements[index].type == 'container') {
                        formElements = switReq?.current_view?.body?.elements[index].elements[1].action_id;
                    }
                });
                console.log(formElementsval, '------EditEditEditPagesformElementsval');
                console.log(formElements, '------EditEditEditPagesfformElements');
                let validationDeal = await confluenceHelper.validateEditconnectpage(
                    switReq?.current_view?.body?.elements,
                    switReq?.current_view
                );
                console.log("validationDeal444444", validationDeal);
                if (validationDeal != false) {
                    res.send(validationDeal);
                } else {
                    let datarec = {
                        "mainpage_update": 0,
                        "mainpage_comment": 0,
                        "childpage_create": 0,
                        "childpage_update": 0,
                        "childpage_comment": 0
                    }
                    formElementsval.forEach(async (element, index) => {
                        console.log(element, '-----------EDITEDITEDITElement values--------');
                        switch (element) {
                            case 'main-page-update':
                                datarec.mainpage_update = 1;
                                break;
                            case 'main-page-comment':
                                datarec.mainpage_comment = 1;
                                break;
                            case 'child-page-create':
                                datarec.childpage_create = 1;
                                break;
                            case 'child-page-update':
                                datarec.childpage_update = 1;
                                break;
                            case 'child-page-comment':
                                datarec.childpage_comment = 1;
                                break;
                            default:
                            // code block
                        };
                        console.log(datarec, '--------SPACE EDITEIT ddddttttaaa--userdata2updatedcode--------')
                    });
                    let data = {
                        mainpage_update: datarec.mainpage_update,
                        mainpage_comment: datarec.mainpage_comment,
                        childpage_create: datarec.childpage_create,
                        childpage_update: datarec.childpage_update,
                        childpage_comment: datarec.childpage_comment,
                    }
                    await model.confluencesubscription.update(data, { where: { id: formElements } });
                    res.send({ "callback_type": "views.close" });
                    await switHelper.sendMessageToSelectedChannel(userData, "You have successfully updated your Page Subscription");
                }
            }


            //----------------View Manage Subsctiption Delete----------------- 
            if (switReq?.user_action?.id.includes('delete')) {
                let deleteArr;
                let sucheck = -1;
                let switUserId = -2;
                deleteArr = switReq.user_action.id.split('-');
                let deleteVal = deleteArr[1];
                let subdatadel = await model.confluencesubscription.findOne({ where: { 'id': deleteVal }, raw: true });
                if (switReq?.user_info?.user_id) {
                    switUserId = switReq?.user_info?.user_id;
                } if (subdatadel != null) {
                    //console.log(subdata,'----------dddfff---hhh--');
                    sucheck = subdatadel.user_id;

                }
                //console.log(switUserId, '--------request user id-----');
                //console.log(subdatadel.user_id, '---------------database user id----');
                //console.log(deleteVal, '---------------For Id Split----');
                if (switUserId != sucheck) {
                    if (subdatadel == null) {
                        confluechealreadydeleteJson.callback_type = "views.open";
                        res.send(confluechealreadydeleteJson);
                    } else {
                        confluedeletepermissioncheckJson.callback_type = "views.open";
                        res.send(confluedeletepermissioncheckJson);
                    }
                } else if (switUserId == sucheck) {
                    confirmDeleteJson.new_view.body.elements[0].elements.deleteArr = deleteArr;
                    res.send(confirmDeleteJson);
                }
            }
            if (switReq.user_action.id.includes('confirmDelete') && switReq?.user_action?.type == 'view_actions.submit') {
                let deleteArr = confirmDeleteJson.new_view.body.elements[0].elements.deleteArr;
                deleteValue = deleteArr[1];
                console.log(`Deleting ID: ${deleteValue} from db`);
                let deleted = await model.confluencesubscription.destroy({ where: { id: deleteValue } });
                if (deleted != 0) {
                    console.log(`Subscription for Id ${deleteValue} has been deleted`);
                    res.send({ "callback_type": "views.close" });
                    await switHelper.sendMessageToSelectedChannel(userData, "Selected Subscription has been deleted");
                } else {
                    res.send(errorJson);
                }

            }

            //----------------Manage Notifications-----------------
            if (switReq?.user_action?.id == "manage-notifications") {
                userData2 = await model.confluencesubscription.findOne({ where: { 'user_id': switUserId }, raw: true });
                notificationsJson.callback_type = "views.open";
                if (userData2.notifications == "On") {
                    notificationsJson.new_view.body.elements[0].content = "Notifications are On";
                    notificationsJson.new_view.footer.buttons[1].label = "Turn Off";
                    res.send(notificationsJson);
                } else if (userData2.notifications == "Off") {
                    notificationsJson.new_view.body.elements[0].content = "Notifications are Off";
                    notificationsJson.new_view.footer.buttons[1].label = "Turn On";
                    res.send(notificationsJson);
                }
            }
            if (switReq?.user_action?.id == 'Notification Button-action_id' && switReq.user_action.type == 'view_actions.submit') {
                console.log("Inside notifications func")
                console.log(notificationsJson.new_view.footer.buttons[1].label);
                let notifications;
                let switUserId = switReq.user_info.user_id;
                if (switReq.current_view.footer.buttons[1].label == "Turn Off") {
                    console.log("Inside notifications off")
                    notifications = "Off";
                    userData2.notifications = "Off"
                    await model.confluencesubscription.update({ notifications }, { where: { user_id: switUserId } });
                    await switHelper.sendMessageToSelectedChannel(userData, "Confluence Notifications have been turned OFF")
                }
                else if (switReq.current_view.footer.buttons[1].label == "Turn On") {
                    console.log("Inside notifications on")
                    notifications = "On";
                    userData2.notifications = "On"
                    await model.confluencesubscription.update({ notifications }, { where: { user_id: switUserId } });
                    await switHelper.sendMessageToSelectedChannel(userData, "Confluence Notifications have been turned ON")
                }
                notificationsJson.callback_type = "views.close"
                res.send(notificationsJson);
            }


            //-----------------------------right panel---------------------------------------
            if (switReq?.user_action?.type == "view_actions.input" && switReq?.current_view?.view_id == "right_panel_list") {
                let requestQueue = []; // Initialized an empty request queue
                function addToRequestQueue(switReq, userData, res) {
                    const request = { switReq, userData, res };
                    requestQueue.push(request);
                }
                async function processNextRequest() {
                    if (requestQueue.length > 0) {
                        const request = requestQueue.shift(); // Dequeued the first request from the queue
                        try {
                            // Execute the function logic for the request
                            const { switReq, userData, res } = request;
                            let response = await confluenceHelper.handleRightPanelSearch(switReq, userData);
                            console.log(response.new_view.body.elements, "------response-----");
                            console.log(response.new_view.body.elements[1].elements[0].value);
                            res.send(response);
                        } catch (error) {
                            console.error(`Error processing request:`, error);
                            request.res.send("Some error occurred");
                        } finally {
                            // Process the next request in the queue
                            processNextRequest();
                        }
                    }
                }
                // Add the requests to the queue
                addToRequestQueue(switReq, userData, res);
                if (requestQueue.length === 1) {
                    // Process the first request in the queue
                    processNextRequest();
                }
            }
            if (switReq?.user_action?.type == "view_actions.submit" && switReq?.current_view?.view_id == "right_panel_list" && switReq?.user_action?.id == 'Reload-search') {
                console.log("Reloading right panel search");
                let response = await confluenceHelper.reloadRightPanelSearch(userData);
                res.send(response);
            }

            if (switReq?.user_action?.type == "view_actions.drop" && switReq?.current_view?.view_id == "right_panel_list") {
                let response = await confluenceHelper.handleRightPanelSearch(switReq, userData);
                console.log(response.attachments[0], "------response-----");
                res.send(response);
            }

            //--------------------Logout--------------------------

            if (switReq.user_action.id == "Logout") {
                res.send(logoutJson)
            }
            if (switReq.user_action.id == "Logout Button-action_id") {
                if (userData && userData?.user_id) {
                    await model.confluence.destroy({
                        where: {
                            user_id: userData.user_id
                        }
                    })
                }
                await switHelper.sendMessageToSelectedChannel(userData, "You have been logged out from Confluence successfully");
                res.send({ "callback_type": "views.close" });
                return;
            }
            if (switReq?.current_view?.view_id == "right_panel_list" && switReq.user_action.id == "Panel Logout Button-action_id") {
                if (userData && userData?.user_id) {
                    await model.confluence.destroy({
                        where: {
                            user_id: userData.user_id
                        }
                    })
                }
                res.send(rightPanelLoginJson);
            }

        } catch (error) {
            console.log(error);
            res.send(errorJson);
        }

    }

    //----------------------AUTH--------------------------
    module.setSwitToken = async function (req, res) {

        let responseToken = await switHelper.setSwitTokenUser(req.query.code, process.env.SWIT_AUTH_GRANT_TYPE, process.env.CONFLUENCE_SWIT_CLIENT_ID, process.env.CONFLUENCE_SWIT_CLIENT_SECRET, process.env.CONFLUENCE_SWIT_REDIRECT_URI);
        if (!responseToken) { res.send({ status: 500, msg: "user code not found" }); }

        //-----------------handle if user data not fetched -------------------
        let userJson = await helper.parseJwt(responseToken);
        console.log(userJson, '------------userJson-----------');

        let switUser;
        //  if (req.session.login_user_id) {
        //      switUser = req.session.login_user_id
        //  } else {
        switUser = userJson.sub;
        //}
        console.log(switUser, '----------switUser--------------id');


        let switUserFind = await model.confluence.findOne({ where: { user_id: switUser } });
        console.log(switUserFind, '-------------switUserFind----------');
        if (!switUserFind) {
            //----------------------------create user or update with swit details----------------------------

            await model.confluence.create({
                user_id: switUser,
                swit_token: responseToken,
            });
        } else {
            switUserFind.update({
                swit_token: responseToken,
            });
        }
        req.session.user_id = switUser;
        res.render('confluence/confluence-auth.html', {
            auth: req.session,
            user_id: switUser
        });
    };
    module.confluenceAuth = async function (req, res) {
        console.log(req.query.code, 'req--------------------confluence-----------------');
        let confluenceCode = req.query.code;
        if (!confluenceCode) {
            res.send({ status: 500, msg: "Confluence auth code not found!", code: req.query.code });

        }

        //----------------get token using confluence token api---------------------------
        let dataToken = {
            "grant_type": "authorization_code",
            "client_id": process.env.CONFLUENCE_CLIENT_ID,
            "client_secret": process.env.CONFLUENCE_CLIENT_SECRET,
            "code": confluenceCode,
            "redirect_uri": process.env.CONFLUENCE_REDIRECT_URI
        }
        const headers = {
            "Content-Type": "application/json"
        }
        let tokenRes = await helper.postRequest(process.env.CONFLUENCE_TOKEN_API, dataToken, headers);
        console.log(tokenRes.data, 'tokenRes-------------');


        if (tokenRes?.data?.access_token && tokenRes?.data?.refresh_token) {

            let userData = await model.confluence.findOne({
                where: {
                    'user_id': req.query.state
                }, raw: true
            });
            if (userData) {

                //----------------------set user domain if required----------------------

                const resHeaders = {
                    "Authorization": "Bearer " + tokenRes.data.access_token
                }
                let resourceRes = await helper.getRequest(process.env.CONFLUENCE_ACCESS_RESOURCE_API, resHeaders);
                console.log(resourceRes?.data[0], 'resourceRes');
                let inputSaveData;
                if (resourceRes?.data[0]?.url && resourceRes?.data[0]?.id) {
                    inputSaveData = {
                        confluence_token: tokenRes.data.access_token,
                        confluence_refresh_token: tokenRes.data.refresh_token,
                        confluence_domain: resourceRes.data[0].url,
                        confluence_cloud_id: resourceRes.data[0].id
                    }
                } else {
                    inputSaveData = {
                        confluence_token: tokenRes.data.access_token,
                        confluence_refresh_token: tokenRes.data.refresh_token
                    };
                }

                //------------------------------------------------------------------------

                await model.confluence.update(inputSaveData, { where: { user_id: req.query.state } });
                res.render('confluence/confluence-auth-success.html');
            } else {

            }

        } else {
            res.send({ status: 501, msg: "confluence auth token api error" })
        }
    };

    //--------------------Webhooks-------------------------
    module.pageCreatedWebhook = async function (req, res) {
        if (userData2.mainpage_create == 1 && userData2.notifications == 'On') {
            let userName = await confluenceHelper.getUserName(req.body.userAccountId, userData);
            const urlString = req.body.page.self;
            let text = `${userName} created a new Page '${req.body.page.title}'.\nURL: ${urlString}`
            confluenceHelper.handleWebhook(req, model, text, urlString);
        }
        else {

        }
    };
    module.pageUpdatedWebhook = async function (req, res) {
        if (userData2.mainpage_update == 1 && userData2.notifications == 'On') {
            let userName = await confluenceHelper.getUserName(req.body.userAccountId, userData);
            const urlString = req.body.page.self;
            let text = `${userName} updated a Page '${req.body.page.title}'.\nURL: ${urlString}`
            console.log(text);
            confluenceHelper.handleWebhook(req, model, text, urlString);
        }
        else {

        }
    };
    module.blogCreatedWebhook = async function (req, res) {
        if (userData2.blog_create == 1 && userData2.notifications == 'On') {
            let userName = await confluenceHelper.getUserName(req.body.userAccountId, userData);
            const urlString = req.body.blog.self;
            let text = `${userName} created a new Blog '${req.body.blog.title}'.\nURL: ${urlString}`
            confluenceHelper.handleWebhook(req, model, text, urlString);
        }
        else {

        }
    };
    module.commentCreatedWebhook = async function (req, res) {
        if (userData2.mainpage_comment == 1 && userData2.notifications == 'On') {
            let userName = await confluenceHelper.getUserName(req.body.userAccountId, userData);
            const urlString = req.body.comment.parent.self;
            let text = `${userName} passed a comment on '${req.body.comment.parent.title}' (${req.body.comment.parent.contentType}).\nURL: ${urlString}`
            confluenceHelper.handleWebhook(req, model, text, urlString);
        }
        else {

        }
    };
    return module;
}