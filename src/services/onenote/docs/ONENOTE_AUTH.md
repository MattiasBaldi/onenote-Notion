# OneNote Export Auth Guide

This exporter uses Microsoft Graph delegated authentication. It does **not** use an API key.

## What you need

- A Microsoft account with access to the notebooks you want to export
- A Microsoft Entra ID app registration
- The app's client ID

## One-time setup

1. Open the Microsoft Entra admin center / Azure portal.
2. Create a new app registration.
3. Copy the app's `Application (client) ID`.
4. Add Microsoft Graph delegated permissions:
   - `User.Read`
   - `Notes.Read`
   - `offline_access`
5. Grant consent if your tenant requires it.

## Recommended way to get an access token

Use the device-code flow built into the script.

```bash
export ONENOTE_CLIENT_ID="your-app-client-id"
npm run export
```

If your tenant is not the default one, set the tenant as well:

```bash
export ONENOTE_CLIENT_ID="your-app-client-id"
export ONENOTE_TENANT_ID="your-tenant-id-or-common"
npm run export
```

When the script runs, it prints a Microsoft login message. Open the URL, enter the code, sign in, and the script exchanges that for an access token automatically.

## If you already have a token

You can pass it directly:

```bash
export ONENOTE_ACCESS_TOKEN="your-access-token"
npm run export
```

Or:

```bash
npm run export -- --token "your-access-token"
```

## Notes

- There is no API key option for this exporter.
- The token must be a Microsoft Graph access token.
- If access is denied, check that the app has the right delegated permissions and that the signed-in account can read the notebooks.
