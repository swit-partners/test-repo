const helper = require("../helpers/functions");
var FormData = require("form-data");
const hubspotHelper = require("../helpers/hubspot");
const switHelper = require("../helpers/swit");
const { default: axios } = require("axios");
const createContactJSON = require("../uijson/hubspot/create-contact.json");
const createMEventJSON = require("../uijson/hubspot/create-mevent.json");
const createTicketJSON = require("../uijson/hubspot/create-ticket.json");
const createDealJSON = require("../uijson/hubspot/create-deal.json");
const sendSearchDataJSON = require("../uijson/hubspot/send-search-data.json");
const logoutJSON = require("../uijson/hubspot/logout.json");
const rightPanelJSON = require("../uijson/hubspot/hubspot-right-panel-list.json");
const rightPanelLoginJSON = require("../uijson/hubspot/right-panel-login.json");
const clickEventJSON = require("../uijson/hubspot/click-details.json")
const fs = require("fs");
const path = require("path");

// async function sendSwitMessage(msg, switToken) {
//   const headers = {
//     Authorization: `Bearer ${switToken}`,
//   };

//   let data = {
//     // channel_id: "230328063060HWvqsvk",
//     channel_id: process.env.SWIT_CHANNEL,
//     content: msg,
//   };

//   axios
//     .post("https://openapi.swit.io/v1/api/message.create", data, {
//       headers: headers,
//     })
//     .then(() => {
//       console.log("data sent 2");
//     })
//     .catch((err) => {
//       console.log("data sending error 2", err.response.data);
//     });
// }

async function sendSwitMessage(msg, attachmentImage, switToken, channel_id) {
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
    channel_id: `${channel_id}`,
    content: msg,
  };

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
}

