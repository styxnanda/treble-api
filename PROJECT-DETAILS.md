# Treble-API

This is the workspace for Treble API. Treble is a music streaming service application that I'm building. This API will become a middleman between a Flutter app frontend and Cloudflare R2/CDN object storage. The API is responsible for making a structured/friendlier responses for the Flutter app to receive by utilizing S3 API from Cloudflare R2.

## Storage Scenario Expalanation (Context)
The R2 storage contains music files in flac format separated per album/singles. So, at the root directory, there will be only folders. Those folders could be for a single, or could be for an album. In each folder, lies the flac file(s) and the cover.* image file. The image file's extension can be anything, but it'll always be an image and the file name will always be cover. So, it could be: cover.jpeg, cover.png, cover.jpg, etc.

In addition, each flac file contains metadata embedded. Please utilize them.

For example scenario. Let's say I have a single called "White Roses" and an album called "Demos". The root of the bucket is will contain a folder named "White Roses" and "Demos".

In the folder "White Roses", the files within are:
- white roses.flac
- cover.jpeg

In the folder "Demos", the files within are:
- petrified.flac
- tuples stones.flac
- archnemesis.flac
- from the steps beyond the hill.flac
- cover.png

## Tech Stack
1. PNPM as package manager
2. Fastify for Framework
3. AWS SDK for the S3Client
4. TypeScript