/* global mocha */
'use strict';

var assert = require('chai').assert

var chromedriver = require('chromedriver')
var chrome = require('selenium-webdriver/chrome')
var http = require('http')
var nodeStatic = require('node-static')
var axeTestUrls = require('../lib/axe-test-urls')
var {startDriver, stopDriver} = require('../lib/webdriver')

describe('integrations', function () {
  var program, urls, server;

  before(function () {
    // Start a server
    var file = new nodeStatic.Server('.');
    server = http.createServer(function (request, response) {
      request.addListener('end', function () {
        file.serve(request, response);
      }).resume();
    })
    server.listen(8182);
  })

  after(function () {
    server.close();
  })

  beforeEach(function () {
    program = {
      browser: 'chrome-headless'
    }
    startDriver(program)
    urls = ['http://localhost:8182/test/testpage.html']
  })

  afterEach(function (done) {
    stopDriver(program)

    var service = chrome.getDefaultService()
    if (service.isRunning()) {
      service.stop().then(() => {
        // An unfortunately hacky way to clean up
        // the service. Stop will shut it down,
        // but it doesn't reset the local state
        service.address_ = null;
        chrome.setDefaultService(null);
        done()
      })
    } else {
      done()
    }
  })

  it('finds results in light and shadow DOM', function () {
    var listResult
    return axeTestUrls(urls, program, {
      onTestComplete: function (results) {
        listResult = results.violations.find(result => result.id === 'list')
        assert.lengthOf(listResult.nodes, 2);
        assert.deepEqual(listResult.nodes[0].target, ['#list'])
        assert.deepEqual(listResult.nodes[1].target, [['#shadow-root', '#shadow-list']])
      }
    }).then(function () {
      assert.isDefined(listResult)
    })
  })
})
