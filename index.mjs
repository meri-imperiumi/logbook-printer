import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';
import SystemReceiptPrinter from '@point-of-sale/system-receipt-printer';
import { promisify } from 'node:util';
import { discover, authenticate, request, setStatus, getStatus } from './signalk.mjs';
import * as config from './config.mjs';
let printers = SystemReceiptPrinter.getPrinters();

const configFile = 'logbook-printer.json';
const clientId = '9c650970-f1b7-4c32-a337-5c0e79e4ebb7';
const clientDesc = 'Signal K logbook printer';
let clientStatus = {};
let skHost = '';

// NOTE: As of 2024-11-01, the client will need admin-level access to be able to do plugin API calls

config.read(configFile)
  .then((storedClientStatus) => {
    clientStatus = storedClientStatus;
    setStatus(clientStatus);
    console.log('Discovering local Signal K instance...');
    return discover();
  })
  .then((service) => {
    console.log(`Using Signal K service discovered in ${service.host}:${service.port}`);
    skHost = `${service.name}:${service.port}`;
    return authenticate(skHost)
      .catch((e) => {
        clientStatus = getStatus();
        config.write(configFile, clientStatus);
        return Promise.reject(e);
      })
      .then(() => {
        clientStatus = getStatus();
        config.write(configFile, clientStatus);
      });
  })
  .then(() => {
    const url = `http://${skHost}/plugins/signalk-logbook/logs`;
    return request(url);
  })
  .then((body) => {
    console.log(body);
    process.exit(0);
  })
  .catch((e) => {
    console.log('Error');
    console.log(e);
    process.exit(1);
  });

const printer = new SystemReceiptPrinter({
  name: 'YICHIP3121_USB_Portable_Printer',
});

const encoder = new ReceiptPrinterEncoder({
  name: 'pos-5890',
  columns: 32,
});
let result = encoder
  .initialize()
  .codepage('cp850')
  .text('Hello world')
  .newline()
  .encode();

//console.log(result);

//printer.print(result);
