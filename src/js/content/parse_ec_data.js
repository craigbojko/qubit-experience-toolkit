var $ = require('jquery')

module.exports = function parseECData (data, options) {
  options = options || {}
  var variations = []
  var controlMap = {
    0.5: 'Equal Split',
    0.05: 'Supervised Mode',
    0: '100% Layer',
    0.8: 'Pilot Mode'
  }

  var model = {
    hasBeenPublished: false,
    experiment: data[0],
    creative: data[1],
    split: '',
    prob: '',
    bucket: 'Not active/Not segmented'
  }

  $.each(data[1], function (index, variation) {
    if (variation.is_control !== true) {
      variations.push(variation)
    }
  })

  if (this.uv && this.uv.qb && this.uv.qb.qb_etc_data && this.uv.qb.qb_etc_data) {
    $.each(this.uv.qb.qb_etc_data, function (index, variation) {
      if (variation.e && variation.e === data[0].id) {
        model.qb_etc_data = variation
        model.prob = variation.p
      }
    })
  }

  if (data[0].recent_iterations.published) {
    model.hasBeenPublished = true
  }

  if (data[0].recent_iterations && data[0].recent_iterations.published && data[0].recent_iterations.published.state) {
    model.status = data[0].recent_iterations.published.state
  } else if (data[0].recent_iterations && !data[0].recent_iterations.published) {
    model.status = 'In Development'
  } else {
    model.status = 'Draft'
  }

  if (/published/i.test(model.status)) {
    model.control_size = data[0].recent_iterations.published.control_size
    model.last_published = data[0].recent_iterations.published.last_published_at
    model.split = controlMap[model.control_size]
  } else {
    model.control_size = data[0].recent_iterations.draft.control_size
    model.split = controlMap[model.control_size]
  }

  if (model.prob && model.prob !== '') {
    var inControl = (1 - model.prob) <= model.control_size
    if (inControl) {
      model.bucket = 'Control'
    } else {
      model.bucket = 'Variant'
    }
  } else if (options.isPreview === true) {
    model.prob = 'Preview Mode'
    model.bucket = 'Preview Mode'
  }

  return model
}
