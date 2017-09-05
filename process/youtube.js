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
    1. get video list and process the rest (if all videos have been processed, simply exit)
  */
  let date = manifest.download.date;
  let filename = manifest.download.file;
  let batch = manifest.download.batch;

  let videoList = await s3Service.getVideoList(manifest.project.type, manifest.project.channelName, date, filename);
  let unProcessedVideoList = _.filter(videoList, (item) => {
    return !item.processed;
  });

  if (unProcessedVideoList.length == 0) {
    mailService.addLog('all videos in this file have been processed', true);
    await mailService.sendMail();
    process.exit();
  }

  mailService.addLog('unprocessed video list length: ' + unProcessedVideoList.length, true);

  let counter = 0;

  for (let video of videoList) {

    /*
      1.0 check if it was already processed
    */
    if (video.process) {
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
    mailService.addLog('processing video ' + counter, true);
    mailService.addLog('video id: ' + videoId, false);

    let mp4VideoFilePath = __dirname + '/../videos/' + videoId + '.mp4';
    let mp4VideoConvertedFilePath = __dirname + '/../videos/' + videoId + '-converted.webm';

    let webmVideoFilePath = __dirname + '/../videos/' + videoId + '.webm';
    let webmVideoConvertedFilePath = __dirname + '/../videos/' + videoId + '-converted.mp4';

    let downloadedSymbolFilePath = __dirname + '/../videos/' + videoId + '-downloaded.txt';
    let convertedSymbolFilePath = __dirname + '/../videos/' + videoId + '-converted.txt';

    /*
      1.2 download video

      p.s. check if the file has already been downloaded (forever would resume nodejs after crash, so if the file has already downloaded, skip it)
    */
    if (fs.existsSync(downloadedSymbolFilePath)) {

      mailService.addLog('already downloaded', false);

    } else {

      if (fs.existsSync(mp4VideoFilePath)) {

        mailService.addLog('removing partially downloaded mp4 video ' + videoId, false);
        fs.unlinkSync(mp4VideoFilePath);

      }

      if (fs.existsSync(webmVideoFilePath)) {

        mailService.addLog('removing partially downloaded webm video ' + videoId, false);
        fs.unlinkSync(webmVideoFilePath);

      }

      mailService.addLog('downloading video', false);
      spawnSync('youtube-dl', ['-ci', '-f', 'best', '-o', 'videos/' + videoId + '.%(ext)s', 'https://www.youtube.com/watch?v=' + videoId]);

      // create a dummy file to indicate this specific video was downloaded
      fs.closeSync(fs.openSync(downloadedSymbolFilePath, 'w'));

    }


    /*
      1.3 convert video format

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
        spawnSync('ffmpeg', ['-fflags', '+genpts', '-i', mp4VideoFilePath, '-r', '24', mp4VideoConvertedFilePath]);

      } else if (fs.existsSync(webmVideoFilePath)) {

        mailService.addLog('video type: webm', false);
        mailService.addLog('converting video', false);
        spawnSync('ffmpeg', ['-fflags', '+genpts', '-i', webmVideoFilePath, '-r', '24', webmVideoConvertedFilePath]);

      } else {

        mailService.addLog('unknown file extension', false);

      }

      // create a dummy file to indicate this specific video was converted
      fs.closeSync(fs.openSync(convertedSymbolFilePath, 'w'));

    }

    /*
      1.4 mark the video as processed
    */
    video.processed = true;

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
