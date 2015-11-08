var $ = require('jquery');
var ToolkitCreativeResolver = require('./toolkit_creative_resolver.js')();

var experiment_previewer = {

  initialised : false,
  toolkit : null,
  selectedExperiments : {},


  init : function(t){
    if( !t ) return;
    var _self = this;
    this.toolkit = t;
    this.selectedExperiments = {};

    _self.buildHTML();
    _self.displayRunningPreviews();
    _self.bindEvents();
    _self.initialised = true;
  },

  buildHTML : function(snippetArr){
    var $html = $(["<div id='DeliverPreviewer'>",
                      "<div class='snippetCont'>",
                        "<span>Preview Tests</span>",
                        "<div class='activePreviews'></div>",
                        "<div class='activator'>",
                          "<p class='activate'>Preview <span>0 Tests</span></p>",
                          "<p class='cancel'>Cancel</p>",
                          "<p class='clearPreview'>Clear Previews</p>",
                        "</div>",
                      "</div>",
                    "</div>"].join(''));

    this.toolkit.$el.find('#DeliverToolbarLayerPreviews').append($html);
    return this.toolkit.$el.find('#DeliverToolbarMeta');
  },

  renderExperiments : function(data){
    var _self = this;
    var $listWrapper = this.toolkit.$el.find('#DeliverToolbarLayers');
    _self.selectedExperiments = {};
    $listWrapper.empty();

    $(this.toolkit.data).each(function(index){
      var odd = (index % 2 === 0) ? "even" : "odd";
      var $layer = $([
        "<div class='DT-Layer "+odd+"' data-id='"+this.id+"' >",
          "<input type='checkbox' data-experiemntId='"+this.id+"' data-creativeId='' class='' id='DeliverPreviewerCheckbox-"+this.id+"' />",
          "<div>",
            "<label for='DeliverPreviewerCheckbox-"+this.id+"'><span>"+this.name+"</span></label>",
          "</div>",
        "</div>"
      ].join(""));
      $listWrapper.append($layer);
    });

    // Events
    _self.bindExperimentEvents();

    // Open list
    _self.toolkit.closeEperimentInfo();
    $listWrapper.addClass('open');
  },

  displayRunningPreviews : function(){
    var _self = this;

    if( _self.toolkit.smartserve_preview === true &&
        _self.toolkit.preview_creatives &&
        _self.toolkit.preview_creatives.length > 0
    ){
      var $display = _self.toolkit.$el.find('.activePreviews');
      $display.html(_self.toolkit.preview_creatives.length + " Previews active");
      $display.addClass('active');
    }
  },

  disablePreviewMode : function(){
    var _self = this;
    var expired = new Date();
    expired.setMinutes(expired.getMinutes() - 15);
    expired = expired.toUTCString();

    document.cookie = 'smartserve_preview=true; expires=-'+expired+'; path=/; domain='+_self.toolkit.ss_domain;
    document.cookie = 'etcForceCreative=[]; expires='+expired+'; path=/; domain='+_self.toolkit.ss_domain;

    _self.reloadPage();
  },

  registerIdForPreview : function(e_id){
    this.selectedExperiments[e_id] = true;
  },

  removeIdForPreview : function(e_id){
    this.selectedExperiments[e_id] = false;
  },

  requestCreativeIds : function(experiments){
    var _self = this;
    var experiment_promises = [];

    $.each(experiments, function(e){
      var promise = ToolkitCreativeResolver.requestCreativesByEperimentId(this, function(){});
      experiment_promises.push(promise);
    });

    Promise.all(experiment_promises).then(function(data){
      // update cookies
      console.info("COOKIE CREATIVE ID DATA: ", data);

      var creatives = [];
      $.each(data, function(index){
        var variant = this[1];
        var id = variant.master_id;
        creatives.push(id);
      });

      // set cookies and refresh
      _self.runPreviewCookies(creatives);

    }, function(e){
      console.error("ERROR: Failed to retreive all Creative IDs: ", e);
    });

  },

  runPreviewCookies : function(creatives){
    var _self = this;
    var chrome = this.toolkit.chromeInstance;
    var creative_str = creatives.join(',');
    var expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15);
    expires = expires.toUTCString();

    console.info("CURRENT DOMAIN: ", _self.toolkit.ss_domain);
    console.info("CURRENT CREATIVES: ", creatives);

    document.cookie = 'smartserve_preview=true; expires='+expires+'; path=/; domain='+_self.toolkit.ss_domain;
    document.cookie = 'etcForceCreative=['+creative_str+']; expires='+expires+'; path=/; domain='+_self.toolkit.ss_domain;

    _self.reloadPage();
  },

  reloadPage : function(){
    setTimeout(function(){
      window.location.reload();
    }, 250);
  },

  getSelectedExperiments : function(){
    var _self = this;
    var exp = [];

    for( var i in _self.selectedExperiments ) {
      if( _self.selectedExperiments.hasOwnProperty(i) && _self.selectedExperiments[i] === true ){
        exp.push(i);
      }
    }
    return exp;
  },

  bindExperimentEvents : function(experiments){
    var _self = this;
    var $layers = this.toolkit.$el.find('.DT-Layer');

    $layers.find('input[type="checkbox"]').change(function(e){
      var $this = $(this);
      var id = $this.attr('data-experiemntId');

      if( $this.is(':not(:checked)') ){
        _self.removeIdForPreview(id);
      }
      else{
        _self.registerIdForPreview(id);
      }
      // Update UI
      var exp = _self.getSelectedExperiments();
      var suffix = (exp.length === 1) ? "Test" : "Tests";
      _self.toolkit.$el.find('#DeliverPreviewer').find('.activate span').html(exp.length + ' ' + suffix);
    });
  },

  bindEvents : function(){
    var _self = this;
    var $previewer = this.toolkit.$el.find('#DeliverPreviewer');
    var $layers = this.toolkit.$el.find('.DT-Layer');
    var $activator = this.toolkit.$el.find('.activator');

    $previewer.click(function(e){
      var $this = $(this);
      var parent = _self.toolkit.$el.find('#DeliverToolbarLayerPreviews');
      _self.toolkit.$el.find('#DeliverPreviewer .activate span').html('0 Tests');

      $this.toggleClass('active');
      parent.toggleClass('active');

      if( $this.hasClass('active') ){
        _self.renderExperiments();
      }
      else{
        _self.toolkit.resetLayers();
      }
    });

    $previewer.find('.clearPreview').click(function(e){
      e.stopPropagation();
      _self.disablePreviewMode();
    });

    $activator.find('.activate').click(function(e){
      e.stopPropagation();
      var exp = _self.getSelectedExperiments();
      if( exp.length === 0 ){
        return; // 0 selected previews
      }

      _self.requestCreativeIds(exp);
      console.info("CURRENT SELECTED EXPERIMENTS: ", exp);
    });

    $activator.find('.cancel').click(function(e){
      e.stopPropagation();
      _self.toolkit.resetLayers();
      _self.toolkit.$el.find('#DeliverPreviewer .activate span').html('0 Tests');
    });
  }

};

module.exports = function(){
  return experiment_previewer;
};

