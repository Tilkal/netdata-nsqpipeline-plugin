'use strict'

// This program will connect to one or more nsq pipeline pipelets
// to get their stats

// example configuration in netdata/conf.d/node.d/nsqpipline.conf.md

// @ts-check

const netdata = require('netdata')

netdata.debug(`loaded  ${__filename} plugin`)

const nsqpipeline = {
  name: 'nsqpipeline',
  enable_autodetect: false,
  update_every: 4,
  base_priority: 60000,

  message_metrics: {
    ReceivedMessages: "Received Messages",
    ProcessedMessages:  "Processed Messages", 
    RequeuedMessages: "Requeued Messages", 
    DiscardedMessages: "Discarded Messages"
  },
  time_metrics: {
    MinimumHandlingTime: "Minimum Handling Time",
    AverageHandlingTime: "Average Handling Time",
    MaximumHandlingTime: "Maximum Handling Time"
  },
  charts: {},
  createBasicDimension: function (id, name, divisor) {
    return {
      id: id,                                      // the unique id of the dimension
      name: name,                                  // the name of the dimension
      algorithm: netdata.chartAlgorithms.absolute, // the id of the netdata algorithm
      multiplier: 1,                               // the multiplier
      divisor: divisor,                            // the divisor
      hidden: false                                // is hidden (boolean)
    }
  },

  // Gets a pipelet chart
  getPipeletChart: function (service, metrics, name, units) {
    var id = this.getChartId(service, name)
    var chart = nsqpipeline.charts[id]
    if (this.isDefined(chart)) return chart

    var dim = {}
    Object.keys(metrics).forEach(metric => {
      dim[metric] = this.createBasicDimension(metric, metrics[metric], 1)
    })

    chart = {
      id: id,                                   // the unique id of the chart
      name: '',                                 // the unique name of the chart
      title: `${service.name}.${name}`,         // the title of the chart
      units: units,                             // the units of the chart dimensions
      family: service.pipelet,                  // the family of the chart
      context: 'nsqpipeline',                   // the context of the chart
      type: netdata.chartTypes.line,            // the type of the chart
      priority: nsqpipeline.base_priority + 1,  // the priority relative to others in the same family
      update_every: service.update_every,       // the expected update frequency of the chart
      dimensions: dim
    }
    chart = service.chart(id, chart)
    nsqpipeline.charts[id] = chart

    return chart
  },

  // Gets a message pipelet chart
  getMessagePipeletChart: function (service) {
    return this.getPipeletChart(service, nsqpipeline.message_metrics, 'messages', 'messages')
  },

  // Gets a timer pipelet chart
  getTimePipeletChart: function (service) {
    return this.getPipeletChart(service, nsqpipeline.time_metrics, 'timers', 'ms')
  },

  processResponse: function (service, content) {
    const stats = nsqpipeline.convertToJson(content)
    if (stats === null) return

    // add the service
    service.commit()

    const charts = nsqpipeline.parseCharts(service, stats)
    charts.forEach(chart => {
      service.begin(chart.chart)
      chart.dimensions.forEach(dimension => {
        service.set(dimension.name, dimension.value)
      })
      service.end()
    })
  },

  parseCharts: function (service, stats) {
    const charts = []
    charts.push(this.parseMessageMetricChart(service, stats))
    charts.push(this.parseTimeMetricChart(service, stats))
    return charts
  },

  parseMessageMetricChart: function (service, stats) {
    return this.getChart(this.getMessagePipeletChart(service), Object.keys(nsqpipeline.message_metrics).map(metric => this.getDimension(metric, stats[metric]))
    )
  },

  parseTimeMetricChart: function (service, stats) {
    return this.getChart(this.getTimePipeletChart(service), Object.keys(nsqpipeline.time_metrics).map(metric => this.getDimension(metric, stats[metric])))
  },

  getDimension: function (name, value) {
    return { name, value }
  },

  getChart: function (chart, dimensions) {
    return { chart, dimensions }
  },

  getChartId: function (service, name) {
    return `${service.name}.${name}.pipelet`
  },

  convertToJson: function (content) {
    if (content === null) return null
    var json = content
    // can't parse if it's already a json object,
    // the check enables easier testing if the content is already valid JSON.
    if (typeof content !== 'object') {
      try {
        json = JSON.parse(content)
      } catch (error) {
        netdata.error(`nsqpipeline: Got a response, but it is not valid JSON. Ignoring. Error: ${error.message}`)
        return null
      }
    }
    return this.isResponseValid(json) ? json : null
  },

  // some basic validation
  isResponseValid: function (json) {
    return this.isDefined(json.ReceivedMessages)
  },

  // module.serviceExecute()
  // this function is called only from this module
  // its purpose is to prepare the request and call
  // netdata.serviceExecute()
  serviceExecute: function (pipelet) {
    netdata.debug(`${this.name}: ${pipelet.name}`)

    const service = netdata.service({
      pipelet: pipelet.name,
      name: `nsqpipeline.${pipelet.name}`,
      update_every: pipelet.updateEvery || this.update_every,
      request: netdata.requestFromURL(`http://${pipelet.hostname}:${pipelet.port}${pipelet.path}`),
      module: this
    })
    service.execute(this.processResponse)
  },

  configure: function (config) {
    if (this.isUndefined(config.pipelets)) return 0
    var added = 0
    config.pipelets.forEach(pipelet => {
      if (this.isUndefined(pipelet.update_every)) pipelet.update_every = this.update_every
      if (this.areUndefined([pipelet.name, pipelet.hostname, pipelet.port, pipelet.path])) { } else {
        this.serviceExecute(pipelet)
        added++
      }
    })
    return added
  },

  // module.update()
  // this is called repeatedly to collect data, by calling
  // netdata.serviceExecute()
  update: function (service, callback) {
    service.execute(function (serv, data) {
      service.module.processResponse(serv, data)
      callback()
    })
  },

  isUndefined: function (value) {
    return typeof value === 'undefined'
  },

  areUndefined: function (values) {
    return values.find(value => this.isUndefined(value))
  },

  isDefined: function (value) {
    return typeof value !== 'undefined'
  }
}

module.exports = nsqpipeline
