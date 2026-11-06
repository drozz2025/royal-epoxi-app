-- Read-only reconciliation inventory. Run on source and restored target.
-- Counts are only one gate; verify foreign keys, hashes, totals and storage bytes too.
SELECT 'audit_logs' AS table_name, count(*) AS exact_rows FROM public."audit_logs"
UNION ALL
SELECT 'cash_movements' AS table_name, count(*) AS exact_rows FROM public."cash_movements"
UNION ALL
SELECT 'clients' AS table_name, count(*) AS exact_rows FROM public."clients"
UNION ALL
SELECT 'company_settings' AS table_name, count(*) AS exact_rows FROM public."company_settings"
UNION ALL
SELECT 'doc_counters' AS table_name, count(*) AS exact_rows FROM public."doc_counters"
UNION ALL
SELECT 'documents' AS table_name, count(*) AS exact_rows FROM public."documents"
UNION ALL
SELECT 'material_movements' AS table_name, count(*) AS exact_rows FROM public."material_movements"
UNION ALL
SELECT 'materials' AS table_name, count(*) AS exact_rows FROM public."materials"
UNION ALL
SELECT 'measurement_changes' AS table_name, count(*) AS exact_rows FROM public."measurement_changes"
UNION ALL
SELECT 'measurements' AS table_name, count(*) AS exact_rows FROM public."measurements"
UNION ALL
SELECT 'notifications' AS table_name, count(*) AS exact_rows FROM public."notifications"
UNION ALL
SELECT 'payments' AS table_name, count(*) AS exact_rows FROM public."payments"
UNION ALL
SELECT 'photos' AS table_name, count(*) AS exact_rows FROM public."photos"
UNION ALL
SELECT 'profiles' AS table_name, count(*) AS exact_rows FROM public."profiles"
UNION ALL
SELECT 'quote_expenses' AS table_name, count(*) AS exact_rows FROM public."quote_expenses"
UNION ALL
SELECT 'quote_extras' AS table_name, count(*) AS exact_rows FROM public."quote_extras"
UNION ALL
SELECT 'quote_items' AS table_name, count(*) AS exact_rows FROM public."quote_items"
UNION ALL
SELECT 'quote_labour' AS table_name, count(*) AS exact_rows FROM public."quote_labour"
UNION ALL
SELECT 'quote_templates' AS table_name, count(*) AS exact_rows FROM public."quote_templates"
UNION ALL
SELECT 'quotes' AS table_name, count(*) AS exact_rows FROM public."quotes"
UNION ALL
SELECT 'session_activity' AS table_name, count(*) AS exact_rows FROM public."session_activity"
UNION ALL
SELECT 'supplier_invoice_payments' AS table_name, count(*) AS exact_rows FROM public."supplier_invoice_payments"
UNION ALL
SELECT 'supplier_invoices' AS table_name, count(*) AS exact_rows FROM public."supplier_invoices"
UNION ALL
SELECT 'suppliers' AS table_name, count(*) AS exact_rows FROM public."suppliers"
UNION ALL
SELECT 'timeline_events' AS table_name, count(*) AS exact_rows FROM public."timeline_events"
UNION ALL
SELECT 'user_roles' AS table_name, count(*) AS exact_rows FROM public."user_roles"
UNION ALL
SELECT 'visits' AS table_name, count(*) AS exact_rows FROM public."visits"
UNION ALL
SELECT 'work_expenses' AS table_name, count(*) AS exact_rows FROM public."work_expenses"
UNION ALL
SELECT 'work_extras' AS table_name, count(*) AS exact_rows FROM public."work_extras"
UNION ALL
SELECT 'work_hours' AS table_name, count(*) AS exact_rows FROM public."work_hours"
UNION ALL
SELECT 'work_materials' AS table_name, count(*) AS exact_rows FROM public."work_materials"
UNION ALL
SELECT 'works' AS table_name, count(*) AS exact_rows FROM public."works";
