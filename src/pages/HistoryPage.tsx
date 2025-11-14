// Purchase history management page
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { History, Trash2, Eye, Download, ArrowLeft, Save, Package2 } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

interface Batch {
  id: string;
  upload_date: string;
  file_names: string[];
  total_items: number;
  notes?: string;
  created_at: string;
}

interface Purchase {
  id: string;
  date: string;
  shop_name: string;
  sku: string;
  quantity: number;
  type: string;
  notes?: string;
  batch_id: string;
}

interface Product {
  sku: string;
  shop_name: string;
  title: string;
  image_url?: string;
  product_url?: string;
}

export default function HistoryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [editablePurchases, setEditablePurchases] = useState<Purchase[]>([]);

  const { data: batches, isLoading } = useQuery({
    queryKey: ['purchase-batches'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('purchase_batches')
        .select('*')
        .order('upload_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Batch[];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('products')
        .select('sku, shop_name, title, image_url, product_url')
        .order('shop_name');

      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: batchPurchases } = useQuery({
    queryKey: ['batch-purchases', selectedBatch?.id],
    enabled: !!selectedBatch,
    queryFn: async () => {
      if (!selectedBatch) return [];
      const { data, error } = await (supabase as any)
        .from('purchases')
        .select('*')
        .eq('batch_id', selectedBatch.id);

      if (error) throw error;
      setEditablePurchases(data || []);
      return data as Purchase[];
    },
  });

  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await (supabase as any)
        .from('purchase_batches')
        .delete()
        .eq('id', batchId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Batch deleted",
        description: "Upload batch and all related purchases have been removed",
      });
      queryClient.invalidateQueries({ queryKey: ['purchase-batches'] });
      setSelectedBatch(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting batch",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateEntry = (index: number, field: keyof Purchase, value: any) => {
    const updated = [...editablePurchases];
    updated[index] = { ...updated[index], [field]: value };
    setEditablePurchases(updated);
  };

  const saveChanges = async () => {
    try {
      for (const purchase of editablePurchases) {
        const { error } = await (supabase as any)
          .from('purchases')
          .update({
            quantity: purchase.quantity,
            type: purchase.type,
            notes: purchase.notes,
          })
          .eq('id', purchase.id);

        if (error) throw error;
      }

      toast({
        title: "Changes saved",
        description: `Updated ${editablePurchases.length} entries`,
      });

      queryClient.invalidateQueries({ queryKey: ['batch-purchases', selectedBatch?.id] });
    } catch (error: any) {
      toast({
        title: "Error saving changes",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const downloadOriginal = (batch: Batch, purchases: Purchase[]) => {
    const exportData = purchases.map(p => ({
      'Product SKU': p.sku,
      'Product Quantity': p.quantity,
      'Shop Name': p.shop_name,
      'Date': p.date,
      'Type': p.type,
      'Notes': p.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Purchases');

    const fileName = `${batch.file_names[0] || `batch_${batch.upload_date}`}`;
    XLSX.writeFile(wb, fileName);

    toast({
      title: "Download successful",
      description: `Downloaded ${fileName}`,
    });
  };

  const groupedBatches = batches?.reduce((acc, batch) => {
    if (!acc[batch.upload_date]) {
      acc[batch.upload_date] = [];
    }
    acc[batch.upload_date].push(batch);
    return acc;
  }, {} as Record<string, Batch[]>);

  if (selectedBatch && editablePurchases.length > 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedBatch(null)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to History
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => downloadOriginal(selectedBatch, editablePurchases)}>
              <Download className="h-4 w-4 mr-2" />
              Download Original
            </Button>
            <Button onClick={saveChanges}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedBatch.file_names.join(', ')}
            </CardTitle>
            <CardDescription>
              Uploaded on {format(new Date(selectedBatch.upload_date), 'MMMM dd, yyyy')} - {selectedBatch.total_items} items
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(
              editablePurchases.reduce((acc, purchase, idx) => {
                if (!acc[purchase.shop_name]) acc[purchase.shop_name] = [];
                acc[purchase.shop_name].push({ ...purchase, originalIndex: idx });
                return acc;
              }, {} as Record<string, (Purchase & { originalIndex: number })[]>)
            ).map(([shopName, entries]) => (
              <div key={shopName} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Package2 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">{shopName}</h3>
                  <Badge variant="secondary">{entries.length} items</Badge>
                </div>
                <div className="space-y-3">
                  {entries.map((entry: any) => {
                    const product = products.find(p => p.sku === entry.sku);
                    const isUnmatched = entry.shop_name === 'Unknown';
                    
                    return (
                      <div key={entry.id} className={`grid grid-cols-12 gap-3 items-center p-3 rounded-md ${isUnmatched ? 'bg-destructive/10 border border-destructive/20' : 'bg-muted/50'}`}>
                        {product?.image_url && (
                          <div className="col-span-1">
                            <img 
                              src={product.image_url} 
                              alt={product.title}
                              className="w-12 h-12 object-cover rounded"
                            />
                          </div>
                        )}
                        <div className={product?.image_url ? "col-span-2" : "col-span-3"}>
                          <Label className="text-xs text-muted-foreground">SKU</Label>
                          <p className="font-medium text-sm">{entry.sku}</p>
                        </div>
                        <div className={product?.image_url ? "col-span-3" : "col-span-3"}>
                          <Label className="text-xs text-muted-foreground">Product</Label>
                          {product?.product_url ? (
                            <a 
                              href={product.product_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline truncate block"
                            >
                              {product.title || entry.sku}
                            </a>
                          ) : (
                            <p className="text-sm truncate">{product?.title || entry.sku}</p>
                          )}
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor={`qty-${entry.id}`} className="text-xs">Quantity</Label>
                          <Input
                            id={`qty-${entry.id}`}
                            type="number"
                            min="1"
                            value={entry.quantity}
                            onChange={(e) => updateEntry(entry.originalIndex, 'quantity', parseInt(e.target.value) || 1)}
                            className="h-8"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor={`type-${entry.id}`} className="text-xs">Type</Label>
                          <select
                            id={`type-${entry.id}`}
                            value={entry.type}
                            onChange={(e) => updateEntry(entry.originalIndex, 'type', e.target.value)}
                            className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="purchase">Purchase</option>
                            <option value="return">Return</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor={`notes-${entry.id}`} className="text-xs">Notes</Label>
                          <Input
                            id={`notes-${entry.id}`}
                            value={entry.notes || ''}
                            onChange={(e) => updateEntry(entry.originalIndex, 'notes', e.target.value)}
                            placeholder="Optional"
                            className="h-8"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">History</h1>
        <p className="text-muted-foreground">
          View and manage all upload batches and purchases
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Upload History
          </CardTitle>
          <CardDescription>
            All purchase uploads grouped by date
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : !groupedBatches || Object.keys(groupedBatches).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No upload history yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedBatches).map(([date, batches]) => (
                <div key={date} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3">
                    {format(new Date(date), 'MMMM dd, yyyy')}
                  </h3>
                  <div className="space-y-2">
                    {batches.map((batch) => (
                      <div key={batch.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {batch.file_names.join(', ')}
                            </span>
                            <Badge variant="secondary">{batch.total_items} items</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Uploaded {format(new Date(batch.created_at), 'h:mm a')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedBatch(batch)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View & Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteBatchMutation.mutate(batch.id)}
                            disabled={deleteBatchMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
