<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreInquiryRequest;
use App\Models\Inquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;

class InquiryController extends Controller
{
    /**
     * Store a newly created seminar inquiry in database.
     */
    public function store(StoreInquiryRequest $request): JsonResponse|RedirectResponse
    {
        $inquiry = Inquiry::create($request->validated());

        $message = "Inquiry registered successfully! Deployment seminar seat confirmed for {$inquiry->name}.";

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message,
                'inquiry' => [
                    'id' => $inquiry->id,
                    'name' => $inquiry->name,
                    'email' => $inquiry->email,
                    'created_at' => $inquiry->created_at?->toIso8601String(),
                ],
            ], 201);
        }

        return redirect()->to(url()->previous() . '#contact')
            ->with('success', $message);
    }
}
