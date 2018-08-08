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
  mailService.addLog('file: ' + manifest.download.file, false);
  mailService.addLog('date: ' + manifest.download.date, false);
  mailService.addLog('batch: ' + manifest.download.batch, false);

  /*
    1. get video list and crop the videos (if all videos have been cropped, simply exit)
  */
  let date = manifest.download.date;
  let filename = manifest.download.file;
  let batch = manifest.download.batch;

  let videoList = await s3Service.getVideoList(manifest.project.type, manifest.project.channelName, date, filename);
  let unCroppedVideoList = _.filter(videoList, (item) => {
    return !item.cropped;
  });

  if (unCroppedVideoList.length == 0) {
    mailService.addLog('all videos in this file have been cropped', true);
    await mailService.sendMail('Crop task completed');
    process.exit();
  }

  mailService.addLog('uncropped video list length: ' + unCroppedVideoList.length, true);

  let counter = 0;

  for (let video of videoList) {

    /*
      1.0 check if it was already cropped
    */
    if (video.cropped) {
      continue;
    }

    /*
      1.1 check if it reached batch size
    */
    if (counter >= batch) {
      mailService.addLog('reached batch size: ' + batch, true);
      break;
    }
    counter++;

    let videoId = video.videoId;
    mailService.addLog('cropping video ' + counter, true);
    mailService.addLog('video id: ' + videoId, false);

    let mp4VideoFilePath = __dirname + '/../videos/' + videoId + '.mp4';
    let mp4VideoCroppedFilePath = __dirname + '/../videos/' + videoId + '-cropped.webm';

    let webmVideoFilePath = __dirname + '/../videos/' + videoId + '.webm';
    let webmVideoCroppedFilePath = __dirname + '/../videos/' + videoId + '-cropped.mp4';

    let croppedSymbolFilePath = __dirname + '/../videos/' + videoId + '-cropped.txt';


    /*
      1.2 crop video

      p.s. check if the file has already been cropped (forever would resume nodejs after crash, so if the file has already cropped, skip it)
    */
    if (fs.existsSync(croppedSymbolFilePath)) {

      mailService.addLog('already cropped', false);

    } else {

      if (fs.existsSync(mp4VideoCroppedFilePath)) {

        mailService.addLog('removing partially cropped mp4 video ' + videoId, false);
        fs.unlinkSync(mp4VideoCroppedFilePath);

      }

      if (fs.existsSync(webmVideoCroppedFilePath)) {

        mailService.addLog('removing partially cropped webm video ' + videoId, false);
        fs.unlinkSync(webmVideoCroppedFilePath);

      }

      if (fs.existsSync(mp4VideoFilePath)) {

        mailService.addLog('video type: mp4', false);
        mailService.addLog('cropping video', false);

        ///TODO: modify the command here based on demands
        spawnSync('ffmpeg', ['-fflags', '+genpts', '-i', mp4VideoFilePath, '-r', '24', mp4VideoCroppedFilePath], {
          timeout: 3600000
        });

      } else if (fs.existsSync(webmVideoFilePath)) {

        mailService.addLog('video type: webm', false);
        mailService.addLog('cropping video', false);

        ///TODO: modify the command here based on demands
        spawnSync('ffmpeg', ['-fflags', '+genpts', '-i', webmVideoFilePath, '-r', '24', webmVideoCroppedFilePath], {
          timeout: 3600000
        });

      } else {

        mailService.addLog('unknown file extension', false);

      }

      // create a dummy file to indicate this specific video was cropped
      fs.closeSync(fs.openSync(croppedSymbolFilePath, 'w'));

    }

    /*
      1.3 mark the video as watermarked
    */
    video.cropped = true;

  }

  mailService.addLog('out of for loop', true);
  mailService.addLog('batch ' + batch, false);
  mailService.addLog('counter ' + counter, false);

  /*
    2. update video list in s3 after crop task completion
  */

  mailService.addLog('writing new video list to s3 ', true);

  let uploaded = await s3Service.uploadVideoList(manifest.project.type, manifest.project.channelName, date, filename, videoList);
  if (!uploaded) {
    mailService.addLog('writing new video list to s3 failed', false, true);
  }

  await mailService.sendMail('Crop task completed');

}
