var $ = require('jquery')
var parseECData = require('./parse_ec_data')
var storage = require('../common/storage')
var cookie = require('../common/cookie')
var logger = require('../common/logger')()
var templates = {
  main: require('../../templates/content/main.html'),
  dtLayer: require('../../templates/content/dtLayer.html'),
  expInfo: require('../../templates/content/expInfo.html')
}
var api = {
  snippets: require('./toolkit_snippets')(),
  eventRecorder: require('./toolkit_event_recorder')(),
  creativeResolver: require('./toolkit_creative_resolver')(),
  experimentPreviewer: require('./toolkit_experiment_previewer')()
}

var initialised = false
var toolbarReady = false;

function DeliverToolkit (chrome) {
  this.VERSION = '1.0.0'
  this.CHROME_VERSION = '-'

  this.DEBUG = false || /qbDT_debug/.test(document.cookie)
  this.chromeInstance = chrome
  this.smartservePreview = false
  this.clientId = -1
  this.data = {}
  this.experiments = {}
}

DeliverToolkit.prototype.init = function () {
  var self = this

  if (initialised) {
    return
  }

  // Pong event setup - early as possible
  if (storage.loadFromStorage('uv_logger') === true) {
    api.eventRecorder.initPongListener()
  }
  this.chromeInstance.runtime.sendMessage({type: 'setupPongCapture'}, function (response) {
    if (self.DEBUG) {
      logger.info(response)
    }
  })

  // Start listening for UV updates
  this.listenForUVUpdates()

  this.bindDocumentEvents()
}

DeliverToolkit.prototype.bindDocumentEvents = function () {
  // Look for UV once DOM parsed
  document.addEventListener('DOMContentLoaded', this.injectUVConnectionScript.bind(this), false)

  // Listen to all sources and detect Qubit Smartserve file
  document.addEventListener('load', this.onScriptLoad.bind(this), true)
}

DeliverToolkit.prototype.unbindDocumentEvents = function () {
  document.removeEventListener('DOMContentLoaded')
  document.removeEventListener('load')
}

DeliverToolkit.prototype.onScriptLoad = function (event) {
  var src = event.target.src

  if (initialised || !src || src === '') {
    return
  }

  src = src.toLowerCase()

  if (src.indexOf('//dd6zx4ibq538k.cloudfront.net/smartserve') >= 0 || src.indexOf('smartserve.s3.amazonaws.com/smartserve') >= 0) {
    var cdnId = /dd6zx4ibq538k\.cloudfront\.net\/smartserve-\d+/.test(src) && src.match('dd6zx4ibq538k.cloudfront.net/smartserve-([0-9]{4})+')[1]
    var s3Id = /smartserve\.s3\.amazonaws\.com\/smartserve-\d+/.test(src) && src.match('smartserve.s3.amazonaws.com/smartserve-([0-9]{4})+')[1]

    this.clientId = cdnId || s3Id
    if (this.DEBUG) {
      logger.info('DELIVER LOADED: ', this.clientId)
    }
    if (isPreviewMode()) {
      this.smartservePreview = true
    } else {
      this.getDashboardManifest()
      initialised = true
    }
  }

  if (/smartserve\.s3\.amazonaws\.com\/smartserve-([0-9]{4})+-preview/.test(src)) {
    if (this.DEBUG) {
      logger.log('DELIVER PREVIEW LOADED: ', this.clientId)
    }
    this.getDashboardManifest()
    initialised = true
  }
}

DeliverToolkit.prototype.getDashboardManifest = function () {
  $.ajax({
    url: '//dashboard.qubitproducts.com/p/' + this.clientId + '/smart_serve/experiments/',
    cache: false,
    success: onSuccess.bind(this),
    fail: onFailure.bind(this)
  })

  function onSuccess (data) {
    var self = this
    if (this.DEBUG) {
      logger.info('DASHBOARD MANIFEST: ', data)
    }
    this.data = data.reverse()
    $(function () {
      self.initToolbar()
    })
  }

  function onFailure (e) {
    logger.error('Error retreiving Dashboard manifest data: ', e)
  }
}

DeliverToolkit.prototype.initToolbar = function () {
  logger.logRaw('%c Qubit Deliver Toolkit', 'color: #D86D39; font-size: 16pt;')
  logger.log('running...')
  
  this.$el = this.buildToolbar()
  this.$el.appendTo('body')
  toolbarReady = true;

  api.snippets.init(this)
  api.creativeResolver.init(this)
  api.eventRecorder.init(this)
  api.experimentPreviewer.init(this)

  this.render()
}

