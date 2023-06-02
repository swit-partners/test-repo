const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_API_KEY });


async function getDb() {
  const database = await notion.databases.retrieve({
    database_id: process.env.NOTION_DATABASE_ID,
  });

//  console.log(database, 'Db info---------------------------------');
}


// app.post("/create-record", async (req, res) => {
//   console.log(req.body, 'req');
//   const { title, description, date, number } = req.body

//   await createDbEntry({
//     title,
//     description,
//     date,
//     number
//   })

//   res.redirect("/")
// });

function createDbEntry({ title, description, date, number }) {
  console.log(title, description, process.env.NOTION_TITLE_ID, 'process.env.NOTION_TITLE_ID');
  notion.pages.create({
    parent: {
      database_id: process.env.NOTION_DATABASE_ID,
    },
    properties: {
      [process.env.NOTION_TITLE_ID]: {
        title: [
          {
            type: "text",
            text: {
              content: title,
            },
          },
        ],
      },
      [process.env.NOTION_DESCRIPTION_ID]: {
        rich_text: [
          {
            type: "text",
            text: {
              content: description,
            },
          },
        ],
      },

      [process.env.NOTION_DATE_ID]: {
        rich_text: [
          {
            type: "text",
            text: {
              content: date,
            },
          },
        ],
      },

      [process.env.NOTION_NUMBER_ID]: {
        rich_text: [
          {
            type: "text",
            text: {
              content: number,
            },
          },
        ],
      },

    },
  })
}


// function createNewPage() {
//  // (async () => {
//     const response = notion.pages.create({
//       "cover": {
//         "type": "external",
//         "external": {
//           "url": "https://upload.wikimedia.org/wikipedia/commons/6/62/Tuscankale.jpg"
//         }
//       },
//       "icon": {
//         "type": "emoji",
//         "emoji": "🥬"
//       },
//       "parent": {
//         "type": "database_id",
//         "database_id": process.env.NOTION_DATABASE_ID
//       },
//       "properties": {
//         "Name": {
//           "title": [
//             {
//               "text": {
//                 "content": "Tuscan kale"
//               }
//             }
//           ]
//         },
//         "Description": {
//           "rich_text": [
//             {
//               "text": {
//                 "content": "A dark green leafy vegetable"
//               }
//             }
//           ]
//         },
//         "Food group": {
//           "select": {
//             "name": "🥬 Vegetable"
//           }
//         }
//       },
//       "children": [
//         {
//           "object": "block",
//           "heading_2": {
//             "rich_text": [
//               {
//                 "text": {
//                   "content": "Lacinato kale"
//                 }
//               }
//             ]
//           }
//         },
//         {
//           "object": "block",
//           "paragraph": {
//             "rich_text": [
//               {
//                 "text": {
//                   "content": "Lacinato kale is a variety of kale with a long tradition in Italian cuisine, especially that of Tuscany. It is also known as Tuscan kale, Italian kale, dinosaur kale, kale, flat back kale, palm tree kale, or black Tuscan palm.",
//                   "link": {
//                     "url": "https://en.wikipedia.org/wiki/Lacinato_kale"
//                   }
//                 },
//                 "href": "https://en.wikipedia.org/wiki/Lacinato_kale"
//               }
//             ],
//             "color": "default"
//           }
//         }
//       ]
//     });
//     console.log(response);
//  // });
// }

module.exports = {
  createDbEntry,
  //createNewPage
}

getDb();