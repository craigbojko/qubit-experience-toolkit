var $ = require('jquery')
var logger = require('../common/logger')()

module.exports = function createCreativeResolver () {
  var CreativeResolver = {
    initialised: false,
    toolkit: null,
    creativeData: {},
    experimentData: {},

    init: function (t) {
      if (!t) {
        return
      }
      this.toolkit = t
      this.initialised = true
      return this;
    },

    getExperimentAndCreative: function (eId, callback) {
      Promise.all([
        this.requestExperimentDataById(eId, callback),
        this.requestCreativesByEperimentId(eId, callback)
      ])
        .then(
          function (data) {
            this.returnAllData(data, eId, callback)
          }.bind(this),
          function (e) {
            this.returnError(e, eId, callback)
          }.bind(this)
      )
    },

    getExperiment: function (eId, callback) {
      if (this.experimentData && this.experimentData[eId]) {
        this.returnCreativeData(this.experimentData[eId], eId, callback)
        return this.experimentData.eId
      } else {
        return this.requestExperimentDataById(eId)
          .then(
            function (data) {
              this.returnExperimentData(data, eId, callback)
            }.bind(this),
            function (e) {
              this.returnError(e, eId, callback)
            }.bind(this)
        )
      }
    },

    getCreative: function (eId, callback) {
      if (this.creativeData && this.creativeData[eId]) {
        this.returnCreativeData(this.creativeData[eId], eId, callback)
        return this.creativeData.eId
      } else {
        return this.requestCreativesByEperimentId(eId)
          .then(
            function (data) {
              this.returnCreativeData(data, eId, callback)
            }.bind(this),
            function (e) {
              this.returnError(e, eId, callback)
            }.bind(this)
        )
      }
    },

    requestCreativesByEperimentId: function (eId) {
      return new Promise(function (resolve, reject) {
        $.ajax({
          url: 'https://dashboard.qubitproducts.com/p/' + this.toolkit.clientId + '/smart_serve/experiments/' + eId + '/recent_iterations/draft/variations?embed=recent_iterations'
        }).done(function (data) {
          resolve(data)
        }).fail(function (error) {
          reject(error)
        })
      }.bind(this))
    },

    requestExperimentDataById: function (eId) {
      return new Promise(function (resolve, reject) {
        $.ajax({
          url: 'https://dashboard.qubitproducts.com/p/' + this.toolkit.clientId + '/smart_serve/experiments/' + eId + '?embed=recent_iterations'
        }).done(function (data) {
          resolve(data)
        }).fail(function (error) {
          reject(error)
        })
      }.bind(this))
    },

    returnAllData: function (data, experimentId, callback) {
      if (this.toolkit.DEBUG) {
        logger.log('EXPERIMENT & CREATIVE RESP: ', data)
      }
      // this.creativeData[experimentId] = data
      callback(data)
    },

    returnCreativeData: function (data, experimentId, callback) {
      if (this.toolkit.DEBUG) {
        logger.log('CREATIVE RESP: ', data)
      }
      this.creativeData[experimentId] = data
      callback(data)
    },

    returnExperimentData: function (data, experimentId, callback) {
      if (this.toolkit.DEBUG) {
        logger.log('EXPERIMENT RESP: ', data)
      }
      this.experimentData[experimentId] = data
      callback(data)
    },

    returnError: function (error, experimentId, callback) {
      logger.error('PROMISE FAIL: ', experimentId, error)
    }
  }
  return CreativeResolver
}
