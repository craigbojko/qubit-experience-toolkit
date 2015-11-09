var $ = require('jquery');
var storage = require('../common/storage');
var cookie = require('../common/cookie');
// var QRCode = require('qrcode-npm');

var templates = {
  main : require('../../templates/content/main.html'),
  dtLayer : require('../../templates/content/dtLayer.html'),
  expInfo : require('../../templates/content/expInfo.html'),
};

var API = {
  snippets : require('./toolkit_snippets.js')(),
  event_recorder : require('./toolkit_event_recorder.js')(),
  creative_resolver : require('./toolkit_creative_resolver.js')(),
  experiment_previewer : require('./toolkit_experiment_previewer.js')()
};

var DeliverToolkit = function(chrome){
  this.VERSION = '0.2.3';
  this.CHROME_VERSION = '-';

  this.DEBUG = false || /qbDT_debug/.test(document.cookie);
  this.API = API;
  this.chromeInstance = chrome;
  this.toolbarReady = false;
  this.clientId = -1;
  this.initialised = false;
  this.data = {};
  this.experiments = {};
  this.c = {
    logRaw : function(msg, args){ console.log(msg, args); },
    table : function(msg, args){ console.table(msg, args); },
    log : function(msg, args){ console.group('Qubit Deliver Toolkit::'+msg); if(args) {console.log(args);} console.groupEnd(); },
    info : function(msg, args){ console.group('Qubit Deliver Toolkit::'+msg); if(args) {console.info(args);} console.groupEnd(); },
    warn : function(msg, args){ console.group('Qubit Deliver Toolkit::'+msg); if(args) {console.warn(args);} console.groupEnd(); },
    error : function(msg, args){ console.group('Qubit Deliver Toolkit::'+msg); if(args) {console.error(args);} console.groupEnd(); },
    group : function(msg){ console.group(msg); },
    groupEnd : function(){ console.groupEnd(); }
  };
};

DeliverToolkit.prototype.init = function(){
  var _self = this;
  window.deliverToolkit = this || {};

  this.c.logRaw('%c Qubit Deliver Toolkit', 'color: #D86D39; font-size: 16pt;');
  this.c.log('running...');

  if( this.initialised ) return;

  // Pong event setup - early as possible
  if( storage.loadFromStorage('uv_logger') === true ){
    API.event_recorder.initPongListener();
  }
  this.chromeInstance.runtime.sendMessage({type: "setupPongCapture"}, function(response) {
    if(_self.DEBUG) _self.c.info(response);
  });

  // Start listening for UV updates
  this.listenForUVUpdates();

  // Look for UV once DOM parsed
  document.addEventListener('DOMContentLoaded', function(){
    this.injectUVConnectionScripts("", this.chromeInstance);
  }.bind(this), false);

  // Listen to all sources and detect Qubit Smartserve file
  document.addEventListener("load", this.detectSmartserve.bind(this), true);
};

DeliverToolkit.prototype.detectSmartserve = function(event){
  if (!event ) {return}

  var src = event.target.getAttribute('src');
  var source = event.target.textContent || event.target.innerText;

  if( this.initialised ) {
    return;
  }
  else if( src && src !== '' && src.toLowerCase().indexOf('//dd6zx4ibq538k.cloudfront.net/smartserve') >= 0 ){
    this.clientId = src.match('dd6zx4ibq538k.cloudfront.net/smartserve-([0-9]{4}).js')[1];
    if(this.DEBUG) this.c.info("DELIVER LOADED: ", this.clientId);

    if( /smartserve_preview=/.test(document.URL) || /smartserve_preview=/.test(document.cookie) ){
      this.smartserve_preview = true;
      this.detectSmartservePreview();
    }
    else{
      this.getDashboardManifest();
      this.initialised = true;
    }
  }
};

