'use strict';

let aws = require('aws-sdk');
let s3 = new aws.S3({
  region: 'us-west-2'
});

module.exports = {

  /*
    get video list
  */
  getVideoList: (type, name, date, filename) => {

    let key = `${type}/${name}/${date}/${filename}`;

    let params = {
      Bucket: process.env.S3_BUCKET,
      Key: key
    }

    let p = new Promise((resolve, reject) => {
      s3.getObject(params, (err, data) => {
        if (err) {
          reject(err);
        }
        resolve(JSON.parse(data.Body.toString('utf-8')));
      });
    });

    return p;
  },

  /*
  upload video list to s3
*/
  uploadVideoList: (type, name, date, filename, videoList) => {

    let project = process.env.PROJECT_NAME;
    let key = `${type}/${name}/${date}/${filename}`;

    let body = JSON.stringify(videoList);

    let params = {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: 'application/json;charset=utf-8'
    }

    let p = new Promise((resolve, reject) => {
      s3.putObject(params, (err, data) => {
        if (err) {
          reject(false);
        }
        resolve(true);
      });
    });

    return p;
  }
}
