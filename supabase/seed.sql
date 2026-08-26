insert into clients (name,company,nif,phone,email,address) values
('Cliente Demonstração A','Empresa A','PT999999990','910000001','cliente.a@example.com','Maia'),
('Cliente Demonstração B','Empresa B','PT999999991','910000002','cliente.b@example.com','Porto')
on conflict do nothing;

insert into materials (name,unit,cost,yield_per_unit,waste_pct,stock,min_stock) values
('Primário Epóxi','kg',8.50,4,8,100,20),
('Resina Epóxi Industrial','kg',11.90,2,8,200,30),
('Verniz PU','L',14.50,6,5,80,15)
on conflict do nothing;
