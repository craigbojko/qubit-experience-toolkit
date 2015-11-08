var $ = require('jquery');
var storage = require('../common/storage');
var splitURL = require('../common/split_url');

var event_recorder = {

  initialised : false,
  pongInitialised : false,
  enableLogging : false,
  toolkit : null,
  $el : '',

  init : function(t){
    if( !t ) return;
    var _self = this;
    this.toolkit = t;
    _self.buildHTML();
    this.initialised = true;
  },

  buildHTML : function(snippetArr){
    var _self = this;
    var $html = $("<div id='DeliverEventRecorder'></div>")
                  .append(["<div class='snippetCont'>",
                    "<span>Record UV Events</span>",
                  "</div>"].join('')).click(function(e){
                    var uv_logger = storage.loadFromStorage('uv_logger') || false;
                    storage.saveToStorage('uv_logger', !uv_logger);
                    _self.updateUI(!uv_logger);
                    _self.initPongListener();
                  });

    var $metaCont = _self.toolkit.$el.find('#DeliverToolbarMeta');
    var uv_logger = storage.loadFromStorage('uv_logger') || false;

    $metaCont.append($html);
    // $metaCont.animate({height : '30%'});

    _self.$el = $html;
    _self.updateUI(uv_logger);
    // _self.toolkit.$el.find('#DeliverToolbarLayers').height('64%');
    return _self.toolkit.$el.find('#DeliverToolbarMeta');
  },

  updateUI : function(logging){
    if(logging){
      this.$el.find('span').addClass('recording');
      this.enableLogging = true;
    }
    else{
      this.$el.find('span').removeClass('recording');
      this.enableLogging = false;
    }
  },

  initPongListener : function(){
    if( !this.pongInitialised ){
      this.pongListener();
      this.pongInitialised = true;
      this.enableLogging = true;
      return this.pongInitialised;
    }
    return !this.pongInitialised;
  },

  pongListener : function(){
    this.toolkit.chromeInstance.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        if (request.type == "pong_event"){
          var uv_event = false;
          var reqBody = {};

          if( request.postData && request.postData !== null ){
            try{
              reqBody = JSON.parse(request.postData);
              if( reqBody.hasOwnProperty('events') ){
                uv_event = true;
              }
            }
            catch(e){
              console.error("ERROR parsing request body: ", e);
            }
          }

          if( this.enableLogging === true ){
            console.group("PONG EVENT %s", (uv_event) ? ": UV EVENT" : "");
            console.log("REQUEST RAW: ", request);

            var url = splitURL(decodeURIComponent(request.data.url));
            //console.log(url);
            //console.table([url]);

            if( uv_event ){
              var event_data = {};
              try{
                event_data = reqBody.events[0];
                console.table([event_data]);
              }
              catch(e){
                console.error("ERROR parsing uv event data: ", e);
              }
            }
            else{
              console.table(reqBody);
            }
            console.groupEnd();
          }

          sendResponse({logged: true});
        }
      }.bind(this)
    );
  }

};

module.exports = function(){
  return event_recorder;
};
