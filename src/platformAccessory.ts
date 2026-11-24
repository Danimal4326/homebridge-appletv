import pyatv, { NodePyATVDevice, NodePyATVDeviceEvent, NodePyATVPowerState } from '@sebbo2002/node-pyatv';
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { AppleTVPlatform } from './platform.js';

/**
 * AppleTV Accessory
 */
export class AppleTVAccessory {

  private atv: NodePyATVDevice;
  private services: Service[] = [];
  private powerStateService: Service;
  private genericServices: { [property: string]: { [value: string]: Service } } = {};

  private cachedPowerState: boolean;
  private reachable = true;

  constructor(
    private readonly platform: AppleTVPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.cachedPowerState = this.accessory.context.powerState ?? false;

    this.atv = pyatv.device({
      name: this.accessory.context.device.name,
      host: this.accessory.context.device.host,
      airplayCredentials: this.accessory.context.device.airplayCredentials,
      companionCredentials: this.accessory.context.device.companionCredentials,
    });

    // node-pyatv re-emits pyatv failures (e.g. an unreachable device) as 'error' events.
    // Without a listener, Node throws them and the whole child bridge crashes.
    // Must be registered before any update:* listener, which starts push_updates.
    this.atv.on('error', (error: NodePyATVDeviceEvent | Error) => {
      this.handleError(error);
    });

    this.services.push(this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Apple Inc.')
      .setCharacteristic(this.platform.Characteristic.Model, 'AppleTV')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.atv.id ?? 'Serial'));

    this.powerStateService = this.accessory.getService(this.platform.Service.Switch)
      || this.accessory.addService(this.platform.Service.Switch)
        .setCharacteristic(this.platform.Characteristic.Name, 'Power State');
    this.services.push(this.powerStateService);
    this.powerStateService.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getCachedPowerState.bind(this));
    this.powerStateService.getCharacteristic(this.platform.Characteristic.On).updateValue(this.cachedPowerState);

    this.atv.on('update:powerState', (event: NodePyATVDeviceEvent | Error) => {
      if (event instanceof Error) {
        this.handleError(event);
        return;
      }
      this.markReachable();
      if (event.newValue !== null) {
        const isOn = event.newValue === NodePyATVPowerState.on;
        this.powerStateService.getCharacteristic(this.platform.Characteristic.On).updateValue(isOn);
        this.savePowerState(isOn);
        this.platform.log.info(event.device.name + ': Got powerState Event: ' + event.newValue);
      }
    });

    if (!this.accessory.context.device.generic_sensors) {
      this.accessory.context.device.generic_sensors = [];
    }

    if (this.accessory.context.device.device_state_sensors?.length > 0) {
      this.accessory.context.device.generic_sensors.push({
        property: 'deviceState',
        values: this.accessory.context.device.device_state_sensors,
      });
      this.platform.log.debug('generic_sensors: ', this.accessory.context.device.generic_sensors);
    }

    if (this.accessory.context.device.app_sensors?.length > 0) {
      this.accessory.context.device.generic_sensors.push({
        property: 'app',
        values: this.accessory.context.device.app_sensors,
      });
      this.platform.log.debug('generic_sensors: ', this.accessory.context.device.generic_sensors);
    }

    for (const sensor of this.accessory.context.device.generic_sensors || []) {
      const property = sensor.property;
      this.genericServices[property] = {};
      for (const value of sensor.values) {
        const name = `${property}.${value}`;
        this.genericServices[sensor.property][value] = this.accessory.getService(name)
          || this.accessory.addService(this.platform.Service.MotionSensor, name, value)
            .setCharacteristic(this.platform.Characteristic.Name, value);
        this.services.push(this.genericServices[property][value]);
      }

      this.atv.on(`update:${property}`, (event: NodePyATVDeviceEvent | Error) => {
        if (event instanceof Error) {
          this.handleError(event);
          return;
        }
        this.markReachable();
        for (const value in this.genericServices[property]) {
          this.genericServices[property][value].setCharacteristic(this.platform.Characteristic.MotionDetected, event.newValue === value);
        }
      });
    }

    for (const service of this.accessory.services.filter(x => !this.services.includes(x))) {
      this.platform.log.info(`Removing unused service: ${service.displayName}`);
      this.accessory.removeService(service);
    }
  }

  private get label(): string {
    return `${this.accessory.context.device.name} (${this.accessory.context.device.host})`;
  }

  /**
   * Log pyatv errors without crashing. The first error after a healthy period is a
   * warning; repeats (node-pyatv retries every ~15s) are debug-only to avoid log spam.
   */
  private handleError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const summary = message.split('\n')[0];
    if (this.reachable) {
      this.reachable = false;
      this.platform.log.warn(`${this.label} is unreachable, will keep retrying: ${summary}`);
    } else {
      this.platform.log.debug(`${this.label} still unreachable: ${summary}`);
    }
  }

  private markReachable() {
    if (!this.reachable) {
      this.reachable = true;
      this.platform.log.info(`${this.label} is reachable again`);
    }
  }

  private savePowerState(isOn: boolean) {
    this.cachedPowerState = isOn;
    if (this.accessory.context.powerState !== isOn) {
      this.accessory.context.powerState = isOn;
      this.platform.api.updatePlatformAccessories([this.accessory]);
    }
  }

  /**
   * Handle "SET" requests from HomeKit
   */
  async setOn(value: CharacteristicValue) {
    try {
      if (value) {
        await this.atv.turnOn();
      } else {
        await this.atv.turnOff();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.platform.log.warn(`${this.label}: failed to turn ${value ? 'on' : 'off'}: ${message.split('\n')[0]}`);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
    this.savePowerState(Boolean(value));
    this.platform.log.debug('Set cachedPowerState: ' + Boolean(value));
  }

  getCachedPowerState(): boolean {
    this.platform.log.debug('Retrieved cachedPowerState: ' + this.cachedPowerState);
    return this.cachedPowerState;
  }

}
