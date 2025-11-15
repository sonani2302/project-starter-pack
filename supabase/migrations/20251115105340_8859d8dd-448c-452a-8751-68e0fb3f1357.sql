-- Create update function for timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column() 
RETURNS trigger
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create orders table
CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
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

-- Create products table
CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
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

-- Create purchase_batches table
CREATE TABLE public.purchase_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    upload_date date DEFAULT CURRENT_DATE NOT NULL,
    file_names text[] NOT NULL,
    total_items integer DEFAULT 0 NOT NULL,
    notes text,
    user_id uuid
);

-- Create purchases table
CREATE TABLE public.purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    date date DEFAULT CURRENT_DATE NOT NULL,
    shop_name text NOT NULL,
    sku text NOT NULL,
    type text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    batch_id uuid,
    user_id uuid,
    updated_at timestamp with time zone DEFAULT now()
);

-- Create returns table
CREATE TABLE public.returns (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    return_date date NOT NULL,
    shop_name text NOT NULL,
    sku text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    notes text,
    user_id uuid
);

-- Create user_credentials table
CREATE TABLE public.user_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE,
    shopify_store_url text NOT NULL,
    shopify_admin_token text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_orders_order_date ON public.orders USING btree (order_date);
CREATE INDEX idx_orders_order_status ON public.orders USING btree (order_status);
CREATE INDEX idx_orders_payment_method ON public.orders USING btree (payment_method);
CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);
CREATE INDEX idx_products_shop_name ON public.products USING btree (shop_name);
CREATE INDEX idx_products_sku ON public.products USING btree (sku);
CREATE INDEX idx_purchases_date ON public.purchases USING btree (date);
CREATE INDEX idx_purchases_shop_name ON public.purchases USING btree (shop_name);
CREATE INDEX idx_purchases_type ON public.purchases USING btree (type);

-- Create triggers for updated_at columns
CREATE TRIGGER update_orders_updated_at 
BEFORE UPDATE ON public.orders 
FOR EACH ROW 
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
BEFORE UPDATE ON public.products 
FOR EACH ROW 
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_credentials_updated_at 
BEFORE UPDATE ON public.user_credentials 
FOR EACH ROW 
EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key constraints
ALTER TABLE public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.products
    ADD CONSTRAINT products_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.purchase_batches
    ADD CONSTRAINT purchase_batches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.purchases
    ADD CONSTRAINT purchases_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.purchase_batches(id) ON DELETE CASCADE;

ALTER TABLE public.purchases
    ADD CONSTRAINT purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.returns
    ADD CONSTRAINT returns_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_credentials
    ADD CONSTRAINT user_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for orders
CREATE POLICY "Users can view their own orders" ON public.orders 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders" ON public.orders 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" ON public.orders 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orders" ON public.orders 
FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for products
CREATE POLICY "Users can view their own products" ON public.products 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products" ON public.products 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" ON public.products 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" ON public.products 
FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for purchase_batches
CREATE POLICY "Users can view their own batches" ON public.purchase_batches 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own batches" ON public.purchase_batches 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own batches" ON public.purchase_batches 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own batches" ON public.purchase_batches 
FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for purchases
CREATE POLICY "Users can view their own purchases" ON public.purchases 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchases" ON public.purchases 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own purchases" ON public.purchases 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own purchases" ON public.purchases 
FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for returns
CREATE POLICY "Users can view their own returns" ON public.returns 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own returns" ON public.returns 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own returns" ON public.returns 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own returns" ON public.returns 
FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for user_credentials
CREATE POLICY "Users can view their own credentials" ON public.user_credentials 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credentials" ON public.user_credentials 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials" ON public.user_credentials 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credentials" ON public.user_credentials 
FOR DELETE USING (auth.uid() = user_id);