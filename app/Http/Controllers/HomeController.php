<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class HomeController extends Controller
{
    /**
     * Display the admin dashboard homepage
     * 
     * This method serves as the entry point for the admin dashboard,
     * rendering the main dashboard view for authenticated administrators
     * 
     * @return \Illuminate\View\View The rendered admin dashboard view
     */
    public function index()
    {
        return view('admin.dashboard');
    }
}
