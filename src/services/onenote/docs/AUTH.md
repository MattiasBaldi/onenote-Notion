# OneNote auth notes

The exporter uses Microsoft Graph delegated auth with device-code flow.

## Current setup

- App registration in Entra ID
- Delegated Graph permissions
- Public client flows enabled
- Cached refresh token stored in the user cache directory

## Default scopes

- `User.Read`
- `Notes.Read`
- `offline_access`

## Relevant docs

- Device code flow: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code
- Supported account types: https://learn.microsoft.com/en-us/entra/identity-platform/howto-modify-supported-accounts
