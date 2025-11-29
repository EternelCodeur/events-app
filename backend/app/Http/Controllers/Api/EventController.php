<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Models\Entreprise;
use App\Models\Venue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class EventController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Event::query();
        if (($user->role ?? 'admin') !== 'superadmin') {
            $query->where('entreprise_id', $user->entreprise_id);
        } else {
            if ($request->filled('entrepriseId')) {
                $query->where('entreprise_id', (int) $request->integer('entrepriseId'));
            }
        }
        return EventResource::collection($query->latest()->get());
    }

    public function store(Request $request)
    {
        $user = $request->user();
        // Normalize time fields before validation
        $st = $request->input('startTime');
        if ($st === '') { $request->merge(['startTime' => null]); }
        elseif (is_string($st) && preg_match('/^\d{2}:\d{2}:\d{2}$/', $st)) { $request->merge(['startTime' => substr($st, 0, 5)]); }
        $et = $request->input('endTime');
        if ($et === '') { $request->merge(['endTime' => null]); }
        elseif (is_string($et) && preg_match('/^\d{2}:\d{2}:\d{2}$/', $et)) { $request->merge(['endTime' => substr($et, 0, 5)]); }
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'date' => ['required', 'date'],
            'startTime' => ['nullable', 'date_format:H:i'],
            'endTime' => ['nullable', 'date_format:H:i'],
            'venueId' => ['nullable', 'integer', 'exists:venues,id'],
            'guests' => ['nullable', 'integer', 'min:0'],
            'budget' => ['nullable', 'string', 'max:191'],
            'eventType' => ['nullable', 'in:mariage,celebration_religieuse,cocktail'],
            'areaChoice' => ['nullable', 'in:interieur,exterieur,les_deux'],
            'mariageInteriorSubtype' => ['nullable', 'in:civil,coutumier'],
            'mariageExteriorSubtype' => ['nullable', 'in:civil,coutumier'],
            'status' => ['sometimes', 'nullable', 'in:en_attente,confirme,annuler'],
            'entrepriseId' => ['sometimes', 'nullable', 'integer', 'exists:entreprises,id'],
        ]);

        // Resolve entreprise id
        if (($user->role ?? 'admin') === 'superadmin') {
            $entrepriseId = $data['entrepriseId'] ?? null;
            if (!$entrepriseId && !empty($data['venueId'])) {
                $venue = Venue::find($data['venueId']);
                $entrepriseId = $venue?->entreprise_id;
            }
        } else {
            $entrepriseId = $user->entreprise_id;
        }
        if (!$entrepriseId) {
            abort(422, 'Entreprise non définie');
        }

        // Validate venue belongs to entreprise if provided
        if (!empty($data['venueId'])) {
            $venue = Venue::find($data['venueId']);
            if (!$venue || (int) $venue->entreprise_id !== (int) $entrepriseId) {
                abort(422, 'La salle sélectionnée ne correspond pas à votre entreprise');
            }
        }

        // Prevent duplicate by title within entreprise (case-insensitive)
        $dupExists = Event::where('entreprise_id', $entrepriseId)
            ->whereRaw('LOWER(title) = ?', [strtolower($data['title'])])
            ->exists();
        if ($dupExists) {
            abort(422, 'Cet événement existe déjà');
        }

        $event = Event::create([
            'entreprise_id' => $entrepriseId,
            'venue_id' => $data['venueId'] ?? null,
            'title' => $data['title'],
            'date' => $data['date'],
            'start_time' => $data['startTime'] ?? null,
            'end_time' => $data['endTime'] ?? null,
            'guests' => $data['guests'] ?? 0,
            'budget' => $data['budget'] ?? null,
            'status' => $data['status'] ?? 'en_attente',
            'event_type' => $data['eventType'] ?? null,
            'area_choice' => $data['areaChoice'] ?? null,
            'mariage_interior_subtype' => $data['mariageInteriorSubtype'] ?? null,
            'mariage_exterior_subtype' => $data['mariageExteriorSubtype'] ?? null,
        ]);

        // Side effect: create directory for the event under entreprise slug
        $entreprise = Entreprise::findOrFail($entrepriseId);
        $slug = (string) $entreprise->slug;
        Storage::disk('local')->makeDirectory('entreprises/' . $slug . '/events/' . $event->title);

        // Persist folder path on the event
        $event->folder_path = 'entreprises/' . $slug . '/events/' . $event->title;
        $event->save();

        // Update venue status according to assigned events
        if ($event->venue_id) {
            $venue = Venue::find($event->venue_id);
            if ($venue) {
                $hasConfirme = Event::where('venue_id', $venue->id)->where('status', 'confirme')->exists();
                $hasAttente = Event::where('venue_id', $venue->id)->where('status', 'en_attente')->exists();
                $venue->status = $hasConfirme ? 'occupe' : ($hasAttente ? 'en_attente' : 'vide');
                $venue->save();
            }
        }

        return new EventResource($event);
    }

    public function show(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        return new EventResource($event);
    }

    public function update(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        // Normalize time fields before validation
        $st = $request->input('startTime');
        if ($st === '') { $request->merge(['startTime' => null]); }
        elseif (is_string($st) && preg_match('/^\d{2}:\d{2}:\d{2}$/', $st)) { $request->merge(['startTime' => substr($st, 0, 5)]); }
        $et = $request->input('endTime');
        if ($et === '') { $request->merge(['endTime' => null]); }
        elseif (is_string($et) && preg_match('/^\d{2}:\d{2}:\d{2}$/', $et)) { $request->merge(['endTime' => substr($et, 0, 5)]); }

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'date' => ['sometimes', 'date'],
            'startTime' => ['sometimes', 'nullable', 'date_format:H:i'],
            'endTime' => ['sometimes', 'nullable', 'date_format:H:i'],
            'venueId' => ['sometimes', 'nullable', 'integer', 'exists:venues,id'],
            'guests' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'budget' => ['sometimes', 'nullable', 'string', 'max:191'],
            'eventType' => ['sometimes', 'nullable', 'in:mariage,celebration_religieuse,cocktail'],
            'areaChoice' => ['sometimes', 'nullable', 'in:interieur,exterieur,les_deux'],
            'mariageInteriorSubtype' => ['sometimes', 'nullable', 'in:civil,coutumier'],
            'mariageExteriorSubtype' => ['sometimes', 'nullable', 'in:civil,coutumier'],
            'status' => ['sometimes', 'nullable', 'in:en_attente,confirme,annuler'],
        ]);

        $oldTitle = $event->getOriginal('title');
        $oldVenueId = $event->getOriginal('venue_id');
        $oldStatus = $event->getOriginal('status');

        if (array_key_exists('venueId', $data)) {
            if (!empty($data['venueId'])) {
                $venue = Venue::find($data['venueId']);
                if (!$venue || (int) $venue->entreprise_id !== (int) $event->entreprise_id) {
                    abort(422, 'La salle sélectionnée ne correspond pas à votre entreprise');
                }
                $event->venue_id = $data['venueId'];
            } else {
                $event->venue_id = null;
            }
        }

        if (array_key_exists('title', $data)) $event->title = $data['title'];
        if (array_key_exists('date', $data)) $event->date = $data['date'];
        if (array_key_exists('startTime', $data)) $event->start_time = $data['startTime'];
        if (array_key_exists('endTime', $data)) $event->end_time = $data['endTime'];
        if (array_key_exists('guests', $data)) $event->guests = $data['guests'] ?? 0;
        if (array_key_exists('budget', $data)) $event->budget = $data['budget'];
        if (array_key_exists('eventType', $data)) $event->event_type = $data['eventType'];
        if (array_key_exists('areaChoice', $data)) $event->area_choice = $data['areaChoice'];
        if (array_key_exists('mariageInteriorSubtype', $data)) $event->mariage_interior_subtype = $data['mariageInteriorSubtype'];
        if (array_key_exists('mariageExteriorSubtype', $data)) $event->mariage_exterior_subtype = $data['mariageExteriorSubtype'];
        if (array_key_exists('status', $data)) $event->status = $data['status'];

        // Prevent duplicate by title (case-insensitive) within entreprise on update
        $dupExists = Event::where('entreprise_id', $event->entreprise_id)
            ->where('id', '<>', $event->id)
            ->whereRaw('LOWER(title) = ?', [strtolower($event->title)])
            ->exists();
        if ($dupExists) {
            abort(422, 'Cet événement existe déjà');
        }

        $event->save();

        if ($oldTitle !== $event->title) {
            $entreprise = Entreprise::findOrFail($event->entreprise_id);
            $slug = (string) $entreprise->slug;
            $base = 'entreprises/' . $slug . '/events/';
            $oldPath = $base . $oldTitle;
            $newPath = $base . $event->title;
            if (Storage::disk('local')->exists($oldPath)) {
                Storage::disk('local')->move($oldPath, $newPath);
            } elseif (Storage::disk('local')->exists($base . $event->id)) {
                Storage::disk('local')->move($base . $event->id, $newPath);
            } else {
                Storage::disk('local')->makeDirectory($newPath);
            }
            // Update folder path on the event
            $event->folder_path = $newPath;
            $event->save();
        }

        // Recalculate venue statuses if venue/status changed
        if ($oldVenueId !== $event->venue_id || $oldStatus !== $event->status) {
            // New/current venue
            if ($event->venue_id) {
                $venue = Venue::find($event->venue_id);
                if ($venue) {
                    $hasConfirme = Event::where('venue_id', $venue->id)->where('status', 'confirme')->exists();
                    $hasAttente = Event::where('venue_id', $venue->id)->where('status', 'en_attente')->exists();
                    $venue->status = $hasConfirme ? 'occupe' : ($hasAttente ? 'en_attente' : 'vide');
                    $venue->save();
                }
            }
            // Old venue (if changed)
            if ($oldVenueId && $oldVenueId !== $event->venue_id) {
                $oldVenue = Venue::find($oldVenueId);
                if ($oldVenue) {
                    $hasConfirme = Event::where('venue_id', $oldVenue->id)->where('status', 'confirme')->exists();
                    $hasAttente = Event::where('venue_id', $oldVenue->id)->where('status', 'en_attente')->exists();
                    $oldVenue->status = $hasConfirme ? 'occupe' : ($hasAttente ? 'en_attente' : 'vide');
                    $oldVenue->save();
                }
            }
        }

        return new EventResource($event);
    }

    public function destroy(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }

        $entreprise = Entreprise::findOrFail($event->entreprise_id);
        $slug = (string) $entreprise->slug;
        $base = 'entreprises/' . $slug . '/events/';
        Storage::disk('local')->deleteDirectory($base . $event->title);
        Storage::disk('local')->deleteDirectory($base . $event->id);

        // Recalculate venue status after deletion
        $venueId = $event->venue_id;
        $event->delete();
        if ($venueId) {
            $venue = Venue::find($venueId);
            if ($venue) {
                $hasConfirme = Event::where('venue_id', $venue->id)->where('status', 'confirme')->exists();
                $hasAttente = Event::where('venue_id', $venue->id)->where('status', 'en_attente')->exists();
                $venue->status = $hasConfirme ? 'occupe' : ($hasAttente ? 'en_attente' : 'vide');
                $venue->save();
            }
        }
        return response()->noContent();
    }
}
