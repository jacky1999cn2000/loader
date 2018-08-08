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
    1. get video list and convert the videos (if all videos have been converted, simply exit)
  */
  let date = manifest.download.date;
  let filename = manifest.download.file;
  let batch = manifest.download.batch;

  let videoList = await s3Service.getVideoList(manifest.project.type, manifest.project.channelName, date, filename);
  let unConvertedVideoList = _.filter(videoList, (item) => {
    return !item.converted;
  });

  if (unConvertedVideoList.length == 0) {
    mailService.addLog('all videos in this file have been converted', true);
    await mailService.sendMail('Convert task completed');
    process.exit();
  }

  mailService.addLog('unconverted video list length: ' + unConvertedVideoList.length, true);

  let counter = 0;

  for (let video of videoList) {

    /*
      1.0 check if it was already converted
    */
    if (video.converted) {
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
    mailService.addLog('converting video ' + counter, true);
    mailService.addLog('video id: ' + videoId, false);

    let mp4VideoFilePath = __dirname + '/../videos/' + videoId + '.mp4';
    let mp4VideoConvertedFilePath = __dirname + '/../videos/' + videoId + '-converted.webm';

    let webmVideoFilePath = __dirname + '/../videos/' + videoId + '.webm';
    let webmVideoConvertedFilePath = __dirname + '/../videos/' + videoId + '-converted.mp4';

    let convertedSymbolFilePath = __dirname + '/../videos/' + videoId + '-converted.txt';


    /*
      1.2 convert video

      p.s. check if the file has already been converted (forever would resume nodejs after crash, so if the file has already converted, skip it)
    */
    if (fs.existsSync(convertedSymbolFilePath)) {

      mailService.addLog('already converted', false);

    } else {

      if (fs.existsSync(mp4VideoConvertedFilePath)) {

        mailService.addLog('removing partially converted mp4 video ' + videoId, false);
        fs.unlinkSync(mp4VideoConvertedFilePath);

      }

      if (fs.existsSync(webmVideoConvertedFilePath)) {

        mailService.addLog('removing partially converted webm video ' + videoId, false);
        fs.unlinkSync(webmVideoConvertedFilePath);

      }

      if (fs.existsSync(mp4VideoFilePath)) {

        mailService.addLog('video type: mp4', false);
        mailService.addLog('converting video', false);
        spawnSync('ffmpeg', ['-fflags', '+genpts', '-i', mp4VideoFilePath, '-r', '24', mp4VideoConvertedFilePath], {
          timeout: 3600000
        });

      } else if (fs.existsSync(webmVideoFilePath)) {

        mailService.addLog('video type: webm', false);
        mailService.addLog('converting video', false);
        spawnSync('ffmpeg', ['-fflags', '+genpts', '-i', webmVideoFilePath, '-r', '24', webmVideoConvertedFilePath], {
          timeout: 3600000
        });

      } else {

        mailService.addLog('unknown file extension', false);

      }

      // create a dummy file to indicate this specific video was converted
      fs.closeSync(fs.openSync(convertedSymbolFilePath, 'w'));

    }

    /*
      1.3 mark the video as converted
    */
    video.converted = true;

  }

  mailService.addLog('out of for loop', true);
  mailService.addLog('batch ' + batch, false);
  mailService.addLog('counter ' + counter, false);

  /*
    2. update video list in s3 after convert task completion
  */

  mailService.addLog('writing new video list to s3 ', true);

  let uploaded = await s3Service.uploadVideoList(manifest.project.type, manifest.project.channelName, date, filename, videoList);
  if (!uploaded) {
    mailService.addLog('writing new video list to s3 failed', false, true);
  }

  await mailService.sendMail('Convert task completed');

}
