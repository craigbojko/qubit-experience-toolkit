module.exports = function logger () {
  return {
    logRaw: function (msg, args) {
      console.log(msg, args)
    },
    table: function (msg, args) {
      console.table(msg, args)
    },
    log: function (msg, args) {
      console.group('Qubit Deliver Toolkit::' + msg)
      if (args) {
        console.log(args)
      }
      console.groupEnd()
    },
    info: function (msg, args) {
      console.group('Qubit Deliver Toolkit::' + msg)
      if (args) {
        console.info(args)
      }
      console.groupEnd()
    },
    warn: function (msg, args) {
      console.group('Qubit Deliver Toolkit::' + msg)
      if (args) {
        console.warn(args)
      }
      console.groupEnd()
    },
    error: function (msg, args) {
      console.group('Qubit Deliver Toolkit::' + msg)
      if (args) {
        console.error(args)
      }
      console.groupEnd()
    },
    group: function (msg) {
      console.group(msg)
    },
    groupEnd: function () {
      console.groupEnd()
    }
  }
}
