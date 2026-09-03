-- Supabase AIP Route and Airport Data Schema
-- All tables and functions use skylinetragedy_ namespace prefix

-- Route catalog and lookup tables
create table if not exists public.skylinetragedy_aip_regions (
  region_code text not null,
  region_name text not null,
  implemented boolean not null default false,
  aip_cycle text not null,
  region_aip_number text,
  source_system text,
  source_files text,
  route_count integer default 0,
  reference_point_count integer default 0,
  valid_from timestamptz,
  valid_until timestamptz,
  last_updated_at timestamptz default now(),
  notes text,
  primary key (region_code, aip_cycle)
);

create table if not exists public.skylinetragedy_aip_raw_sources (
  source_id text primary key,
  region_code text not null,
  aip_cycle text not null,
  source_file text not null,
  source_kind text,
  parsed boolean default false,
  row_count integer default 0,
  imported_at timestamptz default now()
);

create table if not exists public.skylinetragedy_aip_route_catalog (
  route_id text primary key,
  region_code text not null,
  aip_cycle text not null,
  route_code text not null,
  route_family text,
  direction text,
  origin_key text,
  destination_key text,
  route_text text,
  source_file text,
  source_row integer,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists public.skylinetragedy_aip_route_airport_index (
  region_code text not null,
  aip_cycle text not null,
  airport_code text not null,
  airport_role text not null,
  route_id text not null,
  route_code text not null,
  direction text,
  opposite_key text,
  primary key (region_code, aip_cycle, airport_code, airport_role, route_id)
);

create table if not exists public.skylinetragedy_aip_route_lookup_index (
  region_code text not null,
  aip_cycle text not null,
  departure_code text not null,
  arrival_code text not null,
  route_id text not null,
  route_code text not null,
  lookup_rank integer not null default 0,
  primary key (region_code, aip_cycle, departure_code, arrival_code, route_id)
);

create table if not exists public.skylinetragedy_aip_route_tokens (
  route_id text not null,
  sequence_number integer not null,
  token text not null,
  token_type text,
  airway text,
  region_code text not null,
  aip_cycle text not null,
  primary key (route_id, sequence_number)
);

create table if not exists public.skylinetragedy_aip_route_legs (
  route_id text not null,
  leg_sequence integer not null,
  from_fix text not null,
  airway text,
  to_fix text not null,
  region_code text not null,
  aip_cycle text not null,
  primary key (route_id, leg_sequence)
);

create table if not exists public.skylinetragedy_aip_route_edge_index (
  region_code text not null,
  aip_cycle text not null,
  from_fix text not null,
  to_fix text not null,
  airway text,
  route_id text not null,
  route_code text not null,
  leg_sequence integer not null,
  primary key (region_code, aip_cycle, from_fix, to_fix, route_id, leg_sequence)
);

create table if not exists public.skylinetragedy_aip_reference_points (
  point_id text primary key,
  region_code text not null,
  aip_cycle text not null,
  ident text not null,
  point_type text not null,
  name text,
  latitude_deg numeric not null,
  longitude_deg numeric not null,
  elevation_ft numeric,
  iso_country text,
  associated_airport text,
  frequency_khz numeric,
  dme_frequency_khz numeric,
  dme_channel text,
  usage_type text,
  power text,
  source_system text,
  source_file text
);

-- Airport, runway, frequency, and navaid tables used by emergency landing workflows
create table if not exists public.skylinetragedy_aip_airports (
  airport_id text primary key,
  icao text,
  iata text,
  ident text,
  name text not null,
  city text,
  country text,
  iso_country text,
  region_code text,
  latitude_deg numeric not null,
  longitude_deg numeric not null,
  elevation_ft numeric,
  airport_type text default 'normal',
  category text,
  source_system text,
  source_file text,
  imported_at timestamptz default now()
);

create table if not exists public.skylinetragedy_aip_runways (
  runway_id text primary key,
  airport_id text not null references public.skylinetragedy_aip_airports(airport_id) on delete cascade,
  airport_code text not null,
  name text not null,
  length_ft numeric,
  width_ft numeric,
  surface text,
  category text,
  bearing_deg numeric,
  start_latitude_deg numeric,
  start_longitude_deg numeric,
  end_latitude_deg numeric,
  end_longitude_deg numeric,
  source_system text,
  source_file text
);

create table if not exists public.skylinetragedy_aip_frequencies (
  frequency_id text primary key,
  airport_id text references public.skylinetragedy_aip_airports(airport_id) on delete cascade,
  airport_code text not null,
  type text not null,
  frequency_mhz numeric not null,
  description text,
  source_system text,
  source_file text
);

create table if not exists public.skylinetragedy_aip_navaids (
  navaid_id text primary key,
  ident text not null,
  name text,
  navaid_type text not null,
  latitude_deg numeric not null,
  longitude_deg numeric not null,
  elevation_ft numeric,
  frequency_khz numeric,
  dme_frequency_khz numeric,
  dme_channel text,
  associated_airport text,
  iso_country text,
  region_code text,
  usage_type text,
  power text,
  source_system text,
  source_file text
);

create index if not exists skylinetragedy_aip_route_lookup_pair_idx
  on public.skylinetragedy_aip_route_lookup_index (region_code, aip_cycle, departure_code, arrival_code, lookup_rank);

create index if not exists skylinetragedy_aip_route_legs_route_idx
  on public.skylinetragedy_aip_route_legs (route_id, leg_sequence);

create index if not exists skylinetragedy_aip_route_edge_from_idx
  on public.skylinetragedy_aip_route_edge_index (region_code, aip_cycle, from_fix);

create index if not exists skylinetragedy_aip_route_edge_to_idx
  on public.skylinetragedy_aip_route_edge_index (region_code, aip_cycle, to_fix);

create index if not exists skylinetragedy_aip_reference_ident_idx
  on public.skylinetragedy_aip_reference_points (ident);

create index if not exists skylinetragedy_aip_reference_ident_region_idx
  on public.skylinetragedy_aip_reference_points (ident, region_code);

create index if not exists skylinetragedy_aip_reference_airport_idx
  on public.skylinetragedy_aip_reference_points (associated_airport);

create index if not exists skylinetragedy_aip_airports_icao_idx
  on public.skylinetragedy_aip_airports (icao);

create index if not exists skylinetragedy_aip_airports_iata_idx
  on public.skylinetragedy_aip_airports (iata);

create index if not exists skylinetragedy_aip_airports_country_idx
  on public.skylinetragedy_aip_airports (iso_country);

create index if not exists skylinetragedy_aip_airports_location_idx
  on public.skylinetragedy_aip_airports (latitude_deg, longitude_deg);

create index if not exists skylinetragedy_aip_runways_airport_idx
  on public.skylinetragedy_aip_runways (airport_code);

create index if not exists skylinetragedy_aip_frequencies_airport_idx
  on public.skylinetragedy_aip_frequencies (airport_code);

create index if not exists skylinetragedy_aip_navaids_ident_idx
  on public.skylinetragedy_aip_navaids (ident);

create index if not exists skylinetragedy_aip_navaids_location_idx
  on public.skylinetragedy_aip_navaids (latitude_deg, longitude_deg);

create or replace function public.skylinetragedy_distance_nm(
  p_lat_a numeric,
  p_lon_a numeric,
  p_lat_b numeric,
  p_lon_b numeric
)
returns numeric
language sql
immutable
as $$
  select 3440.065 * 2 * asin(
    least(1, sqrt(
      power(sin(radians((p_lat_b - p_lat_a) / 2)), 2)
      + cos(radians(p_lat_a)) * cos(radians(p_lat_b)) * power(sin(radians((p_lon_b - p_lon_a) / 2)), 2)
    ))
  );
$$;

create or replace function public.skylinetragedy_search_aip_route(
  p_departure_code text,
  p_arrival_code text,
  p_region_code text default '*',
  p_aip_cycle text default '2605',
  p_limit integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_route record;
  v_graph_route record;
  v_legs jsonb;
  v_waypoints jsonb;
  v_departure text := upper(trim(coalesce(p_departure_code, '')));
  v_arrival text := upper(trim(coalesce(p_arrival_code, '')));
  v_region text := upper(coalesce(p_region_code, '*'));
  v_method text := 'supabase-indexed';
begin
  if v_departure = '' or v_arrival = '' then
    return jsonb_build_object('status', 'provider_failed', 'message', 'Departure and arrival are required.');
  end if;

  select lookup.route_id, lookup.route_code, lookup.region_code, lookup.aip_cycle, catalog.route_text
    into v_route
    from public.skylinetragedy_aip_route_lookup_index lookup
    left join public.skylinetragedy_aip_route_catalog catalog on catalog.route_id = lookup.route_id
    where lookup.departure_code = v_departure
      and lookup.arrival_code = v_arrival
      and lookup.aip_cycle in (p_aip_cycle, '*')
      and lookup.region_code in (upper(coalesce(p_region_code, '*')), '*')
    order by
      case when lookup.region_code = upper(coalesce(p_region_code, '*')) then 0 else 1 end,
      case when lookup.aip_cycle = p_aip_cycle then 0 else 1 end,
      lookup.lookup_rank asc
    limit 1;

  if not found then
    with recursive
    endpoint as (
      select dep.latitude_deg as dep_latitude_deg,
        dep.longitude_deg as dep_longitude_deg,
        arr.latitude_deg as arr_latitude_deg,
        arr.longitude_deg as arr_longitude_deg,
        public.skylinetragedy_distance_nm(dep.latitude_deg, dep.longitude_deg, arr.latitude_deg, arr.longitude_deg) as direct_nm
      from lateral (
        select airport.latitude_deg, airport.longitude_deg
          from public.skylinetragedy_aip_airports airport
          where upper(coalesce(airport.icao, '')) = v_departure
            or upper(coalesce(airport.ident, '')) = v_departure
            or upper(coalesce(airport.iata, '')) = v_departure
          order by case when upper(coalesce(airport.icao, '')) = v_departure then 0 else 1 end
          limit 1
      ) dep
      cross join lateral (
        select airport.latitude_deg, airport.longitude_deg
          from public.skylinetragedy_aip_airports airport
          where upper(coalesce(airport.icao, '')) = v_arrival
            or upper(coalesce(airport.ident, '')) = v_arrival
            or upper(coalesce(airport.iata, '')) = v_arrival
          order by case when upper(coalesce(airport.icao, '')) = v_arrival then 0 else 1 end
          limit 1
      ) arr
    ), starts as (
      select ref.ident,
        public.skylinetragedy_distance_nm(endpoint.dep_latitude_deg, endpoint.dep_longitude_deg, ref.latitude_deg, ref.longitude_deg) as from_departure_nm,
        public.skylinetragedy_distance_nm(ref.latitude_deg, ref.longitude_deg, endpoint.arr_latitude_deg, endpoint.arr_longitude_deg) as remaining_nm
      from endpoint
      join public.skylinetragedy_aip_reference_points ref on ref.latitude_deg is not null and ref.longitude_deg is not null
      where ref.point_type <> 'airport'
        and ref.aip_cycle in (p_aip_cycle, '*')
        and (v_region = '*' or ref.region_code = v_region or ref.iso_country = v_region)
        and public.skylinetragedy_distance_nm(endpoint.dep_latitude_deg, endpoint.dep_longitude_deg, ref.latitude_deg, ref.longitude_deg) <= greatest(250, endpoint.direct_nm * 0.22)
        and public.skylinetragedy_distance_nm(ref.latitude_deg, ref.longitude_deg, endpoint.arr_latitude_deg, endpoint.arr_longitude_deg) < endpoint.direct_nm * 1.35
      order by from_departure_nm asc
      limit 12
    ), goals as (
      select ref.ident,
        public.skylinetragedy_distance_nm(ref.latitude_deg, ref.longitude_deg, endpoint.arr_latitude_deg, endpoint.arr_longitude_deg) as to_arrival_nm
      from endpoint
      join public.skylinetragedy_aip_reference_points ref on ref.latitude_deg is not null and ref.longitude_deg is not null
      where ref.point_type <> 'airport'
        and ref.aip_cycle in (p_aip_cycle, '*')
        and (v_region = '*' or ref.region_code = v_region or ref.iso_country = v_region)
        and public.skylinetragedy_distance_nm(ref.latitude_deg, ref.longitude_deg, endpoint.arr_latitude_deg, endpoint.arr_longitude_deg) <= greatest(250, endpoint.direct_nm * 0.22)
        and public.skylinetragedy_distance_nm(endpoint.dep_latitude_deg, endpoint.dep_longitude_deg, ref.latitude_deg, ref.longitude_deg) < endpoint.direct_nm * 1.35
      order by to_arrival_nm asc
      limit 12
    ), graph_path as (
      select starts.ident,
        array[starts.ident]::text[] as path,
        array[]::text[] as airways,
        starts.from_departure_nm as routed_nm,
        starts.remaining_nm,
        1 as depth
      from starts
      union all
      select edge.to_fix,
        graph_path.path || edge.to_fix,
        graph_path.airways || coalesce(edge.airway, ''),
        graph_path.routed_nm + edge.leg_nm,
        edge.next_remaining_nm,
        graph_path.depth + 1
      from graph_path
      cross join endpoint
      join lateral (
        select edge.*,
          public.skylinetragedy_distance_nm(from_ref.latitude_deg, from_ref.longitude_deg, to_ref.latitude_deg, to_ref.longitude_deg) as leg_nm,
          public.skylinetragedy_distance_nm(to_ref.latitude_deg, to_ref.longitude_deg, endpoint.arr_latitude_deg, endpoint.arr_longitude_deg) as next_remaining_nm
        from public.skylinetragedy_aip_route_edge_index edge
        join lateral (
          select ref.latitude_deg, ref.longitude_deg
            from public.skylinetragedy_aip_reference_points ref
            where ref.ident = edge.from_fix
              and ref.latitude_deg is not null
              and ref.longitude_deg is not null
            order by
              case when ref.region_code = edge.region_code then 0 else 1 end,
              case when ref.aip_cycle = edge.aip_cycle then 0 else 1 end,
              case when ref.point_type <> 'airport' then 0 else 1 end
            limit 1
        ) from_ref on true
        join lateral (
          select ref.latitude_deg, ref.longitude_deg
            from public.skylinetragedy_aip_reference_points ref
            where ref.ident = edge.to_fix
              and ref.latitude_deg is not null
              and ref.longitude_deg is not null
            order by
              case when ref.region_code = edge.region_code then 0 else 1 end,
              case when ref.aip_cycle = edge.aip_cycle then 0 else 1 end,
              case when ref.point_type <> 'airport' then 0 else 1 end
            limit 1
        ) to_ref on true
        where edge.from_fix = graph_path.ident
          and not edge.to_fix = any(graph_path.path)
          and edge.aip_cycle in (p_aip_cycle, '*')
          and (v_region = '*' or edge.region_code = v_region)
          and public.skylinetragedy_distance_nm(to_ref.latitude_deg, to_ref.longitude_deg, endpoint.arr_latitude_deg, endpoint.arr_longitude_deg) <= endpoint.direct_nm * 1.8
          and graph_path.routed_nm + public.skylinetragedy_distance_nm(from_ref.latitude_deg, from_ref.longitude_deg, to_ref.latitude_deg, to_ref.longitude_deg) + public.skylinetragedy_distance_nm(to_ref.latitude_deg, to_ref.longitude_deg, endpoint.arr_latitude_deg, endpoint.arr_longitude_deg) <= endpoint.direct_nm * 2.1
        order by next_remaining_nm asc, leg_nm asc
        limit 12
      ) edge on true
      where graph_path.depth < 9
    ), candidates as (
      select graph_path.path,
        graph_path.airways,
        graph_path.routed_nm + goals.to_arrival_nm as estimated_nm,
        goals.to_arrival_nm as final_spacing_nm,
        cardinality(graph_path.path) as fix_count
      from graph_path
      join goals on goals.ident = graph_path.ident
      where cardinality(graph_path.path) > 1
      order by cardinality(graph_path.path) desc, graph_path.routed_nm + goals.to_arrival_nm asc
      limit 1
    )
    select 'GRAPH-' || v_departure || '-' || v_arrival as route_id,
      'GRAPH-' || v_departure || '-' || v_arrival as route_code,
      coalesce(nullif(v_region, '*'), 'GRAPH') as region_code,
      p_aip_cycle as aip_cycle,
      array_to_string(candidates.path, ' ') as route_text,
      candidates.path,
      candidates.airways,
      candidates.estimated_nm,
      candidates.final_spacing_nm,
      candidates.fix_count
      into v_graph_route
      from candidates;

    if not found then
      with endpoint as (
        select dep.latitude_deg as dep_latitude_deg,
          dep.longitude_deg as dep_longitude_deg,
          arr.latitude_deg as arr_latitude_deg,
          arr.longitude_deg as arr_longitude_deg,
          public.skylinetragedy_distance_nm(dep.latitude_deg, dep.longitude_deg, arr.latitude_deg, arr.longitude_deg) as direct_nm
        from lateral (
          select airport.latitude_deg, airport.longitude_deg
            from public.skylinetragedy_aip_airports airport
            where upper(coalesce(airport.icao, '')) = v_departure
              or upper(coalesce(airport.ident, '')) = v_departure
              or upper(coalesce(airport.iata, '')) = v_departure
            order by case when upper(coalesce(airport.icao, '')) = v_departure then 0 else 1 end
            limit 1
        ) dep
        cross join lateral (
          select airport.latitude_deg, airport.longitude_deg
            from public.skylinetragedy_aip_airports airport
            where upper(coalesce(airport.icao, '')) = v_arrival
              or upper(coalesce(airport.ident, '')) = v_arrival
              or upper(coalesce(airport.iata, '')) = v_arrival
            order by case when upper(coalesce(airport.icao, '')) = v_arrival then 0 else 1 end
            limit 1
        ) arr
      ), scored as (
        select *
          from (
            select ref.ident,
              public.skylinetragedy_distance_nm(endpoint.dep_latitude_deg, endpoint.dep_longitude_deg, ref.latitude_deg, ref.longitude_deg) as from_departure_nm,
              public.skylinetragedy_distance_nm(ref.latitude_deg, ref.longitude_deg, endpoint.arr_latitude_deg, endpoint.arr_longitude_deg) as to_arrival_nm,
              endpoint.direct_nm,
              row_number() over (
                partition by ref.ident
                order by
                  public.skylinetragedy_distance_nm(endpoint.dep_latitude_deg, endpoint.dep_longitude_deg, ref.latitude_deg, ref.longitude_deg)
                  + public.skylinetragedy_distance_nm(ref.latitude_deg, ref.longitude_deg, endpoint.arr_latitude_deg, endpoint.arr_longitude_deg) asc,
                  case when ref.region_code = v_region then 0 else 1 end,
                  case when ref.aip_cycle = p_aip_cycle then 0 else 1 end
              ) as ident_rank
            from endpoint
            join public.skylinetragedy_aip_reference_points ref on ref.latitude_deg is not null and ref.longitude_deg is not null
            where ref.point_type <> 'airport'
              and ref.aip_cycle in (p_aip_cycle, '*')
              and (v_region = '*' or ref.region_code = v_region or ref.iso_country = v_region)
              and public.skylinetragedy_distance_nm(endpoint.dep_latitude_deg, endpoint.dep_longitude_deg, ref.latitude_deg, ref.longitude_deg) > greatest(25, endpoint.direct_nm * 0.04)
              and public.skylinetragedy_distance_nm(ref.latitude_deg, ref.longitude_deg, endpoint.arr_latitude_deg, endpoint.arr_longitude_deg) > greatest(25, endpoint.direct_nm * 0.04)
              and public.skylinetragedy_distance_nm(endpoint.dep_latitude_deg, endpoint.dep_longitude_deg, ref.latitude_deg, ref.longitude_deg) < endpoint.direct_nm * 1.05
              and public.skylinetragedy_distance_nm(ref.latitude_deg, ref.longitude_deg, endpoint.arr_latitude_deg, endpoint.arr_longitude_deg) < endpoint.direct_nm * 1.05
              and public.skylinetragedy_distance_nm(endpoint.dep_latitude_deg, endpoint.dep_longitude_deg, ref.latitude_deg, ref.longitude_deg)
                + public.skylinetragedy_distance_nm(ref.latitude_deg, ref.longitude_deg, endpoint.arr_latitude_deg, endpoint.arr_longitude_deg) <= endpoint.direct_nm + greatest(120, endpoint.direct_nm * 0.18)
          ) deduped
          where ident_rank = 1
      ), bucketed as (
        select scored.*,
          width_bucket(scored.from_departure_nm / nullif(scored.direct_nm, 0), 0.0, 1.0, 8) as bucket,
          row_number() over (
            partition by width_bucket(scored.from_departure_nm / nullif(scored.direct_nm, 0), 0.0, 1.0, 8)
            order by scored.from_departure_nm + scored.to_arrival_nm asc, scored.from_departure_nm asc
          ) as bucket_rank
        from scored
      ), selected as (
        select ident, from_departure_nm, to_arrival_nm, direct_nm
          from bucketed
          where bucket_rank <= 2
          order by from_departure_nm asc
          limit 10
      ), spaced as (
        select ident, from_departure_nm, to_arrival_nm, direct_nm,
          lag(from_departure_nm) over (order by from_departure_nm) as previous_nm
        from selected
      ), route_points as (
        select ident, from_departure_nm, to_arrival_nm, direct_nm
          from spaced
          where previous_nm is null or from_departure_nm - previous_nm >= greatest(60, direct_nm * 0.05)
          order by from_departure_nm asc
          limit 8
      ), route as (
        select array_agg(ident order by from_departure_nm)::text[] as path,
          array_fill('DCT'::text, array[greatest(count(*)::int - 1, 0)]) as airways,
          max(direct_nm) + avg((from_departure_nm + to_arrival_nm) - direct_nm) as estimated_nm,
          min(to_arrival_nm) as final_spacing_nm,
          count(*)::int as fix_count
        from route_points
      )
      select 'CORRIDOR-' || v_departure || '-' || v_arrival as route_id,
        'CORRIDOR-' || v_departure || '-' || v_arrival as route_code,
        coalesce(nullif(v_region, '*'), 'CORRIDOR') as region_code,
        p_aip_cycle as aip_cycle,
        array_to_string(route.path, ' ') as route_text,
        route.path,
        route.airways,
        route.estimated_nm,
        route.final_spacing_nm,
        route.fix_count
        into v_graph_route
        from route
        where route.fix_count >= 2;

      if not found then
        return jsonb_build_object('status', 'unavailable', 'message', 'No server-side AIP graph or corridor route found.');
      end if;
    end if;

    v_method := case when v_graph_route.route_id like 'CORRIDOR-%' then 'supabase-corridor' else 'supabase-graph' end;

    select coalesce(jsonb_agg(jsonb_build_object(
        'route_id', v_graph_route.route_id,
        'leg_sequence', leg.ordinality,
        'from_fix', leg.from_fix,
        'to_fix', leg.to_fix,
        'airway', coalesce(v_graph_route.airways[leg.ordinality], ''),
        'region_code', v_graph_route.region_code,
        'aip_cycle', v_graph_route.aip_cycle
      ) order by leg.ordinality), '[]'::jsonb)
      into v_legs
      from unnest(v_graph_route.path[1:greatest(cardinality(v_graph_route.path) - 1, 1)], v_graph_route.path[2:cardinality(v_graph_route.path)]) with ordinality as leg(from_fix, to_fix, ordinality);

    with route_fixes as (
      select fix.ident,
        fix.ordinality as sequence_number,
        coalesce(v_graph_route.airways[greatest(fix.ordinality - 1, 1)], '') as airway
      from unnest(v_graph_route.path) with ordinality as fix(ident, ordinality)
    ), resolved as (
      select route_fixes.sequence_number,
        route_fixes.ident,
        route_fixes.airway,
        ref.point_type,
        ref.name,
        ref.latitude_deg,
        ref.longitude_deg,
        ref.frequency_khz,
        ref.associated_airport,
        ref.iso_country,
        ref.source_system
      from route_fixes
      left join lateral (
        select *
          from public.skylinetragedy_aip_reference_points ref
          where ref.ident = route_fixes.ident
            and ref.latitude_deg is not null
            and ref.longitude_deg is not null
          order by
            case when ref.region_code = v_graph_route.region_code then 0 else 1 end,
            case when ref.aip_cycle = v_graph_route.aip_cycle then 0 else 1 end,
            case when ref.point_type <> 'airport' then 0 else 1 end
          limit 1
      ) ref on true
    )
    select coalesce(jsonb_agg(jsonb_build_object(
        'name', ident,
        'label', ident,
        'latitude', latitude_deg,
        'longitude', longitude_deg,
        'type', case when point_type = 'airport' then 'AIRPORT' else 'WAYPOINT' end,
        'segment', case when sequence_number = (select min(sequence_number) from resolved) then 'departure' when sequence_number = (select max(sequence_number) from resolved) then 'arrival' else 'enroute' end,
        'airway', coalesce(airway, ''),
        'frequencyKhz', frequency_khz,
        'associatedAirport', coalesce(associated_airport, ''),
        'isoCountry', coalesce(iso_country, ''),
        'sourceSystem', coalesce(source_system, '')
      ) order by sequence_number), '[]'::jsonb)
      into v_waypoints
      from resolved
      where latitude_deg is not null and longitude_deg is not null;

    return jsonb_build_object(
      'status', 'ok',
      'route', jsonb_build_object(
        'routeId', v_graph_route.route_id,
        'routeCode', v_graph_route.route_code,
        'routeString', v_graph_route.route_text,
        'regionCode', v_graph_route.region_code,
        'aipCycle', v_graph_route.aip_cycle,
        'waypoints', v_waypoints,
        'legs', v_legs
      ),
      'metrics', jsonb_build_object(
        'method', v_method,
        'estimatedNm', v_graph_route.estimated_nm,
        'finalSpacingNm', v_graph_route.final_spacing_nm,
        'publishedLegCount', jsonb_array_length(v_legs),
        'resolvedPublishedFixCount', jsonb_array_length(v_waypoints)
      )
    );
  end if;

  select coalesce(jsonb_agg(to_jsonb(leg) order by leg.leg_sequence), '[]'::jsonb)
    into v_legs
    from public.skylinetragedy_aip_route_legs leg
    where leg.route_id = v_route.route_id;

  with route_fixes as (
    select leg_sequence * 2 as sequence_number, from_fix as ident, airway
      from public.skylinetragedy_aip_route_legs
      where route_id = v_route.route_id
    union all
    select leg_sequence * 2 + 1 as sequence_number, to_fix as ident, airway
      from public.skylinetragedy_aip_route_legs
      where route_id = v_route.route_id
  ), distinct_fixes as (
    select distinct on (ident) ident, airway, min(sequence_number) over (partition by ident) as sequence_number
      from route_fixes
      order by ident, sequence_number
  ), resolved as (
    select distinct_fixes.sequence_number,
      distinct_fixes.ident,
      distinct_fixes.airway,
      ref.point_type,
      ref.name,
      ref.latitude_deg,
      ref.longitude_deg,
      ref.frequency_khz,
      ref.associated_airport,
      ref.iso_country,
      ref.source_system
    from distinct_fixes
    left join lateral (
      select *
        from public.skylinetragedy_aip_reference_points ref
        where ref.ident = distinct_fixes.ident
          and ref.latitude_deg is not null
          and ref.longitude_deg is not null
        order by
          case when ref.region_code = v_route.region_code then 0 else 1 end,
          case when ref.aip_cycle = v_route.aip_cycle then 0 else 1 end,
          case when ref.point_type = 'airport' then 0 else 1 end
        limit 1
    ) ref on true
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'name', ident,
      'label', ident,
      'latitude', latitude_deg,
      'longitude', longitude_deg,
      'type', case when point_type = 'airport' then 'AIRPORT' else 'WAYPOINT' end,
      'segment', case when sequence_number = (select min(sequence_number) from resolved) then 'departure' else 'enroute' end,
      'airway', coalesce(airway, ''),
      'frequencyKhz', frequency_khz,
      'associatedAirport', coalesce(associated_airport, ''),
      'isoCountry', coalesce(iso_country, ''),
      'sourceSystem', coalesce(source_system, '')
    ) order by sequence_number), '[]'::jsonb)
    into v_waypoints
    from resolved
    where latitude_deg is not null and longitude_deg is not null;

  return jsonb_build_object(
    'status', 'ok',
    'route', jsonb_build_object(
      'routeId', v_route.route_id,
      'routeCode', v_route.route_code,
      'routeString', v_route.route_text,
      'regionCode', v_route.region_code,
      'aipCycle', v_route.aip_cycle,
      'waypoints', v_waypoints,
      'legs', v_legs
    ),
    'metrics', jsonb_build_object(
      'method', v_method,
      'publishedLegCount', jsonb_array_length(v_legs),
      'resolvedPublishedFixCount', jsonb_array_length(v_waypoints)
    )
  );
