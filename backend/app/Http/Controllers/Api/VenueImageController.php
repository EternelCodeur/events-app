<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Entreprise;
use App\Models\Venue;
use App\Models\VenueImage;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class VenueImageController extends Controller
{
    public function index(Request $request, Venue $venue)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$venue->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        $images = VenueImage::where('venue_id', $venue->id)->latest()->get();
        return $images->map(function (VenueImage $img) {
            return [
                'id' => (string) $img->id,
                'originalName' => $img->original_name,
                'mimeType' => $img->mime_type,
                'size' => (int) ($img->size ?? 0),
                'filePath' => $img->file_path,
                'createdAt' => $img->created_at?->toISOString(),
            ];
        });
    }

    public function store(Request $request, Venue $venue)
    {
        $user = $request->user();
        // Allow superadmin, or admin within the same entreprise
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$venue->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        $validated = $request->validate([
            'images' => ['sometimes', 'array'],
            'images.*' => ['file', 'mimes:jpg,jpeg,png,webp,gif,bmp', 'max:8192'],
            'image' => ['sometimes', 'file', 'mimes:jpg,jpeg,png,webp,gif,bmp', 'max:8192'],
        ]);

        /** @var UploadedFile[] $files */
        $files = [];
        if ($request->hasFile('images')) $files = $request->file('images');
        elseif ($request->hasFile('image')) $files = [$request->file('image')];
        if (empty($files)) abort(422, 'Aucun fichier image fourni');

        // Determine base folder path for venue
        $base = $venue->folder_path;
        if (!$base) {
            $entreprise = Entreprise::findOrFail($venue->entreprise_id);
            $base = 'entreprises/' . (string) $entreprise->slug . '/venues/' . Str::slug((string) $venue->name, '-');
            Storage::disk('local')->makeDirectory($base);
            $venue->folder_path = $base;
            $venue->save();
        }

        $saved = [];
        foreach ($files as $file) {
            if (!$file instanceof UploadedFile) continue;
            $ext = strtolower((string) $file->getClientOriginalExtension());
            $name = (string) Str::uuid() . ($ext ? ('.' . $ext) : '');
            $path = $base . '/' . $name;
            Storage::disk('local')->putFileAs($base, $file, $name);
            $img = VenueImage::create([
                'venue_id' => $venue->id,
                'file_path' => $path,
                'original_name' => (string) $file->getClientOriginalName(),
                'mime_type' => (string) $file->getClientMimeType(),
                'size' => (int) $file->getSize(),
            ]);
            $saved[] = [
                'id' => (string) $img->id,
                'originalName' => $img->original_name,
                'mimeType' => $img->mime_type,
                'size' => (int) ($img->size ?? 0),
                'filePath' => $img->file_path,
                'fileUrl' => url('/api/venue-images/' . $img->id . '/file'),
                'createdAt' => $img->created_at?->toISOString(),
            ];
        }

        return response()->json($saved, 201);
    }

    public function destroy(Request $request, VenueImage $image)
    {
        $user = $request->user();
        $venue = Venue::findOrFail($image->venue_id);
        if (($user->role ?? 'admin') !== 'superadmin') {
            abort(403, 'Forbidden');
        }
        if (!empty($image->file_path)) {
            Storage::disk('local')->delete($image->file_path);
        }
        $image->delete();
        return response()->noContent();
    }

    public function file(Request $request, VenueImage $image)
    {
        $user = $request->user();
        $venue = Venue::findOrFail($image->venue_id);
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$venue->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        $full = Storage::disk('local')->path($image->file_path);
        if (!is_string($full) || !file_exists($full)) {
            abort(404, 'Fichier introuvable');
        }
        return response()->file($full, [
            'Content-Type' => $image->mime_type ?: 'application/octet-stream',
            'Cache-Control' => 'public, max-age=31536000',
        ]);
    }
}
