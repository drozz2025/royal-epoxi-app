--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.6 (Debian 18.6-3)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'ADMIN',
    'ORCAMENTISTA',
    'OBRA',
    'FINANCEIRO',
    'FUNCIONARIO'
);


--
-- Name: apply_material_movement_to_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_material_movement_to_stock() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  delta numeric;
  current_stock numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    delta := CASE WHEN OLD.tipo = 'entrada' THEN -OLD.quantidade ELSE OLD.quantidade END;
    UPDATE public.materials SET stock = stock + delta WHERE id = OLD.material_id;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    UPDATE public.materials
       SET stock = stock + CASE WHEN OLD.tipo = 'entrada' THEN -OLD.quantidade ELSE OLD.quantidade END
     WHERE id = OLD.material_id;
  END IF;

  SELECT stock INTO current_stock FROM public.materials WHERE id = NEW.material_id FOR UPDATE;
  delta := CASE WHEN NEW.tipo = 'entrada' THEN NEW.quantidade ELSE -NEW.quantidade END;
  IF current_stock + delta < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente para este consumo.';
  END IF;
  UPDATE public.materials SET stock = stock + delta WHERE id = NEW.material_id;
  RETURN NEW;
END;
$$;


--
-- Name: can_write(public.app_role[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_write(_roles public.app_role[]) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.is_active_user() AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND (ur.role = 'ADMIN' OR ur.role = ANY(_roles))
  );
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_count INT; v_first BOOLEAN; v_nome TEXT;
BEGIN
  SELECT count(*) INTO v_count FROM public.user_roles;
  v_first := (v_count = 0);
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1));

  INSERT INTO public.profiles (user_id, nome, email, ativo)
  VALUES (NEW.id, v_nome, NEW.email, v_first)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN v_first THEN 'ADMIN'::public.app_role ELSE 'FUNCIONARIO'::public.app_role END)
  ON CONFLICT DO NOTHING;

  IF NOT v_first THEN
    INSERT INTO public.notifications (titulo, mensagem, tipo, link)
    VALUES ('Novo utilizador aguarda aprovação', v_nome || ' (' || NEW.email || ') registou-se e aguarda aprovação.', 'info', '/funcionarios');
  END IF;

  RETURN NEW;
END; $$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;


--
-- Name: is_active_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_active_user() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND ativo);
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN');
$$;


