// var exec = require('child_process').exec

module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
      options: {
        globals: {
          jQuery: true,
          require: true,
          module: true
        }
      }
    },
    watch: {
      files: ['src/**/*.js', 'src/css/**/*.*'],
      tasks: ['build-dev']
    },
    less: {
      dev: {
        options: {
          paths: ['src/css/']
        },
        files: {
          'build/dev/css/content.css': 'src/css/main.less'
        }
      },
      prod: {
        options: {
          paths: ['src/css/']
        },
        files: {
          'build/prod/css/content.css': 'src/css/main.less'
        }
      }
    },
    browserify: {
      dev: {
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
          'build/dev/js/content/deliver_toolkit.dev.js': [
            'src/js/content/app.js'
          ],
          'build/dev/js/popup/popup.min.js': [
            'src/js/popup/popup.js'
          ]
        }
      },
      prod: {
        options: {
          browserifyOptions: {
            debug: false
          },
          transform: ['node-underscorify'],
          aliasMappings: {
            cwd: 'src',
            src: ['js/content/**/*.js']
          }
        },
        files: {
          'build/prod/js/content/deliver_toolkit.prod.js': [
            'src/js/content/app.js'
          ],
          'build/prod/js/popup/popup.min.js': [
            'src/js/popup/popup.js'
          ]
        }
      }
      // popup: {
      //   options: {
      //     browserifyOptions: {
      //       debug: false
      //     },
      //     aliasMappings: {
      //       cwd: 'src',
      //       src: ['js/popup/*.js']
      //     }
      //   },
      //   files: {
      //     'build/dev/js/popup/popup.min.js': [
      //       'src/js/popup/popup.js'
      //     ]
      //   }
      // }
    },
    copy: {
      dev: {
        files: [{
          src: 'src/manifest.dev.json',
          dest: 'build/dev/manifest.json'
        }, {
          expand: true,
          cwd: 'src/js/',
          src: 'library/*.js',
          dest: 'build/dev/js/'
        }, {
          expand: true,
          cwd: 'src/js/',
          src: 'background/*.js',
          dest: 'build/dev/js/'
        }, {
          expand: true,
          cwd: 'src/js/',
          src: 'content/deliver_toolkit_comms.js',
          dest: 'build/dev/js/'
        }, {
          expand: true,
          cwd: 'assets/',
          src: '**/*.*',
          dest: 'build/dev/assets/'
        }, {
          expand: true,
          cwd: 'src/',
          src: 'templates/**/*.*',
          dest: 'build/dev/'
        }]
      },
      prod: {
        files: [{
          src: 'src/manifest.prod.json',
          dest: 'build/prod/manifest.json'
        }, {
          expand: true,
          cwd: 'src/js/',
          src: 'library/*.js',
          dest: 'build/prod/js/'
        }, {
          expand: true,
          cwd: 'src/js/',
          src: 'background/*.js',
          dest: 'build/prod/js/'
        }, {
          expand: true,
          cwd: 'src/js/',
          src: 'content/deliver_toolkit_comms.js',
          dest: 'build/prod/js/'
        }, {
          expand: true,
          cwd: 'assets/',
          src: '**/*.*',
          dest: 'build/prod/assets/'
        }, {
          expand: true,
          cwd: 'src/',
          src: 'templates/**/*.*',
          dest: 'build/prod/'
        }]
      },
      dist: {
        files: [{
          src: 'src/manifest.dist.json',
          dest: 'dist/manifest.json'
        }, {
          expand: true,
          cwd: 'build/prod/',
          src: ['assets/**', 'css/**', 'templates/**', 'js/background/**', 'js/popup/**'],
          dest: 'dist/'
        }]
      }
    },
    uglify: {
      options: {
        banner: '/*\n * Qubit Deliver Toolkit\n * Copyright <%= grunt.template.today("yyyy") %>, Qubit Products\n * http://www.qubit.com\n * Author: Craig Bojko - craig@qubit.com\n*/',
        mangle: true,
        sourceMap: false,
        sourceMapName: 'dist/js/bundle.map'
      },
      dist: {
        files: {
          'dist/js/content/dt.min.js': ['build/prod/js/content/deliver_toolkit.prod.js'],
          'dist/js/content/deliver_toolkit_comms.js': ['build/prod/js/content/deliver_toolkit_comms.js']
        }
      }
    }
  })

  grunt.loadNpmTasks('grunt-browserify')
  grunt.loadNpmTasks('grunt-contrib-jshint')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-contrib-less')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-contrib-uglify')

  grunt.registerTask('default', ['watch'])
  grunt.registerTask('build-dev', ['less:dev', 'browserify:dev', 'copy:dev'])
  grunt.registerTask('build-prod', ['less:prod', 'browserify:prod', 'copy:prod', 'copy:dist', 'uglify'])
}
