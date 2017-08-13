'use strict';

let _ = require('lodash');
let fs = require('fs');
let jsonfile = require('jsonfile');

let s3Service = require('../services/s3');
let youtubeService = require('../services/youtube');
let mailService = require('../services/mail');

let util = require('util');
let exec = util.promisify(require('child_process').exec);

let credential = require('../.google-oauth2-credentials.json');

module.exports = async(downupload) => {

  mailService.addLog('PROJECT INFORMATION', true);
  mailService.addLog('email: ' + downupload.project.email, false);
  mailService.addLog('channelUrl: ' + downupload.project.channelUrl, false);
  mailService.addLog('channelName: ' + downupload.project.channelName, false);
  mailService.addLog('description: ' + downupload.project.description, false);
  mailService.addLog('type: ' + downupload.project.type, false);
  mailService.addLog('file: ' + downupload.configuration.file, false);
  mailService.addLog('batch: ' + downupload.configuration.batch, false);

  /*
    1. check if current access_token is still valid, if not, use refresh_token to get new access_token and write it to credential file
  */
  let isTokenValid = await youtubeService.isTokenValid(credential);
  mailService.addLog('Is token valid: ' + isTokenValid, true);

  if (!isTokenValid) {
    let access_token = await youtubeService.refreshToken(credential);
    credential.access_token = access_token;
    jsonfile.writeFileSync('./.google-oauth2-credentials.json', credential);
    mailService.addLog('refresh token', true);
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
    3. get video list, and process each video
  */
  let filename = downupload.configuration.file;
  let batch = downupload.configuration.batch;

  let videoList = await s3Service.getVideoList(filename);
  mailService.addLog('video list length: ' + videoList.length, true);

  let counter = 0;

  for (let video of videoList) {

    if (counter >= batch) {
      mailService.addLog('reached batch size: ' + batch, true);
      break;
    }
    counter++;

    let videoId = video.videoId;
    mailService.addLog('processing video', true);
    mailService.addLog('video id: ' + videoId, false);

    /*
      3.1 download video
    */
    let command_download = 'youtube-dl -ci -f \'best\' -o \'videos/' + videoId + '.%(ext)s\' https://www.youtube.com/watch?v=' + videoId;
    await exec(command_download);
    mailService.addLog('downloaded video', false);

    /*
      3.2 add watermark and convert video format
    */
    let mp4VideoFilePath = __dirname + '/../videos/' + videoId + '.mp4';
    let mp4VideoWithLogoFilePath = __dirname + '/../videos/' + videoId + '-logo.mp4';
    let mp4VideoConvertedFilePath = __dirname + '/../videos/' + videoId + '-logo.webm';

    let webmVideoFilePath = __dirname + '/../videos/' + videoId + '.webm';
    let webmVideoWithLogoFilePath = __dirname + '/../videos/' + videoId + '-logo.webm';
    let webmVideoConvertedFilePath = __dirname + '/../videos/' + videoId + '-logo.mp4';

    let logFilePath = __dirname + '/../videos/logo.png';

    let videoType;

    if (fs.existsSync(mp4VideoFilePath)) {

      videoType = 'mp4';
      mailService.addLog('video type: ' + videoType, false);

      mailService.addLog('adding watermark', false);
      let command_watermark = 'ffmpeg -i ' + mp4VideoFilePath + ' -i ' + logFilePath + ' -filter_complex "overlay=main_w-overlay_w-20:main_h-overlay_h-15" ' + mp4VideoWithLogoFilePath;
      await exec(command_watermark);

      mailService.addLog('converting video', false);
      let command_convert = 'ffmpeg -fflags +genpts -i ' + mp4VideoWithLogoFilePath + ' -r 24 ' + mp4VideoConvertedFilePath;
      await exec(command_convert);

    } else if (fs.existsSync(webmVideoFilePath)) {

      videoType = 'webm';
      mailService.addLog('video type: ' + videoType, false);

      mailService.addLog('adding watermark', false);
      let command_watermark = 'ffmpeg -i ' + webmVideoFilePath + ' -i ' + logFilePath + ' -filter_complex "overlay=main_w-overlay_w-20:main_h-overlay_h-15" ' + webmVideoWithLogoFilePath;
      await exec(command_watermark);

      mailService.addLog('converting video', false);
      let command_convert = 'ffmpeg -fflags +genpts -i ' + webmVideoWithLogoFilePath + ' -r 24 ' + webmVideoConvertedFilePath;
      await exec(command_convert);

    } else {
      mailService.addLog('unknown file extension', false);
      continue;
    }

    /*
      3.3. check if current access_token is still valid, if not, use refresh_token to get new access_token, write it to credential file, and re-authenticate (necessary since the prior 2 steps might take a long time, and access_token is valid for 1 hour)
    */
    let isTokenValid = await youtubeService.isTokenValid(credential);
    mailService.addLog('token still valid: ' + isTokenValid, false);

    if (!isTokenValid) {
      let access_token = await youtubeService.refreshToken(credential);
      credential.access_token = access_token;
      jsonfile.writeFileSync('./.google-oauth2-credentials.json', credential);
      mailService.addLog('refresh token', false);

      let authenticated = await youtubeService.authenticate(credential);
      if (!authenticated) {
        mailService.addLog('authenticate failed', true);
        await mailService.sendMail();
        process.exit();
      }
    }

    /*
      3.4 upload to youtube (if target type is playlist, then add the video to playlist)
    */
    mailService.addLog('uploading video', false);
    let uploadVideoFilePath;
    if (videoType == 'mp4') {
      uploadVideoFilePath = './videos/' + videoId + '-logo.webm';
    } else if (videoType == 'webm') {
      uploadVideoFilePath = './videos/' + videoId + '-logo.mp4';
    }
    let uploadedVideoId = await youtubeService.upload(uploadVideoFilePath, video);

    if (!uploadedVideoId) {
      mailService.addLog('uploading video failed', false, true);
      break;
    }

    if (video.targetType == 'playlist') {
      mailService.addLog('adding video to playlist', false);
      let playlistAdded = await youtubeService.addToPlaylist(credential, video.targetId, uploadedVideoId);
      if (!playlistAdded) {
        mailService.addLog('adding video to playlist failed', false, true);
      }
    }
  }

  /*
    4. removed the uploaded videos from video list, and overwrite the video list file in s3
  */
  mailService.addLog('out of for loop', true);
  mailService.addLog('batch ' + batch, false);
  mailService.addLog('counter ' + counter, false);

  videoList = videoList.splice(counter, videoList.length - counter);

  mailService.addLog('video list new length: ' + videoList.length, true);
  mailService.addLog('writing new video list to s3 ', true);

  let uploaded = await s3Service.uploadVideoList(videoList, filename);
  if (!uploaded) {
    mailService.addLog('writing new video list to s3 failed', false, true);
  }

  await mailService.sendMail();

}
