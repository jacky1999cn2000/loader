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
          resolve(video.id);
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
      qs: {
        part: 'snippet',
        key: credential.apiKey
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
