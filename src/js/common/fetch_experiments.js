var $ = require('jquery')

function url (clientId) {
  return '//dashboard.qubitproducts.com/p/' + clientId + '/smart_serve/experiments/'
}

function fetchExperiments (clientId) {
  return $.ajax({
    url: url(clientId),
    cache: false
  }).then(function (data) {
    return parse(data)
  })
}

function parse (data) {
  return data.reverse()
}

module.exports = fetchExperiments
