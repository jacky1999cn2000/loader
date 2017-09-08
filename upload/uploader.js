'use strict';

let _ = require('lodash');
let fs = require('fs');
let jsonfile = require('jsonfile');
let spawnSync = require('child_process').spawnSync;

let s3Service = require('../services/s3');
let youtubeService = require('../services/youtube');
let mailService = require('../services/mail');

module.exports = async(manifest) => {

  // TODO: remove it later
  // if (process.env.RUNNING_ENVIRONMENT == 'local') {
  //   return;
  // }

  mailService.addLog('PROJECT INFORMATION', true);
  mailService.addLog('email: ' + manifest.project.email, false);
  mailService.addLog('channelUrl: ' + manifest.project.channelUrl, false);
  mailService.addLog('channelName: ' + manifest.project.channelName, false);
  mailService.addLog('description: ' + manifest.project.description, false);
  mailService.addLog('type: ' + manifest.project.type, false);
  mailService.addLog('file: ' + manifest.upload.file, false);
  mailService.addLog('date: ' + manifest.upload.date, false);
  mailService.addLog('batch: ' + manifest.upload.batch, false);

  /*
    0. get credential from manifest, and write it to ./google-oauth2-credentials.json file (will be used for upload)
  */
  let credential = manifest.credential;
  jsonfile.writeFileSync('./.google-oauth2-credentials.json', credential);

  /*
    1. check if current access_token is still valid, if not, use refresh_token to get new access_token and write it to credential file
  */
  let isTokenValid = await youtubeService.isTokenValid(credential);
  mailService.addLog('Is token valid: ' + isTokenValid, true);

  if (!isTokenValid) {
    let access_token = await youtubeService.refreshToken(credential);
    credential.access_token = access_token;
    jsonfile.writeFileSync('./.google-oauth2-credentials.json', credential);
    mailService.addLog('refreshed token', true);
  }

  /*
    2. authenticate, if failed, exit
  */
  let authenticated = await youtubeService.authenticate(credential);
  if (!authenticated) {
    mailService.addLog('authenticate failed', true);
    await mailService.sendMail();
    process.exit();
  }

  /*
    3. get video list, and upload each video
  */
  let date = manifest.upload.date;
  let filename = manifest.upload.file;
  let batch = manifest.upload.batch;

  let videoList = await s3Service.getVideoList(manifest.project.type, manifest.project.channelName, date, filename);
  let unUploadedVideoList = _.filter(videoList, (item) => {
    return !item.uploaded;
  });

  mailService.addLog('unUploadedVideoList video list length: ' + unUploadedVideoList.length, true);

  let counter = 0;
  let excludeArray = [];

  for (let video of videoList) {

    /*
      3.0 check if the was not processed yet or already uploaded
    */
    if (!video.processed || video.uploaded) {
      continue;
    }

    if (counter >= batch) {
      mailService.addLog('reached batch size: ' + batch, true);
      break;
    }
    counter++;

    if (_.includes(excludeArray, counter)) {
      continue;
    }

    let videoId = video.videoId;
    mailService.addLog('uploading video ' + counter, true);
    mailService.addLog('video id: ' + videoId, false);

    /*
      3.1 upload to youtube
    */
    mailService.addLog('uploading video', false);

    let mp4VideoFilePath = __dirname + '/../videos/' + videoId + '.mp4';
    let uploadedSymbolFilePath = __dirname + '/../videos/' + videoId + '-uploaded.txt';

    let uploadVideoFilePath;

    if (fs.existsSync(mp4VideoFilePath)) {
      uploadVideoFilePath = './videos/' + videoId + '-converted.webm';
    } else {
      uploadVideoFilePath = './videos/' + videoId + '-converted.mp4';
    }

    let uploadedVideoId = await youtubeService.upload(uploadVideoFilePath, video);

    if (!uploadedVideoId) {
      mailService.addLog('uploading video failed', false, true);

      // use 'break' instead of 'continue' since it might mean API quota was used up
      counter--;
      break;
    }

    // create a dummy file to indicate this specific video was uploaded
    fs.closeSync(fs.openSync(uploadedSymbolFilePath, 'w'));

    /*
      3.2 mark the video as uploaded
    */
    video.uploaded = true;

    /*
      3.3 if target type is playlist, then add the video to playlist
    */
    if (video.targetType == 'playlist') {
      mailService.addLog('adding video to playlist', false);

      let playlistAdded = await youtubeService.addToPlaylist(credential, video.targetId, uploadedVideoId);

      if (!playlistAdded) {
        mailService.addLog('adding video to playlist failed', false, true);

        // use 'break' instead of 'continue' since it might mean API quota was used up
        counter--;
        break;
      }
    }
  }

  /*
    4. removed the uploaded videos from video list, and overwrite the video list file in s3
  */
  mailService.addLog('out of for loop', true);
  mailService.addLog('batch ' + batch, false);
  mailService.addLog('counter ' + counter, false);

  mailService.addLog('writing new video list to s3 ', true);

  let uploaded = await s3Service.uploadVideoList(manifest.project.type, manifest.project.channelName, date, filename, videoList);
  if (!uploaded) {
    mailService.addLog('writing new video list to s3 failed', false, true);
  }

  await mailService.sendMail();

}
