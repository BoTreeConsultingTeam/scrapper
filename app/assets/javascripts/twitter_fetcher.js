var page = require('webpage').create();
var system = require('system');
var fs = require('fs');
var totalFollowers = 0;
var totalFollowing = 0;

// Exit if no twitter handle is passed
if(system.args.length === 1) {
  console.log("Pass <userhandle> ...");
  phantom.exit();
}

var userhandle = system.args[1];

// Binding event, for the console messages printed from inside the page.evaluate methods
page.onConsoleMessage = function(msg, lineNum, sourceId) {
  console.log('DEBUG: ' + msg);
};

page.settings.javascriptEnabled = true;
page.settings.loadImages = false;//Script is much faster with this field set to false
phantom.cookiesEnabled = true;
phantom.javascriptEnabled = true;
// page.settings.userAgent = 'SpecialAgent';

/* 
* Login into twitter 
*/
function login() {
  console.log("==> Login into Twitter...");
  page.open("https://mobile.twitter.com/session/new", function(status){
    if (status !== 'success') {
      console.log('==> Unable to access network');
      phantom.exit();
    } else {
      page.evaluate(function(){
        console.log("==> Submitting login form...");
        document.querySelector("[id='session[username_or_email]']").value = '';
        document.querySelector("[id='session[password]']").value = '';
        document.forms[0].submit();
      });

      setTimeout(function(){
        openConnectionPage('followers');
      },5000);
    }
  });
}
/* 
* Calculate total followers/following from the page elements, write HTML content to the 
* file based on the passed fileMode 
*/

function calculateTotalAndStoreHtml(fileMode, connectionType){
  
  var connectionHtml = page.evaluate(function(){
    return document.querySelectorAll(".user-list")[0].innerHTML;
  });
  
  var totalUsers = page.evaluate(function(){
    return document.querySelectorAll('.user-item').length;
  });

  if(connectionType == "followers") {
    totalFollowers+=totalUsers;
  } else if (connectionType == "following") {
    totalFollowing+=totalUsers;
  }

  fs.write(userhandle+'_'+connectionType+'.html', connectionHtml, fileMode);
}

/*
* Open followers/following page, follow all the pages and load all connected users.
*/
function openConnectionPage(connectionType) {
  console.log("==> Opening "+connectionType+" page...");
  var pageNum = 1;
  var isLoaded = false;
  page.open('https://mobile.twitter.com/'+userhandle+'/'+connectionType, function (status) {
    console.log("==> "+connectionType+" status =>"+status);
    if (status !== 'success') {
      console.log('==> Unable to access network');
      phantom.exit();
    } else {
        console.log("==> page = "+ pageNum);
        var c = window.setInterval(function() {
          
          if(!isLoaded) {
            isLoaded = page.evaluate(function(){
              return (document.querySelectorAll(".user-list .user-item").length > 0);
            });
          }
          
          if(isLoaded != true){
            console.log("==> Loading...")
            return;
          }
          
          var totalCount = (connectionType == "followers") ? (totalFollowers) : (totalFollowing);

          if(totalCount == 0) {
            window.setTimeout(function(){
              calculateTotalAndStoreHtml('w',connectionType);
            }, 10);
          }

          var hasMoreItems = page.evaluate(function(){
            return document.querySelector('.w-button-more a').innerText.trim() == "Show more people";
          });

          // console.log("count = "+count);
          if(hasMoreItems == true) { // Didn't find
            pageNum++;
            console.log("==> Next page = " + pageNum);
            page.evaluate(function() { 
              // window.document.body.scrollTop = document.body.scrollHeight;
              // console.log(" ====> "+document.querySelector('.w-button-more a').innerHTML);
              // window.scrollTo(0,document.body.scrollHeight);
              var a = document.querySelector('.w-button-more a');
              var e = document.createEvent('MouseEvents');
              e.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
              a.dispatchEvent(e);
              // return;
            });

            window.setTimeout(function(){
              calculateTotalAndStoreHtml('a',connectionType);
            }, 500);
          } else { // Found
            console.log("==> Completing "+connectionType+"...")
            console.log("==> Total "+connectionType+" = "+ totalCount);
            clearInterval(c);
            if(connectionType == "followers") {
              setTimeout(function(){
                openConnectionPage('following');
              },5000);  
            } else {
              phantom.exit();  
            }
          }
      }, 2000); // Number of milliseconds to wait between scrolls
    }
  });
}

/*
* Call login method after 1 second
*/
window.setTimeout(function(){
  login();
},1000);


/*function openTweetsPage() {
  console.log("==> Open user's tweets page...");
  var i = 0;
  var a = window.setInterval(function(){
    var isLoaded = page.evaluate(function(){
      console.log("===========> "+document.querySelectorAll("a[data-element-term='tweet_stats']").length);
      return document.querySelectorAll("a[data-element-term='tweet_stats']").length > 0
    });

    if(isLoaded == true){
      clearInterval(a);
      console.log("Opening tweets page...")
      
      page.open('https://mobile.twitter.com/'+userhandle, function(status){
        console.log("Tweets status -> " + status);
        if (status !== 'success') {
          console.log('Unable to access network');
          phantom.exit();
        } else {
          var b = window.setInterval(function() {

            var count = page.evaluate(function(){
              return document.querySelectorAll('.has-more-items').length;
            });

            if(count > 0) { // Didn't find
              var v1 = page.evaluate(function() { 
                window.document.body.scrollTop = document.body.scrollHeight;
                window.scrollTo(0,document.body.scrollHeight);
                console.log("Total Tweets -=> "+ document.querySelectorAll(".tweet").length);
                return;
              });
              // var total = page.evaluate(function(){return document.querySelectorAll(".tweet").length;});
              // console.log(" stream items = "+ total);
              i++;
            } else { // Found
              var totalTweets = page.evaluate(function(){
                return document.querySelectorAll(".tweet").length;
              });

              var totalRts = page.evaluate(function(){
                return document.querySelectorAll(".tweet .js-retweet-text").length;
              });

              console.log("Total Tweets = "+ totalTweets);
              console.log("Total ReTweets = "+ totalRts);
              page.render('bild.png');
              clearInterval(b);
              phantom.exit();
            }
          }, 2000);
        }
      });
    }
  },2000);
}*/
