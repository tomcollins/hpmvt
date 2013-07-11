var http = require('http')
  , url = require('url')
  , fs = require('fs')
  , cache = require('memory-cache');


exports.getExperimentCacheKey = function(experimentConfig, variant) {
  var key = '';
  experimentConfig.forEach(function(experiment){
    if (experiment.variants) {
      key += exports.getVariantIndex(experiment.variants.length, variant) +'_';
    }
  });
  return key.substr(0, key.length-1);
}

exports.getVariantIndex = function(nofVariants, variant) {
  return Math.floor(nofVariants * variant/100);
}

exports.getVariants = function(req, res) {
  if (undefined === req.cookies.mvt) {
    return false;
  }
  var variants = req.cookies.mvt.split('|');
  if (!variants) {
    return false;
  }
  return variants;
}

exports.getVariantFormHtml = function(variant, isUpdated) {
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

exports.getConfigFormHtml = function(config, hasUpdatedConfig, error) {
  var html = '<html><body>';
  if (hasUpdatedConfig) {
    html += '<p style="color:green;font-weight:bold">Config updated.</p>';
  } else if (error) {
    html += '<p style="color:red;font-weight:bold">' +error +'</p>';
  }
  html += '<p style="margin-bottom: 5px">Edit config</p><form method="POST"><textarea name="config" style="margin-bottom: 10px" wrap="off" rows="30" cols="120">' +JSON.stringify(config, null, 4) +'</textarea><input style="display: block;clear: both" type="submit"/></form>';
  html += '</body></html>';
  return html;
}

exports.replaceCssHref = function($, search, replace) {
  var link, href;
  $('link[rel="stylesheet"]').each(function(){
    link = $(this);
    href = link.attr('href');
    if (href === search) {
      link.attr('href', replace);
    }
  });
}

exports.replaceRequireMapValue = function($, search, replace) {
  var script, text;
  $('script').each(function(){
    script = $(this);
    text = script.text();
    if (text.indexOf(search) !== -1) {
      text = text.replace(search, replace);
      script.html(text);
    }
  });
}

exports.getJson = function(options, callback) {
  var req = http.request(options, function(res) {
    var str = ''
    res.on('data', function (chunk) {
      str += chunk;
    });
    res.on('end', function () {
      callback(JSON.parse(str));
    });
  });
  req.on('error', function(e) {
    console.log('Request error: ' + e.message);
  });
  req.end();
};

exports.readJsonSync = function(file) {
  return JSON.parse(fs.readFileSync(file));
};

exports.writeFile = function(file, content) {
  fs.writeFile(file, content, function (err) {
    if (err) {
      console.log('Error saving', file);
    } else {
      console.log('Saved', file);
    }
  });
};

exports.getHttpOptions = function(uri, proxyUri) {
  var options = {headers:{}}
    , uri = url.parse(uri)
    , header;

  if (proxyUri) proxyUri = url.parse(proxyUri);

  options.protocol = uri.protocol || 'http:';
  options.hostname = uri.hostname || 'localhost';
  options.port = uri.port || null;
  options.path = uri.path || '/';

  if (proxyUri && proxyUri.hostname) {
    options.path = options.protocol +'//' +uri.hostname + uri.path;
    options.hostname = proxyUri.hostname;
    options.headers.Host = uri.hostname;
    options.port = proxyUri.port | null;
  }
  return options;
};

exports.getHttp = function(options, callback) {
  var req
    , key = options.host +'_' +options.port +'_' +options.path
    , data = cache.get(key);

  if (data) {
    callback(data.headers, data.body);
    return;
  }

  req = http.request(options, function(res) {
    var html = '';
    res.on('data', function (chunk) {
      html += chunk;
    });
    res.on('end', function () {
      cache.put(key, {
        headers: res.headers,
        body: html
      }, 60000);
      callback(res.headers, html);
    });
  });
  req.on('error', function(e) {
    console.log('Request error: ' + e.message);
  });
  req.end();
};
