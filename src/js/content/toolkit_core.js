var $ = require('jquery');
var storage = require('../common/toolkit_storage');

var DeliverToolkit = function(chrome, modules){
  this.chromeInstance = chrome;
  this.modules = modules;
  this.toolbarReady = false;
  this.clientId = -1;
  this.initialised = false;
  this.data = {};
  this.experiments = {};
  this.c = {
    log : function(msg, args){ console.log(msg, args); },
    info : function(msg, args){ console.info(msg, args); },
    warn : function(msg, args){ console.warn(msg, args); },
    error : function(msg, args){ console.error(msg, args); },
    group : function(msg){ console.group(msg); },
    groupEnd : function(){ console.groupEnd(); }
  };
};

DeliverToolkit.prototype.init = function(){
  var _self = this;
  window.deliverToolkit = window.deliverToolkit || this;



  this.c.log('%c Qubit Deliver Toolkit', 'color: #D86D39; font-size: 16pt;');
  if( this.initialised ) return;

  // Pong event setup - early as possible
  if( storage.loadFromStorage('uv_logger') === true ){
    this.modules.event_recorder.initPongListener();
  }
  this.chromeInstance.runtime.sendMessage({type: "setupPongCapture"}, function(response) {
    _self.c.info(response);
  });

  // Start listening for UV updates
  this.listenForUVUpdates();
  // Look for UV once DOM parsed
  document.addEventListener('DOMContentLoaded', function(){
    deliverToolkit.injectUVConnectionScripts("", deliverToolkit.chromeInstance);
  }, false);

  document.addEventListener("load", function(event) {
    var src = event.target.getAttribute('src');
    var source = event.target.textContent || event.target.innerText;
    if( deliverToolkit.initialised ) return;
    if( src && src !== '' && src.toLowerCase().indexOf('//dd6zx4ibq538k.cloudfront.net/smartserve') >= 0 ){
      _self.clientId = src.match('dd6zx4ibq538k.cloudfront.net/smartserve-([0-9]{4}).js')[1];
      _self.c.info("DELIVER LOADED: ", _self.clientId);

      if( /smartserve_preview=/.test(document.URL) || /smartserve_preview=/.test(document.cookie) ){
        deliverToolkit.smartserve_preview = true;

        // Listen and defer for preview file before loading
        document.addEventListener("load", function(event) {
          var src = event.target.getAttribute('src');
          var source = event.target.textContent || event.target.innerText;

          if( src && src !== '' && src.toLowerCase().indexOf('smartserve.s3.amazonaws.com/smartserve') >= 0 ){
            deliverToolkit.c.log("DELIVER PREVIEW LOADED: ", deliverToolkit.clientId);
            deliverToolkit.getDashboardManifest();
            deliverToolkit.initialised = true;
          }
        }, true);
      }
      else{
        _self.getDashboardManifest();
        deliverToolkit.initialised = true;
      }
    }
  }, true);
};

DeliverToolkit.prototype.getDashboardManifest = function(){
  var _self = this;
  $.ajax({
    url : "//dashboard.qubitproducts.com/p/"+this.clientId+"/smart_serve/experiments/",
    // dataType : 'application/json',
    cache : false
  }).success(function(data){
    _self.c.info("DASHBOARD MANIFEST: ", data);
    _self.buildDataObj(data);
  }).fail(function(e){
    _self.c.error("Error retreiving Dashboard manifest data: ", e);
  });
};

DeliverToolkit.prototype.buildDataObj = function(data){
  var _self = this;
  _self.data = data;
  _self.data.reverse(); // Match order in dashboard

  // TODO - create state object for active layers

  _self.initToolbar();
};

DeliverToolkit.prototype.splitURL = function(url){
  var query_string = {};
  // var query = window.location.search.substring(1);
  var vars = url.split("&");
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    if (typeof query_string[pair[0]] === "undefined") {
      query_string[pair[0]] = pair[1];
    } else if (typeof query_string[pair[0]] === "string") {
      var arr = [query_string[pair[0]], pair[1]];
      query_string[pair[0]] = arr;
    } else {
      query_string[pair[0]].push(pair[1]);
    }
  }
  return query_string;
};

