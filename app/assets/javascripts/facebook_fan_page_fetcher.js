var page = require('webpage').create();
var system = require('system');
var fs = require('fs');
var totalFollowers = 0;
var totalFollowing = 0;

var totalTweets = 0;
var pageStatisticsData = false;
var videoStatisticsData = false;
var photoStatisticsData = false;
// var totalRts = 0;

// Exit if no args is passed
if(system.args.length === 1) {
  console.log("Pass <fanpagehandle> <fb email> <password> ...");
  phantom.exit();
}

var fanPageHandle = system.args[1].split(',');
var fbEmail = system.args[2];
var password = system.args[3];

var isLoaded = false;
var MAX_PAGES_TO_SCROLL = 50;

// Binding event, for the console messages printed from inside the page.evaluate methods
// page.onConsoleMessage = function(msg, lineNum, sourceId) {
//   console.log('DEBUG: ' + msg);
// };
var index = 0;
var completed = 0;
var all_user_details = new Array();

page.settings.javascriptEnabled = true;
page.settings.loadImages = false;//Script is much faster with this field set to false
phantom.cookiesEnabled = true;
phantom.javascriptEnabled = true;
// page.settings.userAgent = 'SpecialAgent';

function isConnectionSuccess(status){
  // console.log("STATUS => " +status);
  // console.log(page.content);
  if (status !== 'success') {
    console.log('==> Unable to access network, exiting...');
    // phantom.exit();
  } 
  return true;
}
/* 
* Login into facebook 
*/
function login() {
  console.log("==> Login into FaceBook...");
  page.open("https://www.facebook.com/login", function(status){
    // console.log('Content : '+page.content);
    if (isConnectionSuccess(status)) {
      page.evaluate(function(fbEmail,password){
        // console.log("==> Submitting login form...");
        document.querySelector("input[name='email']").value = fbEmail;
        document.querySelector("input[name='pass']").value = password;
        document.forms[0].submit();
      }, fbEmail, password);

      var seq = window.setInterval(function(){

        if(index == fanPageHandle.length && completed == fanPageHandle.length){
          clearInterval(seq);
          console.log("All users completed...");
          console.log('['+all_user_details+']');
          phantom.exit();
          return;
        }

        if(index == completed) {
          window.setTimeout(function(){
            openFanPage(fanPageHandle[index].trim(), 'likes');
            index++;
          }, 6000);
        } else {
          console.log("Waiting for current task to be done for " + fanPageHandle[index-1] + " ...");
        }
      }, 15000);
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
    // console.log("==> Loading...")
    return false;
  }
  return true;
}
/* 
* Execute click event on a given selector.
*/
function executeClickOn(selector){
  selector = (selector == undefined) ? '.uiMorePager a.uiMorePagerPrimary' : selector;
  page.evaluate(function(selector) { 
    var a = document.querySelector(selector);
    var e = document.createEvent('MouseEvents');
    e.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    a.dispatchEvent(e);
  }, selector);
}

function calculateVideoStatistics(){
  return page.evaluate(function(getNumberFromString){
    var videoNodesArr = document.querySelectorAll("[id='pages_video_hub_all_videos_pagelet'] [class*='_51m-']");
    var totalVideos = videoNodesArr.length; 
    var totalLikes = 0;
    var totalViews = 0;
    for(var i=0;i<videoNodesArr.length;i++){
      var numbersArr = videoNodesArr[i].querySelectorAll("[class*='_3v4i']")[0].lastChild.textContent.replace(/\W[^\S]/g,"").split(" ");
      if(numbersArr.length >=2) {
        if(numbersArr[0] != null){
          if(numbersArr[1].trim() == 'Likes') {
            totalLikes += getNumberFromString(numbersArr[0]);  
          } else if(numbersArr[1].trim() == 'Views') {
            totalViews += getNumberFromString(numbersArr[0]);  
          }
        }
        if(numbersArr[2] != null){
          totalViews += getNumberFromString(numbersArr[2]);
        }
      } else {
        console.log("No likes/views found...!");
      }
    }
    return {totalVideos: totalVideos, totalLikes: totalLikes, totalViews: totalViews };
  },getNumberFromString);
}

function calculatePhotoStatistics(){
  return page.evaluate(function(getNumberFromString){
    var photoNodesArr = document.querySelectorAll(".fbPhotoCurationControlWrapper");
    var totalPhotos = photoNodesArr.length; 
    var totalPhotosLikes = 0;
    var totalPhotosComments = 0;
    for(var i=0;i<photoNodesArr.length;i++){
      var numbersArr = photoNodesArr[i].querySelectorAll('._51mx .uiGrid');
      if(numbersArr.length >= 1) { 
        var numberItemsArr = numbersArr[0].attributes["aria-label"].textContent.split(" ");
        if(numberItemsArr[1].trim() == 'likes') {
          totalPhotosLikes += getNumberFromString(numberItemsArr[0]);  
        } else if(numberItemsArr[1].trim() == 'comments') {
          totalPhotosComments += getNumberFromString(numberItemsArr[0]);  
        }
        if(numbersArr[1] != null){
          numberItemsArr = numbersArr[1].attributes["aria-label"].textContent.split(" ");
          if(numberItemsArr[1].trim() == 'comments') {
            totalPhotosComments += getNumberFromString(numberItemsArr[0]);  
          }
        }
      } else {
        console.log("No likes/views found...!");
      }
    }
    return {totalPhotos: totalPhotos, totalPhotosLikes: totalPhotosLikes, totalPhotosComments: totalPhotosComments };
  },getNumberFromString);
}

/*
* Open FB fan page, find likes,photos and videos count
*/

var pageStatisticsData;
var videoStatisticsData;
var photoStatisticsData;
function openFanPage(user, innerPage) {
  console.log("==> Opening fan page - " + user);
  var pageNum = 1;
  var scroll_count = 0;
  page.open('https://www.facebook.com/'+user+ "/"+innerPage, function (status) {
    // console.log("==> "+connectionType+" status =>"+status);
    if (isConnectionSuccess(status)) {

      var c = window.setInterval(function() {
        if(innerPage == 'likes') {
          if(!isPageLoaded("[class*='_5cui']")){
            return;
          }
          clearInterval(c);
          pageStatisticsData = page.evaluate(function(){
            var likeNodesArr = document.querySelectorAll("[class*='_5cui']");
            var totalPeopleTalkingAbt = likeNodesArr[0].childNodes[1].innerHTML == "People Talking About This" ? parseInt(likeNodesArr[0].childNodes[0].innerHTML.replace(",","")) : 0;
            var totalPageLikes = likeNodesArr[1].childNodes[1].innerHTML == "Total Page Likes" ? parseInt(likeNodesArr[1].childNodes[0].innerHTML.replace(/,/g,"")) : 0;
            // console.log("Total people talking = " + totalPeopleTalkingAbt);
            // console.log("Total page likes = " + totalPageLikes);  
            return {totalPeopleTalking: totalPeopleTalkingAbt, totalPageLikes: totalPageLikes };
          });
          console.log("People talking --> "+pageStatisticsData.totalPeopleTalking);
          console.log("Total page likes --> "+pageStatisticsData.totalPageLikes);
          return openFanPage(user, "videos");
        } else if(innerPage == 'videos'){
          if(!isPageLoaded("[id='pages_video_hub_all_videos_pagelet'] [class*='_51m-']")){
            return;
          }
          var totalVideos = 0;
          var totalVideoLikes = 0;
          var totalVideoViews = 0;

          window.setTimeout(function(){

            var hasMoreItems = page.evaluate(function(){
              var a1 = document.querySelector('.uiMorePager a.uiMorePagerPrimary');
              return (a1 != null && a1.innerText.trim() == "Show More");
            });

            if(hasMoreItems == true && pageNum <= MAX_PAGES_TO_SCROLL) { // Didn't find
              pageNum++;
              // console.log("==> Next page = " + pageNum);
              
              executeClickOn();

              window.setTimeout(function(){
                videoStatisticsData = calculateVideoStatistics();
              }, 1000);
            } else { // Found
              clearInterval(c);
              videoStatisticsData = calculateVideoStatistics();
              isLoaded = false;
              console.log("Total Videos => " +videoStatisticsData.totalVideos); 
              console.log("Total Video views => " +videoStatisticsData.totalViews); 
              console.log("total Video likes => " +videoStatisticsData.totalLikes); 
              return openFanPage(user, "photos_stream");
            }
          },2000);
          
        } else if(innerPage == "photos_stream") {
          if(!isPageLoaded(".fbPhotoCurationControlWrapper")){
            return;
          }
          
          window.setTimeout(function(){
            
            var hasMoreItems = page.evaluate(function(){
              var a1 = document.querySelectorAll('.fbTimelinePhotosScroller img.uiSimpleScrollingLoadingIndicator');
              return a1 != null && a1.length > 0;
            });
            
            if(hasMoreItems == true && pageNum <= MAX_PAGES_TO_SCROLL) { // Didn't find
              pageNum++;
              scroll_count++;
              // console.log("==> Next page = " + pageNum);
              
              window.setTimeout(function(){
                page.scrollPosition = { top: document.body.scrollHeight, left: 0 };
                
                var d = page.evaluate(function(){
                  window.document.body.scrollTop = document.body.scrollHeight;
                });

                window.setTimeout(function(){
                  photoStatisticsData = calculatePhotoStatistics();
                }, 2000);
              }, 500);
            } else { // Found
              clearInterval(c);
              photoStatisticsData = calculatePhotoStatistics();
              isLoaded = false;
              console.log("Total photos => " +photoStatisticsData.totalPhotos); 
              console.log("Total photos likes => " +photoStatisticsData.totalPhotosLikes); 
              console.log("Total photos comments => " +photoStatisticsData.totalPhotosComments); 
              var user_data = '{"user": "'+user+'", "totalPeopleTalking": '+pageStatisticsData.totalPeopleTalking+', "totalPageLikes": '+pageStatisticsData.totalPageLikes+', "totalVideos": '+videoStatisticsData.totalVideos+', "totalVideoViews": '+videoStatisticsData.totalViews+', "totalVideoLikes": '+videoStatisticsData.totalLikes+', "totalPhotos": '+photoStatisticsData.totalPhotos+', "totalPhotosLikes":'+photoStatisticsData.totalPhotosLikes+', "totalPhotosComments": '+photoStatisticsData.totalPhotosComments+'}';
              console.log(user_data) ; 
              all_user_details.push(user_data);
              completed++; 
              // phantom.exit(); 
            }
          },2000);
        }
      }, 4000); // Number of milliseconds to wait between scrolls
    }
  });
  
}

function getNumberFromString(numStr){
  var numberVal = numStr.replace(/,/g,'');
  if(numberVal.match(/k{1}$/g) != null) {
    numberVal = parseInt(numberVal.replace('k','')) * 1000;
  } else if(numberVal.match(/m{1}$/g) != null) {
    numberVal = parseInt(numberVal.replace('m','')) * 1000 * 1000;
  } 
  return parseInt(numberVal);
}

/*
* Call login method after 1 second
*/
window.setTimeout(function(){
  login();
},2000);