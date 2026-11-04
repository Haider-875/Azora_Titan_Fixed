AZORA PRO ADMIN DASHBOARD

What changed:
- Dashboard redesigned with Overview, Leads, Hardware, Reports & Analytics.
- Dark/Light theme toggle (saved in browser).
- 7-day activity chart and monthly reports.
- Hardware Catalog Manager: add/edit/hide/publish/delete cards.
- Image URL field + Supabase Storage image upload.
- Existing 10 hardware cards are automatically imported into the new catalog table the first time Hardware is opened, if the table is empty.
- Public hardware.html automatically reads active cards from Supabase and keeps the existing visual card style.
- Existing lead/Supabase setup preserved.

ONE-TIME SUPABASE STEP:
Run: supabase/catalog.sql in Supabase SQL Editor.

The catalog policies use admin@gmail.com, matching the dashboard admin account shown during setup. Do not put a service_role/secret key in the website.
