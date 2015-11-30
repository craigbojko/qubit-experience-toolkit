;(function () {
  var debug = false

  initToolkitComms()

  function initToolkitComms () {
    if (/qbDT_debug/.test(document.cookie)) {
      debug = true
    }
    if (debug) {
      console.log('COMM SCRIPTS LOADED!')
    }
    window.addEventListener('message', receiveMessage)

    // Enable uv_listener
    window.uv_listener = window.uv_listener || []
    window.uv_listener.push(['on', 'change:qb', uvUpdate])
  }

  function receiveMessage (event) {
    var type = event.data.type
    switch (type) {
      case ('uv_initial_request'):
        if (debug) console.log('UV REQUEST...')
        uvRequest()
        break
      case ('uv_update_request'):
        if (debug) console.log('UV UPDATE...')
        uvUpdate()
        break
      case ('ss_creative_request'):
        if (debug) console.log('CREATIVE ID REQUEST...')
        creativeIds()
        break
      default:
        break
    }
  }

  function sendMessage (type, data) {
    window.postMessage({
      type: type,
      data: data
    }, '*')
  }

  function uvRequest () {
    if (window.universal_variable) { // && window.universal_variable.page && window.universal_variable.qb){
      if (debug) console.log('UV Initialised')
      sendMessage('uv_initial_response', JSON.stringify(window.universal_variable))
    } else {
      if (debug) console.log('POLLING FOR UV...')
      setTimeout(uvRequest, 1000)
    }
  }

  function uvUpdate () {
    if (window.universal_variable) { // && window.universal_variable.page && window.universal_variable.qb){
      if (debug) console.log('UV QB Change')
      sendMessage('uv_update_response', JSON.stringify(window.universal_variable))
    } else {
      if (debug) console.log('POLLING FOR UV...')
      setTimeout(uvUpdate, 1000)
    }
  }

  function creativeIds () {
    if (window._qb_ss) {
      if (debug) console.log('SS CREATIVE IDS')
      sendMessage('ss_creative_response', JSON.stringify(window._qb_ss))
    } else {
      if (debug) console.log('POLLING FOR CREATIVE IDS...')
      setTimeout(creativeIds, 1000)
    }
  }
})()
