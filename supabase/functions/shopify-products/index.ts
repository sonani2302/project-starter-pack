import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Small utility delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// GraphQL fetch with retry/backoff for 429 & 5xx and GraphQL throttle errors
async function fetchGraphQLWithRetry(
  storeUrl: string,
  token: string,
  query: string,
  variables: Record<string, any> = {},
  maxRetries = 6
) {
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= maxRetries) {
    const res = await fetch(`https://${storeUrl}/admin/api/2025-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.errors) {
        const isThrottle = json.errors.some((e: any) =>
          (e?.extensions?.code || '').toString().toLowerCase().includes('throttle') ||
          (e?.message || '').toLowerCase().includes('throttle')
        );
        if (isThrottle) {
          const backoff = Math.min(2000 * Math.pow(2, attempt), 15000);
          console.warn(`GraphQL throttled, backing off for ${backoff}ms (attempt ${attempt + 1})`);
          await delay(backoff);
          attempt++;
          lastError = json.errors;
          continue;
        }
      }
      return json;
    }

    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get('Retry-After'));
      const backoff = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(1000 * Math.pow(2, attempt), 15000);
      console.warn(`HTTP ${res.status} from Shopify, backing off for ${backoff}ms (attempt ${attempt + 1})`);
      await delay(backoff);
      attempt++;
      lastError = await res.text();
      continue;
    }

    const text = await res.text();
    throw new Error(`Shopify GraphQL error: ${res.status} ${text}`);
  }

  throw new Error(`Shopify GraphQL throttled/failed after ${maxRetries} retries: ${JSON.stringify(lastError)}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shopifyStoreUrl, shopifyToken } = await req.json();

    if (!shopifyStoreUrl || !shopifyToken) {
      throw new Error('Shopify credentials are required');
    }

    // Get user_id from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User authentication failed');
    }

    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Fetching products from Shopify (GraphQL)...');

    const allProducts: any[] = [];
    const unresolvedGids = new Set<string>();

    const query = /* GraphQL */ `
      query ProductsWithShopName($cursor: String) {
        products(first: 100, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              onlineStoreUrl
              featuredImage {
                url
              }
              metafield(namespace: "custom", key: "shop_name") {
                value
                reference {
                  ... on Metaobject {
                    displayName
                  }
                }
              }
              variants(first: 100) {
                edges {
                  node { id sku }
                }
              }
            }
          }
        }
      }
    `;

    let cursor: string | null = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const resp = await fetchGraphQLWithRetry(shopifyStoreUrl, shopifyToken, query, { cursor });

      const productsConn = resp?.data?.products;
      if (!productsConn) {
        throw new Error('Unexpected Shopify GraphQL response: missing products');
      }

      const edges = (productsConn.edges || []) as Array<{
        node: {
          id: string;
          title: string;
          onlineStoreUrl: string | null;
          featuredImage: { url: string } | null;
          metafield: { value: string; reference?: { displayName?: string } } | null;
          variants: { edges: Array<{ node: { id: string; sku: string | null } }> };
        }
      }>;

      console.log(`Fetched ${edges.length} products from this page`);

      for (const edge of edges) {
        const node = edge.node;
        // Prefer referenced metaobject displayName; else fall back to raw value
        const rawValue = node.metafield?.value || null;
        const refName = node.metafield?.reference?.displayName || null;
        let shopName = refName || rawValue || 'Unknown';
        if (!refName && rawValue && rawValue.startsWith('gid://')) {
          unresolvedGids.add(rawValue);
        }
        const variants = node.variants?.edges || [];
        const imageUrl = node.featuredImage?.url || null;
        const productUrl = node.onlineStoreUrl || null;

        for (const ve of variants) {
          const v = ve.node;
          if (v?.sku) {
            allProducts.push({
              shopify_product_id: node.id, // gid okay to store as text
              sku: v.sku,
              shop_name: shopName,
              title: node.title,
              variant_id: v.id,
              image_url: imageUrl,
              product_url: productUrl,
            });
          }
        }
      }

      hasNextPage = Boolean(productsConn.pageInfo?.hasNextPage);
      cursor = productsConn.pageInfo?.endCursor ?? null;

      if (hasNextPage) {
        // Brief pause between pages to be extra safe
        await delay(400);
      }
    }

    // Resolve any metaobject GIDs to human-readable names via a batched nodes() query
    if (unresolvedGids.size > 0) {
      console.log(`Resolving ${unresolvedGids.size} metaobject references to names...`);
      const ids = Array.from(unresolvedGids);
      const gidNameMap = new Map<string, string>();
      const nodesQuery = /* GraphQL */ `
        query ResolveMetaobjects($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Metaobject {
              id
              displayName
              handle
              fields { key value }
            }
          }
        }
      `;
      const batchSizeGids = 50;
      for (let i = 0; i < ids.length; i += batchSizeGids) {
        const batchIds = ids.slice(i, i + batchSizeGids);
        const nodesResp = await fetchGraphQLWithRetry(shopifyStoreUrl, shopifyToken, nodesQuery, { ids: batchIds });
        const nodes = nodesResp?.data?.nodes || [];
        
        console.log(`Processing batch of ${nodes.length} metaobjects...`);
        
        for (const n of nodes) {
          if (n && n.id) {
            // Log available keys to understand structure
            console.log(`Metaobject ${n.id}: keys=[${Object.keys(n).join(', ')}]`);
            console.log(`  - displayName: "${n.displayName || 'null'}"`);
            console.log(`  - handle: "${n.handle || 'null'}"`);
            console.log(`  - type: "${n.type || 'null'}"`);
            
            if (Array.isArray(n.fields)) {
              console.log(`  - fields (${n.fields.length}): ${n.fields.map((f: any) => `${f?.key}="${f?.value}"`).join(', ')}`);
            } else {
              console.log(`  - fields: not an array`);
            }

            // More explicit handling for your "Shop Name" metaobject
            const nameField = Array.isArray(n.fields)
              ? n.fields.find((f: any) => 
                  ['shop_name', 'name', 'shop', 'title', 'label'].includes(f?.key?.toLowerCase())
                )
              : null;

            // Try all possible sources in priority order
            const resolved = n.displayName 
              || nameField?.value 
              || (n.type && typeof n.type === 'string' ? n.type.split('_').pop() : null) // Extract from type
              || (Array.isArray(n.fields) && n.fields[0]?.value) // First field as last resort
              || n.handle 
              || n.id;

            console.log(`  ➜ Resolved to: "${resolved}"`);
            gidNameMap.set(n.id, resolved);
          }
        }
        // polite pause between node batches
        await delay(150);
      }
      // Replace any gid shop_name values with resolved names
      for (const p of allProducts) {
        if (typeof p.shop_name === 'string' && p.shop_name.startsWith('gid://')) {
          const mapped = gidNameMap.get(p.shop_name);
          if (mapped) p.shop_name = mapped;
        }
      }
      console.log(`Resolved ${gidNameMap.size} metaobject names.`);
    }

    // Fallback: if some shop_name values are still GIDs, try mapping from latest purchases by SKU
    try {
      const { data: purchaseRows, error: purchaseErr } = await supabase
        .from('purchases')
        .select('sku, shop_name, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (purchaseErr) {
        console.warn('Could not read purchases for fallback mapping:', purchaseErr);
      } else if (purchaseRows && purchaseRows.length) {
        const skuNameMap = new Map<string, string>();
        for (const r of purchaseRows as Array<{ sku: string; shop_name: string | null }>) {
          if (r?.sku && r.shop_name && !skuNameMap.has(r.sku)) {
            skuNameMap.set(r.sku, r.shop_name);
          }
        }
        let replaced = 0;
        for (const p of allProducts) {
          if (typeof p.shop_name === 'string' && p.shop_name.startsWith('gid://')) {
            const mapped = skuNameMap.get(p.sku);
            if (mapped) {
              p.shop_name = mapped;
              replaced++;
            }
          }
        }
        console.log(`Replaced ${replaced} gid shop names from purchase history.`);
      }
    } catch (e) {
      console.warn('Fallback mapping error:', e);
    }

    console.log(`Total products prepared for sync: ${allProducts.length}`);
    console.log('User ID:', user.id);

    // Add user_id to all products
    const productsWithUser = allProducts.map(p => ({ ...p, user_id: user.id }));
    console.log('Sample product with user_id:', productsWithUser[0]);

    // Clear existing products for this user and insert new ones in batches
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting old products:', deleteError);
    }

    const batchSize = 100;
    for (let i = 0; i < productsWithUser.length; i += batchSize) {
      const batch = productsWithUser.slice(i, i + batchSize);
      const { error: insertError } = await supabase.from('products').insert(batch);
      if (insertError) {
        console.error('Error inserting products:', insertError);
        throw insertError;
      }
      // brief delay between inserts to be gentle on DB
      await delay(50);
    }

    console.log('Successfully synced products to database');

    return new Response(
      JSON.stringify({ success: true, count: allProducts.length }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
