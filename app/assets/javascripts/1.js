var page = require('webpage').create();
console.log('The default user agent is ' + page.settings.userAgent);
page.settings.javascriptEnabled = true;
page.settings.loadImages = false;//Script is much faster with this field set to false
phantom.cookiesEnabled = true;
phantom.javascriptEnabled = true;
// page.settings.userAgent = 'SpecialAgent';
page.open('https://www.twitter.com/parthbarot', function (status) {
  console.log(status);
  if (status !== 'success') {
    console.log('Unable to access network');
  } else {
    // var count = page.evaluate(function(){return document.getElementsByClassName('ProfileNav-item').length;});
    // console.log("First count = "+count);

      // page.injectJs('jquery.min.js');
    // page.includeJs("https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js", function() {
      // Checks for bottom div and scrolls down from time to time
      // var i = 0;
      // page.evaluateJavaScript('var scrollTo = 5000;');
      window.setInterval(function() {
          // Checks if there is a div with class=".has-more-items" 
          // (not sure if this is the best way of doing it)
          var count = page.evaluate(function(){
            return document.querySelectorAll('.stream-footer .has-more-items').length;
          });

          // console.log("count = "+count);
          if(count > 0) { // Didn't find
            page.evaluate(function() { 
              window.document.body.scrollTop = document.body.scrollHeight;
              window.scrollTo(0,document.body.scrollHeight);
              // console.log(" ==> Records = "+ document.getElementsByClassName("tweet").length);
            });
            // var total = page.evaluate(function(){return document.getElementsByClassName(".js-stream-item").length;});
            // console.log(" stream items = "+ total);
            // i++;
          } else { // Found
            var totalTweets = page.evaluate(function(){
              return document.querySelectorAll(".tweet");
            });

            var totalRts = page.evaluate(function(){
              return document.querySelectorAll(".tweet .js-retweet-text");
            });

            console.log("Total Tweets = "+ totalTweets);
            console.log("Total ReTweets = "+ totalRts);
            // page.render('bild.png');
            return totalTweets
            phantom.exit();
          }
      }, 1000); // Number of milliseconds to wait between scrolls
    // });
  }
});