'use strict';

let os = require('os');
let fs = require('fs');
let nodemailer = require('nodemailer');
let ses = require('nodemailer-ses-transport');

let transporter;

if (process.env.RUNNING_ENVIRONMENT == 'local') {
  let awsCrendential = fs.readFileSync('/root/.aws/credentials', 'utf-8');
  transporter = nodemailer.createTransport(ses({
    accessKeyId: awsCrendential.aws_access_key_id,
    secretAccessKey: awsCrendential.aws_secret_access_key,
    region: 'us-west-2'
  }));
} else {
  transporter = nodemailer.createTransport(ses({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: 'us-west-2'
  }));
}


let content = '';

module.exports = {

  addLog: (log, newline, error) => {
    if (newline) {
      console.log('\n\r');
      console.log('*** ', log, ' ***');
      content += os.EOL + os.EOL + '*** ' + log + ' ***';
    } else {
      if (error) {
        console.log('######### ', log, '########');
        content += os.EOL + '######### ' + log + '#########';
      } else {
        console.log('--- ', log);
        content += os.EOL + '--- ' + log;
      }
    }
  },

  sendMail: () => {
    let options = {
      from: process.env.NOTIFICATION_EMAIL,
      to: process.env.NOTIFICATION_EMAIL,
      subject: 'JOB FINISHED FOR PROJECT: ' + process.env.PROJECT_NAME,
      text: content
    };

    let p = new Promise((resolve, reject) => {
      transporter.sendMail(options, (err, info) => {
        if (err) {
          console.log('send mail err ', err);
          reject(false);
        }
        console.log('response ', info);
        resolve(true);
      });
    });

    return p;
  }
}
