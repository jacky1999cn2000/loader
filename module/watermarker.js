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
  let date = manifest.current.date;
  let filename = manifest.current.file;
  let batch = manifest.current.batch;

  let videoList = await s3Service.getVideoList(manifest.project.type, manifest.project.channelName, date, filename);
  let unWartermarkedVideoList = _.filter(videoList, (item) => {
    return !item.watermark;
  });

  if (unWartermarkedVideoList.length == 0) {
    mailService.addLog('all videos in this file have been watermarked', true);
    await mailService.sendMail('Watermark task completed');
    process.exit();
  }

  mailService.addLog('unwatermarked video list length: ' + unWartermarkedVideoList.length, true);

  let counter = 0;

  for (let video of videoList) {

    /*
      1.0 check if it was already converted
    */
    if (video.watermarked) {
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
    mailService.addLog('watermarking video ' + counter, true);
    mailService.addLog('video id: ' + videoId, false);

    let mp4VideoFilePath = __dirname + '/../videos/' + videoId + '.mp4';
    let mp4VideoWatermarkedFilePath = __dirname + '/../videos/' + videoId + '-watermarked.webm';

    let webmVideoFilePath = __dirname + '/../videos/' + videoId + '.webm';
    let webmVideoWatermarkedFilePath = __dirname + '/../videos/' + videoId + '-watermarked.mp4';

    let watermarkedSymbolFilePath = __dirname + '/../videos/' + videoId + '-watermarked.txt';


    /*
      1.2 watermark video

      p.s. check if the file has already been watermarked (forever would resume nodejs after crash, so if the file has already watermarked, skip it)
    */
    if (fs.existsSync(watermarkedSymbolFilePath)) {

      mailService.addLog('already watermarked', false);

    } else {

      if (fs.existsSync(mp4VideoWatermarkedFilePath)) {

        mailService.addLog('removing partially watermarked mp4 video ' + videoId, false);
        fs.unlinkSync(mp4VideoWatermarkedFilePath);

      }

      if (fs.existsSync(webmVideoWatermarkedFilePath)) {

        mailService.addLog('removing partially watermarked webm video ' + videoId, false);
        fs.unlinkSync(webmVideoWatermarkedFilePath);

      }

      if (fs.existsSync(mp4VideoFilePath)) {

        mailService.addLog('video type: mp4', false);
        mailService.addLog('watermarking video', false);

        ///TODO: modify the command here based on demands
        spawnSync('ffmpeg', ['-fflags', '+genpts', '-i', mp4VideoFilePath, '-r', '24', mp4VideoWatermarkedFilePath], {
          timeout: 3600000
        });

      } else if (fs.existsSync(webmVideoFilePath)) {

        mailService.addLog('video type: webm', false);
        mailService.addLog('watermarking video', false);

        ///TODO: modify the command here based on demands
        spawnSync('ffmpeg', ['-fflags', '+genpts', '-i', webmVideoFilePath, '-r', '24', webmVideoWatermarkedFilePath], {
          timeout: 3600000
        });

      } else {

        mailService.addLog('unknown file extension', false);

      }

      // create a dummy file to indicate this specific video was watermarked
      fs.closeSync(fs.openSync(watermarkedSymbolFilePath, 'w'));

    }

    /*
      1.3 mark the video as watermarked
    */
    video.watermarked = true;

  }

  mailService.addLog('out of for loop', true);
  mailService.addLog('batch ' + batch, false);
  mailService.addLog('counter ' + counter, false);

  /*
    2. update video list in s3 after watermark task completion
  */

  mailService.addLog('writing new video list to s3 ', true);

  let uploaded = await s3Service.uploadVideoList(manifest.project.type, manifest.project.channelName, date, filename, videoList);
  if (!uploaded) {
    mailService.addLog('writing new video list to s3 failed', false, true);
  }

  await mailService.sendMail('Watermark task completed');

}
