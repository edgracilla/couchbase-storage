'use strict';

var platform = require('./platform'),
	isPlainObject = require('lodash.isplainobject'),
	isArray = require('lodash.isarray'),
	async = require('async'),
	bucket, opt;

let sendData = (data) => {
	var uuid = require('node-uuid');
	var id;

	if (opt.field_key) {
		id = data[opt.field_key];
		if ((id === undefined || id === null) && opt.generate === true ) id =  uuid.v4();
	} else {
		id = uuid.v4();
	}

	if (opt.transaction === 'insert') {
		bucket.insert(id , data, function(err) {
			if (err) {
				if (err.code === 12) {
					platform.log(JSON.stringify({
						title: 'Duplicate key being inserted to Couchbase',
						data: data,
						key: id
					}));
				} else {
					console.error('Error inserting record on Couchbase', err);
					platform.handleException(err);
				}
			} else {
				platform.log(JSON.stringify({
					title: 'Record Successfully inserted to Couchbase.',
					data: data,
					key: id
				}));
			}
		});
	} else {
		bucket.upsert(id , data, function(err) {
			if (err) {
				console.error('Error inserting record on Couchbase', err);
				platform.handleException(err);
			} else {
				platform.log(JSON.stringify({
					title: 'Record Successfully inserted to Couchbase.',
					data: data,
					key: id
				}));
			}
		});
	}
};

platform.on('data', function (data) {
	if(isPlainObject(data)){
		sendData(data);
	}
	else if(isArray(data)){
		async.each(data, function(datum){
			sendData(datum);
		});
	}
	else
		platform.handleException(new Error(`Invalid data received. Data must be a valid Array/JSON Object or a collection of objects. Data: ${data}`));
});

/**
 * Emitted when the platform shuts down the plugin. The Storage should perform cleanup of the resources on this event.
 */
platform.once('close', function () {
	let d = require('domain').create();

	d.once('error', function(error) {
		console.error(error);
		platform.handleException(error);
		platform.notifyClose();
		d.exit();
	});

	d.run(function() {
		platform.notifyClose(); // Notify the platform that resources have been released.
		d.exit();
	});
});

/**
 * Emitted when the platform bootstraps the plugin. The plugin should listen once and execute its init process.
 * Afterwards, platform.notifyReady() should be called to notify the platform that the init process is done.
 * @param {object} options The options or configuration injected by the platform to the plugin.
 */
platform.once('ready', function (options) {


	var auth = options.user + ':';
	var url = options.host;

	if (options.password) auth = auth + options.password;
	if (options.port) url = url + ':' + options.port;

	var couchbase = require('couchbase');
	var cluster = new couchbase.Cluster(auth + '//' + url);
	bucket = cluster.openBucket(options.bucket);

	opt = options;

	platform.notifyReady();
	platform.log('Couchbase Storage Plugin has been initialized.');
});