DeliverToolkit.prototype.getCookie = function(name){
  var nameEQ = name + "=";
  var ca = document.cookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) === " ") {
      c = c.substring(1, c.length);
    }
    if (c.indexOf(nameEQ) === 0) {
      return c.substring(nameEQ.length, c.length);
    }
  }
  return null;
};

DeliverToolkit.prototype.initToolbar = function(){
  var _self = this;
  _self.buildToolbar();
  // _self.listToolbarLayers();
  _self.injectToolbarToDOM();
};

DeliverToolkit.prototype.buildToolbar = function(){
  var _self = this;
  var $html = $([
    "<div id='DeliverToolbar'>",
      "<div id='DeliverToolbarWrapper'>",
        "<span>Qubit Deliver Toolkit</span>",
        "<div id='DeliverToolbarViewOptions'>",
          "<div class='dashboard'><a>Q</a></div>",
          "<div class='toolbarMinimise'><a></a></div>",
        "</div>",
      "</div>",
      "<div id='DeliverToolbarMeta'></div>",
      "<div id='DeliverToolbarLayerActivations'>",
        "Show Active Experiments",
      "</div>",
      "<div id='DeliverToolbarLayerPreviews'></div>",
      "<div id='DeliverToolbarLayers'></div>",
      "<div id='DeliverToolbarInfo'>",
        "<div class='loadingBar'><!-- -->&nbsp;</div>",
        "<div class='inject'></div>",
      "</div>",
    "</div>" // END main wrapper
  ].join(""));

  $html.find('.dashboard').click(function(e){
    window.open("//dashboard.qubitproducts.com/p/"+deliverToolkit.clientId+"/");
  });

  $html.find('#DeliverToolbarLayerActivations').click(function(e){
    var _self = deliverToolkit;
    var $activations = $(this);
    var $previewer = _self.$el.find('#DeliverPreviewer');
    var $layers = _self.$el.find('#DeliverToolbarLayers');

    if( $layers.hasClass('open') && $activations.hasClass('active') ){
      _self.resetLayers();
    }
    else if( $layers.hasClass('open') && $previewer.hasClass('active') ){
      _self.resetLayers();
      _self.listToolbarLayers();
      $activations.addClass('active');
    }
    else{
      _self.listToolbarLayers();
      $activations.addClass('active');
    }
  });

  $html.find('.toolbarMinimise').click(function(e){
    deliverToolkit.$el.toggleClass('DT-minimise');
    deliverToolkit.$el.find('#DeliverToolbarWrapper').removeClass('expanded');
    deliverToolkit.$el.find('#DeliverToolbarInfo').removeClass('expanded');
    deliverToolkit.$el.find('.DT-Layer').removeClass('open');
    deliverToolkit.currentlyOpenExperiment = -1;
  });

  this.$el = $html;
  return this.$el;
};

DeliverToolkit.prototype.listToolbarLayers = function(){
  var _self = this;
  var $listWrapper = this.$el.find('#DeliverToolbarLayers');
  $listWrapper.empty();

  $(this.data).each(function(index){
    var odd = (index % 2 === 0) ? "even" : "odd";
    var $layer = $([
      "<div class='DT-Layer "+odd+"' data-id='"+this.id+"' >",
        "<div class='indicator' data-experiemntId='"+this.id+"' data-creativeId='' >&nbsp;</div>",
        "<div>",
          "<span>"+this.name+"</span>",
        "</div>",
      "</div>"
    ].join("")).click(function(e){
      var $this = $(this);
      var id = $this.attr('data-id');
      if( deliverToolkit.modules.creative_resolver.initialised === true ){
        deliverToolkit.openExperimentInfo(id);
      }
    });

    $listWrapper.append($layer);
  });
  $listWrapper.addClass('open');
  _self.indicateActiveExperiments();
};

DeliverToolkit.prototype.resetLayers = function(){
  var _self = deliverToolkit;
  var $activations = _self.$el.find('#DeliverToolbarLayerActivations');
  var $previewer = _self.$el.find('#DeliverPreviewer');
  var $layers = _self.$el.find('#DeliverToolbarLayers');

  if( $layers.hasClass('open') ){
    deliverToolkit.closeEperimentInfo();
    $activations.removeClass('active');
    $previewer.removeClass('active');
    $layers.removeClass('open');
    $layers.empty();
  }
};

