NSQPipeline netdata plugin

Example netdata configuration for node.d/nsqpipeline.conf. Copy this section to nsqpipeline.conf and change name/ip.

```json
{
    "enable_autodetect": false,
    "update_every": 5,
    "name": "NSQPipeline",
    "pipelets": [
        {
            "name": "compressor",
            "hostname": "localhost",
            "port": 8080,
            "path": "/pipe/stats"
        },{
            "name": "encrypter",
            "hostname": "localhost",
            "port": 8081,
            "path": "/pipe/stats"
        }
    ]
}
```

The output of /pipe/stats looks like this

```json
{
    "ReceivedMessages": 100,
    "ProcessedMessages": 98,
    "RequeuedMessages": 1,
    "DiscardedMessages": 2,
    "MinimumHandlingTime":  60,
    "AverageHandlingTime": 130.79263301500683,
    "MaximumHandlingTime": 2907
}
```
