import { NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth/require-auth";
import { getVenueById, addVenuePhoto, removeVenuePhoto } from "@/lib/services/venue-service";
import { uploadToS3, deleteFromS3 } from "@/lib/storage/s3";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

type RouteParams = {
  params: Promise<{ id: string }>;
};

const PRESET_IMAGE_MAP: Record<string, string> = {
  bellevue: "public/images/bellevue.jpg",
  golf: "public/images/Golf.jpg",
  vibeshotel: "public/images/vibeshotel.jpg",
  landing: "public/images/landing.jpg",
  landingtwo: "public/images/landingtwo.jpg",
  stayeasy: "public/images/stayeasy.jpg",
  kaleb: "public/images/kaleb.jpg",
  gold: "public/images/gold.jpg",
  get: "public/images/get.jpg",
  deo: "public/images/deo.jpg",
  eli: "public/images/eli.jpg",
  mon: "public/images/mon.jpg",
  ras: "public/images/ras.jpg",
  sap: "public/images/sap.jpg",
};

/**
 * GET /api/venues/[id]/photos
 * Public endpoint: lists all photos attached to the venue.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const venue = await getVenueById(id);
    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }
    return NextResponse.json({ status: "ok", photos: venue.photos || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get venue photos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/venues/[id]/photos
 * Uploads a photo to MinIO / S3 and attaches its public URL to the venue.
 * 
 * Accepts:
 *   1. multipart/form-data with a "file" field (real file upload to S3).
 *   2. application/json with { preset: "bellevue" } (uploads the local asset to S3).
 *   3. application/json with { photoUrl: "https://..." } (direct URL).
 * 
 * Caller must be the owning venue_manager or super_admin.
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await authenticateSession(req);
    if (!auth.account) {
      return NextResponse.json({ error: auth.error || "Authentication required" }, { status: auth.status });
    }

    const venue = await getVenueById(id);
    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    const isOwner = venue.managerId === auth.account.id;
    const isAdmin = auth.account.role === "super_admin";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized: only the venue manager or super_admin can add photos" }, { status: 403 });
    }

    let photoUrl = "";
    const contentTypeHeader = req.headers.get("content-type") || "";

    if (contentTypeHeader.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided in form data" }, { status: 400 });
      }

      const mimeType = file.type || "image/jpeg";
      if (!mimeType.startsWith("image/")) {
        return NextResponse.json({ error: "Uploaded file must be an image" }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const key = `venues/${id}/${Date.now()}-${safeName}`;

      photoUrl = await uploadToS3({ buffer, key, contentType: mimeType });
    } else {
      const body = await req.json().catch(() => ({}));
      const { preset, photoUrl: directUrl } = body;

      if (preset && typeof preset === "string") {
        const normalized = preset.toLowerCase().trim();
        const relPath = PRESET_IMAGE_MAP[normalized];
        if (!relPath) {
          return NextResponse.json({
            error: `Unknown preset '${preset}'. Available: ${Object.keys(PRESET_IMAGE_MAP).join(", ")}`,
          }, { status: 400 });
        }

        const absPath = path.resolve(process.cwd(), relPath);
        if (!existsSync(absPath)) {
          return NextResponse.json({ error: `Asset file not found on disk: ${relPath}` }, { status: 404 });
        }

        const buffer = readFileSync(absPath);
        const ext = path.extname(relPath).slice(1) || "jpg";
        const mimeType = ext === "png" ? "image/png" : ext === "svg" ? "image/svg+xml" : "image/jpeg";
        const key = `venues/${id}/${normalized}-${Date.now()}.${ext}`;

        photoUrl = await uploadToS3({ buffer, key, contentType: mimeType });
      } else if (directUrl && typeof directUrl === "string") {
        photoUrl = directUrl;
      } else {
        return NextResponse.json({
          error: "Either multipart form-data 'file', JSON 'preset' (e.g. 'bellevue'), or 'photoUrl' is required",
        }, { status: 400 });
      }
    }

    const updated = await addVenuePhoto(id, auth.account.id, photoUrl, auth.account.role);

    return NextResponse.json({
      status: "ok",
      photoUrl,
      photos: updated.photos,
      venue: updated,
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to upload photo";
    const status = message.includes("Unauthorized") ? 403 : message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/venues/[id]/photos
 * Removes a photo from the venue.
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await authenticateSession(req);
    if (!auth.account) {
      return NextResponse.json({ error: auth.error || "Authentication required" }, { status: auth.status });
    }

    const venue = await getVenueById(id);
    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    const isOwner = venue.managerId === auth.account.id;
    const isAdmin = auth.account.role === "super_admin";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized: only the venue manager or super_admin can delete photos" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const photoUrl = searchParams.get("photoUrl") || body.photoUrl;

    if (!photoUrl || typeof photoUrl !== "string") {
      return NextResponse.json({ error: "photoUrl parameter is required" }, { status: 400 });
    }

    const updated = await removeVenuePhoto(id, auth.account.id, photoUrl, auth.account.role);

    // If it's an S3 URL stored in our bucket, delete the object
    try {
      const parsed = new URL(photoUrl);
      const parts = parsed.pathname.split("/").filter(Boolean);
      // pathname is /venues/venues/{venueId}/...
      if (parts.length >= 2) {
        const key = parts.slice(1).join("/");
        await deleteFromS3(key);
      }
    } catch {
      // Ignore S3 deletion error on external URLs
    }

    return NextResponse.json({ status: "ok", photos: updated.photos, venue: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete photo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