DeliverToolkit.prototype.injectToolbarToDOM = function(){
  if( this.$el && this.$el.length ){
    $(document).ready(function(){
      $('body').append(deliverToolkit.$el);
      deliverToolkit.toolbarReady = true;
    });
  }
};

DeliverToolkit.prototype.indicateActiveExperiments = function(){
  var uv = this.uv || {};

  if( this.uv && this.uv.qb && this.uv.qb.qb_etc_data && (!this.smartserve_preview || this.smartserve_preview === null) ){
    $.each(this.uv.qb.qb_etc_data, function(index){
      var experiment_id = this.e;
      $('div[data-id="'+experiment_id+'"]').find('.indicator').addClass('active');
    });
  }
  else if( this.smartserve_preview === true && this.preview_creatives ){
    $.each(this.preview_creatives, function(index){
      var experiment_id = deliverToolkit.ss_opts[0].creatives[this].e_id;
      $('div[data-id="'+experiment_id+'"]').find('.indicator').addClass('active');
    });
  }

};

DeliverToolkit.prototype.openExperimentInfo = function(experimentId){
  var _self = this;
  var $topBar = deliverToolkit.$el.find('#DeliverToolbarWrapper');
  var $infoBar = deliverToolkit.$el.find('#DeliverToolbarInfo');

  if( deliverToolkit.currentlyOpenExperiment === experimentId ){
    this.closeEperimentInfo();
  }
  else{
    deliverToolkit.modules.creative_resolver.getExperimentAndCreative(experimentId, function(data){
      _self.c.info("EC DATA: ", data);
      deliverToolkit.renderExperimentInfo(data);
    });

    $infoBar.find('.loadingBar').show();
    $topBar.addClass('expanded');
    $infoBar.addClass('expanded');
    deliverToolkit.currentlyOpenExperiment = experimentId;
    deliverToolkit.$el.find('.DT-Layer').removeClass('open');
    deliverToolkit.$el.find('.DT-Layer[data-id="'+experimentId+'"]').addClass('open');
  }
};

DeliverToolkit.prototype.closeEperimentInfo = function(){
  var $topBar = deliverToolkit.$el.find('#DeliverToolbarWrapper');
  var $infoBar = deliverToolkit.$el.find('#DeliverToolbarInfo');

  $topBar.removeClass('expanded');
  $infoBar.removeClass('expanded');
  deliverToolkit.currentlyOpenExperiment = -1;
  deliverToolkit.$el.find('.DT-Layer').removeClass('open');
};

DeliverToolkit.prototype.renderExperimentInfo = function(data){
  var $infoBar = deliverToolkit.$el.find('#DeliverToolbarInfo');
  var model = this.parseECData(data);

  this.c.log("EC MODEL: ", model);
  $infoBar.find('.loadingBar').hide();
  var $html = $([
    "<div id='DeliverToolbarInfoContent'>",
      "<div class='top'>",
        "<p class='title'>"+model.experiment.name+"</p>",
        "<p class='status titled "+model.status+"'><span>Status: </span>"+model.status+"</p>",
        "<p class='iteration titled'><span>Iteration:</span> "+((model.hasBeenPublished === true) ? model.experiment.recent_iterations.published.name : "Draft")+"</p>",
      "</div>",
    "</div>"
  ].join(''));

  $infoBar.find('.inject').html($html);
};

DeliverToolkit.prototype.parseECData = function(data){
  var control = {}, variations = [];
  var model = {
    hasBeenPublished : false,
    experiment : data[0],
    creative : data[1]
  };

  $.each(data[1], function(index){
    if( this.is_control === true ){
      control = this;
    }
    else{
      variations.push(this);
    }
  });

  if( this.qb && this.qb.qb_etc_data && this.qb.qb_etc_data ){
    $.each(deliverToolkit.uv.qb.qb_etc_data, function(index){
      if( this.e && this.e === data[0].id ){
        model.qb_etc_data = this;
      }
    });
  }

  if( data[0].recent_iterations.published ){
    model.hasBeenPublished = true;
  }

  if( data[0].recent_iterations && data[0].recent_iterations.published && data[0].recent_iterations.published.state ){
    model.status = data[0].recent_iterations.published.state;
  }
  else if( data[0].recent_iterations && !data[0].recent_iterations.published ){
    model.status = 'In Development';
  }
  else{
    model.status = 'Draft';
  }

  return model;
};

