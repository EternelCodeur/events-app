<?php

namespace App\Services;

class JwtService
{
    private string $secret;

    public function __construct(?string $secret = null)
    {
        $this->secret = $secret ?: (string) config('app.key');
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $data): string
    {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(strtr($data, '-_', '+/')) ?: '';
    }

    public function generate(array $claims, int $ttlSeconds, string $type = 'access'): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $now = time();
        $payload = array_merge($claims, [
            'iat' => $now,
            'exp' => $now + $ttlSeconds,
            'type' => $type,
        ]);

        $segments = [
            $this->base64UrlEncode(json_encode($header, JSON_UNESCAPED_SLASHES) ?: '{}'),
            $this->base64UrlEncode(json_encode($payload, JSON_UNESCAPED_SLASHES) ?: '{}'),
        ];
        $signingInput = implode('.', $segments);
        $signature = hash_hmac('sha256', $signingInput, $this->secret, true);
        $segments[] = $this->base64UrlEncode($signature);
        return implode('.', $segments);
    }

    public function decode(string $jwt): array
    {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            throw new \RuntimeException('invalid token');
        }
        [$headB64, $payloadB64, $sigB64] = $parts;
        $signature = $this->base64UrlDecode($sigB64);
        $expected = hash_hmac('sha256', $headB64 . '.' . $payloadB64, $this->secret, true);
        if (!hash_equals($expected, $signature)) {
            throw new \RuntimeException('bad signature');
        }
        $payloadJson = $this->base64UrlDecode($payloadB64);
        $payload = json_decode($payloadJson, true);
        if (!is_array($payload)) {
            throw new \RuntimeException('bad payload');
        }
        if (!empty($payload['exp']) && time() >= (int) $payload['exp']) {
            throw new \RuntimeException('expired');
        }
        return $payload;
    }
}
