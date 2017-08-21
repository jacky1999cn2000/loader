# youtube

* manifest
  * project: basic information for the project
    * email: email address used to login this channel
    * channelUrl: channel url
    * channelName: channel name *(used as part of file path when saving video list to s3)*
    * description: channel description
    * type: indicate where the video come from: youtube, meipai, youku... *(used as part of file path when saving video list to s3)*
  * credential
    * channelId: channelId for current project (only used in isTokenValid() method as a dummy parameter)
    * token_type: Bearer *(default)*  
    * expires_in: 3600 *(default)*
    * client_id: google app client_id *(not used in this project)*
    * client_secret: google app client_secret *(not used in this project)*
    * access_token: access_token *(retrieved from Oauth Playground)*
    * refresh_token:  refresh_token *(retrieved from Oauth Playground)*
  * download
    * date: the date used to populate s3 file path
    * file: the file name to populate s3 file path
    * batch: how many items should be processed
  * upload
    * date: the date used to populate s3 file path
    * file: the file name to populate s3 file path
    * batch: how many items should be processed
  ```
  {
    "project": {
      "email": "liang.zhao.sfdc01@gmail.com",
      "channelUrl": "https://www.youtube.com/channel/project1",
      "channelName": "project1",
      "description": "this is a test project",
      "type": "youtube"
    },
    "credential": {
      "token_type": "Bearer",
      "expires_in": 3600,
      "refresh_token": "refresh_token",
      "client_id": "client_id",
      "client_secret": "client_secret",
      "channelId": "channelId",
      "access_token": "access_token"
    },
    "download": {
      "date": "2017-8-21",
      "file": "1.json",
      "batch": "8"
    },
    "upload": {
      "date": "2017-8-21",
      "file": "1.json",
      "batch": "8"
    }
  }
  ```