DeliverToolkit.prototype.buildToolbar = function () {
  var $html = $(templates.main())
  var $activations = $html.find('#DeliverToolbarLayerActivations')
  var $previewer = $html.find('#DeliverPreviewer')
  var $layers = $html.find('#DeliverToolbarLayers')

  $html.find('.dashboard').click(function (e) {
    window.open('//dashboard.qubitproducts.com/p/' + this.clientId + '/')
  }.bind(this))

  $activations.click(function (e) {
    if ($layers.hasClass('open') && $activations.hasClass('active')) {
      this.resetLayers()
    } else if ($layers.hasClass('open') && $previewer.hasClass('active')) {
      this.resetLayers()
      this.listToolbarLayers()
      $activations.addClass('active')
    } else {
      this.listToolbarLayers()
      $activations.addClass('active')
    }
  }.bind(this))

  $html.find('.toolbarMinimise').click(function (e) {
    $html.toggleClass('DT-minimise')
    $html.find('#DeliverToolbarWrapper').removeClass('expanded')
    $html.find('#DeliverToolbarInfo').removeClass('expanded')
    $html.find('.DT-Layer').removeClass('open')
    this.currentlyOpenExperiment = -1
  }.bind(this))

  return $html
}

DeliverToolkit.prototype.listToolbarLayers = function () {
  var self = this
  var $listWrapper = this.$el.find('#DeliverToolbarLayers')
  $listWrapper.empty()

  $(this.data)
    .each(function (index) {
      var odd = (index % 2 === 0) ? 'even' : 'odd'
      var $layer = $(templates.dtLayer({
        odd: odd,
        id: this.id,
        name: this.name
      }))
      $layer.click(function (e) {
        var $this = $(this)
        var id = $this.attr('data-id')
        if (api.creativeResolver.initialised === true) {
          self.openExperimentInfo(id)
        }
      })

      $listWrapper.append($layer)
    })

  $listWrapper.addClass('open')
  this.indicateActiveExperiments()
}

DeliverToolkit.prototype.resetLayers = function () {
  var $layers = this.$el.find('#DeliverToolbarLayers')

  if ($layers.hasClass('open')) {
    this.closeExperimentInfo()
    $layers.removeClass('open').empty()
    this.$el.find('#DeliverToolbarLayerActivations').removeClass('active')
    this.$el.find('#DeliverPreviewer').removeClass('active')
    this.$el.find('#DeliverToolbarLayerPreviews').removeClass('active')
  }
}

DeliverToolkit.prototype.indicateActiveExperiments = function () {
  var uv = this.uv || {}

  if (uv && uv.qb && uv.qb.qb_etc_data && (!this.smartservePreview || this.smartservePreview === null)) {
    $.each(uv.qb.qb_etc_data, function (index) {
      var experimentId = this.e
      $('div[data-id="' + experimentId + '"]').find('.indicator').addClass('active')
    })
  } else if (this.smartservePreview === true && this.previewCreatives) {
    var self = this
    $.each(this.previewCreatives, function (index) {
      var experimentId = self.ss_opts[0].creatives[this].e_id
      $('div[data-id="' + experimentId + '"]').find('.indicator').addClass('active')
    })
  }
}

DeliverToolkit.prototype.openExperimentInfo = function (experimentId) {
  if (this.currentlyOpenExperiment === experimentId) {
    this.closeExperimentInfo()
  } else {
    api.creativeResolver.getExperimentAndCreative(experimentId, function (data) {
      if (this.DEBUG) {
        logger.info('EC DATA: ', data)
      }
      this.renderExperimentInfo(data)
    }.bind(this))

    this.currentlyOpenExperiment = experimentId
    this.$el.find('#DeliverToolbarWrapper').addClass('expanded')
    this.$el.find('#DeliverToolbarInfo').addClass('expanded')
    this.$el.find('#DeliverToolbarInfo .loadingBar').show()
    this.$el.find('.DT-Layer').removeClass('open')
    this.$el.find('.DT-Layer[data-id="' + experimentId + '"]').addClass('open')
  }
}

DeliverToolkit.prototype.closeExperimentInfo = function () {
  this.$el.find('#DeliverToolbarWrapper').removeClass('expanded')
  this.$el.find('#DeliverToolbarInfo').removeClass('expanded')
  this.currentlyOpenExperiment = -1
  this.$el.find('.DT-Layer').removeClass('open')
}

