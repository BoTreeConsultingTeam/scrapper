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
  console.log("STATUS => " +status);
  // console.log(page.content);
  if (status !== 'success') {
    console.log('==> Unable to access network, exiting...');
    // return false;
  } 
  return true;
}
/* 
* Login into twitter 
*/
function login() {
  console.log("==> Login into FaceBook...");
  page.open("https://m.facebook.com/login", function(status){
    // console.log('Content : '+page.content);
    if (isConnectionSuccess(status)) {
      page.evaluate(function(username,password){
        console.log("==> Submitting login form...");
        document.querySelector("input[name='email']").value = username;
        document.querySelector("input[name='pass']").value = password;
        document.forms[0].submit();
      }, username, password);

      // setTimeout(function(){
        // console.log('=====================> Content : '+page.content);
      // openConnectionPage('profile');
      var seq = window.setInterval(function(){

        if(index == userhandle.length && completed == userhandle.length){
          clearInterval(seq);
          console.log("All users completed...");
          phantom.exit();
          return;
        }

        if(index == completed) {
          window.setTimeout(function(){
            openConnectionPage(userhandle[index].trim());
            index++;
          }, 6000);
        } else {
          console.log("Waiting for current task to be done for " + userhandle[index-1] + " ...");
        }
      }, 15000);
        // openPhotosPage();
        // openTweetsPage();
      // }, 15000);
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
  // console.log('Geting selector'+connectionType);
  var friends_selector = "";
  if(connectionType == "profile"){
    
    contentSelector = 'div#structured_composer_async_container';
    contentLengthSelector = 'section.storyStream';
    // article._55wo
    friends_selector = 'div.touchable div._4g34._5b6q._52we div._5xu4 div._13yf span.mfss.fcg'
  } else if(connectionType == "photos"){
    
    contentSelector = 'div.timeline.photos';
    contentLengthSelector = 'div.timeline.photos span a';
    friends_selector = 'br'
  }

  var connectionHtml = page.evaluate(function(contentSelector,friends_selector){
    var html_content;
    if(document.querySelectorAll(friends_selector).length > 0){
      html_content = (document.querySelectorAll(contentSelector)[0].innerHTML+'\n'+document.querySelectorAll(friends_selector)[0].innerHTML);
    }else{
      html_content = document.querySelectorAll(contentSelector)[0].innerHTML;
    }
    return html_content;
  }, contentSelector,friends_selector);
  
  var totalItems = page.evaluate(function(contentLengthSelector){
    return document.querySelectorAll(contentLengthSelector).length;
  },contentLengthSelector);

  if(connectionType == "profile") {
    totalFollowers+=totalItems;
  } else if (connectionType == "photos") {
    totalTweets = totalItems;
  }

  fs.write("fb_"+user+'_'+connectionType+'.html', connectionHtml, fileMode);
}

/* 
* Execute click event on a given selector.
*/
function executeClickOn(selector){
  // selector = (selector == undefined) ? '.previousSectionLoaded div[data-sigil*="section-loader-button"]' : selector;
  // window.document.body.scrollTop = document.body.scrollHeight;
  
  page.evaluate(function(selector) { 
    // var a = document.querySelector(selector);
    // var e = document.createEvent('MouseEvents');
    // e.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    // try{
    //   a.dispatchEvent(e);  
    // }catch(err){
    //   console.log('Error : '+err);
    // }
    // console.log('Height: '+document.body.scrollHeight);
    window.document.body.scrollTop = document.body.scrollHeight;
    
  }, selector);
}

/*
* Open followers/following page, follow all the pages and load all connected users.
*/

var failur = 0;
function openConnectionPage(user, connectionType) {
  console.log("==> Opening "+user+"'s profile page...");
  var pageNum = 1;
  var count = 0;
  page.open('https://m.facebook.com/'+user, function (status) {
    // console.log("==> "+connectionType+" status =>"+status);
    if (isConnectionSuccess(status)) {
      // console.log("==> page = "+ pageNum);
      var c = window.setInterval(function() {
        
        if(!isPageLoaded("article._55wo")){
          return;
        }
        
        var totalCount = (connectionType == "followers") ? (totalFollowers) : (totalFollowing);

        if(totalCount == 0) {
          window.setTimeout(function(){
            calculateTotalAndStoreHtml(user, 'w','profile');
          }, 100);
        }

        window.setTimeout(function(){

          var hasMoreItems = page.evaluate(function(){
            var a1 = document.querySelector('._52jj i[class="img img"]');
            
            return (a1 == null || a1 == undefined);
          });
          if(count >= 2){
            clearInterval(c);
            setTimeout(function(){
              openPhotosPage(user);
            }, 1000);
          }else if(hasMoreItems == false){
            count++;
          }
          // console.log("count = "+count);
          else if(hasMoreItems == true) { // Didn't find
            pageNum++;
            console.log("==> Next page = " + pageNum);
            window.document.body.scrollTop = document.body.scrollHeight;
            page.scrollPosition = { top: document.body.scrollHeight, left: 0 };
            
            executeClickOn();

            window.setTimeout(function(){
              calculateTotalAndStoreHtml(user, 'a','profile');
            }, 4000);
          } else { // Found
            console.log("==> Completing "+connectionType+"...")
            console.log("==> Total "+connectionType+" = "+ totalCount);
            clearInterval(c);
            isLoaded = false;
            clearInterval(c);
            setTimeout(function(){
              openPhotosPage(user);
            }, 1500);
            
            // phantom.exit(); 
            // if(connectionType == "followers") {
            //   setTimeout(function(){
            //     openConnectionPage('following');
            //   },5000);  
            // } else if(connectionType == "following") {
            //   setTimeout(function(){
            //     openTweetsPage();
            //   },5000);  
            // } else {
            //   phantom.exit();  
            // }

          }
        }, 1000);
      }, 4000); // Number of milliseconds to wait between scrolls
    }else{
      failur++;
      setTimeout(function(){
        openConnectionPage('profile');  
      }, 5000);
      
      // if(failur > 4){
      //   console.log('failur');
      //   // phantom.exit();
      // }
    }
  });
}
/* 
* Open Photos page, follow all pages until the last page and store the full HTML page.
*/
function openPhotosPage(user) {
  var connectionType = "photos";
  console.log("==> Open user's photos page...");
  var pageNum = 1;
  page.open('https://m.facebook.com/'+user+"/photos", function(status){
    console.log("Opening tweets page...")
    console.log("Photos status -> " + status);
    if (isConnectionSuccess(status)) {
      
      var b = window.setInterval(function() {

        if(!isPageLoaded(".subpage div.timeline.photos")) {
          return;
        }

        if(totalTweets == 0) {
          console.log("Total Photos = 0, first time writing to file...");
          window.setTimeout(function(){
            calculateTotalAndStoreHtml(user, 'w',connectionType);
          }, 1000);
        }
        // window.document.body.scrollTop = document.body.scrollHeight;
        // page.scrollPosition = { top: document.body.scrollHeight, left: 0 };

        window.setTimeout(function(){
          var hasMoreItems = page.evaluate(function(){
            var a1 = document.querySelector('div.centeredIndicator');
            return (a1 == null || a1 == undefined);
          });
          
          if(hasMoreItems == false) { 
            pageNum++;
            console.log("==> Next page = " + pageNum);

            executeClickOn();
            window.setTimeout(function(){
              calculateTotalAndStoreHtml(user, 'a',connectionType);
            }, 5000);
          } else { 
            isLoaded = false;
            console.log("==> Completing "+connectionType+"...")
            console.log("==> Total "+connectionType+" = "+ totalTweets);
            clearInterval(b);
            
            // phantom.exit(); 
          }
        }, 1000);

      }, 8000);
    }else{
      failur++;
      setTimeout(function(){
        openConnectionPage('photos');  
      }, 5000);
      
      if(failur > 4){
        console.log('failur');
        // phantom.exit();
      }
    }
    completed++;
  });
}

/*
* Call login method after 1 second
*/
window.setTimeout(function(){
  login();
},1000);