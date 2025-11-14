import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Database, Cloud, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [storeUrl, setStoreUrl] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [hasCredentials, setHasCredentials] = useState(false);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    const { data, error } = await (supabase as any)
      .from("user_credentials")
      .select("*")
      .maybeSingle();

    if (data) {
      setStoreUrl(data.shopify_store_url);
      setAdminToken(data.shopify_admin_token);
      setHasCredentials(true);
    }
  };

  const handleSaveCredentials = async () => {
    if (!storeUrl || !adminToken) {
      toast({
        title: "Error",
        description: "Please fill in both fields",
        variant: "destructive",
      });
      return;
    }

    // Validate store URL format
    if (!storeUrl.includes('.myshopify.com')) {
      toast({
        title: "Invalid Store URL",
        description: "Store URL must be in format: your-store.myshopify.com",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const credentials = {
      user_id: user.id,
      shopify_store_url: storeUrl,
      shopify_admin_token: adminToken,
    };

    const { error } = hasCredentials
      ? await (supabase as any).from("user_credentials").update(credentials).eq("user_id", user.id)
      : await (supabase as any).from("user_credentials").insert(credentials);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Credentials saved successfully",
      });
      setHasCredentials(true);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">App configuration and information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shopify Credentials</CardTitle>
          <CardDescription>
            Enter your Shopify store URL and admin token to sync your products
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="storeUrl">Store URL</Label>
            <Input
              id="storeUrl"
              placeholder="your-store.myshopify.com"
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter only your store domain (e.g., my-store.myshopify.com)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminToken">Admin Token</Label>
            <Input
              id="adminToken"
              type="password"
              placeholder="shpat_..."
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
            />
          </div>
          <Button onClick={handleSaveCredentials} disabled={loading}>
            {loading ? "Saving..." : hasCredentials ? "Update Credentials" : "Save Credentials"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle>Shopify Integration</CardTitle>
            </div>
            <CardDescription>Connected to your Shopify store</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="default">Connected</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">API Version</span>
                <span className="text-sm">2025-01</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle>Database</CardTitle>
            </div>
            <CardDescription>Lovable Cloud storage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tables</span>
                <span className="text-sm">2 (products, purchases)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-primary" />
              <CardTitle>Backend Functions</CardTitle>
            </div>
            <CardDescription>Serverless API endpoints</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Functions</span>
                <span className="text-sm">1 active</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">shopify-products</span>
                <Badge variant="secondary">Deployed</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <CardTitle>App Information</CardTitle>
            </div>
            <CardDescription>Version and details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Version</span>
                <span className="text-sm">1.0.0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Type</span>
                <span className="text-sm">Single-user</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>Shopify Purchase Tracker</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p className="text-sm text-muted-foreground">
            This application helps you manage daily product purchases and returns from your Shopify store. 
            It integrates with Shopify's Admin API to fetch products and their metafields, then allows you 
            to upload logistics data to track purchases and returns efficiently.
          </p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>Sync products from Shopify with automatic pagination</li>
            <li>Upload Excel files to import SKU data</li>
            <li>Track purchases and returns grouped by shop name</li>
            <li>View historical data with filters</li>
            <li>Export records to Excel for reporting</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;