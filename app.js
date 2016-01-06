'use strict';

var platform = require('./platform'),
	bucket, opt;

/**
 * Emitted when device data is received. This is the event to listen to in order to get real-time data feed from the connected devices.
 * @param {object} data The data coming from the device represented as JSON Object.
 */
platform.on('data', function (data) {
	// TODO: Insert the data to the database using the initialized connection.
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