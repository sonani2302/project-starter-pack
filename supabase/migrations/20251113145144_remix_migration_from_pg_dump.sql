--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    order_number text NOT NULL,
    sub_order_number text,
    order_date timestamp with time zone NOT NULL,
    channel text NOT NULL,
    product_name text NOT NULL,
    product_sku text NOT NULL,
    product_quantity integer DEFAULT 1 NOT NULL,
    product_price numeric(10,2) NOT NULL,
    product_discount numeric(10,2) DEFAULT 0,
    payment_method text NOT NULL,
    customer_name text,
    customer_email text,
    customer_mobile text,
    customer_city text,
    customer_state text,
    customer_pincode text,
    order_total numeric(10,2) NOT NULL,
    order_status text NOT NULL,
    courier_company text,
    awb_no text,
    awb_assigned_date timestamp with time zone,
    warehouse_id text,
    warehouse_name text,
    order_pickup_date timestamp with time zone,
    order_delivered_date timestamp with time zone,
    zone text,
    billed_weight numeric(10,3),
    fwd_charges numeric(10,2) DEFAULT 0,
    rto_charges numeric(10,2) DEFAULT 0,
    cod_charges numeric(10,2) DEFAULT 0,
    gst_charges numeric(10,2) DEFAULT 0,
    total_freight_charge numeric(10,3) DEFAULT 0,
    store_name text,
    store_order_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shopify_product_id text NOT NULL,
    sku text NOT NULL,
    shop_name text NOT NULL,
    title text NOT NULL,
    variant_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    image_url text,
    product_url text,
    user_id uuid
);


--
-- Name: purchase_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    upload_date date DEFAULT CURRENT_DATE NOT NULL,
    file_names text[] NOT NULL,
    total_items integer DEFAULT 0 NOT NULL,
    notes text,
    user_id uuid
);


--
-- Name: purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    shop_name text NOT NULL,
    sku text NOT NULL,
    type text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    batch_id uuid,
    user_id uuid,
    CONSTRAINT purchases_type_check CHECK ((type = ANY (ARRAY['purchase'::text, 'return'::text])))
);


--
-- Name: returns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.returns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    return_date date NOT NULL,
    shop_name text NOT NULL,
    sku text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    notes text,
    user_id uuid
);


--
-- Name: user_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    shopify_store_url text NOT NULL,
    shopify_admin_token text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: purchase_batches purchase_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_batches
    ADD CONSTRAINT purchase_batches_pkey PRIMARY KEY (id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


--
-- Name: returns returns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_pkey PRIMARY KEY (id);


--
-- Name: user_credentials user_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_credentials
    ADD CONSTRAINT user_credentials_pkey PRIMARY KEY (id);


--
-- Name: user_credentials user_credentials_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_credentials
    ADD CONSTRAINT user_credentials_user_id_key UNIQUE (user_id);


--
-- Name: idx_orders_order_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_order_date ON public.orders USING btree (order_date);


--
-- Name: idx_orders_order_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_order_status ON public.orders USING btree (order_status);


--
-- Name: idx_orders_payment_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_payment_method ON public.orders USING btree (payment_method);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_products_shop_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_shop_name ON public.products USING btree (shop_name);


--
-- Name: idx_products_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_sku ON public.products USING btree (sku);


--
-- Name: idx_purchases_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_date ON public.purchases USING btree (date);


--
-- Name: idx_purchases_shop_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_shop_name ON public.purchases USING btree (shop_name);


--
-- Name: idx_purchases_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_type ON public.purchases USING btree (type);


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_credentials update_user_credentials_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_credentials_updated_at BEFORE UPDATE ON public.user_credentials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products products_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: purchase_batches purchase_batches_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_batches
    ADD CONSTRAINT purchase_batches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: purchases purchases_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.purchase_batches(id) ON DELETE CASCADE;


--
-- Name: purchases purchases_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: returns returns_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_credentials user_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_credentials
    ADD CONSTRAINT user_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: purchase_batches Users can delete their own batches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own batches" ON public.purchase_batches FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_credentials Users can delete their own credentials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own credentials" ON public.user_credentials FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: orders Users can delete their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own orders" ON public.orders FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: products Users can delete their own products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own products" ON public.products FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: purchases Users can delete their own purchases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own purchases" ON public.purchases FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: returns Users can delete their own returns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own returns" ON public.returns FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: purchase_batches Users can insert their own batches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own batches" ON public.purchase_batches FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_credentials Users can insert their own credentials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own credentials" ON public.user_credentials FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: orders Users can insert their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own orders" ON public.orders FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: products Users can insert their own products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own products" ON public.products FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: purchases Users can insert their own purchases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own purchases" ON public.purchases FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: returns Users can insert their own returns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own returns" ON public.returns FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: purchase_batches Users can update their own batches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own batches" ON public.purchase_batches FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_credentials Users can update their own credentials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own credentials" ON public.user_credentials FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: orders Users can update their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own orders" ON public.orders FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: products Users can update their own products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own products" ON public.products FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: purchases Users can update their own purchases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own purchases" ON public.purchases FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: returns Users can update their own returns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own returns" ON public.returns FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: purchase_batches Users can view their own batches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own batches" ON public.purchase_batches FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_credentials Users can view their own credentials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own credentials" ON public.user_credentials FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: orders Users can view their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: products Users can view their own products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own products" ON public.products FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: purchases Users can view their own purchases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own purchases" ON public.purchases FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: returns Users can view their own returns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own returns" ON public.returns FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_batches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchase_batches ENABLE ROW LEVEL SECURITY;

--
-- Name: purchases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

--
-- Name: returns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

--
-- Name: user_credentials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


