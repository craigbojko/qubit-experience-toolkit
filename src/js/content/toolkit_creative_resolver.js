var $ = require('jquery')

module.exports = function createCreativeResolver () {
  var creative_resolver = {
    initialised: false,
    toolkit: null,
    creativeData: {},
    experimentData: {},

    init: function (t) {
      if (!t) return
      var _self = this
      this.toolkit = t

      _self.initialised = true
    },

    getExperimentAndCreative: function (e_id, callback) {
      Promise.all([
        this.requestExperimentDataById(e_id, callback),
        this.requestCreativesByEperimentId(e_id, callback)
      ])
        .then(
          function (data) {
            this.returnAllData(data, e_id, callback)
          }.bind(this),
          function (e) {
            this.returnError(e, e_id, callback)
          }.bind(this)
      )
    },

    getExperiment: function (e_id, callback) {
      if (this.experimentData && this.experimentData[e_id]) {
        this.returnCreativeData(this.experimentData[e_id], e_id, callback)
        return this.experimentData.e_id
      } else {
        return this.requestExperimentDataById(e_id)
          .then(
            function (data) {
              this.returnExperimentData(data, e_id, callback)
            }.bind(this),
            function (e) {
              this.returnError(e, e_id, callback)
            }.bind(this)
        )
      }
    },

    getCreative: function (e_id, callback) {
      if (this.creativeData && this.creativeData[e_id]) {
        this.returnCreativeData(this.creativeData[e_id], e_id, callback)
        return this.creativeData.e_id
      } else {
        return this.requestCreativesByEperimentId(e_id)
          .then(
            function (data) {
              this.returnCreativeData(data, e_id, callback)
            }.bind(this),
            function (e) {
              this.returnError(e, e_id, callback)
            }.bind(this)
        )
      }
    },

    requestCreativesByEperimentId: function (e_id) {
      return new Promise(function (resolve, reject) {
        $.ajax({
          url: 'https://dashboard.qubitproducts.com/p/' + this.toolkit.clientId + '/smart_serve/experiments/' + e_id + '/recent_iterations/draft/variations'
        }).done(function (data) {
          resolve(data)
        }).fail(function (error) {
          reject(error)
        })
      }.bind(this))
    },

    requestExperimentDataById: function (e_id) {
      return new Promise(function (resolve, reject) {
        $.ajax({
          url: 'https://dashboard.qubitproducts.com/p/' + this.toolkit.clientId + '/smart_serve/experiments/' + e_id
        }).done(function (data) {
          resolve(data)
        }).fail(function (error) {
          reject(error)
        })
      }.bind(this))
    },

    returnAllData: function (data, experimentId, callback) {
      if (this.toolkit.DEBUG) this.toolkit.c.log('EXPERIMENT & CREATIVE RESP: ', data)
      // this.creativeData[experimentId] = data
      callback(data)
    },

    returnCreativeData: function (data, experimentId, callback) {
      if (this.toolkit.DEBUG) this.toolkit.c.log('CREATIVE RESP: ', data)
      this.creativeData[experimentId] = data
      callback(data)
    },

    returnExperimentData: function (data, experimentId, callback) {
      if (this.toolkit.DEBUG) this.toolkit.c.log('EXPERIMENT RESP: ', data)
      this.experimentData[experimentId] = data
      callback(data)
    },

    returnError: function (error, experimentId, callback) {
      this.toolkit.c.error('PROMISE FAIL: ', experimentId, error)
    }
  }

  return creative_resolver
}