end;
$$;

create or replace function public.skylinetragedy_search_airports(
  p_query text,
  p_limit integer default 20,
  p_include_emergency boolean default true
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'status', 'ok',
    'airports', coalesce(jsonb_agg(jsonb_build_object(
      'iata', coalesce(airport.iata, ''),
      'icao', coalesce(airport.icao, airport.ident, ''),
      'ident', coalesce(airport.ident, airport.icao, ''),
      'name', airport.name,
      'latitude', airport.latitude_deg,
      'longitude', airport.longitude_deg,
      'city', airport.city,
      'country', airport.country,
      'isoCountry', airport.iso_country,
      'region', airport.region_code,
      'elevation', airport.elevation_ft,
      'type', airport.airport_type,
      'category', airport.category
    ) order by airport.name), '[]'::jsonb)
  )
  from (
    select *
      from public.skylinetragedy_aip_airports
      where (p_include_emergency or coalesce(airport_type, 'normal') <> 'emergency')
        and (
          p_query is null
          or length(trim(p_query)) = 0
          or icao ilike '%' || p_query || '%'
          or iata ilike '%' || p_query || '%'
          or ident ilike '%' || p_query || '%'
          or name ilike '%' || p_query || '%'
          or city ilike '%' || p_query || '%'
        )
      order by
        case when upper(coalesce(icao, ident, '')) = upper(coalesce(p_query, '')) then 0 else 1 end,
        case when upper(coalesce(iata, '')) = upper(coalesce(p_query, '')) then 0 else 1 end,
        name
      limit greatest(1, least(coalesce(p_limit, 20), 100))
  ) airport;
