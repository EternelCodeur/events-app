<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventTaskResource;
use App\Models\Event;
use App\Models\EventTask;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EventTaskController extends Controller
{
    public function index(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        $tasks = EventTask::where('event_id', $event->id)->latest()->get();
        return EventTaskResource::collection($tasks);
    }

    public function store(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        $data = $request->validate([
            'name' => ['required', 'string', 'max:191'],
        ]);
        $name = trim($data['name']);
        $slug = Str::slug($name, '_');
        if ($slug === '') {
            $slug = strtolower(preg_replace('/\s+/', '_', $name));
        }
        // prevent duplicates per event by slug
        $exists = EventTask::where('event_id', $event->id)->where('slug', $slug)->exists();
        if ($exists) {
            abort(422, 'Cette tâche existe déjà pour cet événement');
        }
        $task = EventTask::create([
            'entreprise_id' => $event->entreprise_id,
            'event_id' => $event->id,
            'name' => $name,
            'slug' => $slug,
        ]);
        return new EventTaskResource($task);
    }

    public function update(Request $request, EventTask $task)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$task->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        $data = $request->validate([
            'name' => ['required', 'string', 'max:191'],
        ]);
        $name = trim($data['name']);
        $slug = Str::slug($name, '_');
        if ($slug === '') {
            $slug = strtolower(preg_replace('/\s+/', '_', $name));
        }
        $exists = EventTask::where('event_id', $task->event_id)->where('id', '<>', $task->id)->where('slug', $slug)->exists();
        if ($exists) {
            abort(422, 'Cette tâche existe déjà pour cet événement');
        }
        $task->name = $name;
        $task->slug = $slug;
        $task->save();
        return new EventTaskResource($task);
    }

    public function destroy(Request $request, EventTask $task)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$task->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        $task->delete();
        return response()->noContent();
    }
}
