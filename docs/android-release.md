# FOXA Android / Google Play release preparation

## Source-of-truth gate
The current repository README describes an unauthenticated local Next.js/Prisma prototype. Do not ship it as FOXA. Identify and audit the actual production FOXA frontend before integrating Android.

## Recommended architecture
- Package the audited production frontend with Capacitor and a local web asset bundle (not a remote-only WebView).
- Cache the application shell and necessary assets; offline mutations require an explicit IndexedDB/SQLite queue, conflict resolution, and Supabase synchronization.
- Keep all authorization in Supabase RLS/server-side checks, never rely on client-side role flags.
- Choose a permanent unique applicationId before the first Play upload.
- targetSdkVersion must satisfy the Google Play requirements in force on submission day.

## Release signing
1. Generate an upload key on a trusted machine, retain encrypted backups offline.
2. Enroll in Google Play App Signing; keep the upload key separate from Google's app signing key.
3. Store upload keystore as base64 in GitHub Actions secret ANDROID_KEYSTORE_BASE64.
4. Store ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS and ANDROID_KEY_PASSWORD as separate secrets.
5. Never commit keys, passwords, service account JSON, or Supabase service-role keys.
6. Build release AAB with Gradle and upload it first to Play internal testing.
7. Increase versionCode for every new Play upload; versionName is user-facing.

## Update strategy
- Google Play distributes Android binary updates automatically according to device/Play settings.
- Production web deployment is not equivalent to a native app update.
- If Play In-App Updates is implemented, use the official Play Core API and only offer updates distributed through Play.
- Run staged rollouts with a rollback plan (roll forward with a new versionCode; Play cannot simply downgrade installed apps).

## Before public release
- Verify real FOXA repository, production authentication, Supabase RLS, storage policies, offline behavior, privacy policy, data safety, permissions, account deletion applicability, accessibility and icon.
- Complete Play Console identity verification and required testing tracks.
- Run signed release build and install tests; verify signature and AAB with bundletool.
- Obtain Play Console approval. No signed AAB is produced by this document.