--
-- Name: next_doc_number(text, boolean, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.next_doc_number(_prefix text, _with_year boolean DEFAULT true, _pad integer DEFAULT 4) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_year INT; v_val INT;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_active_user() THEN RAISE EXCEPTION 'Active employee required' USING ERRCODE='42501'; END IF;
  v_year := CASE WHEN _with_year THEN EXTRACT(YEAR FROM now())::INT ELSE 0 END;
  INSERT INTO public.doc_counters (prefix, ano, last_value) VALUES (_prefix, v_year, 1)
  ON CONFLICT (prefix, ano) DO UPDATE SET last_value = public.doc_counters.last_value + 1
  RETURNING last_value INTO v_val;
  RETURN CASE WHEN _with_year THEN _prefix||'-'||v_year||'-'||lpad(v_val::TEXT,_pad,'0')
              ELSE _prefix||'-'||lpad(v_val::TEXT,_pad,'0') END;
END; $$;


--
-- Name: quote_valor_venda(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.quote_valor_venda(_quote_id uuid) RETURNS numeric
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE q record; v_subtotal numeric := 0;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id = _quote_id;
  IF q IS NULL THEN RETURN 0; END IF;

  IF q.modo_preco = 'fixo' THEN
    v_subtotal := COALESCE(q.preco_fixo, 0);
  ELSIF q.modo_preco = 'm2' THEN
    v_subtotal := COALESCE(q.preco_m2, 0) * COALESCE(q.area_total, 0);
  ELSE
    v_subtotal :=
      COALESCE((SELECT SUM(qi.quantidade * qi.preco_unitario * (1 - COALESCE(qi.desconto,0)/100))
                  FROM public.quote_items qi WHERE qi.quote_id = _quote_id), 0)
    + COALESCE((SELECT SUM(ql.preco_venda) FROM public.quote_labour ql WHERE ql.quote_id = _quote_id), 0)
    + COALESCE((SELECT SUM(qe.preco_venda) FROM public.quote_expenses qe WHERE qe.quote_id = _quote_id), 0);
  END IF;

  RETURN v_subtotal * (1 - COALESCE(q.desconto_global, 0) / 100);
END;
$$;


--
-- Name: recalc_invoice_estado(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recalc_invoice_estado(_inv uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE _pago numeric; _total numeric; _ult date;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_write('{FINANCEIRO}'::public.app_role[]) THEN RAISE EXCEPTION 'Financial permission required' USING ERRCODE='42501'; END IF;
  SELECT coalesce(sum(valor),0), max(data) INTO _pago, _ult FROM public.supplier_invoice_payments WHERE invoice_id = _inv;
  SELECT valor INTO _total FROM public.supplier_invoices WHERE id = _inv;
  IF _total IS NULL THEN RETURN; END IF;
  UPDATE public.supplier_invoices SET
    estado = CASE WHEN _pago <= 0 THEN 'Pendente' WHEN _pago + 0.005 >= _total THEN 'Paga' ELSE 'Parcial' END,
    data_pagamento = CASE WHEN _pago + 0.005 >= _total AND _pago > 0 THEN _ult ELSE NULL END
  WHERE id = _inv;
END $$;


--
-- Name: sync_invoice_payment_to_cash(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_invoice_payment_to_cash() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE i public.supplier_invoices; _forn text; _desc text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.cash_movements SET anulado = true,
      observacoes = concat_ws(E'\n', observacoes, 'Pagamento de fatura removido; movimento anulado.')
      WHERE invoice_payment_id = OLD.id;
    PERFORM public.recalc_invoice_estado(OLD.invoice_id);
    RETURN OLD;
  END IF;
  SELECT * INTO i FROM public.supplier_invoices WHERE id = NEW.invoice_id;
  SELECT empresa INTO _forn FROM public.suppliers WHERE id = i.supplier_id;
  _forn := coalesce(_forn, i.fornecedor_nome, 'Fornecedor');
  _desc := _forn || CASE WHEN coalesce(i.numero,'') <> '' THEN ' · ' || i.numero ELSE '' END;
  INSERT INTO public.cash_movements (tipo, data, descricao, categoria, work_id, client_id, supplier_id, quote_id,
    valor, metodo, documento, observacoes, anulado, created_by, invoice_payment_id)
  VALUES ('saida', NEW.data, _desc, i.categoria, i.work_id, i.client_id, i.supplier_id, i.quote_id,
    NEW.valor, NEW.metodo, NULLIF(i.numero,''), NEW.observacoes, false, NEW.created_by, NEW.id)
  ON CONFLICT (invoice_payment_id) WHERE invoice_payment_id IS NOT NULL DO UPDATE SET
    data=EXCLUDED.data, valor=EXCLUDED.valor, metodo=EXCLUDED.metodo, observacoes=EXCLUDED.observacoes, anulado=false;
  PERFORM public.recalc_invoice_estado(NEW.invoice_id);
  RETURN NEW;
END $$;


--
-- Name: sync_invoice_to_cash(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_invoice_to_cash() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;


--
-- Name: sync_paid_payment_to_cash(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_paid_payment_to_cash() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.cash_movements
       SET anulado = true,
           observacoes = concat_ws(E'\n', observacoes, 'Pagamento removido; movimento anulado automaticamente.')
     WHERE payment_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.estado = 'Pago' THEN
    INSERT INTO public.cash_movements (
      tipo, data, descricao, categoria, work_id, client_id, valor,
      metodo, observacoes, anulado, created_by, payment_id
    ) VALUES (
      'entrada', NEW.data, NEW.descricao, 'Recebimento', NEW.work_id,
      NEW.client_id, NEW.valor, NEW.metodo, NEW.observacoes, false,
      NEW.created_by, NEW.id
    )
    ON CONFLICT (payment_id) WHERE payment_id IS NOT NULL DO UPDATE SET
      tipo = 'entrada',
      data = EXCLUDED.data,
      descricao = EXCLUDED.descricao,
      categoria = 'Recebimento',
      work_id = EXCLUDED.work_id,
      client_id = EXCLUDED.client_id,
      valor = EXCLUDED.valor,
      metodo = EXCLUDED.metodo,
      observacoes = EXCLUDED.observacoes,
      anulado = false,
      created_by = EXCLUDED.created_by;
  ELSE
    UPDATE public.cash_movements
       SET anulado = true
     WHERE payment_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: sync_quote_costs_to_work(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_quote_costs_to_work(_quote_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_work_id uuid;
  v_created_by uuid;
BEGIN
  SELECT work_id, created_by INTO v_work_id, v_created_by FROM public.quotes WHERE id = _quote_id;
  IF v_work_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.work_materials (
    work_id, material_id, descricao, quantidade, unidade, custo_unitario,
    data, created_by, source_quote_item_id
  )
  SELECT v_work_id, qi.material_id, qi.descricao, qi.quantidade, qi.unidade,
         qi.custo_unitario, CURRENT_DATE, v_created_by, qi.id
    FROM public.quote_items qi
   WHERE qi.quote_id = _quote_id
  ON CONFLICT (source_quote_item_id) WHERE source_quote_item_id IS NOT NULL
  DO UPDATE SET
    material_id = EXCLUDED.material_id,
    descricao = EXCLUDED.descricao,
    quantidade = EXCLUDED.quantidade,
    unidade = EXCLUDED.unidade,
    custo_unitario = EXCLUDED.custo_unitario;

  DELETE FROM public.work_materials wm
   WHERE wm.work_id = v_work_id AND wm.source_quote_item_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.quote_items qi WHERE qi.id = wm.source_quote_item_id AND qi.quote_id = _quote_id);

  INSERT INTO public.work_hours (
    work_id, profile_id, nome, horas, valor_hora, data, created_by, source_quote_labour_id
  )
  SELECT v_work_id, NULL, ql.descricao, ql.trabalhadores * ql.horas, ql.valor_hora, CURRENT_DATE, v_created_by, ql.id
    FROM public.quote_labour ql
   WHERE ql.quote_id = _quote_id
  ON CONFLICT (source_quote_labour_id) WHERE source_quote_labour_id IS NOT NULL
  DO UPDATE SET nome = EXCLUDED.nome, horas = EXCLUDED.horas, valor_hora = EXCLUDED.valor_hora;

  DELETE FROM public.work_hours wh
   WHERE wh.work_id = v_work_id AND wh.source_quote_labour_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.quote_labour ql WHERE ql.id = wh.source_quote_labour_id AND ql.quote_id = _quote_id);

  INSERT INTO public.work_expenses (work_id, categoria, descricao, valor, data, created_by, source_quote_expense_id)
  SELECT v_work_id, qe.categoria, qe.descricao, qe.custo, CURRENT_DATE, v_created_by, qe.id
    FROM public.quote_expenses qe
   WHERE qe.quote_id = _quote_id
  ON CONFLICT (source_quote_expense_id) WHERE source_quote_expense_id IS NOT NULL
  DO UPDATE SET categoria = EXCLUDED.categoria, descricao = EXCLUDED.descricao, valor = EXCLUDED.valor;

  DELETE FROM public.work_expenses we
   WHERE we.work_id = v_work_id AND we.source_quote_expense_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.quote_expenses qe WHERE qe.id = we.source_quote_expense_id AND qe.quote_id = _quote_id);

  UPDATE public.works
     SET custo_previsto =
       COALESCE((SELECT SUM(qi.quantidade * qi.custo_unitario) FROM public.quote_items qi WHERE qi.quote_id = _quote_id), 0)
       + COALESCE((SELECT SUM(ql.trabalhadores * ql.horas * ql.valor_hora) FROM public.quote_labour ql WHERE ql.quote_id = _quote_id), 0)
       + COALESCE((SELECT SUM(qe.custo) FROM public.quote_expenses qe WHERE qe.quote_id = _quote_id), 0),
         valor_contratado = public.quote_valor_venda(_quote_id)
   WHERE id = v_work_id;
END;
$$;


--
-- Name: tg_cash_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_cash_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN IF NEW.numero IS NULL THEN NEW.numero := public.next_doc_number('MOV', true, 4); END IF; RETURN NEW; END; $$;


--
-- Name: tg_client_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_client_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN IF NEW.codigo IS NULL THEN NEW.codigo := public.next_doc_number('CLI', false, 4); END IF; RETURN NEW; END; $$;


--
-- Name: tg_measure_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_measure_history() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.area_atual IS DISTINCT FROM OLD.area_atual THEN
    INSERT INTO public.measurement_changes (measurement_id, area_anterior, area_nova, motivo, changed_by)
    VALUES (OLD.id, OLD.area_atual, NEW.area_atual, NEW.observacoes, auth.uid());
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;


--
-- Name: tg_quote_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_quote_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN IF NEW.numero IS NULL THEN NEW.numero := public.next_doc_number('ORC', true, 4); END IF; RETURN NEW; END; $$;


--
-- Name: tg_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


--
-- Name: tg_sync_quote_costs_to_work(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_sync_quote_costs_to_work() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM public.sync_quote_costs_to_work(COALESCE(NEW.quote_id, OLD.quote_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: tg_sync_quote_link_to_work(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_sync_quote_link_to_work() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.work_id IS NOT NULL AND (
       NEW.work_id IS DISTINCT FROM OLD.work_id
    OR NEW.modo_preco IS DISTINCT FROM OLD.modo_preco
    OR NEW.preco_fixo IS DISTINCT FROM OLD.preco_fixo
    OR NEW.preco_m2 IS DISTINCT FROM OLD.preco_m2
    OR NEW.area_total IS DISTINCT FROM OLD.area_total
    OR NEW.desconto_global IS DISTINCT FROM OLD.desconto_global
  ) THEN
    PERFORM public.sync_quote_costs_to_work(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: tg_visit_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_visit_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN IF NEW.numero IS NULL THEN NEW.numero := public.next_doc_number('VIS', true, 4); END IF; RETURN NEW; END; $$;


--
-- Name: tg_work_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_work_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN IF NEW.numero IS NULL THEN NEW.numero := public.next_doc_number('OBR', true, 4); END IF; RETURN NEW; END; $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    user_nome text,
    accao text NOT NULL,
    tabela text NOT NULL,
    registo_id uuid,
    valor_anterior jsonb,
    valor_novo jsonb,
    descricao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cash_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero text,
    tipo text DEFAULT 'entrada'::text NOT NULL,
    data date DEFAULT CURRENT_DATE NOT NULL,
    descricao text DEFAULT ''::text NOT NULL,
    categoria text DEFAULT 'Outros'::text NOT NULL,
    work_id uuid,
    client_id uuid,
    supplier_id uuid,
    valor numeric DEFAULT 0 NOT NULL,
    metodo text DEFAULT 'Dinheiro'::text NOT NULL,
    documento text,
    observacoes text,
    anulado boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_id uuid,
    invoice_id uuid,
    quote_id uuid,
    invoice_payment_id uuid
);


--
-- Name: COLUMN cash_movements.invoice_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cash_movements.invoice_id IS 'DEPRECATED: replaced by invoice_payment_id';


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo text,
    nome text NOT NULL,
    empresa text,
    nif text,
    telefone text,
    email text,
    morada text,
    codigo_postal text,
    localidade text,
    contacto_principal text,
    observacoes text,
    ativo boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    autoliquidacao boolean DEFAULT false NOT NULL
);


--
-- Name: company_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text DEFAULT 'Royal Epoxi'::text NOT NULL,
    nif text,
    morada text,
    codigo_postal text,
    localidade text,
    telefone text,
    email text,
    website text,
    logo_url text,
    iva_padrao numeric DEFAULT 23 NOT NULL,
    moeda text DEFAULT 'EUR'::text NOT NULL,
    validade_orcamento_dias integer DEFAULT 30 NOT NULL,
    margem_minima numeric DEFAULT 30 NOT NULL,
    condicoes_pagamento text DEFAULT '50% na adjudicação, 50% na conclusão.'::text,
    texto_padrao_orcamento text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sessao_timeout_minutos integer DEFAULT 4 NOT NULL,
    sessao_aviso_segundos integer DEFAULT 30 NOT NULL,
    iban text,
    comercial_padrao text,
    garantia_padrao text,
    notas_importantes_padrao text,
    inclusoes_padrao text,
    exclusoes_padrao text,
    condicoes_gerais_padrao text,
    marca text
);


--
-- Name: doc_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doc_counters (
    prefix text NOT NULL,
    ano integer NOT NULL,
    last_value integer DEFAULT 0 NOT NULL
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    tipo text DEFAULT 'documento'::text NOT NULL,
    storage_path text NOT NULL,
    client_id uuid,
    work_id uuid,
    quote_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: material_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.material_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    material_id uuid NOT NULL,
    tipo text DEFAULT 'entrada'::text NOT NULL,
    quantidade numeric NOT NULL,
    motivo text,
    work_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    work_material_id uuid
);


--
-- Name: materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    fabricante text,
    referencia text,
    categoria text DEFAULT 'Outros'::text NOT NULL,
    unidade text DEFAULT 'kg'::text NOT NULL,
    preco_compra numeric DEFAULT 0 NOT NULL,
    preco_venda numeric DEFAULT 0 NOT NULL,
    rendimento numeric,
    supplier_id uuid,
    stock numeric DEFAULT 0 NOT NULL,
    stock_minimo numeric DEFAULT 0 NOT NULL,
    iva numeric DEFAULT 23 NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    observacoes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    embalagem_qtd numeric,
    embalagem_preco numeric,
    embalagem_com_iva boolean DEFAULT false NOT NULL,
    consumo_por_m2 numeric,
    consumo_unidade text
);


--
-- Name: COLUMN materials.consumo_por_m2; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.materials.consumo_por_m2 IS 'Valor original de consumo por m2 introduzido no formulário.';


--
-- Name: COLUMN materials.consumo_unidade; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.materials.consumo_unidade IS 'Unidade original do consumo: base ou subunidade.';


--
-- Name: measurement_changes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.measurement_changes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    measurement_id uuid NOT NULL,
    area_anterior numeric,
    area_nova numeric,
    motivo text,
    changed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: measurements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.measurements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    visit_id uuid,
    work_id uuid,
    zona text DEFAULT 'Zona 1'::text NOT NULL,
    comprimento numeric,
    largura numeric,
    altura numeric,
    area_inicial numeric DEFAULT 0 NOT NULL,
    area_atual numeric DEFAULT 0 NOT NULL,
    observacoes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo text NOT NULL,
    mensagem text,
    tipo text DEFAULT 'info'::text NOT NULL,
    link text,
    lida boolean DEFAULT false NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_id uuid,
    client_id uuid,
    descricao text DEFAULT 'Pagamento'::text NOT NULL,
    valor numeric DEFAULT 0 NOT NULL,
    data date DEFAULT CURRENT_DATE NOT NULL,
    data_prevista date,
    metodo text DEFAULT 'Transferência'::text NOT NULL,
    estado text DEFAULT 'Pago'::text NOT NULL,
    observacoes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    storage_path text NOT NULL,
    categoria text DEFAULT 'Durante'::text NOT NULL,
    legenda text,
    client_id uuid,
    visit_id uuid,
    work_id uuid,
    measurement_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    nome text DEFAULT ''::text NOT NULL,
    email text DEFAULT ''::text NOT NULL,
    telefone text,
    cargo text,
    foto_url text,
    ativo boolean DEFAULT true NOT NULL,
    ultimo_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    motivo_rejeicao text,
    rejeitado_em timestamp with time zone
);


--
-- Name: quote_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    categoria text DEFAULT 'Outros'::text NOT NULL,
    descricao text DEFAULT ''::text NOT NULL,
    custo numeric DEFAULT 0 NOT NULL,
    preco_venda numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    margem_item numeric,
    oculto_folha boolean DEFAULT false NOT NULL,
    ordem integer DEFAULT 0 NOT NULL,
    area_m2 numeric,
    descricao_detalhe text
);


--
-- Name: COLUMN quote_expenses.area_m2; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quote_expenses.area_m2 IS 'Área em metros quadrados associada ao custo, quando aplicável.';


--
-- Name: COLUMN quote_expenses.descricao_detalhe; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quote_expenses.descricao_detalhe IS 'Descrição adicional opcional apresentada por baixo da linha.';


--
-- Name: quote_extras; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_extras (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    descricao text NOT NULL,
    quantidade numeric DEFAULT 1 NOT NULL,
    unidade text DEFAULT 'un'::text NOT NULL,
    preco_unitario numeric,
    observacoes text,
    ordem integer DEFAULT 1 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quote_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    material_id uuid,
    descricao text NOT NULL,
    quantidade numeric DEFAULT 0 NOT NULL,
    unidade text DEFAULT 'un'::text NOT NULL,
    custo_unitario numeric DEFAULT 0 NOT NULL,
    preco_unitario numeric DEFAULT 0 NOT NULL,
    desconto numeric DEFAULT 0 NOT NULL,
    iva numeric DEFAULT 23 NOT NULL,
    ordem integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    margem_item numeric,
    artigo text,
    oculto_folha boolean DEFAULT false NOT NULL,
    descricao_detalhe text
);


--
-- Name: COLUMN quote_items.descricao_detalhe; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quote_items.descricao_detalhe IS 'Descrição adicional opcional apresentada por baixo da linha.';


--
-- Name: quote_labour; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_labour (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    descricao text DEFAULT 'Mão de obra'::text NOT NULL,
    trabalhadores integer DEFAULT 1 NOT NULL,
    horas numeric DEFAULT 0 NOT NULL,
    valor_hora numeric DEFAULT 0 NOT NULL,
    preco_venda numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    dias numeric DEFAULT 0 NOT NULL,
    margem_item numeric,
    oculto_folha boolean DEFAULT false NOT NULL,
    ordem integer DEFAULT 0 NOT NULL,
    descricao_detalhe text
);


--
-- Name: COLUMN quote_labour.descricao_detalhe; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quote_labour.descricao_detalhe IS 'Descrição adicional opcional apresentada por baixo da linha.';


--
-- Name: quote_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    descricao text,
    margem_recomendada numeric DEFAULT 30 NOT NULL,
    valor_hora numeric DEFAULT 15 NOT NULL,
    horas_por_m2 numeric DEFAULT 0.1 NOT NULL,
    itens jsonb DEFAULT '[]'::jsonb NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero text,
    client_id uuid NOT NULL,
    visit_id uuid,
    work_id uuid,
    titulo text,
    descricao text,
    data date DEFAULT CURRENT_DATE NOT NULL,
    validade date,
    responsavel_id uuid,
    estado text DEFAULT 'Rascunho'::text NOT NULL,
    area_total numeric DEFAULT 0 NOT NULL,
    modo_preco text DEFAULT 'itens'::text NOT NULL,
    preco_m2 numeric,
    preco_fixo numeric,
    desconto_global numeric DEFAULT 0 NOT NULL,
    iva numeric DEFAULT 23 NOT NULL,
    condicoes_pagamento text,
    observacoes text,
    aceite_em timestamp with time zone,
    aceite_por uuid,
    aceite_obs text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    eliminado_em timestamp with time zone,
    localidade_obra text,
    comercial text,
    data_inicio_prevista text,
    duracao_prevista text,
    validade_dias integer,
    garantia_texto text,
    notas_importantes text,
    inclusoes text,
    exclusoes text,
    condicoes_gerais text,
    versao_origem_id uuid,
    versao_numero integer DEFAULT 1 NOT NULL,
    revisado_em timestamp with time zone,
    ordem_blocos text,
    apresentacao_resumida boolean DEFAULT false NOT NULL
);


--
-- Name: COLUMN quotes.apresentacao_resumida; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotes.apresentacao_resumida IS 'Quando true, a folha/PDF do cliente mostra uma unica linha global (chave na mao) em vez das linhas detalhadas.';


--
-- Name: session_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_activity (
    user_id uuid NOT NULL,
    last_seen timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: supplier_invoice_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_invoice_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    valor numeric NOT NULL,
    data date DEFAULT CURRENT_DATE NOT NULL,
    metodo text DEFAULT 'Transferência'::text NOT NULL,
    observacoes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT supplier_invoice_payments_valor_check CHECK ((valor > (0)::numeric))
);


--
-- Name: supplier_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    work_id uuid,
    quote_id uuid,
    supplier_id uuid,
    fornecedor_nome text,
    numero text DEFAULT ''::text NOT NULL,
    data date DEFAULT CURRENT_DATE NOT NULL,
    data_vencimento date,
    data_pagamento date,
    valor numeric DEFAULT 0 NOT NULL,
    categoria text DEFAULT 'Materiais'::text NOT NULL,
    metodo text DEFAULT 'Transferência'::text NOT NULL,
    estado text DEFAULT 'Pendente'::text NOT NULL,
    observacoes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    empresa text NOT NULL,
    nif text,
    contacto text,
    telefone text,
    email text,
    morada text,
    condicoes_pagamento text,
    observacoes text,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: timeline_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timeline_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entidade text NOT NULL,
    entidade_id uuid NOT NULL,
    descricao text NOT NULL,
    user_id uuid,
    user_nome text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero text,
    client_id uuid NOT NULL,
    data date DEFAULT CURRENT_DATE NOT NULL,
    hora time without time zone,
    funcionario_id uuid,
    morada_obra text,
    tipo_espaco text,
    observacoes text,
    estado text DEFAULT 'Agendada'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: work_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_id uuid NOT NULL,
    categoria text DEFAULT 'Outros'::text NOT NULL,
    descricao text DEFAULT ''::text NOT NULL,
    valor numeric DEFAULT 0 NOT NULL,
    data date DEFAULT CURRENT_DATE NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    source_quote_expense_id uuid
);


--
-- Name: work_extras; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_extras (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_id uuid NOT NULL,
    descricao text NOT NULL,
    quantidade numeric DEFAULT 1 NOT NULL,
    preco numeric DEFAULT 0 NOT NULL,
    custo numeric DEFAULT 0 NOT NULL,
    estado text DEFAULT 'Proposto'::text NOT NULL,
    data date DEFAULT CURRENT_DATE NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: work_hours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_hours (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_id uuid NOT NULL,
    profile_id uuid,
    nome text,
    data date DEFAULT CURRENT_DATE NOT NULL,
    horas numeric DEFAULT 0 NOT NULL,
    valor_hora numeric DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    source_quote_labour_id uuid
);


--
-- Name: work_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_id uuid NOT NULL,
    material_id uuid,
    descricao text DEFAULT ''::text NOT NULL,
    quantidade numeric DEFAULT 0 NOT NULL,
    unidade text DEFAULT 'un'::text NOT NULL,
    custo_unitario numeric DEFAULT 0 NOT NULL,
    data date DEFAULT CURRENT_DATE NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    source_quote_item_id uuid
);


--
-- Name: works; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.works (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero text,
    client_id uuid NOT NULL,
    quote_id uuid,
    titulo text,
    morada text,
    responsavel_id uuid,
    data_inicio date,
    data_prevista date,
    data_conclusao date,
    estado text DEFAULT 'Planeada'::text NOT NULL,
    valor_contratado numeric DEFAULT 0 NOT NULL,
    custo_previsto numeric DEFAULT 0 NOT NULL,
    observacoes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: cash_movements cash_movements_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_numero_key UNIQUE (numero);


--
-- Name: cash_movements cash_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_pkey PRIMARY KEY (id);


--
-- Name: clients clients_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_codigo_key UNIQUE (codigo);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: company_settings company_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_pkey PRIMARY KEY (id);


--
-- Name: doc_counters doc_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doc_counters
    ADD CONSTRAINT doc_counters_pkey PRIMARY KEY (prefix, ano);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: material_movements material_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_movements
    ADD CONSTRAINT material_movements_pkey PRIMARY KEY (id);


--
-- Name: materials materials_consumo_unidade_check; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.materials
    ADD CONSTRAINT materials_consumo_unidade_check CHECK (((consumo_unidade IS NULL) OR (consumo_unidade = ANY (ARRAY['base'::text, 'sub'::text])))) NOT VALID;


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- Name: measurement_changes measurement_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.measurement_changes
    ADD CONSTRAINT measurement_changes_pkey PRIMARY KEY (id);


--
-- Name: measurements measurements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.measurements
    ADD CONSTRAINT measurements_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: photos photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: quote_expenses quote_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_expenses
    ADD CONSTRAINT quote_expenses_pkey PRIMARY KEY (id);


--
-- Name: quote_extras quote_extras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_extras
    ADD CONSTRAINT quote_extras_pkey PRIMARY KEY (id);


--
-- Name: quote_items quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_pkey PRIMARY KEY (id);


--
-- Name: quote_labour quote_labour_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_labour
    ADD CONSTRAINT quote_labour_pkey PRIMARY KEY (id);


--
-- Name: quote_templates quote_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_templates
    ADD CONSTRAINT quote_templates_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_numero_key UNIQUE (numero);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: session_activity session_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_activity
    ADD CONSTRAINT session_activity_pkey PRIMARY KEY (user_id);


--
-- Name: supplier_invoice_payments supplier_invoice_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_invoice_payments
    ADD CONSTRAINT supplier_invoice_payments_pkey PRIMARY KEY (id);


--
-- Name: supplier_invoices supplier_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT supplier_invoices_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: timeline_events timeline_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_events
    ADD CONSTRAINT timeline_events_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: visits visits_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_numero_key UNIQUE (numero);


--
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- Name: work_expenses work_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_expenses
    ADD CONSTRAINT work_expenses_pkey PRIMARY KEY (id);


--
-- Name: work_extras work_extras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_extras
    ADD CONSTRAINT work_extras_pkey PRIMARY KEY (id);


--
-- Name: work_hours work_hours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_hours
    ADD CONSTRAINT work_hours_pkey PRIMARY KEY (id);


--
-- Name: work_materials work_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_materials
    ADD CONSTRAINT work_materials_pkey PRIMARY KEY (id);


--
-- Name: works works_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.works
    ADD CONSTRAINT works_numero_key UNIQUE (numero);


--
-- Name: works works_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.works
    ADD CONSTRAINT works_pkey PRIMARY KEY (id);


--
-- Name: cash_movements_invoice_payment_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cash_movements_invoice_payment_uniq ON public.cash_movements USING btree (invoice_payment_id) WHERE (invoice_payment_id IS NOT NULL);


--
-- Name: cash_movements_invoice_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cash_movements_invoice_uidx ON public.cash_movements USING btree (invoice_id) WHERE (invoice_id IS NOT NULL);


--
-- Name: cash_movements_payment_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cash_movements_payment_id_unique ON public.cash_movements USING btree (payment_id) WHERE (payment_id IS NOT NULL);


--
-- Name: idx_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_created ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_cash_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_data ON public.cash_movements USING btree (data);


--
-- Name: idx_clients_nome; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_nome ON public.clients USING btree (nome);


--
-- Name: idx_materials_cat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_cat ON public.materials USING btree (categoria);


--
-- Name: idx_pay_work; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pay_work ON public.payments USING btree (work_id);


--
-- Name: idx_qe_quote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qe_quote ON public.quote_expenses USING btree (quote_id);


--
-- Name: idx_qi_quote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qi_quote ON public.quote_items USING btree (quote_id);


--
-- Name: idx_ql_quote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ql_quote ON public.quote_labour USING btree (quote_id);


--
-- Name: idx_quote_extras_quote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_extras_quote ON public.quote_extras USING btree (quote_id);


--
-- Name: idx_timeline_ent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_ent ON public.timeline_events USING btree (entidade, entidade_id);


--
-- Name: idx_we_work; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_we_work ON public.work_expenses USING btree (work_id);


--
-- Name: idx_wh_work; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wh_work ON public.work_hours USING btree (work_id);


--
-- Name: idx_wm_work; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wm_work ON public.work_materials USING btree (work_id);


--
-- Name: idx_wx_work; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wx_work ON public.work_extras USING btree (work_id);


--
-- Name: material_movements_work_material_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX material_movements_work_material_id_unique ON public.material_movements USING btree (work_material_id) WHERE (work_material_id IS NOT NULL);


--
-- Name: quotes_eliminado_em_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quotes_eliminado_em_idx ON public.quotes USING btree (eliminado_em);


--
-- Name: supplier_invoice_payments_invoice_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supplier_invoice_payments_invoice_id_idx ON public.supplier_invoice_payments USING btree (invoice_id);


--
-- Name: uq_work_expenses_source_quote_expense; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_work_expenses_source_quote_expense ON public.work_expenses USING btree (source_quote_expense_id) WHERE (source_quote_expense_id IS NOT NULL);


--
-- Name: uq_work_hours_source_quote_labour; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_work_hours_source_quote_labour ON public.work_hours USING btree (source_quote_labour_id) WHERE (source_quote_labour_id IS NOT NULL);


--
-- Name: uq_work_materials_source_quote_item; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_work_materials_source_quote_item ON public.work_materials USING btree (source_quote_item_id) WHERE (source_quote_item_id IS NOT NULL);


--
-- Name: supplier_invoices supplier_invoices_cash; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER supplier_invoices_cash AFTER INSERT OR DELETE OR UPDATE ON public.supplier_invoices FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_to_cash();


--
-- Name: supplier_invoices supplier_invoices_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER supplier_invoices_updated BEFORE UPDATE ON public.supplier_invoices FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: material_movements t_apply_material_movement_to_stock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_apply_material_movement_to_stock AFTER INSERT OR DELETE OR UPDATE ON public.material_movements FOR EACH ROW EXECUTE FUNCTION public.apply_material_movement_to_stock();


--
-- Name: cash_movements t_cash_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_cash_code BEFORE INSERT ON public.cash_movements FOR EACH ROW EXECUTE FUNCTION public.tg_cash_code();


--
-- Name: clients t_clients_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_clients_code BEFORE INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.tg_client_code();


--
-- Name: clients t_clients_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_clients_upd BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: company_settings t_cs_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_cs_upd BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: materials t_mat_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_mat_upd BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: measurements t_measure_hist; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_measure_hist BEFORE UPDATE ON public.measurements FOR EACH ROW EXECUTE FUNCTION public.tg_measure_history();


--
-- Name: quote_templates t_qt_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_qt_upd BEFORE UPDATE ON public.quote_templates FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: quote_extras t_quote_extras_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_quote_extras_upd BEFORE UPDATE ON public.quote_extras FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: quotes t_quotes_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_quotes_code BEFORE INSERT ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.tg_quote_code();


--
-- Name: quotes t_quotes_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_quotes_upd BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: payments t_remove_paid_payment_from_cash; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_remove_paid_payment_from_cash AFTER DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.sync_paid_payment_to_cash();


--
-- Name: suppliers t_sup_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_sup_upd BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: payments t_sync_paid_payment_to_cash; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_sync_paid_payment_to_cash AFTER INSERT OR UPDATE OF estado, valor, data, metodo, descricao, work_id, client_id, observacoes ON public.payments FOR EACH ROW EXECUTE FUNCTION public.sync_paid_payment_to_cash();


--
-- Name: quote_expenses t_sync_quote_expenses_to_work; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_sync_quote_expenses_to_work AFTER INSERT OR DELETE OR UPDATE ON public.quote_expenses FOR EACH ROW EXECUTE FUNCTION public.tg_sync_quote_costs_to_work();


--
-- Name: quote_items t_sync_quote_items_to_work; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_sync_quote_items_to_work AFTER INSERT OR DELETE OR UPDATE ON public.quote_items FOR EACH ROW EXECUTE FUNCTION public.tg_sync_quote_costs_to_work();


--
-- Name: quote_labour t_sync_quote_labour_to_work; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_sync_quote_labour_to_work AFTER INSERT OR DELETE OR UPDATE ON public.quote_labour FOR EACH ROW EXECUTE FUNCTION public.tg_sync_quote_costs_to_work();


--
-- Name: quotes t_sync_quote_link_to_work; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_sync_quote_link_to_work AFTER UPDATE OF work_id ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.tg_sync_quote_link_to_work();


--
-- Name: visits t_visits_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_visits_code BEFORE INSERT ON public.visits FOR EACH ROW EXECUTE FUNCTION public.tg_visit_code();


--
-- Name: visits t_visits_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_visits_upd BEFORE UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: works t_works_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_works_code BEFORE INSERT ON public.works FOR EACH ROW EXECUTE FUNCTION public.tg_work_code();


--
-- Name: works t_works_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_works_upd BEFORE UPDATE ON public.works FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: supplier_invoice_payments trg_sync_invoice_payment_to_cash; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_invoice_payment_to_cash AFTER INSERT OR UPDATE ON public.supplier_invoice_payments FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_payment_to_cash();


--
-- Name: supplier_invoice_payments trg_sync_invoice_payment_to_cash_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_invoice_payment_to_cash_del BEFORE DELETE ON public.supplier_invoice_payments FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_payment_to_cash();


--
-- Name: cash_movements cash_movements_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: cash_movements cash_movements_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.supplier_invoices(id) ON DELETE SET NULL;


--
-- Name: cash_movements cash_movements_invoice_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_invoice_payment_id_fkey FOREIGN KEY (invoice_payment_id) REFERENCES public.supplier_invoice_payments(id) ON DELETE SET NULL;


--
-- Name: cash_movements cash_movements_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;


--
-- Name: cash_movements cash_movements_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;


--
-- Name: cash_movements cash_movements_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: cash_movements cash_movements_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_work_id_fkey FOREIGN KEY (work_id) REFERENCES public.works(id) ON DELETE SET NULL;


--
-- Name: documents documents_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: documents documents_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: documents documents_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_work_id_fkey FOREIGN KEY (work_id) REFERENCES public.works(id) ON DELETE CASCADE;


--
-- Name: material_movements material_movements_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_movements
    ADD CONSTRAINT material_movements_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE;


--
-- Name: material_movements material_movements_work_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_movements
    ADD CONSTRAINT material_movements_work_material_id_fkey FOREIGN KEY (work_material_id) REFERENCES public.work_materials(id) ON DELETE CASCADE;


--
-- Name: materials materials_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: measurement_changes measurement_changes_measurement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.measurement_changes
    ADD CONSTRAINT measurement_changes_measurement_id_fkey FOREIGN KEY (measurement_id) REFERENCES public.measurements(id) ON DELETE CASCADE;


--
-- Name: measurements measurements_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.measurements
    ADD CONSTRAINT measurements_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: measurements measurements_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.measurements
    ADD CONSTRAINT measurements_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE CASCADE;


--
-- Name: payments payments_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: payments payments_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_work_id_fkey FOREIGN KEY (work_id) REFERENCES public.works(id) ON DELETE SET NULL;


--
-- Name: photos photos_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: photos photos_measurement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_measurement_id_fkey FOREIGN KEY (measurement_id) REFERENCES public.measurements(id) ON DELETE CASCADE;


--
-- Name: photos photos_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE CASCADE;


--
-- Name: photos photos_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_work_id_fkey FOREIGN KEY (work_id) REFERENCES public.works(id) ON DELETE CASCADE;


--
-- Name: quote_expenses quote_expenses_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_expenses
    ADD CONSTRAINT quote_expenses_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quote_extras quote_extras_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_extras
    ADD CONSTRAINT quote_extras_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quote_items quote_items_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE SET NULL;


--
-- Name: quote_items quote_items_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quote_labour quote_labour_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_labour
    ADD CONSTRAINT quote_labour_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quotes quotes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;


--
-- Name: quotes quotes_versao_origem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_versao_origem_id_fkey FOREIGN KEY (versao_origem_id) REFERENCES public.quotes(id) ON DELETE SET NULL;


--
-- Name: quotes quotes_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE SET NULL;


--
-- Name: session_activity session_activity_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_activity
    ADD CONSTRAINT session_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES independent_auth."user"(id) ON DELETE CASCADE;


--
-- Name: supplier_invoice_payments supplier_invoice_payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_invoice_payments
    ADD CONSTRAINT supplier_invoice_payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.supplier_invoices(id) ON DELETE CASCADE;


--
-- Name: supplier_invoices supplier_invoices_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT supplier_invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: supplier_invoices supplier_invoices_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT supplier_invoices_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;


--
-- Name: supplier_invoices supplier_invoices_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT supplier_invoices_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: supplier_invoices supplier_invoices_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT supplier_invoices_work_id_fkey FOREIGN KEY (work_id) REFERENCES public.works(id) ON DELETE SET NULL;


--
-- Name: visits visits_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;


--
-- Name: work_expenses work_expenses_source_quote_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_expenses
    ADD CONSTRAINT work_expenses_source_quote_expense_id_fkey FOREIGN KEY (source_quote_expense_id) REFERENCES public.quote_expenses(id) ON DELETE CASCADE;


--
-- Name: work_expenses work_expenses_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_expenses
    ADD CONSTRAINT work_expenses_work_id_fkey FOREIGN KEY (work_id) REFERENCES public.works(id) ON DELETE CASCADE;


--
-- Name: work_extras work_extras_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_extras
    ADD CONSTRAINT work_extras_work_id_fkey FOREIGN KEY (work_id) REFERENCES public.works(id) ON DELETE CASCADE;


--
-- Name: work_hours work_hours_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_hours
    ADD CONSTRAINT work_hours_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: work_hours work_hours_source_quote_labour_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_hours
    ADD CONSTRAINT work_hours_source_quote_labour_id_fkey FOREIGN KEY (source_quote_labour_id) REFERENCES public.quote_labour(id) ON DELETE CASCADE;


--
-- Name: work_hours work_hours_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_hours
    ADD CONSTRAINT work_hours_work_id_fkey FOREIGN KEY (work_id) REFERENCES public.works(id) ON DELETE CASCADE;


--
-- Name: work_materials work_materials_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_materials
    ADD CONSTRAINT work_materials_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE SET NULL;


--
-- Name: work_materials work_materials_source_quote_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_materials
    ADD CONSTRAINT work_materials_source_quote_item_id_fkey FOREIGN KEY (source_quote_item_id) REFERENCES public.quote_items(id) ON DELETE CASCADE;


--
-- Name: work_materials work_materials_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_materials
    ADD CONSTRAINT work_materials_work_id_fkey FOREIGN KEY (work_id) REFERENCES public.works(id) ON DELETE CASCADE;


--
-- Name: works works_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.works
    ADD CONSTRAINT works_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;


--
-- Name: works works_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.works
    ADD CONSTRAINT works_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;


--
-- Name: timeline_events Editar observações de cliente; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editar observações de cliente" ON public.timeline_events FOR UPDATE TO authenticated USING (((entidade = 'client_note'::text) AND public.is_active_user())) WITH CHECK (((entidade = 'client_note'::text) AND public.is_active_user()));


--
-- Name: audit_logs audit_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_active_user());


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs audit_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_select ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: cash_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: company_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: company_settings cs_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_admin ON public.company_settings TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: company_settings cs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_select ON public.company_settings FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: doc_counters dc_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dc_select ON public.doc_counters FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: cash_movements del_cash_movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_cash_movements ON public.cash_movements FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: clients del_clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_clients ON public.clients FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: documents del_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_documents ON public.documents FOR DELETE TO authenticated USING (public.can_write('{ORCAMENTISTA,OBRA,FINANCEIRO}'::public.app_role[]));


--
-- Name: material_movements del_material_movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_material_movements ON public.material_movements FOR DELETE TO authenticated USING (public.can_write('{ORCAMENTISTA,OBRA}'::public.app_role[]));


--
-- Name: materials del_materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_materials ON public.materials FOR DELETE TO authenticated USING (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: measurement_changes del_measurement_changes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_measurement_changes ON public.measurement_changes FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: measurements del_measurements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_measurements ON public.measurements FOR DELETE TO authenticated USING (public.can_write('{ORCAMENTISTA,OBRA}'::public.app_role[]));


--
-- Name: payments del_payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_payments ON public.payments FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: photos del_photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_photos ON public.photos FOR DELETE TO authenticated USING (public.is_active_user());


--
-- Name: quote_expenses del_quote_expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_quote_expenses ON public.quote_expenses FOR DELETE TO authenticated USING (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: quote_extras del_quote_extras; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_quote_extras ON public.quote_extras FOR DELETE TO authenticated USING (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: quote_items del_quote_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_quote_items ON public.quote_items FOR DELETE TO authenticated USING (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: quote_labour del_quote_labour; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_quote_labour ON public.quote_labour FOR DELETE TO authenticated USING (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: quote_templates del_quote_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_quote_templates ON public.quote_templates FOR DELETE TO authenticated USING (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: quotes del_quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_quotes ON public.quotes FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: supplier_invoices del_supplier_invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_supplier_invoices ON public.supplier_invoices FOR DELETE TO authenticated USING (public.can_write('{FINANCEIRO}'::public.app_role[]));


--
-- Name: suppliers del_suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_suppliers ON public.suppliers FOR DELETE TO authenticated USING (public.can_write('{ORCAMENTISTA,FINANCEIRO}'::public.app_role[]));


--
-- Name: visits del_visits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_visits ON public.visits FOR DELETE TO authenticated USING (public.can_write('{ORCAMENTISTA,OBRA}'::public.app_role[]));


--
-- Name: work_expenses del_work_expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_work_expenses ON public.work_expenses FOR DELETE TO authenticated USING (public.can_write('{OBRA,FINANCEIRO}'::public.app_role[]));


--
-- Name: work_extras del_work_extras; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_work_extras ON public.work_extras FOR DELETE TO authenticated USING (public.can_write('{OBRA,ORCAMENTISTA}'::public.app_role[]));


--
-- Name: work_hours del_work_hours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_work_hours ON public.work_hours FOR DELETE TO authenticated USING (public.can_write('{OBRA}'::public.app_role[]));


--
-- Name: work_materials del_work_materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_work_materials ON public.work_materials FOR DELETE TO authenticated USING (public.can_write('{OBRA}'::public.app_role[]));


--
-- Name: works del_works; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY del_works ON public.works FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: doc_counters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.doc_counters ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: cash_movements ins_cash_movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_cash_movements ON public.cash_movements FOR INSERT TO authenticated WITH CHECK (public.can_write('{FINANCEIRO}'::public.app_role[]));


--
-- Name: clients ins_clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_clients ON public.clients FOR INSERT TO authenticated WITH CHECK (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: documents ins_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_documents ON public.documents FOR INSERT TO authenticated WITH CHECK (public.can_write('{ORCAMENTISTA,OBRA,FINANCEIRO}'::public.app_role[]));


--
-- Name: material_movements ins_material_movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_material_movements ON public.material_movements FOR INSERT TO authenticated WITH CHECK (public.can_write('{ORCAMENTISTA,OBRA}'::public.app_role[]));


--
-- Name: materials ins_materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_materials ON public.materials FOR INSERT TO authenticated WITH CHECK (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: measurement_changes ins_measurement_changes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_measurement_changes ON public.measurement_changes FOR INSERT TO authenticated WITH CHECK (public.can_write('{ORCAMENTISTA,OBRA}'::public.app_role[]));


--
-- Name: measurements ins_measurements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_measurements ON public.measurements FOR INSERT TO authenticated WITH CHECK (public.can_write('{ORCAMENTISTA,OBRA}'::public.app_role[]));


--
-- Name: payments ins_payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_payments ON public.payments FOR INSERT TO authenticated WITH CHECK (public.can_write('{FINANCEIRO}'::public.app_role[]));


--
-- Name: photos ins_photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_photos ON public.photos FOR INSERT TO authenticated WITH CHECK (public.can_write('{ORCAMENTISTA,OBRA}'::public.app_role[]));


--
-- Name: quote_expenses ins_quote_expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_quote_expenses ON public.quote_expenses FOR INSERT TO authenticated WITH CHECK (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: quote_extras ins_quote_extras; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_quote_extras ON public.quote_extras FOR INSERT TO authenticated WITH CHECK (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: quote_items ins_quote_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_quote_items ON public.quote_items FOR INSERT TO authenticated WITH CHECK (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: quote_labour ins_quote_labour; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_quote_labour ON public.quote_labour FOR INSERT TO authenticated WITH CHECK (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: quote_templates ins_quote_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_quote_templates ON public.quote_templates FOR INSERT TO authenticated WITH CHECK (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: quotes ins_quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_quotes ON public.quotes FOR INSERT TO authenticated WITH CHECK (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: supplier_invoices ins_supplier_invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_supplier_invoices ON public.supplier_invoices FOR INSERT TO authenticated WITH CHECK (public.can_write('{FINANCEIRO}'::public.app_role[]));


--
-- Name: suppliers ins_suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_suppliers ON public.suppliers FOR INSERT TO authenticated WITH CHECK (public.can_write('{ORCAMENTISTA,FINANCEIRO}'::public.app_role[]));


--
-- Name: visits ins_visits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_visits ON public.visits FOR INSERT TO authenticated WITH CHECK (public.can_write('{ORCAMENTISTA,OBRA}'::public.app_role[]));


--
-- Name: work_expenses ins_work_expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_work_expenses ON public.work_expenses FOR INSERT TO authenticated WITH CHECK (public.can_write('{OBRA,FINANCEIRO}'::public.app_role[]));


--
-- Name: work_extras ins_work_extras; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_work_extras ON public.work_extras FOR INSERT TO authenticated WITH CHECK (public.can_write('{OBRA,ORCAMENTISTA}'::public.app_role[]));


--
-- Name: work_hours ins_work_hours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_work_hours ON public.work_hours FOR INSERT TO authenticated WITH CHECK (public.can_write('{OBRA}'::public.app_role[]));


--
-- Name: work_materials ins_work_materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_work_materials ON public.work_materials FOR INSERT TO authenticated WITH CHECK (public.can_write('{OBRA}'::public.app_role[]));


--
-- Name: works ins_works; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ins_works ON public.works FOR INSERT TO authenticated WITH CHECK (public.can_write('{ORCAMENTISTA,OBRA}'::public.app_role[]));


--
-- Name: material_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.material_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: materials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

--
-- Name: measurement_changes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.measurement_changes ENABLE ROW LEVEL SECURITY;

--
-- Name: measurements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notif_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notif_insert ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_active_user());


--
-- Name: notifications notif_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notif_select ON public.notifications FOR SELECT TO authenticated USING ((public.is_active_user() AND ((user_id IS NULL) OR (user_id = auth.uid()))));


--
-- Name: notifications notif_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notif_update ON public.notifications FOR UPDATE TO authenticated USING (((user_id = auth.uid()) OR public.is_admin())) WITH CHECK (((user_id = auth.uid()) OR public.is_admin()));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: session_activity own session activity insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "own session activity insert" ON public.session_activity FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: session_activity own session activity select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "own session activity select" ON public.session_activity FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: session_activity own session activity update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "own session activity update" ON public.session_activity FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_insert_self ON public.profiles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) OR public.is_admin()));


--
-- Name: profiles profiles_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_admin() OR public.can_write('{ORCAMENTISTA,OBRA,FINANCEIRO}'::public.app_role[])));


--
-- Name: profiles profiles_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING (((user_id = auth.uid()) OR public.is_admin())) WITH CHECK (((user_id = auth.uid()) OR public.is_admin()));


--
-- Name: quote_expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_extras; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_extras ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_labour; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_labour ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: quotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles roles_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY roles_admin_delete ON public.user_roles FOR DELETE TO authenticated USING ((public.is_admin() AND (user_id <> auth.uid())));


--
-- Name: user_roles roles_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY roles_admin_insert ON public.user_roles FOR INSERT TO authenticated WITH CHECK ((public.is_admin() AND (user_id <> auth.uid())));


--
-- Name: user_roles roles_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY roles_admin_update ON public.user_roles FOR UPDATE TO authenticated USING ((public.is_admin() AND (user_id <> auth.uid()))) WITH CHECK ((public.is_admin() AND (user_id <> auth.uid())));


--
-- Name: user_roles roles_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY roles_select ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_admin()));


--
-- Name: cash_movements sel_cash_movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_cash_movements ON public.cash_movements FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: clients sel_clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_clients ON public.clients FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: documents sel_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_documents ON public.documents FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: material_movements sel_material_movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_material_movements ON public.material_movements FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: materials sel_materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_materials ON public.materials FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: measurement_changes sel_measurement_changes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_measurement_changes ON public.measurement_changes FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: measurements sel_measurements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_measurements ON public.measurements FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: payments sel_payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_payments ON public.payments FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: photos sel_photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_photos ON public.photos FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: quote_expenses sel_quote_expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_quote_expenses ON public.quote_expenses FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: quote_extras sel_quote_extras; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_quote_extras ON public.quote_extras FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: quote_items sel_quote_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_quote_items ON public.quote_items FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: quote_labour sel_quote_labour; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_quote_labour ON public.quote_labour FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: quote_templates sel_quote_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_quote_templates ON public.quote_templates FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: quotes sel_quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_quotes ON public.quotes FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: supplier_invoices sel_supplier_invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_supplier_invoices ON public.supplier_invoices FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: suppliers sel_suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_suppliers ON public.suppliers FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: visits sel_visits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_visits ON public.visits FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: work_expenses sel_work_expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_work_expenses ON public.work_expenses FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: work_extras sel_work_extras; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_work_extras ON public.work_extras FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: work_hours sel_work_hours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_work_hours ON public.work_hours FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: work_materials sel_work_materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_work_materials ON public.work_materials FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: works sel_works; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_works ON public.works FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: session_activity; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session_activity ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_invoice_payments sip_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sip_delete ON public.supplier_invoice_payments FOR DELETE TO authenticated USING (public.can_write('{FINANCEIRO}'::public.app_role[]));


--
-- Name: supplier_invoice_payments sip_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sip_insert ON public.supplier_invoice_payments FOR INSERT TO authenticated WITH CHECK (public.can_write('{FINANCEIRO}'::public.app_role[]));


--
-- Name: supplier_invoice_payments sip_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sip_select ON public.supplier_invoice_payments FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: supplier_invoice_payments sip_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sip_update ON public.supplier_invoice_payments FOR UPDATE TO authenticated USING (public.can_write('{FINANCEIRO}'::public.app_role[]));


--
-- Name: supplier_invoice_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_invoice_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: suppliers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

--
-- Name: timeline_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

--
-- Name: timeline_events tl_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tl_insert ON public.timeline_events FOR INSERT TO authenticated WITH CHECK (public.is_active_user());


--
-- Name: timeline_events tl_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tl_select ON public.timeline_events FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: cash_movements upd_cash_movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_cash_movements ON public.cash_movements FOR UPDATE TO authenticated USING (public.can_write('{FINANCEIRO}'::public.app_role[])) WITH CHECK (public.can_write('{FINANCEIRO}'::public.app_role[]));


--
-- Name: clients upd_clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_clients ON public.clients FOR UPDATE TO authenticated USING (public.can_write('{ORCAMENTISTA}'::public.app_role[])) WITH CHECK (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: documents upd_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_documents ON public.documents FOR UPDATE TO authenticated USING (public.can_write('{ORCAMENTISTA,OBRA,FINANCEIRO}'::public.app_role[])) WITH CHECK (public.can_write('{ORCAMENTISTA,OBRA,FINANCEIRO}'::public.app_role[]));


--
-- Name: material_movements upd_material_movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_material_movements ON public.material_movements FOR UPDATE TO authenticated USING (public.can_write('{ORCAMENTISTA,OBRA}'::public.app_role[])) WITH CHECK (public.can_write('{ORCAMENTISTA,OBRA}'::public.app_role[]));


--
-- Name: materials upd_materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_materials ON public.materials FOR UPDATE TO authenticated USING (public.can_write('{ORCAMENTISTA}'::public.app_role[])) WITH CHECK (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: measurement_changes upd_measurement_changes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_measurement_changes ON public.measurement_changes FOR UPDATE TO authenticated USING (public.can_write('{ORCAMENTISTA,OBRA}'::public.app_role[])) WITH CHECK (public.can_write('{ORCAMENTISTA,OBRA}'::public.app_role[]));


--
-- Name: measurements upd_measurements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_measurements ON public.measurements FOR UPDATE TO authenticated USING (public.can_write('{ORCAMENTISTA,OBRA}'::public.app_role[])) WITH CHECK (public.can_write('{ORCAMENTISTA,OBRA}'::public.app_role[]));


--
-- Name: payments upd_payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_payments ON public.payments FOR UPDATE TO authenticated USING (public.can_write('{FINANCEIRO}'::public.app_role[])) WITH CHECK (public.can_write('{FINANCEIRO}'::public.app_role[]));


--
-- Name: photos upd_photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_photos ON public.photos FOR UPDATE TO authenticated USING (public.can_write('{ORCAMENTISTA,OBRA}'::public.app_role[])) WITH CHECK (public.can_write('{ORCAMENTISTA,OBRA}'::public.app_role[]));


--
-- Name: quote_expenses upd_quote_expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_quote_expenses ON public.quote_expenses FOR UPDATE TO authenticated USING (public.can_write('{ORCAMENTISTA}'::public.app_role[])) WITH CHECK (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: quote_extras upd_quote_extras; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_quote_extras ON public.quote_extras FOR UPDATE TO authenticated USING (public.can_write('{ORCAMENTISTA}'::public.app_role[])) WITH CHECK (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: quote_items upd_quote_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_quote_items ON public.quote_items FOR UPDATE TO authenticated USING (public.can_write('{ORCAMENTISTA}'::public.app_role[])) WITH CHECK (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: quote_labour upd_quote_labour; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_quote_labour ON public.quote_labour FOR UPDATE TO authenticated USING (public.can_write('{ORCAMENTISTA}'::public.app_role[])) WITH CHECK (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: quote_templates upd_quote_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_quote_templates ON public.quote_templates FOR UPDATE TO authenticated USING (public.can_write('{ORCAMENTISTA}'::public.app_role[])) WITH CHECK (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: quotes upd_quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_quotes ON public.quotes FOR UPDATE TO authenticated USING (public.can_write('{ORCAMENTISTA}'::public.app_role[])) WITH CHECK (public.can_write('{ORCAMENTISTA}'::public.app_role[]));


--
-- Name: supplier_invoices upd_supplier_invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_supplier_invoices ON public.supplier_invoices FOR UPDATE TO authenticated USING (public.can_write('{FINANCEIRO}'::public.app_role[])) WITH CHECK (public.can_write('{FINANCEIRO}'::public.app_role[]));


--
-- Name: suppliers upd_suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_suppliers ON public.suppliers FOR UPDATE TO authenticated USING (public.can_write('{ORCAMENTISTA,FINANCEIRO}'::public.app_role[])) WITH CHECK (public.can_write('{ORCAMENTISTA,FINANCEIRO}'::public.app_role[]));


--
-- Name: visits upd_visits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_visits ON public.visits FOR UPDATE TO authenticated USING (public.can_write('{ORCAMENTISTA,OBRA}'::public.app_role[])) WITH CHECK (public.can_write('{ORCAMENTISTA,OBRA}'::public.app_role[]));


--
-- Name: work_expenses upd_work_expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_work_expenses ON public.work_expenses FOR UPDATE TO authenticated USING (public.can_write('{OBRA,FINANCEIRO}'::public.app_role[])) WITH CHECK (public.can_write('{OBRA,FINANCEIRO}'::public.app_role[]));


--
-- Name: work_extras upd_work_extras; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_work_extras ON public.work_extras FOR UPDATE TO authenticated USING (public.can_write('{OBRA,ORCAMENTISTA}'::public.app_role[])) WITH CHECK (public.can_write('{OBRA,ORCAMENTISTA}'::public.app_role[]));


--
-- Name: work_hours upd_work_hours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_work_hours ON public.work_hours FOR UPDATE TO authenticated USING (public.can_write('{OBRA}'::public.app_role[])) WITH CHECK (public.can_write('{OBRA}'::public.app_role[]));


--
-- Name: work_materials upd_work_materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_work_materials ON public.work_materials FOR UPDATE TO authenticated USING (public.can_write('{OBRA}'::public.app_role[])) WITH CHECK (public.can_write('{OBRA}'::public.app_role[]));


--
-- Name: works upd_works; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upd_works ON public.works FOR UPDATE TO authenticated USING (public.can_write('{ORCAMENTISTA,OBRA}'::public.app_role[])) WITH CHECK (public.can_write('{ORCAMENTISTA,OBRA}'::public.app_role[]));


--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: visits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

--
-- Name: work_expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.work_expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: work_extras; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.work_extras ENABLE ROW LEVEL SECURITY;

--
-- Name: work_hours; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.work_hours ENABLE ROW LEVEL SECURITY;

--
-- Name: work_materials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.work_materials ENABLE ROW LEVEL SECURITY;

--
-- Name: works; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


