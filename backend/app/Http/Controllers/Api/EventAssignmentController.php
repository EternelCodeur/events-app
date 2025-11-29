<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StaffResource;
use App\Models\Event;
use App\Models\Staff;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EventAssignmentController extends Controller
{
    public function index(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }

        $query = Staff::query()
            ->join('event_staff_assignments as esa', 'esa.staff_id', '=', 'staff.id')
            ->where('esa.event_id', $event->id)
            ->select('staff.*')
            ->orderByDesc('staff.id');

        if (($user->role ?? 'admin') !== 'superadmin') {
            $query->where('staff.entreprise_id', $user->entreprise_id);
        }

        $staff = $query->get();
        return StaffResource::collection($staff);
    }

    public function store(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }

        $data = $request->validate([
            'staffId' => ['required', 'integer'],
        ]);

        $staff = Staff::findOrFail((int) $data['staffId']);
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$staff->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }

        $exists = DB::table('event_staff_assignments')
            ->where('event_id', $event->id)
            ->where('staff_id', $staff->id)
            ->exists();
        if ($exists) {
            abort(422, 'Cet employé est déjà assigné à cet événement');
        }

        DB::table('event_staff_assignments')->insert([
            'entreprise_id' => $event->entreprise_id,
            'event_id' => $event->id,
            'staff_id' => $staff->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return new StaffResource($staff);
    }

    public function destroy(Request $request, Event $event, Staff $staff)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin') {
            if ((int)$event->entreprise_id !== (int)$user->entreprise_id || (int)$staff->entreprise_id !== (int)$user->entreprise_id) {
                abort(403, 'Forbidden');
            }
        }

        DB::table('event_staff_assignments')
            ->where('event_id', $event->id)
            ->where('staff_id', $staff->id)
            ->delete();

        return response()->noContent();
    }
}
