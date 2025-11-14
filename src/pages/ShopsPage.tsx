import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useCredentials } from "@/hooks/useCredentials";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Store, Search, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Shop {
  id: string;
  displayName: string;
  handle: string;
  type: string;
  fields: Array<{ key: string; value: string }>;
}

export default function ShopsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [returnData, setReturnData] = useState({
    sku: "",
    quantity: 1,
    return_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const { data: credentials } = useCredentials();

  const { data: shops, isLoading, refetch } = useQuery({
    queryKey: ["shops"],
    queryFn: async () => {
      if (!credentials) {
        throw new Error("Shopify credentials not configured");
      }
      const { data, error } = await supabase.functions.invoke("shopify-shops", {
        body: {
          shopifyStoreUrl: credentials.shopify_store_url,
          shopifyToken: credentials.shopify_admin_token,
        },
      });
      if (error) throw error;
      return data.shops as Shop[];
    },
    enabled: !!credentials,
  });

  const createReturnMutation = useMutation({
    mutationFn: async (returnEntry: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      const { error } = await (supabase as any).from("returns").insert([{ ...returnEntry, user_id: user.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Return created",
        description: "Return entry has been successfully created",
      });
      setIsReturnDialogOpen(false);
      setReturnData({
        sku: "",
        quantity: 1,
        return_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["returns"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create return entry",
        variant: "destructive",
      });
      console.error("Error creating return:", error);
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Shops refreshed",
        description: "Successfully fetched latest shop data from Shopify",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh shops",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateReturn = (shop: Shop) => {
    setSelectedShop(shop);
    setIsReturnDialogOpen(true);
  };

  const handleSubmitReturn = () => {
    if (!selectedShop || !returnData.sku) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createReturnMutation.mutate({
      shop_name: selectedShop.displayName,
      sku: returnData.sku,
      quantity: returnData.quantity,
      return_date: returnData.return_date,
      notes: returnData.notes,
    });
  };

  const uniqueTypes = useMemo(() => {
    if (!shops) return [];
    return Array.from(new Set(shops.map((shop) => shop.type)));
  }, [shops]);

  const filteredShops = useMemo(() => {
    if (!shops) return [];
    
    return shops.filter((shop) => {
      const matchesSearch =
        searchQuery === "" ||
        shop.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.handle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.fields?.some((field) =>
          field.value?.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesType = typeFilter === "all" || shop.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [shops, searchQuery, typeFilter]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Shops</h1>
          <p className="text-muted-foreground">View all shop name metaobjects from Shopify</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by shop name, handle, or field values..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {uniqueTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!shops || shops.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No shops found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop Name</TableHead>
                <TableHead>Handle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShops.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No shops match your search criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredShops.map((shop) => (
                  <TableRow key={shop.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-primary" />
                        {shop.displayName}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{shop.handle}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {shop.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      {shop.fields && shop.fields.length > 0 ? (
                        <div className="space-y-1">
                          {shop.fields.map((field, idx) => (
                            <div key={idx} className="text-sm">
                              <span className="font-medium text-muted-foreground">{field.key}:</span>{" "}
                              <span className="text-foreground">{field.value}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No fields</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateReturn(shop)}
                        className="gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Create Return
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Return Entry</DialogTitle>
            <DialogDescription>
              Create a new return entry for {selectedShop?.displayName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="shop-name">Shop Name</Label>
              <Input
                id="shop-name"
                value={selectedShop?.displayName || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                placeholder="Enter SKU"
                value={returnData.sku}
                onChange={(e) =>
                  setReturnData({ ...returnData, sku: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={returnData.quantity}
                onChange={(e) =>
                  setReturnData({ ...returnData, quantity: parseInt(e.target.value) || 1 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-date">Return Date *</Label>
              <Input
                id="return-date"
                type="date"
                value={returnData.return_date}
                onChange={(e) =>
                  setReturnData({ ...returnData, return_date: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this return..."
                value={returnData.notes}
                onChange={(e) =>
                  setReturnData({ ...returnData, notes: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReturnDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReturn}
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
