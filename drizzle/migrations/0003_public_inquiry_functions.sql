CREATE OR REPLACE FUNCTION public.submit_inquiry(
  _lang text, _service smallint, _china_city smallint, _shipping_mode smallint, _volume smallint,
  _goods text, _name text, _phone text, _note text, _file_count smallint
) RETURNS TABLE (id uuid, tracking_code text)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  _code text;
  _id uuid;
  _digits text := regexp_replace(coalesce(_phone, ''), '\D', '', 'g');
BEGIN
  IF _lang NOT IN ('fa', 'en') THEN RAISE EXCEPTION 'invalid_input'; END IF;
  IF _service NOT BETWEEN 0 AND 20 OR _china_city NOT BETWEEN 0 AND 20
     OR _shipping_mode NOT BETWEEN 0 AND 20 OR _volume NOT BETWEEN 0 AND 20 THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;
  IF length(_digits) NOT BETWEEN 8 AND 15 THEN RAISE EXCEPTION 'invalid_input'; END IF;
  IF coalesce(_file_count, 0) NOT BETWEEN 0 AND 5 THEN RAISE EXCEPTION 'invalid_input'; END IF;

  IF (SELECT count(*) FROM public.inquiries i
      WHERE i.phone = _phone AND i.created_at > now() - interval '1 hour') >= 5 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  FOR _attempt IN 1..6 LOOP
    SELECT 'SG-' || string_agg(substr(_alphabet, 1 + floor(random() * 32)::int, 1), '')
      INTO _code FROM generate_series(1, 6);
    BEGIN
      INSERT INTO public.inquiries (tracking_code, lang, service, china_city, shipping_mode, volume,
                                    goods, contact_name, phone, note, file_count)
      VALUES (_code, _lang, _service, _china_city, _shipping_mode, _volume,
              btrim(_goods), btrim(_name), _phone, nullif(btrim(coalesce(_note, '')), ''), coalesce(_file_count, 0))
      RETURNING inquiries.id INTO _id;
      RETURN QUERY SELECT _id, _code;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      -- tracking code collision: try another one
    END;
  END LOOP;
  RAISE EXCEPTION 'code_unavailable';
END;
$$;
REVOKE ALL ON FUNCTION public.submit_inquiry(text, smallint, smallint, smallint, smallint, text, text, text, text, smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_inquiry(text, smallint, smallint, smallint, smallint, text, text, text, text, smallint) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.track_inquiry(_code text, _phone text)
RETURNS TABLE (tracking_code text, status public.inquiry_status, service smallint, created_at timestamptz, status_changed_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.tracking_code, i.status, i.service, i.created_at, i.status_changed_at
  FROM public.inquiries i
  WHERE i.tracking_code = upper(btrim(_code))
    AND length(regexp_replace(coalesce(_phone, ''), '\D', '', 'g')) >= 8
    AND right(regexp_replace(i.phone, '\D', '', 'g'), 8) = right(regexp_replace(_phone, '\D', '', 'g'), 8)
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.track_inquiry(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_inquiry(text, text) TO anon, authenticated, service_role;

-- A visitor may add files only to a just-created inquiry, up to the number of files it declared.
CREATE OR REPLACE FUNCTION public.can_upload_inquiry_file(_object_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.inquiries i
    WHERE i.id::text = split_part(_object_name, '/', 1)
      AND i.created_at > now() - interval '1 hour'
      AND (SELECT count(*) FROM storage.objects o
           WHERE o.bucket_id = 'inquiry-files' AND split_part(o.name, '/', 1) = i.id::text) < i.file_count
  )
$$;
REVOKE ALL ON FUNCTION public.can_upload_inquiry_file(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_upload_inquiry_file(text) TO anon, authenticated, service_role;

CREATE POLICY "Visitors attach files to their new inquiry" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'inquiry-files' AND public.can_upload_inquiry_file(name));