# Royal Epoxi App — Product Specification

## Core workflow
Lead -> Cliente -> Visita -> Medições -> Orçamento -> Aceite/Recusa -> Obra -> Diário de obra -> Pagamento -> Rentabilidade.

## Roles
- Admin: acesso total e configuração
- Orçamentista: clientes, visitas, medições, materiais e orçamentos
- Responsável de obra: obras, equipas, horas, materiais, fotos e extras
- Financeiro: caixa, compras, pagamentos e relatórios financeiros
- Funcionário: tarefas e registos autorizados

## Main entities
- User
- Role / Permission
- Lead
- Client
- SiteVisit
- Measurement
- Material
- MaterialPriceHistory
- Supplier
- Quote
- QuoteLine
- QuoteVersion
- Project
- ProjectChange / ExtraWork
- WorkLog
- EmployeeTime
- Purchase
- StockMovement
- Expense
- Payment
- Vehicle
- Equipment
- Attachment
- AuditLog

## Quote calculation
Direct material cost + labour cost + transport + equipment + subcontracting + other direct costs = estimated project cost.

Selling price - estimated/actual project cost = profit.

Profit / selling price * 100 = margin percentage.

The system must keep both planned and actual values so margin can be monitored during the project.

## Important business rules
1. Accepted quotes can be converted into projects without re-entering data.
2. Quote versions must remain immutable after customer acceptance.
3. Project changes/extras are tracked separately from the original quote.
4. Actual material consumption and employee hours update project profitability.
5. Every sensitive change is recorded in an audit log.
6. Material prices are configurable and have historical prices.
7. The app must be mobile-friendly for site visits.
8. Site visit data should support offline capture and later synchronization.
9. Customer-facing quotes are generated as professional PDFs.
10. Financial reports support day, month, year and custom periods.
