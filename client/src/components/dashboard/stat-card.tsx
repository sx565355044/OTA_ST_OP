import React from 'react';
import { Link } from 'wouter';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  iconBgColor?: string;
  iconColor?: string;
  linkText?: string;
  linkUrl?: string;
}

export function StatCard({
  title,
  value,
  icon,
  iconBgColor = 'bg-primary-100',
  iconColor = 'text-primary-600',
  linkText,
  linkUrl
}: StatCardProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5 flex items-center">
        <div className={`flex-shrink-0 ${iconBgColor} rounded-md p-3`}>
          <span className={`material-icons ${iconColor}`}>{icon}</span>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd>
              <div className="text-lg font-semibold text-gray-900">{value}</div>
            </dd>
          </dl>
        </div>
      </div>
      {linkText && linkUrl && (
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <Link href={linkUrl} className="font-medium text-primary-600 hover:text-primary-700">
              {linkText} <span className="material-icons text-sm align-text-bottom">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
