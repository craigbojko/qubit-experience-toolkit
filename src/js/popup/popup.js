var $ = require('jquery')

;(function ($, c) {
  function DeliverToolkitPopup ($, c) {
    this.$ = $
    this.$el = ''
    this.chrome = c

    if (!this.chrome) {
      throw new Error('No chrome instance found.')
    }
  }

  DeliverToolkitPopup.prototype.disableExtension = function (cb) {
    this.chrome.runtime.sendMessage({type: 'request_disable'}, function (response) {
      if (response === 'response_disable') {
        console.info('Deliver Toolkit - Disabled.')
        if (cb) cb()
      }
    })
  }

  DeliverToolkitPopup.prototype.enableExtension = function (cb) {
    this.chrome.runtime.sendMessage({type: 'request_enable'}, function (response) {
      if (response === 'response_enable') {
        console.info('Deliver Toolkit - Enabled.')
        if (cb) cb()
      }
    })
  }

  DeliverToolkitPopup.prototype.extensionStatus = function (cb) {
    this.chrome.runtime.sendMessage({type: 'request_status'}, function (response) {
      if (response.type === 'response_status') {
        console.info('Deliver Toolkit: Enabled:: ', response)
        if (cb) cb(response)
      }
    })
  }

  DeliverToolkitPopup.prototype.reloadWindow = function () {
    this.chrome.runtime.sendMessage({type: 'request_reload'}, function (response) {
      if (response.type === 'response_reload') {
        console.info('Deliver Toolkit: RELOADING WINDOW...')
      }
    })
  }

  DeliverToolkitPopup.prototype.init = function () {
    var _self = this
    var $el = $('body span.status')

    this.extensionStatus(function (response) {
      var status = response.status
      if (!status) {
        _self.enableExtension(function () {})
      }

      if (status === 'true') {
        $el.html('On').addClass('enabled')
      } else {
        $el.html('Off').removeClass('enabled')
      }

      $el.on('click', function () {
        var $this = $(this)
        $this.toggleClass('enabled')

        if ($this.hasClass('enabled')) {
          _self.enableExtension(function () {})
          $this.html('On')
        } else {
          _self.disableExtension(function () {})
          $this.html('Off')
        }
        _self.reloadWindow()
      })
    })
  }

  var popup = new DeliverToolkitPopup($, c)
  popup.init()
})($, window.chrome)
