# PostgreSQL DB Information

This documentation provides information about the schema of Treble's PSQL database at Supabase. This database is storing the metadata of the songs so that the API can call metadata from the DB instead of listing directly from R2. This is done in order to reduce request speed and reduce caching. Therefore, the API will only be doing R2 calls to retrieve media content, not metadata.

## Tables
### Albums
- id: bigint/int8 NOT NULL -> primary key auto serial
- name: varchar NOT NULL -> name of the album
- cover_path: varchar NULLABLE-> path of album cover at R2
- created_at: timestampz NOT NULL -> defaulted to now()
- updated_at: timestampz NOT NULL -> defaulted to now()

### Artists
- id: bigint/int8 NOT NULL -> primary key auto serial
- name: varchar UNIQUE NOT NULL -> name of the artist
- image_path: varchar NULLABLE -> path of artist profile image at R2
- biography: text NULLABLE -> to store artist's biography
- created_at: timestampz NOT NULL -> defaulted to now()
- updated_at: timestampz NOT NULL -> defaulted to now()

### Songs
- id: bigint/int8 NOT NULL -> primary key auto serial
- title: varchar NOT NULL -> title of the song
- artist_id: int8 NOT NULL -> refers to artists table id
- album_id: int8 NOT NULL -> refers to albums table id
- duration: float8 NOT NULL -> stores duration of songs (represented in seconds)
- track_number: int2 NOT NULL -> the order of the song in the album
- path: varchar UNIQUE NOT NULL -> path of song file at R2
- created_at: timestampz NOT NULL -> defaulted to now()
- updated_at: timestampz NOT NULL -> defaulted to now()