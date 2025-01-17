/**
 * Google OAuth 2.0 strategy for Remix Auth
 * @see https://developers.google.com/identity/protocols/oauth2/web-server
 * @see https://developers.google.com/identity/openid-connect/openid-connect
 * @see https://developers.google.com/identity/protocols/oauth2/scopes
 */

import type { OAuth2Tokens } from "arctic";
import { OAuth2Strategy } from "remix-auth-oauth2";

export type GoogleScope = string;

export type GoogleStrategyOptions = {
  clientId: string;
  clientSecret: string;
  redirectURI: string;
  scopes?: GoogleScope[];
  accessType?: "online" | "offline";
  includeGrantedScopes?: boolean;
  prompt?: "none" | "consent" | "select_account";
  hd?: string;
  loginHint?: string;
};

export type GoogleProfile = {
  id: string;
  displayName: string;
  name: {
    familyName: string;
    givenName: string;
  };
  emails: [{ value: string }];
  photos: [{ value: string }];
  _json: {
    sub: string;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    email: string;
    email_verified: boolean;
    locale: string;
    hd?: string;
  };
};

export type GoogleExtraParams = {
  expires_in: 3920;
  token_type: "Bearer";
  scope: string;
  id_token: string;
} & Record<string, string | number>;

export const GoogleStrategyDefaultScopes = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
];
export const GoogleStrategyDefaultName = "google";

export class GoogleStrategy<User> extends OAuth2Strategy<User> {
  public name = GoogleStrategyDefaultName;

  private readonly accessType: string;

  private readonly prompt?: "none" | "consent" | "select_account";

  private readonly includeGrantedScopes: boolean;

  private readonly hd?: string;

  private readonly loginHint?: string;

  constructor(
    {
      clientId,
      clientSecret,
      redirectURI,
      scopes,
      accessType,
      includeGrantedScopes,
      prompt,
      hd,
      loginHint,
    }: GoogleStrategyOptions,
    verify: OAuth2Strategy<User>["verify"],
  ) {
    super(
      {
        clientId,
        clientSecret,
        redirectURI,
        authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenEndpoint: "https://oauth2.googleapis.com/token",
        scopes: scopes ?? GoogleStrategyDefaultScopes,
      },
      verify,
    );
    this.accessType = accessType ?? "online";
    this.includeGrantedScopes = includeGrantedScopes ?? false;
    this.prompt = prompt;
    this.hd = hd;
    this.loginHint = loginHint;
  }

  protected authorizationParams(params: URLSearchParams): URLSearchParams {
    const newParams = new URLSearchParams(params);
    newParams.set("access_type", this.accessType);
    newParams.set("include_granted_scopes", String(this.includeGrantedScopes));
    if (this.prompt) newParams.set("prompt", this.prompt);
    if (this.hd) newParams.set("hd", this.hd);
    if (this.loginHint) newParams.set("login_hint", this.loginHint);
    return newParams;
  }

  static async userProfile(tokens: OAuth2Tokens): Promise<GoogleProfile> {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken()}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.statusText}`);
    }

    const raw: GoogleProfile["_json"] = await response.json();

    return {
      id: raw.sub,
      displayName: raw.name,
      name: {
        familyName: raw.family_name,
        givenName: raw.given_name,
      },
      emails: [{ value: raw.email }],
      photos: [{ value: raw.picture }],
      _json: raw,
    };
  }
}
