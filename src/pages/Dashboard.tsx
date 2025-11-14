// Dashboard for managing purchases and returns
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Upload, Save, Package2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useCredentials } from "@/hooks/useCredentials";

interface Product {
  id: string;
  sku: string;
  shop_name: string;
  title: string;
  shopify_product_id: string;
  image_url?: string;
  product_url?: string;
}

interface PurchaseEntry {
  sku: string;
  shop_name: string;
  title: string;
  quantity: number;
  type: 'purchase' | 'return';
  notes: string;
}

const Dashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseEntries, setPurchaseEntries] = useState<PurchaseEntry[]>([]);
  const [groupedProducts, setGroupedProducts] = useState<Record<string, Product[]>>({});
  const [lastBatch, setLastBatch] = useState<any>(null);
  const [lastBatchPurchases, setLastBatchPurchases] = useState<any[]>([]);
  const { data: credentials } = useCredentials();

  useEffect(() => {
    loadProducts();
    loadLastBatch();
  }, []);

  const loadProducts = async () => {
    const { data, error } = await (supabase as any)
      .from('products')
      .select('*')
      .order('shop_name');

    if (error) {
      toast({
        title: "Error loading products",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setProducts(data || []);
    
    // Group by shop name
    const grouped = (data || []).reduce((acc, product) => {
      if (!acc[product.shop_name]) {
        acc[product.shop_name] = [];
      }
      acc[product.shop_name].push(product);
      return acc;
    }, {} as Record<string, Product[]>);
    
    setGroupedProducts(grouped);
  };

  const loadLastBatch = async () => {
    const { data: batch, error: batchError } = await (supabase as any)
      .from('purchase_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (batchError || !batch) {
      setLastBatch(null);
      setLastBatchPurchases([]);
      return;
    }

    const { data: purchases, error: purchasesError } = await (supabase as any)
      .from('purchases')
      .select('*')
      .eq('batch_id', batch.id);

    if (purchasesError) {
      toast({
        title: "Error loading last batch",
        description: purchasesError.message,
        variant: "destructive",
      });
      return;
    }

    setLastBatch(batch);
    setLastBatchPurchases(purchases || []);
  };

  const handleRefreshProducts = async () => {
    if (!credentials) {
      toast({
        title: "Credentials required",
        description: "Please configure your Shopify credentials in Settings",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('shopify-products', {
        body: {
          shopifyStoreUrl: credentials.shopify_store_url,
          shopifyToken: credentials.shopify_admin_token,
        },
      });

      if (error) throw error;

      toast({
        title: "Products synced successfully",
        description: `Fetched ${data.count} products from Shopify`,
      });

      await loadProducts();
    } catch (error: any) {
      toast({
        title: "Error syncing products",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const shopNames = Object.keys(groupedProducts);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Manage your daily purchases and returns</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefreshProducts} disabled={loading} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Sync Products
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">Synced from Shopify</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Shops</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shopNames.length}</div>
            <p className="text-xs text-muted-foreground">Unique shop names</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseEntries.length}</div>
            <p className="text-xs text-muted-foreground">Ready to save</p>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default Dashboard;