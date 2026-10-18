import { createClient } from "@supabase/supabase-js";

type PendingStorageObject = {
  id: string;
  bucket: string;
  storage_path: string;
};

type GarbageCollectionResult = {
  test_cases_deleted: number;
  stuff_metadata_deleted: number;
  storage_objects_pending: PendingStorageObject[];
};

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  if (!serviceRoleKey || !supabaseUrl) {
    console.error(
      "Garbage collection function is missing Supabase environment variables.",
    );

    return Response.json(
      { error: "Server configuration error." },
      { status: 500 },
    );
  }

  if (request.headers.get("Authorization") !== `Bearer ${serviceRoleKey}`) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.rpc(
    "garbage_collect_canonical_content",
  );

  if (error) {
    console.error(
      "Canonical content database cleanup failed:",
      error.message,
    );

    return Response.json(
      { error: "Database cleanup failed." },
      { status: 500 },
    );
  }

  const result = data as GarbageCollectionResult;

  const pending = Array.isArray(result.storage_objects_pending)
    ? result.storage_objects_pending
    : [];

  const byBucket = new Map<string, PendingStorageObject[]>();

  for (const object of pending) {
    const items = byBucket.get(object.bucket) ?? [];

    items.push(object);
    byBucket.set(object.bucket, items);
  }

  let storageObjectsDeleted = 0;

  const failures: Array<{
    bucket: string;
    ids: string[];
    reason: string;
  }> = [];

  for (const [bucket, objects] of byBucket) {
    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove(objects.map((object) => object.storage_path));

    if (removeError) {
      console.error(
        `Storage cleanup failed for bucket ${bucket}:`,
        removeError.message,
      );

      failures.push({
        bucket,
        ids: objects.map((object) => object.id),
        reason: "Storage deletion failed; queued for retry.",
      });

      continue;
    }

    const { error: completeError } = await supabase.rpc(
      "complete_canonical_storage_gc",
      {
        p_stuff_ids: objects.map((object) => object.id),
      },
    );

    if (completeError) {
      console.error(
        "Could not finalize Storage cleanup queue:",
        completeError.message,
      );

      failures.push({
        bucket,
        ids: objects.map((object) => object.id),
        reason:
          "Storage was removed, but queue finalization failed; queued for retry.",
      });

      continue;
    }

    storageObjectsDeleted += objects.length;
  }

  return Response.json(
    {
      test_cases_deleted: result.test_cases_deleted ?? 0,
      stuff_metadata_deleted: result.stuff_metadata_deleted ?? 0,
      storage_objects_deleted: storageObjectsDeleted,
      storage_objects_pending_retry: failures,
    },
    {
      status: failures.length ? 207 : 200,
    },
  );
});
