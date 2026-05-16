// Web Bluetooth API Type Definitions
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API

declare global {
  interface Navigator {
    bluetooth?: Bluetooth;
  }

  interface Bluetooth {
    requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
  }

  interface RequestDeviceOptions {
    acceptAllDevices?: boolean;
    filters?: BluetoothLEScanFilter[];
    optionalServices?: (string | number)[];
  }

  interface BluetoothLEScanFilter {
    name?: string;
    namePrefix?: string;
    services?: (string | number)[];
  }

  interface BluetoothDevice {
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
    addEventListener(
      type: string,
      listener: EventListener,
      options?: boolean | AddEventListenerOptions
    ): void;
  }

  interface BluetoothRemoteGATTServer {
    connected: boolean;
    device: BluetoothDevice;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(
      service: BluetoothServiceUUID
    ): Promise<BluetoothRemoteGATTService>;
  }

  interface BluetoothRemoteGATTService {
    device: BluetoothDevice;
    uuid: string;
    getCharacteristic(
      characteristic: BluetoothCharacteristicUUID
    ): Promise<BluetoothRemoteGATTCharacteristic>;
  }

  interface BluetoothRemoteGATTCharacteristic {
    service: BluetoothRemoteGATTService;
    uuid: string;
    properties: BluetoothCharacteristicProperties;
    value?: DataView;
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    readValue(): Promise<DataView>;
    writeValue(value: BufferSource): Promise<void>;
    addEventListener(
      type: string,
      listener: EventListener,
      options?: boolean | AddEventListenerOptions
    ): void;
  }

  interface BluetoothCharacteristicProperties {
    broadcast: boolean;
    read: boolean;
    writeWithoutResponse: boolean;
    write: boolean;
    notify: boolean;
    indicate: boolean;
    authenticatedSignedWrites: boolean;
    reliableWrite: boolean;
    writableAuxiliaries: boolean;
  }

  type BluetoothServiceUUID = string | number;
  type BluetoothCharacteristicUUID = string | number;
}

export {};
