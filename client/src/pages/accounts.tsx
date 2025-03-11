import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Layout } from '@/components/layout/sidebar';
import { AccountsTable } from '@/components/tables/accounts-table';
import { AccountModal } from '@/components/modals/account-modal';
import { useToast } from '@/hooks/use-toast';

export default function Accounts() {
  const { toast } = useToast();
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<number | null>(null);

  // Fetch accounts
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['/api/accounts'],
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/accounts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: "删除成功",
        description: "OTA平台账户已成功删除",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "删除失败",
        description: `操作出错: ${error instanceof Error ? error.message : '未知错误'}`,
        variant: "destructive",
      });
    }
  });

  const handleAddAccount = () => {
    setAccountToEdit(null);
    setIsAccountModalOpen(true);
  };

  const handleEditAccount = (id: number) => {
    setAccountToEdit(id);
    setIsAccountModalOpen(true);
  };

  const handleDeleteAccount = async (id: number) => {
    if (confirm('确定要删除此OTA平台账户吗？')) {
      deleteAccountMutation.mutate(id);
    }
  };

  const handleModalClose = () => {
    setIsAccountModalOpen(false);
    setAccountToEdit(null);
  };

  return (
    <Layout>
      <div className="py-6">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">OTA平台账户管理</h1>
              <p className="mt-2 text-sm text-gray-700">
                添加、编辑或删除您的OTA平台账户信息
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={handleAddAccount}
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <span className="material-icons text-sm mr-1">add</span>
                添加账户
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-6 flex justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <AccountsTable 
              accounts={accounts || []} 
              showActions={true}
              className="mt-6"
              onEdit={handleEditAccount}
              onDelete={handleDeleteAccount}
            />
          )}
        </div>
      </div>

      <AccountModal 
        isOpen={isAccountModalOpen} 
        onClose={handleModalClose}
        accountId={accountToEdit}
      />
    </Layout>
  );
}
