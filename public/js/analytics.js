require(["jquery-1", "domReady"], function($){

  function track(type, project, experiment, variant) {
    var uri = 'http://localhost:3001/track?stat=' +type +':' +project +':' +experiment +':' +variant
      , html = '<img src="' +uri +'" style="position:absolute;left:-9999px;" width="1" height="1" />';
    $('body').append(html);
  };

  function captureClick(experiment, selector) {
    var element = $(selector)[0];
    element.addEventListener('click', function(e) {
        track('click', _analytics.project, experiment, _analytics.variant);
    }, true);
  }

  if (_analytics && _analytics.queue) {
    $.each(_analytics.queue, function(index, item) {
      if ('view' == item[0]) {
        track('view', _analytics.project, item[1], _analytics.variant);
      } else if ('click' == item[0]) {
        captureClick(item[1], item[2]);
      }
    });
  }
});
