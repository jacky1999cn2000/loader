'use strict';

let _ = require('lodash');
let request = require('request');

// let YouTube = require('youtube-video-api');
// let youtube = YouTube({
//   video: {
//     part: 'status,snippet'
//   }
// });

module.exports = {
  /*
    check if current access_token is still valid
  */
  isTokenValid: (credential) => {

    let options = {
      url: 'https://www.googleapis.com/youtube/v3/search',
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + credential.access_token
      },
      qs: {
        part: 'snippet',
        channelId: credential.channelId,
        order: 'date',
        maxResults: 5
      }
    };

    let p = new Promise((resolve, reject) => {
      request(options, (err, response, body) => {
        if (err) {
          console.log('request err ', err);
          reject(err);
        }
        let bodyJson = JSON.parse(response.body)

        if (bodyJson.error && bodyJson.error.message && bodyJson.error.message == 'Invalid Credentials') {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });

    return p;
  },

  /*
    use refresh_token to get new access_token
  */
  refreshToken: (credential) => {

    let options = {
      url: 'https://www.googleapis.com/oauth2/v4/token',
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      qs: {
        client_id: credential.client_id,
        client_secret: credential.client_secret,
        refresh_token: credential.refresh_token,
        grant_type: 'refresh_token'
      }
    };

    let p = new Promise((resolve, reject) => {
      request(options, (err, response, body) => {
        if (err) {
          console.log('request err ', err);
          reject(err);
        }
        let bodyJson = JSON.parse(response.body)
        resolve(bodyJson.access_token);
      });
    });

    return p;
  },
}