$$;

create or replace function public.skylinetragedy_airports_within_radius(
  p_latitude numeric,
  p_longitude numeric,
  p_radius_nm numeric default 100,
  p_limit integer default 50
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select airport.*,
      public.skylinetragedy_distance_nm(p_latitude, p_longitude, airport.latitude_deg, airport.longitude_deg) as distance_nm
      from public.skylinetragedy_aip_airports airport
      where p_latitude is not null and p_longitude is not null
  )
  select jsonb_build_object(
    'status', 'ok',
    'airports', coalesce(jsonb_agg(jsonb_build_object(
      'iata', coalesce(iata, ''),
      'icao', coalesce(icao, ident, ''),
      'ident', coalesce(ident, icao, ''),
      'name', name,
      'latitude', latitude_deg,
      'longitude', longitude_deg,
      'city', city,
      'country', country,
      'isoCountry', iso_country,
      'region', region_code,
      'elevation', elevation_ft,
      'type', airport_type,
      'category', category,
      'distanceNm', round(distance_nm, 1)
    ) order by distance_nm), '[]'::jsonb)
  )
  from (
    select * from ranked
      where distance_nm <= coalesce(p_radius_nm, 100)
      order by distance_nm
      limit greatest(1, least(coalesce(p_limit, 50), 200))
  ) airports;
