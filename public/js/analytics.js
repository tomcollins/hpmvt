//-----------------------------------------------------------------------------
/**
 @classdesc The Analytic Client provides an API for applications to submit
  events for collation and later analysis.

    This version makes some assumptions based on its intended usage.
    >=IE9 support only, requires native JSON and XMLHttpRequest or XDomainRequest.

  @param {object} config This contains the following attributes:
    server : string : the address of the events server
    product : string : uniquely identifies product
    probability : number : 0 == never, 1.0 == always trigger non critical events
        propagate_errors : boolean : I recommend false
        delivery_method : one of AC.AJAX_POST (default), AC.AJAX_GET, AC.DOM_GET
 @class
*/
//-----------------------------------------------------------------------------
function AC(config)
{
    var self = this;

  this.events = []; //this is where we store events until we send them
  this.s = config.server;
    this.url_params = config.url_params;
  this.p = config.product;
  this.tprob = config.probability;
    this.properrors = config.propagate_errors;
  this.id2 = this.get_cookie(document.cookie);
    this.delivery_method = config.delivery_method || AC.AJAX_POST;

    this.limitURLLength = ( this.delivery_method == AC.AJAX_GET ||
                            this.delivery_method == AC.DOM_GET );
    this.baseURL = AC.makeURL(this.s,this.delivery_method,this.url_params);
    window.onerror = AC.doubleDelegate(function(message,url,linenumber)
  {
    self.addEventAndSend("ERR",{m:message,file:url,line:linenumber},AC.DEFAULT_ENRICH);

    return !self.properrors;//allow error propagation
  },window.onerror);
}
AC.makeURL = function(server,method,params){
    var path = (method === AC.AJAX_POST)?"/":"/legacy";
    var url = server + path;
    return AC.addParams(url,params);
};
AC.addParams = function(url,params){
    if(url.indexOf('?') === -1){
        url += "?";
    }else if(url.indexOf('?') !== (url.length - 1)){
        url += "&";
    }
    for(var k  in params){
        url += k+"="+params[k]+"&"
    }
    return url.replace(/(\?|&)$/,'');
};
/* Constants */
AC.AJAX_POST    = 1;
AC.AJAX_GET     = 2;
AC.DOM_GET      = 3;
AC.MAX_URL_LENGTH = 2000;

AC.EN_IP        = 1; //adds user IP address to event server side
AC.EN_GEOIP     = 2; //adds user Location based on IP to event server side
AC.EN_BROWSER   = 3;
AC.EN_OS        = 4;
AC.EN_DEVICE    = 5;
AC.DEFAULT_ENRICH = [1,2,3,4,5];

//------------------------------------------------------------------------
// This allows us to add add listener without removing any already assigned
//------------------------------------------------------------------------
AC.doubleDelegate = function (function1, function2)
{
    return function(message,url,linenumber)
    {
      var stophere = function1(message,url,linenumber);

        if(!stophere)
        {
            if(function2)
            {
                return function2(message,url,linenumber);
            }
        }
        // Returning true here means errors are suppressed in the browser
        return stophere;
    }
};
//-----------------------------------------------------------------------------
/**
  Add an event to the internal queue.

  @param {number} eventId The id of the event
  @param {Object} eventData The payload data of the event
  @param {array}  enrich (optional) An array of possible enrichments
*/
//-----------------------------------------------------------------------------
AC.prototype.addEvent = function(eventId,eventData,enrich)
{
  if(enrich === undefined)
  {
    enrich = AC.DEFAULT_ENRICH;
  }

  this.events.push(
  {
    p : this.p,
    id : eventId,
    id2 : this.id2,
    ts : (new Date()).getTime(),
    data : eventData,
    enrich : enrich
  });
};
//-----------------------------------------------------------------------------
/**
  Get comScore's s1 cookie if it is available.

  @param {string} cookies The document cookie string
*/

AC.prototype.get_cookie = function(cookies)
{
  var start;

  if ( cookies.indexOf('s1=') == 0 )
  {
    start = 3;
  }
  else
  {
    start = cookies.indexOf(' s1=');

    if ( start == -1 )
    {
      return null;
    }
    else
    {
      start += 4;
    }
  }

  var end = cookies.indexOf(';', start);

  if ( end == -1 )
  {
    end = cookies.length;
  }

  return cookies.substring(start, end);
};
//-----------------------------------------------------------------------------
/**
  Add an event to the internal queue, then send all events in the queue.

  @param {number} eventId The id of the event
  @param {Object} eventData The payload data of the event
  @param {array}  enrich (optional) An array of possible enrichments
  @param {function} callback (optional) This will be fired after event has
   been sent
*/
//-----------------------------------------------------------------------------
AC.prototype.addEventAndSend = function(eventId,eventData,enrich,callback)
{
  this.addEvent(eventId,eventData,enrich);
  this.sendEvents(callback);
};
//-----------------------------------------------------------------------------
/**
  Create the payload required for the special Page Load event.
  This event is automatically triggered whenever the user loads a new
  page, it contains detail about their navigation along with performance
  timings.

  @return {Object} The created Page Load payload.
*/
//-----------------------------------------------------------------------------
AC.prototype.createPLData = function()
{
  return {
    url : window.location.pathname,
    referrer : document.referrer
  };
};

