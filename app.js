'use strict'

const reekoh = require('reekoh')
const _plugin = new reekoh.plugins.Storage()

const async = require('async')
const uuid = require('node-uuid')
const couchbase = require('couchbase')
const isPlainObject = require('lodash.isplainobject')

let _opt = null
let _bucket = null

let sendData = (data, callback) => {
  let id

  if (_opt.keyField) {
    id = data[_opt.keyField]
    delete data[_opt.keyField]
  }

  if (_opt.transaction === 'insert') {
    _bucket.insert(id || uuid.v4(), data, (err) => {
      if (err) {
        if (err.code === 12) {
          callback(new Error(`Duplicate key being inserted to Couchbase. Key: ${id}`))
        } else {
          console.error('Error inserting record on Couchbase', err)
          callback(err)
        }
      } else {
        _plugin.log(JSON.stringify({
          title: 'Record Successfully inserted to Couchbase.',
          data: data,
          key: id
        }))

        callback()
      }
    })
  } else {
    _bucket.upsert(id || uuid.v4(), data, (err) => {
      if (err) {
        console.error('Error inserting record on Couchbase', err)
        callback(err)
      } else {
        _plugin.log(JSON.stringify({
          title: 'Record Successfully inserted to Couchbase.',
          data: data,
          key: id
        }))

        callback()
      }
    })
  }
}

_plugin.on('data', (data) => {
  if (isPlainObject(data)) {
    sendData(data, (error) => {
      if (error) _plugin.logException(error)
      process.send({ type: 'processed' })
    })
  } else if (Array.isArray(data)) {
    async.each(data, (datum, done) => {
      sendData(datum, done)
    }, (error) => {
      if (error) _plugin.logException(error)
      process.send({ type: 'processed' })
    })
  } else {
    _plugin.logException(new Error(`Invalid data received. Data must be a valid Array/JSON Object or a collection of objects. Data: ${data}`))
  }
})

_plugin.once('ready', () => {
  _opt = _plugin.config

  let url = `${_opt.host}`
  if (_opt.port) url = `${url}:${_opt.port}`

  let cluster = new couchbase.Cluster(`couchbase://${url}`)

  _bucket = cluster.openBucket(_opt.bucket, _opt.bucketPassword || '', (error) => {
    if (error) {
      _plugin.logException(error)

      return setTimeout(() => {
        process.exit(1)
      }, 5000)
    }

    _plugin.log('Couchbase Storage Plugin has been initialized.')
    process.send({ type: 'ready' })
  })
})