DeliverToolkit.prototype.renderExperimentInfo = function (data) {
  var $infoBar = this.$el.find('#DeliverToolbarInfo')
  var model = parseECData(data, {
    isPreview: this.smartservePreview
  })

  if (this.DEBUG) {
    logger.log('EC MODEL: ', model)
  }
  $infoBar.find('.loadingBar').hide()

  var $html = $(templates.expInfo({
    name: model.experiment.name,
    status: model.status,
    iteration: ((model.hasBeenPublished === true) ? model.experiment.recent_iterations.published.name : 'Draft'),
    split: model.split,
    probability: model.prob,
    bucket: model.bucket,
    date_creation: new Date(model.experiment.created_at),
    date_last_publish: (model.last_published && new Date(model.last_published)) || 'Not yet published',
    links: {
      previews: {},
      dashboard: ''
    },
    DT_VERSION: this.VERSION,
    CHROME_VERSION: this.CHROME_VERSION
  }))

  $infoBar.find('.inject').html($html)
}

DeliverToolkit.prototype.injectUVConnectionScript = function () {
  var fileSrc = this.chromeInstance.extension.getURL('/js/content/deliver_toolkit_comms.js')
  var head = document.getElementsByTagName('head')[0]
  var s = document.createElement('script')
  s.setAttribute('type', 'text/javascript')
  s.setAttribute('src', fileSrc)
  s.addEventListener('load', function (event) {
    window.postMessage({
      type: 'uv_initial_request',
      data: {}
    }, '*')

    window.postMessage({
      type: 'ss_creative_request',
      data: {}
    }, '*')
  }, true)

  window.addEventListener('message', function (event) {
    if (event.data.type === 'uv_initial_response' || event.data.type === 'ss_creative_response') {
      if (this.DEBUG) {
        logger.group('DELIVER TOOLKIT: COMMS_RESPONSE: ')
      }
      try {
        if (event.data.type === 'uv_initial_response') {
          this.uv = JSON.parse(event.data.data)
        } else if (event.data.type === 'ss_creative_response') {
          this.ss_opts = JSON.parse(event.data.data)
          this.ss_domain = this.ss_opts[0].domain
        }
        this.render()
      } catch (e) {
        logger.error('CANNOT PARSE COMMS_INITIAL_RESPONSE: ', e)
      }
      if (this.DEBUG) {
        logger.groupEnd()
      }
    }
  }.bind(this))

  head.appendChild(s)
}

DeliverToolkit.prototype.requestUVUpdate = function () {
  window.postMessage({
    type: 'uv_update_request',
    data: {}
  }, '*')
}

DeliverToolkit.prototype.listenForUVUpdates = function () {
  window.addEventListener('message', function (event) {
    if (event.data.type === 'uv_update_response') {
      if (this.DEBUG) {
        logger.group('DELIVER TOOLKIT: UV_UPDATE_RESPONSE: ')
      }
      if (this.DEBUG) {
        logger.info(event.data.data)
      }
      try {
        this.uv = JSON.parse(event.data.data)
        if (this.uv && this.uv.qb && this.uv.qb.qb_etc_data) {
          this.indicateActiveExperiments()
        }
      } catch (e) {
        logger.error('CANNOT PARSE UV_UPDATE_RESPONSE: ', e)
      }
      if (this.DEBUG) {
        logger.groupEnd()
      }
    }
  }.bind(this))
}

DeliverToolkit.prototype.render = function () {
  if (!toolbarReady) {
    return
  }

  if (this.uv && this.uv.qb && this.uv.qb.qb_etc_data && this.ss_opts && (!this.smartservePreview || this.smartservePreview === null)) {
    this.indicateActiveExperiments()
  } else if (this.smartservePreview === true && this.ss_opts) {
    var urlCid, cookieCid, cookieCids, etcCookie
    try {
      urlCid = document.URL.match(/etcForceCreative=([0-9].*)/)
      if (urlCid) {
        urlCid = urlCid[1]
      }

      etcCookie = cookie.getCookie('etcForceCreative')

      if (etcCookie !== null) {
        cookieCid = etcCookie.match(/\[([0-9].*)\]/)[1]
        cookieCids = cookieCid.split(',')
      }

      if (urlCid) {
        this.previewCreatives = []
        this.previewCreatives.push(parseInt(urlCid, 10))
      } else {
        var self = this
        self.previewCreatives = []
        $.each(cookieCids, function (index) {
          self.previewCreatives.push(parseInt(this, 10))
        })
      }
      this.indicateActiveExperiments()
    } catch (e) {
      logger.error('Error obtaining Experiment preview ID: ', e)
    }
  }
}

function isPreviewMode () {
  return /smartserve_preview=/.test(document.URL) || /smartserve_preview=/.test(document.cookie)
}

// Return DeliverToolkit for commonjs
module.exports = DeliverToolkit
