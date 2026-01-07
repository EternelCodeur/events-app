<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Ici on autorise explicitement l'origine du front (localhost:8080) avec
    | les credentials (cookies / Authorization). On ne peut pas utiliser '*'
    | pour allowed_origins lorsqu'on envoie des credentials.
    |
    */

    // Toutes les routes API sont concernées
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // IMPORTANT : ne pas utiliser '*' ici avec supports_credentials = true
    'allowed_origins' => [
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'https://api.okoume-events.ga',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // On autorise l'envoi de credentials (cookies, Authorization...)
    'supports_credentials' => true,

];
