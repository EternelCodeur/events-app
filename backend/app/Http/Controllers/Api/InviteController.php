<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\InviteResource;
use App\Models\Event;
use App\Models\EventTable;
use App\Models\Invite;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InviteController extends Controller
{
    public function index(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        $items = Invite::where('event_id', $event->id)->latest()->get();
        return InviteResource::collection($items);
    }

    public function store(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        if (in_array((string) $event->status, ['termine', 'annuler', 'echoue'], true)) {
            abort(422, "Impossible d'ajouter un invité pour un événement terminé, annulé ou échoué");
        }
        $data = $request->validate([
            'nom' => ['required', 'string', 'max:191'],
            'prenom' => ['required', 'string', 'max:191'],
            'telephone' => ['required', 'string', 'max:191'],
            'personnes' => ['required', 'integer', 'min:1'],
            'table_id' => ['nullable', 'integer'],
            'statut' => ['sometimes', 'in:confirmed,pending'],
            'additionalGuests' => ['sometimes', 'array'],
        ]);

        $tableId = $data['table_id'] ?? null;
        $table = null;
        if ($tableId) {
            $table = EventTable::find($tableId);
            if (!$table || (int)$table->event_id !== (int)$event->id) {
                abort(422, 'Table invalide pour cet événement');
            }
            $used = (int) Invite::where('event_table_id', $table->id)->sum('personnes');
            $cap = (int) ($table->capacity ?? 0);
            if ($cap > 0 && ($used + (int)$data['personnes']) > $cap) {
                abort(422, "Cette table n'a pas assez de places disponibles");
            }
        }

        $additional = [];
        if (array_key_exists('additionalGuests', $data) && is_array($data['additionalGuests'])) {
            $additional = array_values(array_filter(array_map(function ($s) {
                return is_string($s) ? trim($s) : '';
            }, $data['additionalGuests']), function ($s) {
                return $s !== '';
            }));
        }

        $invite = Invite::create([
            'entreprise_id' => $event->entreprise_id,
            'event_id' => $event->id,
            'event_table_id' => $tableId,
            'nom' => $data['nom'],
            'prenom' => $data['prenom'],
            'telephone' => $data['telephone'],
            'personnes' => (int) $data['personnes'],
            'statut' => $data['statut'] ?? 'pending',
            'present' => false,
            'additional_guests' => $additional,
        ]);

        if ($table) { $this->recomputeTableStatus($table); }

        return new InviteResource($invite);
    }

    public function update(Request $request, Invite $invite)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$invite->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        $event = $invite->event;
        if ($event && in_array((string) $event->status, ['termine', 'annuler', 'echoue'], true)) {
            abort(422, "Impossible de modifier un invité pour un événement terminé, annulé ou échoué");
        }

        $data = $request->validate([
            'nom' => ['sometimes', 'string', 'max:191'],
            'prenom' => ['sometimes', 'string', 'max:191'],
            'telephone' => ['sometimes', 'string', 'max:191'],
            'personnes' => ['sometimes', 'integer', 'min:1'],
            'table_id' => ['sometimes', 'nullable', 'integer'],
            'statut' => ['sometimes', 'in:confirmed,pending'],
            'additionalGuests' => ['sometimes', 'array'],
        ]);

        $oldTableId = $invite->event_table_id;
        $newTableId = array_key_exists('table_id', $data) ? ($data['table_id'] ?? null) : $invite->event_table_id;
        $newPersonnes = array_key_exists('personnes', $data) ? (int) $data['personnes'] : (int) $invite->personnes;

        $newTable = null;
        if ($newTableId) {
            $newTable = EventTable::find($newTableId);
            if (!$newTable || (int)$newTable->event_id !== (int)$invite->event_id) {
                abort(422, 'Table invalide pour cet événement');
            }
            $used = (int) Invite::where('event_table_id', $newTable->id)
                ->where('id', '<>', $invite->id)
                ->sum('personnes');
            $cap = (int) ($newTable->capacity ?? 0);
            if ($cap > 0 && ($used + $newPersonnes) > $cap) {
                abort(422, "Cette table n'a pas assez de places disponibles");
            }
        }

        if (array_key_exists('nom', $data)) $invite->nom = $data['nom'];
        if (array_key_exists('prenom', $data)) $invite->prenom = $data['prenom'];
        if (array_key_exists('telephone', $data)) $invite->telephone = $data['telephone'];
        if (array_key_exists('personnes', $data)) $invite->personnes = $newPersonnes;
        if (array_key_exists('table_id', $data)) $invite->event_table_id = $newTableId;
        if (array_key_exists('statut', $data)) $invite->statut = $data['statut'];
        if (array_key_exists('additionalGuests', $data)) {
            $newAdditional = [];
            if (is_array($data['additionalGuests'])) {
                $newAdditional = array_values(array_filter(array_map(function ($s) {
                    return is_string($s) ? trim($s) : '';
                }, $data['additionalGuests']), function ($s) {
                    return $s !== '';
                }));
            }
            $invite->additional_guests = $newAdditional;
        }
        $invite->save();

        if ($oldTableId && $oldTableId !== $newTableId) {
            $old = EventTable::find($oldTableId);
            if ($old) { $this->recomputeTableStatus($old); }
        }
        if ($newTable) { $this->recomputeTableStatus($newTable); }

        return new InviteResource($invite);
    }

    public function destroy(Request $request, Invite $invite)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$invite->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        $tableId = $invite->event_table_id;
        $invite->delete();
        if ($tableId) {
            $t = EventTable::find($tableId);
            if ($t) { $this->recomputeTableStatus($t); }
        }
        return response()->noContent();
    }

    private function recomputeTableStatus(EventTable $table): void
    {
        $cap = (int) ($table->capacity ?? 0);
        if ($cap <= 0) {
            $table->status = 'en_attente';
            $table->save();
            return;
        }
        $used = (int) Invite::where('event_table_id', $table->id)->sum('personnes');
        $table->status = ($used >= $cap) ? 'pleine' : 'en_attente';
        $table->save();
    }
}
