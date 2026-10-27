import { createSupabaseContext } from 'npm:@supabase/server@1';

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;
const RESULT_LIMIT = 8;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
};

function json(body: unknown, status = 200) {
    return Response.json(body, { status, headers: corsHeaders });
}

export default {
    async fetch(request: Request) {
        if (request.method === 'OPTIONS') {
            return new Response('ok', { headers: corsHeaders });
        }

        if (request.method !== 'POST') {
            return json({ error: 'Method not allowed.' }, 405);
        }

        const { data: context, error: authError } = await createSupabaseContext(request, {
            auth: 'publishable',
        });

        if (authError || !context) {
            return json({ error: authError?.message ?? 'Unauthorized.' }, authError?.status ?? 401);
        }

        try {
            const body = await request.json() as { query?: unknown };
            const query = typeof body.query === 'string' ? body.query.trim() : '';

            if (query.length < MIN_QUERY_LENGTH) {
                return json({ courts: [] });
            }

            if (query.length > MAX_QUERY_LENGTH) {
                return json({ error: `Search queries cannot exceed ${MAX_QUERY_LENGTH} characters.` }, 400);
            }

            const { data, error } = await context.supabaseAdmin.rpc('search_courts', {
                search_query: query,
                result_limit: RESULT_LIMIT,
            });

            if (error) throw error;

            return json({ courts: data ?? [] });
        } catch (error) {
            console.error('search-courts failed', error);
            return json({
                error: error instanceof Error ? error.message : 'Unable to search courts.',
            }, 500);
        }
    },
};
