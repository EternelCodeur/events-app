<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventTableResource;
use App\Models\Event;
use App\Models\EventTable;
use Illuminate\Http\Request;

class TableController extends Controller
{
    public function index(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        $query = EventTable::where('event_id', $event->id)->latest();
        $items = $query->get();
        return EventTableResource::collection($items);
    }

    public function store(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        if (in_array((string) $event->status, ['termine', 'annuler', 'echoue'], true)) {
            abort(422, "Impossible d'ajouter une table pour un événement terminé, annulé ou échoué");
        }
        $data = $request->validate([
            'name' => ['required', 'string', 'max:191'],
            'capacity' => ['sometimes', 'integer', 'min:0'],
            'status' => ['sometimes', 'in:en_attente,pleine'],
        ]);

        // Duplicate name per event (case-insensitive)
        $normName = strtolower(trim($data['name']));
        $dup = EventTable::where('event_id', $event->id)
            ->whereRaw('LOWER(name) = ?', [$normName])
            ->exists();
        if ($dup) {
            abort(422, 'Cette table existe déjà pour cet événement');
        }

        $table = EventTable::create([
            'entreprise_id' => $event->entreprise_id,
            'event_id' => $event->id,
            'name' => $data['name'],
            'capacity' => (int) ($data['capacity'] ?? 0),
            'status' => $data['status'] ?? 'en_attente',
        ]);
        return new EventTableResource($table);
    }

    public function update(Request $request, EventTable $table)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$table->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        $event = $table->event;
        if ($event && in_array((string) $event->status, ['termine', 'annuler', 'echoue'], true)) {
            abort(422, "Impossible de modifier une table pour un événement terminé, annulé ou échoué");
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:191'],
            'capacity' => ['sometimes', 'integer', 'min:0'],
            'status' => ['sometimes', 'in:en_attente,pleine'],
        ]);

        if (array_key_exists('name', $data)) {
            $normName = strtolower(trim($data['name']));
            $dup = EventTable::where('event_id', $table->event_id)
                ->where('id', '<>', $table->id)
                ->whereRaw('LOWER(name) = ?', [$normName])
                ->exists();
            if ($dup) {
                abort(422, 'Cette table existe déjà pour cet événement');
            }
            $table->name = $data['name'];
        }
        if (array_key_exists('capacity', $data)) {
            $table->capacity = (int) $data['capacity'];
        }
        if (array_key_exists('status', $data)) {
            $table->status = $data['status'];
        }
        $table->save();
        return new EventTableResource($table);
    }

    public function destroy(Request $request, EventTable $table)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$table->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        $table->delete();
        return response()->noContent();
    }
}
