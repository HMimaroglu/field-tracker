'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  HomeIcon,
  UserGroupIcon,
  BriefcaseIcon,
  ClockIcon,
  DocumentChartBarIcon,
  PhotoIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  className?: string;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Workers', href: '/workers', icon: UserGroupIcon },
  { name: 'Jobs', href: '/jobs', icon: BriefcaseIcon },
  { name: 'Time Entries', href: '/time-entries', icon: ClockIcon },
  { name: 'Reports', href: '/reports', icon: DocumentChartBarIcon },
  { name: 'Photos', href: '/photos', icon: PhotoIcon },
  { name: 'Conflicts', href: '/conflicts', icon: ExclamationTriangleIcon },
  { name: 'License', href: '/license', icon: KeyIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={clsx('flex h-full w-64 flex-col bg-gray-900', className)}>
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-4">
        <h1 className="text-xl font-bold text-white">Field Tracker</h1>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={clsx(
                        isActive
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800',
                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold mx-2'
                      )}
                    >
                      <item.icon
                        className={clsx(
                          isActive ? 'text-white' : 'text-gray-400 group-hover:text-white',
                          'h-6 w-6 shrink-0'
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-400">
          Field Tracker v1.0
        </p>
        <p className="text-xs text-gray-400">
          Admin Dashboard
        </p>
      </div>
    </div>
  );
}