# Supabase court cache setup

1. Create a Supabase project in the Dashboard.
2. From this `findCourts` directory, authenticate and link the project:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Apply the database migration and deploy the function:

   ```powershell
   npx supabase db push
   npx supabase functions deploy get-courts --use-api
   npx supabase functions deploy search-courts --use-api
   ```

4. Copy `.env.example` to `.env`, then replace its placeholders using the
   Project URL and publishable key shown by the Supabase Connect dialog.

5. Restart Expo so it loads the environment variables:

   ```powershell
   npx expo start --clear
   ```

The publishable key is intended for mobile clients. Never place a Supabase
secret key or legacy service-role key in an `EXPO_PUBLIC_` variable.

The `get-courts` function divides requests into 0.1-degree coverage tiles. A
tile is fetched from Overpass only when it has not been stored at the current
data version. This lets a schema or enrichment update refresh each area once as
users revisit it. Nearby-address enrichment continues as background work so it
does not hold up the initial map response. Court coverage and address status are
tracked separately: a failed address request does not refetch the base courts,
and another address attempt cannot be claimed until the 24-hour cooldown has
elapsed. `search-courts` provides suggestions from courts already in the
database and does not call Overpass. Database tables have row-level security
enabled and are not directly readable or writable by the mobile client; all
access is mediated by the Edge Functions.
