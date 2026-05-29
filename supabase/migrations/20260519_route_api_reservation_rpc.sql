create or replace function public.reserve_route_api_call(
  p_user_id uuid,
  p_limit_per_minute integer,
  p_token_cost integer,
  p_provider text,
  p_origin text default null,
  p_destination text default null
)
returns table (
  status text,
  charged_tokens integer,
  window_start timestamptz,
  call_count integer,
  token_balance integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz := date_trunc('minute', now());
  v_call_count integer;
  v_wallet record;
begin
  insert into public.route_api_call_limits (user_id, window_start, call_count)
  values (p_user_id, v_window_start, 1)
  on conflict (user_id, window_start)
  do update set call_count = public.route_api_call_limits.call_count + 1
  returning public.route_api_call_limits.call_count into v_call_count;

  if v_call_count > p_limit_per_minute then
    update public.route_api_call_limits
      set call_count = greatest(call_count - 1, 0)
      where user_id = p_user_id and window_start = v_window_start;

    return query
      select 'rate_limited'::text, 0, v_window_start, greatest(v_call_count - 1, 0), null::integer;
    return;
  end if;

  select id, token_balance
    into v_wallet
    from public.wallets
    where user_id = p_user_id
    for update;

  if not found or coalesce(v_wallet.token_balance, 0) < p_token_cost then
    update public.route_api_call_limits
      set call_count = greatest(call_count - 1, 0)
      where user_id = p_user_id and window_start = v_window_start;

    return query
      select 'insufficient_tokens'::text, 0, v_window_start, greatest(v_call_count - 1, 0), coalesce(v_wallet.token_balance, 0);
    return;
  end if;

  update public.wallets
    set token_balance = token_balance - p_token_cost
    where id = v_wallet.id;

  insert into public.ledger_entries (
    user_id,
    amount,
    currency,
    operation_type,
    description
  ) values (
    p_user_id,
    -p_token_cost,
    'TOKEN',
    'ROUTE_API_CALL',
    concat(coalesce(p_provider, 'Route provider'), ' route lookup ', coalesce(p_origin, ''), '-', coalesce(p_destination, ''))
  );

  return query
    select 'ok'::text, p_token_cost, v_window_start, v_call_count, (v_wallet.token_balance - p_token_cost);
end;
$$;
