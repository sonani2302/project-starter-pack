import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RotateCcw, Plus, Trash2, Search, Filter } from "lucide-react";
import { format } from "date-fns";

interface Return {
  id: string;
  return_date: string;
  shop_name: string;
  sku: string;
  quantity: number;
  notes?: string;
  created_at: string;
}

export default function ReturnsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [shopName, setShopName] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [shopFilter, setShopFilter] = useState("all");
  const [minQty, setMinQty] = useState("");

  const { data: returns, isLoading } = useQuery({
    queryKey: ['returns'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('returns')
        .select('*')
        .order('return_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  const { data: shops } = useQuery({
    queryKey: ['shop-names'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('products')
        .select('shop_name')
        .order('shop_name');

      if (error) throw error;
      const uniqueShops = [...new Set(data.map((p: any) => p.shop_name))];
      return uniqueShops as string[];
    },
  });

  const createReturnMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      const { error } = await (supabase as any).from('returns').insert({
        return_date: returnDate,
        shop_name: shopName,
        sku,
        quantity,
        notes: notes || null,
        user_id: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Return created",
        description: "Return entry has been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      setIsDialogOpen(false);
      setShopName("");
      setSku("");
      setQuantity(1);
      setNotes("");
      setReturnDate(new Date().toISOString().split('T')[0]);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating return",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteReturnMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('returns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Return deleted",
        description: "Return entry has been removed",
      });
      queryClient.invalidateQueries({ queryKey: ['returns'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting return",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!shopName || !sku) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createReturnMutation.mutate();
  };

  const uniqueShopNames = useMemo(() => {
    if (!returns) return [];
    return [...new Set(returns.map(r => r.shop_name))];
  }, [returns]);

  const filteredReturns = useMemo(() => {
    if (!returns) return [];
    
    return returns.filter((returnItem) => {
      const matchesSearch =
        searchQuery === "" ||
        returnItem.shop_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        returnItem.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        returnItem.notes?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDate = dateFilter === "" || returnItem.return_date === dateFilter;
      const matchesShop = shopFilter === "all" || returnItem.shop_name === shopFilter;
      const matchesQty = minQty === "" || returnItem.quantity >= parseInt(minQty);

      return matchesSearch && matchesDate && matchesShop && matchesQty;
    });
  }, [returns, searchQuery, dateFilter, shopFilter, minQty]);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Returns</h1>
          <p className="text-muted-foreground">Manage product returns by shop and date</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Return
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by shop, SKU, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Input
          type="date"
          placeholder="Filter by date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-[180px]"
        />
        <Select value={shopFilter} onValueChange={setShopFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by shop" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shops</SelectItem>
            {uniqueShopNames.map((shop) => (
              <SelectItem key={shop} value={shop}>
                {shop}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          placeholder="Min quantity"
          value={minQty}
          onChange={(e) => setMinQty(e.target.value)}
          className="w-[140px]"
          min="1"
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : !returns || returns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No returns recorded yet</p>
            </div>
          ) : filteredReturns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No returns match your filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return Date</TableHead>
                  <TableHead>Shop Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {format(new Date(item.return_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-primary" />
                        {item.shop_name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {item.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                      {item.notes || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteReturnMutation.mutate(item.id)}
                        disabled={deleteReturnMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Return Entry</DialogTitle>
            <DialogDescription>
              Add a new return record for a product
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="return-date">Return Date *</Label>
              <Input
                id="return-date"
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shop-name">Shop Name *</Label>
              <Select value={shopName} onValueChange={setShopName}>
                <SelectTrigger id="shop-name">
                  <SelectValue placeholder="Select shop" />
                </SelectTrigger>
                <SelectContent>
                  {shops?.map((shop) => (
                    <SelectItem key={shop} value={shop}>
                      {shop}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                placeholder="Enter SKU"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this return..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createReturnMutation.isPending}
            >
              {createReturnMutation.isPending ? "Creating..." : "Create Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
