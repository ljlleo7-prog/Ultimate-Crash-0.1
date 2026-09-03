-- Replace AIP route search with bounded server-side graph routing fallback.

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

grant execute on function public.skylinetragedy_search_aip_route(text, text, text, text, integer) to anon, authenticated;
