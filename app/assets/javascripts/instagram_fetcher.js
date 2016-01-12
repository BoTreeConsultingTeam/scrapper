var page = require('webpage').create();
var system = require('system');
var username = system.args[1];
var url = 'https://www.instagram.com/'+username;

function getNumberFromString(numStr){
  var numberVal = numStr.replace(/,/g,'');
  if(numberVal.match(/k{1}$/g) != null) {
    numberVal = parseInt(numberVal.replace('k','')) * 1000;
  } else if(numberVal.match(/m{1}$/g) != null) {
    numberVal = parseInt(numberVal.replace('m','')) * 1000 * 1000;
  } 
  return parseInt(numberVal);
}

function instagramScrap(){

  page.open(url, function(){

    window.setTimeout(function(){

        var v = page.evaluate(function(){

          total_posts = document.querySelector('span._e8fkl').innerHTML;
          total_followers = document.querySelector('span._pr3wx').innerHTML;
          total_following = document.querySelector('span._bgvpv').innerHTML;

           return {total_posts: total_posts , total_followers: total_followers , total_following: total_following};

        });

        var posts = v.total_posts
        var followers = v.total_followers
        var following = v.total_following

        // console.log(getNumberFromString(fl));
        console.log('{"total post": '+getNumberFromString(posts)+', "total followers": '+getNumberFromString(followers)+', "total following": '+getNumberFromString(following)+'}');
        phantom.exit();

    },5000);    
      
  });
};

instagramScrap();

  


  