DeliverToolkit.prototype.detectSmartservePreview = function(){
  // Listen and defer for preview file before loading
  document.addEventListener("load", function(event) {
    var src = event.target.getAttribute('src');
    var source = event.target.textContent || event.target.innerText;

    if( src && src !== '' && src.toLowerCase().indexOf('smartserve.s3.amazonaws.com/smartserve') >= 0 ){
      if(this.DEBUG) this.c.log("DELIVER PREVIEW LOADED: ", this.clientId);
      this.getDashboardManifest();
      this.initialised = true;
    }
  }.bind(this), true);
};

DeliverToolkit.prototype.getDashboardManifest = function(){
  $.ajax({
    url : "//dashboard.qubitproducts.com/p/"+this.clientId+"/smart_serve/experiments/",
    cache : false,
    success : function(data){
      if(this.DEBUG) this.c.info("DASHBOARD MANIFEST: ", data);
      this.buildDataObj(data);
    }.bind(this),
    fail : function(e){
      this.c.error("Error retreiving Dashboard manifest data: ", e);
    }.bind(this)
  });
};

DeliverToolkit.prototype.buildDataObj = function(data){
  this.data = data;
  this.data.reverse(); // Match order in dashboard

  this.initToolbar();
};

DeliverToolkit.prototype.initToolbar = function(){
  this.buildToolbar();
  this.injectToolbarToDOM();
};

DeliverToolkit.prototype.buildToolbar = function(){
  var self = this;
  var $html = $(templates.main());

  $html.find('.dashboard').click(function(e){
    window.open("//dashboard.qubitproducts.com/p/"+self.clientId+"/");
  });

  $html.find('#DeliverToolbarLayerActivations').click(function(e){
    var $activations = $(this);
    var $previewer = self.$el.find('#DeliverPreviewer');
    var $layers = self.$el.find('#DeliverToolbarLayers');

    if( $layers.hasClass('open') && $activations.hasClass('active') ){
      self.resetLayers();
    }
    else if( $layers.hasClass('open') && $previewer.hasClass('active') ){
      self.resetLayers();
      self.listToolbarLayers();
      $activations.addClass('active');
    }
    else{
      self.listToolbarLayers();
      $activations.addClass('active');
    }
  });

  $html.find('.toolbarMinimise').click(function(e){
    this.$el.toggleClass('DT-minimise');
    this.$el.find('#DeliverToolbarWrapper').removeClass('expanded');
    this.$el.find('#DeliverToolbarInfo').removeClass('expanded');
    this.$el.find('.DT-Layer').removeClass('open');
    this.currentlyOpenExperiment = -1;
  }.bind(this));

  this.$el = $html;
  return this.$el;
};

DeliverToolkit.prototype.listToolbarLayers = function(){
  var self = this;
  var $listWrapper = this.$el.find('#DeliverToolbarLayers');
  $listWrapper.empty();

  $(this.data)
    .each(function(index){
      var odd = (index % 2 === 0) ? "even" : "odd";
      var $layer = $(templates.dtLayer({
        odd : odd,
        id : this.id,
        name : this.name
      }))
      .click(function(e){
        var $this = $(this);
        var id = $this.attr('data-id');
        if( API.creative_resolver.initialised === true ){
          self.openExperimentInfo(id);
        }
      });

    $listWrapper.append($layer);
  });

  $listWrapper.addClass('open');
  this.indicateActiveExperiments();
};

DeliverToolkit.prototype.resetLayers = function(){
  var $activations = this.$el.find('#DeliverToolbarLayerActivations');
  var $previewer = this.$el.find('#DeliverPreviewer');
  var $previewer_parent = this.$el.find('#DeliverToolbarLayerPreviews');
  var $layers = this.$el.find('#DeliverToolbarLayers');

  if( $layers.hasClass('open') ){
    this.closeEperimentInfo();
    $activations.removeClass('active');
    $previewer.removeClass('active');
    $previewer_parent.removeClass('active');
    $layers.removeClass('open').empty();
  }
};

DeliverToolkit.prototype.injectToolbarToDOM = function(){
  if( this.$el && this.$el.length ) {
    $(document).ready(function(){
      $('body').append(this.$el);
      this.toolbarReady = true;
    }.bind(this));
  }
};

