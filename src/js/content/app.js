var chrome = window.chrome
var ToolkitCore = require('./toolkit_core')

chrome.runtime.sendMessage({type: 'request_init'}, function (response) {
  if (response === 'response_init') {
    var deliverToolkit = new ToolkitCore(chrome)
    deliverToolkit.init()
    window.deliverToolkit = deliverToolkit
  }
})
