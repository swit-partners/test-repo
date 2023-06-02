const helper = require("../helpers/functions");
const createDealJSON = require("../uijson/hubspot/create-deal.json");
const createTicketJSON = require("../uijson/hubspot/create-ticket.json");
const createContactJSON = require("../uijson/hubspot/create-contact.json");
// const validationJSON = require("../uijson/hubspot/validation.json");

module.exports = {
  // generate refresh token
  async refreshToken(refreshToken, userData) {
    let params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("client_id", process.env.HUBSPOT_CLIENT_ID);
    params.append("client_secret", process.env.HUBSPOT_CLIENT_SECRET);
    params.append("refresh_token", refreshToken);
    let response = await helper.postRequest(
      "https://api.hubapi.com/oauth/v1/token",
      params
    );
    return response?.data;
  },

  // Search Contact in Hubspot
  async searchContactRequest(searchData, userData) {
    let header = {
      Authorization: `Bearer ${userData?.hubspot_token}`,
    };
    let bodyData = {
      query: searchData,
    };
    let contactData = await helper.postRequest(
      "https://api.hubapi.com/crm/v3/objects/contacts/search",
      bodyData,
      header
    );
    // if (
    //   contactData?.response?.status == 401 &&
    //   contactData?.response?.statusText == "Unauthorized"
    // ) {
    //   let token = await refreshToken(userData?.hubspot_refresh_token);
    //   console.log("token", token);
    //   header = {
    //     Authorization: `Bearer ${token}`,
    //   };
    //   contactData = await helper.postRequest(
    //     "https://api.hubapi.com/crm/v3/objects/contacts/search",
    //     bodyData,
    //     header
    //   );
    // }
    return contactData;
  },

  // Search Company in Hubspot
  async searchCompanyRequest(searchData, userData) {
    let header = {
      Authorization: `Bearer ${userData?.hubspot_token}`,
    };
    let bodyData = {
      query: searchData,
    };
    let companyData = await helper.postRequest(
      "https://api.hubapi.com/crm/v3/objects/companies/search",
      bodyData,
      header
    );
    // if (
    //   companyData?.response?.status == 401 &&
    //   companyData?.response?.statusText == "Unauthorized"
    // ) {
    //   let token = await refreshToken(userData?.hubspot_refresh_token);
    //   header = {
    //     Authorization: `Bearer ${token}`,
    //   };
    //   companyData = await helper.postRequest(
    //     "https://api.hubapi.com/crm/v3/objects/companies/search",
    //     bodyData,
    //     header
    //   );
    // }
    return companyData;
  },

  // Search Deal in Hubspot
  async searchDealRequest(searchData, userData) {
    let header = {
      Authorization: `Bearer ${userData?.hubspot_token}`,
    };
    let bodyData = {
      query: searchData,
    };
    let dealData = await helper.postRequest(
      "https://api.hubapi.com/crm/v3/objects/deals/search",
      bodyData,
      header
    );
    // if (
    //   dealData?.response?.status == 401 &&
    //   dealData?.response?.statusText == "Unauthorized"
    // ) {
    //   let token = await refreshToken(userData?.hubspot_refresh_token);
    //   header = {
    //     Authorization: `Bearer ${token}`,
    //   };
    //   dealData = await helper.postRequest(
    //     "https://api.hubapi.com/crm/v3/objects/deals/search",
    //     bodyData,
    //     header
    //   );
    // }
    return dealData;
  },

  // Search Ticket in Hubspot
  async searchTicketRequest(searchData, userData) {
    let header = {
      Authorization: `Bearer ${userData?.hubspot_token}`,
    };
    let bodyData = {
      query: searchData,
    };
    let ticketData = await helper.postRequest(
      "https://api.hubapi.com/crm/v3/objects/tickets/search",
      bodyData,
      header
    );
    // if (
    //   ticketData?.response?.status == 401 &&
    //   ticketData?.response?.statusText == "Unauthorized"
    // ) {
    //   let token = await refreshToken(userData?.hubspot_refresh_token);
    //   header = {
    //     Authorization: `Bearer ${token}`,
    //   };
    //   ticketData = await helper.postRequest(
    //     "https://api.hubapi.com/crm/v3/objects/tickets/search",
    //     bodyData,
    //     header
    //   );
    // }
    return ticketData;
  },

  // Search Task in Hubspot
  async searchTaskRequest(searchData, userData) {
    let header = {
      Authorization: `Bearer ${userData?.hubspot_token}`,
    };
    let bodyData = {
      query: searchData,
      properties: [
        "hs_task_body",
        "hs_task_priority",
        "hs_task_status",
        "hs_task_subject",
      ],
    };
    let taskData = await helper.postRequest(
      "https://api.hubapi.com/crm/v3/objects/tasks/search",
      bodyData,
      header
    );
    // if (
    //   taskData?.response?.status == 401 &&
    //   taskData?.response?.statusText == "Unauthorized"
    // ) {
    //   let token = await refreshToken(userData?.hubspot_refresh_token);
    //   header = {
    //     Authorization: `Bearer ${token}`,
    //   };
    //   taskData = await helper.postRequest(
    //     "https://api.hubapi.com/crm/v3/objects/tasks/search",
    //     bodyData,
    //     header
    //   );
    // }
    return taskData;
  },

  // Search Knowledge Base Article in Hubspot
  async searchKnowledgeBaseArticleRequest(searchData, userData) {
    let header = {
      Authorization: `Bearer ${userData?.hubspot_token}`,
    };
    let knowledgeBaseArticleData = await helper.getRequest(
      `https://api.hubapi.com/contentsearch/v2/search?type=KNOWLEDGE_ARTICLE&term=${searchData}&portalId=27191250`,
      header
    );
    // if (
    //   knowledgeBaseArticleData?.response?.status == 401 &&
    //   knowledgeBaseArticleData?.response?.statusText == "Unauthorized"
    // ) {
    //   let token = await refreshToken(userData?.hubspot_refresh_token);
    //   header = {
    //     Authorization: `Bearer ${token}`,
    //   };
    //   knowledgeBaseArticleData = await helper.getRequest(
    //     `https://api.hubapi.com/contentsearch/v2/search?type=KNOWLEDGE_ARTICLE&term=${searchData}&portalId=27191250`,
    //     header
    //   );
    // }
    return knowledgeBaseArticleData;
  },

  // Create Contact in Hubspot
  async createContactRequest(reqFormData, userData) {
    let contactData = {
      properties: {
        email: "",
        firstname: "",
        lastname: "",
        phone: "",
        company: "",
        website: "",
      },
    };
    reqFormData.forEach((value, key) => {
      // console.log("value", value, "key", key)
      if (value.type == "select" && value.placeholder == "Select company") {
        // value.options.forEach((option) => {
        //   if(option.static_action){
        //     contactData.properties.company = option.label
        //   }
        // })
        contactData.properties.company = value.value[0];
      } else if (
        value.type == "text_input" &&
        value.placeholder == "Enter your email address"
      ) {
        contactData.properties.email = value.value;
      } else if (
        value.type == "text_input" &&
        value.placeholder == "Enter first name"
      ) {
        contactData.properties.firstname = value.value;
      } else if (
        value.type == "text_input" &&
        value.placeholder == "Enter last name"
      ) {
        contactData.properties.lastname = value.value;
      } else if (
        value.type == "text_input" &&
        value.placeholder == "Enter your phone number"
      ) {
        contactData.properties.phone = value.value;
      } else if (
        value.type == "text_input" &&
        value.placeholder == "Enter your company website url"
      ) {
        contactData.properties.website = value.value;
      }
    });
    console.log("contactData", contactData);
    let header = {
      Authorization: `Bearer ${userData?.hubspot_token}`,
    };
    let bodyData = contactData;
    let createContactData = await helper.postRequest(
      "https://api.hubapi.com/crm/v3/objects/contacts",
      bodyData,
      header
    );
    // if (
    //   createContactData?.response?.status == 401 &&
    //   createContactData?.response?.statusText == "Unauthorized"
    // ) {
    //   let token = await refreshToken(userData?.hubspot_refresh_token);
    //   header = {
    //     Authorization: `Bearer ${token}`,
    //   };
    //   createContactData = await helper.postRequest(
    //     "https://api.hubapi.com/crm/v3/objects/contacts",
    //     bodyData,
    //     header
    //   );
    // }
    return createContactData;
  },

  // For Get All Company List
  async getAllCompanyRequest(userData) {
    let header = {
      Authorization: `Bearer ${userData.hubspot_token}`,
    };
    let companyData = await helper.getRequest(
      "https://api.hubapi.com/crm/v3/objects/companies",
      header
    );
    // if (
    //   companyData?.response?.status == 401 &&
    //   companyData?.response?.statusText == "Unauthorized"
    // ) {
    //   let token = await refreshToken(userData?.hubspot_refresh_token);
    //   header = {
    //     Authorization: `Bearer ${token}`,
    //   };
    //   companyData = await helper.getRequest(
    //     "https://api.hubapi.com/crm/v3/objects/companies",
    //     header
    //   );
    // }
    let companyList = [];
    if (companyData?.data?.results) {
      companyData.data.results.forEach((company) => {
        companyList.push({
          label: company.properties.name,
          action_id: company.properties.name,
        });
      });
    }
    return companyList;
  },

  // Create Marketing Event in Hubspot
  async createMarketingEventRequest(reqFormData, userData) {
    let eventData = {
      eventName: "",
      eventType: "",
      startDateTime: "",
      endDateTime: "",
      eventOrganizer: "",
      eventDescription: "",
      eventUrl: "",
      eventCancelled: false,
      externalAccountId: "",
      externalEventId: "",
    };
    reqFormData.forEach((value, key) => {
      if (value.placeholder == "Event Name" && value.type == "text_input") {
        eventData.eventName = value.value;
      } else if (
        value.placeholder == "Event Type" &&
        value.type == "text_input"
      ) {
        eventData.eventType = value.value;
      } else if (
        value.type == "container" &&
        value?.elements[2]?.placeholder == "Start Date"
      ) {
        console.log("value start date", value.elements);
        let hour = value.elements[0].value[0];
        let minute = value.elements[1].value[0];
        let date = value.elements[2].value.split("T")[0];
        console.log("start date", date, hour, minute);
        let utcDate = new Date(`${date}`);
        utcDate = new Date(utcDate.setUTCHours(hour, minute, 0, 0));
        eventData.startDateTime = utcDate;
      } else if (
        value.type == "container" &&
        value?.elements[2]?.placeholder == "End Date"
      ) {
        console.log("value end date", value.elements);
        let hour = value.elements[0].value[0];
        let minute = value.elements[1].value[0];
        let date = value.elements[2].value.split("T")[0];
        console.log("end date", date, hour, minute);
        let utcDate = new Date(`${date}`);
        utcDate = new Date(utcDate.setUTCHours(hour, minute, 0, 0));
        eventData.endDateTime = utcDate;
      } else if (
        value.placeholder == "Organizer Name" &&
        value.type == "text_input"
      ) {
        eventData.eventOrganizer = value.value;
      } else if (
        value.placeholder == "Description" &&
        value.type == "text_input"
      ) {
        eventData.eventDescription = value.value;
      } else if (
        value.placeholder == "Event URL" &&
        value.type == "text_input"
      ) {
        eventData.eventUrl = value.value;
      } else if (
        value.placeholder == "External Account Id" &&
        value.type == "text_input"
      ) {
        eventData.externalAccountId = value.value;
      } else if (
        value.placeholder == "External Event Id" &&
        value.type == "text_input"
      ) {
        eventData.externalEventId = value.value;
      }
    });
    console.log("eventData", eventData);
    let header = {
      Authorization: `Bearer ${userData?.hubspot_token}`,
    };
    let bodyData = eventData;
    let createEventData = await helper.postRequest(
      "https://api.hubapi.com/marketing/v3/marketing-events/events",
      bodyData,
      header
    );
    // if (
    //   createEventData?.response?.status == 401 &&
    //   createEventData?.response?.statusText == "Unauthorized"
    // ) {
    //   let token = await refreshToken(userData?.hubspot_refresh_token);
    //   header = {
    //     Authorization: `Bearer ${token}`,
    //   };
    //   createEventData = await helper.postRequest(
    //     "https://api.hubapi.com/marketing/v3/marketing-events/events",
    //     bodyData,
    //     header
    //   );
    // }
    return createEventData;
  },

  // For get marketing emails with statistics
  async getMarketingEmailsWithStatisticsRequest(userData) {
    let header = {
      Authorization: `Bearer ${userData.hubspot_token}`,
    };
    let marketingEmailsData = await helper.getRequest(
      "https://api.hubapi.com/marketing-emails/v1/emails/with-statistics",
      header
    );
    // if (
    //   marketingEmailsData?.response?.status == 401 &&
    //   marketingEmailsData?.response?.statusText == "Unauthorized"
    // ) {
    //   let token = await refreshToken(userData?.hubspot_refresh_token, userData);
    //   header = {
    //     Authorization: `Bearer ${token}`,
    //   };
    //   marketingEmailsData = await helper.getRequest(
    //     "https://api.hubapi.com/marketing-emails/v1/emails/with-statistics",
    //     header
    //   );
    // }
    let marketingEmailsList = [];
    // console.log("marketingEmailsData", marketingEmailsData?.data?.objects);
    if (marketingEmailsData?.data?.objects.length > 0) {
      marketingEmailsData.data.objects.forEach((email) => {
        marketingEmailsList.push({
          Id: email.id,
          Name: email.name,
          authorName: email.authorName,
          authorEmail: email.author,
          sentCount: email.stats?.counters?.sent
            ? email.stats?.counters?.sent
            : 0,
          openCount: email.stats?.counters?.open
            ? email.stats?.counters?.open
            : 0,
          deliveredCount: email.stats?.counters?.delivered
            ? email.stats?.counters?.delivered
            : 0,
          clickCount: email.stats?.counters?.click
            ? email.stats?.counters?.click
            : 0,
          clickratio: email.stats?.ratios?.clickratio
            ? email.stats?.ratios?.clickratio
            : 0,
          openratio: email.stats?.ratios?.openratio
            ? email.stats?.ratios?.openratio
            : 0,
        });
      });
    }
    return marketingEmailsList;
  },

  // For search marketing emails with name
  async searchMarketingEmailRequest(searchData, userData) {
    let header = {
      Authorization: `Bearer ${userData?.hubspot_token}`,
    };
    let memailsData = await helper.getRequest(
      `https://api.hubapi.com/marketing-emails/v1/emails?name=${searchData}`,
      header
    );
    // if (
    //   memailsData?.response?.status == 401 &&
    //   memailsData?.response?.statusText == "Unauthorized"
    // ) {
    //   let token = await refreshToken(userData?.hubspot_refresh_token, userData);
    //   header = {
    //     Authorization: `Bearer ${token}`,
    //   };
    //   memailsData = await helper.getRequest(
    //     `https://api.hubapi.com/marketing-emails/v1/emails?name=${searchData}`,
    //     header
    //   );
    // }
    return memailsData;
  },

  // Create ticket in hubspot
  async createTicketRequest(reqFormData, userData) {
    let ticketData = {
      properties: {
        hs_pipeline: "0",
        hs_pipeline_stage: "",
        hs_ticket_priority: "",
        subject: "",
      },
    };
    reqFormData.forEach((value, key) => {
      if (
        value.type == "text_input" &&
        value.placeholder == "Enter Ticket Name"
      ) {
        ticketData.properties.subject = value.value;
      } else if (
        value.type == "select" &&
        value.placeholder == "Select a priority"
      ) {
        ticketData.properties.hs_ticket_priority = value.value[0];
      } else if (
        value.type == "select" &&
        value.placeholder == "Select task status"
      ) {
        ticketData.properties.hs_pipeline_stage = value.value[0];
      }
    });
    console.log("ticketData", ticketData);
    let header = {
      Authorization: `Bearer ${userData?.hubspot_token}`,
    };
    let bodyData = ticketData;
    let createTicketData = await helper.postRequest(
      "https://api.hubapi.com/crm/v3/objects/tickets",
      bodyData,
      header
    );
    // if (
    //   createTicketData?.response?.status == 401 &&
    //   createTicketData?.response?.statusText == "Unauthorized"
    // ) {
    //   let token = await refreshToken(userData?.hubspot_refresh_token, userData);
    //   header = {
    //     Authorization: `Bearer ${token}`,
    //   };
    //   createTicketData = await helper.postRequest(
    //     "https://api.hubapi.com/crm/v3/objects/tickets",
    //     bodyData,
    //     header
    //   );
    // }
    return createTicketData;
  },

  // Create deal in hubspot
  async createDealRequest(reqFormData, userData) {
    let dealData = {
      properties: {
        amount: "",
        closedate: "",
        dealname: "",
      },
    };
    reqFormData.forEach((value, key) => {
      if (
        value.type == "text_input" &&
        value.placeholder == "Enter deal name"
      ) {
        dealData.properties.dealname = value.value;
      } else if (value.type == "datepicker" && value.placeholder == "Date") {
        dealData.properties.closedate = value.value;
      } else if (
        value.type == "text_input" &&
        value.placeholder == "Enter amount"
      ) {
        dealData.properties.amount = value.value;
      }
    });
    console.log("dealData", dealData);
    let header = {
      Authorization: `Bearer ${userData?.hubspot_token}`,
    };
    let bodyData = dealData;
    let createDealData = await helper.postRequest(
      "https://api.hubapi.com/crm/v3/objects/deals",
      bodyData,
      header
    );
    // if (
    //   createDealData?.response?.status == 401 &&
    //   createDealData?.response?.statusText == "Unauthorized"
    // ) {
    //   let token = await refreshToken(userData?.hubspot_refresh_token, userData);
    //   header = {
    //     Authorization: `Bearer ${token}`,
    //   };
    //   createDealData = await helper.postRequest(
    //     "https://api.hubapi.com/crm/v3/objects/deals",
    //     bodyData,
    //     header
    //   );
    // }
    return createDealData;
  },

  // Validate deal data in hubspot
  async validateDealRequest(reqFormData) {
    let validationMessage = [];
    reqFormData.forEach((value, key) => {
      // console.log("value validation", value);
      if (
        value.type == "text_input" &&
        value.placeholder == "Enter deal name" &&
        !value.value
      ) {
        validationMessage.push("Name");
      }
      // else if (
      //   value.type == "datepicker" &&
      //   value.placeholder == "Date" &&
      //   !value.value
      // ) {
      //   validationMessage.push("Date");
      // } else if (
      //   value.type == "text_input" &&
      //   value.placeholder == "Enter amount" &&
      //   !value.value
      // ) {
      //   validationMessage.push("Amount");
      // }
    });
    if (validationMessage.length > 0) {
      let validationDealJSON = JSON.parse(JSON.stringify(createDealJSON));
      validationDealJSON.callback_type = "views.update";
      validationDealJSON.new_view.header.subtitle = "**Please fill up mandatory fields and try again!**"
      return validationDealJSON;
    } else {
      return false;
    }
  },

  // Validate ticket data in hubspot
  async validateTicketRequest(reqFormData) {
    let validationMessage = [];
    reqFormData.forEach((value, key) => {
      if (
        value.type == "text_input" &&
        value.placeholder == "Enter Ticket Name" &&
        !value.value
      ) {
        validationMessage.push("Name");
      } else if (
        value.type == "select" &&
        value.placeholder == "Select a priority" &&
        !value.value
      ) {
        validationMessage.push("Priority");
      } else if (
        value.type == "select" &&
        value.placeholder == "Select task status" &&
        !value.value
      ) {
        validationMessage.push("Task Status");
      }
    });
    console.log("validationMessage", validationMessage);
    if (validationMessage.length > 0) {
      let validationTicketJSON = JSON.parse(JSON.stringify(createTicketJSON));
      validationTicketJSON.callback_type = "views.update";
      validationTicketJSON.new_view.header.subtitle = "**Please fill up mandatory fields and try again!**"
      return validationTicketJSON;
    } else {
      return false;
    }
  },

  // Validate contact data in hubspot
  async validateContactRequest(reqFormData) {
    let validationMessage = [];
    reqFormData.forEach((value, key) => {
      if (
        value.type == "select" &&
        value.placeholder == "Select company" &&
        !value.value
      ) {
        validationMessage.push("Company");
      } else if (
        value.type == "text_input" &&
        value.placeholder == "Enter your email address" &&
        !value.value
      ) {
        validationMessage.push("Email");
      }
      // else if (
      //   value.type == "text_input" &&
      //   value.placeholder == "Enter first name" &&
      //   !value.value
      // ) {
      //   validationMessage.push("First Name");
      // } else if (
      //   value.type == "text_input" &&
      //   value.placeholder == "Enter last name" &&
      //   !value.value
      // ) {
      //   validationMessage.push("Last Name");
      // } else if (
      //   value.type == "text_input" &&
      //   value.placeholder == "Enter your phone number" &&
      //   !value.value
      // ) {
      //   validationMessage.push("Phone Number");
      // } else if (
      //   value.type == "text_input" &&
      //   value.placeholder == "Enter your company website url" &&
      //   !value.value
      // ) {
      //   validationMessage.push("Company Website");
      // }
    });
    console.log("validationMessage", validationMessage);
    if (validationMessage.length > 0) {
      let validationJSON = JSON.parse(JSON.stringify(createContactJSON));
      validationJSON.callback_type = "views.update";
      validationJSON.new_view.header.subtitle = "**Please fill up mandatory fields and try again!**"
      return validationJSON;
    } else {
      return false;
    }
  },

  // Validate phone number
  async validatePhoneNumber(reqFormData) {
    let phoneNumber;
    if (reqFormData) {
      reqFormData.forEach((value) => {
        if (
          value.type == "text_input" &&
          value.placeholder == "Enter your phone number"
        ) {
          phoneNumber = value.value
        }
      });
    }
    console.log("phoneNumber", phoneNumber)
    if(phoneNumber == undefined){
      return false
    }else{
      let phoneCheck = /^[1-9]\d{9}$/
      if(phoneNumber.match(phoneCheck)){
       return false 
      }else{
        let validationPhoneJSON = JSON.parse(JSON.stringify(createContactJSON));
        validationPhoneJSON.callback_type = "views.update";
        validationPhoneJSON.new_view.header.subtitle = "Phone number is invalid !"
        return validationPhoneJSON;
      }
    }
  },

  // List of contact data
  async getContactList(userData) {
    let header = {
      Authorization: `Bearer ${userData?.hubspot_token}`,
    };
    let contactData = await helper.getRequest(
      "https://api.hubapi.com/crm/v3/objects/contacts?limit=100",
      header
    );
    // if (contactData?.response?.statusText == "Unauthorized") {
    //   let token = await refreshToken(userData?.hubspot_refresh_token, userData);
    //   header = {
    //     Authorization: `Bearer ${token}`,
    //   };
    //   contactData = await helper.getRequest(
    //     "https://api.hubapi.com/crm/v3/objects/contacts?limit=100",
    //     header
    //   );
    // }
    return contactData;
  },

  // List of company data
  async getCompanyList(userData) {
    let header = {
      Authorization: `Bearer ${userData?.hubspot_token}`,
    };
    let companyData = await helper.getRequest(
      "https://api.hubapi.com/crm/v3/objects/companies?limit=100",
      header
    );
    // if (companyData?.response?.statusText == "Unauthorized") {
    //   let token = await refreshToken(userData?.hubspot_refresh_token, userData);
    //   header = {
    //     Authorization: `Bearer ${token}`,
    //   };
    //   companyData = await helper.getRequest(
    //     "https://api.hubapi.com/crm/v3/objects/companies?limit=100",
    //     header
    //   );
    // }
    return companyData;
  },

  // List of ticket data
  async getTicketList(userData) {
    let header = {
      Authorization: `Bearer ${userData?.hubspot_token}`,
    };
    let ticketData = await helper.getRequest(
      "https://api.hubapi.com/crm/v3/objects/tickets?limit=100",
      header
    );
    // if (ticketData?.response?.statusText == "Unauthorized") {
    //   let token = await refreshToken(userData?.hubspot_refresh_token, userData);
    //   header = {
    //     Authorization: `Bearer ${token}`,
    //   };
    //   ticketData = await helper.getRequest(
    //     "https://api.hubapi.com/crm/v3/objects/tickets?limit=100",
    //     header
    //   );
    // }
    return ticketData;
  },

  // List of task data
  async getTaskList(userData) {
    let header = {
      Authorization: `Bearer ${userData?.hubspot_token}`,
    };
    let taskData = await helper.getRequest(
      "https://api.hubapi.com/crm/v3/objects/tasks?properties=hs_task_body,hs_task_priority,hs_task_status,hs_task_subject&limit=100",
      header
    );
    // if (taskData?.response?.statusText == "Unauthorized") {
    //   let token = await refreshToken(userData?.hubspot_refresh_token, userData);
    //   header = {
    //     Authorization: `Bearer ${token}`,
    //   };
    //   taskData = await helper.getRequest(
    //     "https://api.hubapi.com/crm/v3/objects/tasks?properties=hs_task_body,hs_task_priority,hs_task_status,hs_task_subject&limit=100",
    //     header
    //   );
    // }
    return taskData;
  },

  // List of deal data
  async getDealList(userData) {
    let header = {
      Authorization: `Bearer ${userData?.hubspot_token}`,
    };
    let dealData = await helper.getRequest(
      "https://api.hubapi.com/crm/v3/objects/deals?limit=100",
      header
    );
    // if (dealData?.response?.statusText == "Unauthorized") {
    //   let token = await refreshToken(userData?.hubspot_refresh_token, userData);
    //   header = {
    //     Authorization: `Bearer ${token}`,
    //   };
    //   dealData = await helper.getRequest(
    //     "https://api.hubapi.com/crm/v3/objects/deals?limit=100",
    //     header
    //   );
    // }
    return dealData;
  },

  // List of marketing email data
  async getMarketingEmailList(userData) {
    let header = {
      Authorization: `Bearer ${userData?.hubspot_token}`,
    };
    let marketingEmailData = await helper.getRequest(
      "https://api.hubapi.com/marketing-emails/v1/emails?limit=100",
      header
    );
    // if (marketingEmailData?.response?.statusText == "Unauthorized") {
    //   let token = await refreshToken(userData?.hubspot_refresh_token, userData);
    //   header = {
    //     Authorization: `Bearer ${token}`,
    //   };
    //   marketingEmailData = await helper.getRequest(
    //     "https://api.hubapi.com/marketing-emails/v1/emails?limit=100",
    //     header
    //   );
    // }
    return marketingEmailData;
  },

  // Attach single data in swit channel message
  async attachSingleData(userData, tempObj, featureType) {
    let header = {
      Authorization: `Bearer ${userData?.hubspot_token}`,
    };
    let url = `https://api.hubapi.com/crm/v3/objects/${featureType}/${tempObj?.action_id}`;
    if (featureType == "tasks") {
      url +=
        "?properties=hs_task_body,hs_task_priority,hs_task_status,hs_task_subject";
    }
    let data = await helper.getRequest(url, header);
    // if (data?.response?.statusText == "Unauthorized") {
    //   let token = await refreshToken(userData?.hubspot_refresh_token, userData);
    //   header = {
    //     Authorization: `Bearer ${token}`,
    //   };
    //   data = await helper.getRequest(url, header);
    // }
    return data;
  },

  // Attach single data in swit channel message for marketing email
  async attachSingleDataForMarketingEmail(userData, tempObj) {
    let header = {
      Authorization: `Bearer ${userData?.hubspot_token}`,
    };
    let data = await helper.getRequest(
      `https://api.hubapi.com/marketing-emails/v1/emails/with-statistics/${tempObj?.action_id}`,
      header
    );
    // if (data?.response?.statusText == "Unauthorized") {
    //   let token = await refreshToken(userData?.hubspot_refresh_token, userData);
    //   header = {
    //     Authorization: `Bearer ${token}`,
    //   };
    //   data = await helper.getRequest(
    //     `https://api.hubapi.com/marketing-emails/v1/emails/with-statistics/${tempObj?.action_id}`,
    //     header
    //   );
    // }
    return data;
  },

  // Feature name according to the feature type
  async getFeatureName(currentViewFeature) {
    let featureName = "";
    switch (currentViewFeature?.value[0]) {
      case "contact_list":
        featureName = "contact";
        break;
      case "company_list":
        featureName = "companies";
        break;
      case "ticket_list":
        featureName = "tickets";
        break;
      case "task_list":
        featureName = "tasks";
        break;
      case "deal_list":
        featureName = "deals";
        break;
      case "memail_list":
        featureName = "marketing email";
        break;
      default:
        break;
    }
    return featureName;
  },

  // Get the response according to the feature type
  async dragAndDropResponse(featureName, featureData) {
    let data = [];
    switch (featureName) {
      case "contact":
        data = [
          {
            label: "First Name",
            text: {
              type: "text",
              markdown: false,
              content: `${
                featureData?.properties?.firstname
                  ? featureData?.properties?.firstname
                  : "NA"
              }`,
            },
          },
          {
            label: "Last Name",
            text: {
              type: "text",
              markdown: false,
              content: `${
                featureData?.properties?.lastname
                  ? featureData?.properties?.lastname
                  : "NA"
              }`,
            },
          },
          {
            label: "Email",
            text: {
              type: "text",
              markdown: false,
              content: `${featureData?.properties?.email}`,
            },
          },
          {
            label: "Create Date",
            text: {
              type: "text",
              markdown: false,
              content: `${featureData?.properties?.createdate.split("T")[0]}`,
            },
          },
        ];
        break;
      case "companies":
        data = [
          {
            label: "Name",
            text: {
              type: "text",
              markdown: false,
              content: `${featureData?.properties?.name}`,
            },
          },
          {
            label: "Domain",
            text: {
              type: "text",
              markdown: false,
              content: `${
                featureData?.properties?.domain
                  ? featureData?.properties?.domain
                  : "NA"
              }`,
            },
          },
          {
            label: "Create Date",
            text: {
              type: "text",
              markdown: false,
              content: `${featureData?.properties?.createdate.split("T")[0]}`,
            },
          },
        ];
        break;
      case "tickets":
        data = [
          {
            label: "Subject",
            text: {
              type: "text",
              markdown: false,
              content: `${featureData?.properties?.subject}`,
            },
          },
          {
            label: "Priority",
            text: {
              type: "text",
              markdown: false,
              content: `${
                featureData?.properties?.hs_ticket_priority
                  ? featureData?.properties?.hs_ticket_priority
                  : "NA"
              }`,
            },
          },
          {
            label: "Create Date",
            text: {
              type: "text",
              markdown: false,
              content: `${featureData?.properties?.createdate.split("T")[0]}`,
            },
          },
        ];
        break;
      case "tasks":
        data = [
          {
            label: "Subject",
            text: {
              type: "text",
              markdown: false,
              content: `${featureData?.properties?.hs_task_subject}`,
            },
          },
          {
            label: "Status",
            text: {
              type: "text",
              markdown: false,
              content: `${
                featureData?.properties?.hs_task_status
                  ? featureData?.properties?.hs_task_status
                  : "NA"
              }`,
            },
          },
          {
            label: "Priority",
            text: {
              type: "text",
              markdown: false,
              content: `${
                featureData?.properties?.hs_task_priority
                  ? featureData?.properties?.hs_task_priority
                  : "NA"
              }`,
            },
          },
          {
            label: "Create Date",
            text: {
              type: "text",
              markdown: false,
              content: `${
                featureData?.properties?.hs_createdate.split("T")[0]
              }`,
            },
          },
        ];
        break;
      case "deals":
        data = [
          {
            label: "Name",
            text: {
              type: "text",
              markdown: false,
              content: `${featureData?.properties?.dealname}`,
            },
          },
          {
            label: "Amount",
            text: {
              type: "text",
              markdown: false,
              content: `${
                featureData?.properties?.amount
                  ? featureData?.properties?.amount
                  : "0"
              }`,
            },
          },
          {
            label: "Stage",
            text: {
              type: "text",
              markdown: false,
              content: `${
                featureData?.properties?.dealstage
                  ? featureData?.properties?.dealstage
                  : "NA"
              }`,
            },
          },
          {
            label: "Create Date",
            text: {
              type: "text",
              markdown: false,
              content: `${featureData?.properties?.createdate.split("T")[0]}`,
            },
          },
          {
            label: "Close Date",
            text: {
              type: "text",
              markdown: false,
              content: `${featureData?.properties?.closedate.split("T")[0]}`,
            },
          },
        ];
        break;
      case "marketing email":
        data = [
          {
            label: "Name",
            text: {
              type: "text",
              markdown: false,
              content: `${featureData?.name}`,
            },
          },
          {
            label: "Subject",
            text: {
              type: "text",
              markdown: false,
              content: `${featureData?.subject ? featureData?.subject : "NA"}`,
            },
          },
          {
            label: "Publish By",
            text: {
              type: "text",
              markdown: false,
              content: `${
                featureData?.publishedByName
                  ? featureData?.publishedByName
                  : "NA"
              }`,
            },
          },
          {
            label: "Author Name",
            text: {
              type: "text",
              markdown: false,
              content: `${featureData?.authorName}`,
            },
          },
          {
            label: "Sent Count",
            text: {
              type: "text",
              markdown: false,
              content: `${
                featureData?.stats?.counters?.sent
                  ? featureData?.stats?.counters?.sent
                  : "0"
              }`,
            },
          },
          {
            label: "Open Count",
            text: {
              type: "text",
              markdown: false,
              content: `${
                featureData?.stats?.counters?.open
                  ? featureData?.stats?.counters?.open
                  : "0"
              }`,
            },
          },
          {
            label: "Click Count",
            text: {
              type: "text",
              markdown: false,
              content: `${
                featureData?.stats?.counters?.click
                  ? featureData?.stats?.counters?.click
                  : "0"
              }`,
            },
          },
          {
            label: "Click Ratio",
            text: {
              type: "text",
              markdown: false,
              content: `${
                featureData?.stats?.ratios?.clickratio
                  ? featureData?.stats?.ratios?.clickratio
                  : "0"
              }`,
            },
          },
          {
            label: "Open Ratio",
            text: {
              type: "text",
              markdown: false,
              content: `${
                featureData?.stats?.ratios?.openratio
                  ? featureData?.stats?.ratios?.openratio
                  : "0"
              }`,
            },
          },
        ];
        break;
      default:
        data = [];
        break;
    }
    return data;
  },

  // Title name from the feature name
  async titleName(featureName) {
    let name = "";
    switch (featureName) {
      case "contact":
        name = "Contact";
        break;
      case "companies":
        name = "Company";
        break;
      case "tickets":
        name = "Ticket";
        break;
      case "tasks":
        name = "Task";
        break;
      case "deals":
        name = "Deal";
        break;
      case "marketing email":
        name = "Marketing Email";
        break;
      default:
        name = "";
        break;
    }
    return name;
  },
};
