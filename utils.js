var fs = require('fs');

exports.getVariant = function(req, res, allowQueryString) {
  var variant = req.cookies.mvt;
  if (!variant) {
    variant = Math.random() <= 0.5 ? 'v1' : 'v2';
    res.cookie('mvt', variant);
  }
  if (allowQueryString && req.query && req.query.variant) {
    variant = req.query.variant;
  }
  return variant;
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

exports.getConfigFormHtml = function(config, error) {
  var html = '<html><body>';
  if (error) {
    html += '<p style="color: red;font-weight: bold">' +error +'</p>';
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
      script.text(text);
    }
  });
}

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