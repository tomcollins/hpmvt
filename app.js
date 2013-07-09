var http = require('http')
  , url = require('url')
  , fs = require('fs')
  , path = require('path')
  , os = require("os")
  , vm = require("vm")
  , argv = require('optimist').argv
  , cache = require('memory-cache')
  , express = require('express')
  , cheerio = require('cheerio')
  , utils = require("./utils");
 
var app
  , hostname = os.hostname()
  , port = argv.port || 3000
  , projectId = argv.project || null
  , httpProxy = argv.http_proxy || null
  , analyticsHost = argv.analytics_host || 'localhost'
  , analyticsPort = argv.analytics_port || '4000'
  , anaylyticsBaseUri = 'http://' +analyticsHost +':' +analyticsPort
  , projectConfig
  , experimentConfig
  , environment;

if (!process.env.NODE_ENV) { throw('NODE_ENV is not set'); }
environment = process.env.NODE_ENV;

// setup project

if (!projectId) { throw('No project set use app.js --project=projectId.'); }
console.log('Load project config ./config/projects/' +projectId +'.json');
projectConfig = utils.readJsonSync('./config/projects/' +projectId +'.json');

// create app

app = express();

app.configure(function(){
  app.set('port', port);
  app.use(express.cookieParser());
  app.use(express.methodOverride());
  app.use(app.router);
});

app.configure('development', function () {
  app.use(express.logger('dev'));
  app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
  app.use(express.static(path.join(__dirname, 'public'), { maxAge: 120 * 1000 }));
});

app.configure('production', function () {
  app.use(express.compress());
  app.use(express.errorHandler());
  app.use(express.static(path.join(__dirname, 'public')));
});

app.get('*', function(req, res) {
  var variant = utils.getVariant(req, res, true)
    , projectConfig = getProjectConfigForRequest(req)
    , httpOptions = getHttpOptionsForRequest(req)
    , cacheKey = getCacheKey(httpOptions, variant)
    , cacheValue;

  function sendResponse(res, headers, body) {
    headers['content-length'] = body.length
    res.writeHead(200, headers);
    res.end(body);
  };

  function getCacheKey(httpOptions, variant) {
    var key = httpOptions.path;
    if (experimentConfig) {
      key += ' ' +utils.getExperimentCacheKey(experimentConfig, variant);
    }
    return key;
  };

  cacheValue = cache.get(cacheKey);
  if (cacheValue) {
    sendResponse(res, cacheValue.headers, cacheValue.body);
  } else {
    utils.getHttp(httpOptions, function(headers, body){
      var $;
      if (projectConfig) {
        $ = cheerio.load(body, {
          ignoreWhitespace: true,
          xmlMode: false
        });
        modifyDom($, variant, function(body){
          cache.put(cacheKey, {
            headers: headers,
            body: body
          }, 60000);
          sendResponse(res, headers, body);
        });
      } else {
        sendResponse(res, headers, body);
      }
    });
  }
});

updateExperiments();
http.createServer(app).listen(app.get('port'), function(){
  console.log("Server listening on port " + app.get('port'));
});
setInterval(updateExperiments, 10000);

function updateExperiments() {
  var options = utils.getHttpOptions(
    anaylyticsBaseUri +'/experiments/project/' +projectId +'?enabled=true'
  );
  utils.getJson(options, function(result){
    experimentConfig = result;
  });
}

function getProjectConfigForRequest(req) {
  var config = null;
  if (projectConfig.routes) {
    projectConfig.routes.forEach(function(route){
      if (req.url.match(route)) {
        config = projectConfig;
      }
    });
  }
  return config;
};

function getHttpOptionsForRequest(req) {
  var urlValue = url.parse(req.url)
    , options;

  if (projectConfig.url) {
    urlValue = url.parse(projectConfig.url);
  } else if (projectConfig.hostname) {
    urlValue.hostname = projectConfig.hostname;
  }

  options = utils.getHttpOptions(urlValue, httpProxy);
  if (projectConfig.headers) {
    for(header in projectConfig.headers) options.headers[header] = projectConfig.headers[header];
  }
  return options;
};

function modifyDom($, variant, callback) {
  var html;

  if (-1 === hostname.indexOf('.bbc.co.uk')) {
    $('head').prepend('<script>bbccookies_flag="OFF"</script>'
      + '<base href="http://www.bbc.co.uk"/>');
  }

  if (experimentConfig) {
    experimentConfig.forEach(function(experiment){
      if (experiment.variants) {
        variantIndex = utils.getVariantIndex(experiment.variants.length, variant);
        applyModification($, experiment.variants[variantIndex]);
      }
    });
    $('body').append(getAnalyticsScript(experimentConfig, variant));
  }

  $('body').append('<script type="text/javascript" src="http://' +analyticsHost +':' +analyticsPort +'/js/shared/analytics.js"></script>');
  
  callback($.html());
};

function applyModification($, variant) {
  this.$ = $;
  if (variant.jquery && variant.jquery.server) {
    try {
      vm.runInThisContext(variant.jquery.server);
    } catch (e) {
      console.log('Error parsing jquery', e);
      return;
    }
  }
  if (variant.css) {
    $('head').append('<style type="text/css">' +variant.css +'</style>');
  }
}
 
function getAnalyticsScript(variantConfig, variant) {
  var script = '<script type="text/javascript">var _analytics = {host:"' +analyticsHost +'",port:"' +analyticsPort +'",project: "' +projectId +'",variant: "' +variant +'", queue: []};'
    , conversionSelector
    , variantIndex;

  experimentConfig.forEach(function(experiment){
    variantIndex = utils.getVariantIndex(experiment.variants.length, variant);
    script += '_analytics.queue.push(["view", "' +experiment._id +'", "' +variantIndex +'"]);';
    if (experiment.tracking) {
      experiment.tracking.forEach(function(tracking){
        if ('click' == tracking.type) {
          script += '_analytics.queue.push(["click", "' +experiment._id +'","' +variantIndex +'","' +tracking.selector +'"]);';
        }
      });
    } else {
      conversionSelector = null;
    }
    
  });
  script += '</script>';
  return script;
};
