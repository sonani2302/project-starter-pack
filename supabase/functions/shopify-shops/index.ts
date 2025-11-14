import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

    console.log('Fetching shop_name metaobjects from Shopify...');

    const allShops: any[] = [];

    // Query to fetch all metaobjects of type shop_name
    const query = /* GraphQL */ `
      query GetShopNameMetaobjects($cursor: String) {
        metaobjects(first: 100, type: "shop_name", after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              displayName
              handle
              type
              fields {
                key
                value
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

      const metaobjectsConn = resp?.data?.metaobjects;
      if (!metaobjectsConn) {
        console.log('No metaobjects found or unexpected response structure');
        break;
      }

      const edges = metaobjectsConn.edges || [];
      console.log(`Fetched ${edges.length} shop metaobjects from this page`);

      for (const edge of edges) {
        const node = edge.node;
        allShops.push({
          id: node.id,
          displayName: node.displayName,
          handle: node.handle,
          type: node.type,
          fields: node.fields || [],
        });
      }

      hasNextPage = Boolean(metaobjectsConn.pageInfo?.hasNextPage);
      cursor = metaobjectsConn.pageInfo?.endCursor ?? null;

      if (hasNextPage) {
        await delay(400);
      }
    }

    console.log(`Total shop metaobjects fetched: ${allShops.length}`);

    return new Response(
      JSON.stringify({ success: true, shops: allShops }),
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
