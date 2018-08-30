'use strict';

let _ = require('lodash');
let request = require('request');

let YouTube = require('youtube-video-api');
let youtube = YouTube({
  video: {
    part: 'status,snippet'
  }
});

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
        } else {
          let bodyJson = JSON.parse(response.body)

          if (bodyJson.error && bodyJson.error.message && bodyJson.error.message == 'Invalid Credentials') {
            resolve(false);
          } else {
            resolve(true);
          }
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
        } else {
          let bodyJson = JSON.parse(response.body)
          resolve(bodyJson.access_token);
        }
      });
    });

    return p;
  },

  /*
    authenticate youtube upload service
  */
  authenticate: (credential) => {

    let p = new Promise((resolve, reject) => {
      youtube.authenticate(credential.client_id, credential.client_secret, (err, tokens) => {
        if (err) {
          console.log('authenticate err ', err);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });

    return p;
  },

  /*
    upload to youtube
  */
  upload: (filepath, video) => {

    let params = {
      resource: {
        snippet: {
          title: video.title,
          description: video.description
        },
        status: {
          privacyStatus: 'public'
        }
      }
    }

    let p = new Promise((resolve, reject) => {
      youtube.upload(filepath, params, (err, video) => {
        if (err) {
          console.log('upload err ', err);
          resolve(false);
        } else {
          resolve(video);
        }
      });
    });

    return p;
  },

  /*
    update video's metadata - tags and localization
  */
  updateVideo: (credential, video) => {

    let body = {
        "id": video.uploadedVideo.id,
        "snippet": {
          "title": video.title,
          "description": video.description,
          "defaultLanguage": "zh",
          "tags":video.tags.split(','),
          "categoryId": "24"
        },
        "localizations":{
          "en":{
            "title": video.title_en,
            "description": video.description_en
          }
        }
      }

    let options = {
      url: 'https://www.googleapis.com/youtube/v3/videos',
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + credential.access_token
      },
      qs: {
        part: 'snippet,localizations'
      },
      json: body
    };

    let p = new Promise((resolve, reject) => {
      request(options, (err, response, body) => {
        if (err) {
          console.log('request err ', err);
          resolve(false);
        } else {
          let bodyString = JSON.stringify(response.body);
          if (bodyString.indexOf('error') > -1) {
            resolve(false);
          } else {
            resolve(true);
          }
        }
      });
    });

    return p;
  },

  /*
    add video to a playlist
  */
  addToPlaylist: (credential, playlistId, videoId) => {

    let body = {
      "snippet": {
        "playlistId": playlistId,
        "resourceId": {
          "kind": "youtube#video",
          "videoId": videoId
        }
      }
    };

    let options = {
      url: 'https://www.googleapis.com/youtube/v3/playlistItems',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + credential.access_token
      },
      qs: {
        part: 'snippet'
      },
      json: body
    };

    let p = new Promise((resolve, reject) => {
      request(options, (err, response, body) => {
        if (err) {
          console.log('request err ', err);
          resolve(false);
        } else {
          let bodyString = JSON.stringify(response.body);
          if (bodyString.indexOf('error') > -1) {
            resolve(false);
          } else {
            resolve(true);
          }
        }
      });
    });

    return p;
  }
}
