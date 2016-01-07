# Couchbcase Storage Plugin

Couchbcase Storage Plugin for the Reekoh IoT Platform.

Uses couchbase npm library

**Assumptions:**

1. Data would be in JSON format
2. Data will be saved as is based on what has been sent

**Process**

1. Data would be written directly to the Couchbcase host/port and bucket specified
2. Storage plugin will only do insert/upsert data operations
3. All errors will be logged and no data should be written 
4. Duplicate keys will still be logged but will not cause the plugin to error out
5. Auto-generation of id's uses node-uuid v4, this is set to true if Field Key is null to prevent error on inserts

##Sample Data

```
{
  _id: _id,
  co2: '11%',
  temp: 23,
  quality: 11.25,
  metadata: '{"name": "warehouse air conditioning"}',
  reading_time: '2015-11-27T11:04:13.539Z',
  random_data: 'abcdefg',
  is_normal: true
}
```