$$;

create or replace function public.skylinetragedy_airport_details(p_airport_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_airport record;
  v_runways jsonb;
  v_frequencies jsonb;
begin
  select * into v_airport
    from public.skylinetragedy_aip_airports
    where upper(coalesce(icao, '')) = upper(coalesce(p_airport_code, ''))
      or upper(coalesce(iata, '')) = upper(coalesce(p_airport_code, ''))
      or upper(coalesce(ident, '')) = upper(coalesce(p_airport_code, ''))
    limit 1;

  if v_airport.airport_id is null then
    return jsonb_build_object('status', 'unavailable', 'message', 'Airport not found.');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'name', name,
      'length', length_ft,
      'width', width_ft,
      'surface', surface,
      'category', category,
      'bearing', bearing_deg,
      'startLatitude', start_latitude_deg,
      'startLongitude', start_longitude_deg,
      'endLatitude', end_latitude_deg,
      'endLongitude', end_longitude_deg
    ) order by length_ft desc nulls last), '[]'::jsonb)
    into v_runways
    from public.skylinetragedy_aip_runways
    where airport_id = v_airport.airport_id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'type', type,
      'frequency', frequency_mhz,
      'description', description
    ) order by type), '[]'::jsonb)
    into v_frequencies
    from public.skylinetragedy_aip_frequencies
    where airport_id = v_airport.airport_id;

  return jsonb_build_object(
    'status', 'ok',
    'airport', jsonb_build_object(
      'iata', coalesce(v_airport.iata, ''),
      'icao', coalesce(v_airport.icao, v_airport.ident, ''),
      'ident', coalesce(v_airport.ident, v_airport.icao, ''),
      'name', v_airport.name,
      'latitude', v_airport.latitude_deg,
      'longitude', v_airport.longitude_deg,
      'city', v_airport.city,
      'country', v_airport.country,
      'isoCountry', v_airport.iso_country,
      'region', v_airport.region_code,
      'elevation', v_airport.elevation_ft,
      'type', v_airport.airport_type,
      'category', v_airport.category,
      'runways', v_runways,
      'frequencies', v_frequencies
    )
  );
