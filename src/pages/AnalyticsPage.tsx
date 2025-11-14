import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Calendar, TrendingUp, ShoppingCart, DollarSign, Package } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import * as XLSX from "xlsx";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [courierFilter, setCourierFilter] = useState<string>("all");
  const [uploading, setUploading] = useState(false);
  const [selectedDeliveryStatuses, setSelectedDeliveryStatuses] = useState<string[]>(["Delivered", "RTO"]);

  const { data: orders = [], refetch } = useQuery<any[]>({
    queryKey: ["orders", startDate, endDate, paymentFilter, statusFilter, stateFilter, courierFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from("orders")
        .select("*")
        .gte("order_date", startDate)
        .lte("order_date", endDate)
        .order("order_date", { ascending: true });

      if (paymentFilter !== "all") {
        query = query.eq("payment_method", paymentFilter);
      }
      if (statusFilter !== "all") {
        query = query.eq("order_status", statusFilter);
      }
      if (stateFilter !== "all") {
        query = query.eq("customer_state", stateFilter);
      }
      if (courierFilter !== "all") {
        query = query.eq("courier_company", courierFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: filterOptions } = useQuery({
    queryKey: ["order-filters"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("orders").select("payment_method, order_status, customer_state, courier_company");
      if (error) throw error;
      
      const states = [...new Set((data || []).map((o: any) => o.customer_state).filter(Boolean))].sort() as string[];
      const couriers = [...new Set((data || []).map((o: any) => o.courier_company).filter(Boolean))].sort() as string[];
      const statuses = [...new Set((data || []).map((o: any) => o.order_status).filter(Boolean))].sort() as string[];
      
      return { states, couriers, statuses };
    },
    enabled: !!user,
  });

  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.order_total || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const deliveredOrders = orders.filter(o => o.order_status === "Delivered").length;
    const conversionRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;

    return { totalOrders, totalRevenue, avgOrderValue, conversionRate };
  }, [orders]);

  const ordersOverTime = useMemo(() => {
    const grouped = orders.reduce((acc, order) => {
      const date = format(parseISO(order.order_date), "MMM dd");
      if (!acc[date]) acc[date] = { date, orders: 0, revenue: 0 };
      acc[date].orders += 1;
      acc[date].revenue += Number(order.order_total || 0);
      return acc;
    }, {} as Record<string, { date: string; orders: number; revenue: number }>);

    return Object.values(grouped);
  }, [orders]);

  const deliveryMetrics = useMemo(() => {
    const attemptedOrders = orders.filter(o => 
      selectedDeliveryStatuses.some(status => o.order_status === status)
    );
    const totalAttempted = attemptedOrders.length;
    const deliveredOrders = attemptedOrders.filter(o => o.order_status === "Delivered").length;
    const deliveryPercentage = totalAttempted > 0 ? (deliveredOrders / totalAttempted) * 100 : 0;

    return { totalAttempted, deliveredOrders, deliveryPercentage };
  }, [orders, selectedDeliveryStatuses]);

  const orderStatusData = useMemo(() => {
    const grouped = orders.reduce((acc, order) => {
      const status = order.order_status || "Unknown";
      if (!acc[status]) acc[status] = 0;
      acc[status] += 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [orders]);


  const topStates = useMemo(() => {
    const grouped = orders.reduce((acc: Record<string, number>, order: any) => {
      const state = order.customer_state || "Unknown";
      if (!acc[state]) acc[state] = 0;
      acc[state] += 1;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [orders]);

  const courierPerformance = useMemo(() => {
    const grouped = orders.reduce((acc: Record<string, { courier: string; total: number; delivered: number }>, order: any) => {
      const courier = order.courier_company || "Unknown";
      if (!acc[courier]) acc[courier] = { courier, total: 0, delivered: 0 };
      acc[courier].total += 1;
      if (order.order_status === "Delivered") acc[courier].delivered += 1;
      return acc;
    }, {});

    return Object.values(grouped).map((item: { courier: string; total: number; delivered: number }) => ({
      courier: item.courier,
      total: item.total,
      deliveryRate: item.total > 0 ? (item.delivered / item.total) * 100 : 0,
    }));
  }, [orders]);

  // Helper function to parse dates in DD-MM-YYYY HH:mm:ss format
  const parseCustomDate = (dateString: string): string | null => {
    if (!dateString || dateString === "N/A") return null;
    
    try {
      // Handle DD-MM-YYYY HH:mm:ss format
      const parts = dateString.trim().split(/[\s-:]+/);
      if (parts.length >= 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Month is 0-indexed
        const year = parseInt(parts[2]);
        const hours = parts[3] ? parseInt(parts[3]) : 0;
        const minutes = parts[4] ? parseInt(parts[4]) : 0;
        const seconds = parts[5] ? parseInt(parts[5]) : 0;
        
        const date = new Date(year, month, day, hours, minutes, seconds);
        
        // Validate the date
        if (isNaN(date.getTime())) {
          console.warn("Invalid date:", dateString);
          return null;
        }
        
        return date.toISOString();
      }
      
      // Fallback to standard parsing
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    } catch (error) {
      console.warn("Error parsing date:", dateString, error);
      return null;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

          if (jsonData.length === 0) {
            toast.error("CSV file is empty or invalid");
            return;
          }

          const ordersToInsert = jsonData
            .filter(row => row["Order Number"]) // Skip empty rows
            .map((row) => ({
              user_id: user.id,
              order_number: row["Order Number"] || "",
              sub_order_number: row["Sub Order Number"] || null,
              order_date: parseCustomDate(row["Order Date"]) || new Date().toISOString(),
              channel: row["Channel"] || "Shopify",
              product_name: row["Product Name"] || "",
              product_sku: row["Product SKU"] || "",
              product_quantity: Number(row["Product Quantity"]) || 1,
              product_price: Number(row["Product Price"]) || 0,
              product_discount: Number(row["Product Discount"]) || 0,
              payment_method: row["Payment Method"] || "COD",
              customer_name: row["Customer Name"] || null,
              customer_email: row["Customer Email"] || null,
              customer_mobile: row["Customer Mobile No"] || null,
              customer_city: row["Customer City"] || null,
              customer_state: row["Customer State"] || null,
              customer_pincode: row["Customer Pincode"] || null,
              order_total: Number(row["Order Total"]) || 0,
              order_status: row["Order Status"] || "Pending",
              courier_company: row["Courier Company"] || null,
              awb_no: row["AWB No"] || null,
              awb_assigned_date: parseCustomDate(row["AWB Assigned Date"]),
              warehouse_id: row["Warehouse ID"] || null,
              warehouse_name: row["Warehouse Nick Name"] || null,
              order_pickup_date: parseCustomDate(row["Order Pickup Date"]),
              order_delivered_date: parseCustomDate(row["Order Delivered Date"]),
              zone: row["Zone"] || null,
              billed_weight: Number(row["Billed Weight"]) || 0,
              fwd_charges: Number(row["FWD Charges"]) || 0,
              rto_charges: Number(row["RTO Charges"]) || 0,
              cod_charges: Number(row["COD Charges"]) || 0,
              gst_charges: Number(row["GST Charges"]) || 0,
              total_freight_charge: Number(row["Total Freight Charge"]) || 0,
              store_name: row["Store Name"] || null,
              store_order_date: parseCustomDate(row["Store Order Date"]),
            }));

          if (ordersToInsert.length === 0) {
            toast.error("No valid orders found in CSV");
            return;
          }

          const { error } = await (supabase as any).from("orders").insert(ordersToInsert);
          if (error) throw error;

          toast.success(`Successfully uploaded ${ordersToInsert.length} orders!`);
          refetch();
        } catch (innerError: any) {
          console.error("CSV processing error:", innerError);
          toast.error("Failed to process CSV: " + innerError.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      console.error("File upload error:", error);
      toast.error("Failed to upload file: " + error.message);
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = "";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Complete analysis of your order data</p>
        </div>
        <div className="flex gap-2">
          <Label htmlFor="order-upload" className="cursor-pointer">
            <Button variant="outline" disabled={uploading} asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Uploading..." : "Upload Orders CSV"}
              </span>
            </Button>
          </Label>
          <Input
            id="order-upload"
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>End Date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div>
            <Label>Payment Method</Label>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="COD">COD</SelectItem>
                <SelectItem value="Prepaid">Prepaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Order Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {filterOptions?.statuses.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>State</Label>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {filterOptions?.states.map((state) => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Courier</Label>
            <Select value={courierFilter} onValueChange={setCourierFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Couriers</SelectItem>
                {filterOptions?.couriers.map((courier) => (
                  <SelectItem key={courier} value={courier}>{courier}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{metrics.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{metrics.avgOrderValue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.conversionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Orders Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ordersOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={ordersOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Performance</CardTitle>
            <CardDescription>
              Delivery rate based on attempted deliveries
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Attempted</p>
                <p className="text-2xl font-bold">{deliveryMetrics.totalAttempted}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold">{deliveryMetrics.deliveredOrders}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivery Rate</p>
                <p className="text-2xl font-bold">{deliveryMetrics.deliveryPercentage.toFixed(1)}%</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[deliveryMetrics]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="deliveryPercentage" fill="hsl(var(--primary))" name="Delivery %" />
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-2 pt-4 border-t">
              <Label className="text-sm font-medium">Filter by Order Status:</Label>
              <div className="flex flex-wrap gap-4">
                {filterOptions?.statuses.map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`delivery-${status}`}
                      checked={selectedDeliveryStatuses.includes(status)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedDeliveryStatuses([...selectedDeliveryStatuses, status]);
                        } else {
                          setSelectedDeliveryStatuses(selectedDeliveryStatuses.filter(s => s !== status));
                        }
                      }}
                    />
                    <label
                      htmlFor={`delivery-${status}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {status}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={orderStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>


        <Card>
          <CardHeader>
            <CardTitle>Top 10 States by Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topStates}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Courier Performance (Delivery Rate %)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={courierPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="courier" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="hsl(var(--muted))" name="Total Orders" />
                <Bar dataKey="deliveryRate" fill="hsl(var(--primary))" name="Delivery Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
