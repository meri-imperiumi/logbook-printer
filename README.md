Printing service for Signal K digital logbook
============================================

This service implements a printing service for the [Semi-automatic logbook for Signal K](https://github.com/meri-imperiumi/signalk-logbook#readme). The idea is to print all new log entries using a USB receipt printer for backup purposes (for example, to enable traditional dead reckoning or celestial navigation after a power loss).

<img width="498" alt="Screenshot 2024-11-08 at 14 04 48" src="https://github.com/user-attachments/assets/b1df42ce-767c-4253-a902-37521dd2be0d">

## Installation

You need a receipt printer enabled on a system and available as a raw line printer device (by default, `/dev/usb/lp0`). On Raspberry Pi this should happen automatically.
You also need Node.js and git, as well as a Signal K instance in the same network.

1. Check out this repository `git clone https://github.com/meri-imperiumi/logbook-printer.git && cd logbook-printer`
2. Install dependencies `npm i`
3. Run it manually `node index.mjs`
4. Adjust the printer device in `index.mjs` according to your printer setup

On first run the service should create a Signal K access request. Log into your Signal K admin panel and approve it. You need to provide _Admin_ level permissions.

## Running

Set up a cronjob to execute the script periodically. For instance every 15min.
