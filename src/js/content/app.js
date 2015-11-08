var c = chrome;
var $ = require('jquery');

// var storage = require('../common/storage');
// var status = storage.loadFromStorage('ToolkitStatus');
// if( status === false ){
//   return; // Disabled - return
// }
// var hogan = require('hogan.js-template');

var ToolkitCore = require('./toolkit_core.js');
var deliverToolkit;

chrome.runtime.sendMessage({type: "request_init"}, function(response) {
  if (response === "response_init"){
    console.info("Starting Deliver Toolkit...", response);
    deliverToolkit = new ToolkitCore(c);
    deliverToolkit.init();
  }
});
