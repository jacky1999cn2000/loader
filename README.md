# loader

* steps
  * change `target` and `task` in settings.json
    * target: indicate which manifest file to load for process
    * task: indicate which task to perform (values: download, convert, watermark, crop or upload)

  * to use watermark and crop, need to update the command in watermarker.js and cropper.js

  * to upload, need to
    * update title in json file and update the json file in s3
    * change the suffix (default is `converted`) in order to upload the correct video   

  * manifest files
    * [youtube](https://github.com/jacky1999cn2000/loader/blob/master/notes/youtube.md)

* test new ffmpeg command
  * run `make bash`
  * go to `test` folder, and run test command such as `ffmpeg -i input.mp4 -vf "crop=505:in_h:388:0" output.webm`