DeliverToolkit.prototype.indicateActiveExperiments = function(){
  var uv = this.uv || {};

  if( uv && uv.qb && uv.qb.qb_etc_data && (!this.smartserve_preview || this.smartserve_preview === null) ){
    $.each(uv.qb.qb_etc_data, function(index){
      var experiment_id = this.e;
      $('div[data-id="'+experiment_id+'"]').find('.indicator').addClass('active');
    });
  }
  else if( this.smartserve_preview === true && this.preview_creatives ){
    var that = this;
    $.each(this.preview_creatives, function(index){
      var experiment_id = that.ss_opts[0].creatives[this].e_id;
      $('div[data-id="'+experiment_id+'"]').find('.indicator').addClass('active');
    });
  }
};

DeliverToolkit.prototype.openExperimentInfo = function(experimentId){
  var $topBar = this.$el.find('#DeliverToolbarWrapper');
  var $infoBar = this.$el.find('#DeliverToolbarInfo');

  if( this.currentlyOpenExperiment === experimentId ){
    this.closeEperimentInfo();
  }
  else{
    API.creative_resolver.getExperimentAndCreative(experimentId, function(data){
      if(this.DEBUG) this.c.info("EC DATA: ", data);
      this.renderExperimentInfo(data);
    }.bind(this));

    $infoBar.find('.loadingBar').show();
    $topBar.addClass('expanded');
    $infoBar.addClass('expanded');
    this.currentlyOpenExperiment = experimentId;
    this.$el.find('.DT-Layer').removeClass('open');
    this.$el.find('.DT-Layer[data-id="'+experimentId+'"]').addClass('open');
  }
};

DeliverToolkit.prototype.closeEperimentInfo = function(){
  var $topBar = this.$el.find('#DeliverToolbarWrapper');
  var $infoBar = this.$el.find('#DeliverToolbarInfo');

  $topBar.removeClass('expanded');
  $infoBar.removeClass('expanded');
  this.currentlyOpenExperiment = -1;
  this.$el.find('.DT-Layer').removeClass('open');
};

DeliverToolkit.prototype.renderExperimentInfo = function(data){
  var $infoBar = this.$el.find('#DeliverToolbarInfo');
  var model = this.parseECData(data);

  if(this.DEBUG) this.c.log("EC MODEL: ", model);
  $infoBar.find('.loadingBar').hide();

  $html = $(templates.expInfo({
    name : model.experiment.name,
    status : model.status,
    iteration : ((model.hasBeenPublished === true) ? model.experiment.recent_iterations.published.name : "Draft"),
    split : model.split,
    probability : model.prob,
    bucket : model.bucket,
    date_creation : new Date(model.experiment.created_at),
    date_last_publish : (model.last_published && new Date(model.last_published)) || 'Not yet published',
    links : {
      previews : {},
      dashboard : ''
    },
    DT_VERSION : this.VERSION,
    CHROME_VERSION : this.CHROME_VERSION
  }));

  // var qrcode = QRCode.qrcode($html.find('.qr_preview')[0]);
  // qrcode.makeCode('test code');

  $infoBar.find('.inject').html($html);
};

