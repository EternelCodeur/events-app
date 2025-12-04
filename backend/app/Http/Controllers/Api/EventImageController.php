<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventImage;
use App\Models\Entreprise;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EventImageController extends Controller
{
    public function index(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        $images = EventImage::where('event_id', $event->id)->latest()->get();
        $baseUrl = url('/api/event-images');
        return $images->map(function (EventImage $img) use ($baseUrl) {
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

    public function store(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin') {
            if ((int) $event->entreprise_id !== (int) ($user->entreprise_id ?? 0)) {
                abort(403, 'Forbidden');
            }
        }
        if (in_array($event->status, ['annuler', 'echoue'], true)) {
            abort(422, 'Ajout d\'images non autorisé pour cet événement');
        }
        $validated = $request->validate([
            'images' => ['sometimes', 'array'],
            'images.*' => ['file', 'mimes:jpg,jpeg,png,webp,gif,bmp', 'max:8192'], // 8MB
            'image' => ['sometimes', 'file', 'mimes:jpg,jpeg,png,webp,gif,bmp', 'max:8192'],
        ]);

        /** @var UploadedFile[] $files */
        $files = [];
        if ($request->hasFile('images')) {
            $files = $request->file('images');
        } elseif ($request->hasFile('image')) {
            $files = [$request->file('image')];
        }
        if (empty($files)) {
            abort(422, 'Aucun fichier image fourni');
        }

        // Determine base folder path for event
        $base = $event->folder_path;
        if (!$base) {
            $entreprise = Entreprise::findOrFail($event->entreprise_id);
            $base = 'entreprises/' . (string) $entreprise->slug . '/events/' . Str::slug((string) $event->title, '-');
            Storage::disk('local')->makeDirectory($base);
            $event->folder_path = $base;
            $event->save();
        }

        $saved = [];
        foreach ($files as $file) {
            if (!$file instanceof UploadedFile) continue;
            $ext = strtolower((string) $file->getClientOriginalExtension());
            $name = (string) Str::uuid() . ($ext ? ('.' . $ext) : '');
            $path = $base . '/' . $name;
            Storage::disk('local')->putFileAs($base, $file, $name);
            $img = EventImage::create([
                'event_id' => $event->id,
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
                'fileUrl' => url('/api/event-images/' . $img->id . '/file'),
                'createdAt' => $img->created_at?->toISOString(),
            ];
        }

        return response()->json($saved, 201);
    }

    public function destroy(Request $request, EventImage $image)
    {
        $user = $request->user();
        $event = Event::findOrFail($image->event_id);
        if (($user->role ?? 'admin') !== 'superadmin') {
            if ((int) $event->entreprise_id !== (int) ($user->entreprise_id ?? 0)) {
                abort(403, 'Forbidden');
            }
        }
        if (!empty($image->file_path)) {
            Storage::disk('local')->delete($image->file_path);
        }
        $image->delete();
        return response()->noContent();
    }

    public function file(Request $request, EventImage $image)
    {
        $user = $request->user();
        $event = Event::findOrFail($image->event_id);
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
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
