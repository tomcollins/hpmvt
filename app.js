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
  , baseUrl = 'http://' +hostname +':' +port
  , httpProxy = argv.http_proxy || null
  , cookieBaseUrl = argv.cookie_base || 'http://localhost:4001'
  , analyticsBaseUrl = argv.analytics_base || 'http://localhost:4000'
  , projects
  , projectExperiments
  , environment;

if (!process.env.NODE_ENV) { throw('NODE_ENV is not set'); }
environment = process.env.NODE_ENV;

// create app

app = express();

app.configure(function(){
  app.set('port', port);
  app.use(express.cookieParser()); 
});

app.configure('development', function () {
  app.use(express.static(path.join(__dirname, 'public'), { maxAge: 120 * 1000 }));
  app.use(express.logger('dev'));
  app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
});

app.configure('production', function () {
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.compress());
  app.use(express.errorHandler());
});

app.configure(function(){
  app.use(express.methodOverride());
  app.use(app.router);
});

app.get('/me', function(req, res) {
  var html = String(fs.readFileSync('./public/me.html'))
    , userId = req.cookies.userId
    , headers;

  html = html.replace('<head>', '<head><script type="text/javascript">_userId="' +userId +'";_apiBase="' +analyticsBaseUrl +'";</script>');
  headers = {
    'Content-type': 'text/html',
    'content-length': Buffer.byteLength(html)
  };
  res.writeHead(200, headers);
  res.end(html);
});

app.get('*', function(req, res) {
  var variants = utils.getVariants(req, res, true)
    , reqUrl = url.parse(req.url)
    , project = utils.getProjectByRequest(projects, req)
    , httpOptions
    , cacheKey
    , cacheValue
    , ptrt = baseUrl + (reqUrl.pathname ? reqUrl.pathname : '/');

  if (!req.cookies.userId) {
    res.cookie('userId', new Date().getTime(), {
      expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
    });
  };  

  function sendResponse(res, headers, body) {
    headers['content-length'] = Buffer.byteLength(body);
    res.writeHead(200, headers);
    res.end(body);
  };

  if (false !== project && false === variants) {
    res.writeHead(302, {
      'Content-type': 'text/html',
      'Location': cookieBaseUrl + (reqUrl.pathname ? reqUrl.pathname : '/') +'?ptrt=' +ptrt
    });
    res.end();
    return;
  }

  httpOptions = getHttpOptionsForRequest(project, req);
  cacheKey = httpOptions.path + (variants ? variants.join('_') : '');

  cacheValue = cache.get(cacheKey);
  if (cacheValue) {
    sendResponse(res, cacheValue.headers, cacheValue.body);
  } else {
    utils.getHttp(httpOptions, function(headers, body){
      if (headers.location) {
        reqUrl = url.parse(headers.location);
        res.writeHead(302, {
          'Content-type': 'text/html',
          'Location': 'http://' +hostname +':' +port +reqUrl.path
        });
        res.end();
        return;
      }
      var $;
      if (project) {
        body = addVisitTracking(reqUrl, body, project, variants);
        $ = cheerio.load(body, {
          ignoreWhitespace: true,
          xmlMode: false
        });
        modifyDom(project, $, variants, function(body){
          cache.put(cacheKey, {
            headers: headers,
            body: body
          }, 120000);
          sendResponse(res, headers, body);
        });
      } else {
        body = addVisitTracking(reqUrl, body, project, variants);
        cache.put(cacheKey, {
          headers: headers,
          body: body
        }, 120000);
        sendResponse(res, headers, body);
      }
    });
  }
});




utils.loadProjects(analyticsBaseUrl, function(result) {
  if (result)
  projects = result;
  utils.loadProjectExperiments(projects, analyticsBaseUrl, function(){
    console.log('projects loaded');
  });
});
http.createServer(app).listen(app.get('port'), function(){
  console.log("Server listening on port " + app.get('port'));
});
//setInterval(updateExperiments, 10000);


function addVisitTracking(url, body, project, variants) {
  var html = '<script type="text/javascript">var _analytics = {httpBaseUrl: "' +baseUrl +'", baseUrl:"' +analyticsBaseUrl +'"' +(project ? ',project: "' +project.id +'"' : '') +',variant: "' +(variants ? variants.join(',') : '') +'", queue: []};</script>'
    + '<script type="text/javascript" src="' +analyticsBaseUrl +'/js/shared/analytics.js"></script>'
    + '<img src="' +analyticsBaseUrl +'/impression?url=' +url.path +'" width="1" height="1"/>';

  body = body.replace('</body>', html +'</body>');

  body = body.replace('<head>', '<head><script>bbccookies_flag="OFF"</script>');
  return body;
}


function getHttpOptionsForRequest(project, req) {
  var urlValue = url.parse(req.url)
    , options;

  urlValue.hostname = 'www.bbc.co.uk';

  options = utils.getHttpOptions(urlValue, httpProxy);
  if (project && project.headers) {
    for(header in project.headers) options.headers[header] = project.headers[header];
  }
  return options;
};

function modifyDom(project, $, variants, callback) {
  var html
    , experimentVariantsToTrack = [];

  if (-1 === hostname.indexOf('.bbc.co.uk')) {
    $('head').prepend('<script>bbccookies_flag="OFF"</script>'
      + '<base href="http://www.bbc.co.uk"/>');
  }

  if (project && project.experiments) {
    project.experiments.forEach(function(experiment){
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
    $('body').append(getAnalyticsScript(project, variants, experimentVariantsToTrack));
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
 
function getAnalyticsScript(project, variants, experimentVariantsToTrack) {
  var script = '<script type="text/javascript">'
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
