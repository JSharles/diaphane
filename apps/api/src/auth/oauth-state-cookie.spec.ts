import {
  oauthFlowCookieName,
  oauthFlowCookieOptions,
  parseOAuthFlowCookie,
  safeReturnTo,
  serializeOAuthFlowCookie,
} from './oauth-state-cookie';

describe('oauth flow cookie', () => {
  it('scopes each provider’s cookie to its own routes', () => {
    expect(oauthFlowCookieName('github')).toBe('github_oauth_flow');
    expect(oauthFlowCookieOptions('github').path).toBe('/auth/github');
    expect(oauthFlowCookieName('notion')).toBe('notion_oauth_flow');
    expect(oauthFlowCookieOptions('notion').path).toBe('/connections/notion');
  });

  it('round-trips state, locale and an in-app return path', () => {
    const raw = serializeOAuthFlowCookie({
      state: 's',
      locale: 'fr',
      returnTo: '/projects/p-1',
    });

    expect(parseOAuthFlowCookie(raw)).toEqual({
      state: 's',
      locale: 'fr',
      returnTo: '/projects/p-1',
    });
  });

  it('drops a return path that would leave the app', () => {
    const raw = serializeOAuthFlowCookie({
      state: 's',
      locale: 'fr',
      returnTo: '//evil.example/x',
    });

    expect(parseOAuthFlowCookie(raw)).toEqual({ state: 's', locale: 'fr' });
  });

  it('returns null for a missing or malformed cookie', () => {
    expect(parseOAuthFlowCookie(undefined)).toBeNull();
    expect(parseOAuthFlowCookie('not json')).toBeNull();
    expect(parseOAuthFlowCookie('"a string"')).toBeNull();
    expect(parseOAuthFlowCookie(JSON.stringify({ state: 's' }))).toBeNull();
  });

  it('safeReturnTo accepts only paths inside the app', () => {
    expect(safeReturnTo('/profile')).toBe('/profile');
    expect(safeReturnTo('https://evil.example')).toBeUndefined();
    expect(safeReturnTo('/\\evil.example')).toBeUndefined();
    expect(safeReturnTo(42)).toBeUndefined();
  });
});
