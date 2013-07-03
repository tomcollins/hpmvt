require(["jquery-1", "domReady"], function($){

  function track(type, project, experiment, variant) {
    var uri = 'http://' +_analytics.host +':' +_analytics.port +'/track?stat=' +type +':' +project +':' +experiment +':' +variant
      , html = '<img src="' +uri +'" style="position:absolute;left:-9999px;" width="1" height="1" />';
    $('body').append(html);
  };

  function captureClick(experiment, variant, selector) {
    var element = $(selector);
    if (element && element.length) {
      element = element[0];
      element.addEventListener('click', function(e) {
          track('click', _analytics.project, experiment, variant);
      }, true);
    } else {
      console.log('Bad click selector', selector);
    }
  }

  if (_analytics && _analytics.queue) {
    $.each(_analytics.queue, function(index, item) {
      if ('view' == item[0]) {
        track('view', _analytics.project, item[1], item[2]);
      } else if ('click' == item[0]) {
        captureClick(item[1], item[2], item[3]);
      }
    });
  }
});
