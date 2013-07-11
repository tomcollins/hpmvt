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
  , hostname = argv.hostname || 'localhost'
  , port = argv.port || 3000
  , projectId = argv.project || null
  , httpProxy = argv.http_proxy || null
  , cookieBaseUri = argv.cookie_base || 'http://localhost:4001'
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
  var variants = utils.getVariants(req, res, true)
    , reqUri = url.parse(req.url)
    , projectConfig
    , httpOptions
    , cacheKey
    , cacheValue
    , ptrt = 'http://' +hostname +':' +port + (reqUri.pathname ? reqUri.pathname : '/');

  if (false === variants) {
    res.writeHead(302, {
      'Content-type': 'text/html',
      'Location': cookieBaseUri + (reqUri.pathname ? reqUri.pathname : '/') +'?ptrt=' +ptrt
    });

    res.end();
    return;
  }

  projectConfig = getProjectConfigForRequest(req);
  httpOptions = getHttpOptionsForRequest(req);
  cacheKey = httpOptions.path + variants.join('_');

  function sendResponse(res, headers, body) {
    headers['content-length'] = body.length
    res.writeHead(200, headers);
    res.end(body);
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
        modifyDom($, variants, function(body){
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

function modifyDom($, variants, callback) {
  var html
    , experimentVariantsToTrack = [];

  if (-1 === hostname.indexOf('.bbc.co.uk')) {
    $('head').prepend('<script>bbccookies_flag="OFF"</script>'
      + '<base href="http://www.bbc.co.uk"/>');
  }

  if (experimentConfig) {
    experimentConfig.forEach(function(experiment){
      if (experiment.variants) {
        experiment.variants.forEach(function(variant){
          variants.forEach(function(variantId){
            if (variant.id === variantId) {
              applyModification($, variant);
              experimentVariantsToTrack.push({
                experiment: experiment,
                variant: variant
              });
            }
          });
        })
      }
    });
    $('body').append(getAnalyticsScript(variants, experimentVariantsToTrack));
    $('body').append('<script type="text/javascript" src="http://' +analyticsHost +':' +analyticsPort +'/js/shared/analytics.js"></script>');
  }

  
  
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
 
function getAnalyticsScript(variants, experimentVariantsToTrack) {
  var script = '<script type="text/javascript">var _analytics = {host:"' +analyticsHost +'",port:"' +analyticsPort +'",project: "' +projectId +'",variant: "' +variants.join(',') +'", queue: []};'
    , conversionSelector
    , variantIndex;

  experimentVariantsToTrack.forEach(function(experimentVariant){
    script += '_analytics.queue.push(["view", "' +experimentVariant.experiment._id +'", "' +experimentVariant.variant.id +'"]);';
    if (experimentVariant.experiment.tracking) {
      experimentVariant.experiment.tracking.forEach(function(tracking){
        if ('click' == tracking.type) {
          script += '_analytics.queue.push(["click", "' +experimentVariant.experiment._id +'","' +experimentVariant.variant.id +'","' +tracking.selector +'"]);';
        }
      });
    }
  });
  script += '</script>';
  return script;
};