DeliverToolkit.prototype.parseECData = function(data){
  var control = {}, variations = [];
  var control_map = {
    0.5 : "Equal Split",
    0.05 : "Supervised Mode",
    0 : "100% Layer",
    0.8 : "Pilot Mode"
  };

  var model = {
    hasBeenPublished : false,
    experiment : data[0],
    creative : data[1],
    split : '',
    prob : '',
    bucket : 'Not active/Not segmented'
  };

  $.each(data[1], function(index){
    if( this.is_control === true ){
      control = this;
    }
    else{
      variations.push(this);
    }
  });

  if( this.uv && this.uv.qb && this.uv.qb.qb_etc_data && this.uv.qb.qb_etc_data ){
    $.each(this.uv.qb.qb_etc_data, function(index){
      if( this.e && this.e === data[0].id ){
        model.qb_etc_data = this;
        model.prob = this.p;
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

  if ( /published/i.test(model.status) ) {
    model.control_size = data[0].recent_iterations.published.control_size;
    model.last_published =  data[0].recent_iterations.published.last_published_at
    model.split = control_map[model.control_size];
  }
  else {
    model.control_size = data[0].recent_iterations.draft.control_size;
    model.split = control_map[model.control_size];
  }

  if ( model.prob && model.prob !== '' ) {
    var in_control = (1 - model.prob) <= model.control_size;
    if (in_control) {
      model.bucket = 'Control';
    }
    else {
      model.bucket = 'Variant';
    }
  }
  else if (this.smartserve_preview && this.smartserve_preview === true) {
    model.prob = 'Preview Mode';
    model.bucket = 'Preview Mode';
  }

  return model;
};

DeliverToolkit.prototype.injectUVConnectionScripts = function(file, chrome){
  file = file || chrome.extension.getURL('/js/content/deliver_toolkit_comms.js');
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
      if(this.DEBUG) this.c.group('DELIVER TOOLKIT: COMMS_RESPONSE: ');
      // if(this.DEBUG) this.c.info(event.data.data);
      try{
        if( event.data.type === "uv_initial_response" ){
          this.uv = JSON.parse(event.data.data);
          this.initRender();
        }
        else if( event.data.type === "ss_creative_response" ){
          this.ss_opts = JSON.parse(event.data.data);
          this.ss_domain = this.ss_opts[0].domain;
        }
      }
      catch(e){
        this.c.error("CANNOT PARSE COMMS_INITIAL_RESPONSE: ", e);
      }
      if(this.DEBUG) this.c.groupEnd();
    }
  }.bind(this));

  head.appendChild(s);
};

DeliverToolkit.prototype.requestUVUpdate = function(){
  var uv = this.uv || {};

  window.postMessage({
    type: 'uv_update_request',
    data: {}
  }, '*');
};

DeliverToolkit.prototype.listenForUVUpdates = function(){
  window.addEventListener('message', function(event){
    if( event.data.type === "uv_update_response" ){
      if(this.DEBUG) this.c.group('DELIVER TOOLKIT: UV_UPDATE_RESPONSE: ');
      if(this.DEBUG) this.c.info(event.data.data);
      try{
        this.uv = JSON.parse(event.data.data);
        if( this.uv && this.uv.qb && this.uv.qb.qb_etc_data ){
          this.indicateActiveExperiments();
        }
      }
      catch(e){
        this.c.error("CANNOT PARSE UV_UPDATE_RESPONSE: ", e);
      }
      if(this.DEBUG) this.c.groupEnd();
    }
  }.bind(this));
};

DeliverToolkit.prototype.initRender = function(){
  if( this.toolbarReady && this.toolbarReady === true && this.ss_opts ){
    this.render();
  }
  else{
    setTimeout(this.initRender.bind(this), 150);
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

      etc_cookie = cookie.getCookie('etcForceCreative');

      if( etc_cookie !== null ){
        cookie_cid = etc_cookie.match(/\[([0-9].*)\]/)[1];
        cookie_cids = cookie_cid.split(',');
      }

      if( url_cid ){
        this.preview_creatives = [];
        this.preview_creatives.push(parseInt(url_cid, 10));
      }
      else{
        var self = this;
        self.preview_creatives = [];
        $.each(cookie_cids, function(index){
          self.preview_creatives.push(parseInt(this, 10));
        });
      }
      this.indicateActiveExperiments();
    }
    catch(e){
      this.c.error("Error obtaining Experiment preview ID: ", e);
    }
  }
  // this.listenForUVUpdates();

  API.snippets.init(this);
  API.creative_resolver.init(this);
  API.event_recorder.init(this);
  API.experiment_previewer.init(this);
};

// Return DeliverToolkit for commonjs
module.exports = DeliverToolkit;
