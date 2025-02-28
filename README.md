# Treble-API
This is the workspace for Treble API. Treble is a music streaming service application that I'm building. This API serves as a middleman between a Flutter app frontend, a PostgreSQL database for metadata, and Cloudflare R2/CDN object storage for media content. The API is responsible for making structured/friendlier responses for the Flutter app by combining metadata from PostgreSQL with pre-signed URLs for media access from R2.

## Architecture
The API follows a modern architecture that separates concerns:
1. **PostgreSQL Database** - Stores all metadata including artists, albums, and songs information
2. **Cloudflare R2 Storage** - Stores only the actual media files (music and images)
3. **API Server** - Retrieves metadata from PostgreSQL and generates pre-signed URLs for R2 content access

This architecture significantly improves performance by:
- Reducing expensive R2 operations for metadata retrieval
- Minimizing the need for excessive caching
- Allowing for faster initial load times
- Enabling more complex queries against structured data

## Storage Structure (R2)
The R2 storage contains music files in flac format separated per album/singles. At the root directory, there are only folders. These folders represent singles or albums. In each folder, lies the flac file(s) and the cover.* image file. The image file's extension can vary, but it'll always be an image and the file name will always be 'cover' (e.g., cover.jpeg, cover.png, cover.jpg).

Each flac file also contains embedded metadata that was used for the initial database population.

For example scenario:
- Single: "White Roses" folder contains:
  - white roses.flac
  - cover.jpeg
- Album: "Demos" folder contains:
  - petrified.flac
  - tuples stones.flac
  - archnemesis.flac
  - from the steps beyond the hill.flac
  - cover.png

## Database Structure
The PostgreSQL database contains three main tables:
1. **Artists** - Information about music artists
2. **Albums** - Information about music albums
3. **Songs** - Individual song metadata with references to artists and albums

See SQL_INFO.md for detailed schema information.

## Tech Stack
1. PNPM as package manager
2. Fastify for Framework
3. AWS SDK for the S3Client
4. PostgreSQL for metadata storage (hosted on Supabase)
5. TypeScript