DeliverToolkit.prototype.injectUVConnectionScripts = function(file, chrome){
  var _self = this;
  file = file || chrome.extension.getURL('/js/content/deliver_toolkit_comms.js'); // TODO -  get __dirname
  var head = document.getElementsByTagName('head')[0];
  var s = document.createElement('script');
  s.setAttribute('type', 'text/javascript');
  s.setAttribute('src', file);

  s.addEventListener("load", function(event) {
    window.postMessage({
      type: 'uv_initial_request',
      data: {}
    }, '*');

    window.postMessage({
      type: 'ss_creative_request',
      data: {}
    }, '*');
  }, true);

  window.addEventListener('message', function(event){
    if( event.data.type === "uv_initial_response" || event.data.type === "ss_creative_response" ){
      _self.c.group('DELIVER TOOLKIT: COMMS_RESPONSE: ');
      // _self.c.info(event.data.data);
      try{
        if( event.data.type === "uv_initial_response" ){
          deliverToolkit.uv = JSON.parse(event.data.data);
          deliverToolkit.initRender();
        }
        else if( event.data.type === "ss_creative_response" ){
          deliverToolkit.ss_opts = JSON.parse(event.data.data);
          deliverToolkit.ss_domain = deliverToolkit.ss_opts[0].domain;
        }
      }
      catch(e){
        _self.c.error("CANNOT PARSE COMMS_INITIAL_RESPONSE: ", e);
      }
      _self.c.groupEnd();
    }
  });

  head.appendChild(s);
};

DeliverToolkit.prototype.requestUVUpdate = function(){
  var _self = this;
  var uv = _self.uv || {};

  window.postMessage({
    type: 'uv_update_request',
    data: {}
  }, '*');
};

DeliverToolkit.prototype.listenForUVUpdates = function(){
  var _self = this;

  window.addEventListener('message', function(event){
    if( event.data.type === "uv_update_response" ){
      _self.c.group('DELIVER TOOLKIT: UV_UPDATE_RESPONSE: ');
      _self.c.info(event.data.data);
      try{
        deliverToolkit.uv = JSON.parse(event.data.data);
        if( deliverToolkit.uv && deliverToolkit.uv.qb && deliverToolkit.uv.qb.qb_etc_data ){
          deliverToolkit.indicateActiveExperiments();
        }
      }
      catch(e){
        _self.c.error("CANNOT PARSE UV_UPDATE_RESPONSE: ", e);
      }
      _self.c.groupEnd();
    }
  });
};

DeliverToolkit.prototype.initRender = function(){
  if( deliverToolkit.toolbarReady && deliverToolkit.toolbarReady === true && deliverToolkit.ss_opts ){
    deliverToolkit.render();
  }
  else{
    setTimeout(function(){
      deliverToolkit.initRender();
    }, 150);
  }
};

DeliverToolkit.prototype.render = function(){
  if( this.uv && this.uv.qb && this.uv.qb.qb_etc_data && (!this.smartserve_preview || this.smartserve_preview === null) ){
    this.indicateActiveExperiments();
  }
  else if( this.smartserve_preview === true ){
    var url_cid, cookie_cid, cookie_cids, etc_cookie;
    try{
      url_cid = document.URL.match(/etcForceCreative=([0-9].*)/);
      if( url_cid ){
        url_cid = url_cid[1];
      }

      etc_cookie = this.getCookie('etcForceCreative');

      if( etc_cookie !== null ){
        cookie_cid = etc_cookie.match(/\[([0-9].*)\]/)[1];
        cookie_cids = cookie_cid.split(',');
      }

      if( url_cid ){
        this.preview_creatives = [];
        this.preview_creatives.push(parseInt(url_cid, 10));
      }
      else{
        this.preview_creatives = [];
        $.each(cookie_cids, function(index){
          deliverToolkit.preview_creatives.push(parseInt(this, 10));
        });
      }
      this.indicateActiveExperiments();
    }
    catch(e){
      _self.c.error("Error obtaining Experiment preview ID: ", e);
    }
  }
  // this.listenForUVUpdates();

  this.modules.snippets.init(this);
  this.modules.creative_resolver.init(this);
  this.modules.event_recorder.init(this);
  this.modules.experiment_previewer.init(this);
};

// Return DeliverToolkit for commonjs
module.exports = DeliverToolkit;
