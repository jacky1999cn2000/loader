FROM node:8

#install forever
RUN npm install forever -g

#install youtube-dl
RUN wget https://yt-dl.org/downloads/latest/youtube-dl -O /usr/local/bin/youtube-dl && \
    chmod a+rx /usr/local/bin/youtube-dl

#install ffmpeg
RUN mkdir /ffmpeg && \
    cd /ffmpeg && \
    wget http://johnvansickle.com/ffmpeg/builds/ffmpeg-git-64bit-static.tar.xz && \
    tar xf ffmpeg-git-64bit-static.tar.xz && \
    cd ./ffmpeg* && \
    mv * ../ && \
    ln -s /ffmpeg/ffmpeg /usr/bin/ffmpeg && \
    ln -s /ffmpeg/ffprobe /usr/bin/ffprobe && \
    ln -s /ffmpeg/ffserver /usr/bin/ffserver

COPY . /usr/src/app
WORKDIR /usr/src/app
ENTRYPOINT forever start index.js
