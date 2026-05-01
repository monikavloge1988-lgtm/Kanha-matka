import React from 'react';
import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans p-4 md:p-8 flex flex-col items-center justify-center">
      <Shield className="w-24 h-24 text-red-500 mb-6" />
      <h1 className="text-3xl font-bold text-zinc-100 mb-4">Admin Dashboard</h1>
      <p className="text-zinc-400 mb-8 max-w-md text-center">
        The admin dashboard is currently disabled because the game is running in an in-memory, serverless demo mode to bypass Firebase Admin permission restrictions.
      </p>
      <Link to="/" className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg transition">
        Return to Game
      </Link>
    </div>
  );
}
