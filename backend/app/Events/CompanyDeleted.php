<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CompanyDeleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $afterCommit = true;

    public function __construct(public string $id)
    {
    }

    public function broadcastOn(): Channel
    {
        return new Channel('companies');
    }

    public function broadcastAs(): string
    {
        return 'CompanyDeleted';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->id,
        ];
    }
}
