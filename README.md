# FourSFEIR

A little openspace booking app

## Features

- Social login with google
- Multiple rooms, a.k.a. cities
- Self booking for full days, mornings or afternoons
- Temporary guests on a booking
- Book other colleagues if they forgot

## Development

Prerequisites :

- Install [gcloud CLI](https://cloud.google.com/sdk/docs/install?hl=fr)
- Init gcloud with `gcloud init`
- Set up Application Default Credentials for a local development environnement by `gcloud auth application-default login`
- Copy `.env.example` to`.env`, fill environnement variables.

To run this locally, make sure your project's local dependencies are installed:

```sh
npm ci
```

Afterwards, start the Remix development server like so:

```sh
npm run dev
```

Open up [http://localhost:3000](http://localhost:3000) and you should be ready to go!



### Create an index on datastore

Run this command
```
cloud datastore indexes create YOUR_INDEX_FILE
```

## Migration

Extract each tables to a csv file and put it inside the `scripts/data` folder.

Run `npx zx scripts/seed.mjs` to migrate the data

Option : --reset to delete all data


## Deploying

If you're familiar with deploying Node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `npm run build`

- `build/server`
- `build/client`

## Links

- [Remix Docs](https://remix.run/docs)
- [Vercel](https://vercel.com/docs)
- [Supabase](https://supabase.com/docs)
- [Pico.css](https://picocss.com/docs)
- [React-icons](https://react-icons.github.io/react-icons/icons?name=fi)
