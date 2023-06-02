const helper = require("../helpers/functions");
const switHelper = require('../helpers/swit')
const { URL } = require('url');
const urlParse = require('url-parse');
const { default: axios } = require("axios");
let rightPanelJson = require('../uijson/confluence/rightpanel.json');
const errorJson = require("../uijson/confluence/error.json")
const rightPanelShareJson = require("../uijson/confluence/rightPanelShare.json");
const userDataDictionary = {};
const confluenaddsubscriptionspaceJson = require('../uijson/confluence/addsubscriptionspace.json');
const confluenceaddSubscriptionJson = require('../uijson/confluence/addsubscription.json');
const conflueeditsubscriptionspaceJson = require('../uijson/confluence/editsubscriptionspace.json');
const conflueeditsubscriptionJson = require('../uijson/confluence/editsubscription.json');
module.exports = {
    storeUserData(userId, jsonData) {
        userDataDictionary[userId] = jsonData;
        console.log(userDataDictionary, "----stored----");
    },
    getUserData(userId) {
        return userDataDictionary[userId];
    },
    async dictionary(userId, jsonData, action) {
        if (action === "store") {
            this.storeUserData(userId, jsonData);
        } else if (action === "fetch") {
            const retrievedData = this.getUserData(userId);
            console.log(retrievedData, "----fetched----");
            return retrievedData;
        } else {
            console.log("Invalid action");
        }
    },
    async confluenceNewAccessToken(userData) {
        let headers = { 'Content-Type': 'application/json' };
        let data = {
            "grant_type": "refresh_token",
            "client_id": process.env.CONFLUENCE_CLIENT_ID,
            "client_secret": process.env.CONFLUENCE_CLIENT_SECRET,
            "refresh_token": userData.confluence_refresh_token
        }
        let response = await helper.postRequest(process.env.CONFLUENCE_TOKEN_API, data, headers);
        console.log(response, 'response');
        if (response?.data?.access_token && response?.data?.refresh_token) {
            return {
                confluence_token: response.data.access_token,
                confluence_refresh_token: response.data.refresh_token
            }
        } else {
            return null;
        }

    },
    async handleRightPanelSearch(params, userData) {
        try {
            console.log(params, "---------params--------")
            // console.log(userData)
            //--------------------type selection---------------------------

            if (params.user_action.type == "view_actions.input" && (params.user_action.id.includes('type') || params.user_action.id.includes(',space'))) {
                let userJson = await this.dictionary(userData.user_id, null, "fetch");

                console.log(params.current_view.body.elements[0].value)
                let value = [];
                value[0] = params.current_view.body.elements[0].value[0];
                let spaceSplit = value[0].split(",")
                let spaceKeys = [];
                spaceKeys[0] = spaceSplit[0];
                console.log(spaceKeys)
                console.log(params.current_view.body.elements[1].elements[0].value)

                //-----------------initialising finalSearchAPI------------------
                let finalSearchAPI = process.env.CONFLUENCE_API_DOMAIN + userData.confluence_cloud_id + '/wiki/rest/api/content/search?' + 'cql=space in ';
                finalSearchAPI = finalSearchAPI + '(' + `${spaceKeys}` + ')';
                console.log("API after getting spaceKeys", finalSearchAPI);

                userJson.new_view.body.elements[0].options.finalSearchAPI = finalSearchAPI;
                await this.dictionary(userData.user_id, userJson, "store");

                // let spaceIDs = await this.getSpaceIDs(spaceKeys, userData);
                console.log("---------Type selection----------");
                let requestBody = params;
                if (requestBody.user_action.id == "Page-type-action_id" || (requestBody.current_view.body.elements[1].elements[0].value == "Page-type-action_id" && requestBody.user_action.id.includes('space') )) {
                    let userJson = await this.dictionary(userData.user_id, null, "fetch");
                    console.log(userJson.new_view.body.elements[0])
                    userJson.new_view.body.elements[1].elements[0].value = params.current_view.body.elements[1].elements[0].value;
                    userJson.new_view.body.elements[0].options.finalSearchAPI = userJson.new_view.body.elements[0].options.finalSearchAPI + ' and type=page';
                    console.log("API after type selection", userJson.new_view.body.elements[0].options.finalSearchAPI);
                    let labelsForPages = await this.setLabelsForPages(userJson.new_view.body.elements[0].options.finalSearchAPI, userData, userJson);
                    let labelsForPages1 = await this.encdecAPI(labelsForPages, userData);
                    let json = await this.setSearch(userData, labelsForPages1);
                    await this.dictionary(userData.user_id, json, "store");

                }
                else if (requestBody.user_action.id == "Blogpost-type-action_id" || (requestBody.current_view.body.elements[1].elements[0].value == "Blogpost-type-action_id" && requestBody.user_action.id.includes('space'))) {
                    let userJson = await this.dictionary(userData.user_id, null, "fetch");
                    userJson.new_view.body.elements[1].elements[0].value = params.current_view.body.elements[1].elements[0].value;
                    userJson.new_view.body.elements[0].options.finalSearchAPI = userJson.new_view.body.elements[0].options.finalSearchAPI + ' and type=blogpost';
                    console.log("API after type selection", userJson.new_view.body.elements[0].options.finalSearchAPI);
                    let labelsForBlogposts = await this.setLabelsForBlogposts(userJson.new_view.body.elements[0].options.finalSearchAPI, userData, userJson);
                    let labelsForBlogposts1 = await this.encdecAPI(labelsForBlogposts, userData);
                    let json = await this.setSearch(userData, labelsForBlogposts1);
                    await this.dictionary(userData.user_id, json, "store");

                }
                else if (requestBody.user_action.id == "Attachment-type-action_id" || (requestBody.current_view.body.elements[1].elements[0].value == "Attachment-type-action_id" && requestBody.user_action.id.includes('space'))) {
                    let userJson = await this.dictionary(userData.user_id, null, "fetch");
                    let labelsForAttachments = await this.setLabelsForAttachments(userJson.new_view.body.elements[0].options.finalSearchAPI, userData, userJson);
                    labelsForAttachments.new_view.body.elements[1].elements[0].value = params.current_view.body.elements[1].elements[0].value;
                    labelsForAttachments.new_view.body.elements[0].options.finalSearchAPI = labelsForAttachments.new_view.body.elements[0].options.finalSearchAPI + ' and type=attachment';
                    console.log("API after type selection", labelsForAttachments.new_view.body.elements[0].options.finalSearchAPI);
                    let labelsForAttachments1 = await this.encdecAPI(labelsForAttachments, userData);
                    let json = await this.setSearch(userData, labelsForAttachments1);
                    await this.dictionary(userData.user_id, json, "store");

                }
                else if (requestBody.user_action.id == "Comment-type-action_id" || (requestBody.current_view.body.elements[1].elements[0].value == "Comment-type-action_id" && requestBody.user_action.id.includes('space'))) {
                    let userJson = await this.dictionary(userData.user_id, null, "fetch");
                    userJson.new_view.body.elements[1].elements[0].value = params.current_view.body.elements[1].elements[0].value;
                    userJson.new_view.body.elements[0].options.finalSearchAPI = userJson.new_view.body.elements[0].options.finalSearchAPI + ' and type=comment';
                    console.log("API after type selection", userJson.new_view.body.elements[0].options.finalSearchAPI);
                    let labelsForComments = await this.setLabelsForComments(userData, userJson);
                    let labelsForComments1 = await this.encdecAPI(labelsForComments, userData);
                    let json = await this.setSearch(userData, labelsForComments1);
                    await this.dictionary(userData.user_id, json, "store");
                }
                let typeJson = await this.dictionary(userData.user_id, null, "fetch");
                typeJson.new_view.body.elements[0].value = value;
                await this.dictionary(userData.user_id, typeJson, "store");
                // if (userJson.new_view.body.elements[0].options[0] == typeJson.new_view.body.elements[0].options[0]) {
                //     return typeJson;
                // } else {
                //     let newJson = await this.newJson(userData, typeJson);
                //     return newJson;
                // }
                return typeJson;
            }

            //---------------------label selection---------------------------
            if (params.user_action.type == "view_actions.input" && params.user_action.id.includes('label')) {
                let json = await this.dictionary(userData.user_id, null, "fetch");
                let userJson = await this.encdecAPI(json, userData);
                console.log("---------Inside Label selection----------");
                let labelSplit = params.user_action.id.split(",");

                if ((userJson.new_view.body.elements[0].options.finalSearchAPI.search(/and label=/i)) != -1) {
                    let originalUrl = userJson.new_view.body.elements[0].options.finalSearchAPI;
                    const [baseUrl, queryString] = originalUrl.split('?');
                    const params1 = queryString.split('and');
                    console.log(params1);
                    const modifiedParams = params1.map(element => {
                        if (element.startsWith('label=') || element.startsWith(' label=')) {
                            return ` label='${labelSplit[0]}' `;
                        }
                        return element;
                    });
                    const modifiedUrl = baseUrl + '?' + modifiedParams.join('and');
                    console.log(modifiedUrl, '--------modifiedURL-------');
                    userJson.new_view.body.elements[0].options.finalSearchAPI = modifiedUrl;

                } else {
                    userJson.new_view.body.elements[0].options.finalSearchAPI = userJson.new_view.body.elements[0].options.finalSearchAPI + ` and label='${labelSplit[0]}'`;
                }
                userJson.new_view.body.elements[1].elements[1].value = params.current_view.body.elements[1].elements[1].value;
                console.log("API after label selection", userJson.new_view.body.elements[0].options.finalSearchAPI);
                let userJson1 = await this.encdecAPI(userJson, userData);
                let userJson2 = await this.setSearch(userData, userJson1);
                await this.dictionary(userData.user_id, userJson2, "store");
                // if (userJson.new_view.body.elements[0].options[0] == userJson2.new_view.body.elements[0].options[0]) {
                //     return userJson2;
                // } else {
                //     let newJson = await this.newJson(userData, typeJson);
                //     return newJson;
                // }
                return userJson2;
            }

            //---------------------after entering text for search---------------------------

            if (params.user_action.type == "view_actions.input" && params.user_action.id == 'Search') {
                console.log("---------Inside Search----------");
                let Json = await this.dictionary(userData.user_id, null, "fetch");
                let userJson = await this.encdecAPI(Json, userData);
                if ((userJson.new_view.body.elements[0].options.finalSearchAPI.search(/and text~/i) != -1) || (userJson.new_view.body.elements[0].options.finalSearchAPI.search(/ andtext~/i) != -1) || (userJson.new_view.body.elements[0].options.finalSearchAPI.search(/and+text~/i) != -1)) {
                    let originalUrl = userJson.new_view.body.elements[0].options.finalSearchAPI;
                    const [baseUrl, queryString] = originalUrl.split('?');
                    const params1 = queryString.split('and');
                    console.log(params1);
                    const modifiedParams = params1.map(element => {
                        if (element.startsWith('text~') || element.startsWith(' text~')) {
                            return ` text~"${params.user_action.value}"`;
                        }
                        return element;
                    });
                    const modifiedUrl = baseUrl + '?' + modifiedParams.join('and');
                    console.log(modifiedUrl, '--------modifiedURL-------');
                    userJson.new_view.body.elements[0].options.finalSearchAPI = modifiedUrl;
                } else {
                    userJson.new_view.body.elements[0].options.finalSearchAPI = userJson.new_view.body.elements[0].options.finalSearchAPI + ` and text~"${params.user_action.value}"`;
                }
                await this.dictionary(userData.user_id, userJson, "store");
                await this.setSearch(userData, userJson);
                let finalUserJson = await this.dictionary(userData.user_id, null, "fetch");
                return finalUserJson;
            }
            if (params.user_action.type == "view_actions.drop") {
                console.log(params.current_view.body.elements)
                let elements = params.current_view.body.elements;
                elements.forEach((element) => {
                    if (element.type == "list_item") {
                        if (params.user_action.id == element.action_id) {

                            let str1 = `${element.title}`;
                            let modifiedStr = str1.replace(/\s*\([^)]*\)/, "");
                            rightPanelShareJson.attachments[0].header.title = modifiedStr;

                            let str2 = `${element.title}`;
                            let extractedWord = str2.match(/\((.*?)\)/);
                            if (extractedWord && extractedWord.length > 1) {
                                rightPanelShareJson.attachments[0].header.subtitle = extractedWord[1];
                            } else {
                                rightPanelShareJson.attachments[0].header.subtitle = null;
                            }

                            let itemsArr = [];
                            itemsArr.push({
                                "label": "ID",
                                "text": {
                                    "type": "text",
                                    "markdown": true,
                                    "content": `${element.action_id}`
                                }
                            })
                            itemsArr.push({
                                "label": "Status",
                                "text": {
                                    "type": "text",
                                    "markdown": true,
                                    "content": `${element.subtitle.charAt(0).toUpperCase() + element.subtitle.slice(1)}`
                                }
                            })
                            itemsArr.push({
                                "label": "Link",
                                "text": {
                                    "type": "text",
                                    "markdown": true,
                                    "content": `[View on Confluence](${element.static_action.link_url})`
                                }
                            })
                            rightPanelShareJson.attachments[0].body.elements[0].items = itemsArr;
                        }
                    }
                })
                return rightPanelShareJson;
            }
        } catch (error) {
            console.log(error);
            res.send(errorJson);
        }
    },
    async setSearch(userData, userJson) {
        console.log("FINAL_SEARCH_API", userJson.new_view.body.elements[0].options.finalSearchAPI);
        console.log("------calling finalsearchapi------");
        let url = userJson.new_view.body.elements[0].options.finalSearchAPI + '&limit=200';
        let headers = {
            Authorization: `Bearer ${userData.confluence_token}`,
            "Accept": "application/json"
        };
        let finalSearchResponse = await helper.getRequest(url, headers);
        let results = finalSearchResponse.data.results;
        console.log(results, "------finalSearchResponse-----");

        let elements = userJson.new_view.body.elements;

        for (let i = elements.length - 1; i >= 0; i--) {
            if (elements[i].type === "list_item" || elements[i].type === "text") {
                elements.splice(i, 1);
                console.log("One Element popped");
            }
        }

        if (results.length == 0) {
            console.log("No matches found")
            userJson.new_view.body.elements.push({
                "type": "text",
                "markdown": true,
                "content": "**No matches found**"
            });
        } else {
            console.log("Pushing matches found")
            results.forEach((element) => {
                userJson.new_view.body.elements.push({
                    "type": "list_item",
                    "action_id": `${element.id}`,
                    "title": `${element.title.charAt(0).toUpperCase() + element.title.slice(1)} (${element.type.charAt(0).toUpperCase() + element.type.slice(1)})`,
                    "subtitle": `${element.status.charAt(0).toUpperCase() + element.status.slice(1)}`,
                    "snippet": "",
                    "icon": {
                        "type": "image",
                        "image_url": "https://swtio-bck-dev.dvconsulting.org/assets/image/confluenceLogo.jpg",
                        "shape": "circular"
                    },
                    "static_action": {
                        "action_type": "open_link",
                        "link_url": `${userData.confluence_domain}/wiki${element._links.webui}`
                    },
                    "draggable": true
                })
                console.log("1 item pushed")
            })
        }
        await this.dictionary(userData.user_id, userJson, "store");
        let userJson1 = await this.dictionary(userData.user_id, null, "fetch")
        return userJson1;
    },
    async setInitialSearch(userData, userJson) {
        userJson = await this.dictionary(userData.user_id, null, "fetch");
        console.log("------calling initialSearchApi------");
        let url = userJson.new_view.body.elements[0].options.initialSearchAPI + '&limit=200';
        let headers = {
            Authorization: `Bearer ${userData.confluence_token}`,
            "Accept": "application/json"
        };
        let initialSearchResponse = await helper.getRequest(url, headers);
        let results = initialSearchResponse.data.results;
        console.log(results, "------initialSearchResponse-----");

        let elements = userJson.new_view.body.elements;

        for (let i = elements.length - 1; i >= 0; i--) {
            if (elements[i].type === "list_item" || elements[i].type === "text") {
                elements.splice(i, 1);
                console.log("One Element popped");
            }
        }

        if (results.length == 0) {
            console.log("No matches found")
            userJson.new_view.body.elements.push({
                "type": "text",
                "markdown": true,
                "content": "**No matches found**"
            });
        } else {
            console.log("Pushing matches found")
            results.forEach((element) => {
                userJson.new_view.body.elements.push({
                    "type": "list_item",
                    "action_id": `${element.id}`,
                    "title": `${element.title.charAt(0).toUpperCase() + element.title.slice(1)} (${element.type.charAt(0).toUpperCase() + element.type.slice(1)})`,
                    "subtitle": `${element.status.charAt(0).toUpperCase() + element.status.slice(1)}`,
                    "snippet": "",
                    "icon": {
                        "type": "image",
                        "image_url": "https://swtio-bck-dev.dvconsulting.org/assets/image/confluenceLogo.jpg",
                        "shape": "circular"
                    },
                    "static_action": {
                        "action_type": "open_link",
                        "link_url": `${userData.confluence_domain}/wiki${element._links.webui}`
                    },
                    "draggable": true
                })
            })
        }
        await this.dictionary(userData.user_id, userJson, "store");
        let labelForPage = await this.setLabelsForPages(url, userData, userJson);
        labelForPage.new_view.body.elements[0].options.finalSearchAPI = labelForPage.new_view.body.elements[0].options.initialSearchAPI;
        await this.dictionary(userData.user_id, labelForPage, "store");
    },
    async encdecAPI(userJsonn, userData) {
        // console.log(rightPanelJson.new_view.body.elements[0].options.finalSearchAPI);
        let encode = userJsonn.new_view.body.elements[0].options.finalSearchAPI;
        console.log(encode, "----decoding----")
        let decode = decodeURIComponent(encode);
        userJsonn.new_view.body.elements[0].options.finalSearchAPI = decode;
        console.log(decode, "----decoded----")
        await this.dictionary(userData.user_id, userJsonn, "store");
        return userJsonn;
    },
    async getSpaceIDs(spaceKeys, userData) {
        let spaceIDs = [];
        const p1 = Promise.all(spaceKeys.map(async (element) => {
            const spaceKeyAPI = `${process.env.CONFLUENCE_API_DOMAIN}${userData.confluence_cloud_id}/wiki/rest/api/space/${element}`;
            const headers = {
                Authorization: `Bearer ${userData.confluence_token}`,
                "Accept": "application/json"
            };
            const responseSpaceObj = await helper.getRequest(spaceKeyAPI, headers);
            return responseSpaceObj.data;
        }));

        const p2 = p1.then((responseSpace) => {
            spaceIDs = responseSpace.map(element => element.id);
            console.log(spaceIDs, "--------spaceIDs-------");
        });

        await Promise.all([p1, p2]);
        console.log("All promises in getSpaceIDs resolved");
        return spaceIDs;

    },
    async reloadRightPanelSearch(userData) {
        let userJson = await this.dictionary(userData.user_id, null, "fetch");
        console.log(userJson.new_view.body.elements)
        await this.setSearch(userData, userJson);
        let reloadedJson = await this.dictionary(userData.user_id, null, "fetch");
        return reloadedJson;
    },
    async resetRightPanel() {
        rightPanelJson.new_view.body.elements[0] = {
            "type": "select",
            "placeholder": "Select Space",
            "multiselect": false,
            "trigger_on_input": true,
            "options": []
        };
        rightPanelJson.new_view.body.elements[1] = {
            "type": "container",
            "elements": [
                {
                    "type": "select",
                    "placeholder": "Select Category",
                    "multiselect": false,
                    "trigger_on_input": true,
                    "options": [
                        {
                            "label": "Page",
                            "action_id": "Page-type-action_id"
                        },
                        {
                            "label": "BlogPost",
                            "action_id": "Blogpost-type-action_id"
                        },
                        {
                            "label": "Comment",
                            "action_id": "Comment-type-action_id"
                        },
                        {
                            "label": "Attachment",
                            "action_id": "Attachment-type-action_id"
                        }
                    ]
                },
                {
                    "type": "select",
                    "placeholder": "Select Label",
                    "multiselect": false,
                    "trigger_on_input": true,
                    "options": []
                }
            ]
        };
        rightPanelJson.new_view.body.elements[2] = {
            "type": "text_input",
            "action_id": "Search",
            "placeholder": "Search...",
            "trigger_on_input": true
        }
    },
   
    async rightPanelSearch(userData) {
        await this.resetRightPanel();
        //----------------get and set spaces------------------
        await this.dictionary(userData.user_id, rightPanelJson, "store");
        let spaceList = await this.getSpaceList(userData);
        console.log(spaceList, "---------spaceList---------");
        if (spaceList) {
            let optionSpaceList = [];
            spaceList.forEach((element, index) => {
                if (element.type == 'global') {
                    optionSpaceList.push(
                        {
                            "label": element.name,
                            "action_id": `${element.key},space`
                        },
                    );
                }
            });
            console.log(optionSpaceList, "------Spacelist1------");
            //-----------Set fields------------
            let json = await this.dictionary(userData.user_id, null, "fetch");
            json.new_view.body.elements[0].options = optionSpaceList;
            json.new_view.body.elements[0].value = [optionSpaceList[0].action_id];
            json.new_view.body.elements[1].elements[0].value = ["Page-type-action_id"];
            json.new_view.body.elements[1].elements[1].value = [];
            json.new_view.body.elements[2].value = '';
            let initialSearchAPI = process.env.CONFLUENCE_API_DOMAIN + userData.confluence_cloud_id + `/wiki/rest/api/content/search?cql=space in (${optionSpaceList[0].action_id}) and type=page`;
            console.log(initialSearchAPI, "----------initialSearchAPI----------");
            json.new_view.body.elements[0].options.initialSearchAPI = initialSearchAPI;
            await this.dictionary(userData.user_id, json, "store");
            await this.setInitialSearch(userData, json);
            let freshJson = await this.dictionary(userData.user_id, null, "fetch");
            console.log("---------initial return of rightPanelJson--------")

            console.log(freshJson.new_view.body.elements[0].options, "--------Spacelist2-------");
            // if (optionSpaceList[0] == freshJson.new_view.body.elements[0].options[0]) {
            //     return freshJson;
            // } else {
            //     let newJson = await this.newJson(userData, typeJson);
            //     return newJson;
            // }
            return freshJson;
        }
    },
    async getSpaceList(userData) {
        let url = process.env.CONFLUENCE_API_DOMAIN + userData.confluence_cloud_id + '/rest/api/space';
        let headers = {
            Authorization: `Bearer ${userData.confluence_token}`,
            "Accept": "application/json"
        };
        let response = await helper.getRequest(url, headers);
        let spaces = response.data.results;
        return spaces;
    },
    // async newJson(userData, json) {
    //     json.new_view.body.elements[0].options = [];
    //     let spaceList = this.getSpaceList(userData);
    //     if (spaceList) {
    //         let optionSpaceList = [];
    //         spaceList.forEach((element, index) => {
    //             if (element.type == 'global') {
    //                 optionSpaceList.push(
    //                     {
    //                         "label": element.name,
    //                         "action_id": `${element.key},space`
    //                     },
    //                 );
    //             }
    //         });
    //         json.new_view.body.elements[0].options = optionSpaceList;
    //         return json;
    //     }
    // },
    async setLabelsForComments(userData, userJson) {
        userJson.new_view.body.elements[1].elements[1].options = [];
        await this.dictionary(userData.user_id, userJson, "store");
        return userJson;
    },
    async setLabelsForPages(api, userData, userJson) {
        const p1 = async () => {
            const url = api + `&limit=200`;
            const headers = {
                Authorization: `Bearer ${userData.confluence_token}`,
                "Accept": "application/json"
            };

            const pageResponse = await helper.getRequest(url, headers);
            return pageResponse.data.results;
        };

        const pageResults = await p1();

        const labelPromises = pageResults.map(async (page) => {
            const url = process.env.CONFLUENCE_API_DOMAIN + userData.confluence_cloud_id + '/wiki/api/v2/pages/' + page.id + '/labels';
            const headers = {
                Authorization: `Bearer ${userData.confluence_token}`,
                "Accept": "application/json"
            };

            const labelResponse = await helper.getRequest(url, headers);
            return labelResponse.data.results;
        });

        const labelResponses = await Promise.all(labelPromises);
        const labels = labelResponses.flatMap(response => response.map(label => label.name));

        if (labels.length > 0) {
            const options = labels.map((element) => ({
                label: element,
                action_id: `${element},label`
            }));
            userJson.new_view.body.elements[1].elements[1].options = options;
        }
        console.log("All promises in setLabelsForPages resolved");
        return userJson;
    },
    async setLabelsForBlogposts(api, userData, userJson) {
        const p1 = async () => {
            const url = api + '&limit=200';
            const headers = {
                Authorization: `Bearer ${userData.confluence_token}`,
                "Accept": "application/json"
            };
            const blogpostResponse = await helper.getRequest(url, headers);
            return blogpostResponse.data.results;
        };
        const blogpostResults = await p1();
        const labelPromises = blogpostResults.map(async (blogpost) => {
            const url = process.env.CONFLUENCE_API_DOMAIN + userData.confluence_cloud_id + '/wiki/api/v2/blogposts/' + blogpost.id + '/labels';
            const headers = {
                Authorization: `Bearer ${userData.confluence_token}`,
                "Accept": "application/json"
            };
            const labelResponse = await helper.getRequest(url, headers);
            return labelResponse.data.results;
        });
        const labelResponses = await Promise.all(labelPromises);
        console.log(labelResponses, "----------labelResponses--------")
        const labels = labelResponses.flatMap(response => response.map(label => label.name));
        console.log(labels, "-------labels--------")
        const options = labels.map((element) => ({
            label: element,
            action_id: `${element},label`
        }));
        userJson.new_view.body.elements[1].elements[1].options = options;
        console.log("All promises in setLabelsForBlogposts resolved");
        return userJson;
    },
    async setLabelsForAttachments(api, userData, userJson) {
        const p1 = async () => {
            const url = api + ' and type=page&limit=200';
            const headers = {
                Authorization: `Bearer ${userData.confluence_token}`,
                "Accept": "application/json"
            };
            const pageResponse = await helper.getRequest(url, headers);
            return pageResponse.data.results;
        };
        const p2 = p1().then((pageResults) => {
            const pages = [];
            for (const page of pageResults) {
                pages.push(page.id);
            }
            const attachmentPromises = pages.map(async (element) => {
                const url = `${process.env.CONFLUENCE_API_DOMAIN}${userData.confluence_cloud_id}/wiki/api/v2/pages/${element}/attachments`;
                const headers = {
                    Authorization: `Bearer ${userData.confluence_token}`,
                    "Accept": "application/json"
                };
                const attachmentResponse = await helper.getRequest(url, headers);
                return attachmentResponse.data.results;
            });
            return Promise.all(attachmentPromises);
        }).then((attachmentResults) => {
            const attachments = [];
            const labelPromises = [];
            for (const attachmentResult of attachmentResults) {
                for (const attachment of attachmentResult) {
                    attachments.push(attachment.id);
                    const url = `${process.env.CONFLUENCE_API_DOMAIN}${userData.confluence_cloud_id}/wiki/api/v2/attachments/${attachment.id}/labels`;
                    const headers = {
                        Authorization: `Bearer ${userData.confluence_token}`,
                        "Accept": "application/json"
                    };
                    labelPromises.push(helper.getRequest(url, headers));
                }
            }
            return Promise.all(labelPromises).then((labelResponses) => {
                const labels = [];
                for (const labelResponse of labelResponses) {
                    for (const label of labelResponse.data.results) {
                        labels.push(label.name);
                    }
                }
                if (labels.length > 0) {
                    const options = labels.map((element) => ({
                        label: element,
                        action_id: `${element},label`
                    }));
                    userJson.new_view.body.elements[1].elements[1].options = options;
                }
                return userJson;
            });
        });
        await Promise.all([p1(), p2]);
        console.log("All promises in setLabelsForAttachments resolved");
        return userJson;
    },
    async resetRightPanel() {
        rightPanelJson.new_view.body.elements[0] = {
            "type": "select",
            "placeholder": "Select Space",
            "multiselect": false,
            "trigger_on_input": true,
            "options": []
        };
        rightPanelJson.new_view.body.elements[1] = {
            "type": "container",
            "elements": [
                {
                    "type": "select",
                    "placeholder": "Select Category",
                    "multiselect": false,
                    "trigger_on_input": true,
                    "options": [
                        {
                            "label": "Page",
                            "action_id": "Page-type-action_id"
                        },
                        {
                            "label": "BlogPost",
                            "action_id": "Blogpost-type-action_id"
                        },
                        {
                            "label": "Comment",
                            "action_id": "Comment-type-action_id"
                        },
                        {
                            "label": "Attachment",
                            "action_id": "Attachment-type-action_id"
                        }
                    ]
                },
                {
                    "type": "select",
                    "placeholder": "Select Label",
                    "multiselect": false,
                    "trigger_on_input": true,
                    "options": []
                }
            ]
        };
        rightPanelJson.new_view.body.elements[2] = {
            "type": "text_input",
            "action_id": "Search",
            "placeholder": "Search...",
            "trigger_on_input": true
        }
    },
    async confluenceNewAccessToken(userData) {
        let headers = { 'Content-Type': 'application/json' };
        let data = {
            "grant_type": "refresh_token",
            "client_id": process.env.CONFLUENCE_CLIENT_ID,
            "client_secret": process.env.CONFLUENCE_CLIENT_SECRET,
            "refresh_token": userData.confluence_refresh_token
        }
        let response = await helper.postRequest(process.env.CONFLUENCE_TOKEN_API, data, headers);
        console.log(response, 'response');
        if (response?.data?.access_token && response?.data?.refresh_token) {
            return {
                confluence_token: response.data.access_token,
                confluence_refresh_token: response.data.refresh_token
            }
        } else {
            return null;
        }

    },
    async getUserName(accountId, userData) {
        let url = process.env.CONFLUENCE_API_DOMAIN + userData.confluence_cloud_id + '/wiki/rest/api/user?accountId=' + accountId;
        let headers = {
            Authorization: `Bearer ${userData.confluence_token}`,
            "Accept": "application/json"
        };
        let userResponse = await helper.getRequest(url, headers);
        return userResponse.data.displayName;
    },
    async handleWebhook(req, model, text, urlString) {
        console.log(urlString, "-------urlString-------")
        const parsedUrl = new urlParse(urlString);
        const baseURL = 'https://' + parsedUrl.hostname;
        let userData = await model.confluence.findOne({ where: { 'confluence_domain': baseURL }, raw: true });
        await switHelper.sendMessageToSelectedChannel(userData, text);
        console.log("Message sent to Swit Channel");
    },
    async sendSwitConfluenceMessage(msg, attachmentImage, switToken, swit_channel) {
        const headers = {
            Authorization: `Bearer ${switToken}`,
        };

        let data = {
            attachments: [
                {
                    attachment_type: "custom",
                    values: attachmentImage,
                },
            ],
            // channel_id: "230328063060HWvqsvk",
            channel_id: swit_channel,
            content: msg,
        };
        console.log(data.attachments[0].values, '------------swit msg data55555--------');
        console.log(headers, '------------swit msg header data55555--------');
        axios
            .post("https://openapi.swit.io/v1/api/message.create", data, {
                headers: headers,
            })
            .then(() => {
                console.log("data sent 2");
            })
            .catch((err) => {
                console.log("data sending error 2", err.response.data);
            });
    },

    // Validate add connect space
    async validateAddconnectspace(reqFormData) {
        let validationMessage = [];
        reqFormData.forEach((value, key) => {
            console.log("value validation5555", value);
            if (
                value.type == "text_input" &&
                value.placeholder == "Enter url" &&
                !value.value
            ) {
                validationMessage.push("Name");
            } else if (
                value.type == "select" &&
                value.placeholder == "Select an item" &&
                !value.value
            ) {
                validationMessage.push("Priority");
            }
        });
        if (validationMessage.length > 0) {
            let validationDealJSON = JSON.parse(JSON.stringify(confluenaddsubscriptionspaceJson));
            validationDealJSON.callback_type = "views.update";
            validationDealJSON.new_view.header.subtitle = "**Please fill up mandatory fields and try again!**"
            return validationDealJSON;
        } else {
            return false;
        }
    },

    async validateAddconnectpages(reqFormData) {
        let validationMessage = [];
        reqFormData.forEach((value, key) => {
            console.log("value validation5555", value);
            if (
                value.type == "text_input" &&
                value.placeholder == "Enter url" &&
                !value.value
            ) {
                validationMessage.push("Name");
            } else if (
                value.type == "select" &&
                value.placeholder == "Select an item" &&
                !value.value
            ) {
                validationMessage.push("Priority");
            }
        });
        if (validationMessage.length > 0) {
            let validationDealJSON = JSON.parse(JSON.stringify(confluenceaddSubscriptionJson));
            validationDealJSON.callback_type = "views.update";
            validationDealJSON.new_view.header.subtitle = "**Please fill up mandatory fields and try again!**"
            return validationDealJSON;
        } else {
            return false;
        }
    },

    async validateEditconnectspace(reqFormData) {
        let validationMessage = [];
        reqFormData.forEach((value, key) => {
            console.log("value validation5555", value);
            if (
                value.type == "select" &&
                value.placeholder == "Select an item" &&
                !value.value
            ) {
                validationMessage.push("Priority");
            }
        });
        if (validationMessage.length > 0) {
            let validationDealJSON = JSON.parse(JSON.stringify(conflueeditsubscriptionspaceJson));
            validationDealJSON.callback_type = "views.update";
            validationDealJSON.new_view.header.subtitle = "**Please select atleast one notification event!**"
            return validationDealJSON;
        } else {
            return false;
        }
    },

    async validateEditconnectpage(reqFormData) {
        let validationMessage = [];
        reqFormData.forEach((value, key) => {
            console.log("value validation5555", value);
            if (
                value.type == "select" &&
                value.placeholder == "Select an item" &&
                !value.value
            ) {
                validationMessage.push("Priority");
            }
        });
        if (validationMessage.length > 0) {
            let validationDealJSON = JSON.parse(JSON.stringify(conflueeditsubscriptionJson));
            validationDealJSON.callback_type = "views.update";
            validationDealJSON.new_view.header.subtitle = "**Please select atleast one notification event!**"
            return validationDealJSON;
        } else {
            return false;
        }
    }
};