var page = require('webpage').create();
var fs = require('fs');
var system = require('system');
var username = system.args[1];

var url = 'https://www.youtube.com/user/' + username + '/about';
var url_playlist = 'https://www.youtube.com/user/' + username + '/playlists';
var total_subscribers;
var total_views;
var playlists;
var total_videos;


function youtubeScrap(){

	page.open(url , function(){

		var subscribers = page.evaluate(function () {
        return document.querySelector('span.about-stat b').innerHTML;
    });
		total_subscribers = getNumberFromString(subscribers);

    console.log('Total subscribers are : ' + total_subscribers);
    fs.write( username+'.txt', total_subscribers, 'a');

    var views = page.evaluate(function () {
        return document.querySelectorAll('span.about-stat b')[1].innerHTML;
    });
    total_views = getNumberFromString(views);

    console.log('Total views are : ' + total_views);
    fs.write( username+'.txt', total_views, 'a');
 
    nextpage();

	});

	function nextpage(){

			page.open(url_playlist , function(){

					console.log("inside playlists...........");

					var c = window.setInterval(function(){

							window.setTimeout(function(){

									var hasMorePlaylists = page.evaluate(function(){
				          var checkLoadMore = document.querySelector('.load-more-text');
				          return (checkLoadMore != null && checkLoadMore.innerText.trim() == "Load more");

			      		  });

			      		  hasMorePlaylistsHorizontal = page.evaluate(function(){

			      		  		return document.querySelectorAll('h4.compact-shelf-view-all-card-link-text').length;

			      		  });

			      		  if(hasMorePlaylists == true){

		 		      		  	executeClickOn();

			      		  }else if(hasMorePlaylistsHorizontal > 0){

			      		  		executeClickOn('li.compact-shelf-view-all-card a');

			      		  }else{

			      		  	calculateTotalPlaylists();
			      		  	calculateTotalvideos();
			      		  	StoreToHtmlFile();
			      		  	console.log("no more playlists.............");
			      		  	console.log("no more videos..........");
			      		  	clearInterval(c);
			      		  	console.log('{"totalSubscribers": '+total_subscribers+', "totalViews": '+total_views+', "totalPlaylists": '+playlists+', "totalVideos": '+total_videos+'}');
			      		  	phantom.exit();

			      		  }

							},1000); // will check if load more button exists on page .

					},5000); // will execute timeout after every 5 seconds.

			});

	}

};

	

function calculateTotalvideos(){

		total_videos = page.evaluate(function(){
               var sum = 0;
               var total_video_count = document.querySelectorAll('div.yt-lockup-thumbnail').length;

                for(var i=0;i<total_video_count;i++){

                  var val = document.querySelectorAll('.formatted-video-count-label b')[i].innerHTML;
                  var s = parseInt(val);
                  sum = sum + s ;

                }

            return sum;

            });
		    fs.write( username+'.txt', total_videos , 'a');
				console.log(total_videos);

}

function calculateTotalPlaylists(){

			playlists = page.evaluate(function(){

					return document.querySelectorAll('div.yt-lockup-thumbnail').length;

			});

			console.log('Total playlists are : ' + playlists);
	    fs.write( username+'.txt', playlists, 'a');
			
}

function executeClickOn(selector){
  selector = (selector == undefined) ? 'button.browse-items-load-more-button' : selector;
  page.evaluate(function(selector) { 
    var a = document.querySelector(selector);
    var e = document.createEvent('MouseEvents');
    e.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    a.dispatchEvent(e);
  }, selector);

  console.log("inside click ..........");
}

function StoreToHtmlFile(){

		var content = page.evaluate(function(){

				return document.querySelectorAll('div.branded-page-v2-body')[0].innerHTML;

		});

    fs.write( username+'_content.html', content, 'w');
    console.log("stored in html file......");

}

function getNumberFromString(numStr){
  var numberVal = numStr.replace(/,/g,'');
  return numberVal;
}

window.setTimeout(function(){
	youtubeScrap();
},2000);