import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function calculateTimeRemaining(endDate: string): string {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = Math.abs(end.getTime() - now.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (end < now) {
    return "已结束";
  }
  
  if (diffDays === 0) {
    return "今天";
  } else if (diffDays === 1) {
    return "明天";
  } else if (diffDays < 7) {
    return `${diffDays}天`;
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)}周`;
  } else {
    return `${Math.floor(diffDays / 30)}个月`;
  }
}

export function generateStatusBadgeClasses(status: string): string {
  switch (status) {
    case "已连接":
      return "bg-green-100 text-green-800";
    case "未连接":
      return "bg-red-100 text-red-800";
    case "进行中":
      return "bg-green-100 text-green-800";
    case "待开始":
      return "bg-blue-100 text-blue-800";
    case "已结束":
      return "bg-gray-100 text-gray-800";
    case "未决定":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function generateTagBadgeClasses(tag: string): string {
  switch (tag) {
    case "特惠":
      return "bg-blue-100 text-blue-800";
    case "限时":
      return "bg-yellow-100 text-yellow-800";
    case "热门":
      return "bg-red-100 text-red-800";
    case "推荐":
      return "bg-primary-100 text-primary-800";
    case "备选":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
