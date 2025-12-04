<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventTableResource;
use App\Http\Resources\StaffResource;
use App\Models\Event;
use App\Models\EventTable;
use App\Models\Invite;
use App\Models\Staff;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

    public function summary(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        $tables = EventTable::where('event_id', $event->id)->orderBy('id', 'asc')->get();
        $result = $tables->map(function ($t) {
            $total = (int) ($t->capacity ?? 0);
            $used = (int) Invite::where('event_table_id', $t->id)->sum('personnes');
            $remaining = $total > 0 ? max($total - $used, 0) : null;
            $isFull = $total > 0 ? ($used >= $total) : false;
            return [
                'id' => (int) $t->id,
                'nom' => (string) $t->name,
                'places_total' => $total,
                'places_utilisees' => $used,
                'remaining' => $remaining,
                'isFull' => $isFull,
            ];
        });
        return response()->json($result);
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

        // Enforce event capacity: total tables capacity must not exceed event guests
        $max = (int) ($event->guests ?? 0);
        if ($max > 0) {
            $currentTotal = (int) EventTable::where('event_id', $event->id)->sum('capacity');
            $incoming = (int) ($data['capacity'] ?? 0);
            if ($currentTotal + $incoming > $max) {
                $remaining = max($max - $currentTotal, 0);
                abort(422, "Capacité dépassée: la somme des places des tables (" . ($currentTotal + $incoming) . ") dépasse la capacité de l'événement (" . $max . "). Places restantes: " . $remaining . ".");
            }
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
            // Enforce event capacity on update
            $ev = $table->event;
            $max = (int) ($ev?->guests ?? 0);
            if ($max > 0) {
                $currentTotal = (int) EventTable::where('event_id', $table->event_id)->sum('capacity');
                $baseTotal = $currentTotal - (int) ($table->capacity ?? 0);
                $incoming = (int) $data['capacity'];
                if ($baseTotal + $incoming > $max) {
                    $remaining = max($max - $baseTotal, 0);
                    abort(422, "Capacité dépassée: la somme des places des tables (" . ($baseTotal + $incoming) . ") dépasse la capacité de l'événement (" . $max . "). Places restantes: " . $remaining . ".");
                }
            }
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
        $event = $table->event;
        if ($event && in_array((string) $event->status, ['termine', 'annuler', 'echoue'], true)) {
            abort(422, "Impossible de supprimer une table pour un événement terminé, annulé ou échoué");
        }
        $table->delete();
        return response()->noContent();
    }

    // Staff assignments to a specific table
    public function assignmentsIndex(Request $request, Event $event, EventTable $table)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin') {
            if ((int)$event->entreprise_id !== (int)$user->entreprise_id || (int)$table->entreprise_id !== (int)$user->entreprise_id) {
                abort(403, 'Forbidden');
            }
        }
        if ((int)$table->event_id !== (int)$event->id) {
            abort(422, 'Table invalide pour cet événement');
        }
        $query = Staff::query()
            ->join('event_table_staff_assignments as etsa', 'etsa.staff_id', '=', 'staff.id')
            ->where('etsa.event_id', $event->id)
            ->where('etsa.event_table_id', $table->id)
            ->select('staff.*')
            ->orderByDesc('staff.id');
        if (($user->role ?? 'admin') !== 'superadmin') {
            $query->where('staff.entreprise_id', $user->entreprise_id);
        }
        $staff = $query->get();
        return StaffResource::collection($staff);
    }

    public function assignmentsStore(Request $request, Event $event, EventTable $table)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin') {
            if ((int)$event->entreprise_id !== (int)$user->entreprise_id || (int)$table->entreprise_id !== (int)$user->entreprise_id) {
                abort(403, 'Forbidden');
            }
        }
        if ((int)$table->event_id !== (int)$event->id) {
            abort(422, 'Table invalide pour cet événement');
        }
        if (in_array((string)$event->status, ['termine', 'annuler', 'echoue'], true)) {
            abort(422, "Impossible d'assigner du personnel à une table pour un événement terminé, annulé ou échoué");
        }
        $data = $request->validate([
            'staffId' => ['required', 'integer'],
        ]);
        $staff = Staff::findOrFail((int)$data['staffId']);
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$staff->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        // Require staff to be assigned to the event first
        $assignedToEvent = DB::table('event_staff_assignments')
            ->where('event_id', $event->id)
            ->where('staff_id', $staff->id)
            ->exists();
        if (!$assignedToEvent) {
            abort(422, "Cet employé n'est pas assigné à cet événement");
        }
        // Prevent duplicate for same table
        $dup = DB::table('event_table_staff_assignments')
            ->where('event_id', $event->id)
            ->where('event_table_id', $table->id)
            ->where('staff_id', $staff->id)
            ->exists();
        if ($dup) {
            abort(422, 'Cet employé est déjà assigné à cette table');
        }
        // Prevent assignment to multiple tables within the same event
        $other = DB::table('event_table_staff_assignments')
            ->where('event_id', $event->id)
            ->where('staff_id', $staff->id)
            ->where('event_table_id', '<>', $table->id)
            ->exists();
        if ($other) {
            abort(422, "Cet employé est déjà assigné à une autre table de cet événement");
        }
        DB::table('event_table_staff_assignments')->insert([
            'entreprise_id' => $event->entreprise_id,
            'event_id' => $event->id,
            'event_table_id' => $table->id,
            'staff_id' => $staff->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return new StaffResource($staff);
    }

    public function assignmentsDestroy(Request $request, Event $event, EventTable $table, Staff $staff)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin') {
            if ((int)$event->entreprise_id !== (int)$user->entreprise_id || (int)$table->entreprise_id !== (int)$user->entreprise_id || (int)$staff->entreprise_id !== (int)$user->entreprise_id) {
                abort(403, 'Forbidden');
            }
        }
        if ((int)$table->event_id !== (int)$event->id) {
            abort(422, 'Table invalide pour cet événement');
        }
        if (in_array((string)$event->status, ['termine', 'annuler', 'echoue'], true)) {
            abort(422, "Impossible de modifier les affectations de table après l'événement");
        }
        DB::table('event_table_staff_assignments')
            ->where('event_id', $event->id)
            ->where('event_table_id', $table->id)
            ->where('staff_id', $staff->id)
            ->delete();
        return response()->noContent();
    }
}
