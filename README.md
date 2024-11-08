Printing service for Signal K digital logbook
============================================

This service implements a printing service for the [Semi-automatic logbook for Signal K](https://github.com/meri-imperiumi/signalk-logbook#readme). The idea is to print all new log entries using a USB receipt printer for backup purposes (for example, to enable traditional dead reckoning or celestial navigation after a power loss).

<img width="498" alt="Screenshot 2024-11-08 at 14 04 48" src="https://github.com/user-attachments/assets/b1df42ce-767c-4253-a902-37521dd2be0d">

## Installation

You need CUPS installed and configured for your receipt printer ([MacOS instructions](https://mike42.me/blog/2015-10-how-to-connect-a-usb-receipt-printer-up-on-mac-os-x), [Linux instructions](https://learn.adafruit.com/networked-thermal-printer-using-cups-and-raspberry-pi/connect-and-configure-printer)). You also need Node.js and git, as well as a Signal K instance in the same network.

1. Check out this repository `git clone https://github.com/meri-imperiumi/logbook-printer.git && cd logbook-printer`
2. Install dependencies `npm i`
3. Run it manually `node index.mjs`
4. Adjust the printer name in `index.mjs` according to your printer setup

On first run the service should create a Signal K access request. Log into your Signal K admin panel and approve it. You need to provide _Admin_ level permissions.

## Running

Set up a cronjob to execute the script periodically. For instance every 15min.
