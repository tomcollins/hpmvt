var http = require('http')
  , fs = require('fs')
  , express = require('express')
  , jsdom = require("jsdom");

var app
  , htmlHeaders
  , htmlBody
  , variantConfig
  , jquery
  , gaHtml
  , useProxy = true;

gaHtml = fs.readFileSync('./data/ga.html');
variantConfig = JSON.parse(fs.readFileSync('./data/config.json'));
jquery = fs.readFileSync("./vendor/jquery/jquery-1.9.1.min.js").toString();

app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.logger('dev'));
  app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
});

app.get('/', function(req, res) {
  var variant = getVariant(req, res);
  modifyHtml(htmlBody, variant, function(html) {
    res.writeHead(200, htmlHeaders);
    res.write(html);
    res.end();
  });
});

app.get('/variant', function(req, res) {
  var variant = getVariant(req, res)
    , isUpdated = false;
  if (req.query && req.query.variant && req.query.variant != variant) {
    variant = req.query.variant;
    isUpdated = true;
    res.cookie('mvt', variant);
  }
  res.writeHead(200, htmlHeaders);
  res.write(getVariantFormHtml(variant, isUpdated));
  res.end();
});

app.get('/config', function(req, res) {
  res.writeHead(200, htmlHeaders);
  res.write(getConfigFormHtml(variantConfig));
  res.end();
});

app.post('/config', function(req, res){
  var requestConfig, jsonError;
  if (req.body && req.body.config) {
    try {
      requestConfig = JSON.parse(req.body.config);
      if (requestConfig) {
        variantConfig = requestConfig;
      }
    } catch (e) {
      console.log('Error parsing config', e);
      jsonError = e;
    }
  }
  res.writeHead(200, htmlHeaders);
  res.write(getConfigFormHtml(variantConfig, jsonError));
  res.end();
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Server listening on port " + app.get('port'));
});

updateHtml();
setTimeout(function(){
  console.log('Fetch fresh html.');
  updateHtml();
}, 60000);

function getVariant(req, res) {
  var variant = req.cookies.mvt;
  if (!variant) {
    variant = Math.random() <= 0.5 ? 'v1' : 'v2';
    res.cookie('mvt', variant);
  }
  if (req.query && req.query.variant) {
    variant = req.query.variant;
  }
  return variant;
}

function getVariantFormHtml(variant, isUpdated) {
  var html = '<html><body>';
  function makeOption(name, value) {
    return '<option value="' +value +'" ' +(value == variant ? 'selected' : '') +'>' +name +'</option>';
  }
  if (isUpdated) {
    html += '<p style="color: green;font-weight: bold">Your variant has been updated.</p>';
  }
  html += '<p style="margin-bottom: 5px">Set variant</p><form method="GET">';
  html += '<select name="variant">' +makeOption('Variant 1', 'v1') +makeOption('Variant 2', 'v2') +'</select>';
  html += '<input style="display: block;clear: both;margin-top: 10px" type="submit"/></form>';
  html += '</body></html>';
  return html;
}

function getConfigFormHtml(config, error) {
  var html = '<html><body>';
  if (error) {
    html += '<p style="color: red;font-weight: bold">' +error +'</p>';
  }
  html += '<p style="margin-bottom: 5px">Edit config</p><form method="POST"><textarea name="config" style="margin-bottom: 10px" wrap="off" rows="30" cols="120">' +JSON.stringify(config, null, 4) +'</textarea><input style="display: block;clear: both" type="submit"/></form>';
  html += '</body></html>';
  return html;
}

function modifyHtml(html, variant, callback) {
  createJsDomEnv(html, function(errors, window) {
    var $ = window.$;
    variantConfig.variants.forEach(function(variantData){
      if ('text' === variantData.type) {
        $(variantData.selector).text(variantData.values[variant]);
      } else if ('image' === variantData.type) {
        $(variantData.selector).attr('src', variantData.values[variant]);
      } else if ('css' === variantData.type) {
        $('<style type="text/css">' +variantData.values[variant] +'</style>').appendTo('head');
      } else if ('remove_clock' === variantData.type && variantData.values[variant]) {
        replaceRequireMapValue($, 
          'http://static.bbci.co.uk/h4clock/0.68.0/modules/h4clock',
          'http://static.stage.bbci.co.uk/h4clock/0.69.2/modules/h4clock'
        );
        replaceCssHref($,
          'http://static.bbci.co.uk/h4clock/0.68.0/style/h4clock.css',
          'http://static.stage.bbci.co.uk/h4clock/0.69.2/style/h4clock.css'
        );
      }
    });
    $('body').append(getAnalyticHtml(variant));
    callback($('html').html());
  });
};

function replaceCssHref($, search, replace) {
  var link, href;
  $('link[rel="stylesheet"]').each(function(){
    link = $(this);
    href = link.attr('href');
    if (href === search) {
      link.attr('href', replace);
    }
  });
}

function replaceRequireMapValue($, search, replace) {
  var script, text;
  $('script').each(function(){
    script = $(this);
    text = script.text();
    if (text.indexOf(search) !== -1) {
      text = text.replace(search, replace);
      script.text(text);
    }
  });
}

function getAnalyticHtml(variant) {
  var response = String(gaHtml);
  response = response.replace(/_variant_/g, variant);
  return response;
};

function updateHtml() {
  console.log('Updating page...');
  var tempHtml
    , req;

  var options;
  if (useProxy) {
    options = {
      host: 'www-cache.reith.bbc.co.uk',
      port: 80,
      path: "http://www.bbc.co.uk",
      headers: {
        Host: "www.bbc.co.uk"
      }
    }
  } else {
    options = {
      host: 'www.bbc.co.uk'
    }
  }
  req = http.request(options, function(res) {
    console.log('Response status: ' + res.statusCode);
    htmlHeaders = res.headers;
    writeFile('./data/headers.txt', JSON.stringify(htmlHeaders));
    var tempHtml = '';
    res.on('data', function (chunk) {
      tempHtml += chunk;
    });
    res.on('end', function () {
      console.log('Page updated');
      prepareHtml(tempHtml, function(html) {
        htmlBody = html;
        writeFile('./data/body.html', htmlBody);
      });
    });
  });
  req.on('error', function(e) {
    console.log('Request error: ' + e.message);
  });
  req.end();
};

function prepareHtml(html, callback) {
  createJsDomEnv(html, function(errors, window) {
    var $ = window.$;
    $('head').prepend('<script>bbccookies_flag="OFF"</script>');
    callback($('html').html());
  });
};

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

function writeFile(file, content) {
  fs.writeFile(file, content, function (err) {
    if (err) {
      console.log('Error saving', file);
    } else {
      console.log('Saved', file);
    }
  });
};
