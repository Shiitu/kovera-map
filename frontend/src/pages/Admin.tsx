/**
 * @file frontend/src/pages/Admin.tsx
 */

import React from 'react';
import { useNetworkContext } from '../context/NetworkContext';
import TopBar from '../components/TopBar';
import AdminPanel from '../components/AdminPanel';
import { Navigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const AdminPortal: React.FC = () => {
  const { isAdmin } = useNetworkContext();

  if (!isAdmin) {
    return <Navigate to="/network" replace />;
  }

  return (
    <div className="h-screen flex flex-col bg-bg text-text overflow-hidden overflow-y-auto">
      <TopBar />
      
      <div className="flex-1 p-6 relative">
        <Link 
          to="/network" 
          className="lg:fixed top-[70px] left-6 flex items-center gap-2 text-xs font-semibold text-text3 hover:text-kovera transition-all mb-8 lg:mb-0 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          RETURN TO PORTAL
        </Link>
        
        <AdminPanel />
      </div>
    </div>
  );
};

export default AdminPortal;
