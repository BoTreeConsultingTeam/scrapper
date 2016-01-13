var page = require('webpage').create();
var system = require('system');
var fs = require('fs');
var totalFollowers = 0;
var totalFollowing = 0;

var totalTweets = 0;
// var totalRts = 0;
var index = 0;
var completed = 0;
// Exit if no twitter handle is passed
if(system.args.length === 1) {
  console.log("Pass <userhandle> <username> <password> ...");
  phantom.exit();
}

var userhandle = system.args[1].split(',');
var username = system.args[2];
var password = system.args[3];

var isLoaded = false;
// Binding event, for the console messages printed from inside the page.evaluate methods
page.onConsoleMessage = function(msg, lineNum, sourceId) {
  console.log('DEBUG: ' + msg);
};

page.settings.javascriptEnabled = true;
page.settings.loadImages = false;//Script is much faster with this field set to false
phantom.cookiesEnabled = true;
phantom.javascriptEnabled = true;
// page.settings.userAgent = 'SpecialAgent';

function isConnectionSuccess(status){
  if (status !== 'success') {
    console.log('==> Unable to access network, exiting...');
    phantom.exit();
  } 
  return true;
}
/* 
* Login into twitter 
*/
function login() {
  console.log("==> Login into Twitter...");
  page.open("https://mobile.twitter.com/session/new", function(status){
    if (isConnectionSuccess(status)) {
      page.evaluate(function(username,password){
        console.log("==> Submitting login form...");
        document.querySelector("[id='session[username_or_email]']").value = username;
        document.querySelector("[id='session[password]']").value = password;
        document.forms[0].submit();
      }, username, password);

      var seq = window.setInterval(function(){

        if(index == userhandle.length && completed == userhandle.length){
          clearInterval(seq);
          console.log("All users completed...");
          phantom.exit();
          return;
        }

        if(index == completed) {
          window.setTimeout(function(){
            openConnectionPage(userhandle[index].trim(), 'followers');
            index++;
          }, 6000);
        } else {
          console.log("Waiting for current task to be done for " + userhandle[index-1] + " ...");
        }
      }, 8000);
    }
  });
}

/* 
* Check if the page is loaded or not, by checking total number of elements for a given selector.
*/
function isPageLoaded(selector){
  if(!isLoaded) {
    isLoaded = page.evaluate(function(selector){
      return (document.querySelectorAll(selector).length > 0);
    }, selector);
  }
  
  if(isLoaded != true){
    console.log("==> Loading...")
    return false;
  }
  return true;
}
/* 
* Calculate total followers/following from the page elements, write HTML content to the 
* file based on the passed fileMode 
*/

function calculateTotalAndStoreHtml(user, fileMode, connectionType){
  
  var contentSelector = "";
  var contentLengthSelector = "";

  if(connectionType == "followers" || connectionType == "following"){
    contentSelector = '.user-list';
    contentLengthSelector = '.user-item';
  } else if(connectionType == "tweets"){
    contentSelector = '.timeline';
    contentLengthSelector = '.tweet';
  }

  var connectionHtml = page.evaluate(function(contentSelector){
    return document.querySelectorAll(contentSelector)[0].innerHTML;
  }, contentSelector);
  
  var totalItems = page.evaluate(function(contentLengthSelector){
    return document.querySelectorAll(contentLengthSelector).length;
  },contentLengthSelector);

  if(connectionType == "followers") {
    totalFollowers+=totalItems;
  } else if (connectionType == "following") {
    totalFollowing+=totalItems;
  } else if (connectionType == "tweets") {
    totalTweets+=totalItems;
  }

  fs.write(user+'_'+connectionType+'.html', connectionHtml, fileMode);
}

/* 
* Execute click event on a given selector.
*/
function executeClickOn(selector){
  selector = (selector == undefined) ? '.w-button-more a' : selector;
  page.evaluate(function(selector) { 
    var a = document.querySelector(selector);
    var e = document.createEvent('MouseEvents');
    e.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    a.dispatchEvent(e);
  }, selector);
}

/*
* Open followers/following page, follow all the pages and load all connected users.
*/
function openConnectionPage(user, connectionType) {
  console.log("==> Opening "+connectionType+" page...");
  var pageNum = 1;
  page.open('https://mobile.twitter.com/'+user+'/'+connectionType, function (status) {
    console.log("==> "+connectionType+" status =>"+status);
    if (isConnectionSuccess(status)) {
      console.log("==> page = "+ pageNum);
      var c = window.setInterval(function() {
        
        if(!isPageLoaded(".user-list .user-item")){
          return;
        }
        
        var totalCount = (connectionType == "followers") ? (totalFollowers) : (totalFollowing);

        if(totalCount == 0) {
          window.setTimeout(function(){
            calculateTotalAndStoreHtml(user,'w',connectionType);
          }, 10);
        }

        window.setTimeout(function(){

          var hasMoreItems = page.evaluate(function(){
            var a1 = document.querySelector('.w-button-more a');
            return (a1 != null && a1.innerText.trim() == "Show more people");
          });

          // console.log("count = "+count);
          if(hasMoreItems == true) { // Didn't find
            pageNum++;
            console.log("==> Next page = " + pageNum);
            
            executeClickOn();

            window.setTimeout(function(){
              calculateTotalAndStoreHtml(user,'a',connectionType);
            }, 500);
          } else { // Found
            console.log("==> Completing "+connectionType+"...")
            console.log("==> Total "+connectionType+" = "+ totalCount);
            clearInterval(c);
            isLoaded = false;
            
            if(connectionType == "followers") {
              setTimeout(function(){
                openConnectionPage(user, 'following');
              },5000);  
            } else if(connectionType == "following") {
              setTimeout(function(){
                openTweetsPage(user);
              },5000);  
            } else {
              phantom.exit();  
            }

          }
        },100);
      }, 2000); // Number of milliseconds to wait between scrolls
    }
  });
}
/* 
* Open tweets page, follow all pages until the last page and store the full HTML page.
*/
function openTweetsPage(user) {
  var connectionType = "tweets";
  console.log("==> Open user's tweets page...");
  var pageNum = 1;
  page.open('https://mobile.twitter.com/'+user+"/tweets", function(status){
    console.log("Opening tweets page...")
    console.log("Tweets status -> " + status);
    if (isConnectionSuccess(status)) {
      
      var b = window.setInterval(function() {

        if(!isPageLoaded(".timeline .tweet")) {
          return;
        }

        if(totalTweets == 0) {
          console.log("Total tweets = 0, first time writing to file...");
          window.setTimeout(function(){
            calculateTotalAndStoreHtml(user,'w',connectionType);
          }, 10);
        }

        window.setTimeout(function(){
          var hasMoreItems = page.evaluate(function(){
            var a1 = document.querySelector('.w-button-more a');
            return (a1 != null && a1.innerText.trim() == "Load older Tweets");
          });

          if(hasMoreItems == true) { // Didn't find
            pageNum++;
            console.log("==> Next page = " + pageNum);
            executeClickOn();
            window.setTimeout(function(){
              calculateTotalAndStoreHtml(user,'a',connectionType);
            }, 500);
          } else { // Found
            isLoaded = false;
            console.log("==> Completing "+connectionType+"...")
            console.log("==> Total "+connectionType+" = "+ totalTweets);
            completed++;
            clearInterval(b);
            // phantom.exit(); 
          }
        }, 100);

      }, 2000);
    }
  });
}

/*
* Call login method after 1 second
*/
window.setTimeout(function(){
  login();
},1000);