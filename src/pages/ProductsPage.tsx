// Products catalog page
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [shopFilter, setShopFilter] = useState('');
  const [skuFilter, setSkuFilter] = useState('');
  const { toast } = useToast();

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('products')
        .select('*')
        .order('shop_name', { ascending: true })
        .order('title', { ascending: true });

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch products',
          variant: 'destructive',
        });
        throw error;
      }

      return data as any[];
    },
  });

  const filteredProducts = products?.filter(
    (product: any) => {
      const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.shop_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesShop = !shopFilter || product.shop_name === shopFilter;
      const matchesSku = !skuFilter || product.sku.toLowerCase().includes(skuFilter.toLowerCase());
      return matchesSearch && matchesShop && matchesSku;
    }
  );

  const uniqueShops = [...new Set(products?.map((p: any) => p.shop_name) || [])] as string[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Products</h1>
        <p className="text-muted-foreground">
          View and search all products from your Shopify store
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Catalog
          </CardTitle>
          <CardDescription>
            {products?.length || 0} products across all shops
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search all fields..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              placeholder="Filter by SKU..."
              value={skuFilter}
              onChange={(e) => setSkuFilter(e.target.value)}
            />
            <select
              value={shopFilter}
              onChange={(e) => setShopFilter(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All Shops</option>
              {uniqueShops.map(shop => (
                <option key={shop} value={shop}>{shop}</option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading products...</p>
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shop Name</TableHead>
                    <TableHead>Product Title</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Variant ID</TableHead>
                    <TableHead>Shopify Product ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Badge variant="outline">{product.shop_name}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{product.title}</TableCell>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {product.variant_id}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {product.shopify_product_id}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? (
                <>
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No products found matching "{searchQuery}"</p>
                </>
              ) : (
                <>
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No products available</p>
                  <p className="text-sm mt-1">
                    Click "Refresh Products from Shopify" on the Dashboard to sync products
                  </p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
