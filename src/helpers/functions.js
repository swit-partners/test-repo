const axios = require('axios');

module.exports = {

    async postRequest(url, data, headers) {
        return new Promise(function (resolve, reject) {
            let res;
            axios.post(
                url,
                data,
                { headers: headers }
            ).then((dataRes) => {
                res = dataRes;
                // return dataRes;
                resolve(res) // successfully fill promise
            }).catch((err) => {
                res = err;
                resolve(res) // successfully fill promise
                //return err;
            });

        })
    },

    async confluencepostRequest(url,headers) {
        return new Promise(function (resolve, reject) {
            let res;
            axios.post(
                url,
                { headers: headers }
            ).then((dataRes) => {
                res = dataRes;
                // return dataRes;
                resolve(res) // successfully fill promise
            }).catch((err) => {
                res = err;
                resolve(res) // successfully fill promise
                //return err;
            });

        })
    },

    async getRequest(url, headers) {
        console.log(url, 'url from request get');
        return new Promise(function (resolve, reject) {

            axios.get(
                url,
                { headers: headers }
            ).then((dataRes) => {

                console.log(dataRes.body, 'dataRes--------get request');
                resolve(dataRes) // successfully fill promise
            }).catch((err) => {

                console.log(err.body, 'err--------get request');
                resolve(err) // successfully fill promise
            });

        })

    },


    async setUserDetails(userData, userToken) {
        console.log('res  calling now');
        const headers = { Authorization: 'Bearer ' + userToken }

        let res = await this.getRequest(process.env.SWIT_API_URL + 'user.info', headers);
        if (res.data) {
            console.log(res.data);
        }

    },
    
    async parseJwt (token) {
        return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    }


};