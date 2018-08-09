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
  mailService.addLog('file: ' + manifest.current.file, false);
  mailService.addLog('date: ' + manifest.current.date, false);
  mailService.addLog('batch: ' + manifest.current.batch, false);

  /*
    1. get video list and download the videos (if all videos have been downloaded, simply exit)
  */
  let date = manifest.current.date;
  let filename = manifest.current.file;
  let batch = manifest.current.batch;

  let videoList = await s3Service.getVideoList(manifest.project.type, manifest.project.channelName, date, filename);
  let unDownloadedVideoList = _.filter(videoList, (item) => {
    return !item.downloaded;
  });

  if (unDownloadedVideoList.length == 0) {
    mailService.addLog('all videos in this file have been downloaded', true);
    await mailService.sendMail('Download task completed');
    process.exit();
  }

  mailService.addLog('undownloaded video list length: ' + unDownloadedVideoList.length, true);

  let counter = 0;

  for (let video of videoList) {

    /*
      1.0 check if it was already downloaded
    */
    if (video.downloaded) {
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
    mailService.addLog('downloading video ' + counter, true);
    mailService.addLog('video id: ' + videoId, false);

    let mp4VideoFilePath = __dirname + '/../videos/' + videoId + '.mp4';
    let webmVideoFilePath = __dirname + '/../videos/' + videoId + '.webm';
    let downloadedSymbolFilePath = __dirname + '/../videos/' + videoId + '-downloaded.txt';

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
      1.3 mark the video as downloaded
    */
    video.downloaded = true;

  }

  mailService.addLog('out of for loop', true);
  mailService.addLog('batch ' + batch, false);
  mailService.addLog('counter ' + counter, false);

  /*
    2. update video list in s3 after download task completion
  */

  mailService.addLog('writing new video list to s3 ', true);

  let uploaded = await s3Service.uploadVideoList(manifest.project.type, manifest.project.channelName, date, filename, videoList);
  if (!uploaded) {
    mailService.addLog('writing new video list to s3 failed', false, true);
  }

  await mailService.sendMail('Download task completed');

}
