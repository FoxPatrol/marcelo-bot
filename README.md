# Marcelo-Bot

Music bot for Discord. Uses distube library to swiften the process.

For ease of running, run in docker container by making the image with `npm run docker:build` and run the image with `npm run docker:run`.

## Development

Should have `.env` file with `TOKEN` variable, relating to the discord bot's `TOKEN` variable, under `Bot` tab.

## Deployment

Marcelo is deployed using [fly.io](fly.io).

To list apps running in fly, run `fly apps list`.

To destroy the app, run `fly apps destroy marcelo-bot`.

To launch the app, run `fly launch -y`
