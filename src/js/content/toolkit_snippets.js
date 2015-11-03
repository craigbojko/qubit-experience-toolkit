var $ = require('jquery');

var toolkit_snippets = {

  toolkit : null,
  snippetArr : [],
  debugSnippets : [
    {
      name : "Inject Opentag Debug",
      code : function(){
          var rand = Math.round(Math.random()*10000000000000);
          var e=document.createElement('script');
          e.src='https://s3-eu-west-1.amazonaws.com/qubit-etc/bookmarklets/opentag-inject-debug.js?'+rand;
          document.getElementsByTagName('head')[0].appendChild(e);
      }
    },
    { name : "Show Exit Feedback", code : function(){alert("SNIPPET2");} },
    { name : "Validate UV", code : function(){alert("SNIPPET3");} },
    { name : "View Data Layers", code : function(){alert("SNIPPET4");} },
    { name : "ContentEditable", code : function(){alert("SNIPPET5");} }
  ],

  init : function(t){
    if( !t ) return;
    var _self = this;
    this.toolkit = t;
    this.getSnippets(function(snippets){
      _self.buildHTML(snippets);
    });
  },

  getSnippets : function(cb){
    this.snippetArr = this.debugSnippets; // TODO pull from repo
    cb(this.snippetArr);
  },

  buildHTML : function(snippetArr){
    var _self = this;
    var $html = $([
      "<div id='DeliverSnippets'>",
        "<div id='DeliverSnippetsWrapper'></div>",
      "</div>" // END main wrapper
    ].join(""));

    var $htmlWrap = $html.find('#DeliverSnippetsWrapper');
    if( snippetArr && snippetArr.length ){
      $.each( snippetArr, function(index){
        $htmlWrap.append(["<div class='snippetCont' data-snippet-index='"+index+"'>",
                            "<span>"+this.name+"</span>",
                          "</div>"].join(''));
      });
      $htmlWrap.find('.snippetCont').each(function(){
        var index = $(this).attr('data-snippet-index');
        $(this).click(function(e){
          _self.snippetArr[index].code();
        });
      });
    }

    var $metaCont = this.toolkit.$el.find('#DeliverToolbarMeta');
    $metaCont.append($html);
    // $metaCont.animate({height : '30%'});
    // this.toolkit.$el.find('#DeliverToolbarLayers').height('64%');
    return this.toolkit.$el.find('#DeliverToolbarMeta');
  }

};

module.exports = function(){
  return toolkit_snippets;
};