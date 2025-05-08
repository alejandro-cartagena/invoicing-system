<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form
     * 
     * Renders the profile edit page with information about whether email verification
     * is required and any status messages from previous operations.
     * 
     * @param Request $request The HTTP request containing the authenticated user
     * @return Response Renders the profile edit page with necessary data
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    /**
     * Update the user's profile information
     * 
     * Validates and saves changes to the user's profile data. If the email address
     * is changed, the email_verified_at timestamp is reset to null, requiring
     * the user to verify their new email address.
     * 
     * @param ProfileUpdateRequest $request Custom form request that handles validation
     * @return RedirectResponse Redirects back to the profile edit page
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account
     * 
     * Validates the current password, logs the user out, deletes their account,
     * invalidates their session, and regenerates the CSRF token for security.
     * 
     * @param Request $request The HTTP request containing the authenticated user
     * @return RedirectResponse Redirects to the home page after account deletion
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
