# loader

* code structure
  * process (modularized logic for downloading and converting videos)
    * youtube

  * services (modularized logic for methods handling different tasks)
    * youtube
    * s3

* configuration
  * settings.json
    * target: indicate which manifest file to load for process
    * task: indicate which task to perform (values: process or upload)
  * manifest files
    * [youtube](https://github.com/jacky1999cn2000/loader/blob/master/notes/youtube.md)
