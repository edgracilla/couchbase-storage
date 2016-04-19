'use strict';

var uuid          = require('node-uuid'),
	async         = require('async'),
	isArray       = require('lodash.isarray'),
	platform      = require('./platform'),
	isPlainObject = require('lodash.isplainobject'),
	bucket, opt;

let sendData = function (data, callback) {
	let id;

	if (opt.field_key) id = data[opt.field_key];

	if (opt.transaction === 'insert') {
		bucket.insert(id || uuid.v4(), data, function (insertError) {
			if (insertError) {
				if (insertError.code === 12)
					callback(new Error(`Duplicate key being inserted to Couchbase. Key: ${id}`));
				else {
					console.error('Error inserting record on Couchbase', insertError);
					callback(insertError);
				}
			}
			else {
				platform.log(JSON.stringify({
					title: 'Record Successfully inserted to Couchbase.',
					data: data,
					key: id
				}));

				callback();
			}
		});
	}
	else {
		bucket.upsert(id || uuid.v4(), data, function (upsertError) {
			if (upsertError) {
				console.error('Error inserting record on Couchbase', upsertError);
				callback(upsertError);
			}
			else {
				platform.log(JSON.stringify({
					title: 'Record Successfully inserted to Couchbase.',
					data: data,
					key: id
				}));

				callback();
			}
		});
	}
};

platform.on('data', function (data) {
	if (isPlainObject(data)) {
		sendData(data, (error) => {
			if (error) platform.handleException(error);
		});
	}
	else if (isArray(data)) {
		async.each(data, (datum, done) => {
			sendData(datum, done);
		}, (error) => {
			if (error) platform.handleException(error);
		});
	}
	else
		platform.handleException(new Error(`Invalid data received. Data must be a valid Array/JSON Object or a collection of objects. Data: ${data}`));
});

/**
 * Emitted when the platform shuts down the plugin. The Storage should perform cleanup of the resources on this event.
 */
platform.once('close', function () {
	platform.notifyClose();
});

/**
 * Emitted when the platform bootstraps the plugin. The plugin should listen once and execute its init process.
 * Afterwards, platform.notifyReady() should be called to notify the platform that the init process is done.
 * @param {object} options The options or configuration injected by the platform to the plugin.
 */
platform.once('ready', function (options) {
	var couchbase = require('couchbase');
	var cluster = new couchbase.Cluster(`couchbase://${options.host}:${options.port}`);

	bucket = cluster.openBucket(options.bucket, options.password);

	opt = options;

	platform.notifyReady();
	platform.log('Couchbase Storage Plugin has been initialized.');
});