//-----------------------------------------------------------------------------
/**
    This will send all events currently stored in the client to the
    server endpoint.

    @param {function} callback Fired upon completion of sending messages.
    @param {array} optional list of events to send, will default to this.events
                   and in this case will empty this queue after sending
*/
//-----------------------------------------------------------------------------
AC.prototype.sendEvents = function(callback,events)
{
    var eventslist = events || this.events,
        json_events = JSON.stringify({events:eventslist}),
        i;

    // If we are trying to limit url length, split the
    // eventslist out into separate events
    if (this.limitURLLength && eventslist.length > 1 &&
        json_events.length > AC.MAX_URL_LENGTH ) {
         for ( i in eventslist ) {
             this.sendEvents( callback, [eventslist[i]] );
         }
     }
    else {
        switch (this.delivery_method) {
            case AC.AJAX_POST : this.makeAJAXRequest(callback,'POST',this.baseURL,json_events,
                                                     {'Content-type' : 'application/json'});
                                break;

            case AC.AJAX_GET : this.makeAJAXRequest(callback,'GET',this.baseURL,json_events);
                               break;

            case AC.DOM_GET :  this.makeDOMGetRequest(callback,this.baseURL, json_events);
                               break;
            default : // Unknown; fallback to AJAX_POST
                               this.makeAJAXRequest(callback,'POST',this.baseURL,json_events,
                                                  {'Content-type' : 'application/json'});

        }
    }
    // Clear the queue (if list of events not provided)
    events || ( this.events = [] );
}

//-----------------------------------------------------------------------------
/**
    Makes an HTTP request

    @param {function} callback Fired upon completion of sending messages.
    @param {string} HTTP request method (should be GET or POST).
    @param {string} URL to request
    @param {string} (Optional) data to send in body (for POSTing)
    @param {object} The request headers to set (as key-value pairs)
*/
//-----------------------------------------------------------------------------
AC.prototype.makeAJAXRequest = function(callback, method, url, data, headers)
{
    var xmlhttp = null;
    //if GET, we add the data as a parmater
    if(method === 'GET'){
        url = AC.addParams(url,{data:data});
    }

    if(typeof XMLHttpRequest == "undefined")
    {
        xmlhttp = new XDomainRequest();
        xmlhttp.open(method, url);
    }
    else
    {
        xmlhttp = new XMLHttpRequest();
        xmlhttp.open(method, url, true);
        for( var k in headers ){
            xmlhttp.setRequestHeader(k, headers[k]);
        }
    }
    xmlhttp.onreadystatechange = function()
    {
        if(xmlhttp.readyState == 4)
        {
            if(callback)
            {
                callback(xmlhttp.status);
            }
        }
    }

    try
    {
        xmlhttp.send(data);
    }
    catch(e)
    {
        //RUM FAILED
    }


}

AC.prototype.makeDOMGetRequest = function(callback,url,data) {
    url = AC.addParams(url,{data:data});
    var image = new Image();
    if (typeof callback === 'function') {
        image.onload = function() {
            callback();
        }
    }
    // GET the image
    image.src = url;
};

//-----------------------------------------------------------------------------
/**
  When the page has completed loading we create an instance
  of the client and submit the special page load event.
 */
//-----------------------------------------------------------------------------
AC.prototype.load = function()
{
  var self = this;

  if(Math.random() < self.tprob)
  {
    if(typeof window.performance === 'object')
    {
      self.addEvent("PL",self.createPLData());

      //If called on pageload this will not populate performance data properly
      // as the first tick is taken into consideration, thus need to get it on second tick.
      setTimeout(function()
      {
        var ptdata = {url:window.location.pathname};

        //lame? - yes it is thanks mozilla
        for(var prop in window.performance.timing)
        {
            if(typeof window.performance.timing[prop] !== 'function')
            {
              ptdata[prop] = window.performance.timing[prop];
          }
        }

        self.addEventAndSend("PT", ptdata);
      },0);
    }
    else
    {
      self.addEventAndSend("PL",self.createPLData());
    }
  }
};

require(["jquery-1", "domReady"], function($, domReady){

  debugger;

  domReady(function(){
    var ac = new AC({
      server:'http://bbc.api.mashery.com/analytics',
      url_params: {
        api_key:'7xwaqy8j5uj2wehn2pcqhrp2'
      },
      product: 'homepage',
      probability: 1,
      propagate_errors: true,
      delivery_method: mod.AC.AJAX_POST
    });
    ac.load();
  });

  function track(type, project, experiment, variant) {
    var uri = 'http://' +_analytics.host +':' +_analytics.port +'/track?stat=' +type +':' +project +':' +experiment +':' +variant
      , html = '<img src="' +uri +'" style="position:absolute;left:-9999px;" width="1" height="1" />';
    $('body').append(html);
  };

  function captureClick(experiment, variant, selector) {
    var element = $(selector);
    if (element && element.length) {
      element = element[0];
      element.addEventListener('click', function(e) {
          track('click', _analytics.project, experiment, variant);
      }, true);
    } else {
      console.log('Bad click selector', selector);
    }
  }

  if (_analytics && _analytics.queue) {
    $.each(_analytics.queue, function(index, item) {
      if ('view' == item[0]) {
        track('view', _analytics.project, item[1], item[2]);
      } else if ('click' == item[0]) {
        captureClick(item[1], item[2], item[3]);
      }
    });
  }
});
