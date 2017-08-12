'use strict';

let _ = require('lodash');
let fs = require('fs');
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

  // for (let video of videoList) {
  //   let videoId = videoList[0].videoId;
  // }

  let videoId = videoList[0].videoId;

  // await exec('youtube-dl -ci -f \'best\' -o \'videos/temp.%(ext)s\' https://www.youtube.com/watch?v=' + videoId);
  if (fs.existsSync(__dirname + '/../videos/temp.mp4')) {
    console.log('mp4!');
    // let videoFilePath = __dirname + '/../videos/temp.mp4';
    // let videoWithLogoFilePath = __dirname + '/../videos/temp-logo.mp4';
    // let videoConvertedFilePath = __dirname + '/../videos/temp-logo.webm';
    // let logFilePath = __dirname + '/../videos/logo.png';
    // let command1 = 'ffmpeg -i ' + videoFilePath + ' -i ' + logFilePath + ' -filter_complex "overlay=main_w-overlay_w-20:main_h-overlay_h-15" ' + videoWithLogoFilePath;
    // await exec(command1);
    // let command2 = 'ffmpeg -fflags +genpts -i ' + videoWithLogoFilePath + ' -r 24 ' + videoConvertedFilePath
    // await exec(command2);
    // fs.unlinkSync(videoFilePath);
  } else {
    console.log('not mp4!');
    await exec('ffmpeg -i temp.webm -i logo.png -filter_complex "overlay=main_w-overlay_w-15:main_h-overlay_h-15" temp-logo.webm');
    await exec('ffmpeg -fflags +genpts -i temp-logo.webm -r 24 temp-logo.mp4');
  }

  // let authenticated = await youtubeService.authenticate(credential);
  // console.log('authenticated ', authenticated);
  //
  // var params = {
  //   resource: {
  //     snippet: {
  //       title: 'trump!!!',
  //       description: 'trump video uploaded via the YouTube API'
  //     },
  //     status: {
  //       privacyStatus: 'public'
  //     }
  //   }
  // }
  // let uploadedVideoId = await youtubeService.upload('./videos/temp-logo.webm', params);
  // console.log('uploadedVideoId ', uploadedVideoId);
  //
  // let playlistAdded = await youtubeService.addToPlaylist(credential, 'PLIPOJGlufsbVXLSBoM_utjoiAD93V4c63', uploadedVideoId);
  // console.log('playlistAdded ', playlistAdded);

}
