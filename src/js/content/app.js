var c = chrome;
var $ = require('jquery');

// var storage = require('../common/toolkit_storage');
// var status = storage.loadFromStorage('ToolkitStatus');
// if( status === false ){
//   return; // Disabled - return
// }
var hogan = require('hogan.js-template');

var ToolkitCore = require('./toolkit_core.js');
var deliverToolkit;

var ToolkitSnippets = require('./toolkit_snippets.js');
var ToolkitEventRecorder = require('./toolkit_event_recorder.js');
var ToolkitCreativeResolver = require('./toolkit_creative_resolver.js');
var ToolkitPreviewer = require('./toolkit_experiment_previewer.js');

var toolkitLibraries = {
  snippets : ToolkitSnippets(),
  event_recorder : ToolkitEventRecorder(),
  creative_resolver : ToolkitCreativeResolver(),
  experiment_previewer : ToolkitPreviewer()
};

chrome.runtime.sendMessage({type: "request_init"}, function(response) {
  if (response === "response_init"){
    console.info("Starting Deliver Toolkit...", response);
    deliverToolkit = new ToolkitCore(c, toolkitLibraries);
    deliverToolkit.init();
  }
});

// chrome.runtime.onMessage.addListener(
//   function(request, sender, sendResponse) {
//     if (request === "content_request_reload"){
//       sendResponse({reload: true});
//       console.log("WINDOW RELOAD");
//       // window.location.reload();
//     }
//   }
// );