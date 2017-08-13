'use strict';

let os = require("os");
let nodemailer = require('nodemailer');
let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_ACCOUNT,
    pass: process.env.EMAIL_PASSWORD
  }
});

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
      from: 'liang.zhao.sfdc01@gmail.com',
      to: 'liang.zhao83@gmail.com',
      subject: 'Sending Email using Node.js',
      text: content
    };

    let p = new Promise((resolve, reject) => {
      transporter.sendMail(options, (err, info) => {
        if (err) {
          console.log('send mail err ', err);
          reject(false);
        }
        console.log('response ', info.response);
        resolve(true);
      });
    });

    return p;
  }
}
