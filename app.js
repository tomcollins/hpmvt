var http = require('http')
  , fs = require('fs')
  , path = require('path')
  , os = require("os")
  , argv = require('optimist').argv
  , express = require('express')
  , httpdom = require('./httpdom')
  , utils = require("./utils")
 
var app
  , hostname = os.hostname()
  , port = argv.port || 3000
  , projectId = argv.project || null
  , analyticsHost = argv.analytics_host || null
  , projectConfig
  , variantConfigFile
  , variantConfig
  , environment
  , httpOptions
  , analyticsHtml
  , googleAnalyticsHtml;

// detect env

if (!process.env.NODE_ENV) {
  throw('NODE_ENV is not set');
}
environment = process.env.NODE_ENV;


// setup project

if (!projectId) {
  throw('No project set use app.js --project=projectId.')
}
if (!analyticsHost) {
  throw('No analytics host set use app.js --analytics_host=host.')
}
console.log('Load project config ./config/projects/' +projectId +'.json');
projectConfig = utils.readJsonSync('./config/projects/' +projectId +'.json');
console.log('Setting up project ' +projectConfig.name);
variantConfigFile = './config/variants/' +projectConfig.id +'.json';
console.log('Load variant config ' +variantConfigFile);
variantConfig = utils.readJsonSync(variantConfigFile);
googleAnalyticsHtml = fs.readFileSync('./data/ga.html');
analyticsHtml = fs.readFileSync('./data/analytics.html');

// proxy config

if (argv.http_proxy) {
  httpOptions = {
    host: argv.http_proxy,
    port: 80,
    path: projectConfig.protocol +'://' +projectConfig.host + projectConfig.path,
    headers: {
      Host: projectConfig.host
    }
  }
  if (argv.http_proxy_port) {
    httpOptions.port = argv.http_proxy_port;
  }
} else {
  httpOptions = {
    host: projectConfig.host,
    path: projectConfig.path
  }
}

// create express app

app = express();

app.configure(function(){
  app.set('port', port);
  app.use(express.cookieParser());
  app.use(express.bodyParser());
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

app.get('/', function(req, res) {
  var variant = utils.getVariant(req, res, true);
  httpdom.getUri(httpOptions, function(window, options){
    modifyDom(window, variant, function(html) {
      res.writeHead(200, options.headers);
      res.write(html);
      res.end();
    });
  });
});

app.get('/variant', function(req, res) {
  var variant = utils.getVariant(req, res, false)
    , isUpdated = false;
  if (req.query && req.query.variant && req.query.variant != variant) {
    variant = req.query.variant;
    isUpdated = true;
    res.cookie('mvt', variant);
  }
  res.writeHead(200, htmlHeaders);
  res.write(utils.getVariantFormHtml(variant, isUpdated));
  res.end();
});

app.get('/config', function(req, res) {
  res.writeHead(200, htmlHeaders);
  res.write(utils.getConfigFormHtml(variantConfig));
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
  res.write(utils.getConfigFormHtml(variantConfig, jsonError));
  res.end();
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Server listening on port " + app.get('port'));
});

// DOM manipulation

function modifyDom(window, variant, callback) {
  var $ = window.$
    , html
    , base = 'http://www.bbc.co.uk';
  $('head').prepend('<script>bbccookies_flag="OFF"</script>');
  if (base) {
    $('head').append('<base href="' +base +'">');
  }
  variantConfig.variants.forEach(function(variantData){
    applyVariantModification($, variantData, variant);
  });

  $('body').append(getAnalyticsScript(variantConfig, variant));

  // some issues appending a script tag (it is loaded by jsdom so ends up in source twice) 
  html = $('html').html();
  html = html.replace('</body>', '<script type="text/javascript" src="http://localhost:3000/js/analytics.js"></script></body>');  
  callback(html);
  
  //callback($('html').html());
};

function applyVariantModification($, variantData, variant) {
  if ('text' === variantData.type) {
    $(variantData.selector).text(variantData.values[variant]);
  } else if ('html_replace' === variantData.type) {
    var element = $(variantData.selector)
      , html = element.html();
    element.html(html.replace(variantData.target, variantData.values[variant]));
  } else if ('image' === variantData.type) {
    $(variantData.selector).attr('src', variantData.values[variant]);
  } else if ('css' === variantData.type) {
    $('<style type="text/css">' +variantData.values[variant] +'</style>').appendTo('head');
  } else if ('remove_clock' === variantData.type && variantData.values[variant]) {
    utils.replaceRequireMapValue($, 
      'http://static.bbci.co.uk/h4clock/0.68.0/modules/h4clock',
      'http://static.stage.bbci.co.uk/h4clock/0.69.2/modules/h4clock'
    );
    utils.replaceCssHref($,
      'http://static.bbci.co.uk/h4clock/0.68.0/style/h4clock.css',
      'http://static.stage.bbci.co.uk/h4clock/0.69.2/style/h4clock.css'
    );
  } else if ('add_promo' === variantData.type && variantData.values[variant]) {
    var promo = '<div style="position:relative;width:976px;height:168px;margin:0 auto;">'
    + '<a href="http://www.bbc.co.uk/events/ej58q9">'
    + '<img src="http://s16.postimg.org/44o4nm4b9/Screen_shot_2013_06_28_at_10_54_04.png" width="976px" height="168px />"'
    + '</div>';
    $('#h4-container').prepend(promo);
  }
};

function getAnalyticsScript(variantConfig, variant) {
  var script = '<script type="text/javascript">var _analytics = {host:"' +analyticsHost +'",project: "' +projectId +'",variant: "' +variant +'", queue: []};'
    , conversionSelector;

  variantConfig.variants.forEach(function(variantData){
    script += '_analytics.queue.push(["view", "' +variantData.id +'"]);';
    if (variantData.tracking) {
      variantData.tracking.forEach(function(tracking){
        if ('click' == tracking.type) {
          script += '_analytics.queue.push(["click", "' +variantData.id +'", "' +tracking.selector +'"]);';
        }
      });
    } else {
      conversionSelector = null;
    }
    
  });
  script += '</script>';
  return script;
};

function getAnalyticHtml(variant) {
  var response;
  var response = String(googleAnalyticsHtml);
  response = response.replace(/_variant_/g, variant);
  return response;
};

