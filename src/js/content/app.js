var chrome = window.chrome
var ToolkitCore = require('./toolkit_core.js')
var deliverToolkit

chrome.runtime.sendMessage({type: 'request_init'}, function (response) {
  if (response === 'response_init') {
    // console.info("Starting Deliver Toolkit...", response)
    deliverToolkit = new ToolkitCore(chrome)
    deliverToolkit.init()
  }
})
