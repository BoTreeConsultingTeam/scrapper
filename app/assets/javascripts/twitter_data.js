var webPage = require('webpage');
var page = webPage.create();
var system = require('system');
var username = system.args[1];
var url = 'https://twitter.com/'+username;
console.log(url);
var userTweets = [];
var videoUrls = [];

// page.settings.userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.71 Safari/537.36';

page.onConsoleMessage = function(msg, lineNum, sourceId) {
  console.log('DEBUG: ' + msg);
};

page.open(url, function (status) {
  // var content = page.content;
  console.log('Status: ' + status);
  // console.log(" ----- ");
  // console.log(page.content);
  // phantom.exit();
  userTweets = page.evaluate(function() {
    console.log('----------------> IN EVALUATE');
    var tweetsJsonArr = [];
    var tweets = document.querySelectorAll(".tweet");
    if(tweets.length > 0){
      for(var i = 0; i< tweets.length; i++) {
        if(tweets[i].querySelectorAll(".tweet-text").length == 0){
          continue;
        }
        console.log('----------------> IN SET INTERVAL');
        var tweet_content = tweets[i].querySelector(".tweet-text").textContent;
        var tweet_at = tweets[i].querySelector("._timestamp").textContent;
        var user_name = tweets[i].querySelector("strong.fullname").textContent;
        var user_handle = tweets[i].querySelector(".js-action-profile-name.username").textContent;
        var tweet_id = tweets[i].attributes["data-tweet-id"].textContent;
        var tweet_media = (tweets[i].querySelectorAll(".AdaptiveMedia-singlePhoto img").length > 0) ? tweets[i].querySelector(".AdaptiveMedia-singlePhoto img").attributes['src'].textContent : "";
        var videoPageUrl = "";
        var videoUrl = "";
        if(tweets[i].querySelectorAll(".AdaptiveMedia-video").length > 0){
          if (tweets[i].querySelectorAll(".AdaptiveMedia-videoContainer video.animated-gif").length > 0) {
            videoUrl = tweets[1].querySelectorAll(".AdaptiveMedia-videoContainer video.animated-gif source")[0].getAttribute('video-src')
          }
          else {
            console.log('----------->in first if condition');
            videoPageUrl = "https://www.twitter.com" + tweets[i].querySelector(".AdaptiveMedia-video .js-macaw-cards-iframe-container").attributes['data-src'].textContent;
          }
          // console.log('----------->in first if condition');
          // videoPageUrl = "https://www.twitter.com" + tweets[i].querySelector(".AdaptiveMedia-video .js-macaw-cards-iframe-container").attributes['data-src'].textContent;
        }
        tweetsJsonArr.push({
          tweet_content: tweet_content,
          tweet_at: tweet_at,
          user_name: user_name,
          user_handle: user_handle,
          tweet_id: tweet_id,
          tweet_media: tweet_media,
          isVideoPresent: (videoPageUrl !== ''),
          videoPageUrl: videoPageUrl,
          videoUrl: videoUrl,
        });
      }
    }
    return tweetsJsonArr;
  }); 
  // console.log("Data =====> ");
  // console.log(JSON.stringify(userTweets));
  window.setTimeout(function(){
    fetchVideoURLs();
  }, 2000);
});

function fetchVideoURLs(){
  var i = 0;
  var c1 = window.setInterval(function(){
    if(i == (userTweets.length-1)){
      clearInterval(c1);
      console.log(JSON.stringify(userTweets));
      console.log(JSON.stringify({video_data: JSON.stringify(videoUrls),twitter_data: JSON.stringify(userTweets)}));
      phantom.exit();
    }
    if(userTweets[i].isVideoPresent == true && (userTweets[i].videoUrl == null || userTweets[i].videoUrl == "")) {
      page.open(userTweets[i].videoPageUrl, function(status){
        videoUrl = page.evaluate(function(){
          if(document.querySelectorAll(".AmplifyContainer.FlexEmbed").length > 0){
            var a = document.querySelectorAll(".AmplifyContainer.FlexEmbed")[0].attributes["data-player-config"].textContent;
            // console.log(" =====> ");
            // console.log(a);
            var obj = JSON.parse(a);
            if(obj != null && obj != undefined && obj.playlist != null) {
              // console.log(obj.playlist[0].source);
              return obj.playlist[0].source;
            }
          }
          return "";
        });
        window.setTimeout(function(){
          console.log("====> " + videoUrl);
          videoUrls.push({
            tweet_id: userTweets[i].tweet_id,
            videoUrl: videoUrl
          });
        }, 1200);
        
      });
    }
    i++;
  }, 2000);
}


/*function executeClickOn(selector){
  console.log('----------------> IN CLICK');
  selector = (selector == undefined) ? '.AdaptiveMedia-video' : selector;
  page.evaluate(function(selector) { 
    var a = document.querySelector(selector);
    var e = document.createEvent('MouseEvents');
    e.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    a.dispatchEvent(e);
  }, selector);
}
*/