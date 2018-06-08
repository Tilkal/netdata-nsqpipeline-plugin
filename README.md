# NSQPipeline netdata plugin

NSQPipeline netdata plugin to get charts out of NSQPipeline monitoring.

## Installation

First add the configuration file:

`/etc/netdata/node.d/nsqpipeline.conf`

you can find and example of it in `nsqpipeline.conf.md`

Then copy the plugin file:

`/usr/libexec/netdata/node.d/nsqpipeline.node.js`

at last, restart netdata:

`systemctl restart netdata`

do not forget to install [node js](https://nodejs.org/) before installing the plugin.