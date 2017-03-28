/* global describe, it, before, after */
'use strict'

const should = require('should')
const amqp = require('amqplib')
const moment = require('moment')
const uuid = require('node-uuid')

const ID = uuid.v4()
const INPUT_PIPE = 'demo.pipe.storage'
const BROKER = 'amqp://guest:guest@127.0.0.1/'

let _app = null
let _channel = null
let _conn = null

let conf = {
  host: 'localhost',
  port: 8091,
  bucket: 'default',
  bucketPassword: '',
  transaction: 'insert',
  keyField: 'id'
}

let record = {
  id: ID,
  co2: '11%',
  temp: 23,
  quality: 11.25,
  readingTime: '2015-11-27T11:04:13.539Z',
  metadata: {metadataJson: 'reekoh metadata json'},
  randomData: 'abcdefg',
  isNormal: true
}

describe('Couchbase Storage', function () {

  before('init', () => {
    process.env.BROKER = BROKER
    process.env.INPUT_PIPE = INPUT_PIPE
    process.env.CONFIG = JSON.stringify(conf)

    amqp.connect(BROKER).then((conn) => {
      _conn = conn
      return conn.createChannel()
    }).then((channel) => {
      _channel = channel
    }).catch((err) => {
      console.log(err)
    })
  })

  after('terminate', function () {
    _conn.close()
  })

  describe('#start', function () {
    it('should start the app', function (done) {
      this.timeout(10000)
      _app = require('../app')
      _app.once('init', done)
    })
  })

  describe('#data', function () {
    it('should process the data', function (done) {
      this.timeout(10000)
      _channel.sendToQueue(INPUT_PIPE, new Buffer(JSON.stringify(record)))
      _app.on('processed', done)
    })
  })

  describe('#data', function () {
    it('should have inserted the data', function (done) {
      this.timeout(20000)

      let couchbase = require('couchbase')
      let cluster = new couchbase.Cluster('couchbase://' + conf.host + ':' + conf.port)
      let bucket = cluster.openBucket(conf.bucket)

      bucket.get(ID, function (err, result) {
        if (err) return console.log(err)

        should.equal(record.co2, result.value.co2, 'Data validation failed. Field: co2')
        should.equal(record.temp, result.value.temp, 'Data validation failed. Field: temp')
        should.equal(record.quality, result.value.quality, 'Data validation failed. Field: quality')
        should.equal(record.randomData, result.value.randomData, 'Data validation failed. Field: randomData')
        should.equal(moment(record.readingTime).format('YYYY-MM-DDTHH:mm:ss.SSSSZ'), moment(result.value.readingTime).format('YYYY-MM-DDTHH:mm:ss.SSSSZ'), 'Data validation failed. Field: readingTime')
        should.equal(JSON.stringify(record.metadata), JSON.stringify(result.value.metadata), 'Data validation failed. Field: metadata')
        should.equal(record.isNormal, result.value.isNormal, 'Data validation failed. Field: isNormal')
        done()
      })
    })
  })
})
