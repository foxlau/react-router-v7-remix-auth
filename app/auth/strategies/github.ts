/**
 * GitHub OAuth 2.0 strategy for Remix Auth
 * @see https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
 * @see https://docs.github.com/en/rest/users/users
 */

import type { OAuth2Tokens } from "arctic";
import { OAuth2Strategy } from "remix-auth-oauth2";

export type GitHubProfile = {
  id: string;
  displayName: string;
  username: string;
  profileUrl: string;
  photos: [{ value: string }];
  emails: Array<{ value: string }>;
  _json: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    url: string;
    html_url: string;
    name: string;
    email: string | null;
    bio: string;
  };
};

export type GitHubStrategyOptions = {
  clientId: string;
  clientSecret: string;
  redirectURI: string;
  scopes?: string[];
};

export const GitHubStrategyDefaultScopes = ["user:email"];
export const GitHubStrategyDefaultName = "github";

export class GitHubStrategy<User> extends OAuth2Strategy<User> {
  name = GitHubStrategyDefaultName;

  constructor(
    { clientId, clientSecret, redirectURI, scopes }: GitHubStrategyOptions,
    verify: OAuth2Strategy<User>["verify"],
  ) {
    super(
      {
        clientId,
        clientSecret,
        redirectURI,
        authorizationEndpoint: "https://github.com/login/oauth/authorize",
        tokenEndpoint: "https://github.com/login/oauth/access_token",
        scopes: scopes ?? GitHubStrategyDefaultScopes,
      },
      verify,
    );
  }

  static async userProfile(tokens: OAuth2Tokens): Promise<GitHubProfile> {
    const headers = {
      Authorization: `Bearer ${tokens.accessToken()}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "remix-auth-github",
    };

    const [userResponse, emailsResponse] = await Promise.all([
      fetch("https://api.github.com/user", { headers }),
      fetch("https://api.github.com/user/emails", { headers }),
    ]);

    if (!userResponse.ok || !emailsResponse.ok) {
      throw new Error(
        `Failed to fetch user profile: ${userResponse.statusText || emailsResponse.statusText}`,
      );
    }

    const raw: GitHubProfile["_json"] = await userResponse.json();

    const emails: Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }> = await emailsResponse.json();

    const primaryEmail =
      emails.find((email) => email.primary && email.verified)?.email ||
      emails.find((email) => email.verified)?.email;

    return {
      id: raw.id.toString(),
      displayName: raw.name || raw.login,
      username: raw.login,
      profileUrl: raw.html_url,
      photos: [{ value: raw.avatar_url }],
      emails: primaryEmail ? [{ value: primaryEmail }] : [],
      _json: {
        ...raw,
        email: primaryEmail || null,
      },
    };
  }
}
