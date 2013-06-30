var http = require('http')
  , fs = require('fs')
  , jsdom = require('jsdom')
  , jquery = fs.readFileSync("./httpdom/vendor/jquery/jquery-1.9.1.min.js").toString();

function createJsDomEnv(html, callback) {
  jsdom.env({
    html: html,
    src: [jquery],
    features: {
      FetchExternalResources: false,
      ProcessExternalResources: false
    },
    done: callback
  });
};

exports.getUri = function(options, callback) {
  var req;
  req = http.request(options, function(res) {
    var html = '';
    res.on('data', function (chunk) {
      html += chunk;
    });
    res.on('end', function () {
      createJsDomEnv(html, function(errors, window){
        callback(window, {
          headers: res.headers
        });
      });
    });
  });
  req.on('error', function(e) {
    console.log('Request error: ' + e.message);
  });
  req.end();
};
