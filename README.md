Gif Buddy
======

A nostr bot and companion webapp for AI audio/video dubbing into desired languages
--------------

`draft`

## Description
The front end of Gif Buddy is a search engine for gifs powered by the Tenor API. On the back end, for every gif that gets copied/clicked, an API request is made to upload to nostr.build. Upon upload, a NIP94 event is broadcast that includes the gif metadata (sha256 hash, url and fallback url namely). Broadcasting a NIP94 event allows the content to be accessed by any client in the future if developers decide to integrate gifs into their client natively.

The web address https://gifbuddy.lol is a functional Progressive Web App (PWA) that allows users to download directly to their home screen.

Now, anyone who searches for gifs using this tool is also helping to build the gif repository for NIP94 and adding fallback urls to nostr.build. And all they did was click to copy #gifs

## Development
Gif Buddy is currently hosted on an Heroku server that auto-deploys each time code is pushed to GitHub. Located in the 'templates' folder is a 'dev.html' file that can be used for experimentation without the risk of breaking the app. The development build can be accessed at https://gifbuddy-c4c99bee7203.herokuapp.com/dev.