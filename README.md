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

* ways to convert mp4 to webm (I took the 3rd method)
  * `ffmpeg -i in.mp4 -crf 10 -b:v 1M out.webm`
  * `ffmpeg -i in.mp4 -crf 10 -b:v 100M out.webm`
  * `ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 17 -b:v 0 output.webm` (the lower the -crf is 0 - 61, the better the quality)
  * [Convert mp4 to webm without quality loss with ffmpeg - see comments as well](https://video.stackexchange.com/questions/19590/convert-mp4-to-webm-without-quality-loss-with-ffmpeg)

* ways to convert webm to mp4 (similar as above)
  * `ffmpeg -i input.webm -crf 17 -c:v libx264 output.mp4`

* 添加水印 (the 2nd method produce better quality based on crf value 0 - 61, 17 should be okay)
  * `ffmpeg -i input.mp4 -i watermark.png -filter_complex "overlay=main_w-overlay_w+50:main_h-overlay_h+50" output.mp4`
  * `ffmpeg -i input.mp4 -i watermark.png -filter_complex "overlay=main_w-overlay_w+50:main_h-overlay_h+50" -codec:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -c:a aac -strict -2 output.mp4`
    * [位置参数](http://ksloan.net/watermarking-videos-from-the-command-line-using-ffmpeg-filters/)


* upload with tags and translation
  * [Translating YouTube video title and description | V3 API](https://stackoverflow.com/questions/40798015/translating-youtube-video-title-and-description-v3-api)
