<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="description" content="Easy Zay Mm is a trusted local marketplace for discovering products and verified shops.">
    <meta name="theme-color" content="#2563eb">
    <meta property="og:site_name" content="Easy Zay Mm">
    <meta property="og:title" content="Easy Zay Mm — Buy and sell locally">
    <meta property="og:description" content="Discover products, verified shops, and trusted local sellers on Easy Zay Mm.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="{{ url('/') }}">
    <meta name="twitter:card" content="summary_large_image">
    <title inertia>{{ config('app.name', 'Marketplace') }}</title>
    @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    @endif
    @inertiaHead
</head>
<body class="bg-slate-50 text-slate-900 antialiased">
    @inertia
</body>
</html>
