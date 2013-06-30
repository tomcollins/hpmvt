require(["jquery-1", "domReady"], function($){

  function captureClick(selector, variant) {
    var element = $(selector)[0];
    element.addEventListener('click', function(e) {
        console.log('click on element', selector, 'variant', _analytics.variant);
    }, true);
  }

  if (_analytics && _analytics.variants) {
    $.each(_analytics.variants, function(index, variant) {
      captureClick(variant[0], variant[1]);
    });
  }
});
