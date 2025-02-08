# bot-wr-empiredrop

## Getting Started

To run the bot you need to create a discord developer application https://discord.com/developers/applications

Next you need to create a bot inside the discord developer application and paste the client Id of the discord app and the token of the bot inside the .env file

### Installation

1. Install NPM packages
   ```sh
   npm install
   ```
2. Register the slash command of the bot
   ```sh
   npm run register
   ```

## Usage

Host the code on a virutal machine and run the following command
   ```sh
      npm run start
   ```
The bot should start and you should the a log message saying "Ready! Logged in as ${bot_name}"

## List of slash commands

In the discord you can use the following command:

1. To get the result of the wager race with users id only once
    ```sh
      /result
   ```
2. To start the wager race and keep fetching data every hours
   ```sh
     /start
   ```
    This command should post a message in the desired channel every hours with the last data of the race and should stop one hour after the ended date of the race with the final result


3. To stop the wager race
   ```sh
     /stop
   ```
    This command is for stop fetching a wager race manually

It can only have one wager race by discord server for now