end;
$$;

create or replace function public.skylinetragedy_nearest_navaids(
  p_latitude numeric,
  p_longitude numeric,
  p_radius_nm numeric default 150,
  p_limit integer default 10
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select navaid.*,
      public.skylinetragedy_distance_nm(p_latitude, p_longitude, navaid.latitude_deg, navaid.longitude_deg) as distance_nm
      from public.skylinetragedy_aip_navaids navaid
      where p_latitude is not null and p_longitude is not null
  )
  select jsonb_build_object(
    'status', 'ok',
    'navaids', coalesce(jsonb_agg(jsonb_build_object(
      'identifier', ident,
      'name', name,
      'type', navaid_type,
      'latitude', latitude_deg,
      'longitude', longitude_deg,
      'frequencyKhz', frequency_khz,
      'dmeFrequencyKhz', dme_frequency_khz,
      'dmeChannel', dme_channel,
      'associatedAirport', associated_airport,
      'isoCountry', iso_country,
      'distanceNm', round(distance_nm, 1)
    ) order by distance_nm), '[]'::jsonb)
  )
  from (
    select * from ranked
      where distance_nm <= coalesce(p_radius_nm, 150)
      order by distance_nm
      limit greatest(1, least(coalesce(p_limit, 10), 50))
  ) navaids;
