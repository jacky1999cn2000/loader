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
    * client_id: google app client_id *(used in youtube-video-api authentication)*
    * client_secret: google app client_secret *(used in youtube-video-api authentication)*
    * apiKey: apiKey
  * current
    * date: the date used to populate s3 file path
    * file: the file name to populate s3 file path
    * batch: how many items should be processed

  ```
  {
    "project": {
      "email": "blueangel.yt1@gmail.com",
      "channelUrl": "https://www.youtube.com/channel/UC70JN7kAPlgbAtqrV4wtPqg",
      "channelName": "抖音精品收藏",
      "description": "抖音精品收藏",
      "type": "youtube"
    },
    "credential": {
      "name": "youtube-douyin",
      "account": "blueangel.yt1@gmail.com",
      "token_type": "Bearer",
      "expires_in": 3600,
      "client_id": "299060033544-s484p2e63n0i454ajquoi7vid8upm62u.apps.googleusercontent.com",
      "client_secret": "5ckCg__TTynzEpT1Y6MfrbwX",
      "apiKey": "AIzaSyD2CBhn-lId1SMQx5uNVNo5oE_fyhFLhtw",
      "channelId": "UC70JN7kAPlgbAtqrV4wtPqg"
    },
    "current": {
      "date": "2018-8-8",
      "file": "1.json",
      "batch": "20"
    }
  }

  ```
