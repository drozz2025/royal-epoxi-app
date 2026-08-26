# Royal Epoxi App — Implementation status

Implemented foundations:
- Responsive management dashboard
- Domain types for roles, clients, materials, quotes, projects, work logs, extras, cash, suppliers and purchases
- Quote and project profitability calculation functions
- Client management route
- Project management route
- Quote calculator route
- Material catalogue route
- Employee roles/permissions route
- Cash management route
- Profitability reporting route

Business workflow:
Lead -> Client -> Site visit/measurement -> Quote -> Acceptance -> Project -> Work logs/materials/extras -> Payment -> Profitability.

Production requirements still dependent on deployment infrastructure:
- Authentication provider and password reset
- Persistent PostgreSQL/Supabase connection and migrations
- File/photo storage
- PDF generation and electronic acceptance
- Email/WhatsApp integrations
- Offline mobile synchronization
- Invoicing/accounting integration
- Automated tests and CI
