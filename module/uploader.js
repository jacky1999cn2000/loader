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
    1. get credential from manifest, and write it to ./google-oauth2-credentials.json file (will be used for upload)
  */
  let credential = manifest.credential;
  jsonfile.writeFileSync('./.google-oauth2-credentials.json', credential);

  /*
    2. authenticate, if failed, exit
  */
  let authenticated = await youtubeService.authenticate(credential);
  if (!authenticated) {
    mailService.addLog('authenticate failed', true);
    await mailService.sendMail('Authenticate failed');
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

  if (unUploadedVideoList.length == 0) {
    mailService.addLog('all videos in this file have been uploaded', true);
    await mailService.sendMail('Upload task completed');
    process.exit();
  }

  mailService.addLog('unUploadedVideoList video list length: ' + unUploadedVideoList.length, true);

  let counter = 0;
  let excludeArray = _.range(0, 0); //modify this array if want to skip certain video

  for (let video of videoList) {

    /*
      3.0 check if the was already uploaded
    */
    if (video.uploaded) {
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
    let suffix = 'converted'; // moidfy this in order to designate which video to upload

    if (fs.existsSync(mp4VideoFilePath)) {
      uploadVideoFilePath = './videos/' + videoId + '-' + suffix + '.webm';
      if (!fs.existsSync(uploadVideoFilePath)) {
        mailService.addLog('file did not exist, probably caused by process failure', false);
        continue;
      }
    } else {
      uploadVideoFilePath = './videos/' + videoId + '-' + suffix + '.mp4';
      if (!fs.existsSync(uploadVideoFilePath)) {
        mailService.addLog('file did not exist, probably caused by process failure', false);
        continue;
      }
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

  mailService.addLog('out of for loop', true);
  mailService.addLog('batch ' + batch, false);
  mailService.addLog('counter ' + counter, false);

  /*
    4. update video list in s3 after upload task completion
  */

  mailService.addLog('writing new video list to s3 ', true);

  let uploaded = await s3Service.uploadVideoList(manifest.project.type, manifest.project.channelName, date, filename, videoList);
  if (!uploaded) {
    mailService.addLog('writing new video list to s3 failed', false, true);
  }

  await mailService.sendMail('Upload task completion');

}
