import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCredentials } from '@/hooks/useCredentials';
import { Upload, Save, Package2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Product {
  sku: string;
  shop_name: string;
  title: string;
  shopify_product_id: string;
  id: string;
  image_url?: string;
  product_url?: string;
}

interface PurchaseEntry {
  sku: string;
  shop_name: string;
  title: string;
  quantity: number;
  receivedQuantity: number;
  isDone: boolean;
  isPartial: boolean;
}

export default function PurchasePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [purchaseEntries, setPurchaseEntries] = useState<PurchaseEntry[]>(() => {
    const stored = localStorage.getItem('lastUploadedPurchases');
    return stored ? JSON.parse(stored) : [];
  });
  const { data: credentials } = useCredentials();

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('products')
        .select('*')
        .order('shop_name');

      if (error) throw error;
      return data as Product[];
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const allEntries: PurchaseEntry[] = [];
      const fileNames: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        fileNames.push(file.name);
        
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const fileData: Array<{sku: string, quantity: number}> = jsonData.map((row: any) => ({
          sku: row['Product SKU'] || row.SKU || row.sku || '',
          quantity: parseInt(row['Product Quantity'] || row.Quantity || row.quantity || '1') || 1,
        })).filter(item => item.sku);

        for (const item of fileData) {
          const product = products.find(p => p.sku === item.sku);
          
          if (product) {
            const existingEntry = allEntries.find(
              e => e.sku === product.sku && e.shop_name === product.shop_name
            );
            
            if (existingEntry) {
              existingEntry.quantity += item.quantity;
            } else {
              allEntries.push({
                sku: product.sku,
                shop_name: product.shop_name,
                title: product.title,
                quantity: item.quantity,
                receivedQuantity: 0,
                isDone: false,
                isPartial: false,
              });
            }
          } else {
            const existingUnmatched = allEntries.find(
              e => e.sku === item.sku && e.shop_name === 'Unknown'
            );
            
            if (existingUnmatched) {
              existingUnmatched.quantity += item.quantity;
            } else {
              allEntries.push({
                sku: item.sku,
                shop_name: 'Unknown',
                title: 'Unknown Product',
                quantity: item.quantity,
                receivedQuantity: 0,
                isDone: false,
                isPartial: false,
              });
            }
          }
        }
      }

      // Create batch and save to database immediately
      const { data: batch, error: batchError } = await (supabase as any)
        .from('purchase_batches')
        .insert({
          upload_date: new Date().toISOString().split('T')[0],
          file_names: fileNames,
          total_items: allEntries.length,
          user_id: user.id,
        })
        .select()
        .maybeSingle();

      if (batchError) throw batchError;

      const records = allEntries.map(entry => ({
        date: new Date().toISOString().split('T')[0],
        shop_name: entry.shop_name,
        sku: entry.sku,
        type: 'purchase' as const,
        quantity: entry.isPartial ? entry.receivedQuantity : entry.quantity,
        notes: entry.isDone ? 'Completed' : (entry.isPartial ? `Partial: ${entry.receivedQuantity}/${entry.quantity}` : ''),
        batch_id: batch.id,
        user_id: user.id,
      }));

      const { error } = await (supabase as any).from('purchases').insert(records);
      if (error) throw error;

      setPurchaseEntries(allEntries);
      localStorage.setItem('lastUploadedPurchases', JSON.stringify(allEntries));

      const matched = allEntries.filter(e => e.shop_name !== 'Unknown').length;
      const unmatched = allEntries.filter(e => e.shop_name === 'Unknown').length;

      toast({
        title: "Files uploaded and saved",
        description: `Processed ${files.length} file(s): ${matched} matched SKUs, ${unmatched} unmatched`,
      });

      queryClient.invalidateQueries({ queryKey: ['purchase-batches'] });
    } catch (error: any) {
      toast({
        title: "Error processing files",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateEntry = (index: number, field: keyof PurchaseEntry, value: any) => {
    const updated = [...purchaseEntries];
    updated[index] = { ...updated[index], [field]: value };
    setPurchaseEntries(updated);
    localStorage.setItem('lastUploadedPurchases', JSON.stringify(updated));
  };

  const savePurchases = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (purchaseEntries.length === 0) {
        toast({
          title: "No entries to save",
          description: "Please upload a file first",
          variant: "destructive",
        });
        return;
      }

      const { data: batch, error: batchError } = await (supabase as any)
        .from('purchase_batches')
        .insert({
          upload_date: new Date().toISOString().split('T')[0],
          file_names: ['manual_entry'],
          total_items: purchaseEntries.length,
          user_id: user.id,
        })
        .select()
        .maybeSingle();

      if (batchError) throw batchError;

      const records = purchaseEntries.map(entry => ({
        date: new Date().toISOString().split('T')[0],
        shop_name: entry.shop_name,
        sku: entry.sku,
        type: 'purchase' as const,
        quantity: entry.isPartial ? entry.receivedQuantity : entry.quantity,
        notes: entry.isDone ? 'Completed' : (entry.isPartial ? `Partial: ${entry.receivedQuantity}/${entry.quantity}` : ''),
        batch_id: batch.id,
        user_id: user.id,
      }));

      const { error } = await (supabase as any).from('purchases').insert(records);

      if (error) throw error;

      toast({
        title: "Changes saved",
        description: `Saved ${records.length} updated entries`,
      });

      queryClient.invalidateQueries({ queryKey: ['purchase-batches'] });
    } catch (error: any) {
      toast({
        title: "Error saving purchases",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Purchase Upload</h2>
        <p className="text-muted-foreground">Upload and manage purchase entries</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload iThink Logistics File</CardTitle>
          <CardDescription>
            Upload CSV or Excel file containing SKUs to automatically create purchase entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              multiple
              className="max-w-md"
            />
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {purchaseEntries.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Purchase List</CardTitle>
                <CardDescription>Review and adjust quantities before saving</CardDescription>
              </div>
              <Button onClick={savePurchases} disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(
              purchaseEntries.reduce((acc, entry, idx) => {
                if (!acc[entry.shop_name]) acc[entry.shop_name] = [];
                acc[entry.shop_name].push({ ...entry, originalIndex: idx });
                return acc;
              }, {} as Record<string, (PurchaseEntry & { originalIndex: number })[]>)
            ).map(([shopName, entries]) => (
              <div key={shopName} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Package2 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">{shopName}</h3>
                  <Badge variant="secondary">{entries.length} items</Badge>
                </div>
                <div className="space-y-3">
                  {entries.map((entry) => {
                    const product = products.find(p => p.sku === entry.sku);
                    const isUnmatched = entry.shop_name === 'Unknown';
                    
                    return (
                      <div key={entry.originalIndex} className={`flex items-center gap-3 p-3 rounded-md transition-colors ${isUnmatched ? 'bg-destructive/10 border border-destructive/20' : entry.isDone ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted/50'}`}>
                        {/* Product Image */}
                        {product?.image_url && (
                          <img 
                            src={product.image_url} 
                            alt={entry.sku}
                            className="w-12 h-12 object-cover rounded flex-shrink-0"
                          />
                        )}

                        {/* SKU as Link */}
                        <div className="flex-1 min-w-0">
                          {product?.product_url ? (
                            <a 
                              href={product.product_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="font-medium text-primary hover:underline"
                            >
                              {entry.sku}
                            </a>
                          ) : (
                            <p className="font-medium">{entry.sku}</p>
                          )}
                          <p className="text-sm text-muted-foreground">Qty: {entry.quantity}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!entry.isDone && (
                            <>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={entry.isPartial}
                                  onChange={(e) => updateEntry(entry.originalIndex, 'isPartial', e.target.checked)}
                                  className="w-4 h-4 rounded border-input"
                                />
                                <span className="text-sm">Partial</span>
                              </label>
                              
                              {entry.isPartial && (
                                <Input
                                  type="number"
                                  min="1"
                                  max={entry.quantity}
                                  value={entry.receivedQuantity || ''}
                                  onChange={(e) => updateEntry(entry.originalIndex, 'receivedQuantity', parseInt(e.target.value) || 0)}
                                  placeholder="Qty"
                                  className="h-9 w-20"
                                />
                              )}

                              <Button
                                size="sm"
                                variant="default"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => {
                                  updateEntry(entry.originalIndex, 'isDone', true);
                                  if (!entry.isPartial) {
                                    updateEntry(entry.originalIndex, 'receivedQuantity', entry.quantity);
                                  }
                                }}
                                disabled={entry.isPartial && (!entry.receivedQuantity || entry.receivedQuantity <= 0)}
                              >
                                Mark as Done
                              </Button>
                            </>
                          )}
                          {entry.isDone && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                updateEntry(entry.originalIndex, 'isDone', false);
                                updateEntry(entry.originalIndex, 'isPartial', false);
                                updateEntry(entry.originalIndex, 'receivedQuantity', 0);
                              }}
                            >
                              Undo
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
