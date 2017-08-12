'use strict';

let aws = require('aws-sdk');
let s3 = new aws.S3({
  region: 'us-west-2'
});

module.exports = {
  /*
    get downupload.json
  */
  getDownUpLoad: () => {

    let params = {
      Bucket: process.env.S3_BUCKET,
      Key: process.env.PROJECT_NAME + '/downupload.json'
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
    get video list
  */
  getVideoList: (filename) => {

    let params = {
      Bucket: process.env.S3_BUCKET,
      Key: process.env.PROJECT_NAME + '/' + filename
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
}
