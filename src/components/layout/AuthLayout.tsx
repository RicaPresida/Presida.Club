import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col dark:bg-dark">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default AuthLayout;