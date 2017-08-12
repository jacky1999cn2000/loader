'use strict';

let s3Service = require('./services/s3');
let youtube = require('./modules/youtube');

async function execute() {
  let downupload = await s3Service.getDownUpLoad();
  console.log('downupload ', downupload);

  switch (downupload.project.type) {
    case 'youtube':
      youtube(downupload);
      break;
    default:
      console.log('unknown type: ', manifest.project.type);
  }

};

execute();
