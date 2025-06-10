import { makeRequest } from './http';

export type IdType = 'imdb' | 'tmdb' | 'tvdb';

interface Id {
  type: IdType;
  value: string;
}

export class RPDB {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    if (!this.apiKey) {
      throw new Error('RPDB API key is not set');
    }
  }

  public async validateApiKey() {
    const response = await makeRequest(
      `https://api.ratingposterdb.com/${this.apiKey}/isValid`,
      5000
    );
    if (!response.ok) {
      throw new Error(
        `Invalid RPDB API key: ${response.status} - ${response.statusText}`
      );
    }
  }
  /**
   *
   * @param id - the id of the item to get the poster for, if it is of a supported type, the rpdb poster will be returned, otherwise null
   */
  public getPosterUrl(type: string, id: string): string | null {
    const parsedId = this.parseId(id);
    if (!parsedId) {
      return null;
    }
    if (parsedId.type === 'tvdb' && type === 'movie') {
      // rpdb doesnt seem to support tvdb for movies
      return null;
    }
    const posterUrl = `https://api.ratingposterdb.com/${this.apiKey}/${parsedId.type}/poster-default/${parsedId.value}.jpg?fallback=true`;
    return posterUrl;
  }

  private parseId(id: string): Id | null {
    if (id.startsWith('tt')) {
      return { type: 'imdb', value: id };
    }
    if (id.startsWith('tmdb:')) {
      return { type: 'tmdb', value: id.split(':')[1] };
    }
    if (id.startsWith('tvdb:')) {
      return { type: 'tvdb', value: id.split(':')[1] };
    }
    return null;
  }
}
