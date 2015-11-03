// Background script file
// UV Event Tracking
(function(debug){

	function UVTracker(){
		this.runtimeTracking = false;
		this.tabTracking = [];
	}

	UVTracker.prototype.capturePONGS = function(sender, debug){
		'use strict';
		chrome.webRequest.onBeforeRequest.addListener(function(details) {
			if(debug){
				console.log("PONG REQUEST");
				console.log(details);
			}

			var reqBody = "";
			if( details.requestBody ){
				reqBody = String.fromCharCode.apply(null, new Uint8Array(details.requestBody.raw[0].bytes));
			}

			chrome.tabs.sendMessage(sender.tab.id, {
					type: "pong_event",
					data: details,
					postData: ((reqBody !== '' ) ? reqBody : null)
				},
				function(response) {
					console.log("LOG RESPONSE TAB "+sender.tab.id+" : ",response);
			});
		}, {
			urls: ['*://pong.qubitproducts.com/*']
		}, ['blocking', 'requestBody']);
	};

	UVTracker.prototype.init = function(){
		var _self = this;
		if( _self.runtimeTracking === false ){
			chrome.runtime.onMessage.addListener(
				function(request, sender, sendResponse) {
					if( request.type == "setupPongCapture" && _self.tabTracking[sender.tab.id] !== true ){
						_self.capturePONGS(sender, debug);
						_self.tabTracking[sender.tab.id] = true;
						sendResponse("PONG CAPTURE ENABLED");
					}
					else if( request.type == "setupPongCapture" && _self.tabTracking[sender.tab.id] === true ){
						sendResponse("PONG CAPTURE ALREADY ENABLED - relaying...");
					}
				}
			);
			runtimeTracking = true;
		}
	};

	var uvTracker = new UVTracker();
	uvTracker.init();

})(true);


(function () {

	var loadFromStorage = function(key){
	  var storage = {};
	  try{
	    storage = JSON.parse(window.localStorage.getItem('__qubitDeliverToolkit')) || {};
	    if( storage && storage[key] ){
	      return storage[key];
	    }
	    else {
	      return null;
	    }
	  } catch(e){
	    console.error('Cannot initialise storage module.');
	  }
	};

	var saveToStorage = function(key, obj){
	  var storage = {};
	  try{
	    storage = JSON.parse(window.localStorage.getItem('__qubitDeliverToolkit')) || {};
	    storage[key] = obj;
	    window.localStorage.setItem('__qubitDeliverToolkit', JSON.stringify(storage));
	  } catch(e){
	    console.error('Cannot initialise storage module.');
	  }
	};

	var reloadCurrentTab = function () {
		chrome.tabs.query(
		  {currentWindow: true, active : true},
		  function(tabArray){
				if (tabArray.length) {
					setTimeout(function(){
						chrome.tabs.reload(tabArray[0].id);
					}, 250);
				}
		  }
		)
	};

	chrome.runtime.onMessage.addListener(
		function (request, sender, sendResponse) {
			if (request.type === 'request_init') {
				if( !loadFromStorage('toolkit_enable') ){
					saveToStorage('toolkit_enable', 'true');
				}

				// Determine to load
				enable = (loadFromStorage('toolkit_enable') === 'true') ? true : false;
				if (enable) {
					console.log("INITIALISATION REQUESTED: ENABLED:: ", enable);
					sendResponse('response_init');
				}
			}
		}
	);

/*
    PlatformExtension.prototype.setRunningTimerIcon = function(running) {
      var state;
      state = running ? "on" : "off";
      chrome.browserAction.setIcon({
        path: {
          "19": "images/h-toolbar-" + state + "@19px.png",
          "38": "images/h-toolbar-" + state + "@38px.png"
        }
      });
      return chrome.browserAction.setTitle({
        title: running ? "View the running Harvest timer" : "Start a Harvest timer"
      });
    };


*/

	chrome.runtime.onMessage.addListener(
		function (request, sender, sendResponse) {
			if (request.type === 'request_disable') {
				saveToStorage('toolkit_enable', 'false');
				sendResponse('response_disable');
			}
			else if (request.type === 'request_enable') {
				saveToStorage('toolkit_enable', 'true');
				sendResponse('response_enable');
			}
			else if (request.type === 'request_status') {
				var s = loadFromStorage('toolkit_enable');
				sendResponse({type: 'response_status', status: s});
			}
			else if (request.type === 'request_reload') {
				sendResponse('response_reload');
				reloadCurrentTab();
			}
		}
	);

})();