$$;

create or replace function public.skylinetragedy_nearest_suitable_airports(
  p_latitude numeric,
  p_longitude numeric,
  p_aircraft_category text default null,
  p_min_runway_length_ft numeric default 0,
  p_radius_nm numeric default 150,
  p_limit integer default 10
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with candidate_runways as (
    select airport.*,
      runway.name as runway_name,
      runway.length_ft,
      runway.width_ft,
      runway.surface,
      runway.category as runway_category,
      runway.bearing_deg,
      public.skylinetragedy_distance_nm(p_latitude, p_longitude, airport.latitude_deg, airport.longitude_deg) as distance_nm
    from public.skylinetragedy_aip_airports airport
    join public.skylinetragedy_aip_runways runway on runway.airport_id = airport.airport_id
    where p_latitude is not null
      and p_longitude is not null
      and coalesce(runway.length_ft, 0) >= coalesce(p_min_runway_length_ft, 0)
  ), ranked as (
    select candidate_runways.*,
      (
        greatest(0, 200 - distance_nm)
        + least(coalesce(length_ft, 0) / 100, 120)
        + case when airport_type = 'normal' then 30 else 10 end
        + case when exists (
            select 1 from public.skylinetragedy_aip_frequencies frequency
              where frequency.airport_id = candidate_runways.airport_id
          ) then 15 else 0 end
        + case when exists (
            select 1 from public.skylinetragedy_aip_navaids navaid
              where navaid.associated_airport in (candidate_runways.icao, candidate_runways.iata, candidate_runways.ident)
          ) then 10 else 0 end
      ) as suitability_score
    from candidate_runways
    where distance_nm <= coalesce(p_radius_nm, 150)
  ), best_by_airport as (
    select distinct on (airport_id) *
      from ranked
      order by airport_id, suitability_score desc, length_ft desc nulls last
  )
  select jsonb_build_object(
    'status', 'ok',
    'options', coalesce(jsonb_agg(jsonb_build_object(
      'airport', jsonb_build_object(
        'iata', coalesce(iata, ''),
        'icao', coalesce(icao, ident, ''),
        'ident', coalesce(ident, icao, ''),
        'name', name,
        'latitude', latitude_deg,
        'longitude', longitude_deg,
        'city', city,
        'country', country,
        'isoCountry', iso_country,
        'region', region_code,
        'elevation', elevation_ft,
        'type', airport_type,
        'category', category
      ),
      'bestRunway', jsonb_build_object(
        'name', runway_name,
        'length', length_ft,
        'width', width_ft,
        'surface', surface,
        'category', runway_category,
        'bearing', bearing_deg
      ),
      'distanceNm', round(distance_nm, 1),
      'suitabilityScore', round(suitability_score, 1),
      'frequencies', coalesce((
        select jsonb_agg(jsonb_build_object('type', type, 'frequency', frequency_mhz, 'description', description) order by type)
          from public.skylinetragedy_aip_frequencies frequency
          where frequency.airport_id = best_by_airport.airport_id
      ), '[]'::jsonb),
      'navaids', coalesce((
        select jsonb_agg(jsonb_build_object('identifier', ident, 'type', navaid_type, 'frequencyKhz', frequency_khz) order by ident)
          from public.skylinetragedy_aip_navaids navaid
          where navaid.associated_airport in (best_by_airport.icao, best_by_airport.iata, best_by_airport.ident)
          limit 5
      ), '[]'::jsonb)
    ) order by suitability_score desc, distance_nm asc), '[]'::jsonb)
  )
  from (
    select * from best_by_airport
      order by suitability_score desc, distance_nm asc
      limit greatest(1, least(coalesce(p_limit, 10), 50))
  ) best_by_airport;
$$;

grant execute on function public.skylinetragedy_search_aip_route(text, text, text, text, integer) to anon, authenticated;
grant execute on function public.skylinetragedy_search_airports(text, integer, boolean) to anon, authenticated;
grant execute on function public.skylinetragedy_airports_within_radius(numeric, numeric, numeric, integer) to anon, authenticated;
grant execute on function public.skylinetragedy_airport_details(text) to anon, authenticated;
grant execute on function public.skylinetragedy_nearest_navaids(numeric, numeric, numeric, integer) to anon, authenticated;
grant execute on function public.skylinetragedy_nearest_suitable_airports(numeric, numeric, text, numeric, numeric, integer) to anon, authenticated;
