

DASHBOARD / CUSTOMER DATA SETUP
================================
Files added:
- dashboard.html
- assets/js/lead-store.js
- assets/js/dashboard.js
- supabase/config.js
- supabase/schema.sql

IMPORTANT:
This site was originally a static HTML site and had no server/database. A secure
dashboard cannot be made secure by HTML alone. This version uses Supabase Auth
+ PostgreSQL Row Level Security (RLS). Customer browsers can submit leads but
cannot read them. The dashboard requires the configured admin account.

SETUP:
1. Create a free Supabase project.
2. In Supabase SQL Editor, open supabase/schema.sql.
3. Replace YOUR_ADMIN_EMAIL with the exact email you will use for dashboard login.
4. Run the SQL.
5. In Supabase Authentication, create that admin user with email/password.
6. Open supabase/config.js and replace YOUR_SUPABASE_PROJECT_URL and
   YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY with your project's URL and
   publishable/anon key. NEVER put a service_role/secret key here.
7. Deploy the Azora folder.
8. Open /dashboard.html and sign in.

CURRENT DATA CAPTURE:
- Quote form submissions are sent to the database.
- The existing success-page/localStorage behavior is preserved.
- The current project does NOT contain an Add to Cart implementation, so there
  is no cart event to capture yet. When a cart is added, the same lead-store
  function can be used to record cart activity.

SECURITY NOTE:
No system can honestly promise "impossible to hack". This setup is designed
so the public key may be present in frontend code while RLS protects database
rows, and the service/secret key is never exposed to visitors.
