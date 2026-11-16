// Generated from internal/options.ts by scripts/auth-schema.ts. Do not edit.
/** Better Auth's tables, each statement safe to run again. */
export const SCHEMA: ReadonlyArray<string> = [
  "create table if not exists \"auth_user\" (\"id\" text not null primary key, \"name\" text not null, \"email\" text not null unique, \"emailVerified\" integer not null, \"image\" text, \"createdAt\" date not null, \"updatedAt\" date not null)",
  "create table if not exists \"auth_session\" (\"id\" text not null primary key, \"expiresAt\" date not null, \"token\" text not null unique, \"createdAt\" date not null, \"updatedAt\" date not null, \"ipAddress\" text, \"userAgent\" text, \"userId\" text not null references \"auth_user\" (\"id\") on delete cascade)",
  "create table if not exists \"auth_account\" (\"id\" text not null primary key, \"accountId\" text not null, \"providerId\" text not null, \"userId\" text not null references \"auth_user\" (\"id\") on delete cascade, \"accessToken\" text, \"refreshToken\" text, \"idToken\" text, \"accessTokenExpiresAt\" date, \"refreshTokenExpiresAt\" date, \"scope\" text, \"password\" text, \"createdAt\" date not null, \"updatedAt\" date not null)",
  "create table if not exists \"auth_verification\" (\"id\" text not null primary key, \"identifier\" text not null, \"value\" text not null, \"expiresAt\" date not null, \"createdAt\" date not null, \"updatedAt\" date not null)",
  "create table if not exists \"auth_apikey\" (\"id\" text not null primary key, \"configId\" text not null, \"name\" text, \"start\" text, \"referenceId\" text not null, \"prefix\" text, \"key\" text not null, \"refillInterval\" integer, \"refillAmount\" integer, \"lastRefillAt\" date, \"enabled\" integer, \"rateLimitEnabled\" integer, \"rateLimitTimeWindow\" integer, \"rateLimitMax\" integer, \"requestCount\" integer, \"remaining\" integer, \"lastRequest\" date, \"expiresAt\" date, \"createdAt\" date not null, \"updatedAt\" date not null, \"permissions\" text, \"metadata\" text)",
  "create index if not exists \"auth_session_userId_idx\" on \"auth_session\" (\"userId\")",
  "create index if not exists \"auth_account_userId_idx\" on \"auth_account\" (\"userId\")",
  "create index if not exists \"auth_verification_identifier_idx\" on \"auth_verification\" (\"identifier\")",
  "create index if not exists \"auth_apikey_configId_idx\" on \"auth_apikey\" (\"configId\")",
  "create index if not exists \"auth_apikey_referenceId_idx\" on \"auth_apikey\" (\"referenceId\")",
  "create index if not exists \"auth_apikey_key_idx\" on \"auth_apikey\" (\"key\")"
];
