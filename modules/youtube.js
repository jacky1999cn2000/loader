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
  console.log('\n\r');

  if (!isTokenValid) {
    let access_token = await youtubeService.refreshToken(credential);
    credential.access_token = access_token;
    jsonfile.writeFileSync('./.google-oauth2-credentials.json', credential);
  }

  /*
    2. authenticate, if failed, exit
  */
  let authenticated = await youtubeService.authenticate(credential);
  if (!authenticated) {
    console.log('authenticate failed');
    process.exit(1);
  }

  /*
    3. get video list, and process each video
  */
  let filename = downupload.configuration.file;
  let batch = downupload.configuration.batch;

  let videoList = await s3Service.getVideoList(filename);
  console.log('videoList ', videoList.length);
  console.log('\n\r');

  let counter = 0;

  for (let video of videoList) {

    if (counter >= batch) {
      console.log('reached the batch size ', batch);
      break;
    }
    counter++;

    let videoId = video.videoId;
    console.log('*** processing video ***');
    console.log('videoId ', videoId);

    /*
      3.1 download video
    */
    console.log('--- download video');
    let command_download = 'youtube-dl -ci -f \'best\' -o \'videos/' + videoId + '.%(ext)s\' https://www.youtube.com/watch?v=' + videoId;
    await exec(command_download);

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
      console.log('--- video format: mp4 video');
      videoType = 'mp4';

      console.log('--- add watermark');
      let command_watermark = 'ffmpeg -i ' + mp4VideoFilePath + ' -i ' + logFilePath + ' -filter_complex "overlay=main_w-overlay_w-20:main_h-overlay_h-15" ' + mp4VideoWithLogoFilePath;
      await exec(command_watermark);

      console.log('--- convert video');
      let command_convert = 'ffmpeg -fflags +genpts -i ' + mp4VideoWithLogoFilePath + ' -r 24 ' + mp4VideoConvertedFilePath;
      await exec(command_convert);

    } else if (fs.existsSync(webmVideoFilePath)) {
      console.log('--- video format: webm video');
      videoType = 'webm';

      console.log('--- add watermark');
      let command_watermark = 'ffmpeg -i ' + webmVideoFilePath + ' -i ' + logFilePath + ' -filter_complex "overlay=main_w-overlay_w-20:main_h-overlay_h-15" ' + webmVideoWithLogoFilePath;
      await exec(command_watermark);

      console.log('--- convert video');
      let command_convert = 'ffmpeg -fflags +genpts -i ' + webmVideoWithLogoFilePath + ' -r 24 ' + webmVideoConvertedFilePath;
      await exec(command_convert);

    } else {
      console.log('unknown file extension');
      continue;
    }

    /*
      3.3 upload to youtube (if target type is playlist, then add the video to playlist)
    */
    console.log('--- upload video');
    let uploadVideoFilePath;
    if (videoType == 'mp4') {
      uploadVideoFilePath = './videos/' + videoId + '-logo.webm';
    } else if (videoType == 'webm') {
      uploadVideoFilePath = './videos/' + videoId + '-logo.mp4';
    }
    let uploadedVideoId = await youtubeService.upload(uploadVideoFilePath, video);
    console.log('uploadedVideoId ', uploadedVideoId);

    if (!uploadedVideoId) {
      break;
    }

    if (video.targetType == 'playlist') {
      console.log('--- add video to playlist');
      let playlistAdded = await youtubeService.addToPlaylist(credential, video.targetId, uploadedVideoId);
      console.log('playlistAdded ', playlistAdded);
    }
  }

  /*
    4. removed the uploaded videos from video list, and overwrite the video list file in s3
  */
  console.log('\n\r');
  console.log('*** out of for loop ***');
  console.log('--- batch ', batch);
  console.log('--- counter ', counter);

  videoList = videoList.splice(counter, videoList.length - counter);
  console.log('videoList new length ', videoList.length);

  let uploaded = await s3Service.uploadVideoList(videoList, filename);
  console.log('uploaded ', uploaded);

}
