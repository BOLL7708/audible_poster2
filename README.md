# Audible Discord Poster 2

This project will load an Audible page, scrape data from it, and post it to a Discord forum channel.

## Pre-requisites
1. Node.js
2. Webserver with PHP
3. Discord webhook URL

## Installation
1. Clone the repository or download the source.
2. Install required modules with `npm install` in the root.
3. Copy `webhook.php` to `webhook.local.php` and edit the file to include a Discord webhook URL.
4. Build the project with `npm run build` in the root.
5. If everything worked, host the `dist` folder on a server with PHP and load the path in a browser.

## Development
1. Follow the steps for installation, but use `npm run dev` to start the development server.