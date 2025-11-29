<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProviderResource;
use App\Models\Event;
use App\Models\Provider;
use Illuminate\Http\Request;

class ProviderController extends Controller
{
    public function index(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        $list = Provider::where('event_id', $event->id)->latest()->get();
        return ProviderResource::collection($list);
    }

    public function store(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        $data = $request->validate([
            'type' => ['sometimes', 'nullable', 'string', 'max:191'],
            'designation' => ['required', 'string', 'max:191'],
            'amountCfa' => ['required', 'integer', 'min:0'],
            'advanceCfa' => ['sometimes', 'integer', 'min:0'],
            'comments' => ['sometimes', 'nullable', 'string'],
            'contact' => ['sometimes', 'nullable', 'string', 'max:191'],
        ]);
        $amount = (int) ($data['amountCfa'] ?? 0);
        $advance = (int) ($data['advanceCfa'] ?? 0);
        if ($advance > $amount) {
            abort(422, "L'avance ne peut pas dépasser le montant");
        }
        // Duplicate check: same (type, designation) for this event (case-insensitive)
        $normType = strtolower(trim((string) ($data['type'] ?? '')));
        $normDesignation = strtolower(trim((string) $data['designation']));
        $dup = Provider::where('event_id', $event->id)
            ->whereRaw('LOWER(COALESCE(type, "")) = ?', [$normType])
            ->whereRaw('LOWER(designation) = ?', [$normDesignation])
            ->exists();
        if ($dup) {
            abort(422, "Ce prestataire existe déjà pour cet événement");
        }
        $budget = (int) preg_replace('/\D+/', '', (string) ($event->budget ?? '0'));
        $currentTotal = (int) Provider::where('event_id', $event->id)->sum('amount_cfa');
        if ($budget > 0 && ($currentTotal + $amount) > $budget) {
            abort(422, "Le budget de l'événement est insuffisant pour ce prestataire");
        }
        $p = Provider::create([
            'entreprise_id' => $event->entreprise_id,
            'event_id' => $event->id,
            'type' => $data['type'] ?? null,
            'designation' => $data['designation'],
            'amount_cfa' => $amount,
            'advance_cfa' => $advance,
            'comments' => $data['comments'] ?? null,
            'contact' => $data['contact'] ?? null,
        ]);
        return new ProviderResource($p);
    }

    public function update(Request $request, Provider $provider)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$provider->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        $data = $request->validate([
            'type' => ['sometimes', 'nullable', 'string', 'max:191'],
            'designation' => ['sometimes', 'string', 'max:191'],
            'amountCfa' => ['sometimes', 'integer', 'min:0'],
            'advanceCfa' => ['sometimes', 'integer', 'min:0'],
            'comments' => ['sometimes', 'nullable', 'string'],
            'contact' => ['sometimes', 'nullable', 'string', 'max:191'],
        ]);
        $newAmount = array_key_exists('amountCfa', $data) ? (int) $data['amountCfa'] : (int) $provider->amount_cfa;
        $newAdvance = array_key_exists('advanceCfa', $data) ? (int) $data['advanceCfa'] : (int) $provider->advance_cfa;
        if ($newAdvance > $newAmount) {
            abort(422, "L'avance ne peut pas dépasser le montant");
        }
        // Duplicate check on update (exclude current id) by (type, designation)
        $newType = array_key_exists('type', $data) ? ($data['type'] ?? null) : $provider->type;
        $newDesignation = array_key_exists('designation', $data) ? $data['designation'] : $provider->designation;
        $normType = strtolower(trim((string) ($newType ?? '')));
        $normDesignation = strtolower(trim((string) $newDesignation));
        $dup = Provider::where('event_id', $provider->event_id)
            ->where('id', '<>', $provider->id)
            ->whereRaw('LOWER(COALESCE(type, "")) = ?', [$normType])
            ->whereRaw('LOWER(designation) = ?', [$normDesignation])
            ->exists();
        if ($dup) {
            abort(422, "Ce prestataire existe déjà pour cet événement");
        }
        $eventId = (int) $provider->event_id;
        $budget = (int) preg_replace('/\D+/', '', (string) (optional($provider->event)->budget ?? '0'));
        $currentTotalOthers = (int) Provider::where('event_id', $eventId)->where('id', '<>', $provider->id)->sum('amount_cfa');
        if ($budget > 0 && ($currentTotalOthers + $newAmount) > $budget) {
            abort(422, "Le budget de l'événement est insuffisant pour ce prestataire");
        }
        $provider->type = array_key_exists('type', $data) ? ($data['type'] ?? null) : $provider->type;
        $provider->designation = array_key_exists('designation', $data) ? $data['designation'] : $provider->designation;
        $provider->amount_cfa = $newAmount;
        $provider->advance_cfa = $newAdvance;
        if (array_key_exists('comments', $data)) $provider->comments = $data['comments'];
        if (array_key_exists('contact', $data)) $provider->contact = $data['contact'];
        $provider->save();
        return new ProviderResource($provider);
    }

    public function destroy(Request $request, Provider $provider)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$provider->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        $provider->delete();
        return response()->noContent();
    }
}
