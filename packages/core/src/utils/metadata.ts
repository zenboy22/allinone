// import { Env } from './env';
// import { Cache } from './cache';

// export type Metadata = {
//   title: string;
//   year: string;
//   imdbId: string;
//   tmdbId: string;
//   type: string;
// };

// const metadataCache = Cache.getInstance<string, Metadata>('metadata');

// const API_BASE_URL = 'https://api.themoviedb.org/3';
// const FIND_BY_ID_PATH = '/find';
// const MOVIE_DETAILS_PATH = '/movie';
// const TV_DETAILS_PATH = '/tv';

// export class TMDBMetadata {
//   private readonly TMDB_ID_REGEX = /^(?:tmdb):(\d+)$/;
//   private readonly IMDB_ID_REGEX = /^(?:tt)\d+$/;
//   private readonly SUPPORTED_ID_REGEXES = [this.TMDB_ID_REGEX, this.IMDB_ID_REGEX];

//   public constructor(private readonly type: 'movie' | 'tv', private readonly id: string) {
//     if (!Env.TMDB_ACCESS_TOKEN) {
//       throw new Error('TMDB Access Token is not set');
//     }
//     if (!this.isSupportedId(this.id)) {
//       throw new Error('Invalid metadata id');
//     }
//   }

//   private isSupportedId(id: string): boolean {
//     return this.SUPPORTED_ID_REGEXES.some((regex) => regex.test(id));
//   }

//   public async fetch(): Promise<Metadata> {
//     if (this.isTmdbId()) {
//       return this.getTmdbMetadata();
//     }
//     return this.getExternalMetadata();
//   }

//   private isTmdbId(): boolean {
//     return this.TMDB_ID_REGEX.test(this.id);
//   }

//   private getExternalMetadata(): Promise<Metadata> {
//     const url = new URL(API_BASE_URL + FIND_BY_ID_PATH + `/${this.id}`);
//     url.searchParams.set('external_source', 'imdb_id')

//     const response = await fetch(url, {
//       headers: {
//         Authorization: `Bearer ${Env.TMDB_ACCESS_TOKEN}`,
//       },
//     });

//     if (!response.ok) {
//       throw new Error('Failed to fetch metadata');
//     }

//     const data = await response.json();

// }
