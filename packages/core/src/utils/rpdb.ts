import { makeRequest } from './http';

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
    const idType = id.startsWith('tt')
      ? 'imdb'
      : id.startsWith('tmdb:')
        ? 'tmdb'
        : id.startsWith('tvdb:')
          ? 'tvdb'
          : null;
    let idValue = id.startsWith('tt') ? id : id.split(':')[1];
    if (idType === 'tmdb') {
      idValue = `${type}-${idValue}`;
    }
    if (!idType || !idValue) {
      return null;
    }
    const posterUrl = `https://api.ratingposterdb.com/${this.apiKey}/${idType}/poster-default/${idValue}.jpg?fallback=true`;
    return posterUrl;
  }
}
