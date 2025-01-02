import { collectDefaultMetrics, Gauge, register } from 'prom-client';
import express from 'express';

export function init(acController) {
    collectDefaultMetrics();

    // custom metrics
    new Gauge({
        name: 'daikin_api_limit_requests_total',
        help: 'Total number of allowed API requests per period',
        labelNames: ['period'],
        collect: function() {
            this.set({
                period: 'minute',
            }, acController.rateLimitStatus.limitMinute);

            this.set({
                period: 'day',
            }, acController.rateLimitStatus.limitDay);
        },
    });

    new Gauge({
        name: 'daikin_api_limit_requests_remaining',
        help: 'Remaining number of allowed API requests per period',
        labelNames: ['period'],
        collect: function() {
            this.set({
                period: 'minute',
            }, acController.rateLimitStatus.remainingMinute);

            this.set({
                period: 'day',
            }, acController.rateLimitStatus.remainingDay);
        },
    });

    new Gauge({
        name: 'daikin_device_on',
        help: 'Device powered on flag',
        labelNames: ['deviceId', 'deviceName'],
        collect: function() {
            for (let device of acController.devices) {
                this.set({
                    deviceId: device.desc.id,
                    deviceName: device.managementPoints.climateControl.name.value,
                }, device.managementPoints.climateControl.onOffMode.value === 'on' ? 1 : 0);
            }
        },
    });

    new Gauge({
        name: 'daikin_device_room_temperature_celsius',
        help: 'Device room temperature',
        labelNames: ['deviceId', 'deviceName'],
        collect: function() {
            for (let device of acController.devices) {
                this.set({
                    deviceId: device.desc.id,
                    deviceName: device.managementPoints.climateControl.name.value,
                }, device.managementPoints.climateControl.sensoryData['/roomTemperature'].value);
            }
        },
    });

    new Gauge({
        name: 'daikin_device_room_humidity_percent',
        help: 'Device room humidity',
        labelNames: ['deviceId', 'deviceName'],
        collect: function() {
            for (let device of acController.devices) {
                this.set({
                    deviceId: device.desc.id,
                    deviceName: device.managementPoints.climateControl.name.value,
                }, device.managementPoints.climateControl.sensoryData['/roomHumidity'].value);
            }
        },
    });

    new Gauge({
        name: 'daikin_device_outdoor_temperature_celsius',
        help: 'Device outdoor temperature',
        labelNames: ['deviceId', 'deviceName'],
        collect: function() {
            for (let device of acController.devices) {
                this.set({
                    deviceId: device.desc.id,
                    deviceName: device.managementPoints.climateControl.name.value,
                }, device.managementPoints.climateControl.sensoryData['/outdoorTemperature'].value);
            }
        },
    });
}

export async function startServer() {
    if (!process.env.PROMETHEUS_PORT) {
        console.warn('PROMETHEUS_PORT not set, /metrics endpoint unavailable');
        return;
    }

    const port = process.env.PROMETHEUS_PORT;
    const server = express();

    server.get('/metrics', async (req, res) => {
        try {
            res.set('Content-Type', register.contentType);
            res.end(await register.metrics());
        } catch (ex) {
            res.status(500).end(ex.stack);
        }
    });

    await new Promise(resolve => {
        server.listen(port, process.env.HOST ?? '127.0.0.1', () => {
            console.log(`Server listening on port ${port}, metrics exposed on /metrics endpoint`);
            resolve();
        });
    });
}
