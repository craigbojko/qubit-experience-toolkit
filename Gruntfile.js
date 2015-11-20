var exec = require('child_process').exec

module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
      options: {
        globals: {
          jQuery: true
        }
      }
    },
    watch: {
      files: ['src/**/*.js', 'src/css/**/*.*'],
      tasks: ['build']
    },
    less: {
      content: {
        options: {
          paths: ['src/css/']
        },
        files: {
          'build/css/content.css': 'src/css/main.less'
        }
      }
    },
    browserify: {
      dist: {
        options: {
          browserifyOptions: {
            debug: true
          },
          transform: ['node-underscorify'],
          aliasMappings: {
            cwd: 'src',
            src: ['js/content/**/*.js']
          }
        },
        files: {
          'build/js/content/deliver_toolkit.min.js': [
            'src/js/content/app.js'
          ]
        }
      },
      popup: {
        options: {
          browserifyOptions: {
            debug: false
          },
          aliasMappings: {
            cwd: 'src',
            src: ['js/popup/*.js']
          }
        },
        files: {
          'build/js/popup/popup.min.js': [
            'src/js/popup/popup.js'
          ]
        }
      }
    },
    copy: {
      main: {
        files: [{
          expand: true,
          cwd: 'src/js/',
          src: 'library/*.js',
          dest: 'build/js/'
        }, {
          expand: true,
          cwd: 'src/js/',
          src: 'background/*.js',
          dest: 'build/js/'
        }, {
          expand: true,
          cwd: 'src/',
          src: 'manifest.json',
          dest: 'build/'
        }, {
          expand: true,
          cwd: 'src/js/',
          src: 'content/deliver_toolkit_comms.js',
          dest: 'build/js/'
        }, {
          expand: true,
          cwd: 'assets/',
          src: '**/*.*',
          dest: 'build/assets/'
        }, {
          expand: true,
          cwd: 'src/',
          src: 'templates/**/*.*',
          dest: 'build/'
        }]
      }
    }
  })

  grunt.loadNpmTasks('grunt-contrib-jshint')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-contrib-less')
  grunt.loadNpmTasks('grunt-browserify')
  grunt.loadNpmTasks('grunt-contrib-copy')

  grunt.registerTask('chrome-ext-reload', function () {
    // Create server to communicate with Google Chrome reload extension
    var done = this.async()
    var server = require('http').createServer()
    var io = require('socket.io')(server)
    var connected = false
    var sockets = {}
    var socketId = 0
    var closeServer = function () {
      server.close(function () {
        grunt.log.writeln('Server closed gracefully.')
        done()
      })
      for (var id in sockets) {
        sockets[id].destroy()
      }
      setTimeout(function () {
        grunt.log.writeln('Server was not closed gracefully.')
        done()
      }, 2000)
    }
    server.on('connection', function (socket) {
      sockets[socketId++] = socket
    })
    io.sockets.on('connection', function (socket) {
      if (!connected) {
        grunt.log.writeln('Reloader connected.')
        socket.emit('file.change', {})
        connected = true
        setTimeout(function () {
          closeServer()
        }, 1000)
      }
    })
    io.sockets.on('error', function (e) {
      grunt.log.writeln('Server error: ' + e.description)
      closeServer()
    })
    server.listen(8890)
  })
  grunt.registerTask('reload', 'reload Chrome on OS X', function () {
    exec('osascript ' +
      "-e 'tell application \"Google Chrome\" " +
      "to tell the active tab of its first window' " +
      "-e 'reload' " +
      "-e 'end tell'")
  })

  grunt.registerTask('default', ['watch'])
  grunt.registerTask('build', ['less', 'browserify', 'copy'])
}
