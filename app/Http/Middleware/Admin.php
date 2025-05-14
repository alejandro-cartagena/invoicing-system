<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class Admin
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        \Log::info('Admin middleware - Request details', [
            'path' => $request->path(),
            'method' => $request->method(),
            'is_authenticated' => Auth::check(),
            'user' => Auth::check() ? [
                'id' => Auth::id(),
                'email' => Auth::user()->email,
                'usertype' => Auth::user()->usertype
            ] : 'not authenticated'
        ]);

        if (!Auth::check()) {
            \Log::warning('Admin middleware - User not authenticated');
            return redirect()->route('login');
        }

        if(Auth::user()->usertype !== 'admin'){
            \Log::warning('Admin middleware - User is not admin', [
                'user_id' => Auth::id(),
                'usertype' => Auth::user()->usertype
            ]);
            return redirect()->route('dashboard');
        }

        \Log::info('Admin middleware - Access granted', [
            'user_id' => Auth::id()
        ]);
        return $next($request);
    }
}
