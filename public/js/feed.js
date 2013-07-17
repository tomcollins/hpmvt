require(['jquery-1'], function($) {
  if (!_apiBase || !_userId) return;
  
  var nowDate = new Date();

  function createArticle(article, rejectOldArticles) {
    var dateDifference = nowDate.getTime() - new Date(article.date).getTime()
      , minutes = dateDifference / (1000 * 60)
      , time = Math.ceil(minutes)
      , category = article.product
      , articleImage;

    if (article.section) category += ', ' +article.section;

    if (rejectOldArticles && minutes > 1440 * 5) {
      return '';
    }

    if (1440 <= time) {
      time = Math.floor(time/1440) + ' days ago.';
    } else if (60 <= time) {
      time = Math.ceil(time/60) + ' hours ago.';
    } else {
      time += ' minutes ago.';
    }

    if (images[article.product +':' +article.section]) {
      image = images[article.product +':' +article.section];
    } else if (images[article.product]) {
      image = images[article.product];
    } else {
      image = images['bbc'];
    };

    articleImage = null == article.image ? images.bbc : article.image; 

    html = '<li>'
    + '<a href="' +article.link +'">'
    + '<img class="brand" src="' +image +'" width="66" height="49" />'
    + '<img class="article" src="' +articleImage +'" width="66" height="49" />'
    + '<p class="title">' +article.title +'</p>'
    + '</a>'
    + '<p class="summary">' +(undefined == article.description ? 'n/a' : article.description) +'</p>'
    + '<p class="date">' +time +'<span> (' +category +')</span></p>'
    + '</li>';
    return html;
  };

  function createFeed(data) {
    if (!data.articles) {
      $('#feed').html('<p>Error requesting feed data.</p>');
      return;
    }
    var html = '<ul class="highlights">';
    data.highlights.forEach(function(article){
      html += createArticle(article);
    });
    html += '</ul>';

    html += '<ul class="articles">';
    data.articles.forEach(function(article){
      html += createArticle(article, true);
    });
    html += '</ul>';

    $('#feed').html(html);
  };

  $('ready', function(){
    $.ajax({
      url: _apiBase +'/users/' +_userId,
      success: createFeed
    })
  });
});

var images = {
  "bbc": "http://www.thedrum.com/uploads/drum_basic_article/112419/main_images/bbc-logo9.jpg",
  "news": "http://upload.wikimedia.org/wikipedia/en/thumb/f/ff/BBC_News.svg/200px-BBC_News.svg.png",
  "news:business": "https://profile-b.xx.fbcdn.net/hprofile-ash4/373049_294662213128_1495264814_n.jpg",
  "news:wales": "http://www.storagegiant.co.uk/wp-content/uploads/2013/06/bbc1.png",
  "news:scotland": "http://www.thedrum.com/uploads/drum_basic_article/85617/main_images/BBC%20Scotland.jpg",
  "news:northern_ireland": "http://collettewalsh.com/wp-content/uploads/2012/12/bbc-ulster1.jpg",
  "news:england": "http://a0.twimg.com/profile_images/3699016920/6f00ba0ef238e6cc0e99818975838ed0.png",
  "sport": "http://a0.twimg.com/profile_images/2162206162/bbsport_twitter.png",
  "sport:football": "/img/icons/sport_football.png",
  "sport:cycling": "/img/icons/sport_cycling.png",
  "sport:formula1": "/img/icons/sport_formula1.png",
  "sport:rugby-union": "/img/icons/sport_rugby-union.png",
  "sport:tennis": "/img/icons/sport_tennis.png",
  "sport:cricket": "/img/icons/sport_cricket.png"
};
