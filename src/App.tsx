/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NetworkProvider } from '../frontend/src/context/NetworkContext';
import NetworkPortal from '../frontend/src/pages/Network';
import AdminPortal from '../frontend/src/pages/Admin';

export default function App() {
  return (
    <NetworkProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Navigate to="/network" replace />} />
          <Route path="/network" element={<NetworkPortal />} />
          <Route path="/admin" element={<AdminPortal />} />
          <Route path="/" element={<Navigate to="/network" replace />} />
        </Routes>
      </BrowserRouter>
    </NetworkProvider>
  );
}
