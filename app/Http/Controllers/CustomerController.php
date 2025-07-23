<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

/**
 * CustomerController
 * 
 * Handles CRUD operations for customers in the invoicing system.
 * Each user/merchant can manage their own customers independently.
 * 
 * Key Features:
 * - Create, read, update, delete customers
 * - Customer data validation
 * - User-scoped customer access (users only see their own customers)
 * - Integration with Inertia.js for frontend rendering
 * 
 * Routes:
 * - GET /customers - List all customers
 * - GET /customers/create - Show create customer form
 * - POST /customers - Store new customer
 * - GET /customers/{customer} - Show specific customer
 * - GET /customers/{customer}/edit - Show edit customer form
 * - PUT/PATCH /customers/{customer} - Update customer
 * - DELETE /customers/{customer} - Delete customer
 */
class CustomerController extends Controller
{
    /**
     * Display a listing of the authenticated user's customers.
     */
    public function index(Request $request)
    {
        $query = Auth::user()->customers();

        // Add search functionality
        if ($request->has('search') && $request->search) {
            $query->search($request->search);
        }

        // Get customers with pagination and invoice count
        $customers = $query->withCount('invoices')
                          ->orderBy('last_name')
                          ->orderBy('first_name')
                          ->paginate(15)
                          ->withQueryString();

        return Inertia::render('User/Customers/Index', [
            'customers' => $customers,
            'search' => $request->search ?? '',
        ]);
    }

    /**
     * Show the form for creating a new customer.
     */
    public function create()
    {
        return Inertia::render('User/Customers/Create');
    }

    /**
     * Store a newly created customer in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('customers')->where(function ($query) {
                    return $query->where('user_id', Auth::id());
                }),
            ],
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'company' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:500',
            'address2' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'phone_number' => 'nullable|string|max:20',
        ]);

        $validated['user_id'] = Auth::id();

        $customer = Customer::create($validated);

        return redirect()->route('user.customers')
                        ->with('success', 'Customer created successfully.');
    }

    /**
     * Display the specified customer.
     */
    public function show(Customer $customer)
    {
        // Ensure user can only view their own customers
        if ($customer->user_id !== Auth::id()) {
            abort(403, 'Unauthorized access to customer.');
        }

        // Load customer with their invoices
        $customer->load([
            'invoices' => function ($query) {
                $query->orderBy('created_at', 'desc');
            }
        ]);

        // Calculate customer stats
        $stats = [
            'total_invoices' => $customer->invoices->count(),
            'total_amount' => $customer->invoices->sum('total'),
            'paid_amount' => $customer->invoices->where('status', 'paid')->sum('total'),
            'overdue_amount' => $customer->invoices->where('status', 'overdue')->sum('total'),
            'pending_amount' => $customer->invoices->where('status', 'sent')->sum('total'),
            'status_counts' => [
                'paid' => $customer->invoices->where('status', 'paid')->count(),
                'sent' => $customer->invoices->where('status', 'sent')->count(),
                'overdue' => $customer->invoices->where('status', 'overdue')->count(),
                'closed' => $customer->invoices->where('status', 'closed')->count(),
            ],
            'latest_invoice_date' => $customer->invoices->max('created_at'),
            'outstanding_amount' => $customer->invoices->whereIn('status', ['sent', 'overdue'])->sum('total'),
        ];

        return Inertia::render('User/Customers/Show', [
            'customer' => $customer,
            'stats' => $stats,
        ]);
    }

    /**
     * Show the form for editing the specified customer.
     */
    public function edit(Customer $customer)
    {
        // Ensure user can only edit their own customers
        if ($customer->user_id !== Auth::id()) {
            abort(403, 'Unauthorized access to customer.');
        }

        return Inertia::render('User/Customers/Edit', [
            'customer' => $customer,
        ]);
    }

    /**
     * Update the specified customer in storage.
     */
    public function update(Request $request, Customer $customer)
    {
        // Ensure user can only update their own customers
        if ($customer->user_id !== Auth::id()) {
            abort(403, 'Unauthorized access to customer.');
        }

        $validated = $request->validate([
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('customers')->where(function ($query) {
                    return $query->where('user_id', Auth::id());
                })->ignore($customer->id),
            ],
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'company' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:500',
            'address2' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'phone_number' => 'nullable|string|max:20',
        ]);

        $customer->update($validated);

        return redirect()->route('user.customers')
                        ->with('success', 'Customer updated successfully.');
    }

    /**
     * Remove the specified customer from storage.
     */
    public function destroy(Customer $customer)
    {
        // Ensure user can only delete their own customers
        if ($customer->user_id !== Auth::id()) {
            abort(403, 'Unauthorized access to customer.');
        }

        // Check if customer has any invoices
        if ($customer->invoices()->count() > 0) {
            return redirect()->route('user.customers')
                            ->with('error', 'Cannot delete customer with existing invoices. Please delete or reassign invoices first.');
        }

        $customer->delete();

        return redirect()->route('user.customers')
                        ->with('success', 'Customer deleted successfully.');
    }

    /**
     * Get customers for API/AJAX requests (e.g., for invoice creation)
     */
    public function getCustomers(Request $request)
    {
        $query = Auth::user()->customers();

        if ($request->has('search') && $request->search) {
            $query->search($request->search);
        }

        // Handle pagination for modal
        if ($request->has('page') && $request->has('per_page')) {
            $perPage = min((int) $request->per_page, 50); // Limit max per page to 50
            $customers = $query->orderBy('last_name')
                              ->orderBy('first_name')
                              ->paginate($perPage)
                              ->withQueryString();
            
            $customers->getCollection()->transform(function ($customer) {
                return [
                    'id' => $customer->id,
                    'name' => $customer->display_name,
                    'email' => $customer->email,
                    'full_data' => $customer->toArray(),
                ];
            });

            return response()->json($customers);
        } else {
            // Legacy behavior for dropdown search (limited to 10 items)
            $customers = $query->orderBy('last_name')
                              ->orderBy('first_name')
                              ->limit(10)
                              ->get()
                              ->map(function ($customer) {
                                  return [
                                      'id' => $customer->id,
                                      'name' => $customer->display_name,
                                      'email' => $customer->email,
                                      'full_data' => $customer->toArray(),
                                  ];
                              });

            return response()->json($customers);
        }
    }
}
