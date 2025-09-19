import React, { useEffect, useState } from 'react';
import { User } from '@/services';

export default function RoleGuard({ roles = [], children }) {
  const [allowed, setAllowed] = useState(undefined);
  const [me, setMe] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const user = await User.me();
        if (!mounted) return;
        if (!user) {
          setAllowed(false);
          return;
        }
        setMe(user);
        if (roles.length === 0) {
          setAllowed(true);
          return;
        }
        setAllowed(roles.includes(user.role) || user.role === 'super_admin');
      } catch (e) {
        if (!mounted) return;
        setAllowed(false);
      }
    })();
    return () => { mounted = false; };
  }, [roles.join(',')]);

  if (allowed === undefined) {
    return (
      <div className="w-full min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
        <p className="text-gray-600">You do not have permission to view this page.</p>
      </div>
    );
  }

  // Pass the fetched user down so pages receive currentUser
  if (React.isValidElement(children)) {
    return React.cloneElement(children, { currentUser: me });
  }
  return <>{children}</>;
}
