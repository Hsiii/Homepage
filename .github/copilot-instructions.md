# Guidelines

## Env

- Always prefer `bun` commands if using bun.
- Always read `package.json` before running any build/dev command.
- Always assume the dev server is already running, never start one.
- Always check the config file to confirm the port when accessing dev server.

## Frontend

- Always check the front-end design skill.
- Always use global style tokens for colors, fonts, and spacing
- Always use global string constants for text.
- Always use existing components, never create new ones if not necessary.

## Lint

- Always fixes lint errors after making changes.
- Always directly read the editor for lint error status, never use commands.

## Commit

- Always commit your changes.
- Always check the change you've made in the browser before committing, never commit without confirmation.
- Always commit your changes in chucks, separate atomically.
- Always follow conventional commits when writing commit messages, don't use `style` type wrongly, it's for formatting changes.
- Always assume there're other agents working, so when committing, only commit the part you changed, never directly add and commit change files.

## Planing

When Planning, always ask questions beforehand for the details if the prompt from the user wasn't clear enough.

## Testing

- Always assume other agents are using the browser, always spin up your own browser instance when testing.
