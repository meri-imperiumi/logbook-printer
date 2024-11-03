import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';
import SystemReceiptPrinter from '@point-of-sale/system-receipt-printer';
import { promisify } from 'node:util';
import { Point } from 'where'
import beaufort from 'beaufort-scale';
import { discover, authenticate, request, setStatus, getStatus } from './signalk.mjs';
import * as config from './config.mjs';
let printers = SystemReceiptPrinter.getPrinters();

const configFile = 'logbook-printer.json';
const clientId = '9c650970-f1b7-4c32-a337-5c0e79e4ebb7';
const clientDesc = 'Signal K logbook printer';
let clientStatus = {};
let skHost = '';

const printer = new SystemReceiptPrinter({
  name: 'YICHIP3121_USB_Portable_Printer',
});

const encoder = new ReceiptPrinterEncoder({
  name: 'pos-5890',
  columns: 32,
});

// NOTE: As of 2024-11-01, the client will need admin-level access to be able to do plugin API calls

function formatNumber(value, maxLength) {
  // First just try padding
  const padded = String(value).padStart(maxLength, '0');
  if (padded.length <= maxLength) {
    return padded;
  }
  if (value > 100) {
    return String(Math.round(value)).padStart(maxLength, '0');
  }
  if (value > 10) {
    return value.toPrecision(2).padStart(maxLength, '0');
  }
  return value.toPrecision(maxLength).padStart(maxLength, '0');
}

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
    console.log('Fetching new log entries');
    const url = `http://${skHost}/plugins/signalk-logbook/logs`;
    return request(url);
  })
  .then((logs) => {
    if (clientStatus.lastPrinted) {
      const lastDate = clientStatus.lastPrinted.substr(0, 10);
      return logs.filter((date) => date >= lastDate);
    }
    return logs.slice(-1);
  })
  .then((newLogs) => {
    return newLogs.reduce((prev, logDate) => {
      return prev.then((data) => {
        const url = `http://${skHost}/plugins/signalk-logbook/logs/${logDate}`;
        return request(url)
          .then((dateEntries) => {
            return data.concat(dateEntries);
          });
      });
    }, Promise.resolve([]));
  })
  .then((logEntries) => {
    if (clientStatus.lastPrinted) {
      return logEntries.filter((entry) => entry.datetime >= clientStatus.lastPrinted);
    }
    return logEntries.slice(-1);
  })
  .then((newEntries) => {
    if (!newEntries.length) {
      console.log('No unprinted log entries found');
      process.exit(0);
    }
    console.log(`Found ${newEntries.length} unprinted log entries`);
    let result = encoder
      .initialize()
      .codepage('cp850');
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    newEntries.forEach((entry) => {
      const lines = [];
      const meta = [];
      if (entry.author) {
        meta.push(entry.author);
      }
      if (entry.category) {
        meta.push(`#${entry.category}`);
      }
      lines.push(meta.join(' ').padStart(32, '-'));

      const datetime = new Date(entry.datetime);
      const month = months[datetime.getUTCMonth()];
      const day = String(datetime.getUTCDate()).padStart(2, '0')
      const hour = String(datetime.getUTCHours()).padStart(2, '0')
      const minute = String(datetime.getUTCMinutes()).padStart(2, '0')
      const dateStr = `${day}${month}${hour}:${minute}`;
      const position = new Point(entry.position.latitude, entry.position.longitude).toString().replaceAll('′', '\'').replaceAll('″', '"');

      lines.push(`${dateStr}|${position}`);

      const course = formatNumber(entry.course, 3) + '°';
      const speed = formatNumber(entry.speed.sog, 3) + 'kt';
      const log = formatNumber(entry.log, 5) + 'NM';
      const baro = `${formatNumber(entry.barometer, 4)}hPa`;
      let wind = '';
      if (entry.wind) {
        const windSpeed = entry.wind.speed | 0;
        wind = `F${formatNumber(beaufort(windSpeed * 1.852).grade, 1)}`;
      }
      lines.push(`C${course} S${speed} L${log} ${baro} ${wind}`);
      if (entry.text) {
        lines.push(entry.text);
      }
      lines.forEach((l) => {
        // console.log(l, l.length);
        result = result.text(l).newline();
      });
    });
    return result;
  })
  .then((result) => {
    printer.print(result.encode());
    console.log('Done');
    process.exit();
  })
  .catch((e) => {
    console.log('Error');
    console.log(e);
    process.exit(1);
  });
