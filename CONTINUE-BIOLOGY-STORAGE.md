# Prompt: Finish the Biology storage migration (Neon object storage)

Use this as a self-contained instruction set. Read all of it before making
changes. Do not guess — verify every claim below against the actual live
code/config before relying on it, the same way it was verified originally.

## Why this exists

Supabase's standard Storage upload endpoint rejects files over 50MB. Several
Biology resources exceed that. Chemistry stays on Supabase (its files are all
under 50MB). Biology moves to Neon's S3-compatible "branchable object
storage" instead, which has no such cap (tested successfully with a 60MB
file).

## What is already done (verified working)

1. **Neon storage bucket created**: bucket name `biology`, `access_level:
   public_read`, on Neon project `wispy-mud-64641243` (the "ferry" database,
   already the app's live `DATABASE_URL`), branch `br-icy-tree-awz49toc`
   (the `main`/default branch).
2. **Confirmed the storage endpoint pattern**: plain public GET works with no
   signing needed, at
   `https://br-icy-tree-awz49toc.storage.c-12.us-east-1.aws.neon.tech/biology/{key}`.
   A 60MB test upload/download round-tripped with an exact byte match.
3. **A persistent S3-compatible credential was issued** (via Neon's
   `create_credential`, scopes `storage:read`+`storage:write`, anchored to
   branch `br-icy-tree-awz49toc`) and stored as **Vercel environment
   variables** on project `llms-nspu` (all three targets: production,
   preview, development):
   - `NEON_STORAGE_ENDPOINT` = `https://br-icy-tree-awz49toc.storage.c-12.us-east-1.aws.neon.tech`
   - `NEON_STORAGE_REGION` = `us-east-1`
   - `NEON_STORAGE_ACCESS_KEY_ID` (sensitive, already set)
   - `NEON_STORAGE_SECRET_ACCESS_KEY` (sensitive, already set)
4. **`src/app/api/upload/route.ts` was rewritten** to branch on subject:
   - `subject: "BIOLOGY"` → builds an `S3Client` (from the already-installed
     `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` — do NOT add new
     dependencies, they're already in `package.json`) pointed at
     `NEON_STORAGE_ENDPOINT`/`NEON_STORAGE_REGION` with `forcePathStyle:
     true`, presigns a `PutObjectCommand` against bucket `biology`, and
     returns `{ success, storage: "neon", uploadMethod: "s3", bucket, path,
     signedUrl, publicUrl, contentType, fileName }`.
   - `subject: "CHEMISTRY"` → unchanged Supabase flow, bucket `chemistry`.
   - anything else / no subject → unchanged Supabase flow, bucket
     `new-files` (original default, preserved for backward compatibility).
   - Both branches now return an explicit `uploadMethod` field
     (`"s3"` or `"supabase"`) — this is the field the client must branch on
     (see next section).
   - This file was rewritten from scratch with `cat > ... << 'EOF'` after an
     earlier `str_replace` attempt corrupted it (duplicate declarations,
     orphaned `if` blocks). **Before touching this file again, view it in
     full and confirm it parses (see Step 1 below) — do not assume it is
     still in a good state.**

## What is NOT done yet — do these in order

### Step 1 — Validate the current state of `route.ts`
Run the existing babel-parser check script against
`src/app/api/upload/route.ts` and run `npx tsc --noEmit --skipLibCheck`
filtered to that file. It must parse cleanly and show zero new type errors
before you touch anything else. (Last known state: parsed cleanly, 293
lines.) If it does NOT parse cleanly, re-read the whole file with `view`
before editing — do not patch blind.

### Step 2 — Update the client upload code (this is the main remaining work)
File: `src/app/admin/content/page.tsx`, function `uploadResourceFile`.

Currently this function only knows how to do the **Supabase-style** upload:
it builds a `FormData` with a `cacheControl` field and an unnamed file field,
then does `xhr.open("PUT", data.signedUrl)` and `xhr.send(formData)`, with no
`apikey`/`Authorization` headers (the token is embedded in the signed URL's
query string already).

An S3-presigned PUT URL (what Neon now returns for Biology) works
differently: it needs the **raw file bytes as the request body**, not
FormData, and does NOT need any extra headers (auth is baked into the
presigned URL's query string, same as Supabase's, just a different query
param scheme). Sending FormData to an S3 presigned PUT URL will fail with a
signature-mismatch error.

Required change: after `uploadResourceFile` gets the JSON response from
`/api/upload`, branch on `data.uploadMethod`:

- `"supabase"` → keep the existing FormData-based XHR logic exactly as it is
  today. Do not change this branch's behavior.
- `"s3"` → do a plain XHR PUT with the raw `File` object as the body
  (`xhr.send(file)`), setting `Content-Type` to the file's type via
  `xhr.setRequestHeader("Content-Type", data.contentType || file.type)`
  before sending. No FormData, no `apikey`/`Authorization` header additions.

Keep the existing progress-tracking (`xhr.upload.addEventListener("progress",
...)`), success/error handling, and the final `return { fileKey:
data.publicUrl, fileType, fileSize }` shape identical for both branches — the
rest of the app (resource creation, DB insert) does not need to know or care
which storage backend was used.

Do not touch the call site (`handleCreateResource`) — it already passes
`subjectName` through to `uploadResourceFile`, added in an earlier step, and
that part is correct and complete.

### Step 3 — Validate the client change
Same validation pattern as Step 1, run against
`src/app/admin/content/page.tsx` after editing.

### Step 4 — Commit and push
Two files should be modified from the last known-good pushed commit:
`src/app/api/upload/route.ts` (already modified locally, not yet committed —
check `git status` first, do not assume) and
`src/app/admin/content/page.tsx`. Commit with a clear message explaining the
Supabase-vs-S3 upload-method branching, then push to `master` (this repo
auto-deploys on push — no separate deploy step needed).

### Step 5 — Real end-to-end test, not just a code review
Do not declare this done on code review alone. Prove it, the same way the
60MB round-trip was proven earlier:

1. Confirm the new production deployment is `READY` (Vercel deployment
   list/status).
2. Since `/api/upload` requires an authenticated TEACHER session (which
   cannot easily be forged from outside the browser), the most reliable
   direct proof is: replicate the exact signing call the route makes
   (`PutObjectCommand` + `getSignedUrl`, same endpoint/region/credentials/
   bucket) from a script with the same AWS SDK, for a file *larger than
   50MB*, and confirm (a) the signed PUT succeeds and (b) the resulting
   `publicUrl` is fetchable afterward with a byte-for-byte matching size.
   This exercises the identical Neon-side infrastructure the deployed route
   depends on.
3. If possible, also ask the project owner to do one real upload through the
   live admin UI for a Biology topic, with a file over 50MB, as final
   real-world confirmation — this is the only way to verify the Step 2
   client-side branching itself (the XHR body-vs-FormData logic) end to end,
   since that logic only runs in a real browser.

### Step 6 — Report plainly
State clearly: did the large-file test pass, what exact size/URL was
verified, and whether a real browser upload was confirmed or is still
pending the project owner's test. Do not say "this should work now" as a
substitute for an actual pass/fail result.

## Things to NOT do
- Do not touch Chemistry's upload path (`subject: "CHEMISTRY"`) — it is
  correct and already verified end-to-end.
- Do not change `getResourceOpenUrl`/`resolveResourceUrl` — Neon's public
  URLs are full `https://` URLs like Supabase's, so the existing "if it
  starts with http(s)://, use it directly" logic already handles them with
  no changes needed.
- Do not add `@aws-sdk/*` to `package.json` — already present.
- Do not regenerate the Neon storage credential unless it is confirmed
  compromised — creating a new one invalidates this document's stated
  `NEON_STORAGE_ACCESS_KEY_ID`, requiring the Vercel env vars to be updated
  to match.
