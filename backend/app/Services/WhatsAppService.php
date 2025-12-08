<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class WhatsAppService
{
    public function enabled(): bool
    {
        return (bool) env('WHATSAPP_ENABLED', false);
    }

    public function normalize(string $raw): ?string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }
        $digits = preg_replace('/\D+/', '', $raw);
        if (!$digits) {
            return null;
        }
        if (str_starts_with($raw, '+')) {
            return '+'.$digits;
        }
        if (str_starts_with($digits, '00')) {
            return '+'.substr($digits, 2);
        }
        $cc = (string) env('WHATSAPP_DEFAULT_COUNTRY_CODE', '+241');
        if (str_starts_with($digits, '0')) {
            return $cc.ltrim($digits, '0');
        }
        return '+'.$digits;
    }

    public function sendTemplate(string $to, string $templateName, array $components = [], string $lang = 'fr'): array
    {
        if (!$this->enabled()) {
            return ['ok' => false, 'reason' => 'disabled'];
        }
        $provider = env('WHATSAPP_PROVIDER', 'meta');
        if ($provider !== 'meta') {
            return ['ok' => false, 'reason' => 'unsupported_provider'];
        }
        $token = env('WHATSAPP_TOKEN');
        $phoneNumberId = env('WHATSAPP_PHONE_NUMBER_ID');
        if (!$token || !$phoneNumberId) {
            return ['ok' => false, 'reason' => 'missing_credentials'];
        }
        $url = "https://graph.facebook.com/v20.0/{$phoneNumberId}/messages";
        $payload = [
            'messaging_product' => 'whatsapp',
            'to' => $to,
            'type' => 'template',
            'template' => [
                'name' => $templateName,
                'language' => [ 'code' => $lang ],
                'components' => $components,
            ],
        ];
        $resp = Http::withToken($token)->post($url, $payload);
        return [
            'ok' => $resp->successful(),
            'status' => $resp->status(),
            'body' => $resp->json(),
        ];
    }

    public function sendText(string $to, string $text): array
    {
        if (!$this->enabled()) {
            return ['ok' => false, 'reason' => 'disabled'];
        }
        $provider = env('WHATSAPP_PROVIDER', 'meta');
        if ($provider !== 'meta') {
            return ['ok' => false, 'reason' => 'unsupported_provider'];
        }
        $token = env('WHATSAPP_TOKEN');
        $phoneNumberId = env('WHATSAPP_PHONE_NUMBER_ID');
        if (!$token || !$phoneNumberId) {
            return ['ok' => false, 'reason' => 'missing_credentials'];
        }
        $url = "https://graph.facebook.com/v20.0/{$phoneNumberId}/messages";
        $payload = [
            'messaging_product' => 'whatsapp',
            'to' => $to,
            'type' => 'text',
            'text' => [ 'preview_url' => false, 'body' => $text ],
        ];
        $resp = Http::withToken($token)->post($url, $payload);
        return [
            'ok' => $resp->successful(),
            'status' => $resp->status(),
            'body' => $resp->json(),
        ];
    }
}
