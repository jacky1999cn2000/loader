'use strict';

let _ = require('lodash');
let jsonfile = require('jsonfile');

let s3Service = require('../services/s3');
let youtubeService = require('../services/youtube');


let util = require('util');
let exec = util.promisify(require('child_process').exec);

let credential = require('../.google-oauth2-credentials.json');

module.exports = async(downupload) => {

  /*
    1. if current access_token not valid, then use refresh_token to get new access_token and write it to credential file
  */
  let isTokenValid = await youtubeService.isTokenValid(credential);
  console.log('isTokenValid ', isTokenValid);

  if (!isTokenValid) {
    let access_token = await youtubeService.refreshToken(credential);
    credential.access_token = access_token;
    jsonfile.writeFileSync('./.google-oauth2-credentials.json', credential);
  }

  /*
    2.
  */


  let filename = downupload.configuration.file;
  let batch = downupload.configuration.batch;

  let videoList = await s3Service.getVideoList(filename);
  console.log('videoList ', videoList.length);

  let videoId = videoList[0].videoId;

  await exec('youtube-dl -ci -f \'best\' -o \'videos/temp.%(ext)s\' https://www.youtube.com/watch?v=' + videoId);

  // for (let video of videoList) {
  //
  // }

}