module.exports = function (model, config) {
  var module = {};

  module.hubspotLogin = async function (req, res) {
    let responseToken = await switHelper.setSwitTokenUser(
      req.query.code,
      process.env.SWIT_HUBSPOT_AUTH_GRANT_TYPE,
      process.env.SWIT_HUBSPOT_CLIENT_ID,
      process.env.SWIT_HUBSPOT_CLIENT_SECRET,
      process.env.SWIT_HUBSPOT_REDIRECT_URI
    );
    if (!responseToken) {
      res.send({ status: 500, msg: "user code not found" });
    }

    //-----------------handle if user data not fetched -------------------
    let userJson = await helper.parseJwt(responseToken);
    console.log(userJson, "------------userJson-----------");

    let switUser;
    //  if (req.session.login_user_id) {
    //      switUser = req.session.login_user_id
    //  } else {
    switUser = userJson.sub;
    //}
    console.log(switUser, "----------switUser--------------id");

    let switUserFind = await model.Hubspot.findOne({
      where: { swit_user_id: switUser },
    });
    console.log(switUserFind, "-------------switUserFind----------");
    if (!switUserFind) {
      await model.Hubspot.create({
        swit_user_id: switUser,
        swit_token: responseToken,
        swit_code: req.query.code,
      });
    } else {
      switUserFind.update({
        swit_token: responseToken,
        swit_code: req.query.code,
      });
    }
    req.session.user_id = switUser;
    res.render("hubspot/hubspot-auth", {
      auth: req.session,
      user_id: switUser,
    });
  };

  module.hubspotAuth = async function (req, res) {
    console.log(req.query, "req--------------------hubspot-----------------");
    let hubspotAuthCode = req.query.code;
    if (hubspotAuthCode) {
      // ----------------generate token using code-------------------------
      var params = new URLSearchParams();
      // params.append("grant_type", "authorization_code");
      // params.append("client_id", "b2c27f74-70dc-4b20-91bd-b9148f23cfb2");
      // params.append("client_secret", "965a262d-641b-4700-9e37-221f4bcac1c3");
      // params.append(
      //   "redirect_uri",
      //   "http://localhost:3000/hubspot-auth-proceed"
      // );
      params.append("grant_type", process.env.HUBSPOT_AUTH_GRANT_TYPE);
      params.append("client_id", process.env.HUBSPOT_CLIENT_ID);
      params.append("client_secret", process.env.HUBSPOT_CLIENT_SECRET);
      params.append("redirect_uri", process.env.HUBSPOT_REDIRECT_URI);
      params.append("code", hubspotAuthCode);
      let response = await helper.postRequest(
        "https://api.hubapi.com/oauth/v1/token",
        params
      );
      if (response?.data?.access_token) {
        let resUserInfo = await helper.getRequest(
          `https://api.hubapi.com/oauth/v1/access-tokens/${response?.data?.access_token}`
        );
        console.log("resUserInfo", resUserInfo?.data);
        if (resUserInfo?.data) {
          // req.session = { userid: resUserInfo?.data?.user_id };
          let hubspotUserFind = await model.Hubspot.findOne({
            where: { swit_user_id: req.query.state },
            raw: true,
          });
          if (!hubspotUserFind) {
            await model.Hubspot.create({
              hubspot_user_id: resUserInfo?.data?.user_id,
              hubspot_token: resUserInfo?.data?.token,
              user_email: resUserInfo?.data?.user,
              hubspot_refresh_token: response?.data?.refresh_token,
            });
          } else {
            await model.Hubspot.update(
              {
                hubspot_user_id: resUserInfo?.data?.user_id,
                user_email: resUserInfo?.data?.user,
                hubspot_token: resUserInfo?.data?.token,
                hubspot_refresh_token: response?.data?.refresh_token,
              },
              { where: { swit_user_id: req.query.state } }
            );
          }
        }
        // res.render("hubspot-auth-success.html");
        res.send("<script>window.close()</script>")
      } else {
        console.log("error in hubspot auth", response);
      }
    }
  };

  module.userActions = async function (req, res) {
    console.log(req.body, "req.body-----------------");

    let switReq = req.body;
    let switUserId = switReq?.user_info?.user_id;
    console.log(switUserId, "switUserId");

    let userData;
    if (switUserId) {
      userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
    }
    //-----------------------------Check for user token & data----------------------------------------

    let userCheck = await switHelper.checkSwitUserForHubSpot(req, userData);
    if (userCheck) {
      req.session.login_user_id = switUserId;
      res.send(userCheck);
      return;
    }

    // For contact search
    if (
      req.body?.user_action?.id == "hs-search-contact" &&
      req.body?.user_action?.slash_command.includes("/hs-search-contact")
    ) {
      let searchData = req.body?.user_action?.slash_command.split(" ");
      searchData.shift();
      searchData = searchData.join(" ");
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let searchContactData = await hubspotHelper.searchContactRequest(
        searchData,
        userData
      );
      let message = "Contact Data fetched successfully.";
      let searchJSON = sendSearchDataJSON;
      searchJSON.attachments[0].header.title = "Contact Data";
      let contactData = [];
      if (searchContactData?.data?.results?.length > 0) {
        searchContactData?.data?.results?.forEach((contact, i) => {
          // message += ` First Name: ${contact.properties.firstname}, Last Name: ${contact.properties.lastname}, Email: ${contact.properties.email}`;
          let itemsArr = [
            {
              label: "First Name",
              text: {
                type: "text",
                markdown: false,
                content: contact.properties.firstname,
              },
            },
            {
              label: "Last Name",
              text: {
                type: "text",
                markdown: false,
                content: contact.properties.lastname,
              },
            },
            {
              label: "Email",
              text: {
                type: "text",
                markdown: false,
                content: contact.properties.email,
              },
            },
          ];
          contactData.push({
            type: "info_card",
            draggable: false,
            items: itemsArr,
          });
          if (
            searchContactData?.data?.results.length != 1 &&
            searchContactData?.data?.results.length !== i + 1
          ) {
            contactData.push({
              type: "divider",
            });
          }
        });
        searchJSON.attachments[0].body.elements = contactData;
        await sendSwitMessage(
          message,
          searchJSON.attachments,
          userData?.swit_token,
          req.body?.context?.channel_id
        );
      } else {
        message = "No contact data found.";
        await sendSwitMessage(message, [], userData?.swit_token, req.body?.context?.channel_id);
      }
      res.send({ callback_type: "views.close" });
    }

    // For company search
    if (
      req.body?.user_action?.id == "hs-search-company" &&
      req.body?.user_action?.slash_command.includes("/hs-search-company")
    ) {
      let searchData = req.body?.user_action?.slash_command.split(" ");
      searchData.shift();
      searchData = searchData.join(" ");
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let searchContactData = await hubspotHelper.searchCompanyRequest(
        searchData,
        userData
      );
      // console.log("searchContactData", searchContactData?.data);
      let message = "Company Data fetched successfully.";
      let searchJSON = sendSearchDataJSON;
      searchJSON.attachments[0].header.title = "Company Data";
      let searchCompanyData = [];

      if (searchContactData?.data?.results?.length > 0) {
        searchContactData?.data?.results?.forEach((company, i) => {
          let itemsArr = [
            {
              label: "Name",
              text: {
                type: "text",
                markdown: false,
                content: company.properties.name,
              },
            },
            {
              label: "Domain",
              text: {
                type: "text",
                markdown: false,
                content: company.properties.domain,
              },
            },
            {
              label: "Create Date",
              text: {
                type: "text",
                markdown: false,
                content: company.properties.createdate,
              },
            },
          ];
          searchCompanyData.push({
            type: "info_card",
            draggable: false,
            items: itemsArr,
          });
          if (
            searchContactData?.data?.results.length != 1 &&
            searchContactData?.data?.results.length !== i + 1
          ) {
            searchCompanyData.push({
              type: "divider",
            });
          }
        });
        searchJSON.attachments[0].body.elements = searchCompanyData;
        await sendSwitMessage(
          message,
          searchJSON.attachments,
          userData?.swit_token,
          req.body?.context?.channel_id
        );
      } else {
        message = "No company data found.";
        await sendSwitMessage(message, [], userData?.swit_token, req.body?.context?.channel_id);
      }
      res.send({ callback_type: "views.close" });
    }

    // For deal search
    if (
      req.body?.user_action?.id == "hs-search-deal" &&
      req.body?.user_action?.slash_command.includes("/hs-search-deal")
    ) {
      let searchData = req.body?.user_action?.slash_command.split(" ");
      searchData.shift();
      searchData = searchData.join(" ");
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let searchContactData = await hubspotHelper.searchDealRequest(
        searchData,
        userData
      );
      let message = "Deal data fetched successfully.";
      let searchJSON = sendSearchDataJSON;
      searchJSON.attachments[0].header.title = "Deal Data";
      let searchDealData = [];
      if (searchContactData?.data?.results?.length > 0) {
        searchContactData?.data?.results?.forEach((deal, i) => {
          let itemsArr = [
            {
              label: "Deal Name",
              text: {
                type: "text",
                markdown: false,
                content: deal.properties.dealname,
              },
            },
            {
              label: "Amount",
              text: {
                type: "text",
                markdown: false,
                content: deal.properties.amount,
              },
            },
            {
              label: "Close Date",
              text: {
                type: "text",
                markdown: false,
                content: deal.properties.closedate.split("T")[0],
              },
            },
          ];
          searchDealData.push({
            type: "info_card",
            draggable: false,
            items: itemsArr,
          });
          if (
            searchContactData?.data?.results.length != 1 &&
            searchContactData?.data?.results.length !== i + 1
          ) {
            searchDealData.push({
              type: "divider",
            });
          }
        });
        searchJSON.attachments[0].body.elements = searchDealData;
        await sendSwitMessage(
          message,
          searchJSON.attachments,
          userData?.swit_token,
          req.body?.context?.channel_id
        );
      } else {
        message = "No deal data found.";
        await sendSwitMessage(message, [], userData?.swit_token, req.body?.context?.channel_id);
      }
      res.send({ callback_type: "views.close" });
    }

    // For ticket search
    if (
      req.body?.user_action?.id == "hs-search-ticket" &&
      req.body?.user_action?.slash_command.includes("/hs-search-ticket")
    ) {
      let searchData = req.body?.user_action?.slash_command.split(" ");
      searchData.shift();
      searchData = searchData.join(" ");
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let searchContactData = await hubspotHelper.searchTicketRequest(
        searchData,
        userData
      );
      let message = "Ticket data fetched successfully.";
      let searchJSON = sendSearchDataJSON;
      searchJSON.attachments[0].header.title = "Ticket Data";
      let searchTicketData = [];
      if (searchContactData?.data?.results?.length > 0) {
        searchContactData?.data?.results?.forEach((ticket, i) => {
          let itemsArr = [
            {
              label: "Id",
              text: {
                type: "text",
                markdown: false,
                content: ticket.id,
              },
            },
            {
              label: "Ticket Name",
              text: {
                type: "text",
                markdown: false,
                content: ticket.properties.subject,
              },
            },
            {
              label: "Priority",
              text: {
                type: "text",
                markdown: false,
                content: ticket.properties.hs_ticket_priority,
              },
            },
          ];
          searchTicketData.push({
            type: "info_card",
            draggable: false,
            items: itemsArr,
          });
          if (
            searchContactData?.data?.results.length != 1 &&
            searchContactData?.data?.results.length !== i + 1
          ) {
            searchTicketData.push({
              type: "divider",
            });
          }
        });
        searchJSON.attachments[0].body.elements = searchTicketData;
        await sendSwitMessage(
          message,
          searchJSON.attachments,
          userData?.swit_token,
          req.body?.context?.channel_id
        );
      } else {
        message = "No ticket data found.";
        await sendSwitMessage(message, [], userData?.swit_token, req.body?.context?.channel_id);
      }
      res.send({ callback_type: "views.close" });
    }

    // For task search
    if (
      req.body?.user_action?.id == "hs-search-task" &&
      req.body?.user_action?.slash_command.includes("/hs-search-task")
    ) {
      let searchData = req.body?.user_action?.slash_command.split(" ");
      searchData.shift();
      searchData = searchData.join(" ");
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let searchTaskData = await hubspotHelper.searchTaskRequest(
        searchData,
        userData
      );
      let message = "Task data fetched successfully.";
      let searchJSON = sendSearchDataJSON;
      searchJSON.attachments[0].header.title = "Task Data";
      let taskData = [];
      if (searchTaskData?.data?.results?.length > 0) {
        searchTaskData?.data?.results?.forEach((task, i) => {
          let itemsArr = [
            {
              label: "Id",
              text: {
                type: "text",
                markdown: false,
                content: task.id,
              },
            },
            {
              label: "Subject",
              text: {
                type: "text",
                markdown: false,
                content: task.properties.hs_task_subject,
              },
            },
            {
              label: "Priority",
              text: {
                type: "text",
                markdown: false,
                content: task.properties.hs_task_priority,
              },
            },
            {
              label: "Status",
              text: {
                type: "text",
                markdown: false,
                content: task.properties.hs_task_status,
              },
            },
            {
              label: "Create Date",
              text: {
                type: "text",
                markdown: false,
                content: task.properties.hs_createdate,
              },
            },
            {
              label: "Modified Date",
              text: {
                type: "text",
                markdown: false,
                content: task.properties.hs_lastmodifieddate,
              },
            },
          ];
          taskData.push({
            type: "info_card",
            draggable: false,
            items: itemsArr,
          });
          if (
            searchTaskData?.data?.results.length != 1 &&
            searchTaskData?.data?.results.length !== i + 1
          ) {
            taskData.push({
              type: "divider",
            });
          }
        });
        searchJSON.attachments[0].body.elements = taskData;
        await sendSwitMessage(
          message,
          searchJSON.attachments,
          userData?.swit_token,
          req.body?.context?.channel_id
        );
      } else {
        message = "No task data found.";
        await sendSwitMessage(message, [], userData?.swit_token, req.body?.context?.channel_id);
      }
      res.send({ callback_type: "views.close" });
    }

    // For knowledge base article search
    if (
      req.body?.user_action?.id == "hs-search-kb-article" &&
      req.body?.user_action?.slash_command.includes("/hs-search-kb-article")
    ) {
      let searchData = req.body?.user_action?.slash_command.split(" ");
      searchData.shift();
      searchData = searchData.join(" ");
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let searchKBData = await hubspotHelper.searchKnowledgeBaseArticleRequest(
        searchData,
        userData
      );
      let message = "Knowledge base article data fetched successfully.";
      let searchJSON = sendSearchDataJSON;
      searchJSON.attachments[0].header.title = "Knowledge Based Article Data";
      let kbData = [];
      if (searchKBData?.data?.results?.length > 0) {
        searchKBData?.data?.results?.forEach((article, i) => {
          let kbTitle = article.title;
          kbTitle = kbTitle.replace(/<[^>]*>?/gm, "");
          let itemsArr = [
            {
              label: "Id",
              text: {
                type: "text",
                markdown: false,
                content: `${article.id}`,
              },
            },
            {
              label: "Title",
              text: {
                type: "text",
                markdown: false,
                content: kbTitle,
              },
            },
            {
              label: "Description",
              text: {
                type: "text",
                markdown: false,
                content: article.description,
              },
            },
            {
              label: "Category",
              text: {
                type: "text",
                markdown: false,
                content: article.category,
              },
            },
            {
              label: "Language",
              text: {
                type: "text",
                markdown: false,
                content: article.language,
              },
            },
          ];
          kbData.push({
            type: "info_card",
            draggable: false,
            items: itemsArr,
          });
          if (
            searchKBData?.data?.results.length != 1 &&
            searchKBData?.data?.results.length !== i + 1
          ) {
            kbData.push({
              type: "divider",
            });
          }
        });
        searchJSON.attachments[0].body.elements = kbData;
        await sendSwitMessage(
          message,
          searchJSON.attachments,
          userData?.swit_token,
          req.body?.context?.channel_id
        );
      } else {
        message = "No knowledge based article data found.";
        await sendSwitMessage(message, [], userData?.swit_token, req.body?.context?.channel_id);
      }
      res.send({ callback_type: "views.close" });
    }

    // For create contact render UI
    if (req.body?.user_action?.id == "hs-create-contact") {
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let companyData = await hubspotHelper.getAllCompanyRequest(userData);
      createContactJSON.new_view.view_id = req.body?.context?.channel_id
      createContactJSON.new_view.body.elements[1].options = companyData;
      res.send(createContactJSON);
    }

    // For create contact function call
    if (
      req.body?.user_action?.id == "eb5c968b-f4fb-4abe-8605-5b8ad6fe908a" &&
      req.body?.current_view?.header?.title == "Create Contact"
    ) {
      // console.log("data", req.body?.current_view?.body?.elements);
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let contactValidate = await hubspotHelper.validateContactRequest(
        req.body?.current_view?.body?.elements
      );
      let validatePhone = await hubspotHelper.validatePhoneNumber(
        req.body?.current_view?.body?.elements
      );
      if (contactValidate != false) {
        res.send(contactValidate);
      } else {
        let createContactData = await hubspotHelper.createContactRequest(
          req.body?.current_view?.body?.elements,
          userData
        );
        console.log("createContactData", createContactData);
        let message = "";
        let searchJSON = sendSearchDataJSON;
        searchJSON.attachments[0].header.title = "Create Contact Data";
        let contactData = [];
        if (createContactData?.status == 201) {
          if(validatePhone != false){
            return res.send(validatePhone);
          }
          message += "Contact created successfully.";
          let itemsArr = [
            {
              label: "First Name",
              text: {
                type: "text",
                markdown: false,
                content:
                  createContactData?.data?.properties.firstname != undefined
                    ? createContactData?.data?.properties.firstname
                    : "NA",
              },
            },
            {
              label: "Last Name",
              text: {
                type: "text",
                markdown: false,
                content:
                  createContactData?.data?.properties.lastname != undefined
                    ? createContactData?.data?.properties.lastname
                    : "NA",
              },
            },
            {
              label: "Email",
              text: {
                type: "text",
                markdown: false,
                content: createContactData?.data?.properties.email,
              },
            },
            {
              label: "Company",
              text: {
                type: "text",
                markdown: false,
                content: createContactData?.data?.properties.company,
              },
            },
          ];
          contactData.push({
            type: "info_card",
            draggable: false,
            items: itemsArr,
          });
          searchJSON.attachments[0].body.elements = contactData;
          await sendSwitMessage(
            message,
            searchJSON.attachments,
            userData?.swit_token,
            req.body?.current_view?.view_id
          );
          res.send({ callback_type: "views.close" });
        } else {
          let updateContactJSON = JSON.parse(JSON.stringify(createContactJSON));
          updateContactJSON.callback_type = "views.update";
          let subMessage = "";
          if (
            createContactData?.response?.data?.message.includes(
              "Property values were not valid:"
            )
          ) {
            subMessage = createContactData?.response?.data?.message
              .split('"message":')[1]
              .split(",")[0];
            subMessage = subMessage.replace(/"/g,"")
          } else {
            subMessage = createContactData?.response?.data?.message;
          }
          updateContactJSON.new_view.header.subtitle = `${subMessage}`;
          return res.send(updateContactJSON);
        }
        if(validatePhone != false){
          res.send(validatePhone);
        }
      }
    }

    // For create ticket render UI
    if (req.body?.user_action?.id == "hs-create-ticket") {
      createTicketJSON.new_view.view_id = req.body?.context?.channel_id
      res.send(createTicketJSON);
    }

    // For create ticket function call
    if (
      req.body?.user_action?.id == "eb5c968b-f4fb-4abe-8605-5b8ad6fe908a" &&
      req.body?.current_view?.header?.title == "Create Ticket"
    ) {
      // console.log("data", req.body?.current_view?.body?.elements);
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let ticketValidation = await hubspotHelper.validateTicketRequest(
        req.body?.current_view?.body?.elements
      );
      if (ticketValidation != false) {
        res.send(ticketValidation);
      } else {
        let createTicketData = await hubspotHelper.createTicketRequest(
          req.body?.current_view?.body?.elements,
          userData
        );
        console.log("createTicketData", createTicketData);
        let message = "";
        let searchJSON = sendSearchDataJSON;
        searchJSON.attachments[0].header.title = "Create Ticket Data";
        let ticketData = [];
        if (createTicketData?.status == 201) {
          message += "Ticket created successfully.";
          let itemsArr = [
            {
              label: "Id",
              text: {
                type: "text",
                markdown: false,
                content: createTicketData?.data?.id,
              },
            },
            {
              label: "Subject",
              text: {
                type: "text",
                markdown: false,
                content: createTicketData?.data?.properties.subject,
              },
            },
            {
              label: "Priority",
              text: {
                type: "text",
                markdown: false,
                content: createTicketData?.data?.properties.hs_ticket_priority,
              },
            },
          ];
          ticketData.push({
            type: "info_card",
            draggable: false,
            items: itemsArr,
          });
          searchJSON.attachments[0].body.elements = ticketData;
          await sendSwitMessage(
            message,
            searchJSON.attachments,
            userData?.swit_token,
            req.body?.current_view?.view_id
          );
          res.send({ callback_type: "views.close" });
        } else {
          let updateTicketJSON = JSON.parse(JSON.stringify(createTicketJSON));
          updateTicketJSON.callback_type = "views.update";
          let subTicketMessage = "";
          if (
            createTicketData?.response?.data?.message.includes(
              "Property values were not valid:"
            )
          ) {
            subTicketMessage = createTicketData?.response?.data?.message
              .split('"message":')[1]
              .split(",")[0];
            subTicketMessage = subTicketMessage.replace(/"/g,"")
          } else {
            subTicketMessage = createTicketData?.response?.data?.message;
          }
          updateTicketJSON.new_view.header.subtitle = `${subTicketMessage}`;
          res.send(updateTicketJSON);
        }
      }
    }

    // For create deal render UI
    if (req.body?.user_action?.id == "hs-create-deal") {
      createDealJSON.new_view.view_id = req.body?.context?.channel_id
      res.send(createDealJSON);
    }

    // For create deal function call
    if (
      req.body?.user_action?.id == "eb5c968b-f4fb-4abe-8605-5b8ad6fe908a" &&
      req.body?.current_view?.header?.title == "Create Deal"
    ) {
      // console.log("data", req.body?.current_view?.body?.elements);
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let validationDeal = await hubspotHelper.validateDealRequest(
        req.body?.current_view?.body?.elements,
        req.body?.current_view
      );
      console.log("validationDeal", validationDeal);
      if (validationDeal != false) {
        res.send(validationDeal);
      } else {
        let createDealData = await hubspotHelper.createDealRequest(
          req.body?.current_view?.body?.elements,
          userData
        );
        console.log("createDealData", createDealData);
        let message = "";
        let searchJSON = sendSearchDataJSON;
        searchJSON.attachments[0].header.title = "Create Deal Data";
        let dealData = [];
        if (createDealData?.status == 201) {
          message += "Deal created successfully.";
          let itemsArr = [
            {
              label: "Id",
              text: {
                type: "text",
                markdown: false,
                content: createDealData?.data?.id,
              },
            },
            {
              label: "Name",
              text: {
                type: "text",
                markdown: false,
                content: createDealData?.data?.properties.dealname,
              },
            },
            {
              label: "Amount",
              text: {
                type: "text",
                markdown: false,
                content: createDealData?.data?.properties.amount ? createDealData?.data?.properties.amount : "0",
              },
            },
          ];
          dealData.push({
            type: "info_card",
            draggable: false,
            items: itemsArr,
          });
          searchJSON.attachments[0].body.elements = dealData;
          await sendSwitMessage(
            message,
            searchJSON.attachments,
            userData?.swit_token,
            req.body?.current_view?.view_id
          );
        res.send({ callback_type: "views.close" });
        } else {
            let updateDealJSON = JSON.parse(JSON.stringify(createDealJSON))
            updateDealJSON.callback_type = "views.update"
            let subDealMessage = "";
          if (
            createDealData?.response?.data?.message.includes(
              "Property values were not valid:"
            )
          ) {
            subDealMessage = createDealData?.response?.data?.message
              .split('"message":')[1]
              .split(",")[0];
            subDealMessage = subDealMessage.replace(/"/g,"")
          } else {
            subDealMessage = createDealData?.response?.data?.message;
          }
            updateDealJSON.new_view.header.subtitle = `${subDealMessage}`
            res.send(updateDealJSON);
        }
        // res.send(message);
      }
    }

    // For create marketing event render UI
    if (req.body?.user_action?.id == "hs-create-mevent") {
      res.send(createMEventJSON);
    }

    // For create marketing event function call
    if (
      req.body?.user_action?.id == "eb5c968b-f4fb-4abe-8605-5b8ad6fe908a" &&
      req.body?.current_view?.header?.title == "Create Marketing Event"
    ) {
      // console.log("data", req.body?.current_view?.body?.elements);
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let createMEventData = await hubspotHelper.createMarketingEventRequest(
        req.body?.current_view?.body?.elements,
        userData
      );
      console.log("createMEventData", createMEventData);
      let message = "";
      if (createMEventData?.response?.status == 400) {
        message += createMEventData?.response?.data?.message;
      }
      if (createMEventData?.status == 200) {
        message += `Marketing event created successfully\n Event Name: ${createMEventData?.data?.eventName}, Event Type: ${createMEventData?.data?.eventType}, Event Start Date: ${createMEventData?.data?.startDateTime}, Event Organizer: ${createMEventData?.data?.eventOrganizer}`;
      }
      res.send({ callback_type: "views.close" });
    }

    // For get marketing emails with statistics
    if (req.body?.user_action?.id == "hs-get-memails-statistics") {
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let getMEmailData =
        await hubspotHelper.getMarketingEmailsWithStatisticsRequest(userData);
      let message = "Marketing Email Analytics Data.";
      let searchJSON = sendSearchDataJSON;
      searchJSON.attachments[0].header.title =
        "Marketing Email Analytics Data.";
      let emailAnalytics = [];
      if (getMEmailData.length > 0) {
        getMEmailData?.forEach((email, i) => {
          let itemsArr = [
            {
              label: "Id",
              text: {
                type: "text",
                markdown: false,
                content: `${email.Id}`,
              },
            },
            {
              label: "Name",
              text: {
                type: "text",
                markdown: false,
                content: email.Name,
              },
            },
            {
              label: "Author Name",
              text: {
                type: "text",
                markdown: false,
                content: email.authorName,
              },
            },
            {
              label: "Sent Count",
              text: {
                type: "text",
                markdown: false,
                content: `${email.sentCount}`,
              },
            },
            {
              label: "Open Count",
              text: {
                type: "text",
                markdown: false,
                content: `${email.openCount}`,
              },
            },
            {
              label: "Click Count",
              text: {
                type: "text",
                markdown: false,
                content: `${email.clickCount}`,
              },
            },
            {
              label: "Open Ratio",
              text: {
                type: "text",
                markdown: false,
                content: `${email.openratio}`,
              },
            },
            {
              label: "Click Ratio",
              text: {
                type: "text",
                markdown: false,
                content: `${email.clickratio}`,
              },
            },
          ];
          emailAnalytics.push({
            type: "info_card",
            draggable: false,
            items: itemsArr,
          });
          if (getMEmailData.length != 1 && getMEmailData.length != i + 1) {
            emailAnalytics.push({
              type: "divider",
            });
          }
        });
        searchJSON.attachments[0].body.elements = emailAnalytics;
        await sendSwitMessage(
          message,
          searchJSON.attachments,
          userData?.swit_token,
          req.body?.context?.channel_id
        );
      } else {
        message = "No marketing email analytics data found.";
        await sendSwitMessage(message, [], userData?.swit_token, req.body?.context?.channel_id);
      }
      res.send({ callback_type: "views.close" });
    }

    // For search marketing emails with name
    if (req.body?.user_action?.id == "hs-search-memails") {
      let searchData = req.body?.user_action?.slash_command.split(" ");
      searchData.shift();
      searchData = searchData.join(" ");
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let searchMEmailData = await hubspotHelper.searchMarketingEmailRequest(
        searchData,
        userData
      );
      // console.log("searchMEmailData", searchMEmailData?.data);
      let message = "Marketing Email fetched successfully.";
      let searchJSON = sendSearchDataJSON;
      searchJSON.attachments[0].header.title = "Marketing Email Data.";
      if (searchMEmailData?.data?.objects.length > 0) {
        let memailData = [];
        searchMEmailData?.data?.objects?.forEach((email, i) => {
          let itemsArr = [
            {
              label: "Id",
              text: {
                type: "text",
                markdown: false,
                content: `${email.id}`,
              },
            },
            {
              label: "Name",
              text: {
                type: "text",
                markdown: false,
                content: email.name,
              },
            },
            {
              label: "Subject",
              text: {
                type: "text",
                markdown: false,
                content: email.subject,
              },
            },
            {
              label: "Published By",
              text: {
                type: "text",
                markdown: false,
                content: email.publishedByName,
              },
            },
          ];
          memailData.push({
            type: "info_card",
            draggable: false,
            items: itemsArr,
          });
          if (
            searchMEmailData?.data?.objects.length != 1 &&
            searchMEmailData?.data?.objects.length != i + 1
          ) {
            memailData.push({
              type: "divider",
            });
          }
        });
        searchJSON.attachments[0].body.elements = memailData;
        await sendSwitMessage(
          message,
          searchJSON.attachments,
          userData?.swit_token,
          req.body?.context?.channel_id
        );
      } else {
        message = "No marketing email data found.";
        await sendSwitMessage(message, [], userData?.swit_token, req.body?.context?.channel_id);
      }
      res.send({ callback_type: "views.close" });
    }

    // For logout
    if (req.body?.user_action?.id == "hs-logout") {
      logoutJSON.new_view.view_id = req.body?.context?.channel_id
      res.send(logoutJSON);
    }

    // if user click on yes button in logout view
    if (
      req.body?.current_view?.header?.title == "Please confirm!" &&
      req.body?.user_action?.id == "Yes"
    ) {
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      await model.Hubspot.update(
        { swit_token: null, hubspot_token: null },
        { where: { swit_user_id: switUserId } }
      );
      let message = "You have been logged out from Hubspot successfully";
      await sendSwitMessage(message, [], userData?.swit_token, req.body?.current_view?.view_id);
      res.send({ callback_type: "views.close" });
    }

    // if user click on no button in logout view
    if (
      req.body?.current_view?.view_id == "logout" &&
      req.body?.user_action?.id == "No"
    ) {
      res.send({ callback_type: "views.close" });
    }

    // For right panel listing
    if (req.body?.user_action?.type == "right_panel_open" || (req.body?.user_action?.type == "view_actions.submit" && req.body?.user_action?.id == "refresh-hubspot-list") ||
    (req.body.user_action.type == "view_actions.oauth_complete" &&
      req.body.user_action.id == "right_panel_login")) {
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let contactListData = await hubspotHelper.getContactList(userData);
      let contactList = [];
      contactListData?.data?.results?.forEach((contact) => {
        contactList.push({
          type: "list_item",
          action_id: `${contact.id}`,
          title: `${contact.properties.firstname} ${contact.properties.lastname}`,
          subtitle: `${contact.id} | ${contact.properties.email} | ${
            contact.properties.createdate.split("T")[0]
          }`,
          snippet: "",
          icon: {
            type: "image",
            image_url:
              "https://cdn-icons-png.flaticon.com/512/5968/5968872.png",
            shape: "rectangular",
          },
          draggable: true,
        });
      });
      if (contactList.length == 0) {
        contactList.push({
          type: "text",
          markdown: false,
          content: "No contact found for this user",
        });
      }
      let defaultElements = [
        {
          type: "text",
          markdown: false,
          content: "Feature List",
        },
        {
          type: "select",
          placeholder: "Select a feature",
          multiselect: false,
          trigger_on_input: true,
          options: [
            {
              label: "Contact List",
              action_id: "contact_list",
            },
            {
              label: "Company List",
              action_id: "company_list",
            },
            {
              label: "Ticket List",
              action_id: "ticket_list",
            },
            {
              label: "Task List",
              action_id: "task_list",
            },
            {
              label: "Deal List",
              action_id: "deal_list",
            },
            {
              label: "Marketing Email List",
              action_id: "memail_list",
            },
          ],
          value: ["contact_list"]
        },
        {
          type: "text_input",
          action_id: "search_contact",
          placeholder: "Search Contact Name",
          trigger_on_input: true,
        }
      ];
      rightPanelJSON.new_view.body.elements = defaultElements.concat(contactList)
      res.send(rightPanelJSON);
    }

    // For right panel listing of contact list
    if (
      req.body?.user_action?.type == "view_actions.input" &&
      req.body?.user_action?.id == "contact_list"
    ) {
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let contactListData = await hubspotHelper.getContactList(userData);
      let contactList = [];
      contactListData?.data?.results?.forEach((contact) => {
        contactList.push({
          type: "list_item",
          action_id: `${contact.id}`,
          title: `${contact.properties.firstname} ${contact.properties.lastname}`,
          subtitle: `${contact.id} | ${contact.properties.email} | ${
            contact.properties.createdate.split("T")[0]
          }`,
          snippet: "",
          icon: {
            type: "image",
            image_url:
              "https://cdn-icons-png.flaticon.com/512/5968/5968872.png",
            shape: "rectangular",
          },
          draggable: true,
        });
      });
      if (contactList.length == 0) {
        contactList.push({
          type: "text",
          markdown: false,
          content: "No contact found for this user",
        });
      }
      let searchContactObj = {
        type: "text_input",
        action_id: "search_contact",
        placeholder: "Search Contact Name",
        trigger_on_input: true,
      };
      let responseContactJSON = rightPanelJSON;
      let contactElements = [
        req.body?.current_view?.body?.elements[0],
        req.body?.current_view?.body?.elements[1],
        searchContactObj,
      ];
      responseContactJSON.new_view.body.elements =
        contactElements.concat(contactList);
      res.send(responseContactJSON);
      // }
    }

    // For right panel listing of contact list with search
    if (
      req.body?.user_action?.type == "view_actions.input" &&
      req.body?.user_action?.id == "search_contact"
    ) {
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let contactSearchListData = await hubspotHelper.searchContactRequest(
        req.body.user_action.value,
        userData
      );
      let contactSearchList = [];
      contactSearchListData?.data?.results?.forEach((contact) => {
        contactSearchList.push({
          type: "list_item",
          action_id: `${contact.id}`,
          title: `${contact.properties.firstname} ${contact.properties.lastname}`,
          subtitle: `${contact.id} | ${contact.properties.email} | ${
            contact.properties.createdate.split("T")[0]
          }`,
          snippet: "",
          icon: {
            type: "image",
            image_url:
              "https://cdn-icons-png.flaticon.com/512/5968/5968872.png",
            shape: "rectangular",
          },
          draggable: true,
        });
      });
      if (contactSearchList.length == 0) {
        contactSearchList.push({
          type: "text",
          markdown: false,
          content: "No contact found for this user",
        });
      }
      let searchContactObj = {
        type: "text_input",
        action_id: "search_contact",
        placeholder: "Search Contact Name",
        trigger_on_input: true,
        value: req.body?.user_action?.value,
      };
      let responseContactJSON = rightPanelJSON;
      let contactElements = [
        req.body?.current_view?.body?.elements[0],
        req.body?.current_view?.body?.elements[1],
        searchContactObj,
      ];
      responseContactJSON.new_view.body.elements =
        contactElements.concat(contactSearchList);
      res.send(responseContactJSON);
    }

    // For right panel listing of company list
    if (
      req.body?.user_action?.type == "view_actions.input" &&
      req.body?.user_action?.id == "company_list"
    ) {
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let companyListData = await hubspotHelper.getCompanyList(userData);
      let companyList = [];
      companyListData?.data?.results?.forEach((company) => {
        companyList.push({
          type: "list_item",
          action_id: `${company.id}`,
          title: `${company.properties.name}`,
          subtitle: `${company.id} | ${company.properties.domain} | ${
            company.properties.createdate.split("T")[0]
          }`,
          snippet: "",
          icon: {
            type: "image",
            image_url:
              "https://cdn-icons-png.flaticon.com/512/5968/5968872.png",
            shape: "rectangular",
          },
          draggable: true,
        });
      });
      if (companyList.length == 0) {
        companyList.push({
          type: "text",
          markdown: false,
          content: "No company found for this user",
        });
      }
      let searchCompanyObj = {
        type: "text_input",
        action_id: "search_company",
        placeholder: "Search Company Name",
        trigger_on_input: true,
      };
      let responseCompanyJSON = rightPanelJSON;
      let companyElements = [
        req.body?.current_view?.body?.elements[0],
        req.body?.current_view?.body?.elements[1],
        searchCompanyObj,
      ];
      responseCompanyJSON.new_view.body.elements =
        companyElements.concat(companyList);
      res.send(responseCompanyJSON);
    }

    // For right panel listing of company list with search
    if (
      req.body?.user_action?.type == "view_actions.input" &&
      req.body?.user_action?.id == "search_company"
    ) {
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let companySearchListData = await hubspotHelper.searchCompanyRequest(
        req.body?.user_action?.value,
        userData
      );
      let companySearchList = [];
      companySearchListData?.data?.results?.forEach((company) => {
        companySearchList.push({
          type: "list_item",
          action_id: `${company.id}`,
          title: `${company.properties.name}`,
          subtitle: `${company.id} | ${company.properties.domain} | ${
            company.properties.createdate.split("T")[0]
          }`,
          snippet: "",
          icon: {
            type: "image",
            image_url:
              "https://cdn-icons-png.flaticon.com/512/5968/5968872.png",
            shape: "rectangular",
          },
          draggable: true,
        });
      });
      if (companySearchList.length == 0) {
        companySearchList.push({
          type: "text",
          markdown: false,
          content: "No company found for this user",
        });
      }
      let responseSearchCompanyJSON = rightPanelJSON;
      let companySearchElements = [
        req.body?.current_view?.body?.elements[0],
        req.body?.current_view?.body?.elements[1],
        req.body?.current_view?.body?.elements[2],
      ];
      responseSearchCompanyJSON.new_view.body.elements =
        companySearchElements.concat(companySearchList);
      res.send(responseSearchCompanyJSON);
    }

    // For right panel listing of ticket list
    if (
      req.body?.user_action?.type == "view_actions.input" &&
      req.body?.user_action?.id == "ticket_list"
    ) {
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let ticketListData = await hubspotHelper.getTicketList(userData);
      let ticketList = [];
      ticketListData?.data?.results?.forEach((ticket) => {
        ticketList.push({
          type: "list_item",
          action_id: `${ticket.id}`,
          title: `${ticket.properties.subject}`,
          subtitle: `${ticket.id} | ${ticket.properties.hs_ticket_priority ? ticket.properties.hs_ticket_priority : "NA"} | ${
            ticket.properties.createdate.split("T")[0]
          }`,
          snippet: "",
          icon: {
            type: "image",
            image_url:
              "https://cdn-icons-png.flaticon.com/512/5968/5968872.png",
            shape: "rectangular",
          },
          draggable: true,
        });
      });
      if (ticketList.length == 0) {
        ticketList.push({
          type: "text",
          markdown: false,
          content: "No ticket found for this user",
        });
      }
      let searchTicketObj = {
        type: "text_input",
        action_id: "search_ticket",
        placeholder: "Search Ticket Subject",
        trigger_on_input: true,
      };
      let responseTicketJSON = rightPanelJSON;
      let ticketElements = [
        req.body?.current_view?.body?.elements[0],
        req.body?.current_view?.body?.elements[1],
        searchTicketObj,
      ];
      responseTicketJSON.new_view.body.elements =
        ticketElements.concat(ticketList);
      res.send(responseTicketJSON);
    }

    // For right panel listing of ticket list with search
    if (
      req.body?.user_action?.type == "view_actions.input" &&
      req.body?.user_action?.id == "search_ticket"
    ) {
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let ticketSearchListData = await hubspotHelper.searchTicketRequest(
        req.body?.user_action?.value,
        userData
      );
      let ticketSearchList = [];
      ticketSearchListData?.data?.results?.forEach((ticket) => {
        ticketSearchList.push({
          type: "list_item",
          action_id: `${ticket.id}`,
          title: `${ticket.properties.subject}`,
          subtitle: `${ticket.id} | ${ticket.properties.hs_ticket_priority ? ticket.properties.hs_ticket_priority : "NA"} | ${
            ticket.properties.createdate.split("T")[0]
          }`,
          snippet: "",
          icon: {
            type: "image",
            image_url:
              "https://cdn-icons-png.flaticon.com/512/5968/5968872.png",
            shape: "rectangular",
          },
          draggable: true,
        });
      });
      if (ticketSearchList.length == 0) {
        ticketSearchList.push({
          type: "text",
          markdown: false,
          content: "No ticket found for this user",
        });
      }
      let responseSearchTicketJSON = rightPanelJSON;
      let ticketSearchElements = [
        req.body?.current_view?.body?.elements[0],
        req.body?.current_view?.body?.elements[1],
        req.body?.current_view?.body?.elements[2],
      ];
      responseSearchTicketJSON.new_view.body.elements =
        ticketSearchElements.concat(ticketSearchList);
      res.send(responseSearchTicketJSON);
    }

    // For right panel listing of task list
    if (
      req.body?.user_action?.type == "view_actions.input" &&
      req.body?.user_action?.id == "task_list"
    ) {
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let taskListData = await hubspotHelper.getTaskList(userData);
      let taskList = [];
      taskListData?.data?.results?.forEach((task) => {
        taskList.push({
          type: "list_item",
          action_id: `${task.id}`,
          title: `${task.properties.hs_task_subject}`,
          subtitle: `${task.id} | ${task.properties.hs_task_priority ? task.properties.hs_task_priority : "NA"} | ${
            task.properties.hs_task_status ? task.properties.hs_task_status : "NA"
          } | ${task.properties.hs_createdate.split("T")[0]}`,
          snippet: "",
          icon: {
            type: "image",
            image_url:
              "https://cdn-icons-png.flaticon.com/512/5968/5968872.png",
            shape: "rectangular",
          },
          draggable: true,
        });
      });
      if (taskList.length == 0) {
        taskList.push({
          type: "text",
          markdown: false,
          content: "No task found for this user",
        });
      }
      let searchTaskObj = {
        type: "text_input",
        action_id: "search_task",
        placeholder: "Search Task Subject",
        trigger_on_input: true,
      };
      let responseTaskJSON = rightPanelJSON;
      let taskElements = [
        req.body?.current_view?.body?.elements[0],
        req.body?.current_view?.body?.elements[1],
        searchTaskObj,
      ];
      responseTaskJSON.new_view.body.elements = taskElements.concat(taskList);
      res.send(responseTaskJSON);
    }

    // For right panel listing of task list with search
    if (
      req.body?.user_action?.type == "view_actions.input" &&
      req.body?.user_action?.id == "search_task"
    ) {
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let taskSearchListData = await hubspotHelper.searchTaskRequest(
        req.body?.user_action?.value,
        userData
      );
      let taskSearchList = [];
      taskSearchListData?.data?.results?.forEach((task) => {
        taskSearchList.push({
          type: "list_item",
          action_id: `${task.id}`,
          title: `${task.properties.subject}`,
          subtitle: `${task.id} | ${task.properties.hs_task_priority ? task.properties.hs_task_priority : "NA"} | ${
            task.properties.hs_task_status ? task.properties.hs_task_status : "NA"
          } | ${task.properties.hs_createdate.split("T")[0]}`,
          snippet: "",
          icon: {
            type: "image",
            image_url:
              "https://cdn-icons-png.flaticon.com/512/5968/5968872.png",
            shape: "rectangular",
          },
          draggable: true,
        });
      });
      if (taskSearchList.length == 0) {
        taskSearchList.push({
          type: "text",
          markdown: false,
          content: "No task found for this user",
        });
      }
      let responseSearchTaskJSON = rightPanelJSON;
      let taskSearchElements = [
        req.body?.current_view?.body?.elements[0],
        req.body?.current_view?.body?.elements[1],
        req.body?.current_view?.body?.elements[2],
      ];
      responseSearchTaskJSON.new_view.body.elements =
        taskSearchElements.concat(taskSearchList);
      res.send(responseSearchTaskJSON);
    }

    // For right panel listing of deal list
    if (
      req.body?.user_action?.type == "view_actions.input" &&
      req.body?.user_action?.id == "deal_list"
    ) {
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let dealListData = await hubspotHelper.getDealList(userData);
      let dealList = [];
      await Promise.all(
        dealListData?.data?.results?.map(async (deal) => {
          dealList.push({
            type: "list_item",
            action_id: `${deal.id}`,
            title: `${deal.properties.dealname}`,
            subtitle: `${deal.id} | ${deal.properties.amount ? deal.properties.amount : "0"} | ${
              deal.properties.dealstage ? deal.properties.dealstage : "NA"
            } | ${deal.properties.createdate.split("T")[0]}`,
            snippet: "",
            icon: {
              type: "image",
              image_url:
                "https://cdn-icons-png.flaticon.com/512/5968/5968872.png",
              shape: "rectangular",
            },
            draggable: true,
          });
        })
      );
      if (dealList.length == 0) {
        dealList.push({
          type: "text",
          markdown: false,
          content: "No deal found for this user",
        });
      }
      let searchDealObj = {
        type: "text_input",
        action_id: "search_deal",
        placeholder: "Search Deal Name",
        trigger_on_input: true,
      };
      let responseDealJSON = rightPanelJSON;
      let dealElements = [
        req.body?.current_view?.body?.elements[0],
        req.body?.current_view?.body?.elements[1],
        searchDealObj,
      ];
      responseDealJSON.new_view.body.elements = dealElements.concat(dealList);
      res.send(responseDealJSON);
    }

    // For right panel listing of deal list with search
    if (
      req.body?.user_action?.type == "view_actions.input" &&
      req.body?.user_action?.id == "search_deal"
    ) {
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let dealSearchListData = await hubspotHelper.searchDealRequest(
        req.body?.user_action?.value,
        userData
      );
      let dealSearchList = [];
      dealSearchListData?.data?.results?.forEach((deal) => {
        dealSearchList.push({
          type: "list_item",
          action_id: `${deal.id}`,
          title: `${deal.properties.dealname}`,
          subtitle: `${deal.id} | ${deal.properties.amount ? deal.properties.amount : "0"} | ${
            deal.properties.dealstage ? deal.properties.dealstage : "NA"
          } | ${deal.properties.createdate.split("T")[0]}`,
          snippet: "",
          icon: {
            type: "image",
            image_url:
              "https://cdn-icons-png.flaticon.com/512/5968/5968872.png",
            shape: "rectangular",
          },
          draggable: true,
        });
      });
      if (dealSearchList.length == 0) {
        dealSearchList.push({
          type: "text",
          markdown: false,
          content: "No deal found for this user",
        });
      }
      let responseSearchDealJSON = rightPanelJSON;
      let dealSearchElements = [
        req.body?.current_view?.body?.elements[0],
        req.body?.current_view?.body?.elements[1],
        req.body?.current_view?.body?.elements[2],
      ];
      responseSearchDealJSON.new_view.body.elements =
        dealSearchElements.concat(dealSearchList);
      res.send(responseSearchDealJSON);
    }

    // For right panel listing of marketing email list
    if (
      req.body?.user_action?.type == "view_actions.input" &&
      req.body?.user_action?.id == "memail_list"
    ) {
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let marketingEmailListData = await hubspotHelper.getMarketingEmailList(
        userData
      );
      let marketingEmailList = [];
      await Promise.all(
        marketingEmailListData?.data?.objects?.map(async (marketingEmail) => {
          marketingEmailList.push({
            type: "list_item",
            action_id: `${marketingEmail.id}`,
            title: `${marketingEmail.name}`,
            subtitle: `${marketingEmail.id} | ${marketingEmail.publishedByName ? marketingEmail.publishedByName : "NA"} | ${marketingEmail.subject ? marketingEmail.subject : "NA"}`,
            snippet: "",
            icon: {
              type: "image",
              image_url:
                "https://cdn-icons-png.flaticon.com/512/5968/5968872.png",
              shape: "rectangular",
            },
            draggable: true,
          });
        })
      );
      if (marketingEmailList.length == 0) {
        marketingEmailList.push({
          type: "text",
          markdown: false,
          content: "No marketing email found for this user",
        });
      }
      let searchMemailObj = {
        type: "text_input",
        action_id: "search_memail",
        placeholder: "Search Marketing Email Name",
        trigger_on_input: true,
      };
      let responseMarketingEmailJSON = rightPanelJSON;
      let marketingEmailElements = [
        req.body?.current_view?.body?.elements[0],
        req.body?.current_view?.body?.elements[1],
        searchMemailObj,
      ];
      responseMarketingEmailJSON.new_view.body.elements =
        marketingEmailElements.concat(marketingEmailList);
      res.send(responseMarketingEmailJSON);
    }

    // For right panel listing of marketing email list with search
    if (
      req.body?.user_action?.type == "view_actions.input" &&
      req.body?.user_action?.id == "search_memail"
    ) {
      let userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let marketingEmailSearchListData;
      if (req.body?.user_action?.value) {
        marketingEmailSearchListData =
          await hubspotHelper.searchMarketingEmailRequest(
            req.body?.user_action?.value,
            userData
          );
      } else {
        marketingEmailSearchListData =
          await hubspotHelper.getMarketingEmailList(userData);
      }
      let marketingEmailSearchList = [];
      marketingEmailSearchListData?.data?.objects?.forEach((marketingEmail) => {
        marketingEmailSearchList.push({
          type: "list_item",
          action_id: `${marketingEmail.id}`,
          title: `${marketingEmail.name}`,
          subtitle: `${marketingEmail.id} | ${marketingEmail.publishedByName ? marketingEmail.publishedByName : "NA"} | ${marketingEmail.subject ? marketingEmail.subject : "NA"}`,
          snippet: "",
          icon: {
            type: "image",
            image_url:
              "https://cdn-icons-png.flaticon.com/512/5968/5968872.png",
            shape: "rectangular",
          },
          draggable: true,
        });
      });
      if (marketingEmailSearchList.length == 0) {
        marketingEmailSearchList.push({
          type: "text",
          markdown: false,
          content: "No marketing email found for this user",
        });
      }
      let responseSearchMarketingEmailJSON = rightPanelJSON;
      let marketingEmailSearchElements = [
        req.body?.current_view?.body?.elements[0],
        req.body?.current_view?.body?.elements[1],
        req.body?.current_view?.body?.elements[2],
      ];
      responseSearchMarketingEmailJSON.new_view.body.elements =
        marketingEmailSearchElements.concat(marketingEmailSearchList);
      res.send(responseSearchMarketingEmailJSON);
    }

    // if (
    //   req.body?.user_action?.type == "view_actions.submit" &&
    //   req.body?.current_view?.header?.subtitle ==
    //     "Select feature from dropdown" &&
    //   req.body?.current_view?.header?.title == "HubSpot APP"
    // ) {
    //   // const userData = await model.Hubspot.findOne({
    //   //   where: { swit_user_id: switUserId },
    //   //   raw: true,
    //   // });
    //   // console.log("userData", req.body?.current_view?.body?.elements);
    //   // let responseSendJSON = { ...sendSearchDataJSON };
    //   // responseSendJSON.attachments[0].header.title = "test";
    //   // responseSendJSON.attachments[0].header.subtitle = "sub test";
    //   // let itemsArr = [];
    //   //   [
    //   //     {
    //   //         "label": "key",
    //   //         "text": {
    //   //             "type": "text",
    //   //             "markdown": false,
    //   //             "content": "value"
    //   //         }
    //   //     }
    //   // ]
    //   // await sendSwitMessage(
    //   //   "done",
    //   //   responseSendJSON?.attachments,
    //   //   userData.swit_token
    //   // );
    //   res.send({ callback_type: "views.close" });
    // }

    // For drag and drop the data
    if (req.body?.user_action?.type == "view_actions.drop" 
    // || (req.body?.user_action?.type == "view_actions.submit" &&
    // req.body?.current_view?.header?.title == "HubSpot APP")
    ) {
      const userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let currentData = req.body?.current_view?.body?.elements;
      let tempObj;
      await Promise.all(
        currentData.map(async (data) => {
          if (data?.action_id == req.body?.user_action?.id) {
            tempObj = data;
          }
        })
      );
      let featureName = await hubspotHelper.getFeatureName(currentData[1]);
      let attachMessage;
      if (featureName == "marketing email") {
        attachMessage = await hubspotHelper.attachSingleDataForMarketingEmail(
          userData,
          tempObj
        );
      } else {
        attachMessage = await hubspotHelper.attachSingleData(
          userData,
          tempObj,
          featureName
        );
      }
      let itemArr = await hubspotHelper.dragAndDropResponse(
        featureName,
        attachMessage?.data
      );
      let responseSendJSON = { ...sendSearchDataJSON };
      let titleName = await hubspotHelper.titleName(featureName)
      responseSendJSON.attachments[0].header.title = `${titleName} Data`;
      responseSendJSON.attachments[0].body.elements[0].items = itemArr;
      // await sendSwitMessage(
      //   `Details of ${featureName} data`,
      //   responseSendJSON?.attachments,
      //   userData.swit_token
      // );
      // res.send({ callback_type: "views.close" });
      res.send(responseSendJSON)
    }

    // For close the login model
    if(req.body?.user_action?.type == "view_actions.oauth_complete" && req.body.current_view?.view_id == "hubspot-login-open"){
      res.send({ callback_type: "views.close" });
    }

    // Logout from right side panel
    if(req.body?.user_action?.type == "view_actions.submit" && req.body?.user_action?.id == "logout-hubspot-app"){
      await model.Hubspot.update(
        { swit_token: null, hubspot_token: null },
        { where: { swit_user_id: switUserId } }
      );
      return res.send(rightPanelLoginJSON);
    }

    // For click details
    if(req.body?.user_action?.type == "view_actions.submit" &&
    req.body?.current_view?.header?.title == "HubSpot"){
      const userData = await model.Hubspot.findOne({
        where: { swit_user_id: switUserId },
        raw: true,
      });
      let currentData = req.body?.current_view?.body?.elements;
      let tempObj;
      await Promise.all(
        currentData.map(async (data) => {
          if (data?.action_id == req.body?.user_action?.id) {
            tempObj = data;
          }
        })
      );
      let featureName = await hubspotHelper.getFeatureName(currentData[1]);
      let attachMessage;
      if (featureName == "marketing email") {
        attachMessage = await hubspotHelper.attachSingleDataForMarketingEmail(
          userData,
          tempObj
        );
      } else {
        attachMessage = await hubspotHelper.attachSingleData(
          userData,
          tempObj,
          featureName
        );
      }
      console.log(
        "featureName",
        featureName,
        "attachMessage",
        attachMessage?.data
      );
      let itemArr = await hubspotHelper.dragAndDropResponse(
        featureName,
        attachMessage?.data
      );
      let clickResponseJSON = JSON.parse(JSON.stringify(clickEventJSON))
      let titleName = await hubspotHelper.titleName(featureName);
      clickResponseJSON.new_view.header.title = `${titleName} Detail`;
      clickResponseJSON.new_view.body.elements[0].items = itemArr;
      res.send(clickResponseJSON);
    }
  };
  return module;
};
