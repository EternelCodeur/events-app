<?php

namespace App\Events;

use App\Models\Company;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CompanyCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $afterCommit = true;

    public function __construct(public Company $company)
    {
    }

    public function broadcastOn(): Channel
    {
        return new Channel('companies');
    }

    public function broadcastAs(): string
    {
        return 'CompanyCreated';
    }

    public function broadcastWith(): array
    {
        $c = $this->company;
        return [
            'id' => (string) $c->id,
            'name' => $c->name,
            'email' => $c->email,
            'phone' => $c->phone,
            'adminName' => $c->admin_name,
            'status' => $c->status ?? 'active',
        ];
    }
}
