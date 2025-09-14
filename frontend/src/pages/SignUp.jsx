import React, { useState } from "react";
import { Link } from "react-router-dom";
import { User } from "@/services";
import { createPageUrl } from "@/utils";

export default function SignUp() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("patient");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    try {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "/";
      }
    } catch {
      window.location.href = "/";
    }
  };

  const roleToPage = (r = "") => {
    switch (String(r).toLowerCase()) {
      case "patient":
        return "PatientDashboard";
      case "doctor":
        return "DoctorDashboard";
      case "therapist":
        return "TherapistDashboard";
      case "guardian":
        return "GuardianDashboard";
      case "support":
        return "SupportDashboard";
      case "hospital_admin":
      case "admin":
      default:
        return "Dashboard";
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError("Please provide at least one contact: mobile number or email.");
      return;
    }
    if (!role) {
      setError("Please select a role.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
        role,
      };
      const newUser = await User.register(payload);
      // After registering, user is logged in. Redirect to role-based dashboard.
      const target = roleToPage(newUser?.role || role);
      window.location.href = createPageUrl(target);
    } catch (err) {
      // Prefer server validation messages if available
      if (err?.status === 409) {
        setError("An account with these credentials already exists.");
      } else if (err?.status === 400 && Array.isArray(err?.details?.errors)) {
        // express-validator format
        const first = err.details.errors[0];
        setError(first?.msg || "Invalid data. Please check your inputs.");
      } else if (err?.details?.message) {
        setError(err.details.message);
      } else if (typeof err?.message === 'string') {
        setError(err.message);
      } else {
        setError("Failed to create account. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-purple-50">
      {/* Header Bar */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-4 gap-4">
        <div className="logo-section flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
            {/* Simple icon circle */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 2v2"></path>
              <path d="M5 2v2"></path>
              <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"></path>
              <path d="M8 15a6 6 0 0 0 12 0v-3"></path>
              <circle cx="20" cy="10" r="2"></circle>
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">AyurSutra</h1>
            <p className="text-gray-500 text-sm leading-tight hidden sm:block">Healthcare Platform</p>
          </div>
        </div>
        <div className="auth-buttons flex-shrink-0 flex items-center gap-2">
          <Link to={createPageUrl('SignIn')} className="sign-in-button relative z-10 bg-gradient-to-r from-blue-600 to-green-600 text-white px-4 py-2 rounded-xl shadow-none transition-colors text-sm font-medium flex items-center gap-2">
            <span>Sign In</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </Link>
          <Link to={createPageUrl('SignUp')} className="relative z-10 bg-white text-gray-700 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-300 hover:text-gray-900 transition-colors text-sm font-medium shadow-none">
            Sign Up
          </Link>
        </div>
      </header>

      {/* Form Card */}
      <div className="w-full max-w-md mx-auto mt-6 sm:mt-10 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Create your account</h1>
        <p className="text-gray-500 mb-6">Join AyurSutra and manage your journey</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile number</label>
            <input
              type="tel"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g., 9876543210"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="patient">Patient</option>
              <option value="guardian">Guardian</option>
              <option value="doctor">Doctor</option>
              <option value="therapist">Therapist</option>
              <option value="support">Support</option>
              <option value="hospital_admin">Hospital Admin</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <input
              type="password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-6 text-center">
          Already have an account?{" "}
          <Link className="text-blue-600 hover:underline font-medium" to={createPageUrl("SignIn")}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

