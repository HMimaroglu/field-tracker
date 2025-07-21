'use client';

import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/lib/auth';
import { 
  UserIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { logout } = useAuthStore();

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
      window.location.href = '/login';
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Title */}
        <div>
          {title && (
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          )}
        </div>

        {/* User menu */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <UserIcon className="h-4 w-4" />
            <span>Administrator</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4 mr-1" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}