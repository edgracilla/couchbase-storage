/*
 * Just a sample code to test the storage plugin.
 * Kindly write your own unit tests for your own plugin.
 */
'use strict';

var cp     = require('child_process'),
	assert = require('assert'),
	should = require('should'),
	moment = require('moment'),
	uuid   = require('node-uuid'),
	storage;

var HOST        = '52.90.215.131',
	PORT        = 8092,
	TRANSACTION = 'insert',
	BUCKET      = 'default',
	KEY_FIELD   = 'id',
	ID          = uuid.v4();

var record = {
	id: ID,
	co2: '11%',
	temp: 23,
	quality: 11.25,
	reading_time: '2015-11-27T11:04:13.539Z',
	metadata: {metadata_json: 'reekoh metadata json'},
	random_data: 'abcdefg',
	is_normal: true
};

describe('Storage', function () {
	this.slow(5000);

	after('terminate child process', function (done) {
		this.timeout(7000);

		storage.send({
			type: 'close'
		});

		setTimeout(function () {
			storage.kill('SIGKILL');
			done();
		}, 5000);
	});

	describe('#spawn', function () {
		it('should spawn a child process', function () {
			assert.ok(storage = cp.fork(process.cwd()), 'Child process not spawned.');
		});
	});

	describe('#handShake', function () {
		it('should notify the parent process when ready within 20 seconds', function (done) {
			this.timeout(20000);

			storage.on('message', function (message) {
				if (message.type === 'ready')
					done();
			});

			storage.send({
				type: 'ready',
				data: {
					options: {
						host: HOST,
						port: PORT,
						bucket: BUCKET,
						transaction: TRANSACTION,
						key_field: KEY_FIELD
					}
				}
			}, function (error) {
				assert.ifError(error);
			});
		});
	});

	describe('#data', function () {
		it('should process the data', function (done) {
			storage.send({
				type: 'data',
				data: record
			}, done);
		});
	});

	describe('#data', function () {
		it('should have inserted the data', function (done) {
			this.timeout(20000);

			var couchbase = require('couchbase');
			var cluster = new couchbase.Cluster('couchbase://' + HOST + ':' + PORT);
			var bucket = cluster.openBucket(BUCKET);

			bucket.get(ID, function (err, result) {
				should.equal(record.co2, result.value.co2, 'Data validation failed. Field: co2');
				should.equal(record.temp, result.value.temp, 'Data validation failed. Field: temp');
				should.equal(record.quality, result.value.quality, 'Data validation failed. Field: quality');
				should.equal(record.random_data, result.value.random_data, 'Data validation failed. Field: random_data');
				should.equal(moment(record.reading_time).format('YYYY-MM-DDTHH:mm:ss.SSSSZ'),
					moment(result.value.reading_time).format('YYYY-MM-DDTHH:mm:ss.SSSSZ'), 'Data validation failed. Field: reading_time');
				should.equal(JSON.stringify(record.metadata), JSON.stringify(result.value.metadata), 'Data validation failed. Field: metadata');
				should.equal(record.is_normal, result.value.is_normal, 'Data validation failed. Field: is_normal');
				done();
			});

		});
	});
});